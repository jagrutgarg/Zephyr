"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GltfModel } from "./GltfModel";
import { ModelErrorBoundary } from "./ModelErrorBoundary";

/**
 * Renders /models/environment/aetheria_map.glb as the World Map's 3D
 * backdrop, sitting behind the starfield/nebula overlay and the 2D Realm
 * nodes/HUD. Free-look camera controls (drag to rotate, scroll to zoom,
 * right-click/two-finger drag to pan) let you move around the map — the
 * 2D Realm nodes stay on top and still intercept their own clicks first,
 * so dragging empty space orbits the camera without breaking navigation.
 * Renders nothing if the model is missing.
 */
export function DashboardMapBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 9, 9], fov: 50 }}
        style={{ width: "100%", height: "100%" }}
        gl={{ alpha: true }}
      >
        <color attach="background" args={["#020617"]} />
        <fog attach="fog" args={["#020617", 10, 24]} />
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 8, 5]} intensity={50} color="#8b5cf6" />
        <pointLight position={[-6, 4, -4]} intensity={20} color="#3b82f6" />
        <ModelErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <GltfModel path="/models/environment/aetheria_map.glb" />
          </Suspense>
        </ModelErrorBoundary>
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={[0, 0, 0]}
          minDistance={3}
          maxDistance={22}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 - 0.03}
        />
      </Canvas>
    </div>
  );
}
