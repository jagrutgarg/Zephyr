"use client";

import { motion } from "framer-motion";

export function AetheriaRestoredOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "radial-gradient(circle at 50% 40%, rgba(139,92,246,0.35) 0%, rgba(2,6,23,0.95) 70%)",
        backdropFilter: "blur(6px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "1.5rem",
      }}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 140, damping: 14 }}
        style={{ fontSize: "4rem", marginBottom: "1rem" }}
      >
        ✨🌌✨
      </motion.div>
      <motion.h1
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{ fontSize: "2.2rem", fontWeight: "bold", color: "white", marginBottom: "0.75rem" }}
      >
        Aetheria Restored
      </motion.h1>
      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        style={{ color: "#cbd5e1", maxWidth: "480px", marginBottom: "2rem" }}
      >
        Every Realm has grown strong under your care, and the Void has receded entirely.
        Aetheria stands whole — not because the work is finished, but because you kept
        returning to it. The world continues; so do you.
      </motion.p>
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={onDismiss}
        className="btn-primary"
        style={{ background: "#8b5cf6", color: "black", border: "none", padding: "0.9rem 2rem", borderRadius: "999px", fontWeight: "bold", cursor: "pointer" }}
      >
        Continue the Journey
      </motion.button>
    </motion.div>
  );
}
