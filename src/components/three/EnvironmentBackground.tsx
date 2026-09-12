"use client";

import { Suspense } from "react";
import { GltfModel } from "./GltfModel";
import { ModelErrorBoundary } from "./ModelErrorBoundary";

const MAP_MODEL_PATH = "/models/environment/aetheria_map.glb";

/**
 * Ambient background environment behind the Realm Walker focus scene.
 * Renders /models/environment/aetheria_map.glb if present; renders nothing
 * (not even a placeholder) if it's missing or fails to load, so the scene
 * degrades to the plain starfield/ground it already has.
 */
export function EnvironmentBackground({
  scale = 1,
  position = [0, -1, 0],
}: {
  scale?: number;
  position?: [number, number, number];
}) {
  return (
    <ModelErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <GltfModel path={MAP_MODEL_PATH} scale={scale} position={position} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
