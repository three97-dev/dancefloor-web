"""
Builds the Dancefloor previs environment.

One connected environment, not seven. The act states below are the same maths
the runtime uses in ExperienceTimeline/DancefloorSystem, ported to Python, so a
camera framed here frames the state the browser will actually show.

Run headless:
    blender --background --python blender/previs/build_scene.py
or from the MCP session, which execs this file in the running instance.
"""

import math
import os
import sys

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import anchors  # noqa: E402
import copy_safe  # noqa: E402
import venue  # noqa: E402

# --- world constants, mirroring src/content/scene-data.ts -------------------

ROWS = COLS = 48
TILE = 1.0
SEAM = 0.04
COVERAGE_TARGET = 3.0

# Coverage per patch, mirroring PATCHES in scene-data.ts.
PATCH_COVERAGE = [3.8, 1.9, 4.4, 2.6, 3.1, 1.4, 3.3, 2.2, 4.9, 2.9, 0.9, 3.6]


def coverage_elevation(coverage):
    ratio = coverage / COVERAGE_TARGET
    if ratio <= 1:
        return max(0.0, min(1.0, ratio * 0.5))
    return max(0.0, min(1.0, 0.5 + (1 - math.exp(-(ratio - 1) * 1.2)) * 0.5))


def fract(v):
    return v - math.floor(v)


# --- act states, mirroring deriveState() -----------------------------------
# Values sampled at the centre of each act's own section.

ACT_STATES = {
    "ACT_I_FIELD_AT_REST": dict(fracture=0.0, terrain=0.0, corridor=0.0, city=0.0, alignment=0.0),
    "ACT_II_FRACTURE":     dict(fracture=1.0, terrain=0.0, corridor=0.0, city=0.0, alignment=0.0),
    "ACT_III_THE_PATCH":   dict(fracture=1.0, terrain=1.0, corridor=0.0, city=0.0, alignment=0.0),
    "ACT_IV_THE_RISE":     dict(fracture=1.0, terrain=1.0, corridor=1.0, city=0.0, alignment=0.0),
    "ACT_V_RETURN_PATH":   dict(fracture=1.0, terrain=1.0, corridor=1.0, city=0.0, alignment=0.0),
    "ACT_VI_ONE_PLANE":    dict(fracture=0.0, terrain=1.0, corridor=0.0, city=0.0, alignment=1.0),
    "ACT_VII_THE_CITY":    dict(fracture=0.0, terrain=0.0, corridor=0.0, city=1.0, alignment=1.0),
}


# --- helpers ----------------------------------------------------------------

# §92: during environment development, do NOT use black as the background.
# Black hides missing geometry. Grey exposes empty horizons, missing walls,
# world edges, insufficient depth and bad composition. Final darkness is only
# introduced once the world works without it.
GREYBOX = True


def purge():
    """Clear the file back to an empty scene."""
    # read_homefile rather than read_factory_settings: the latter also wipes
    # user preferences, and the MCP addon blocks it for that reason.
    bpy.ops.wm.read_homefile(use_empty=True, use_factory_startup=True)
    scene = bpy.context.scene
    # Blender 5.x exposes EEVEE Next simply as BLENDER_EEVEE.
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.film_transparent = False
    # The world should feel photographable.
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "None" if GREYBOX else "AgX - Base Contrast"


def collection(name, parent=None):
    col = bpy.data.collections.new(name)
    (parent or bpy.context.scene.collection).children.link(col)
    return col


