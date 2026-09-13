"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Sparkles, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { OrbitCharacter } from "./OrbitCharacter";
import { GltfModel } from "./GltfModel";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import { EnvironmentBackground } from "./EnvironmentBackground";
import { KNOWN_REALM_MODELS } from "@/lib/realmModels";

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
