# 3D Model Assets

Drop `.glb` files here — the app automatically detects and loads them at
these exact paths. No code changes needed; if a file is missing, the app
silently falls back to the current placeholder primitive shapes.

## Character
```
public/models/characters/player.glb
```
Used by the orbiting player character in the Realm Walker focus scene
(`src/components/three/OrbitCharacter.tsx`). Model should be authored
facing +Z, roughly 1 unit tall, centered at its feet (origin at ground
level) — the app scales/positions it automatically.

## Realm centerpieces
```
public/models/realms/<slug>.glb
```
One optional file per realm, named by its slug (matches `src/lib/realms.ts`):
- `enchanted_woods.glb`
- `celestial_kingdom.glb`
- `astral_library.glb`
- `neo_mystica.glb`
- `xyran_frontier.glb`
- `timeless_realm.glb`
- `dreaming_isles.glb`

Each renders in place of the default glowing icosahedron in
`src/components/three/RealmScene.tsx`. Keep them roughly 1-2 units
across so they fit the existing camera framing and orbit radius.

The same file also auto-renders as a small live 3D preview on the
Dashboard World Map's Realm node (in place of its flat 2D card) —
see `src/components/three/RealmModelPreview.tsx`, used from
`src/components/MapComponents.tsx`.

## Environment / background
```
public/models/environment/aetheria_map.glb
```
Ambient background model rendered behind everything in the Realm Walker
focus scene (`src/components/three/EnvironmentBackground.tsx`), used by
`RealmScene`. If missing, the scene just falls back to its plain
starfield/ground — nothing else changes.

## Format notes
- Export as binary `.glb` (not `.gltf` + separate textures) for a single
  self-contained file.
- Keep Draco/mesh compression off unless you also wire up `DRACOLoader`
  — plain `.glb` works out of the box with `@react-three/drei`'s `useGLTF`.
- Large files slow first load; aim for well under 5MB per model where
  possible (e.g. via `gltf-transform` or Blender's glTF export
  compression settings).
