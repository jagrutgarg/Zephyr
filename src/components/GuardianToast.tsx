"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function GuardianToast({
  guardian,
  line,
  accentColor,
  onDismiss,
}: {
  guardian: string;
  line: string;
  accentColor: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        style={{
          position: "fixed",
          bottom: "1.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 70,
          background: "rgba(15,23,42,0.92)",
          border: `1px solid ${accentColor}60`,
          borderRadius: "16px",
          padding: "0.9rem 1.3rem",
          maxWidth: "420px",
          boxShadow: `0 10px 30px rgba(0,0,0,0.5), 0 0 30px ${accentColor}20`,
          textAlign: "center",
        }}
      >
        <div style={{ color: accentColor, fontWeight: "bold", fontSize: "0.8rem", marginBottom: "0.25rem" }}>{guardian}</div>
        <div style={{ color: "#e2e8f0", fontSize: "0.9rem", fontStyle: "italic" }}>&ldquo;{line}&rdquo;</div>
      </motion.div>
    </AnimatePresence>
  );
}
