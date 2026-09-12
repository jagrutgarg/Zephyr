"""Build the Aetheria ocean base and export public/models/environment/aetheria_ocean.glb.

Performance budget
------------------
* Ocean is one 141 x 141 vertex grid: 39,200 triangles over 900 x 900 units.
* One ocean material / one draw call.  Detail is three 1024px repeating maps
  (albedo/caustic, normal, and a colour-variation mask) embedded in the GLB.
* Geometry only contains broad swells; normal/caustic detail is texture based.

The source texture coordinates are measured in *world units* (one repeat every
5 units), rather than 0..1 across the sea.  Consequently wave size stays the
same if OCEAN_SIZE changes.  glTF has no portable shader-time texture scrolling;
the material is exported with named textures and `userData` identifying the
scroll rates for the Three.js loader to apply to texture.offset.  Object motion
(particles and light shafts) is exported as native glTF animation clips.

Run:
  blender --background --python scripts/create_aetheria_ocean.py
"""

import bpy
import math
import os
import random
from mathutils import Vector

random.seed(80421)

OCEAN_SIZE = 900.0
GRID_CELLS = 140                 # 39,200 triangles
TILE_WORLD_UNITS = 5.0
TEXTURE_SIZE = 1024
FRAME_END = 1440                 # 60 seconds at 24 fps
OUT_FILE = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "public", "models", "environment", "aetheria_ocean.glb"))


# -----------------------------------------------------------------------------
# Helpers / scene setup
# -----------------------------------------------------------------------------

def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for bank in (bpy.data.materials, bpy.data.meshes, bpy.data.curves,
                 bpy.data.cameras, bpy.data.lights, bpy.data.images):
        for block in list(bank):
            bank.remove(block)


def new_collection(name, parent=None):
    coll = bpy.data.collections.new(name)
    (parent or bpy.context.scene.collection).children.link(coll)
    return coll


def move_to(obj, coll):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    coll.objects.link(obj)
    return obj


def principled_material(name, color, roughness=0.6, metallic=0.0,
                        emission=None, strength=0.0, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, alpha)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    emission_input = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
    emission_input.default_value = (*(emission or color), 1.0)
    bsdf.inputs["Emission Strength"].default_value = strength
    if alpha < 1.0:
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "DITHERED"
        else:
            mat.blend_method = "BLEND"
        mat.use_transparency_overlap = False if hasattr(mat, "use_transparency_overlap") else False
    return mat


def add_loop(obj, end, delta=(0, 0, 0), scale_end=None):
    obj.keyframe_insert("location", frame=1)
    obj.keyframe_insert("scale", frame=1)
    obj.location += Vector(delta)
    if scale_end:
        obj.scale = [obj.scale[i] * scale_end[i] for i in range(3)]
    obj.keyframe_insert("location", frame=end)
    obj.keyframe_insert("scale", frame=end)


