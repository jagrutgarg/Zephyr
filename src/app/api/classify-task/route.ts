import { NextResponse } from "next/server";
import { REALMS } from "@/lib/realms";

const VALID_SLUGS = new Set(REALMS.map((r) => r.id));

const KEYWORD_FALLBACK: { slug: string; keywords: string[] }[] = [
  { slug: "enchanted_woods", keywords: ["gym", "run", "workout", "exercise", "lift", "sport", "walk", "cardio", "yoga"] },
  { slug: "astral_library", keywords: ["study", "code", "read", "learn", "homework", "exam", "write code", "debug", "research", "assignment"] },
  { slug: "celestial_kingdom", keywords: ["sleep", "meditate", "health", "doctor", "rest", "self-care", "water", "eat", "diet"] },
  { slug: "dreaming_isles", keywords: ["draw", "paint", "music", "write", "sketch", "design", "create", "compose", "art"] },
  { slug: "timeless_realm", keywords: ["clean", "budget", "bills", "admin", "organize", "plan", "schedule", "finance", "chore", "laundry"] },
  { slug: "neo_mystica", keywords: ["call", "meet", "friend", "family", "email", "message", "social", "network", "team"] },
  { slug: "xyran_frontier", keywords: ["travel", "explore", "new skill", "trip", "adventure", "hobby"] },
];

function fallbackClassify(task: string): { realm_slug: string; attribute: string } {
  const lower = task.toLowerCase();
  for (const entry of KEYWORD_FALLBACK) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      const realm = REALMS.find((r) => r.id === entry.slug)!;
      return { realm_slug: realm.id, attribute: realm.attribute };
    }
  }
  // Default catch-all
  const realm = REALMS.find((r) => r.id === "xyran_frontier")!;
  return { realm_slug: realm.id, attribute: realm.attribute };
}

export async function POST(request: Request) {
  let task = "";
  try {
    const body = await request.json();
    task = typeof body?.task === "string" ? body.task.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!task) {
    return NextResponse.json({ error: "Task text is required" }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(fallbackClassify(task));
  }

  const realmList = REALMS.map((r) => `${r.id} (${r.attribute}): ${r.name}`).join("\n");

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
          {
            role: "system",
            content: `You classify a user's real-life task into exactly one Realm from this list:\n${realmList}\n\nRespond with ONLY a JSON object of the form {"realm_slug": "<slug>", "attribute": "<attribute>"} using one of the slugs above. No other text.`,
          },
          { role: "user", content: task },
        ],
        temperature: 0.2,
        max_tokens: 60,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(fallbackClassify(task));
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json(fallbackClassify(task));

    const parsed = JSON.parse(match[0]);
    if (typeof parsed.realm_slug === "string" && VALID_SLUGS.has(parsed.realm_slug)) {
      const realm = REALMS.find((r) => r.id === parsed.realm_slug)!;
      return NextResponse.json({ realm_slug: realm.id, attribute: realm.attribute });
    }
    return NextResponse.json(fallbackClassify(task));
  } catch {
    return NextResponse.json(fallbackClassify(task));
  }
}
