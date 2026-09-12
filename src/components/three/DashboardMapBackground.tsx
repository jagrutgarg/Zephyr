"use client";

import { Suspense, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { GltfModel } from "./GltfModel";
import { ModelErrorBoundary } from "./ModelErrorBoundary";

function AimCamera() {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

/**
 * Renders /models/environment/aetheria_map.glb as the World Map's 3D
 * backdrop, sitting behind the existing starfield/nebula overlay and the
 * 2D Realm nodes/HUD. Non-interactive (no camera controls, no pointer
 * events) so it doesn't interfere with clicking Realm nodes — purely
 * atmospheric. Renders nothing if the model is missing.
 */
export function DashboardMapBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 9, 9], fov: 50 }}
        style={{ width: "100%", height: "100%", pointerEvents: "none" }}
        gl={{ alpha: true }}
      >
        <color attach="background" args={["#020617"]} />
        <fog attach="fog" args={["#020617", 10, 24]} />
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 8, 5]} intensity={50} color="#8b5cf6" />
        <pointLight position={[-6, 4, -4]} intensity={20} color="#3b82f6" />
        <AimCamera />
        <ModelErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <GltfModel path="/models/environment/aetheria_map.glb" />
          </Suspense>
        </ModelErrorBoundary>
      </Canvas>
    </div>
  );
}
