"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { RealmTowers } from "./RealmTowers";
import { VoidVortex } from "./VoidVortex";
import { OceanLayer } from "./OceanLayer";

/**
 * Renders aetheria_ocean.glb as the World Map's 3D backdrop (the old
 * island-map model + its cloud-reveal intro have been retired), sitting
 * behind the starfield/nebula overlay and the 2D Realm nodes/HUD. Free-look
 * camera controls (drag to rotate, scroll to zoom, right-click/two-finger
 * drag to pan) let you move around the scene — the 2D Realm nodes stay on
 * top and still intercept their own clicks first, so dragging empty space
 * orbits the camera without breaking navigation.
 */
export function DashboardMapBackground({ awakenedSlugs, voidPercentage = 0 }: { awakenedSlugs: Set<string>; voidPercentage?: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      <Canvas
        // The ocean base is a ~900-unit plane — sit further back than the
        // old island map's camera required to frame it comfortably.
        // Higher, more top-down angle: at the old grazing angle the ocean
        // surface reflected almost nothing and read as flat dark navy.
        camera={{ position: [0, 260, 240], fov: 35, near: 0.1, far: 3000 }}
        style={{ width: "100%", height: "100%" }}
        gl={{ alpha: true }}
      >
        <color attach="background" args={["#0b1e3a"]} />
        {/* No fog — the dark fog was swallowing most of the 900-unit ocean. */}
        <hemisphereLight args={["#bfe3ff", "#0a2a4a", 1.4]} />
        <ambientLight intensity={0.5} />
        {/* decay=0 keeps intensity independent of the model's real-world scale/distance */}
        <directionalLight position={[120, 300, 180]} intensity={2.4} color="#ffe7b0" />
        <pointLight position={[-60, 40, -40]} intensity={0.6} decay={0} color="#3b82f6" />
        <OceanLayer y={0} />
        <RealmTowers awakenedSlugs={awakenedSlugs} />
        <VoidVortex percentage={voidPercentage} />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.08}
          target={[0, 0, 0]}
          minDistance={80}
          maxDistance={700}
          minPolarAngle={0.1}
          maxPolarAngle={Math.PI / 2 - 0.03}
        />
      </Canvas>
    </div>
  );
}
