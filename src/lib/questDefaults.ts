export type Difficulty = "easy" | "normal" | "hard";

export const DIFF_MAPPING: Record<Difficulty, { xp: number; shard: number }> = {
  easy: { xp: 10, shard: 5 },
  normal: { xp: 25, shard: 12 },
  hard: { xp: 50, shard: 25 },
};

export type Priority = "low" | "medium" | "high";

export const PRIORITY_MAPPING: Record<Priority, { label: string; color: string; bg: string; border: string; rank: number }> = {
  high: { label: "High", color: "#f87171", bg: "rgba(239, 68, 68, 0.2)", border: "rgba(239, 68, 68, 0.4)", rank: 3 },
  medium: { label: "Medium", color: "#fbbf24", bg: "rgba(245, 158, 11, 0.2)", border: "rgba(245, 158, 11, 0.4)", rank: 2 },
  low: { label: "Low", color: "#94a3b8", bg: "rgba(148, 163, 184, 0.15)", border: "rgba(148, 163, 184, 0.3)", rank: 1 },
};

export type ChecklistItem = {
  text: string;
  done: boolean;
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
