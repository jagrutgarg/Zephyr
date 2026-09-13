"use client";

import { RealmLabel3D } from "./RealmLabel3D";
import { REALMS } from "@/lib/realms";

// Island node positions traced from aetheria_map.glb (see RealmTowers.tsx
// for the same coordinates used to place towers) — floated well above each
// island's own translation so the label clears any tower model beneath it.
// Neo-Mystica and Wandering Isles have no island geometry in this map, so
// they're not placed here.
const LABEL_POSITIONS: Record<string, [number, number, number]> = {
  astral_library: [-27, 34, -46],
  enchanted_woods: [-37, 32, -13],
  celestial_kingdom: [34, 40, -21],
  timeless_realm: [-9, 26, 39],
  xyran_frontier: [42, 30, 16],
  dreaming_isles: [25, 33, 47],
};

/**
 * Each Realm's name floating above its island in the 3D World Map scene
 * itself, instead of only existing as flat 2D HTML text over the canvas.
 */
export function RealmLabels() {
  return (
    <>
      {REALMS.filter((r) => LABEL_POSITIONS[r.id]).map((r) => (
        <RealmLabel3D key={r.id} position={LABEL_POSITIONS[r.id]} text={r.name} color={r.themeColor} />
      ))}
    </>
  );
}
