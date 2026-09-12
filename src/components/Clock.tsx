"use client";

import { useEffect, useState } from "react";
import { Hourglass } from "lucide-react";

export function ThematicClock() {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTimeStr(new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      }).format(now));
      setDateStr(new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric"
      }).format(now));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeStr) return null; // Wait for hydration

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      background: 'rgba(15,23,42,0.8)',
      padding: '0.4rem 1rem',
      borderRadius: '1rem',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(168, 85, 247, 0.3)',
      color: '#e2e8f0',
      fontFamily: 'monospace',
      fontSize: '0.9rem',
      boxShadow: '0 0 10px rgba(168, 85, 247, 0.15)'
    }}>
      <Hourglass size={14} color="#a855f7" className="animate-pulse" />
      <span>{timeStr}</span>
      <span style={{ color: '#64748b' }}>·</span>
      <span>{dateStr}</span>
    </div>
  );
}
