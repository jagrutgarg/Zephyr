"use client";

import { Suspense, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GltfModel } from "./GltfModel";
import { ModelErrorBoundary } from "./ModelErrorBoundary";

const CHARACTER_MODEL_PATH = "/models/characters/chibi_blindbox_girl.glb";

function PrimitiveCharacter() {
  return (
    <>
      {/* body */}
      <mesh position={[0, 0, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.5, 4, 8]} />
        <meshStandardMaterial color="#a78bfa" />
      </mesh>
      {/* head */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#fde68a" />
      </mesh>
    </>
  );
}

/**
 * Renders /models/characters/chibi_blindbox_girl.glb if present, otherwise
 * the placeholder primitive body.
 */
function CharacterVisual() {
  return (
    <ModelErrorBoundary fallback={<PrimitiveCharacter />}>
      <Suspense fallback={<PrimitiveCharacter />}>
        <GltfModel path={CHARACTER_MODEL_PATH} />
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
  radius,
  startTs,
  durationMs,
  onComplete,
}: {
  radius: number;
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
      groupRef.current.position.set(x, 0.6, z);
      groupRef.current.rotation.y = -angle + Math.PI / 2;
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
