"use client";

import { Billboard, Text } from "@react-three/drei";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSpring, animated } from "@react-spring/three";

/**
 * A Realm's name floating above its island, rendered as real text in the
 * WebGL scene (not a flat 2D HTML overlay) — always faces the camera
 * (Billboard) and fakes a raised/extruded look cheaply: a darker copy of
 * the same text sits slightly behind and offset, like a drop-shadow along
 * the depth axis, instead of paying for real extruded 3D text geometry
 * (which is far heavier and this scene has already hit real GPU-memory
 * limits from oversized assets more than once).
 */
export function RealmLabel3D({
  slug,
  position,
  text,
  color,
  fontSize = 3.2,
}: {
  slug: string;
  position: [number, number, number];
  text: string;
  color: string;
  fontSize?: number;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);

  const { scale } = useSpring({
    scale: hovered ? 1.08 : 1.0,
    config: { mass: 1, tension: 280, friction: 20 },
  });

  return (
    <Billboard position={position} follow>
      <animated.group
        scale={scale as any}
        onClick={(e: any) => { e.stopPropagation(); router.push(`/realms/${slug}`); }}
        onPointerOver={(e: any) => { e.stopPropagation(); document.body.style.cursor = "pointer"; setHovered(true); }}
        onPointerOut={() => { document.body.style.cursor = "auto"; setHovered(false); }}
      >
      {/* shadow layer, offset back+down to read as depth/extrusion */}
      <Text
        position={[0.12, -0.12, -0.15]}
        fontSize={fontSize}
        color="#000000"
        fillOpacity={0.55}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0}
      >
        {text}
      </Text>
      {/* face layer */}
      <Text
        fontSize={fontSize}
        color={hovered ? "#ffffff" : color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={fontSize * 0.03}
        outlineColor="#020617"
        outlineOpacity={0.9}
      >
        {text}
      </Text>
      </animated.group>
    </Billboard>
  );
}
