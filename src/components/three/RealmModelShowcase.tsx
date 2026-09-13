"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { GltfModel } from "./GltfModel";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import { KNOWN_REALM_MODELS } from "@/lib/realmModels";

function SlowSpin({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.25;
  });
  return <group ref={ref}>{children}</group>;
}

/**
 * A small, self-contained 3D preview of this specific Realm's model on its
 * own detail page — an isolated Canvas loading exactly one model, the same
 * low-risk pattern already used by the quest-walker focus scene. Renders
 * nothing at all if this Realm has no known model yet (see
 * src/lib/realmModels.ts), so realms without an asset just keep their
 * existing 2D themed background with no empty box left behind.
 */
export function RealmModelShowcase({ realmSlug, accentColor }: { realmSlug: string; accentColor: string }) {
  const modelInfo = KNOWN_REALM_MODELS[realmSlug];
  if (!modelInfo) return null;

  return (
    <div style={{ width: "100%", height: "260px", borderRadius: "20px", overflow: "hidden", border: `1px solid ${accentColor}35`, background: "rgba(2,6,23,0.4)" }}>
      <Canvas camera={{ position: [0, 1.2, 4.2], fov: 40 }} gl={{ alpha: true }}>
        <color attach="background" args={["#00000000"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 6, 4]} intensity={0.9} />
        <pointLight position={[-3, 2, -2]} intensity={0.4} color={accentColor} />
        <ModelErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <SlowSpin>
              <GltfModel path={modelInfo.path} scale={modelInfo.scale} position={modelInfo.position} exposure={modelInfo.exposure ?? 0.6} />
            </SlowSpin>
          </Suspense>
        </ModelErrorBoundary>
        <OrbitControls
          makeDefault
          enableDamping
          enablePan={false}
          minDistance={2}
          maxDistance={8}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI / 2 - 0.05}
        />
      </Canvas>
    </div>
  );
}
