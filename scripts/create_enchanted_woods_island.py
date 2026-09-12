"""Create the standalone Enchanted Woods floating-island diorama.

Budget: deliberately low-poly (about 4-5k triangles depending on Blender's
primitive triangulation), simple Principled materials, no external assets or
textures.  A small vertex-colour grass tint is used instead of a texture.
Run with: blender --background --python scripts/create_enchanted_woods_island.py
"""

import bpy
import math
import os
import random
from mathutils import Vector

random.seed(44071)
OUT_FILE = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "public", "models", "environment", "enchanted_woods_island.glb"))
FRAME_END = 720


# -----------------------------------------------------------------------------
# Shared helpers and export-safe Principled-only materials
# -----------------------------------------------------------------------------

def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for bank in (bpy.data.materials, bpy.data.meshes, bpy.data.curves,
                 bpy.data.cameras, bpy.data.lights):
        for block in list(bank):
            bank.remove(block)


def collection(name, parent=None):
    c = bpy.data.collections.new(name)
    (parent or bpy.context.scene.collection).children.link(c)
    return c


def relink(obj, coll):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    coll.objects.link(obj)
    return obj


def mat(name, color, roughness=.7, metallic=0.0, emission=None, strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*color, 1.0)
    p.inputs["Roughness"].default_value = roughness
    p.inputs["Metallic"].default_value = metallic
    emit = p.inputs.get("Emission Color") or p.inputs.get("Emission")
    emit.default_value = (*(emission or color), 1.0)
    p.inputs["Emission Strength"].default_value = strength
    return m


def ico(name, loc, scale, material, coll, subdivision=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivision, radius=1, location=loc)
    ob = bpy.context.object; ob.name = name; ob.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(material); relink(ob, coll)
    for f in ob.data.polygons: f.use_smooth = True
    return ob


def cylinder(name, loc, radius, depth, material, coll, vertices=10, rotation=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc,
                                       rotation=rotation or (0, 0, 0))
    ob = bpy.context.object; ob.name = name; ob.data.materials.append(material); relink(ob, coll)
    for f in ob.data.polygons: f.use_smooth = True
    return ob


