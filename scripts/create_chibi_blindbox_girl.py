"""Build and export the Chibi Blind-Box Girl collectible.

All components remain separately named and parented below ``Chibi Blindbox Girl``
so the GLB is straightforward to rig later.  No external textures are used:
face colour details and hair-tip variation are compact vertex-colour meshes.
Run: blender --background --python scripts/create_chibi_blindbox_girl.py
"""
import bpy
import math
import os
import random
from mathutils import Vector

random.seed(1881)
OUT_FILE = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "public", "models", "characters", "chibi_blindbox_girl.glb"))


# -----------------------------------------------------------------------------
# Foundations / export-safe Principled materials
# -----------------------------------------------------------------------------
def clear_scene():
    bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)
    for bank in (bpy.data.materials, bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for item in list(bank): bank.remove(item)

def material(name, color, rough=.5, metallic=0., emission=None, strength=0.):
    m = bpy.data.materials.new(name); m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough; bsdf.inputs["Metallic"].default_value = metallic
    # Soft vinyl skin deliberately fakes SSS: it is more reliable in core glTF.
    emission_input = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
    emission_input.default_value = (*(emission or color), 1); bsdf.inputs["Emission Strength"].default_value = strength
    return m

def parent(ob):
    ob.parent = figure
    return ob

def smooth(ob):
    for poly in ob.data.polygons: poly.use_smooth = True
    return ob

def uv_sphere(name, loc, scale, mat, segments=24, rings=14):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    ob = bpy.context.object; ob.name = name; ob.scale = scale; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat); return parent(smooth(ob))

def ico(name, loc, scale, mat, subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1, location=loc)
    ob = bpy.context.object; ob.name = name; ob.scale = scale; bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(mat); return parent(smooth(ob))

def cylinder(name, loc, radius, depth, mat, vertices=12, rot=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot or (0,0,0))
    ob = bpy.context.object; ob.name = name; ob.data.materials.append(mat); return parent(smooth(ob))

def tube(name, points, radii, mat, sides=8):
    """A compact tapered mesh tube used for sculpted hair and thin straps."""
    verts, faces = [], []
    for i, point in enumerate(points):
        p = Vector(point); tangent = Vector(points[min(i+1,len(points)-1)]) - Vector(points[max(0,i-1)])
        tangent.normalize(); axis = tangent.cross(Vector((0,0,1)))
        if axis.length < .01: axis = tangent.cross(Vector((0,1,0)))
        axis.normalize(); other = tangent.cross(axis).normalized()
        for k in range(sides):
            angle = math.tau*k/sides + i*.16
            verts.append(p + radii[i]*(axis*math.cos(angle)+other*math.sin(angle)))
    for i in range(len(points)-1):
        for k in range(sides):
            a=i*sides+k; b=i*sides+(k+1)%sides; faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(range(sides-1,-1,-1)), tuple((len(points)-1)*sides+k for k in range(sides))])
    mesh=bpy.data.meshes.new(name+" Mesh"); mesh.from_pydata(verts,[],faces); mesh.update()
    ob=bpy.data.objects.new(name,mesh); mesh.materials.append(mat); bpy.context.scene.collection.objects.link(ob)
    return parent(smooth(ob))

def star(name, loc, radius, mat, rotation=0.):
    verts=[(0,0,.012)]
    for i in range(10):
        a=rotation+math.pi/2+i*math.pi/5; r=radius if i%2==0 else radius*.43
        verts.append((math.cos(a)*r, math.sin(a)*r, .012))
    faces=[tuple(range(11))]; mesh=bpy.data.meshes.new(name+" Mesh"); mesh.from_pydata(verts,[],faces)
    ob=bpy.data.objects.new(name,mesh); bpy.context.scene.collection.objects.link(ob); ob.location=loc; ob.data.materials.append(mat)
    return parent(ob)

