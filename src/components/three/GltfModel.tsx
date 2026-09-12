"use client";

import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * Loads any .glb from /public/models and renders its full scene graph.
 * Wrap in <ModelErrorBoundary> + <Suspense> — useGLTF throws while loading
 * (caught by Suspense) and throws for real on a 404/parse failure (caught
 * by the error boundary), letting callers fall back to a primitive mesh.
 */
export function GltfModel({
  path,
  scale = 1,
  position,
  rotation,
  exposure = 1,
}: {
  path: string;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Multiplies this instance's material color/emissive — use <1 to render it dimmer than the shared scene lighting would otherwise make it. */
  exposure?: number;
}) {
  // "/draco/" points at the self-hosted decoder in public/draco — needed for
  // any .glb exported with Draco mesh compression (e.g. the environment map);
  // harmless no-op for plain, uncompressed .glb files.
  const { scene } = useGLTF(path, "/draco/");
  const cloned = useCloneScene(scene, exposure);

  return (
    <group scale={scale} position={position} rotation={rotation}>
      <primitive object={cloned} />
    </group>
  );
}

// Clone so multiple instances of the same model (cached by useGLTF) don't share a transform.
// Also clones materials (rather than sharing the cached ones) whenever exposure != 1, so
// darkening one instance never affects other instances of the same cached .glb.
function useCloneScene(scene: THREE.Object3D, exposure: number) {
  const cloned = scene.clone(true);
  if (exposure !== 1) {
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const applyExposure = (mat: THREE.Material) => {
          const cloned = mat.clone();
          if (cloned instanceof THREE.MeshStandardMaterial || cloned instanceof THREE.MeshPhysicalMaterial) {
            cloned.color.multiplyScalar(exposure);
            if (cloned.emissive) cloned.emissive.multiplyScalar(exposure);
          }
          return cloned;
        };
        child.material = Array.isArray(child.material)
          ? child.material.map(applyExposure)
          : applyExposure(child.material);
      }
    });
  }
  return cloned;
}
