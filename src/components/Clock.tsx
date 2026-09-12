"use client";

import { useEffect, useState } from "react";
import { Hourglass } from "lucide-react";

export function ThematicClock({ accentColor = "#a855f7" }: { accentColor?: string }) {
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
      gap: '0.6rem',
      background: 'rgba(15,23,42,0.75)',
      padding: '0.5rem 1.1rem',
      borderRadius: '0.9rem',
      backdropFilter: 'blur(10px)',
      border: `1px solid ${accentColor}50`,
      color: '#e2e8f0',
      fontFamily: 'monospace',
      fontSize: '0.9rem',
      boxShadow: `0 0 14px ${accentColor}30, inset 0 0 12px rgba(0,0,0,0.3)`
    }}>
      <Hourglass size={14} color={accentColor} className="animate-pulse" />
      <span style={{ fontWeight: 'bold' }}>{timeStr}</span>
      <span style={{ color: accentColor, opacity: 0.6 }}>◆</span>
      <span style={{ color: '#94a3b8' }}>{dateStr}</span>
    </div>
  );
}
