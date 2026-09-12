"""Aetheria Realms Map v2 — a sunlit, cloud-dominated GLB background.

Run from Blender's Scripting workspace, or headlessly:
  blender --background --python create_aetheria_map_v2.py

The output is written beside this script as ../public/models/environment/aetheria_map.glb.
No external textures are required.  The emission values are deliberately tuned
for a website bloom pass (for example Three.js UnrealBloomPass); without bloom,
the sun and god rays will be attractive but not visibly luminous.
"""

import bpy
import math
import os
import random
from mathutils import Vector

random.seed(481516)

OUT_FILE = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "public", "models", "environment", "aetheria_map.glb"))

# -----------------------------------------------------------------------------
# Foundations / materials
# -----------------------------------------------------------------------------

def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.materials, bpy.data.curves, bpy.data.meshes, bpy.data.cameras, bpy.data.lights):
        for block in datablocks:
            datablocks.remove(block)


def material(name, color, metallic=0.0, roughness=0.65, emission=None, emission_strength=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, alpha)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (*(emission or color), 1)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    else:  # Blender 3.x
        bsdf.inputs["Emission"].default_value = (*(emission or color), 1)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    if alpha < 1:
        bsdf.inputs["Alpha"].default_value = alpha
        m.surface_render_method = "DITHERED" if hasattr(m, "surface_render_method") else "BLENDED"
    return m


def collection(name, parent=None):
    c = bpy.data.collections.new(name)
    (parent or bpy.context.scene.collection).children.link(c)
    return c


def link(obj, coll):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    coll.objects.link(obj)
    return obj


