"use client";

import { Billboard, Text } from "@react-three/drei";

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
  position,
  text,
  color,
  fontSize = 3.2,
}: {
  position: [number, number, number];
  text: string;
  color: string;
  fontSize?: number;
}) {
  return (
    <Billboard position={position} follow>
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
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={fontSize * 0.03}
        outlineColor="#020617"
        outlineOpacity={0.9}
      >
        {text}
      </Text>
    </Billboard>
  );
}
