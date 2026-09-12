"use client";

import { Suspense } from "react";
import { GltfModel } from "./GltfModel";
import { ModelErrorBoundary } from "./ModelErrorBoundary";

const OCEAN_MODEL_PATH = "/models/environment/aetheria_ocean.glb";

/**
 * The World Map's 3D backdrop — golden sun, god-rays, a 900-unit ocean
 * base. It has its own orthographic "overview" camera authored for a
 * standalone shot, which we don't use here; instead it's positioned under
 * the perspective camera in DashboardMapBackground. Renders nothing if the
 * model is missing.
 */
export function OceanLayer({ y = 0 }: { y?: number }) {
  return (
    <ModelErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <GltfModel path={OCEAN_MODEL_PATH} position={[0, y, 0]} />
      </Suspense>
    </ModelErrorBoundary>
  );
}
