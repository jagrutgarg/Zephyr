"use client";

import { Suspense, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GltfModel } from "./GltfModel";
import { ModelErrorBoundary } from "./ModelErrorBoundary";

type TowerPlacement = {
  realmSlug: string;
  /** World position on the map, in the ocean scene's coordinate space. */
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
  /** Override the default /models/realms/<slug>.glb path. */
  modelPath?: string;
  /** Multiplies the model's material color/emissive — use <1 to render it dimmer than the shared scene lighting would otherwise make it. */
  exposure?: number;
};

// Extend this as more Realm tower .glb files become available.
const TOWER_PLACEMENTS: TowerPlacement[] = [
  {
    realmSlug: "astral_library",
    position: [-27, 20, -46],
    rotationY: -0.3,
    scale: 1.2,
  },
  {
    realmSlug: "enchanted_woods",
    // Enchanted_Woods Island node in aetheria_map.glb: translation [-37, 13, -13], yaw ~29°.
    // +6 on Y lifts the model from the island's center anchor to sit on top.
    position: [-37, 19, -13],
    rotationY: 0.5,
    scale: 0.6,
    modelPath: "/models/environment/enchanted_woods_island.glb",
    exposure: 0.12,
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
      {TOWER_PLACEMENTS.filter((t) => awakenedSlugs.has(t.realmSlug)).map(({ realmSlug, position, rotationY = 0, scale = 1, modelPath, exposure = 1 }) => (
        <ModelErrorBoundary key={realmSlug} fallback={null}>
          <Suspense fallback={null}>
            <group position={position} rotation={[0, rotationY, 0]}>
              <GrowIn targetScale={scale}>
                <GltfModel path={modelPath ?? `/models/realms/${realmSlug}.glb`} exposure={exposure} />
              </GrowIn>
            </group>
          </Suspense>
        </ModelErrorBoundary>
      ))}
    </>
  );
}
