"""
WORLD_SHELL — the monumental architectural environment.

The correction this file exists for: the Dancefloor must not float in a black
void. It is one manifestation of a much larger system, and the environment has
to imply that something bigger continues beyond every composition.

Scale target: roughly 200 m across and 70 m tall, whose complete boundaries the
visitor rarely perceives. The architecture carries structural logic — columns
support slabs, bridges connect platforms, conduits follow routes — so the
impossible world still reads as physically buildable.

Built to §92's greybox rule: neutral grey, clay materials, no bloom, no fog, no
dramatic lighting. Black hides missing geometry; grey exposes empty horizons,
missing walls and insufficient depth.
"""

import math

import bmesh
import bpy
from mathutils import Euler, Matrix

# World extents, in metres.
HALL = {
    "half_x": 100.0,
    "half_y": 100.0,
    "floor_z": -4.0,
    "ceiling_z": 66.0,
}

# The Dancefloor fabric occupies the centre; architecture surrounds it.
FABRIC_HALF = 24.0


def _mesh(name, bm, mat, col):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    if mat:
        obj.data.materials.append(mat)
    col.objects.link(obj)
    return obj


def _box(bm, size, location, rotation=None):
    m = Matrix.Translation(location)
    if rotation is not None:
        m = m @ rotation.to_matrix().to_4x4()
    bmesh.ops.create_cube(bm, size=1.0, matrix=m @ Matrix.Diagonal((*size, 1.0)))


def _cyl(bm, radius, depth, location, segments=12, rotation=None):
    m = Matrix.Translation(location)
    if rotation is not None:
        m = m @ rotation.to_matrix().to_4x4()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segments,
                          radius1=radius, radius2=radius, depth=depth, matrix=m)


def clay_materials():
    """
    Greybox clay. Deliberately flat and mid-grey so composition problems are
    visible rather than hidden by lighting.
    """
    made = {}
    for name, value in (("clay", 0.34), ("clay_dark", 0.20), ("clay_light", 0.52)):
        mat = bpy.data.materials.new(f"GREY_{name}")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Base Color"].default_value = (value, value, value, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.85
        bsdf.inputs["Metallic"].default_value = 0.0
        made[name] = mat
    return made


def build_floor_secondary(mats, col):
    """The ground plane the Dancefloor fabric is inset into."""
    bm = bmesh.new()
    _box(bm, (HALL["half_x"] * 2, HALL["half_y"] * 2, 1.5),
         (0, 0, HALL["floor_z"] - 0.75))
    return _mesh("FLOOR_SECONDARY", bm, mats["clay_dark"], col)


def build_wall_masses(mats, col):
    """
    Perimeter mass. Not a box: the walls step and recede so the hall reads as
    part of something larger rather than as a room with four sides.
    """
    bm = bmesh.new()
    hx, hy = HALL["half_x"], HALL["half_y"]
    h = HALL["ceiling_z"] - HALL["floor_z"]
    mid = HALL["floor_z"] + h / 2

    for sign in (-1, 1):
        # Stepped masses rather than one slab, so silhouettes vary.
        for i, (inset, height_scale) in enumerate(((0, 1.0), (14, 0.72), (30, 0.45))):
            _box(bm, (8, hy * 2 - inset * 2, h * height_scale),
                 (sign * (hx - 4 - i * 9), 0, HALL["floor_z"] + h * height_scale / 2))
            _box(bm, (hx * 2 - inset * 2, 8, h * height_scale),
                 (0, sign * (hy - 4 - i * 9), HALL["floor_z"] + h * height_scale / 2))
    return _mesh("WALL_MASSES", bm, mats["clay"], col)


def build_structural_columns(mats, col):
    """
    Enormous columns on a structural grid. These carry the ceiling slabs and are
    the primary foreground occluders during lateral camera moves.
    """
    bm = bmesh.new()
    h = HALL["ceiling_z"] - HALL["floor_z"]
    for gx in range(-3, 4):
        for gy in range(-3, 4):
            # Leave the fabric centre clear.
            if abs(gx) <= 1 and abs(gy) <= 1:
                continue
            x, y = gx * 26.0, gy * 26.0
            _box(bm, (3.4, 3.4, h), (x, y, HALL["floor_z"] + h / 2))
            # Capital and base, so the column meets the slab believably.
            _box(bm, (5.2, 5.2, 1.6), (x, y, HALL["ceiling_z"] - 0.8))
            _box(bm, (4.6, 4.6, 1.0), (x, y, HALL["floor_z"] + 0.5))
    return _mesh("STRUCTURAL_COLUMNS", bm, mats["clay"], col)


def build_ceiling_architecture(mats, col):
    """
    Overhead grid and structural fins. Gives the upper half of the frame
    something to be, which is where most of the old void sat.
    """
    bm = bmesh.new()
    z = HALL["ceiling_z"]
    hx, hy = HALL["half_x"], HALL["half_y"]

    # Coffered slab.
    for gx in range(-4, 5):
        _box(bm, (2.2, hy * 2, 2.6), (gx * 24.0, 0, z + 1.3))
    for gy in range(-4, 5):
        _box(bm, (hx * 2, 2.2, 2.6), (0, gy * 24.0, z + 1.3))

    # Long openings that let light down into the hall.
    for i in range(-2, 3):
        _box(bm, (10, hy * 1.4, 0.6), (i * 34.0, 0, z + 3.0))

    # Structural fins hanging below the slab.
    for i in range(-6, 7):
        _box(bm, (0.8, hy * 1.7, 5.0), (i * 15.0, 0, z - 2.5))
    return _mesh("CEILING_ARCHITECTURE", bm, mats["clay_light"], col)