clear_scene()
scene = bpy.context.scene
engine_ids = {x.identifier for x in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in engine_ids else "BLENDER_EEVEE"
scene.render.fps = 24
scene.frame_start, scene.frame_end = 1, FRAME_END
scene["AetheriaAsset"] = "Ocean base — use a mild Three.js bloom pass for warm highlights and shafts"
scene["ThreeTextureScroll"] = {"normal": [0.011, -0.007], "surface": [-0.004, 0.006], "caustic": [0.006, 0.009]}

root = new_collection("Aetheria Ocean")
water_coll = new_collection("Water", root)
fx_coll = new_collection("Sunlight and Atmospheric FX", root)
particle_coll = new_collection("Sparse Golden Particles", root)


# -----------------------------------------------------------------------------
# Tileable maps: hand-combined multi-octave value noise, normal and caustic.
# The maps are generated once and packed into the GLB (no external texture URLs).
# -----------------------------------------------------------------------------

def fract(v):
    return v - math.floor(v)


def hash2(x, y, seed):
    return fract(math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123)


def smooth(t):
    return t * t * (3.0 - 2.0 * t)


def value_noise(x, y, seed=0):
    ix, iy = math.floor(x), math.floor(y)
    fx, fy = x - ix, y - iy
    a, b = hash2(ix, iy, seed), hash2(ix + 1, iy, seed)
    c, d = hash2(ix, iy + 1, seed), hash2(ix + 1, iy + 1, seed)
    ux, uy = smooth(fx), smooth(fy)
    return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy


def rotated_noise(x, y, freq, angle, seed):
    ca, sa = math.cos(angle), math.sin(angle)
    return value_noise((x * ca - y * sa) * freq, (x * sa + y * ca) * freq, seed)


def octave_wave(x, y):
    # Three deliberately misaligned, irrational-ish layers: swell/chop/ripple.
    return (0.51 * rotated_noise(x, y, 1.00, 0.23, 17) +
            0.31 * rotated_noise(x, y, 2.73, -0.61, 43) +
            0.18 * rotated_noise(x, y, 7.17, 1.07, 91))


def make_image(name, pixels, colorspace="sRGB"):
    img = bpy.data.images.new(name, TEXTURE_SIZE, TEXTURE_SIZE, alpha=False)
    img.colorspace_settings.name = colorspace
    img.pixels.foreach_set(pixels)
    img.pack()
    return img


def create_tile_maps():
    albedo, normal, mask = [], [], []
    # Need derivatives for tangent-space normal.  The periodic sampled source
    # repeats exactly at the border, so it has no visible tile seam.
    for py in range(TEXTURE_SIZE):
        y = py / TEXTURE_SIZE
        for px in range(TEXTURE_SIZE):
            x = px / TEXTURE_SIZE
            h = octave_wave(x, y)
            hx = octave_wave((x + 1.0 / TEXTURE_SIZE) % 1.0, y)
            hy = octave_wave(x, (y + 1.0 / TEXTURE_SIZE) % 1.0)
            dx, dy = (hx - h) * 5.2, (hy - h) * 5.2
            # A cellular-like bright fringe, softened so it reads as caustic,
            # not glitter.  It is intentionally offset from wave centres.
            c1 = rotated_noise(x + .17, y - .11, 8.5, -0.35, 129)
            c2 = rotated_noise(x - .24, y + .19, 12.7, 0.79, 157)
            caustic = max(0.0, (c1 * c2 - 0.47) / 0.53) ** 2
            turquoise = 0.10 * (h - 0.5) + 0.075 * caustic
            albedo.extend((0.018 + turquoise * .25, 0.175 + turquoise * .72,
                           0.405 + turquoise, 1.0))
            nx, ny = -dx, -dy
            length = math.sqrt(nx * nx + ny * ny + 1.0)
            normal.extend((nx / length * .5 + .5, ny / length * .5 + .5,
                           .5 / length + .5, 1.0))
            mask.extend((caustic, caustic, caustic, 1.0))
    return (make_image("Ocean_Surface_Tile_1024", albedo),
            make_image("Ocean_Wave_Normal_Tile_1024", normal, "Non-Color"),
            make_image("Ocean_Caustic_Tile_1024", mask))


# -----------------------------------------------------------------------------
# Base mesh: world-unit UV repeats plus modest real broad-swell displacement.
# -----------------------------------------------------------------------------

def broad_swell(x, y):
    return (1.15 * math.sin(x * 0.018 + y * 0.010 + 0.8) +
            0.72 * math.sin(-x * 0.010 + y * 0.024 - 1.1) +
            0.36 * math.sin(x * 0.041 - y * 0.027 + 2.6))


def create_ocean():
    verts, faces, uv = [], [], []
    step = OCEAN_SIZE / GRID_CELLS
    half = OCEAN_SIZE * .5
    for j in range(GRID_CELLS + 1):
        y = -half + j * step
        for i in range(GRID_CELLS + 1):
            x = -half + i * step
            verts.append((x, y, broad_swell(x, y)))
            # This is fixed-frequency texture mapping in world units, *not*
            # normalized map UVs. Changing OCEAN_SIZE does not enlarge waves.
            uv.append((x / TILE_WORLD_UNITS, y / TILE_WORLD_UNITS))
    stride = GRID_CELLS + 1
    for j in range(GRID_CELLS):
        for i in range(GRID_CELLS):
            a = j * stride + i
            faces.append((a, a + 1, a + stride + 1, a + stride))
    mesh = bpy.data.meshes.new("Aetheria Massive Ocean Grid")
    mesh.from_pydata(verts, [], faces)
    mesh.uv_layers.new(name="World_Tile_UV").data.foreach_set("uv", [n for face in faces for idx in face for n in uv[idx]])
    mesh.update()
    ocean = bpy.data.objects.new("Aetheria Ocean — 900 Unit Base", mesh)
    water_coll.objects.link(ocean)
    for poly in mesh.polygons:
        poly.use_smooth = True
    return ocean


def create_ocean_material(albedo_img, normal_img, caustic_img):
    mat = principled_material("Aetheria Ocean Material", (0.015, .16, .37), roughness=.29, metallic=.05)
    mat["textureCoordinateSpace"] = "World-unit tiled UV: 1 repeat / 5 meters"
    mat["threeTextureScroll"] = {"surface": [-.004, .006], "normal": [.011, -.007], "caustic": [.006, .009]}
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    tex = nodes.new("ShaderNodeTexImage"); tex.name = "Tileable Ocean Albedo + Caustics"; tex.image = albedo_img; tex.interpolation = "Linear"
    normal_tex = nodes.new("ShaderNodeTexImage"); normal_tex.name = "Tileable Layered Wave Normal"; normal_tex.image = normal_img; normal_tex.interpolation = "Linear"
    normal_map = nodes.new("ShaderNodeNormalMap"); normal_map.inputs["Strength"].default_value = .46
    # These direct texture links map cleanly to glTF baseColorTexture,
    # normalTexture and emissiveTexture. The packed albedo combines uneven
    # blue/turquoise patches with the quiet caustic tint, avoiding Blender-only
    # procedural nodes in the delivered material.
    links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(normal_tex.outputs["Color"], normal_map.inputs["Color"]); links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])
    caustic_tex = nodes.new("ShaderNodeTexImage"); caustic_tex.name = "Subtle Animated Caustic Overlay"; caustic_tex.image = caustic_img
    links.new(caustic_tex.outputs["Color"], bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission"))
    bsdf.inputs["Emission Strength"].default_value = .055
    caustic_img["purpose"] = "Subtle emissive caustic texture; Three.js may scroll it using scene ThreeTextureScroll"
    return mat


surface_img, normal_img, caustic_img = create_tile_maps()
ocean = create_ocean()
ocean.data.materials.append(create_ocean_material(surface_img, normal_img, caustic_img))


# -----------------------------------------------------------------------------
# Lighting and irregular, soft fake god rays.  Bloom belongs in the website.
# -----------------------------------------------------------------------------

sun = bpy.data.lights.new("Aetheria Golden Sun", "SUN")
sun.energy = 3.0
sun.color = (1.0, 0.51, 0.22)
sun.angle = math.radians(13)
sun_obj = bpy.data.objects.new("Aetheria Golden Sun", sun)
sun_obj.rotation_euler = (math.radians(28), math.radians(-18), math.radians(-38))
fx_coll.objects.link(sun_obj)

# Website: enable a *mild* bloom pass.  Emission here is deliberately tuned for it.
ray_mat = principled_material("Dreamy Golden God Rays", (1.0, .38, .08), roughness=.72,
                             emission=(1.0, .16, .025), strength=1.15, alpha=.115)
ray_specs = [
    ((-255, 170, 15), (150, 58, 6), 15), ((-220, 124, 13), (120, 48, 7), 9),
    ((-170, 196, 17), (185, 62, 8), 22), ((-118, 151, 12), (105, 35, 5), 12),
    ((-300, 92, 11), (155, 42, 5), 7),
]
for index, (start, end, width) in enumerate(ray_specs, 1):
    a, b = Vector(start), Vector(end)
    direction = (b - a).normalized()
    side = Vector((-direction.y, direction.x, 0)).normalized()
    verts = [a + side * width * .15, a - side * width * .15, b - side * width, b + side * width]
    mesh = bpy.data.meshes.new("Irregular God Ray Mesh %02d" % index)
    mesh.from_pydata(verts, [], [(0, 1, 2, 3)])
    mesh.materials.append(ray_mat)
    ray = bpy.data.objects.new("Irregular God Ray %02d" % index, mesh)
    fx_coll.objects.link(ray)
    add_loop(ray, 900 + index * 70, (3.5 - index, 1.5 + index * .3, .35))

# Cool indigo world with a warm upper-left-facing sun contribution.
world = bpy.data.worlds.new("Aetheria Indigo Horizon") if not bpy.data.worlds else bpy.data.worlds[0]
scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes.get("Background")
bg.inputs["Color"].default_value = (0.012, .035, .115, 1.0)
bg.inputs["Strength"].default_value = .28


# -----------------------------------------------------------------------------
# Sparse golden floating particles — only 15, intentionally non-uniform.
# -----------------------------------------------------------------------------

particle_mat = principled_material("Quiet Golden Motions", (1.0, .47, .10), roughness=.36,
                                  emission=(1.0, .12, .01), strength=2.0)
rng = random.Random(613)
for n in range(15):
    # Bias near upper-left light but keep the enormous ocean uncluttered.
    x = rng.uniform(-245, 75); y = rng.uniform(-80, 200); z = rng.uniform(7, 23)
    radius = rng.uniform(.16, .43)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=radius, location=(x, y, z))
    particle = bpy.context.object
    particle.name = "Golden Air Particle %02d" % (n + 1)
    particle.data.materials.append(particle_mat)
    move_to(particle, particle_coll)
    add_loop(particle, rng.randint(540, 1100), (rng.uniform(-3, 3), rng.uniform(2, 8), rng.uniform(.8, 2.8)),
             (rng.uniform(.75, 1.45), rng.uniform(.75, 1.45), rng.uniform(.75, 1.45)))


