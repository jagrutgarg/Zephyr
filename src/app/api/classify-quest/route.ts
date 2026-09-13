import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_TEXT_LENGTH = 200;

type RealmRow = { id: string; slug: string; name: string; guardian: string; accent_color: string; description: string | null };

function stripCodeFences(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (fenced ? fenced[1] : raw).trim();
}

export async function POST(request: Request) {
  let text = "";
  try {
    const body = await request.json();
    text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_TEXT_LENGTH) : "";
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_request" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ ok: false, reason: "empty_text" }, { status: 400 });
  }

  // Realms are fetched live from Supabase — the AI's options and the manual
  // fallback dropdown must always reflect the real, current realm set.
  const supabase = await createClient();
  const { data: realms, error: realmsError } = await supabase
    .from("realms")
    .select("id, slug, name, guardian, accent_color, description");

  if (realmsError || !realms || realms.length === 0) {
    return NextResponse.json({ ok: false, reason: "realms_unavailable" });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, reason: "unavailable" });
  }

  const realmList = (realms as RealmRow[])
    .map((r) => `${r.id} — ${r.name}${r.description ? `: ${r.description}` : ""}`)
    .join("\n");

  const systemPrompt = `You classify a short real-life task description into exactly one Realm from this list (id — name: attribute description):\n${realmList}\n\nRules:\n- Pick the single best thematic match by realm id.\n- If the task is genuinely ambiguous between two realms, still pick the better thematic match.\n- Also suggest a difficulty tier based on the phrasing: "easy" for quick/small tasks, "normal" for typical tasks, "hard" for tasks implying significant effort or scope.\n- Respond with ONLY a JSON object, no other text, no markdown fences: {"realm_id": "<uuid>", "confidence": "high"|"medium"|"low", "difficulty": "easy"|"normal"|"hard"}`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "qwen/qwen3.8-27b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.1,
        max_tokens: 60,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, reason: "unavailable" });
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";

    let parsed: { realm_id?: string; confidence?: string; difficulty?: string };
    try {
      parsed = JSON.parse(stripCodeFences(content));
    } catch {
      return NextResponse.json({ ok: false, reason: "parse_error" });
    }

    const matchedRealm = (realms as RealmRow[]).find((r) => r.id === parsed.realm_id);
    const confidence = parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low"
      ? parsed.confidence
      : "low";
    const difficulty = parsed.difficulty === "easy" || parsed.difficulty === "normal" || parsed.difficulty === "hard"
      ? parsed.difficulty
      : "normal";

    if (!matchedRealm || confidence === "low") {
      return NextResponse.json({ ok: false, reason: confidence === "low" ? "low_confidence" : "invalid_realm" });
    }

    return NextResponse.json({
      ok: true,
      realm: {
        id: matchedRealm.id,
        slug: matchedRealm.slug,
        name: matchedRealm.name,
        guardian: matchedRealm.guardian,
        accent_color: matchedRealm.accent_color,
      },
      confidence,
      difficulty,
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "unavailable" });
  }
}