def tube(name, points, radii, material, coll, sides=7):
    """Low-poly tapered branch mesh, following deliberately asymmetric points."""
    verts, faces = [], []
    for index, point in enumerate(points):
        p = Vector(point)
        tangent = Vector(points[min(index + 1, len(points) - 1)]) - Vector(points[max(0, index - 1)])
        tangent.normalize()
        axis = tangent.cross(Vector((0, 0, 1)))
        if axis.length < .01: axis = tangent.cross(Vector((0, 1, 0)))
        axis.normalize(); other = tangent.cross(axis).normalized()
        for side in range(sides):
            angle = math.tau * side / sides + index * .14
            verts.append(p + radii[index] * (axis * math.cos(angle) + other * math.sin(angle)))
    for row in range(len(points) - 1):
        for side in range(sides):
            a = row * sides + side; b = row * sides + (side + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    faces.append(tuple(range(sides - 1, -1, -1)))
    faces.append(tuple((len(points) - 1) * sides + s for s in range(sides)))
    mesh = bpy.data.meshes.new(name + " Mesh"); mesh.from_pydata(verts, [], faces); mesh.update()
    ob = bpy.data.objects.new(name, mesh); mesh.materials.append(material); coll.objects.link(ob)
    for f in mesh.polygons: f.use_smooth = True
    return ob


def key_twinkle(ob, start_strength, end_strength, offset):
    """A native glTF-scale twinkle; bloom makes these tiny emission points sing."""
    ob.scale = (.72, .72, .72); ob.keyframe_insert("scale", frame=1 + offset)
    ob.scale = (1.2, 1.2, 1.2); ob.keyframe_insert("scale", frame=80 + offset)
    ob.scale = (.72, .72, .72); ob.keyframe_insert("scale", frame=160 + offset)


clear_scene()
scene = bpy.context.scene
ids = {i.identifier for i in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
scene.render.engine = "BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in ids else "BLENDER_EEVEE"
scene.render.fps = 24; scene.frame_start = 1; scene.frame_end = FRAME_END
scene["AetheriaAsset"] = "Standalone Enchanted Woods diorama; add a mild bloom pass in Three.js for windows and fairy lights."
root = collection("Enchanted Woods Island")
island_coll = collection("Floating Island Base", root)
tree_coll = collection("Tree Dwellings", root)
flora_coll = collection("Grass Flowers and Roots", root)
light_coll = collection("Fairy Lights", root)

ROCK = mat("Warm grey rock", (.25, .16, .10), .92)
ROCK_LIGHT = mat("Weathered rock strata", (.38, .27, .17), .96)
SOIL = mat("Rich exposed soil", (.20, .095, .035), .98)
GRASS = mat("Mossy meadow green", (.16, .42, .10), .9)
WOOD = mat("Varnished storybook wood", (.31, .115, .042), .42)
WOOD_LIGHT = mat("Door and ladder wood", (.47, .22, .075), .45)
LEAF_MATS = [mat("Foliage olive", (.23, .46, .10), .88), mat("Foliage sun green", (.36, .58, .14), .9), mat("Foliage shadow green", (.10, .29, .055), .94)]
AMBER = mat("Warm amber windows", (1.0, .32, .035), .35, emission=(1.0, .12, .008), strength=2.2)
GOLD = mat("Gentle fairy glow", (1.0, .48, .08), .3, emission=(1.0, .15, .01), strength=3.1)
WHITE = mat("Daisy petals", (.96, .88, .67), .8)
FLOWERS = [mat("Blue flower", (.20, .37, .95), .72), mat("Rose flower", (.92, .18, .34), .72), mat("Yellow flower", (1.0, .62, .05), .72)]


# -----------------------------------------------------------------------------
# Island base: a rounded meadow cap over a torn, tapered rocky underside.
# -----------------------------------------------------------------------------

under = ico("Jagged floating soil underside", (0, 0, -2.55), (7.2, 5.8, 4.1), SOIL, island_coll, 2)
# Pull lower vertices toward a point and roughen them, leaving an organic broken edge.
for v in under.data.vertices:
    if v.co.z < 0:
        v.co.x *= .73 + random.uniform(-.06, .05); v.co.y *= .73 + random.uniform(-.06, .05)
        v.co.z *= 1.28 + random.uniform(-.06, .08)
    v.co.x += random.uniform(-.13, .13); v.co.y += random.uniform(-.13, .13)

top = ico("Oval grassy top", (0, 0, .15), (7.55, 6.1, 1.2), GRASS, island_coll, 2)
for v in top.data.vertices:
    if v.co.z < -.22: v.co.z = -.22
    v.co.z += random.uniform(-.10, .10)
# Baked, low-frequency vertex paint gives the meadow broad, irregular moss / sun
# patches without a texture or a Blender-only procedural material.
grass_colors = top.data.color_attributes.new("Grass Meadow Variation", "BYTE_COLOR", "POINT")
paint = []
for vertex in top.data.vertices:
    wave = .5 + .5 * math.sin(vertex.co.x * .67 + vertex.co.y * .39 + math.sin(vertex.co.y * .42))
    paint.extend((.11 + wave * .11, .32 + wave * .19, .055 + wave * .055, 1.0))
grass_colors.data.foreach_set("color", paint)
top.data.color_attributes.active_color = grass_colors
grass_node = GRASS.node_tree.nodes.new("ShaderNodeVertexColor")
grass_node.layer_name = "Grass Meadow Variation"
GRASS.node_tree.links.new(grass_node.outputs["Color"], GRASS.node_tree.nodes["Principled BSDF"].inputs["Base Color"])

# A handful of visible, non-uniform strata break up the silhouette without a dense mesh.
for n, (x, y, z, sx, sy, sz) in enumerate([(-5.3, -2.4, -2.0, 1.7, .72, .55), (4.8, 2.5, -1.6, 1.55, .65, .6),
                                              (-2.7, 4.7, -1.55, 1.35, .55, .55), (2.0, -5.0, -1.85, 1.5, .58, .55)]):
    rock = ico("Exposed rock stratum %02d" % n, (x, y, z), (sx, sy, sz), ROCK_LIGHT if n % 2 else ROCK, island_coll, 1)
    rock.rotation_euler = (random.random() * .35, random.random() * .35, random.random() * math.tau)

# Torn roots hanging past the underside: individual curves would not be portable,
# so these are small tapered tube meshes.
for n, (x, y) in enumerate([(-2.7, -2.9), (2.3, -3.1), (4.2, .8), (-4.0, 1.5)]):
    tube("Dangling root %02d" % n, [(x, y, -.45), (x + .3, y - .12, -2.9), (x - .2, y + .3, -4.35 - n * .18)],
         [.16, .10, .025], WOOD, flora_coll, 5)


# -----------------------------------------------------------------------------
# Trees: gnarled tapered trunks, integrated doors/windows, low-poly foliage.
# -----------------------------------------------------------------------------

def arched_door(name, location, angle, scale, coll):
    # Rectangle plus semicircular top, slightly proud of the trunk surface.
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=5, location=location)
    door = bpy.context.object; door.name = name; door.scale = (scale, .105, scale * 1.34)
    door.rotation_euler[2] = angle; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    door.data.materials.append(WOOD_LIGHT); relink(door, coll)
    # Small round handle, rotated toward its outer face.
    handle = ico(name + " brass handle", Vector(location) + Vector((math.cos(angle) * scale * .42, math.sin(angle) * scale * .42, -.1)),
                 (scale * .115,) * 3, GOLD, coll, 1)
    return door


def glowing_window(name, loc, scale, coll):
    window = ico(name, loc, (scale, .09, scale * 1.14), AMBER, coll, 2)
    return window


def foliage_blob(name, loc, scale, material, coll):
    ob = ico(name, loc, scale, material, coll, 2)
    ob.rotation_euler = (random.uniform(-.22, .22), random.uniform(-.22, .22), random.uniform(0, math.tau))
    return ob


def tree_dwelling(name, base, scale, rotation, has_hut=False):
    x, y, z = base
    # Expressive non-straight trunk; points/widths are locally scaled.
    trunk_points = [(x, y, z), (x - .22*scale, y + .10*scale, z + 1.0*scale),
                    (x + .30*scale, y - .12*scale, z + 2.15*scale), (x + .04*scale, y + .24*scale, z + 3.25*scale),
                    (x + .42*scale, y + .05*scale, z + 4.1*scale)]
    tube(name + " gnarled trunk", trunk_points, [.72*scale, .64*scale, .53*scale, .42*scale, .26*scale], WOOD, tree_coll, 8)
    # Off-centre branch arms make a readable fairy-tale silhouette.
    tube(name + " left branch", [trunk_points[2], (x-1.35*scale, y+.12*scale, z+3.12*scale), (x-1.85*scale, y+.53*scale, z+3.7*scale)],
         [.34*scale, .19*scale, .06*scale], WOOD, tree_coll, 6)
    tube(name + " right branch", [trunk_points[3], (x+1.25*scale, y-.48*scale, z+3.75*scale), (x+1.72*scale, y-.08*scale, z+4.25*scale)],
         [.28*scale, .14*scale, .05*scale], WOOD, tree_coll, 6)
    arched_door(name + " integrated rounded door", (x + .57*scale, y - .35*scale, z + .82*scale), rotation - .55, .36*scale, tree_coll)
    glowing_window(name + " trunk window", (x + .48*scale, y - .30*scale, z + 2.45*scale), .25*scale, tree_coll)
    canopy_specs = [((-.8, .05, 4.0), (1.34, 1.05, .88), 0), ((.45, -.25, 4.46), (1.44, 1.12, .98), 1),
                    ((.95, .52, 4.08), (1.08, .95, .76), 2), ((-.28, .50, 4.78), (1.05, .9, .70), 1)]
    for i, (offset, dims, mi) in enumerate(canopy_specs):
        foliage_blob(name + " foliage %d" % i, (x + offset[0]*scale, y + offset[1]*scale, z + offset[2]*scale),
                     tuple(d*scale for d in dims), LEAF_MATS[mi], tree_coll)
    if has_hut:
        # Compact round platform and hut in the upper branches.
        cylinder(name + " branch platform", (x+.18*scale, y+.02*scale, z+3.38*scale), 1.08*scale, .16*scale, WOOD_LIGHT, tree_coll, 12)
        cylinder(name + " rounded upper hut", (x+.18*scale, y+.02*scale, z+4.02*scale), .72*scale, 1.08*scale, WOOD_LIGHT, tree_coll, 12)
        # Conical thatch roof: deliberately squat and warm rather than photoreal.
        bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=1.0*scale, radius2=.18*scale, depth=.82*scale,
                                        location=(x+.18*scale, y+.02*scale, z+4.92*scale))
        roof = bpy.context.object; roof.name = name + " thatched roof"; roof.data.materials.append(LEAF_MATS[2]); relink(roof, tree_coll)
        glowing_window(name + " hut window", (x+.73*scale, y-.18*scale, z+4.05*scale), .19*scale, tree_coll)
        # Simple ladder planks, not a dense spiral.
        for step in range(6):
            plank = cylinder(name + " ladder rung %d" % step, (x+.79*scale, y-.18*scale, z+1.18*scale+step*.36*scale), .055*scale, .58*scale, WOOD_LIGHT, tree_coll, 6, (math.pi/2, 0, .15))
            plank.rotation_euler[2] += .08
    return Vector((x+.3*scale, y, z+3.5*scale))


