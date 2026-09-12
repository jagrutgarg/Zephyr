"use client";

import { motion } from "framer-motion";

/**
 * 2D stand-in for the player avatar. Swap this out for <CharacterModel3D />
 * (react-three-fiber / model-viewer consuming a .glb) once assets are ready —
 * PlayerCharacter below owns all positioning/animation so the swap is isolated here.
 */
function CharacterSprite2D({ isWalking }: { isWalking: boolean }) {
  return (
    <motion.svg
      width="36"
      height="52"
      viewBox="0 0 36 52"
      style={{ display: "block", filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.6))" }}
      animate={isWalking ? { y: [0, -3, 0] } : { y: 0 }}
      transition={isWalking ? { duration: 0.45, repeat: Infinity, ease: "easeInOut" } : undefined}
    >
      {/* Cloak/body */}
      <path d="M18 14 C 9 14 6 24 6 36 L 6 48 L 30 48 L 30 36 C 30 24 27 14 18 14 Z" fill="#a78bfa" />
      {/* Head */}
      <circle cx="18" cy="9" r="8" fill="#fde68a" />
      {/* Hood shadow */}
      <path d="M9 9 A 9 9 0 0 1 27 9 C 27 4 23 1 18 1 C 13 1 9 4 9 9 Z" fill="#7c3aed" />
      {/* Legs (walk-cycle swing) */}
      <motion.rect
        x="10"
        y="42"
        width="6"
        height="10"
        rx="2"
        fill="#4c1d95"
        animate={isWalking ? { rotate: [-15, 15, -15] } : { rotate: 0 }}
        style={{ transformOrigin: "13px 42px" }}
        transition={isWalking ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" } : undefined}
      />
      <motion.rect
        x="20"
        y="42"
        width="6"
        height="10"
        rx="2"
        fill="#4c1d95"
        animate={isWalking ? { rotate: [15, -15, 15] } : { rotate: 0 }}
        style={{ transformOrigin: "23px 42px" }}
        transition={isWalking ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" } : undefined}
      />
    </motion.svg>
  );
}

export function PlayerCharacter({
  x,
  y,
  isWalking,
}: {
  x: number;
  y: number;
  isWalking: boolean;
}) {
  return (
    <motion.div
      style={{
        position: "absolute",
        zIndex: 5,
        marginLeft: "-18px",
        marginTop: "-52px",
        pointerEvents: "none",
        transformStyle: "preserve-3d",
      }}
      animate={{ left: `${x}%`, top: `${y}%` }}
      transition={{ type: "spring", stiffness: 40, damping: 14 }}
      whileHover={{ rotateY: 10 }}
    >
      {/* Contact shadow for grounded depth */}
      <div
        style={{
          position: "absolute",
          bottom: "-4px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "24px",
          height: "8px",
          borderRadius: "50%",
          background: "rgba(0,0,0,0.5)",
          filter: "blur(2px)",
        }}
      />
      <CharacterSprite2D isWalking={isWalking} />
    </motion.div>
  );
}
