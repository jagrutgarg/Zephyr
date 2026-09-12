"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

/**
 * The Void as a real 3D presence at the map's center — a dark, slowly
 * churning particle vortex that visibly grows and thickens as
 * void_percentage rises, instead of only being a HUD number.
 */
export function VoidVortex({ percentage }: { percentage: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const p = Math.max(0, Math.min(100, percentage));
  const radius = 6 + (p / 100) * 14;

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.05;
  });

  return (
    <group ref={groupRef} position={[0, 2, 0]}>
      <mesh>
        <sphereGeometry args={[radius * 0.35, 32, 32]} />
        <meshStandardMaterial color="#000000" emissive="#1e1b4b" emissiveIntensity={0.4} roughness={1} />
      </mesh>
      <Sparkles
        count={40 + Math.round(p)}
        scale={[radius, radius * 0.6, radius]}
        size={3}
        speed={0.15}
        opacity={0.5 + (p / 100) * 0.5}
        color="#4c1d95"
      />
    </group>
  );
}
