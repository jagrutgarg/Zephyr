"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { TwinklingStars } from "./TwinklingStars";

export default function ParticleBackground({ color = "#ffffff" }: { color?: string }) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; delay: number; duration: number }[]>([]);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    // Generate static initial positions to avoid hydration mismatch
    const generated = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage vw
      y: Math.random() * 100, // percentage vh
      size: Math.random() * 3 + 1, // 1px to 4px
      delay: Math.random() * 5, // 0s to 5s delay
      duration: Math.random() * 10 + 10, // 10s to 20s
    }));
    setParticles(generated);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {/* Background Starfield Layer */}
      <TwinklingStars />
      {/* Floating Motes */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: color,
            opacity: 0.4,
            boxShadow: `0 0 ${p.size * 2}px ${color}cc`,
          }}
          animate={reducedMotion ? undefined : {
            y: [`${p.y}%`, `${p.y - 15}%`, `${p.y}%`],
            x: [`${p.x}%`, `${p.x + (Math.random() > 0.5 ? 5 : -5)}%`, `${p.x}%`],
            opacity: [0.1, 0.6, 0.1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
