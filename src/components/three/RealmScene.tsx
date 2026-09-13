"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { OrbitCharacter } from "./OrbitCharacter";
import { GltfModel } from "./GltfModel";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import { EnvironmentBackground } from "./EnvironmentBackground";

function PrimitiveCenterpiece({ color, celebrating }: { color: string; celebrating: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
      meshRef.current.rotation.x += delta * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} castShadow>
      <icosahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={celebrating ? 0.9 : 0.4} roughness={0.3} />
    </mesh>
  );
}

const KNOWN_REALM_MODELS: Record<string, { path: string; scale?: number; position?: [number, number, number]; exposure?: number }> = {
  astral_library: { path: "/models/realms/astral_library_lowpoly_backup.glb", scale: 2.0, position: [0, -1.8, 0], exposure: 0.6 },
  enchanted_woods: { path: "/models/environment/enchanted_woods_island.glb", scale: 0.4, position: [0, -1.8, 0], exposure: 0.6 },
  xyran_frontier: { path: "/models/realms/xyran_frontier.glb", scale: 0.18, position: [0, -1.8, 0], exposure: 0.6 },
};

/**
 * Renders /models/realms/<slug>.glb if present, otherwise the placeholder
 * icosahedron. Drop a .glb at that path and update KNOWN_REALM_MODELS.
 */
function Centerpiece({ realmSlug, color, celebrating }: { realmSlug: string; color: string; celebrating: boolean }) {
  const modelInfo = KNOWN_REALM_MODELS[realmSlug];

  return (
    <>
      {modelInfo ? (
        <ModelErrorBoundary fallback={<PrimitiveCenterpiece color={color} celebrating={celebrating} />}>
          <Suspense fallback={<PrimitiveCenterpiece color={color} celebrating={celebrating} />}>
            <GltfModel path={modelInfo.path} scale={modelInfo.scale} position={modelInfo.position} exposure={modelInfo.exposure ?? 0.6} />
          </Suspense>
        </ModelErrorBoundary>
      ) : (
        <PrimitiveCenterpiece color={color} celebrating={celebrating} />
      )}
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

      {/* Ground void disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.85, 0]} receiveShadow>
        <circleGeometry args={[6, 48]} />
        <meshStandardMaterial color="#050a17" roughness={0.95} />
      </mesh>

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
