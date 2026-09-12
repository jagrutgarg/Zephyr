"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { AetheriaRevealIntro } from "./AetheriaRevealIntro";
import { ModelErrorBoundary } from "./ModelErrorBoundary";
import { RealmTowers } from "./RealmTowers";

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
        // Matches the .glb's own authored "Aetheria Map Overview Camera"
        // (translation [0,48,107], yfov ~26.5°) — the model's true world
        // scale is much larger than a small default scene, so the camera
        // has to sit far enough back to actually frame it.
        camera={{ position: [0, 48, 107], fov: 26.5, near: 0.1, far: 1000 }}
        style={{ width: "100%", height: "100%" }}
        gl={{ alpha: true }}
      >
        <color attach="background" args={["#020617"]} />
        <fog attach="fog" args={["#020617", 80, 260]} />
        <ambientLight intensity={0.7} />
        {/* decay=0 keeps intensity independent of the model's real-world scale/distance */}
        <pointLight position={[40, 80, 40]} intensity={3} decay={0} color="#8b5cf6" />
        <pointLight position={[-60, 40, -40]} intensity={1.2} decay={0} color="#3b82f6" />
        <directionalLight position={[30, 100, 60]} intensity={1.2} />
        <ModelErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <AetheriaRevealIntro />
          </Suspense>
        </ModelErrorBoundary>
        <RealmTowers />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={[0, 0, 0]}
          minDistance={40}
          maxDistance={220}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 - 0.03}
        />
      </Canvas>
    </div>
  );
}
