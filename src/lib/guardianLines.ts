// Static, deterministic flavor lines per Guardian — shown on quest completion
// and level-up. Not AI-generated, so this stays fast and predictable.
const GUARDIAN_LINES: Record<string, string[]> = {
  "The Fairy Keeper": [
    "The woods rustle in approval.",
    "Strength given freely returns tenfold.",
    "Another root grows deep into the fertile soil.",
    "The Enchanted Woods remember every step you take.",
    "Well earned. The grove is a little greener now.",
    "Light filters through the canopy — a sign of progress.",
    "The forest whispers your name in gratitude.",
  ],
  "The Royal Dragon": [
    "Vitality restored — the Kingdom stirs.",
    "Rest is a discipline too. Well done.",
    "The Dragon exhales, pleased and steady.",
    "You honored yourself today.",
    "The Celestial Kingdom shines a little brighter.",
    "Golden sparks drift from the Dragon's wings.",
    "A noble feat recorded in the High Court.",
  ],
  "The Archivist": [
    "Another page turns. Knowledge does not forget you.",
    "The Library adds this to its endless shelves.",
    "Understanding compounds, quietly.",
    "Well studied. The Archivist nods in quiet approval.",
    "A single fact, carried forward into wisdom.",
    "Ancient ink dries on your latest accomplishment.",
    "The Astral halls chime softly with fresh insight.",
  ],
  "The Star Wanderer": [
    "A new horizon, claimed.",
    "The Frontier widens because you stepped into it.",
    "Curiosity rewarded. The stars take note.",
    "Another unknown, made a little more known.",
    "The Wanderer smiles at a fellow traveler.",
    "Cosmic dust glimmers along your trail.",
    "A new constellation reflects your determination.",
  ],
  "The Chronomancer": [
    "Order restored to the Timeless Realm.",
    "Discipline is a quiet kind of magic.",
    "The Chronomancer marks this hour well spent.",
    "Entropy, pushed back one task at a time.",
    "Well kept. Time itself approves.",
    "The grand pendulum swings in your favor.",
    "A moment crystallized into enduring progress.",
  ],
  "The Dream Weaver": [
    "A new thread woven into the Isles.",
    "Creation always leaves a mark. This one is yours.",
    "The Dream Weaver adds your work to the tapestry.",
    "Expression given form. Beautifully done.",
    "The Isles drift a little more vividly now.",
    "Vibrant hues bloom across the sky.",
    "Inspiration surges like a tide across the realm.",
  ],
};

const GENERIC_FALLBACK_LINES = [
  "Well done.",
  "Handled. On to the next horizon.",
  "Every step, no matter how small, advances the voyage.",
  "Not every task is grand — this one still mattered.",
];

export function pickGuardianLine(guardian: string): string {
  const lines = GUARDIAN_LINES[guardian] || GENERIC_FALLBACK_LINES;
  if (!lines || lines.length === 0) return "Well done.";
  return lines[Math.floor(Math.random() * lines.length)];
}
