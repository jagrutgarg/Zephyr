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

/**
 * Renders /models/realms/<slug>.glb if present, otherwise the placeholder
 * icosahedron. Drop a .glb at that path and it swaps in automatically —
 * no code change needed (see public/models/README.md).
 */
function Centerpiece({ realmSlug, color, celebrating }: { realmSlug: string; color: string; celebrating: boolean }) {
  return (
    <>
      <ModelErrorBoundary fallback={<PrimitiveCenterpiece color={color} celebrating={celebrating} />}>
        <Suspense fallback={<PrimitiveCenterpiece color={color} celebrating={celebrating} />}>
          <GltfModel path={`/models/realms/${realmSlug}.glb`} />
        </Suspense>
      </ModelErrorBoundary>
      {celebrating && <Sparkles count={80} scale={4} size={4} speed={0.6} color={color} />}
    </>
  );
}

export function RealmScene({
  realmSlug,
  themeColor,
  orbitRadius = 2.6,
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
      camera={{ position: [0, 3.5, 6], fov: 45 }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020617", 6, 16]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 5, 4]} intensity={60} color={themeColor} castShadow />
      <pointLight position={[-4, 2, -3]} intensity={20} color="#ffffff" />

      <EnvironmentBackground />

      <Centerpiece realmSlug={realmSlug} color={themeColor} celebrating={celebrating} />

      <OrbitCharacter radius={orbitRadius} startTs={startTs} durationMs={durationMs} onComplete={onOrbitComplete} />

      {/* ground disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <circleGeometry args={[4.5, 48]} />
        <meshStandardMaterial color="#0f172a" roughness={0.8} />
      </mesh>

      {/* Free look: drag to rotate, scroll/pinch to zoom, right-click/two-finger drag to pan */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        target={[0, 0, 0]}
        minDistance={2.5}
        maxDistance={12}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </Canvas>
  );
}
