export type Difficulty = "easy" | "normal" | "hard";

export const DIFF_MAPPING: Record<Difficulty, { xp: number; shard: number }> = {
  easy: { xp: 10, shard: 5 },
  normal: { xp: 25, shard: 12 },
  hard: { xp: 50, shard: 25 },
};
