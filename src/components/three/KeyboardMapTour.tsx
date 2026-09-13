"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { REALMS } from "@/lib/realms";
import { LABEL_POSITIONS } from "./RealmLabels";

type PointOfInterest = {
  name: string;
  /** Where the camera looks. */
  target: [number, number, number];
  /** Where the camera sits. */
  position: [number, number, number];
};

const overviewPOI: PointOfInterest = { name: "Aetheria Overview", target: [0, 0, 0], position: [0, 48, 107] };

const POINTS_OF_INTEREST: PointOfInterest[] = [
  overviewPOI,
  ...REALMS.map((r): PointOfInterest => {
    const pos = LABEL_POSITIONS[r.id] || [0, 20, 0];
    return {
      name: r.name,
      target: [pos[0], pos[1] - 10, pos[2]],
      position: [pos[0] * 1.3, pos[1] + 15, pos[2] * 1.3 + 30],
    };
  })
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
