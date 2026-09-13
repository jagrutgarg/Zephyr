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
}: {
  path: string;
  scale?: number | [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const { scene } = useGLTF(path, true);
  const cloned = useCloneScene(scene);

  return (
    <group scale={scale} position={position} rotation={rotation}>
      <primitive object={cloned} />
    </group>
  );
}

// Clone so multiple instances of the same model don't share a transform.
// Auto-scales the model so its maximum dimension is uniformly 3.0
// and centers it at the origin so sizing is perfectly consistent.
function useCloneScene(scene: THREE.Object3D) {
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
    
    return cloned;
  }, [scene]);
}

