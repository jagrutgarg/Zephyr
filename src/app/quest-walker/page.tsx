"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useGameStore } from "@/store/useGameStore";
import { REALMS, findRealmBySlug, type RealmDef } from "@/lib/realms";
import { DIFF_MAPPING, type Difficulty } from "@/lib/questDefaults";
import { RealmScene } from "@/components/three/RealmScene";
import { CelebrationOverlay } from "@/components/CelebrationOverlay";

type Step = "greeting" | "input" | "classifying" | "focus" | "celebrating";

const STORAGE_KEY = "questWalkerSession";

type StoredSession = {
  task: string;
  realmSlug: string;
  attribute: string;
  startTs: number;
  durationMs: number;
};

function difficultyFromMinutes(minutes: number): Difficulty {
  if (minutes <= 15) return "easy";
  if (minutes <= 35) return "normal";
  return "hard";
}

export default function QuestWalkerPage() {
  const router = useRouter();
  const supabase = createClient();
  const { addShards, reduceVoid, gainRealmXP } = useGameStore();

  const [step, setStep] = useState<Step>("greeting");
  const [task, setTask] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [realm, setRealm] = useState<RealmDef | null>(null);
  const [attribute, setAttribute] = useState<string>("");
  const [startTs, setStartTs] = useState<number>(0);
  const [durationMs, setDurationMs] = useState<number>(0);
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [celebrationData, setCelebrationData] = useState<{ xp: number; shards: number; leveledUp: boolean; newLevel?: number } | null>(null);
  const [error, setError] = useState("");

  const completingRef = useRef(false);

  // Resume an in-progress focus session after a refresh/dropped connection
  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return;
    try {
      const session: StoredSession = JSON.parse(raw);
      const foundRealm = findRealmBySlug(session.realmSlug);
      if (!foundRealm) return;
      setTask(session.task);
      setRealm(foundRealm);
      setAttribute(session.attribute);
      setStartTs(session.startTs);
      setDurationMs(session.durationMs);
      setStep("focus");
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Live mm:ss countdown, decoupled from the 3D frame loop
  useEffect(() => {
    if (step !== "focus" || !startTs || !durationMs) return;
    const tick = () => {
      const remaining = Math.max(0, durationMs - (Date.now() - startTs));
      setRemainingSec(Math.ceil(remaining / 1000));
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [step, startTs, durationMs]);

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) {
      setError("Name the quest you intend to conquer.");
      return;
    }
    setError("");
    setStep("classifying");

    let realmSlug = "xyran_frontier";
    let attr = "Exploration";
    try {
      const res = await fetch("/api/classify-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });
      const data = await res.json();
      if (data?.realm_slug) {
        realmSlug = data.realm_slug;
        attr = data.attribute || attr;
      }
    } catch {
      // Fall through with the default catch-all realm — never block the flow.
    }

    const foundRealm = findRealmBySlug(realmSlug) || REALMS[0];
    const start = Date.now();
    const duration = durationMinutes * 60 * 1000;

    setRealm(foundRealm);
    setAttribute(attr);
    setStartTs(start);
    setDurationMs(duration);

    const session: StoredSession = { task, realmSlug: foundRealm.id, attribute: attr, startTs: start, durationMs: duration };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));

    setStep("focus");
  };

  const handleOrbitComplete = async () => {
    if (completingRef.current || !realm) return;
    completingRef.current = true;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: realmRow } = await supabase.from("realms").select("id, name, guardian").eq("slug", realm.id).single();
    if (!realmRow) {
      setError("The Aether didn't respond. Try again.");
      return;
    }

    const difficulty = difficultyFromMinutes(durationMinutes);
    const payload = {
      user_id: user.id,
      realm_id: realmRow.id,
      title: task,
      description: "",
      difficulty,
      xp_value: DIFF_MAPPING[difficulty].xp,
      shard_value: DIFF_MAPPING[difficulty].shard,
      due_date: null,
    };

    const { data: inserted, error: insertError } = await supabase.from("quests").insert([payload]).select().single();
    if (insertError || !inserted) {
      setError("The Aether didn't respond. Try again.");
      completingRef.current = false;
      return;
    }

    const { data: completion, error: completeError } = await supabase.rpc("complete_quest", { p_quest_id: inserted.id });
    localStorage.removeItem(STORAGE_KEY);

    if (completeError) {
      setError("Failed to finalize your quest.");
      completingRef.current = false;
      return;
    }

    addShards(payload.shard_value);
    reduceVoid(2);
    gainRealmXP(realmRow.id, payload.xp_value, completion.leveled_up, completion.new_level);
    sessionStorage.setItem("lastCompletedRealmSlug", realm.id);

    setCelebrationData({
      xp: payload.xp_value,
      shards: payload.shard_value,
      leveledUp: completion.leveled_up,
      newLevel: completion.new_level,
    });
    setStep("celebrating");
  };

  const mmss = `${String(Math.floor(remainingSec / 60)).padStart(2, "0")}:${String(remainingSec % 60).padStart(2, "0")}`;

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#020617", color: "white" }}>
      <AnimatePresence mode="wait">
        {step === "greeting" && (
          <motion.div
            key="greeting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", padding: "1.5rem", textAlign: "center" }}
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ fontSize: "3.5rem" }}
            >
              🧙
            </motion.div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: "bold", maxWidth: "500px" }}>
              What quest will you conquer today?
            </h1>
            <button
              onClick={() => setStep("input")}
              className="btn-primary"
              style={{ background: "#8b5cf6", color: "black", border: "none", padding: "0.9rem 2rem", borderRadius: "999px", fontWeight: "bold", cursor: "pointer" }}
            >
              Speak Your Quest
            </button>
            <button onClick={() => router.push("/dashboard")} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}>
              ← Back to the Map
            </button>
          </motion.div>
        )}

        {step === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}
          >
            <form
              onSubmit={handleSubmitTask}
              style={{ background: "rgba(15,23,42,0.9)", border: "1px solid rgba(139,92,246,0.4)", borderRadius: "24px", padding: "2rem", width: "100%", maxWidth: "460px" }}
            >
              <h2 style={{ fontSize: "1.3rem", fontWeight: "bold", marginBottom: "1.2rem" }}>Describe your quest</h2>
              {error && <div className="alert alert-error mb-4" role="alert" aria-live="assertive">{error}</div>}
              <div className="form-group">
                <label className="form-label" htmlFor="task">What will you do?</label>
                <input
                  id="task"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: "1rem" }}
                  placeholder="e.g. Go for a 5km run"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Focus duration</label>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  {[15, 25, 45].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDurationMinutes(m)}
                      style={{
                        flex: 1,
                        padding: "0.6rem",
                        borderRadius: "10px",
                        border: durationMinutes === m ? "2px solid #8b5cf6" : "1px solid rgba(255,255,255,0.2)",
                        background: durationMinutes === m ? "rgba(139,92,246,0.2)" : "transparent",
                        color: "white",
                        cursor: "pointer",
                      }}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={180}
                  className="form-input"
                  style={{ paddingLeft: "1rem" }}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(1, Math.min(180, Number(e.target.value) || 1)))}
                  aria-label="Custom duration in minutes"
                />
              </div>
              <button type="submit" className="btn-primary mt-2" style={{ background: "#8b5cf6", color: "black" }}>
                Enter the Realm
              </button>
            </form>
          </motion.div>
        )}

        {step === "classifying" && (
          <motion.div
            key="classifying"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem" }}
          >
            <div className="spinner" style={{ width: "32px", height: "32px" }} />
            <p className="auth-subtitle">The Aether divines your path...</p>
          </motion.div>
        )}

        {(step === "focus" || step === "celebrating") && realm && (
          <motion.div key="focus" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: "absolute", inset: 0 }}>
            <RealmScene
              themeColor={realm.themeColor}
              startTs={startTs}
              durationMs={durationMs}
              onOrbitComplete={handleOrbitComplete}
              celebrating={step === "celebrating"}
            />

            {step === "focus" && (
              <div style={{ position: "absolute", top: "1.5rem", left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
                <div style={{ color: realm.themeColor, fontWeight: "bold", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {realm.name} · {attribute}
                </div>
                <div style={{ fontSize: "2.5rem", fontWeight: "bold", fontVariantNumeric: "tabular-nums" }}>{mmss}</div>
                <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>{task}</div>
              </div>
            )}

            {error && step === "focus" && (
              <div className="alert alert-error" role="alert" aria-live="assertive" style={{ position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)" }}>
                {error}
              </div>
            )}

            {step === "celebrating" && celebrationData && (
              <CelebrationOverlay
                realmName={realm.name}
                xpGained={celebrationData.xp}
                shardsGained={celebrationData.shards}
                leveledUp={celebrationData.leveledUp}
                newLevel={celebrationData.newLevel}
                onContinue={() => router.push("/dashboard")}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
