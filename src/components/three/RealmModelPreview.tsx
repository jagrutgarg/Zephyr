"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GltfModel } from "./GltfModel";
import { ModelErrorBoundary } from "./ModelErrorBoundary";

function AutoRotate({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.4;
  });
  return <group ref={ref}>{children}</group>;
}

/**
 * Small always-on 3D preview used on the dashboard's World Map in place of
 * a Realm's flat 2D card, when /models/realms/<slug>.glb exists. Renders
 * nothing (letting the caller's 2D fallback show through) if it's missing.
 */
export function RealmModelPreview({ realmSlug }: { realmSlug: string }) {
  return (
    <Canvas
      camera={{ position: [0, 1, 3], fov: 40 }}
      style={{ width: "100%", height: "100%", pointerEvents: "none" }}
      gl={{ alpha: true }}
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[2, 3, 2]} intensity={30} />
      <Suspense fallback={null}>
        <AutoRotate>
          <GltfModel path={`/models/realms/${realmSlug}.glb`} />
        </AutoRotate>
      </Suspense>
    </Canvas>
  );
}

export function RealmModelPreviewWithFallback({
  realmSlug,
  fallback,
}: {
  realmSlug: string;
  fallback: React.ReactNode;
}) {
  return (
    <ModelErrorBoundary fallback={fallback}>
      <RealmModelPreview realmSlug={realmSlug} />
    </ModelErrorBoundary>
  );
}
