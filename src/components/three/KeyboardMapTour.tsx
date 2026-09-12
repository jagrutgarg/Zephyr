"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

type PointOfInterest = {
  name: string;
  /** Where the camera looks. */
  target: [number, number, number];
  /** Where the camera sits. */
  position: [number, number, number];
};

// Default centered overview, then each landmark in turn — matches the .glb's
// own authored islands (see RealmTowers.tsx for the traced coordinates).
// Zoomed-in offsets keep camera-to-target distance safely above the
// OrbitControls minDistance (see DashboardMapBackground) — otherwise
// OrbitControls.update() clamps the radius back out on the very next
// frame and the "zoom in" never visibly happens.
const POINTS_OF_INTEREST: PointOfInterest[] = [
  { name: "Aetheria Overview", target: [0, 0, 0], position: [0, 48, 107] },
  { name: "The Enchanted Woods", target: [-37, 19, -13], position: [-37, 37, 29] },
  { name: "The Astral Library", target: [-27, 20, -46], position: [-27, 38, -4] },
];

/**
 * Arrow-key camera tour: Right/Down steps forward through the World Map's
 * landmarks (starting from the centered overview), Left/Up steps back —
 * wrapping around. Smoothly tweens both the camera position and the
 * OrbitControls target each frame rather than snapping, and hands control
 * back to the user's own drag/zoom/pan the moment they touch the controls
 * again (OrbitControls keeps working throughout — this only drives it).
 */
export function KeyboardMapTour({ controlsRef }: { controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const [index, setIndex] = useState(0);
  const travelingRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => (i + 1) % POINTS_OF_INTEREST.length);
        travelingRef.current = true;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => (i - 1 + POINTS_OF_INTEREST.length) % POINTS_OF_INTEREST.length);
        travelingRef.current = true;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const targetPos = useRef(new THREE.Vector3(...POINTS_OF_INTEREST[0].position));
  const targetLookAt = useRef(new THREE.Vector3(...POINTS_OF_INTEREST[0].target));
  targetPos.current.set(...POINTS_OF_INTEREST[index].position);
  targetLookAt.current.set(...POINTS_OF_INTEREST[index].target);

  useFrame(({ camera }) => {
    const controls = controlsRef.current;
    if (!controls || !travelingRef.current) return;

    camera.position.lerp(targetPos.current, 0.06);
    controls.target.lerp(targetLookAt.current, 0.06);
    controls.update();

    if (camera.position.distanceTo(targetPos.current) < 0.05) {
      travelingRef.current = false;
    }
  });

  return null;
}
