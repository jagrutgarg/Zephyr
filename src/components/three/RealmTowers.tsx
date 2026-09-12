"use client";

import { Suspense } from "react";
import { GltfModel } from "./GltfModel";
import { ModelErrorBoundary } from "./ModelErrorBoundary";

type TowerPlacement = {
  realmSlug: string;
  /** World position on the map, traced from aetheria_map.glb's own island nodes. */
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
};

// Extend this as more Realm tower .glb files and their island coordinates
// (traced from aetheria_map.glb's "<Realm> Island" nodes) become available.
const TOWER_PLACEMENTS: TowerPlacement[] = [
  {
    realmSlug: "astral_library",
    // Astral_Library Island node: translation [-27, 15, -46], yaw ~-17.3°.
    // +5 on Y lifts the tower from the island's center anchor to sit on top.
    position: [-27, 20, -46],
    rotationY: -0.3,
    scale: 1.2,
  },
];

/**
 * Renders each Realm's tower .glb (currently just Astral Library) sitting on
 * its island in the shared World Map scene. Silently skips a placement if
 * its .glb is missing, so adding more realms here ahead of their model files
 * being ready is safe.
 */
export function RealmTowers() {
  return (
    <>
      {TOWER_PLACEMENTS.map(({ realmSlug, position, rotationY = 0, scale = 1 }) => (
        <ModelErrorBoundary key={realmSlug} fallback={null}>
          <Suspense fallback={null}>
            <GltfModel
              path={`/models/realms/${realmSlug}.glb`}
              position={position}
              rotation={[0, rotationY, 0]}
              scale={scale}
            />
          </Suspense>
        </ModelErrorBoundary>
      ))}
    </>
  );
}
