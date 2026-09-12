// Static, deterministic flavor lines per Guardian — shown on quest completion
// and level-up. Not AI-generated, so this stays fast and predictable.
const GUARDIAN_LINES: Record<string, string[]> = {
  "The Fairy Keeper": [
    "The woods rustle in approval.",
    "Strength given freely returns tenfold.",
    "Another root grows deep.",
    "The Enchanted Woods remember every step you take.",
    "Well earned. The grove is a little greener now.",
  ],
  "The Royal Dragon": [
    "Vitality restored — the Kingdom stirs.",
    "Rest is a discipline too. Well done.",
    "The Dragon exhales, pleased.",
    "You honored yourself today.",
    "The Celestial Kingdom shines a little brighter.",
  ],
  "The Archivist": [
    "Another page turns. Knowledge does not forget you.",
    "The Library adds this to its endless shelves.",
    "Understanding compounds, quietly.",
    "Well studied. The Archivist nods.",
    "A single fact, carried forward into wisdom.",
  ],
  "AX-7 Ancient Machine": [
    "Connection registered. Bond strength increasing.",
    "AX-7 logs this moment as significant.",
    "Signal received. Relationship: reinforced.",
    "The Ancient Machine hums — a rare sound of approval.",
    "Data point confirmed: you showed up for someone.",
  ],
  "The Star Wanderer": [
    "A new horizon, claimed.",
    "The Frontier widens because you stepped into it.",
    "Curiosity rewarded. The stars take note.",
    "Another unknown, made a little more known.",
    "The Wanderer smiles at a fellow traveler.",
  ],
  "The Chronomancer": [
    "Order restored to the Timeless Realm.",
    "Discipline is a quiet kind of magic.",
    "The Chronomancer marks this hour well spent.",
    "Entropy, pushed back one task at a time.",
    "Well kept. Time itself approves.",
  ],
  "The Dream Weaver": [
    "A new thread woven into the Isles.",
    "Creation always leaves a mark. This one is yours.",
    "The Dream Weaver adds your work to the tapestry.",
    "Expression given form. Beautifully done.",
    "The Isles drift a little more vividly now.",
  ],
  "The Wayfinder": [
    "Even scattered things deserve their due. Well done.",
    "The Wayfinder marks the path, however small.",
    "Not every task is grand — this one still mattered.",
    "Loose ends, tied. The Isles drift on.",
    "Handled. The Wayfinder moves on to the next horizon.",
  ],
};

export function pickGuardianLine(guardian: string): string {
  const lines = GUARDIAN_LINES[guardian];
  if (!lines || lines.length === 0) return "Well done.";
  return lines[Math.floor(Math.random() * lines.length)];
}
