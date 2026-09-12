"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Swords, ListChecks } from "lucide-react";

type Mode = "new_day" | "same_day_pending" | "same_day_clear";

export function DailyGreeting({
  mode,
  openCount,
  displayName,
  onBeginQuest,
  onViewToday,
  onDismiss,
}: {
  mode: Mode;
  openCount: number;
  displayName?: string;
  onBeginQuest: () => void;
  onViewToday: () => void;
  onDismiss: () => void;
}) {
  const greeting = () => {
    switch (mode) {
      case "new_day":
        return {
          line: `A new day dawns in Aetheria${displayName ? `, ${displayName}` : ""}. What quest will you conquer today?`,
          actionLabel: "Speak Your Quest",
          onAction: onBeginQuest,
        };
      case "same_day_pending":
        return {
          line: `Back again? You still have ${openCount} quest${openCount === 1 ? "" : "s"} waiting for you today.`,
          actionLabel: "Finish a Quest",
          onAction: onViewToday,
        };
      case "same_day_clear":
      default:
        return {
          line: "All quiet for now — you've already answered today's call. Rest, or seek out something new.",
          actionLabel: "Speak Another Quest",
          onAction: onBeginQuest,
        };
    }
  };

  const { line, actionLabel, onAction } = greeting();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        style={{
          position: "absolute",
          top: "5.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 15,
          maxWidth: "min(90vw, 480px)",
          background: "rgba(15,23,42,0.9)",
          border: "1px solid rgba(139,92,246,0.4)",
          borderRadius: "18px",
          padding: "1.1rem 1.4rem",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 30px rgba(139,92,246,0.15)",
          display: "flex",
          gap: "0.9rem",
          alignItems: "flex-start",
          backdropFilter: "blur(10px)",
        }}
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ fontSize: "1.8rem", flexShrink: 0 }}
        >
          🧙
        </motion.div>
        <div style={{ flex: 1 }}>
          <p style={{ color: "#e2e8f0", fontSize: "0.92rem", marginBottom: "0.75rem" }}>{line}</p>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <button
              onClick={onAction}
              style={{ background: "#8b5cf6", color: "black", border: "none", borderRadius: "999px", padding: "0.45rem 1rem", fontWeight: "bold", fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}
            >
              {mode === "same_day_pending" ? <ListChecks size={14} /> : <Swords size={14} />} {actionLabel}
            </button>
            <button
              onClick={onDismiss}
              style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "0.82rem" }}
            >
              Not now
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
