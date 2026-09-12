"use client";

import { useEffect, useState } from "react";

type Star = { id: number; x: number; y: number; size: number; delay: number; duration: number };

export function TwinklingStars({ count = 90, color = "#ffffff" }: { count?: number; color?: string }) {
  const [stars, setStars] = useState<Star[]>([]);

  // Generated after mount so server and client markup match.
  useEffect(() => {
    setStars(
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.8 + 0.8,
        delay: Math.random() * 6,
        duration: Math.random() * 3 + 2,
      }))
    );
  }, [count]);

  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {stars.map((s) => (
        <span
          key={s.id}
          className="twinkle-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            background: color,
            boxShadow: `0 0 ${s.size * 3}px ${color}`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