def build_distant_platforms(mats, col):
    """Raised platforms and cantilevered slabs at varying depths."""
    bm = bmesh.new()
    plates = [
        ((34, 22, 1.6), (-58, 44, 12)),
        ((28, 20, 1.6), (62, -38, 20)),
        ((40, 16, 1.6), (-46, -62, 28)),
        ((24, 26, 1.6), (70, 56, 8)),
        ((30, 18, 1.6), (-72, 8, 36)),
        ((22, 22, 1.6), (18, 74, 24)),
    ]
    for size, loc in plates:
        _box(bm, size, loc)
        # Cantilever support, so the slab is held up by something.
        _box(bm, (2.4, 2.4, loc[2] - HALL["floor_z"]),
             (loc[0], loc[1], HALL["floor_z"] + (loc[2] - HALL["floor_z"]) / 2))
    return _mesh("DISTANT_PLATFORMS", bm, mats["clay"], col)


def build_background_towers(mats, col):
    """
    Far massing beyond the hall. Read only as silhouette and scale — this is the
    evidence that the world continues past the composition.
    """
    bm = bmesh.new()
    for i in range(46):
        a = _fract(math.sin(i * 12.9898) * 43758.5453)
        b = _fract(math.sin(i * 78.233) * 43758.5453)
        c = _fract(math.sin(i * 39.425) * 43758.5453)
        angle = a * math.tau
        radius = 140 + b * 170
        x, y = math.cos(angle) * radius, math.sin(angle) * radius
        height = 30 + c * 120
        width = 10 + b * 22
        _box(bm, (width, width, height), (x, y, HALL["floor_z"] + height / 2),
             rotation=Euler((0, 0, a * math.pi)))
    return _mesh("BACKGROUND_TOWERS", bm, mats["clay_dark"], col)


def build_bridges(mats, col):
    """Bridges connect platforms. Some are deliberately incomplete for Fracture."""
    bm = bmesh.new()
    spans = [
        ((46, 5, 1.0), (-30, 44, 12), 0.0, True),
        ((52, 5, 1.0), (34, -38, 20), 0.0, True),
        ((38, 5, 1.0), (-46, -30, 28), math.pi / 2, False),   # incomplete
        ((44, 5, 1.0), (40, 56, 8), 0.0, False),              # incomplete
    ]
    for size, loc, rot, complete in spans:
        length = size[0] if complete else size[0] * 0.62
        _box(bm, (length, size[1], size[2]), loc, rotation=Euler((0, 0, rot)))
        # Balustrade, so a bridge reads as a bridge at silhouette scale.
        _box(bm, (length, 0.4, 1.4), (loc[0], loc[1] + 2.3, loc[2] + 1.2),
             rotation=Euler((0, 0, rot)))
    return _mesh("BRIDGES", bm, mats["clay_light"], col)


def build_shafts(mats, col):
    """Vertical shafts. Signals travel through these; they also carry the eye up."""
    bm = bmesh.new()
    h = HALL["ceiling_z"] - HALL["floor_z"]
    for x, y in ((-62, 26), (58, -20), (-20, -70), (76, 48)):
        _cyl(bm, 5.0, h * 1.4, (x, y, HALL["floor_z"] + h * 0.7), segments=16)
    return _mesh("SHAFTS", bm, mats["clay"], col)


def build_openings(mats, col):
    """Long wall openings that imply adjacent halls."""
    bm = bmesh.new()
    hx, hy = HALL["half_x"], HALL["half_y"]
    for sign in (-1, 1):
        for i in range(-2, 3):
            _box(bm, (1.2, 22, 9), (sign * (hx - 8), i * 34.0, 8))
            _box(bm, (22, 1.2, 9), (i * 34.0, sign * (hy - 8), 8))
    return _mesh("OPENINGS", bm, mats["clay_light"], col)


def build_far_geometry(mats, col):
    """Deep background plates that dissolve into haze in the final grade."""
    bm = bmesh.new()
    for i in range(14):
        a = _fract(math.sin(i * 3.1 + 1.7) * 43758.5453)
        angle = (i / 14) * math.tau
        radius = 340 + a * 120
        _box(bm, (120, 4, 60 + a * 90),
             (math.cos(angle) * radius, math.sin(angle) * radius, 20),
             rotation=Euler((0, 0, angle + math.pi / 2)))
    return _mesh("FAR_GEOMETRY", bm, mats["clay_dark"], col)


def _fract(v):
    return v - math.floor(v)


def build(mats, parent_collection=None):
    """Builds the whole shell into a WORLD_SHELL collection."""
    col = bpy.data.collections.new("WORLD_SHELL")
    (parent_collection or bpy.context.scene.collection).children.link(col)

    return {
        "FLOOR_SECONDARY": build_floor_secondary(mats, col),
        "WALL_MASSES": build_wall_masses(mats, col),
        "STRUCTURAL_COLUMNS": build_structural_columns(mats, col),
        "CEILING_ARCHITECTURE": build_ceiling_architecture(mats, col),
        "DISTANT_PLATFORMS": build_distant_platforms(mats, col),
        "BACKGROUND_TOWERS": build_background_towers(mats, col),
        "BRIDGES": build_bridges(mats, col),
        "SHAFTS": build_shafts(mats, col),
        "OPENINGS": build_openings(mats, col),
        "FAR_GEOMETRY": build_far_geometry(mats, col),
    }
