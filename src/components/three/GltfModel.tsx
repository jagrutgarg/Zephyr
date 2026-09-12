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
}: {
  path: string;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const { scene } = useGLTF(path);
  const cloned = useCloneScene(scene);

  return (
    <group scale={scale} position={position} rotation={rotation}>
      <primitive object={cloned} />
    </group>
  );
}

// Clone so multiple instances of the same model (cached by useGLTF) don't share a transform.
function useCloneScene(scene: THREE.Object3D) {
  return scene.clone(true);
}
