"use client";

import type { SilhouetteType } from "@/lib/realmThemes";

/**
 * A single large, softly blurred background shape hinting at each Realm's
 * theme (a castle for Celestial Kingdom, trees for Enchanted Woods, etc.)
 * — simple SVG paths, not illustrated art, kept low-opacity so it never
 * competes with foreground content.
 */
export function RealmSilhouette({ type, color }: { type: SilhouetteType; color: string }) {
  const common = { fill: color, opacity: 0.5 };

  const shapes: Record<SilhouetteType, React.ReactNode> = {
    castle: (
      <g {...common}>
        <rect x="120" y="220" width="360" height="160" />
        <rect x="140" y="150" width="60" height="90" />
        <rect x="400" y="150" width="60" height="90" />
        <rect x="260" y="100" width="80" height="140" />
        <polygon points="140,150 170,110 200,150" />
        <polygon points="400,150 430,110 460,150" />
        <polygon points="260,100 300,50 340,100" />
      </g>
    ),
    trees: (
      <g {...common}>
        <polygon points="120,380 180,180 240,380" />
        <polygon points="240,380 320,120 400,380" />
        <polygon points="380,380 440,220 500,380" />
      </g>
    ),
    books: (
      <g {...common}>
        <rect x="140" y="260" width="120" height="20" rx="4" />
        <rect x="160" y="230" width="140" height="20" rx="4" transform="rotate(-6 230 240)" />
        <rect x="320" y="250" width="130" height="20" rx="4" transform="rotate(5 385 260)" />
        <circle cx="300" cy="140" r="60" opacity="0.35" />
      </g>
    ),
    circuit: (
      <g stroke={color} strokeWidth="3" fill="none" opacity="0.4">
        <path d="M100,300 H250 V200 H400 V320 H500" />
        <path d="M150,150 V250 H300 V180 H450" />
        <circle cx="250" cy="200" r="6" fill={color} />
        <circle cx="400" cy="320" r="6" fill={color} />
        <circle cx="300" cy="180" r="6" fill={color} />
      </g>
    ),
    planet: (
      <g {...common}>
        <circle cx="420" cy="150" r="90" />
        <ellipse cx="420" cy="150" rx="140" ry="20" fill="none" stroke={color} strokeWidth="4" opacity="0.6" />
      </g>
    ),
    gears: (
      <g fill="none" stroke={color} strokeWidth="10" opacity="0.4">
        <circle cx="200" cy="220" r="70" />
        <circle cx="360" cy="150" r="45" />
        <circle cx="200" cy="220" r="90" strokeDasharray="10 14" />
        <circle cx="360" cy="150" r="65" strokeDasharray="8 10" />
      </g>
    ),
    clouds: (
      <g {...common}>
        <ellipse cx="200" cy="220" rx="110" ry="45" />
        <ellipse cx="340" cy="180" rx="90" ry="38" />
        <ellipse cx="420" cy="260" rx="100" ry="40" />
      </g>
    ),
    compass: (
      <g fill="none" stroke={color} strokeWidth="4" opacity="0.5">
        <circle cx="300" cy="220" r="110" />
        <line x1="300" y1="110" x2="300" y2="330" />
        <line x1="190" y1="220" x2="410" y2="220" />
        <polygon points="300,150 320,220 300,290 280,220" fill={color} stroke="none" opacity="0.4" />
      </g>
    ),
  };

  return (
    <svg
      viewBox="0 0 600 400"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", filter: "blur(6px)" }}
      aria-hidden="true"
    >
      {shapes[type]}
    </svg>
  );
}