# -----------------------------------------------------------------------------
# Aerial/isometric overview camera; ample unused water remains for islands.
# -----------------------------------------------------------------------------

def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


cam_data = bpy.data.cameras.new("Aetheria Ocean Overview Camera")
cam_data.type = "ORTHO"
cam_data.ortho_scale = 700
cam_data.lens = 42
camera = bpy.data.objects.new("Aetheria Ocean Overview Camera", cam_data)
camera.location = (520, -610, 670)
look_at(camera, (-35, 15, 0))
root.objects.link(camera)
scene.camera = camera


# -----------------------------------------------------------------------------
# Export GLB.  Draco requires Blender's glTF add-on support; fall back safely
# on builds that omit its compression property rather than failing the asset.
# -----------------------------------------------------------------------------

os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
kwargs = dict(filepath=OUT_FILE, export_format="GLB", export_animations=True,
              export_apply=True, export_materials="EXPORT", export_yup=True,
              export_image_format="AUTO", export_cameras=True, export_lights=True)
op = bpy.ops.export_scene.gltf
properties = op.get_rna_type().properties.keys()
if "export_draco_mesh_compression_enable" in properties:
    kwargs["export_draco_mesh_compression_enable"] = True
    kwargs["export_draco_mesh_compression_level"] = 6
op(**kwargs)
print("Aetheria ocean exported:", OUT_FILE)
print("Ocean triangles:", GRID_CELLS * GRID_CELLS * 2, "| embedded tile maps:", TEXTURE_SIZE, "px x 3")