clear_scene()
scene=bpy.context.scene; scene.render.fps=24
ids={x.identifier for x in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
scene.render.engine="BLENDER_EEVEE_NEXT" if "BLENDER_EEVEE_NEXT" in ids else "BLENDER_EEVEE"
scene["AssetInfo"]="Static 0.18m chibi vinyl collectible. Add a mild bloom pass for eye and blush warmth."
figure=bpy.data.objects.new("Chibi Blindbox Girl",None); scene.collection.objects.link(figure)

SKIN=material("Warm vinyl skin",(.94,.54,.40),.31, emission=(1.,.19,.10),strength=.025)
SKIN_LIGHT=material("Soft blush paint",(.98,.28,.40),.48, emission=(1.,.05,.1),strength=.09)
HAIR=material("Glossy black brown hair",(.045,.012,.009),.18)
DRESS=material("Magenta pink wrap dress",(.72,.025,.26),.38)
METAL=material("Polished silver accessories",(.64,.68,.73),.16,metallic=1.)
EYE=material("Deep brown glossy eye",(.075,.009,.004),.055)
IRIS=material("Warm cocoa iris",(.31,.055,.012),.16)
WHITE=material("Eye catchlight",(1.,.91,.80),.08, emission=(1.,.6,.35),strength=.18)


# -----------------------------------------------------------------------------
# Body base — 0.18m tall toy, 2.7 heads high, component names retained for rigging.
# -----------------------------------------------------------------------------
# Coordinates use Z-up; feet at zero, crown near .18 m.
uv_sphere("Chibi oversized head",(0,0,.132),(.047,.040,.051),SKIN,32,20)
uv_sphere("Compact torso",(0,.001,.072),(.028,.018,.032),SKIN,20,14)
uv_sphere("Rounded hip body",(0,.002,.050),(.031,.019,.018),SKIN,20,12)

# Slightly splayed legs and relaxed arms are simple rounded vinyl capsules.
for side in (-1,1):
    x=side*.012
    leg=uv_sphere(("Left" if side<0 else "Right")+" short leg",(x,.001,.028),(.010,.010,.026),SKIN,16,10)
    leg.rotation_euler[1]=side*.08
    arm=uv_sphere(("Left" if side<0 else "Right")+" relaxed arm",(side*.032,-.001,.074),(.009,.009,.025),SKIN,16,10)
    arm.rotation_euler[1]=side*.27
    uv_sphere(("Left" if side<0 else "Right")+" small hand",(side*.039,-.003,.053),(.010,.009,.010),SKIN,16,10)


# -----------------------------------------------------------------------------
# Face — domed eyes, small iris/pupil layers, lashes, vertex-colour-like blush and stars.
# Face faces towards -Y for the product camera.
# -----------------------------------------------------------------------------
for side in (-1,1):
    x=side*.019
    eye=uv_sphere(("Left" if side<0 else "Right")+" giant glossy eye",(x,-.0375,.137),(.016,.005,.020),EYE,24,16)
    iris=uv_sphere(("Left" if side<0 else "Right")+" cocoa iris",(x,-.042,.136),(.0115,.002,.014),IRIS,20,12)
    ico(("Left" if side<0 else "Right")+" eye highlight",(x-side*.004,-.044,.144),(.0044,.0015,.0044),WHITE,2)
    # Curved outer lash: compact tapered tube, dark and separate from glossy lens.
    tube(("Left" if side<0 else "Right")+" painted outer lash",[(x+side*.009,-.043,.149),(x+side*.017,-.043,.151),(x+side*.020,-.042,.148)], [.0014,.0011,.0004],HAIR,5)
    # Soft painted blush pad; a flat pale edge makes it blend rather than read as a hard decal.
    blush=uv_sphere(("Left" if side<0 else "Right")+" glowing cheek blush",(side*.031,-.039,.118),(.010,.0012,.0065),SKIN_LIGHT,16,8)

star("Silver forehead star one",(-.010,-.040,.163),.0052,METAL,.18)
star("Silver forehead star two",(.010,-.0405,.167),.0043,METAL,-.33)


# -----------------------------------------------------------------------------
# Hair — sculpted overlapping chunky clumps rather than non-exportable particles.
# -----------------------------------------------------------------------------
scalp=uv_sphere("Hair crown cap",(0,.006,.151),(.049,.041,.044),HAIR,28,18)
# Asymmetric front bangs and shoulder-length wavy locks. Each has independent bends.
hair_specs=[
    ([(-.038,-.006,.166),(-.050,-.023,.149),(-.043,-.030,.120),(-.053,-.018,.092)],[.011,.010,.008,.003]),
    ([(.037,-.008,.167),(.050,-.026,.151),(.042,-.031,.121),(.053,-.016,.097)],[.012,.010,.008,.003]),
    ([(-.020,-.037,.174),(-.029,-.043,.157),(-.019,-.043,.144)],[.010,.009,.003]),
    ([(.004,-.040,.178),(.013,-.045,.157),(.006,-.043,.146)],[.011,.009,.003]),
    ([(-.043,.010,.157),(-.059,.012,.128),(-.052,.016,.100),(-.063,.009,.083)],[.013,.012,.008,.003]),
    ([(.044,.012,.159),(.059,.016,.130),(.051,.009,.105),(.065,.011,.089)],[.014,.012,.008,.003]),
    ([(-.025,.032,.157),(-.039,.039,.125),(-.029,.038,.097)],[.012,.010,.003]),
    ([(.023,.032,.159),(.039,.039,.129),(.029,.036,.100)],[.012,.010,.003]),
]
for i,(points,radii) in enumerate(hair_specs): tube("Sculpted wavy hair clump %02d"%(i+1),points,radii,HAIR,8)


# -----------------------------------------------------------------------------
# Outfit — wrap dress, clear deliberate fold lines, earrings and lace-up sandals.
# -----------------------------------------------------------------------------
bpy.ops.mesh.primitive_cone_add(vertices=20,radius1=.034,radius2=.023,depth=.044,location=(0,.002,.063))
dress=bpy.context.object; dress.name="Magenta wrap mini dress"; dress.data.materials.append(DRESS); parent(smooth(dress))
# Crossover sash and three shallow fold strips.
tube("Wrap crossover sash",[(-.024,-.019,.076),(0,-.024,.067),(.024,-.019,.058)],[.0026,.0026,.002],DRESS,6)
for i,x in enumerate((-.014,0,.014)):
    tube("Dress fold line %d"%i,[(x,-.027,.072),(x+(.005 if i==0 else -.004),-.029,.050)],[.0012,.00055],DRESS,5)

for side in (-1,1):
    # Hoops are actual torus meshes, silver and glossy.
    bpy.ops.mesh.primitive_torus_add(major_radius=.0062,minor_radius=.0011,major_segments=12,minor_segments=6,location=(side*.044,0,.143),rotation=(math.pi/2,0,0))
    hoop=bpy.context.object; hoop.name=("Left" if side<0 else "Right")+" silver hoop earring"; hoop.data.materials.append(METAL); parent(smooth(hoop))
    # Shoe base and tiny heel.
    shoe=uv_sphere(("Left" if side<0 else "Right")+" silver sandal shoe",(side*.013,-.008,.007),(.014,.022,.007),METAL,16,10)
    cylinder(("Left" if side<0 else "Right")+" high heel",(side*.013,.010,.003),.003,.010,METAL,6)
    # Crossed straps across foot and ankle, deliberately thin but not hairline.
    tube(("Left" if side<0 else "Right")+" sandal cross strap A",[(side*.022,-.024,.010),(side*.008,-.005,.017),(side*.003,.012,.022)],[.0018,.0018,.0015],METAL,5)
    tube(("Left" if side<0 else "Right")+" sandal cross strap B",[(side*.003,-.024,.010),(side*.019,-.004,.017),(side*.023,.012,.022)],[.0018,.0018,.0015],METAL,5)


# -----------------------------------------------------------------------------
# White studio presentation and straight-on elevated three-quarter camera.
# -----------------------------------------------------------------------------
world=bpy.data.worlds.new("White Product Studio") if not bpy.data.worlds else bpy.data.worlds[0]
scene.world=world; world.use_nodes=True
world.node_tree.nodes["Background"].inputs["Color"].default_value=(.82,.82,.82,1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value=.42
def light(name, loc, power, color, softness):
    data=bpy.data.lights.new(name,"POINT"); data.energy=power; data.color=color; data.shadow_soft_size=softness
    ob=bpy.data.objects.new(name,data); ob.location=loc; scene.collection.objects.link(ob)
light("Softbox key",(.22,-.28,.34),55,(1,.78,.66),.12)
light("Softbox fill",(-.20,-.16,.20),34,(.72,.82,1),.12)
light("Softbox rim",(.05,.24,.30),45,(1,.84,.72),.10)
camdata=bpy.data.cameras.new("Chibi Figure Turntable Camera"); camdata.lens=58
camera=bpy.data.objects.new("Chibi Figure Turntable Camera",camdata); camera.location=(.18,-.34,.18)
camera.rotation_euler=(Vector((0,0,.090))-camera.location).to_track_quat("-Z","Y").to_euler(); scene.collection.objects.link(camera); scene.camera=camera


# -----------------------------------------------------------------------------
# Export — static GLB with Draco geometry compression.
# -----------------------------------------------------------------------------
os.makedirs(os.path.dirname(OUT_FILE),exist_ok=True)
settings=dict(filepath=OUT_FILE,export_format="GLB",export_apply=True,export_materials="EXPORT",export_yup=True,export_animations=False,export_cameras=True,export_lights=True)
if "export_draco_mesh_compression_enable" in bpy.ops.export_scene.gltf.get_rna_type().properties.keys():
    settings.update(export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
bpy.ops.export_scene.gltf(**settings)
triangles=sum(len(p.vertices)-2 for ob in scene.objects if ob.type=="MESH" for p in ob.data.polygons)
print("Chibi blind-box girl exported:",OUT_FILE)
print("Source triangle count:",triangles)