def ico(name, loc, scale, mat, coll, subdivisions=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    link(obj, coll)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def uv_sphere(name, loc, scale, mat, coll, segments=16, rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.name, obj.scale = name, scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    link(obj, coll)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def disc(name, loc, radius, mat, coll, rotation=(math.pi / 2, 0, 0)):
    bpy.ops.mesh.primitive_circle_add(vertices=40, radius=radius, fill_type="TRIFAN", location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return link(obj, coll)


def key_loop(obj, frame_end, location_delta=(0, 0, 0), rotation_delta=(0, 0, 0), scale_delta=None):
    """Two-key loop exported directly as a glTF object animation."""
    obj.keyframe_insert("location", frame=1)
    obj.keyframe_insert("rotation_euler", frame=1)
    obj.keyframe_insert("scale", frame=1)
    obj.location += Vector(location_delta)
    obj.rotation_euler.rotate_axis("Z", rotation_delta[2])
    obj.rotation_euler.rotate_axis("Y", rotation_delta[1])
    obj.rotation_euler.rotate_axis("X", rotation_delta[0])
    if scale_delta:
        obj.scale = [obj.scale[i] * scale_delta[i] for i in range(3)]
    obj.keyframe_insert("location", frame=frame_end)
    obj.keyframe_insert("rotation_euler", frame=frame_end)
    obj.keyframe_insert("scale", frame=frame_end)
    # glTF stores the clip; the website loops it with THREE.AnimationAction.
    # Blender 5's layered Action API no longer exposes `action.fcurves`, so do
    # not add Blender-only cycle modifiers here (they would not survive GLB
    # export in any case).


clear_scene()
scene = bpy.context.scene
# Blender 4 labels this EEVEE Next; Blender 5.2 exposes the same renderer as
# BLENDER_EEVEE again.  The scene contains no renderer-only dependencies, but
# choosing the available engine keeps this script runnable across both.
engine_items = {item.identifier for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engine_items else "BLENDER_EEVEE"
scene.render.fps = 24
scene.frame_start, scene.frame_end = 1, 1440  # 60 seconds
scene.world.color = (0.008, 0.004, 0.025)
scene["AetheriaVersion"] = "Cloudscape Map v2"

root = collection("Aetheria_Map")
cloud_root = collection("Cloud Layers", root)
island_root = collection("Seven Realms", root)
fx_root = collection("Sun and Atmospheric FX", root)
path_root = collection("Connective Paths and Compass", root)

ROCK = material("Rock - plum slate", (0.12, 0.06, 0.20), roughness=0.9)
ROCK_DARK = material("Rock - deep indigo", (0.025, 0.012, 0.075), roughness=0.95)
GOLD = material("Path - sun gold", (0.95, 0.45, 0.10), metallic=0.55, roughness=0.27, emission=(1.0, 0.20, 0.04), emission_strength=0.35)
WARM = material("Cloud - peach gold", (1.0, 0.42, 0.36), roughness=0.85, emission=(1.0, 0.13, 0.08), emission_strength=0.22)
PINK = material("Cloud - rose", (0.82, 0.25, 0.43), roughness=0.9, emission=(0.7, 0.08, 0.22), emission_strength=0.12)
LAVENDER = material("Cloud - lavender", (0.42, 0.28, 0.65), roughness=0.9, emission=(0.16, 0.08, 0.38), emission_strength=0.10)
PERIWINKLE = material("Cloud - periwinkle", (0.22, 0.30, 0.63), roughness=0.9, emission=(0.05, 0.07, 0.3), emission_strength=0.08)
PLUM = material("Cloud - lower plum", (0.10, 0.025, 0.24), roughness=1.0, emission=(0.035, 0.005, 0.10), emission_strength=0.06)
INDIGO = material("Cloud - abyss indigo", (0.012, 0.004, 0.055), roughness=1.0)
SUN = material("Sun", (1.0, 0.34, 0.06), roughness=0.35, emission=(1.0, 0.08, 0.005), emission_strength=8.0)
HALO = material("Sun halo", (1.0, 0.12, 0.025), roughness=0.6, emission=(1.0, 0.025, 0.003), emission_strength=1.4, alpha=0.22)
RAY = material("God ray", (1.0, 0.16, 0.035), roughness=0.75, emission=(1.0, 0.035, 0.005), emission_strength=1.5, alpha=0.16)

# -----------------------------------------------------------------------------
# Cloud ocean: three altitude bands.  Every cluster is a named GLB node.
# -----------------------------------------------------------------------------

def cloud_cluster(name, center, count, radius, height, mats, coll, seed, squash=1.0):
    rng = random.Random(seed)
    empty = bpy.data.objects.new(name, None)
    coll.objects.link(empty)
    for i in range(count):
        angle = rng.random() * math.tau
        distance = radius * math.sqrt(rng.random())
        x, y = math.cos(angle) * distance, math.sin(angle) * distance
        z = rng.uniform(-height, height)
        size = rng.uniform(3.7, 8.5) * squash
        # Icospheres overlap into a rounded, painterly mass rather than a floor.
        blob = ico(f"{name} puff {i + 1}", (x, y, z), (size * rng.uniform(1.15, 1.8), size * rng.uniform(0.65, 1.2), size * rng.uniform(0.38, 0.72)), rng.choice(mats), coll, 2)
        blob.parent = empty
    empty.location = center
    return empty


# Wide clusters intentionally leave valleys at centre/front and between realms.
main_specs = [
    ("Cloud_Center", (0, 9, -8), 26, 27, 5, [WARM, PINK, LAVENDER], 11),
    ("Cloud_Left", (-42, 4, -13), 25, 28, 6, [PINK, LAVENDER, PERIWINKLE], 12),
    ("Cloud_Right", (43, 7, -10), 24, 27, 5, [WARM, PINK, LAVENDER], 13),
    ("Cloud_Back", (0, 47, -7), 24, 33, 5, [WARM, PINK, PERIWINKLE], 14),
    ("Cloud_Front", (0, -42, -6), 20, 28, 5, [LAVENDER, PERIWINKLE, PINK], 15),
]
for spec in main_specs:
    name, center, count, radius, height, mats, seed = spec
    c = cloud_cluster(name, center, count, radius, height, mats, cloud_root, seed)
    key_loop(c, 1440, location_delta=(5 if c.location.x < 0 else -5, 3, 0.7))

upper = collection("Cloud_Upper_Wisps", cloud_root)
for i, (x, y) in enumerate([(-48, -25), (-25, 34), (2, -7), (31, 27), (55, -16), (8, 52)]):
    wisp = cloud_cluster(f"Upper Wisp {i + 1}", (x, y, 22 + (i % 3) * 3), 5, 11, 1.5, [WARM, LAVENDER, PERIWINKLE], upper, 100 + i, 0.48)
    key_loop(wisp, 900, location_delta=(8, -5, 0.2))

lower = collection("Cloud_Lower_Depths", cloud_root)
for i, (x, y) in enumerate([(-44, -32), (-12, -25), (25, -34), (49, -13), (-42, 15), (0, 22), (40, 22), (-8, 54)]):
    depth = cloud_cluster(f"Lower Depth {i + 1}", (x, y, -27 - (i % 3) * 4), 15, 21, 5, [PLUM, PLUM, INDIGO], lower, 200 + i, 1.35)
    key_loop(depth, 1440, location_delta=(-2.5, 1.8, -0.3))

# -----------------------------------------------------------------------------
# Seven islands, spread over a 120 x 120 x 60 volume.
# -----------------------------------------------------------------------------

REALMS = [
    ("Aetheria", (0, 3, 18), 8.8, (0.30, 0.74, 0.55), 0.0),
    ("Enchanted Woods", (-37, 13, 13), 7.2, (0.07, 0.42, 0.18), 0.5),
    ("Celestial Kingdom", (34, 21, 22), 7.3, (0.45, 0.55, 1.0), 0.1),
    ("Astral Library", (-27, 46, 15), 6.6, (0.45, 0.20, 0.72), -0.3),
    ("Xyran Frontier", (42, -16, 12), 7.7, (0.92, 0.23, 0.09), 0.4),
    ("Timeless Realm", (-9, -39, 8), 6.8, (0.92, 0.67, 0.14), -0.4),
    ("Dreaming Isles", (25, -47, 16), 6.3, (0.98, 0.32, 0.62), 0.2),
    ("The Void", (55, 47, -2), 7.5, (0.08, 0.01, 0.18), 0.0),
]

realm_positions = {}
for index, (name, pos, radius, color, rot) in enumerate(REALMS):
    group = bpy.data.objects.new(name.replace(" ", "_") + " Island", None)
    island_root.objects.link(group)
    group.location = pos
    group.rotation_euler[2] = rot
    top = material(name + " terrain", color, roughness=0.82, emission=tuple(v * 0.2 for v in color), emission_strength=0.1)
    # Jagged tapered under-rock plus an organic top, intentionally penetrating cloud sea.
    under = ico(name + " rocky underside", (0, 0, -radius * 0.72), (radius * 0.78, radius * 0.72, radius * 1.38), ROCK_DARK if name == "The Void" else ROCK, island_root, 2)
    under.parent = group
    crown = ico(name + " terrain crown", (0, 0, 0), (radius, radius * 0.85, radius * 0.28), top, island_root, 2)
    crown.parent = group
    for n in range(4):
        a = n * math.tau / 4 + 0.5
        crag = ico(name + " crag " + str(n), (math.cos(a) * radius * 0.45, math.sin(a) * radius * 0.4, radius * 0.32 + n * 0.2), (radius * 0.2, radius * 0.17, radius * (0.35 + n * 0.05)), ROCK, island_root, 1)
        crag.parent = group
    # The Void's rising spiral is deliberately visible above the dark lower cloud band.
    if name == "The Void":
        void_mat = material("Void spiral glow", (0.38, 0.02, 0.76), roughness=0.35, emission=(0.34, 0.0, 1.0), emission_strength=2.1)
        for n in range(10):
            a = n * 0.8
            s = 1.1 + n * 0.33
            orb = ico("Void spiral %02d" % n, (math.cos(a) * s, math.sin(a) * s, 1 + n * 0.58), (0.35, 0.35, 0.35), void_mat, island_root, 1)
            orb.parent = group
        key_loop(group, 720, location_delta=(0, 0, 0.8), rotation_delta=(0, 0, math.tau))
    else:
        key_loop(group, 960 + index * 30, location_delta=(0, 0, 0.65 + (index % 3) * 0.15))
    realm_positions[name] = Vector(pos)

# -----------------------------------------------------------------------------
# Sun, halo and softly transparent geometry rays.  Website bloom is expected.
# -----------------------------------------------------------------------------

sun_pos = Vector((-70, 54, 19))
sun = disc("Eternal Sun", sun_pos, 10, SUN, fx_root, rotation=(math.pi / 2, 0, 0))
sun.rotation_euler = (math.pi / 2, 0, 0)
for r, alpha in [(17, 0.14), (25, 0.07), (34, 0.035)]:
    halo_mat = material("Halo %.0f" % r, (1.0, 0.13, 0.03), emission=(1.0, 0.02, 0.0), emission_strength=0.8, alpha=alpha)
    h = disc("Sun halo %.0f" % r, sun_pos + Vector((0, 0.6, -0.2)), r, halo_mat, fx_root)
    h.rotation_euler = (math.pi / 2, 0, 0)

for i, angle in enumerate([-0.72, -0.38, -0.06, 0.26, 0.60]):
    # Tapered triangles fan through gaps; alpha blend makes them atmospheric, not laser-like.
    start = sun_pos + Vector((0, 0.4, 0))
    direction = Vector((math.cos(angle) * 1.0, math.sin(angle) * 0.75, -0.22)).normalized()
    end = start + direction * (45 + i * 4)
    width = 2.2 + i * 0.5
    verts = [start, end + Vector((-direction.y, direction.x, 0)) * width, end - Vector((-direction.y, direction.x, 0)) * width]
    mesh = bpy.data.meshes.new("God ray mesh %d" % i)
    mesh.from_pydata(verts, [], [(0, 1, 2)])
    ray = bpy.data.objects.new("God Ray %d" % (i + 1), mesh)
    fx_root.objects.link(ray)
    mesh.materials.append(RAY)
    key_loop(ray, 1200 + i * 20, rotation_delta=(0, 0, 0.035 if i % 2 else -0.035), scale_delta=(1.0, 1.0, 1.0))

sun_light_data = bpy.data.lights.new("Sun warm key", "AREA")
sun_light_data.energy, sun_light_data.shape, sun_light_data.size = 1500, "DISK", 30
sun_light_data.color = (1.0, 0.20, 0.08)
sun_light = bpy.data.objects.new("Sun warm key", sun_light_data)
fx_root.objects.link(sun_light)
sun_light.location = sun_pos + Vector((8, -10, 17))

# -----------------------------------------------------------------------------
# Golden inter-island paths and a simple compass.
# -----------------------------------------------------------------------------

def path(name, a, b):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions, curve.bevel_depth, curve.bevel_resolution = "3D", 0.16, 2
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(2)
    midpoint = (a + b) * 0.5 + Vector((0, 0, 4))
    for point, co in zip(spline.bezier_points, (a, midpoint, b)):
        point.co, point.handle_left_type, point.handle_right_type = co, "AUTO", "AUTO"
    obj = bpy.data.objects.new(name, curve)
    path_root.objects.link(obj)
    curve.materials.append(GOLD)


for a, b in [("Aetheria", "Enchanted Woods"), ("Aetheria", "Celestial Kingdom"), ("Aetheria", "Astral Library"), ("Aetheria", "Xyran Frontier"), ("Aetheria", "Timeless Realm"), ("Timeless Realm", "Dreaming Isles"), ("Celestial Kingdom", "The Void")]:
    path("Path %s to %s" % (a, b), realm_positions[a], realm_positions[b])

compass = bpy.data.objects.new("Aetheria Compass", None)
path_root.objects.link(compass)
compass.location = (-50, -47, 4)
for i in range(4):
    a = i * math.pi / 2
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=2.7, radius2=0, depth=0.25, location=(compass.location.x + math.cos(a) * 2, compass.location.y + math.sin(a) * 2, compass.location.z))
    needle = bpy.context.object
    needle.name = "Compass needle"
    needle.rotation_euler[2] = a - math.pi / 4
    needle.data.materials.append(GOLD)
    link(needle, path_root)
    needle.parent = compass

# -----------------------------------------------------------------------------
# Camera: rests at the upper-wisp / main-sea boundary and sees sun + islands.
# -----------------------------------------------------------------------------

camera_data = bpy.data.cameras.new("Aetheria Map Overview Camera")
camera = bpy.data.objects.new("Aetheria Map Overview Camera", camera_data)
root.objects.link(camera)
camera.location = (0, -107, 48)
camera.data.lens = 43
target = Vector((0, 6, 7))
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = camera

ambient_data = bpy.data.lights.new("Cool sky fill", "AREA")
ambient_data.energy, ambient_data.color, ambient_data.size = 850, (0.15, 0.12, 0.55), 60
ambient = bpy.data.objects.new("Cool sky fill", ambient_data)
root.objects.link(ambient)
ambient.location = (5, -20, 52)

# -----------------------------------------------------------------------------
# GLB export.  The kwargs are version-safe around Draco's optional availability.
# -----------------------------------------------------------------------------

os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
export_args = dict(filepath=OUT_FILE, export_format="GLB", export_animations=True, export_apply=True, export_materials="EXPORT", export_cameras=True, export_yup=True)
try:
    bpy.ops.export_scene.gltf(export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6, **export_args)
except TypeError:
    bpy.ops.export_scene.gltf(**export_args)
print("Aetheria v2 exported to", OUT_FILE)