def material(name, base, roughness=0.5, metallic=0.0, emission=None,
             emission_strength=0.0, alpha=1.0, transmission=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*base, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        mat.blend_method = "BLEND"
    return mat


def make_materials():
    """Premium physically based materials. No glossy futurism."""
    return {
        # Dark anodized metal / blackened steel for frames and structure.
        "steel": material("DF_BlackenedSteel", (0.035, 0.042, 0.05),
                          roughness=0.42, metallic=0.85),
        # Smoked glass over the cavity.
        "glass": material("DF_SmokedGlass", (0.05, 0.06, 0.07),
                          roughness=0.08, metallic=0.0, alpha=0.35, transmission=0.85),
        # Translucent / frosted acrylic diffuser.
        "acrylic": material("DF_FrostedAcrylic", (0.12, 0.14, 0.16),
                            roughness=0.55, alpha=0.6, transmission=0.4),
        # Internal emissive panel — the floor is the light source.
        "led": material("DF_EmissiveResin", (0.02, 0.03, 0.035),
                        roughness=0.3, emission=(0.18, 0.62, 0.69), emission_strength=9.0),
        "led_amber": material("DF_EmissiveAmber", (0.02, 0.02, 0.02),
                              roughness=0.3, emission=(0.59, 0.44, 0.18), emission_strength=4.0),
        "matte": material("DF_MatteComposite", (0.055, 0.062, 0.07), roughness=0.72),
    }



# --- geometry helpers -------------------------------------------------------
# Everything is built through bpy.data + bmesh rather than bpy.ops. Operators
# depend on an active object and a window context, neither of which exists when
# this runs over MCP, and scripted scene generation does not need them.

def _link(obj, col):
    col.objects.link(obj)
    return obj


def mesh_box(name, size, location, mat, col, rotation=None):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    m = Matrix.Translation(location) @ Matrix.Diagonal((*size, 1.0))
    if rotation is not None:
        m = Matrix.Translation(location) @ rotation.to_matrix().to_4x4() @ Matrix.Diagonal((*size, 1.0))
    bmesh.ops.create_cube(bm, size=1.0, matrix=m)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    if mat:
        obj.data.materials.append(mat)
    return _link(obj, col)


def mesh_cylinder(name, radius, depth, location, mat, col, segments=12, rotation=None):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    m = Matrix.Translation(location)
    if rotation is not None:
        m = m @ rotation.to_matrix().to_4x4()
    bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=False, segments=segments,
        radius1=radius, radius2=radius, depth=depth, matrix=m)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    if mat:
        obj.data.materials.append(mat)
    return _link(obj, col)


# --- the tile module --------------------------------------------------------

def build_tile_module(mats, col):
    """
    One modular tile: anodized frame, hollow infinity-mirror cavity, internal
    emissive panel, acrylic diffuser and smoked glass top, over a lift piston.

    The frame is four walls rather than a solid block. That matters: the cavity
    has to be genuinely open for the mirror depth to read, and a solid box would
    simply entomb the LED panel.
    """
    W = 0.06          # wall thickness
    H = 0.16          # frame height
    inner = 1.0 - W * 2

    parts = [
        # Structural frame: four anodized walls around an open well.
        mesh_box("TILE_Frame_XP", (W, TILE, H), (0.5 - W / 2, 0, H / 2), mats["steel"], col),
        mesh_box("TILE_Frame_XN", (W, TILE, H), (-0.5 + W / 2, 0, H / 2), mats["steel"], col),
        mesh_box("TILE_Frame_YP", (inner, W, H), (0, 0.5 - W / 2, H / 2), mats["steel"], col),
        mesh_box("TILE_Frame_YN", (inner, W, H), (0, -0.5 + W / 2, H / 2), mats["steel"], col),
        # Cavity floor — the mirror surface light bounces between.
        mesh_box("TILE_CavityFloor", (inner, inner, 0.010), (0, 0, 0.005), mats["matte"], col),
        # Internal emissive panel, sitting deep in the well.
        mesh_box("TILE_LED", (inner * 0.94, inner * 0.94, 0.004), (0, 0, 0.018), mats["led"], col),
        # Translucent acrylic diffuser part-way up the cavity.
        mesh_box("TILE_Diffuser", (inner, inner, 0.004), (0, 0, 0.105), mats["acrylic"], col),
        # Smoked glass top, slightly proud of the frame.
        mesh_box("TILE_Glass", (TILE * 0.98, TILE * 0.98, 0.008), (0, 0, H + 0.004), mats["glass"], col),
        # Subtle mechanical lift beneath — tiles rise and fall.
        mesh_cylinder("TILE_Lift", 0.07, 0.34, (0, 0, -0.17), mats["steel"], col),
    ]

    bevel = parts[0].modifiers.new("Bevel", "BEVEL")
    bevel.width = 0.006
    bevel.segments = 2

    root = bpy.data.objects.new("TILE_MODULE", None)
    root.empty_display_type = "PLAIN_AXES"
    col.objects.link(root)
    for obj in parts:
        obj.parent = root

    return root


