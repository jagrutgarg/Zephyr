"use client";

import { useEffect, useState } from "react";

/**
 * Detects real WebGL support (not just presence of the Canvas element) so
 * the 3D World Map can be skipped gracefully on the rare browser/device
 * that can't create a WebGL context, falling back to the 2D starfield +
 * Realm nodes, which render fine on their own regardless of this.
 */
export function useWebGLSupport() {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      setSupported(!!gl);
    } catch {
      setSupported(false);
    }
  }, []);

  return supported; // null while checking, then true/false
}
