"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { gsap } from "gsap";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

type MaterialState = { material: THREE.Material & { opacity?: number }; opacity: number };
type CloudState = {
  object: THREE.Object3D;
  position: THREE.Vector3;
  scale: THREE.Vector3;
  materials: MaterialState[];
};

const CLOUD_NAMES = ["Cloud_Center", "Cloud_Left", "Cloud_Right", "Cloud_Back", "Cloud_Front"];

// A deliberately small separable Gaussian. uBlurAmount is in screen pixels and
// is animated by GSAP, which makes this pass suitable for an opening-only effect.
const FogBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uBlurAmount: { value: 0 },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uBlurAmount;
    varying vec2 vUv;
    void main() {
      vec2 stepSize = (uBlurAmount / uResolution);
      vec4 c = texture2D(tDiffuse, vUv) * 0.227027;
      c += texture2D(tDiffuse, vUv + vec2(stepSize.x * 1.384615, 0.0)) * 0.158864;
      c += texture2D(tDiffuse, vUv - vec2(stepSize.x * 1.384615, 0.0)) * 0.158864;
      c += texture2D(tDiffuse, vUv + vec2(stepSize.x * 3.230769, 0.0)) * 0.070270;
      c += texture2D(tDiffuse, vUv - vec2(stepSize.x * 3.230769, 0.0)) * 0.070270;
      c += texture2D(tDiffuse, vUv + vec2(0.0, stepSize.y * 1.384615)) * 0.158864;
      c += texture2D(tDiffuse, vUv - vec2(0.0, stepSize.y * 1.384615)) * 0.158864;
      c += texture2D(tDiffuse, vUv + vec2(0.0, stepSize.y * 3.230769)) * 0.070270;
      c += texture2D(tDiffuse, vUv - vec2(0.0, stepSize.y * 3.230769)) * 0.070270;
      gl_FragColor = c;
    }
  `,
};

if (typeof window !== "undefined") {
  useGLTF.setDecoderPath("/draco/");
  useGLTF.preload("/models/environment/aetheria_map.glb", true);
}

/**
 * R3F-friendly implementation of the Aetheria page-load reveal. It loads the
 * supplied GLB, logs its cloud nodes, and hands rendering back to R3F after
 * the intro. Pass `introRef` to call `introRef.current?.skipIntro()`.
 */
export function AetheriaRevealIntro({
  path = "/models/environment/aetheria_map.glb",
  introRef,
}: {
  path?: string;
  introRef?: MutableRefObject<{ skipIntro: () => void } | null>;
}) {
  // The Blender exporter enables Draco when available; these local decoder
  // files are copied to public/draco so production does not depend on a CDN.
  const { scene: source } = useGLTF(path, true);
  const scene = useMemo(() => source.clone(true), [source]);
  const { camera, gl, size, scene: canvasScene } = useThree();
  const composerRef = useRef<EffectComposer | null>(null);
  const blurRef = useRef<ShaderPass | null>(null);
  const playingRef = useRef(false);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const cloudsRef = useRef<CloudState[]>([]);
  const restingCameraRef = useRef<{ fov: number; position: THREE.Vector3 } | null>(null);

  // This priority intentionally takes ownership of drawing. Once the reveal is
  // over it uses the plain renderer, so the composer no longer costs a render.
  useFrame((state) => {
    if (playingRef.current && composerRef.current) composerRef.current.render();
    else state.gl.render(state.scene, state.camera);
  }, 1);

  useEffect(() => {
    const composer = new EffectComposer(gl);
    const renderPass = new RenderPass(canvasScene, camera);
    composer.addPass(renderPass);
    const blur = new ShaderPass(FogBlurShader);
    blur.uniforms.uResolution.value.set(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio());
    composer.addPass(blur);
    composerRef.current = composer;
    blurRef.current = blur;
    return () => {
      composer.dispose();
      composerRef.current = null;
      blurRef.current = null;
    };
  }, [camera, canvasScene, gl, size.height, size.width]);

  useEffect(() => {
    const actualCloudNames: string[] = [];
    scene.traverse((node) => {
      if (/cloud/i.test(node.name)) actualCloudNames.push(node.name);
    });
    console.info("[Aetheria reveal] cloud nodes in GLB:", actualCloudNames);

    const named = CLOUD_NAMES.map((name) => scene.getObjectByName(name)).filter(Boolean) as THREE.Object3D[];
    const clusters = named.length ? named : actualCloudNames
      .filter((name) => /cloud\s*cluster/i.test(name))
      .map((name) => scene.getObjectByName(name))
      .filter(Boolean) as THREE.Object3D[];
    if (!clusters.length) {
      console.warn("[Aetheria reveal] No cloud clusters found; showing map without the cloud reveal.");
      return;
    }

    const clouds: CloudState[] = clusters.map((object) => {
      const materials: MaterialState[] = [];
      object.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        const originals = Array.isArray(node.material) ? node.material : [node.material];
        const cloned = originals.map((material) => material.clone() as THREE.Material & { opacity?: number });
        node.material = Array.isArray(node.material) ? cloned : cloned[0];
        cloned.forEach((material) => {
          materials.push({ material, opacity: material.opacity ?? 1 });
          material.transparent = true;
          material.depthWrite = false;
        });
      });
      return { object, position: object.position.clone(), scale: object.scale.clone(), materials };
    });
    cloudsRef.current = clouds;
    const perspective = camera as THREE.PerspectiveCamera;
    restingCameraRef.current = { fov: perspective.fov, position: perspective.position.clone() };

    const applyFinalState = () => {
      clouds.forEach(({ object, position, scale, materials }) => {
        object.position.copy(position);
        object.scale.copy(scale);
        object.visible = false;
        materials.forEach(({ material }) => { if ("opacity" in material) material.opacity = 0; });
      });
      if (restingCameraRef.current) {
        perspective.fov = restingCameraRef.current.fov;
        perspective.position.copy(restingCameraRef.current.position);
        perspective.updateProjectionMatrix();
      }
      if (blurRef.current) blurRef.current.uniforms.uBlurAmount.value = 0;
      playingRef.current = false;
    };
    const skipIntro = () => { timelineRef.current?.kill(); applyFinalState(); };
    if (introRef) introRef.current = { skipIntro };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { skipIntro(); return; }

    // First rendered frame is the fogged state, preventing a clear-frame flash.
    const frame = requestAnimationFrame(() => {
      clouds.forEach(({ object, position, scale, materials }) => {
        object.visible = true;
        object.position.copy(position).multiplyScalar(0.18);
        object.scale.copy(scale).multiplyScalar(1.65);
        materials.forEach(({ material, opacity }) => { if ("opacity" in material) material.opacity = opacity; });
      });
      perspective.fov = restingCameraRef.current!.fov * 0.82;
      perspective.updateProjectionMatrix();
      blurRef.current!.uniforms.uBlurAmount.value = 8;
      playingRef.current = true;

      const directions = [new THREE.Vector3(0, 0, 4), new THREE.Vector3(-6, 0.5, -3), new THREE.Vector3(6, 0.5, -3), new THREE.Vector3(0, 2, -6), new THREE.Vector3(0, -1, 7)];
      const timeline = gsap.timeline({ onComplete: applyFinalState });
      clouds.forEach((cloud, index) => {
        // Scale the dispersal distance to the cloud's own distance from center so it
        // reads as a real "parting" sweep regardless of the model's absolute world scale
        // (these fixed unit offsets were sized for a much smaller scene originally).
        const dispersal = Math.max(cloud.position.length(), 20) * 0.9;
        const direction = directions[index % directions.length].clone().normalize().multiplyScalar(dispersal);
        timeline.to(cloud.object.position, { x: cloud.position.x + direction.x, y: cloud.position.y + direction.y, z: cloud.position.z + direction.z, duration: 2.8, ease: "sine.inOut" }, index * 0.15);
        timeline.to(cloud.object.scale, { x: cloud.scale.x * 1.22, y: cloud.scale.y * 1.22, z: cloud.scale.z * 1.22, duration: 2.5, ease: "sine.inOut" }, index * 0.15);
        cloud.materials.forEach(({ material }) => timeline.to(material, { opacity: 0, duration: 2.35, ease: "power1.in" }, 0.35 + index * 0.15));
      });
      timeline.to(blurRef.current!.uniforms.uBlurAmount, { value: 0, duration: 2.35, ease: "power2.out" }, 0);
      timeline.to(perspective, { fov: restingCameraRef.current!.fov, duration: 3, ease: "power2.out", onUpdate: () => perspective.updateProjectionMatrix() }, 0);
      timelineRef.current = timeline;
    });
    return () => { cancelAnimationFrame(frame); timelineRef.current?.kill(); if (introRef) introRef.current = null; };
  }, [camera, introRef, scene]);

  return <primitive object={scene} />;
}
