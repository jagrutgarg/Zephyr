"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

if (typeof window !== "undefined") {
  useGLTF.setDecoderPath("/draco/");
}

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
  scale?: number | [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Multiplies this instance's material color/emissive — use <1 to render it dimmer than the shared scene lighting would otherwise make it. */
  exposure?: number;
}) {
  const { scene } = useGLTF(path, true);
  const cloned = useCloneScene(scene, exposure);

  return (
    <group scale={scale} position={position} rotation={rotation}>
      <primitive object={cloned} />
    </group>
  );
}

// Clone so multiple instances of the same model don't share a transform.
// Auto-scales the model so its maximum dimension is uniformly 3.0 and
// centers it at the origin so sizing is perfectly consistent across
// differently-authored assets, regardless of their own native export scale.
// Also clones materials (rather than sharing the cached ones) whenever
// exposure != 1, so darkening one instance never affects other instances
// of the same cached .glb.
function useCloneScene(scene: THREE.Object3D, exposure: number) {
  return useMemo(() => {
    const cloned = scene.clone(true);

    // Calculate bounding box
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      // Scale model so max dimension is precisely 3.0
      const desiredMax = 3.0;
      const factor = desiredMax / maxDim;
      cloned.scale.setScalar(factor);

      // Center the model cleanly at (0,0,0) based on new scale
      cloned.position.set(-center.x * factor, -center.y * factor, -center.z * factor);
    }

    if (exposure !== 1) {
      cloned.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const applyExposure = (mat: THREE.Material) => {
            const clonedMat = mat.clone();
            if (clonedMat instanceof THREE.MeshStandardMaterial || clonedMat instanceof THREE.MeshPhysicalMaterial) {
              clonedMat.color.multiplyScalar(exposure);
              if (clonedMat.emissive) clonedMat.emissive.multiplyScalar(exposure);
            }
            return clonedMat;
          };
          child.material = Array.isArray(child.material)
            ? child.material.map(applyExposure)
            : applyExposure(child.material);
        }
      });
    }

    return cloned;
  }, [scene, exposure]);
}