# --- the field --------------------------------------------------------------

def field_transform(r, c, state):
    """
    Position and height for one tile, mirroring DancefloorSystem.update().

    Kept in step with the runtime deliberately: a camera framed against this
    field is framing what the browser will actually draw.
    """
    half_r, half_c = (ROWS - 1) / 2, (COLS - 1) / 2
    seam = SEAM * (1 + state["fracture"] * 5)
    step = TILE + seam

    block_r = int(r // max(1, ROWS // 4))
    block_c = int(c // max(1, COLS // 3))
    patch = (block_r * 3 + block_c) % len(PATCH_COVERAGE)
    region = (block_r * 3 + block_c) % 6
    coverage = coverage_elevation(PATCH_COVERAGE[patch])

    drift = state["fracture"] * (1 if region % 2 == 0 else -1) * (1.5 + region * 0.4)
    x = (c - half_c) * step + (drift if region < 3 else 0)
    y = (r - half_r) * step + (drift if region >= 3 else 0)

    # Act III: elevation carries meaning — it is real coverage, not decoration.
    terrain = (coverage - 0.5) * 4 * state["terrain"]
    # Act IV: the winning corridor rises; everything off-path stays down.
    corridor_band = math.exp(-((c - half_c) / 3.2) ** 2)
    corridor = corridor_band * state["corridor"] * 2.4
    # Act VII: the field folds up into city massing.
    city_band = math.exp(-((r - half_r) / 9) ** 2) * abs(math.sin(c * 0.7 + r * 0.3))
    city = city_band * state["city"] * 9

    z = terrain + corridor + city
    height = 1 + city * 0.6
    return x, y, z, height, region, coverage


HERO_TILE = (24, 24)


def place_hero_tile(root, act):
    """Seat the authored module in the gap the field leaves for it."""
    x, y, z, _height, _region, _cov = field_transform(*HERO_TILE, ACT_STATES[act])
    root.location = (x, y, z)
    return root


def build_field(act, mats, col, name="FIELD"):
    """
    The tile field for one act state, as a single mesh.

    Deliberately one joined mesh rather than 2,304 objects: this exists for
    camera framing, and Blender should stay responsive while it is being framed.
    """
    state = ACT_STATES[act]
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()

    for r in range(ROWS):
        for c in range(COLS):
            # Leave a gap for the authored module rather than z-fighting with it.
            if (r, c) == HERO_TILE:
                continue
            x, y, z, height, _region, _cov = field_transform(r, c, state)
            thickness = 0.16 * height
            bmesh.ops.create_cube(bm, size=1, matrix=(
                Matrix.Translation((x, y, z + thickness / 2))
                @ Matrix.Diagonal((TILE * 0.96, TILE * 0.96, thickness, 1.0))
            ))

    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(mats["steel"])
    col.objects.link(obj)
    return obj


# Restrained signal palette, mirroring SIGNAL_COLORS in DancefloorSystem.ts.
# The LED reference informs how a tile is built, not how it is coloured: RGB
# rainbow behaviour and nightclub visuals are ruled out.
REGION_COLORS = [
    (0.18, 0.62, 0.69),  # cyan — the system's own colour
    (0.20, 0.38, 0.56),  # electric blue
    (0.59, 0.44, 0.18),  # amber
    (0.18, 0.62, 0.69),  # cyan
    (0.31, 0.26, 0.45),  # violet
    (0.20, 0.38, 0.56),  # electric blue
]
BASE_COLOR = (0.15, 0.31, 0.36)


def tile_emission(r, c, state, region, coverage):
    """
    Per-tile emissive colour, mirroring the runtime.

    A resting tile is lit but dim, falling off with distance from the origin so
    the opening close-up reads as one luminous object in darkness. Most of the
    field stays dormant; illumination is selective, because selective
    illumination is what reads as intelligence.
    """
    half_r, half_c = (ROWS - 1) / 2, (COLS - 1) / 2
    distance = math.hypot(c - half_c, r - half_r)
    # Tight falloff and a near-black floor, so the field genuinely extends
    # into darkness instead of tiling brightly to the horizon.
    rest = 0.30 * math.exp(-distance / 5.5) + 0.008

    corridor_band = math.exp(-((c - half_c) / 3.2) ** 2)
    lit = (rest
           + state["terrain"] * max(0.0, coverage - 0.5) * 1.4
           + corridor_band * state["corridor"] * 0.9)

    # Deterministic per-tile ambient offset, so neighbours never match.
    phase = fract(math.sin(r * 127.1 + c * 311.7) * 43758.5453)
    lit += (phase ** 6.0) * 0.55

    divergent = REGION_COLORS[region % len(REGION_COLORS)]
    align = state["alignment"]
    mixed = [divergent[i] + (REGION_COLORS[0][i] - divergent[i]) * align for i in range(3)]
    # Before the fracture the field speaks one language.
    unify = 1 - max(state["fracture"], align)
    mixed = [mixed[i] + (BASE_COLOR[i] - mixed[i]) * unify for i in range(3)]

    return tuple(min(1.0, ch * lit) for ch in mixed), lit


def emissive_material():
    """
    Emission driven by a per-tile colour attribute.

    One material and one mesh keeps the previs responsive, while the colour
    attribute still gives every tile its own state — which is the whole point,
    since a uniformly lit field reads as the nightclub reference rather than an
    operating system.
    """
    mat = bpy.data.materials.new("DF_FieldLED")
    mat.use_nodes = True
    tree = mat.node_tree
    nodes, links = tree.nodes, tree.links
    nodes.clear()

    attr = nodes.new("ShaderNodeAttribute")
    attr.attribute_name = "led"
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Strength"].default_value = 2.2
    output = nodes.new("ShaderNodeOutputMaterial")

    links.new(attr.outputs["Color"], emission.inputs["Color"])
    links.new(emission.outputs["Emission"], output.inputs["Surface"])
    return mat


def build_emissive_layer(act, mats, col, name="FIELD_LED"):
    """A thin emissive plane per tile, so the field lights the scene itself."""
    state = ACT_STATES[act]
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()

    colors = []
    for r in range(ROWS):
        for c in range(COLS):
            if (r, c) == HERO_TILE:
                continue
            x, y, z, height, region, coverage = field_transform(r, c, state)
            thickness = 0.16 * height
            rgb, lit = tile_emission(r, c, state, region, coverage)

            # Outer diffuser panel, inset so the frame border stays visible.
            bmesh.ops.create_grid(
                bm, x_segments=1, y_segments=1, size=TILE * 0.34,
                matrix=Matrix.Translation((x, y, z + thickness + 0.002)))
            colors.extend([rgb] * 4)

            # Inner panel, brighter and fractionally proud: the first step of
            # the infinity-mirror recession, which is what stops a tile
            # reading as one flat lit square.
            inner = tuple(min(1.0, ch * 1.9) for ch in rgb)
            bmesh.ops.create_grid(
                bm, x_segments=1, y_segments=1, size=TILE * 0.17,
                matrix=Matrix.Translation((x, y, z + thickness + 0.004)))
            colors.extend([inner] * 4)

    bm.to_mesh(mesh)
    bm.free()

    layer = mesh.color_attributes.new(name="led", type="FLOAT_COLOR", domain="POINT")
    for i, rgb in enumerate(colors[: len(mesh.vertices)]):
        layer.data[i].color = (*rgb, 1.0)

    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(emissive_material())
    col.objects.link(obj)
    return obj


# Other operating districts. The opening composition needs "another operating
# Dancefloor region" in the background, and Fracture needs three districts that
# are each active but disconnected — neither works with a single field.
DISTRICTS = [
    # (centre_x, centre_y, z, rows, cols, region)
    (-72.0, 58.0, 6.0, 18, 22, 2),
    (68.0, -54.0, 14.0, 16, 20, 4),
    (54.0, 74.0, 22.0, 14, 16, 1),
    (-84.0, -40.0, 10.0, 16, 18, 5),
]


def build_districts(act, mats, col):
    """Smaller tile fields elsewhere in the hall, at their own elevations."""
    state = ACT_STATES[act]
    made = []

    for idx, (cx, cy, cz, rows, cols, region) in enumerate(DISTRICTS):
        mesh = bpy.data.meshes.new(f"DISTRICT_{idx:02d}")
        led_mesh = bpy.data.meshes.new(f"DISTRICT_{idx:02d}_LED")
        bm = bmesh.new()
        led = bmesh.new()
        colors = []

        step = TILE + SEAM * (1 + state["fracture"] * 5)
        for r in range(rows):
            for c in range(cols):
                x = cx + (c - (cols - 1) / 2) * step
                y = cy + (r - (rows - 1) / 2) * step
                bmesh.ops.create_cube(bm, size=1, matrix=(
                    Matrix.Translation((x, y, cz + 0.08))
                    @ Matrix.Diagonal((TILE * 0.96, TILE * 0.96, 0.16, 1.0))))

                # Districts run their own low-level activity, independent of the
                # main field — that is what makes them read as operating.
                phase = fract(math.sin(r * 91.7 + c * 47.3 + idx * 13.1) * 43758.5453)
                lit = 0.06 + (phase ** 5.0) * 0.7
                base = REGION_COLORS[region % len(REGION_COLORS)]
                rgb = tuple(min(1.0, ch * lit) for ch in base)

                bmesh.ops.create_grid(led, x_segments=1, y_segments=1, size=TILE * 0.34,
                                      matrix=Matrix.Translation((x, y, cz + 0.163)))
                colors.extend([rgb] * 4)

        bm.to_mesh(mesh)
        bm.free()
        led.to_mesh(led_mesh)
        led.free()

        layer = led_mesh.color_attributes.new(name="led", type="FLOAT_COLOR", domain="POINT")
        for i, rgb in enumerate(colors[: len(led_mesh.vertices)]):
            layer.data[i].color = (*rgb, 1.0)

        body = bpy.data.objects.new(f"DISTRICT_{idx:02d}", mesh)
        body.data.materials.append(mats["steel"])
        col.objects.link(body)

        glow = bpy.data.objects.new(f"DISTRICT_{idx:02d}_LED", led_mesh)
        glow.data.materials.append(emissive_material())
        col.objects.link(glow)

        # The deck each district sits on.
        deck = bmesh.new()
        _pad = 4.0
        bmesh.ops.create_cube(deck, size=1, matrix=(
            Matrix.Translation((cx, cy, cz - 0.9))
            @ Matrix.Diagonal((cols * step + _pad, rows * step + _pad, 1.8, 1.0))))
        deck_mesh = bpy.data.meshes.new(f"DISTRICT_{idx:02d}_DECK")
        deck.to_mesh(deck_mesh)
        deck.free()
        plate = bpy.data.objects.new(f"DISTRICT_{idx:02d}_DECK", deck_mesh)
        plate.data.materials.append(mats["matte"])
        col.objects.link(plate)

        made.extend([body, glow, plate])

    return made


def build_underfloor(mats, col):
    """Infrastructure the return path travels through."""
    span = TILE * ROWS * 0.5
    made = []
    for i in range(18):
        t = (i / 17 - 0.5) * 2
        made.append(mesh_cylinder(
            f"UNDERFLOOR_Conduit_{i:02d}", 0.09, span * 2,
            (t * span * 0.8, 0, -2.9), mats["steel"], col,
            segments=8, rotation=Euler((math.radians(90), 0, 0))))
    return made


def build_towers(act, mats, col):
    """Isolated structures in Fracture; neighbourhoods in The city."""
    state = ACT_STATES[act]
    span = TILE * 18
    made = []
    for i in range(32):
        a = math.sin(i * 12.9898) * 43758.5453
        b = math.sin(i * 78.233) * 43758.5453
        x = (fract(a) - 0.5) * span * 2.4
        y = (fract(b) - 0.5) * span * 2.4 - 10
        isolated = state["fracture"] * (0.6 + fract(a * 3) * 1.8)
        massing = state["city"] * (2 + fract(b * 5) * 14)
        height = max(0.001, isolated + massing)
        if height < 0.05:
            continue
        made.append(mesh_box(
            f"TOWER_{i:02d}", (1.6, 1.6, height), (x, y, height / 2 - 0.06),
            mats["matte"], col, rotation=Euler((0, 0, fract(a * 7) * math.pi))))
    return made


# --- cameras ----------------------------------------------------------------

def build_cameras(col):
    """
    Three master cameras plus a per-act anchor for each viewport class.

    Anchors are real Blender cameras with real sensor and focal values, so the
    composition can be judged in the viewport rather than guessed in code.
    """
    made = {}
    for class_name, (letter, table, aspect) in anchors.CLASSES.items():
        # The master camera each class's anchors belong to.
        master_name = f"CAM_MASTER_{class_name}"
        cam_data = bpy.data.cameras.new(master_name)
        cam_data.sensor_fit = "VERTICAL"
        master = bpy.data.objects.new(master_name, cam_data)
        col.objects.link(master)
        made[master_name] = master

        for key in anchors.ORDER:
            spec = table[key]
            name = f"CAM_{letter}_{key}"
            data = bpy.data.cameras.new(name)
            # FOV in the runtime is vertical, so match Three.js exactly.
            data.sensor_fit = "VERTICAL"
            data.sensor_height = 24.0
            data.lens = (data.sensor_height / 2) / math.tan(math.radians(spec["fov"]) / 2)
            data.display_size = 0.4

            obj = bpy.data.objects.new(name, data)
            obj.location = anchors.three_to_blender(spec["position"])
            aim(obj, anchors.three_to_blender(spec["target"]))

            progress, section = anchors.TIMING[key]
            obj["df_progress"] = progress
            obj["df_section"] = section
            obj["df_act"] = anchors.ACTS[key]
            obj["df_class"] = class_name
            obj["df_aspect"] = aspect[0] / aspect[1]

            obj.parent = master
            col.objects.link(obj)
            made[name] = obj

    return made


def aim(obj, target):
    """Point a camera at a world-space target, Blender's -Z forward convention."""
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


# --- lighting ---------------------------------------------------------------

def build_lighting(col):
    """
    Lighting reference. The Dancefloor supplies most of the illumination, so
    this is a small number of selective lights over the emissive field.
    """
    world = bpy.data.worlds.new("DF_World")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    if GREYBOX:
        # Neutral grey. If the composition only works because things vanish into
        # black, the world is under-designed and this will show it.
        bg.inputs["Color"].default_value = (0.22, 0.23, 0.24, 1.0)
        bg.inputs["Strength"].default_value = 1.0
    else:
        bg.inputs["Color"].default_value = (0.012, 0.016, 0.022, 1.0)
        bg.inputs["Strength"].default_value = 1.0
    bpy.context.scene.world = world

    def area(name, location, energy, size, color):
        data = bpy.data.lights.new(name, type="AREA")
        data.energy = energy
        data.size = size
        data.color = color
        obj = bpy.data.objects.new(name, data)
        obj.location = location
        aim(obj, (0, 0, 0))
        col.objects.link(obj)
        return obj

    if GREYBOX:
        # Even, undramatic light: the greybox is judged on geometry, not mood.
        area("LIGHT_Key", (-70, -60, 120), 90000, 160, (1.0, 1.0, 1.0))
        area("LIGHT_Fill", (80, 70, 90), 40000, 160, (1.0, 1.0, 1.0))
    else:
        area("LIGHT_Key", (-12, -10, 22), 110, 24, (0.56, 0.65, 0.72))
        area("LIGHT_Rim", (16, 14, 9), 55, 18, (0.22, 0.55, 0.62))


# --- entry point ------------------------------------------------------------

def build(act="ACT_III_THE_PATCH"):
    purge()
    mats = make_materials()

    modules = collection("MODULES")
    world_col = collection("WORLD")
    cams = collection("CAMERAS")
    lights = collection("LIGHTING")

    # The venue first. The Dancefloor is the operating fabric running through
    # one designed building, not an object with scenery arranged around it.
    _spaces, venue_mats = venue.build(greybox=GREYBOX)

    module = build_tile_module(mats, modules)
    place_hero_tile(module, act)
    build_field(act, mats, world_col)
    build_emissive_layer(act, mats, world_col)
    build_districts(act, mats, world_col)
    build_underfloor(mats, world_col)
    build_towers(act, mats, world_col)
    build_lighting(lights)
    made = build_cameras(cams)
    # Negative space is authored, not discovered: these mark where copy lands.
    copy_safe.build()

    scene = bpy.context.scene
    scene.camera = made["CAM_D_ROAD"]
    scene["df_act"] = act
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.eevee.taa_render_samples = 32

    return made


if __name__ == "__main__":
    build()