central_anchor = tree_dwelling("Grand central treehouse", (-.4, .45, .65), 1.28, .1, True)
small_a_anchor = tree_dwelling("West small tree home", (-4.55, 1.15, .55), .66, -.65, False)
small_b_anchor = tree_dwelling("East small tree home", (3.65, -2.9, .5), .76, .73, False)


# -----------------------------------------------------------------------------
# Meadow flowers / daisies, placed with a fixed random seed but no grid.
# -----------------------------------------------------------------------------

def flower(name, x, y, color, daisy=False):
    z = 1.18 - .012 * (x*x/2 + y*y/2)
    cylinder(name + " stem", (x, y, z+.09), .022, .24, LEAF_MATS[2], flora_coll, 5)
    for p in range(5 if daisy else 4):
        a = math.tau * p / (5 if daisy else 4) + random.uniform(-.14, .14)
        ico(name + " petal %d" % p, (x + math.cos(a)*.105, y + math.sin(a)*.105, z+.23), (.085, .045, .025), WHITE if daisy else color, flora_coll, 1)
    ico(name + " centre", (x, y, z+.24), (.052, .052, .045), FLOWERS[2], flora_coll, 1)

for n in range(27):
    a = random.random() * math.tau; d = math.sqrt(random.random()) * 5.9
    x, y = math.cos(a)*d, math.sin(a)*d*.77
    if (x+.4)**2 + (y-.4)**2 < 6: continue  # keep central tree ground clear
    flower("Meadow flower %02d" % n, x, y, random.choice(FLOWERS), n < 13)


