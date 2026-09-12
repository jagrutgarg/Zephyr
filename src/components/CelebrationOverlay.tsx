"use client";

import { motion } from "framer-motion";

export function CelebrationOverlay({
  realmName,
  xpGained,
  shardsGained,
  leveledUp,
  newLevel,
  guardianLine,
  onContinue,
}: {
  realmName: string;
  xpGained: number;
  shardsGained: number;
  leveledUp: boolean;
  newLevel?: number;
  guardianLine?: string;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(2,6,23,0.7)",
        backdropFilter: "blur(6px)",
        textAlign: "center",
        padding: "1.5rem",
      }}
    >
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotateX: -20 }}
        animate={{ scale: 1, opacity: 1, rotateX: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
        style={{
          background: "rgba(15,23,42,0.9)",
          border: "1px solid rgba(139,92,246,0.5)",
          borderRadius: "24px",
          padding: "2.5rem 2rem",
          maxWidth: "420px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 60px rgba(139,92,246,0.3)",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🏆</div>
        <h2 style={{ fontSize: "1.6rem", fontWeight: "bold", color: "white", marginBottom: "0.5rem" }}>
          Quest Conquered!
        </h2>
        <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>{realmName} bends to your resolve.</p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginBottom: leveledUp ? "1rem" : "1.5rem" }}>
          <div style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.4)", borderRadius: "12px", padding: "0.6rem 1rem" }}>
            <div style={{ color: "#34d399", fontWeight: "bold" }}>+{xpGained} XP</div>
          </div>
          <div style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)", borderRadius: "12px", padding: "0.6rem 1rem" }}>
            <div style={{ color: "#c4b5fd", fontWeight: "bold" }}>+{shardsGained} Shards</div>
          </div>
        </div>

        {leveledUp && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ color: "#fbbf24", fontWeight: "bold", marginBottom: "1.5rem" }}
          >
            ✨ Realm reached Level {newLevel}!
          </motion.div>
        )}

        {guardianLine && (
          <p style={{ color: "#cbd5e1", fontStyle: "italic", fontSize: "0.85rem", marginBottom: "1.5rem" }}>&ldquo;{guardianLine}&rdquo;</p>
        )}

        <button
          onClick={onContinue}
          className="btn-primary"
          style={{ background: "#8b5cf6", color: "black", border: "none", padding: "0.8rem 1.6rem", borderRadius: "12px", fontWeight: "bold", cursor: "pointer" }}
        >
          Return to the Map
        </button>
      </motion.div>
    </motion.div>
  );
}
