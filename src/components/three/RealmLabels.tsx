"use client";

import { RealmLabel3D } from "./RealmLabel3D";
import { REALMS } from "@/lib/realms";

// Island node positions traced from aetheria_map.glb (see RealmTowers.tsx
// for the same coordinates used to place towers) — floated well above each
// island's own translation so the label clears any tower model beneath it.
// Neo-Mystica and Wandering Isles have no island geometry in this map, so
// they're not placed here.
export const LABEL_POSITIONS: Record<string, [number, number, number]> = {
  astral_library: [-27, 23, -46],
  enchanted_woods: [-37, 23, -10],
  celestial_kingdom: [34, 23, -25],
  timeless_realm: [-9, 23, 39],
  xyran_frontier: [42, 23, 16],
  dreaming_isles: [16, 23, 49],
  neo_mystica: [65, 23, 30],
  wandering_isles: [-20, 23, -65],
};

/**
 * Each Realm's name floating above its island in the 3D World Map scene
 * itself, instead of only existing as flat 2D HTML text over the canvas.
 */
export function RealmLabels() {
  return (
    <>
      {REALMS.map((r) => {
        const pos = LABEL_POSITIONS[r.id] || [0, 20, 0];
        return <RealmLabel3D key={r.id} slug={r.id} position={pos} text={r.name} color={r.themeColor} />;
      })}
    </>
  );
}