# -----------------------------------------------------------------------------
# Fairy lights: a sagging handmade line of tiny emissive bulbs (not a straight array).
# -----------------------------------------------------------------------------

start = central_anchor + Vector((-.62, .12, .28)); end = small_a_anchor + Vector((.2, .18, .0))
for i in range(12):
    t = i / 11
    pos = start.lerp(end, t)
    pos.z -= .72 * math.sin(math.pi * t) + random.uniform(-.06, .06)
    bulb = ico("Sagging fairy light %02d" % (i+1), pos, (random.uniform(.055, .105),)*3, GOLD, light_coll, 1)
    key_twinkle(bulb, 2.0, 3.0, i * 13 + random.randint(0, 12))


# -----------------------------------------------------------------------------
# Neutral studio lighting, grey world and isometric showcase camera.
# -----------------------------------------------------------------------------

world = bpy.data.worlds.new("Neutral Grey Studio") if not bpy.data.worlds else bpy.data.worlds[0]
scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (.16, .16, .16, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = .32

def studio_light(name, kind, loc, energy, color, size):
    data = bpy.data.lights.new(name, kind); data.energy = energy; data.color = color
    # Point lights are retained by core glTF (unlike Blender AREA lights); their
    # generous shadow radius preserves the soft studio-light character here.
    data.shadow_soft_size = size
    obj = bpy.data.objects.new(name, data); obj.location = loc
    obj.rotation_euler = (Vector((0, 0, .5)) - obj.location).to_track_quat("-Z", "Y").to_euler(); root.objects.link(obj)

studio_light("Studio key softbox", "POINT", (7, -9, 13), 950, (1.0, .78, .55), 5.5)
studio_light("Studio fill softbox", "POINT", (-9, -5, 8), 600, (.63, .76, 1.0), 5.0)
studio_light("Studio rim softbox", "POINT", (2, 8, 12), 800, (1.0, .77, .48), 4.0)

cam_data = bpy.data.cameras.new("Enchanted Woods Diorama Camera"); cam_data.lens = 52
camera = bpy.data.objects.new("Enchanted Woods Diorama Camera", cam_data); camera.location = (15, -19, 13)
camera.rotation_euler = (Vector((0, 0, .5)) - camera.location).to_track_quat("-Z", "Y").to_euler(); root.objects.link(camera)
scene.camera = camera


# -----------------------------------------------------------------------------
# GLB export. Draco is switched on where the installed Blender supports it.
# -----------------------------------------------------------------------------

os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
settings = dict(filepath=OUT_FILE, export_format="GLB", export_animations=True, export_apply=True,
                export_materials="EXPORT", export_yup=True, export_cameras=True, export_lights=True)
if "export_draco_mesh_compression_enable" in bpy.ops.export_scene.gltf.get_rna_type().properties.keys():
    settings.update(export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)
bpy.ops.export_scene.gltf(**settings)

triangles = sum(len(poly.vertices) - 2 for ob in bpy.context.scene.objects if ob.type == "MESH" for poly in ob.data.polygons)
print("Enchanted Woods exported:", OUT_FILE)
print("Source triangle budget:", triangles, "triangles")
