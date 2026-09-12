export type Difficulty = "easy" | "normal" | "hard";

export const DIFF_MAPPING: Record<Difficulty, { xp: number; shard: number }> = {
  easy: { xp: 10, shard: 5 },
  normal: { xp: 25, shard: 12 },
  hard: { xp: 50, shard: 25 },
};

// 'none' | 'daily' | 'weekly:mon,wed,fri'
export type RepeatRule = string;

export const WEEKDAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

export function describeRepeatRule(rule: RepeatRule): string {
  if (!rule || rule === "none") return "";
  if (rule === "daily") return "Repeats daily";
  if (rule.startsWith("weekly:")) {
    const days = rule.slice(7).split(",").map((d) => d.trim());
    return `Repeats weekly (${days.map((d) => d[0].toUpperCase() + d.slice(1)).join(", ")})`;
  }
  return "";
}
