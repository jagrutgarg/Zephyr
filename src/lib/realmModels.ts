export type RealmModelInfo = {
  path: string;
  scale?: number;
  position?: [number, number, number];
  exposure?: number;
};

// Single source of truth for which Realms have a real .glb and how to frame
// it — used by the quest-walker focus scene (RealmScene.tsx) and the realm
// detail page's model showcase (RealmModelShowcase.tsx), so both stay in
// sync instead of drifting out of two separately-maintained copies.
export const KNOWN_REALM_MODELS: Record<string, RealmModelInfo> = {
  astral_library: { path: "/models/realms/astral_library_lowpoly_backup.glb", scale: 1.0, position: [0, -1.8, 0] },
  enchanted_woods: { path: "/models/environment/enchanted_woods_island.glb", scale: 1.0, position: [0, -1.8, 0] },
  xyran_frontier: { path: "/models/realms/xyran_frontier.glb", scale: 1.0, position: [0, -1.8, 0] },
  celestial_kingdom: { path: "/models/realms/celestial_kingdom.glb", scale: 1.0, position: [0, -1.8, 0] },
  timeless_realm: { path: "/models/realms/timeless_realm.glb", scale: 1.0, position: [0, -1.8, 0] },
};
