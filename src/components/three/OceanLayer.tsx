"use client";

import { Suspense } from "react";
import { GltfModel } from "./GltfModel";
import { ModelErrorBoundary } from "./ModelErrorBoundary";

const OCEAN_MODEL_PATH = "/models/environment/aetheria_ocean.glb";

/**
 * Ambient ocean/atmosphere layer (golden sun, god-rays, a 900-unit ocean
 * base) sitting beneath the floating islands in the World Map scene. This
 * is a separate asset from aetheria_map.glb (the islands) — it has its own
 * orthographic "overview" camera authored for a standalone shot, which we
 * don't use here; instead it's positioned as a backdrop under the existing
 * perspective camera already framing the islands. Renders nothing if the
 * model is missing.
 */
export function OceanLayer({ y = -25 }: { y?: number }) {
  return (
    <ModelErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <GltfModel path={OCEAN_MODEL_PATH} position={[0, y, 0]} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
