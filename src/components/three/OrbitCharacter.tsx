"use client";

import { Suspense, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GltfModel } from "./GltfModel";
import { ModelErrorBoundary } from "./ModelErrorBoundary";

const CHARACTER_MODEL_PATH = "/models/characters/ff_female_character.glb";

// This is a full Sketchfab-exported scene bundle (9 separate mesh pieces
// spanning an unusually large ~7-unit bounding range, not a clean single
// upright character mesh), so there's no reliable single "character height"
// to compute an exact fitting scale from — 0.06 is a smaller, conservative
// guess after 0.12 read too large; adjust further based on how it actually
// looks orbiting the centerpiece.
const CHARACTER_SCALE = 0.06;

/**
 * Renders /models/characters/ff_female_character.glb if present, otherwise
 * nothing — a placeholder capsule+sphere body used to render here instead,
 * but it read as an ugly, obviously-fake shape whenever the real model
 * failed to load, which was worse than just showing nothing.
 */
function CharacterVisual() {
  return (
    <ModelErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <GltfModel path={CHARACTER_MODEL_PATH} scale={CHARACTER_SCALE} exposure={0.6} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

/**
 * Orbits the realm centerpiece, completing exactly one revolution over
 * [startTs, startTs + durationMs], driven by wall-clock time so speed
 * stays correct regardless of frame rate or tab throttling catch-up.
 */
export function OrbitCharacter({
  radius = 2.1,
  startTs,
  durationMs,
  onComplete,
}: {
  radius?: number;
  startTs: number;
  durationMs: number;
  onComplete: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const completedRef = useRef(false);

  useFrame(() => {
    const elapsed = Date.now() - startTs;
    const progress = Math.min(1, Math.max(0, elapsed / durationMs));
    const angle = progress * Math.PI * 2 - Math.PI / 2;

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    if (groupRef.current) {
      groupRef.current.position.set(x, -1.25, z);
      groupRef.current.rotation.y = -angle + Math.PI;
    }

    if (progress >= 1 && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  });

  return (
    <group ref={groupRef}>
      <CharacterVisual />
    </group>
  );
}
