"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Sparkles, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { OrbitCharacter } from "./OrbitCharacter";
import { GltfModel } from "./GltfModel";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import { EnvironmentBackground } from "./EnvironmentBackground";

// celestial_kingdom.glb and timeless_realm.glb are new, different (much
// smaller, ~38-46MB) source files as of this pass — the earlier ~105-119MB
// versions that blanked the World Map were removed from the repo entirely.
// These are placed here first (an isolated single-model Canvas) rather
// than in the shared World Map scene (RealmTowers.tsx), which has crashed
// on anything much heavier than the two confirmed-safe towers there —
// unverified until someone actually awakens these Realms and confirms.
const KNOWN_REALM_MODELS: Record<string, { path: string; scale?: number; position?: [number, number, number]; exposure?: number }> = {
  astral_library: { path: "/models/realms/astral_library_lowpoly_backup.glb", scale: 2.0, position: [0, -1.8, 0], exposure: 0.6 },
  enchanted_woods: { path: "/models/environment/enchanted_woods_island.glb", scale: 0.4, position: [0, -1.8, 0], exposure: 0.6 },
  xyran_frontier: { path: "/models/realms/xyran_frontier.glb", scale: 0.18, position: [0, -1.8, 0], exposure: 0.6 },
  celestial_kingdom: { path: "/models/realms/celestial_kingdom.glb", scale: 0.05, position: [0, -1.8, 0], exposure: 0.6 },
  timeless_realm: { path: "/models/realms/timeless_realm.glb", scale: 0.05, position: [0, -1.8, 0], exposure: 0.6 },
};

/**
 * Renders /models/realms/<slug>.glb if present, otherwise nothing — a
 * placeholder glowing icosahedron used to render here instead, but it read
 * as an obviously-fake shape whenever the real model failed to load, which
 * was worse than just showing nothing. Drop a .glb at that path and add it
 * to KNOWN_REALM_MODELS.
 */
function Centerpiece({ realmSlug, color, celebrating }: { realmSlug: string; color: string; celebrating: boolean }) {
  const modelInfo = KNOWN_REALM_MODELS[realmSlug];
  if (!modelInfo) return celebrating ? <Sparkles count={80} scale={4} size={4} speed={0.6} color={color} /> : null;

  return (
    <>
      <ModelErrorBoundary fallback={null}>
        <Suspense fallback={null}>
          <GltfModel path={modelInfo.path} scale={modelInfo.scale} position={modelInfo.position} exposure={modelInfo.exposure ?? 0.6} />
        </Suspense>
      </ModelErrorBoundary>
      {celebrating && <Sparkles count={80} scale={4} size={4} speed={0.6} color={color} />}
    </>
  );
}

export function RealmScene({
  realmSlug,
  themeColor,
  orbitRadius = 2.1,
  startTs,
  durationMs,
  onOrbitComplete,
  celebrating = false,
}: {
  realmSlug: string;
  themeColor: string;
  orbitRadius?: number;
  startTs: number;
  durationMs: number;
  onOrbitComplete: () => void;
  celebrating?: boolean;
}) {
  return (
    <Canvas
      shadows
      gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.5 }}
      camera={{ position: [0, 4.0, 7.0], fov: 45 }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020617", 8, 22]} />
      
      {/* Dim, rich, non-overexposed lighting */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 12, 6]} intensity={0.7} color="#ffffff" castShadow />
      <pointLight position={[-4, 3, -3]} intensity={0.3} color={themeColor} />

      <EnvironmentBackground />

      <Centerpiece realmSlug={realmSlug} color={themeColor} celebrating={celebrating} />

      <OrbitCharacter radius={orbitRadius} startTs={startTs} durationMs={durationMs} onComplete={onOrbitComplete} />

      {/* Free look: drag to rotate, scroll/pinch to zoom */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        target={[0, -0.3, 0]}
        minDistance={2.5}
        maxDistance={14}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </Canvas>
  );
}
