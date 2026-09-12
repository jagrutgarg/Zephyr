"use client";

import { Suspense, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
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

/** Scales a tower up from nothing over ~1.2s the first time it renders — the "manifesting" moment. */
function GrowIn({ targetScale, children }: { targetScale: number; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const elapsedRef = useRef(0);

  useFrame((_, delta) => {
    if (!ref.current) return;
    elapsedRef.current = Math.min(1.2, elapsedRef.current + delta);
    const t = elapsedRef.current / 1.2;
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    ref.current.scale.setScalar(eased * targetScale);
  });

  return <group ref={ref}>{children}</group>;
}

/**
 * Renders each Realm's tower .glb sitting on its island in the shared World
 * Map scene — but only for Realms the user has actually awakened (at least
 * one completed quest there). An untouched Realm stays empty sky per the
 * lore, until its first completion makes the Tower manifest. Silently skips
 * a placement if its .glb is missing.
 */
export function RealmTowers({ awakenedSlugs }: { awakenedSlugs: Set<string> }) {
  return (
    <>
      {TOWER_PLACEMENTS.filter((t) => awakenedSlugs.has(t.realmSlug)).map(({ realmSlug, position, rotationY = 0, scale = 1 }) => (
        <ModelErrorBoundary key={realmSlug} fallback={null}>
          <Suspense fallback={null}>
            <group position={position} rotation={[0, rotationY, 0]}>
              <GrowIn targetScale={scale}>
                <GltfModel path={`/models/realms/${realmSlug}.glb`} />
              </GrowIn>
            </group>
          </Suspense>
        </ModelErrorBoundary>
      ))}
    </>
  );
}
