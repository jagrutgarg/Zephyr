"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { playSound } from "@/lib/audioUtil";

type Phase = "picking" | "conflict" | "running" | "finalizing";

type ConflictInfo = { quest_title: string; realm_name: string };

export function FocusSessionOverlay({
  questId,
  questTitle,
  realmName,
  guardian,
  accentColor,
  resume,
  onCancelled,
  onCompleted,
  onError,
}: {
  questId: string;
  questTitle: string;
  realmName: string;
  guardian: string;
  accentColor: string;
  resume?: { startedAt: string; durationMinutes: number };
  onCancelled: () => void;
  onCompleted: (completion: any) => void;
  onError: (message: string) => void;
}) {
  const supabase = createClient();
  const [phase, setPhase] = useState<Phase>(resume ? "running" : "picking");
  const [pendingDuration, setPendingDuration] = useState(25);
  const [customMinutes, setCustomMinutes] = useState("");
  const [startedAt, setStartedAt] = useState<string | null>(resume?.startedAt ?? null);
  const [durationMinutes, setDurationMinutes] = useState<number>(resume?.durationMinutes ?? 25);
  const [progress, setProgress] = useState(0);
  const [remainingSec, setRemainingSec] = useState(0);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [starting, setStarting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const finalizingRef = useRef(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Progress tick — decoupled from any continuous animation loop, driven by
  // real elapsed time against the server-provided start timestamp so it's
  // correct across refresh/navigation/other tabs.
  useEffect(() => {
    if (phase !== "running" || !startedAt) return;
    const start = new Date(startedAt).getTime();
    const durationMs = durationMinutes * 60 * 1000;

    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, Math.max(0, elapsed / durationMs));
      setProgress(p);
      setRemainingSec(Math.ceil(Math.max(0, durationMs - elapsed) / 1000));
      if (p >= 1 && !finalizingRef.current) {
        finalizingRef.current = true;
        finalize();
      }
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, startedAt, durationMinutes]);

  const finalize = async () => {
    setPhase("finalizing");
    // Server time is authoritative: this RPC re-checks elapsed time itself
    // before completing, so a manipulated device clock can't fast-forward it.
    for (let attempt = 0; attempt < 20; attempt++) {
      const { data, error } = await supabase.rpc("get_active_focus_session");
      if (error) {
        onError("Failed to finalize your quest.");
        return;
      }
      if (data.status === "completed" && data.quest_id === questId) {
        onCompleted(data.completion);
        return;
      }
      if (data.status === "none") {
        // Session already resolved elsewhere (e.g. another tab) — refresh the quest list.
        onCompleted(null);
        return;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    onError("The Aether is taking longer than expected. Refresh to check your quest.");
  };

  const handleStart = async () => {
    const duration = customMinutes ? Math.max(1, Math.min(180, Number(customMinutes) || 0)) : pendingDuration;
    if (!duration) return;
    setStarting(true);
    const { data, error } = await supabase.rpc("start_focus_session", { p_quest_id: questId, p_duration_minutes: duration });
    setStarting(false);

    if (error || !data) {
      onError("The Aether didn't respond. Try again.");
      return;
    }
    if (!data.ok) {
      if (data.reason === "active_session_exists") {
        setConflict({ quest_title: data.quest_title, realm_name: data.realm_name });
        setPhase("conflict");
      } else {
        onError("Could not begin the focus session. Try again.");
      }
      return;
    }

    setStartedAt(data.started_at);
    setDurationMinutes(data.duration_minutes);
    setPhase("running");
  };

  const handleCancel = async () => {
    if (!confirm("Abandon this focus session? Your progress will not count.")) return;
    playSound("void");
    await supabase.rpc("cancel_focus_session", { p_quest_id: questId });
    onCancelled();
  };

  const mmss = `${String(Math.floor(remainingSec / 60)).padStart(2, "0")}:${String(remainingSec % 60).padStart(2, "0")}`;
  const angle = progress * 360 - 90;
  const radius = 110;
  const avatarX = Math.cos((angle * Math.PI) / 180) * radius;
  const avatarY = Math.sin((angle * Math.PI) / 180) * radius;
  const circumference = 2 * Math.PI * radius;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          background: "rgba(2,6,23,0.88)",
          backdropFilter: "blur(4px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        {phase !== "finalizing" && (
          <button
            onClick={phase === "running" ? handleCancel : onCancelled}
            aria-label="Close"
            style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "transparent", border: "none", color: "white", cursor: "pointer" }}
          >
            <X size={28} />
          </button>
        )}

        {phase === "picking" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", maxWidth: "420px" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>Begin Your Quest</h2>
            <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>&ldquo;{questTitle}&rdquo; in {realmName}</p>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              {[15, 25, 45].map((m) => (
                <button
                  key={m}
                  onClick={() => { setPendingDuration(m); setCustomMinutes(""); }}
                  style={{
                    flex: 1,
                    padding: "0.7rem",
                    borderRadius: "10px",
                    border: pendingDuration === m && !customMinutes ? `2px solid ${accentColor}` : "1px solid rgba(255,255,255,0.2)",
                    background: pendingDuration === m && !customMinutes ? `${accentColor}25` : "transparent",
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
              style={{ paddingLeft: "1rem", marginBottom: "1.5rem" }}
              placeholder="Custom minutes"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
            />
            <button
              onClick={handleStart}
              disabled={starting}
              className="btn-primary"
              style={{ background: accentColor, color: "black", border: "none", padding: "0.9rem 2rem", borderRadius: "999px", fontWeight: "bold", cursor: "pointer" }}
            >
              {starting ? "Beginning..." : "Start"}
            </button>
          </motion.div>
        )}

        {phase === "conflict" && conflict && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", maxWidth: "420px" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: "bold", marginBottom: "0.75rem" }}>A Session Is Already Underway</h2>
            <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
              You already have a focus session running for &ldquo;{conflict.quest_title}&rdquo; in {conflict.realm_name}. Resume or cancel it before beginning another.
            </p>
            <button onClick={onCancelled} className="btn-primary" style={{ background: accentColor, color: "black" }}>
              Got It
            </button>
          </motion.div>
        )}

        {(phase === "running" || phase === "finalizing") && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center" }}>
            <div style={{ position: "relative", width: "280px", height: "280px", margin: "0 auto" }}>
              <svg width="280" height="280" style={{ position: "absolute", inset: 0 }}>
                <circle cx="140" cy="140" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="4 6" />
                {reducedMotion && (
                  <circle
                    cx="140" cy="140" r={radius} fill="none" stroke={accentColor} strokeWidth="4"
                    strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
                    strokeLinecap="round" transform="rotate(-90 140 140)"
                  />
                )}
              </svg>

              {/* Tower / landmark, glowing brighter as the orbit nears completion */}
              <div
                style={{
                  position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                  width: "64px", height: "64px", borderRadius: "50%",
                  background: `radial-gradient(circle, ${accentColor}${Math.round(40 + progress * 50).toString(16)} 0%, transparent 70%)`,
                  boxShadow: `0 0 ${20 + progress * 40}px ${accentColor}80`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.8rem",
                }}
              >
                🗼
              </div>

              {/* Orbiting avatar */}
              {!reducedMotion && (
                <motion.div
                  style={{
                    position: "absolute", top: "50%", left: "50%",
                    width: "28px", height: "28px", marginLeft: "-14px", marginTop: "-14px",
                    borderRadius: "50%", background: accentColor,
                    boxShadow: `0 0 16px ${accentColor}`,
                  }}
                  animate={{ x: avatarX, y: avatarY }}
                  transition={{ type: "tween", duration: 0.25, ease: "linear" }}
                />
              )}
            </div>

            <div style={{ fontSize: "2.2rem", fontWeight: "bold", fontVariantNumeric: "tabular-nums", marginTop: "1.5rem" }}>
              {phase === "finalizing" ? "Arriving..." : mmss}
            </div>
            <div style={{ color: "#94a3b8", marginTop: "0.25rem" }}>{questTitle}</div>
            <div style={{ color: accentColor, fontSize: "0.85rem", marginTop: "0.25rem" }}>{realmName} · {guardian}</div>

            {phase === "running" && (
              <button
                onClick={handleCancel}
                style={{ marginTop: "2rem", background: "transparent", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5", padding: "0.6rem 1.2rem", borderRadius: "999px", cursor: "pointer" }}
              >
                Cancel Session
              </button>
            )}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
