"""
THE VENUE — architectural master plan.

The reframe this file exists for: stop designing scenes that contain Dancefloor
objects, and design one building containing different spaces. ROAD, Guidance,
Signals, Model and the Observatory are not separate environments — they are
different architectural experiences inside one enormous venue, and the camera
physically travels between them.

Everything is dimensioned on one module, derived from the Dancefloor tile, so
the whole building reads as generated from the floor:

    1 MODULE = 1 tile = 1 metre
    structural bay = 12 modules

Every element obeys real construction logic. Columns land on footings and carry
slabs. Slabs have thickness and edge details. Bridges have supports, deck
thickness and railings. Glass has thickness and mullions. Where the plan implies
vertical circulation, there are stairs with believable risers.

Human scale is expressed without humans: 1.1 m railings, 0.17 m risers, 2.1 m
door openings, 4 m bridge decks. Without those references a 100 m room reads
like a 10 m one.
"""

import math

import bmesh
import bpy
from mathutils import Euler, Matrix

# --- the module -------------------------------------------------------------

M = 1.0                 # one tile, one metre
BAY = 12 * M            # structural bay
HALF = 36 * M           # central hall half-width (6 bays across)

# Human-scale constants. These are what make an enormous room feel enormous.
RAIL_H = 1.1 * M
RAIL_T = 0.06 * M
RISER = 0.17 * M
TREAD = 0.28 * M
DOOR_H = 2.1 * M
SLAB_T = 0.6 * M
DECK_W = 4 * M

# --- levels -----------------------------------------------------------------
# A real section. Every space sits on one of these.

LEVEL = {
    "deep": -18 * M,        # L-2 deep routing infrastructure
    "mech": -8 * M,         # L-1 mechanical / signal layer
    "ground": 0.0,          # L0  arrival + central Dancefloor
    "gallery": 9 * M,       # L1  perimeter galleries and balconies
    "district": 18 * M,     # L2  ROAD terrace / Guidance base / bridges
    "observatory": 30 * M,  # L3  Observatory deck
    "canopy": 34 * M,       # luminous grid canopy soffit
}

HALL_HEIGHT = LEVEL["canopy"] - LEVEL["ground"]   # 34m central volume


# --- construction helpers ---------------------------------------------------

def _mesh(name, bm, mat, col):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    if mat:
        obj.data.materials.append(mat)
    col.objects.link(obj)
    return obj


def box(bm, size, loc, rot=None):
    m = Matrix.Translation(loc)
    if rot is not None:
        m = m @ rot.to_matrix().to_4x4()
    bmesh.ops.create_cube(bm, size=1.0, matrix=m @ Matrix.Diagonal((*size, 1.0)))


def cyl(bm, r, depth, loc, seg=16, rot=None):
    m = Matrix.Translation(loc)
    if rot is not None:
        m = m @ rot.to_matrix().to_4x4()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg,
                          radius1=r, radius2=r, depth=depth, matrix=m)


def slab(bm, w, d, loc, thickness=SLAB_T, edge=True):
    """A floor plate with real thickness and a shadow-gap edge."""
    box(bm, (w, d, thickness), loc)
    if edge:
        # Recessed edge band: catches light and reads the slab's depth.
        box(bm, (w + 0.12, d + 0.12, thickness * 0.34),
            (loc[0], loc[1], loc[2] - thickness * 0.42))


def column(bm, loc, height, size=1.2 * M):
    """Column with a footing and a capital, so it lands and carries."""
    box(bm, (size, size, height), (loc[0], loc[1], loc[2] + height / 2))
    box(bm, (size * 1.7, size * 1.7, 0.4 * M), (loc[0], loc[1], loc[2] + 0.2 * M))
    box(bm, (size * 1.55, size * 1.55, 0.5 * M),
        (loc[0], loc[1], loc[2] + height - 0.25 * M))


def railing(bm, length, loc, rot=None):
    """Top rail, bottom rail and posts at a believable spacing."""
    box(bm, (length, RAIL_T, RAIL_T * 1.6), (loc[0], loc[1], loc[2] + RAIL_H), rot)
    box(bm, (length, RAIL_T, RAIL_T), (loc[0], loc[1], loc[2] + RAIL_H * 0.42), rot)
    posts = max(2, int(length / (1.5 * M)))
    for i in range(posts + 1):
        t = (i / posts - 0.5) * length
        dx, dy = (t, 0.0)
        if rot is not None:
            c, s = math.cos(rot.z), math.sin(rot.z)
            dx, dy = t * c, t * s
        box(bm, (RAIL_T, RAIL_T, RAIL_H),
            (loc[0] + dx, loc[1] + dy, loc[2] + RAIL_H / 2))


def stair(bm, loc, rise, width=3 * M, direction=(0, 1)):
    """Real risers and treads, so vertical circulation is believable."""
    steps = max(1, int(rise / RISER))
    dx, dy = direction
    for i in range(steps):
        z = loc[2] + (i + 0.5) * RISER
        x = loc[0] + dx * (i + 0.5) * TREAD
        y = loc[1] + dy * (i + 0.5) * TREAD
        depth = TREAD if dy else width
        wide = width if dy else TREAD
        box(bm, (wide, depth, RISER), (x, y, z))
    # Stringers either side, so the flight is supported.
    run = steps * TREAD
    for side in (-1, 1):
        ox = side * width / 2 if dy else 0
        oy = 0 if dy else side * width / 2
        box(bm, (0.25 * M if dy else run, run if dy else 0.25 * M, 0.5 * M),
            (loc[0] + ox + dx * run / 2, loc[1] + oy + dy * run / 2, loc[2] + rise / 2))


def bridge(bm, span, loc, rot=None, width=DECK_W, complete=True):
    """Deck, edge beams, railings and end supports."""
    length = span if complete else span * 0.58
    offset = 0 if complete else -(span - length) / 2
    cx = loc[0] + (offset if rot is None else offset * math.cos(rot.z))
    cy = loc[1] + (0 if rot is None else offset * math.sin(rot.z))

    box(bm, (length, width, 0.5 * M), (cx, cy, loc[2]), rot)
    # Edge beams give the deck believable thickness in silhouette.
    for side in (-1, 1):
        oy = side * width / 2
        ox = 0.0
        if rot is not None:
            c, s = math.cos(rot.z), math.sin(rot.z)
            ox, oy = -oy * s, oy * c
        box(bm, (length, 0.3 * M, 0.9 * M), (cx + ox, cy + oy, loc[2] - 0.2 * M), rot)
        railing(bm, length, (cx + ox, cy + oy, loc[2] + 0.25 * M), rot)


def glass_wall(bm, width, height, loc, rot=None, mullion_every=3 * M):
    """Glazing with real thickness, framed and mullioned."""
    box(bm, (width, 0.06 * M, height), (loc[0], loc[1], loc[2] + height / 2), rot)
    box(bm, (width, 0.3 * M, 0.3 * M), (loc[0], loc[1], loc[2] + height), rot)
    box(bm, (width, 0.3 * M, 0.3 * M), (loc[0], loc[1], loc[2] + 0.15 * M), rot)
    count = max(1, int(width / mullion_every))
    for i in range(count + 1):
        t = (i / count - 0.5) * width
        dx, dy = (t, 0.0)
        if rot is not None:
            c, s = math.cos(rot.z), math.sin(rot.z)
            dx, dy = t * c, t * s
        box(bm, (0.14 * M, 0.22 * M, height),
            (loc[0] + dx, loc[1] + dy, loc[2] + height / 2), rot)


def light_channel(bm, length, loc, rot=None):
    """Recessed linear illumination — a repeated motif across every district."""
    box(bm, (length, 0.34 * M, 0.16 * M), loc, rot)


# --- the spaces -------------------------------------------------------------

def build_structure(mats, col):
    """
    The primary structural system: column grid, ground slab, level plates.

    Columns run continuously through the section, which is what ties the
    underfloor infrastructure to the public levels above it.
    """
    bm = bmesh.new()

    # Ground plane, with the central hall void left open for the Dancefloor.
    for gx in range(-8, 9):
        for gy in range(-8, 9):
            x, y = gx * BAY, gy * BAY
            if abs(x) <= HALF and abs(y) <= HALF:
                continue
            slab(bm, BAY, BAY, (x, y, LEVEL["ground"] - SLAB_T / 2))

    # Column grid on the structural bay. Columns continue from the deepest
    # level to the canopy wherever the plan allows it.
    for gx in range(-6, 7):
        for gy in range(-6, 7):
            x, y = gx * BAY, gy * BAY
            inside_hall = abs(x) < HALF - BAY and abs(y) < HALF - BAY
            if inside_hall:
                continue
            base = LEVEL["deep"] if abs(gx) % 2 == 0 else LEVEL["mech"]
            column(bm, (x, y, base), LEVEL["canopy"] - base)

    return _mesh("VENUE_STRUCTURE", bm, mats["concrete"], col)


def build_arrival(mats, col):
    """
    Arrival — a compressed, human-scale threshold.

    The hero does not open on the whole Dancefloor. It opens inside a tight
    architectural zone with a portal beyond which a spectacular volume is
    implied but not yet revealed.
    """
    bm = bmesh.new()
    y = HALF + 3 * BAY

    # Low soffit over the arrival zone: compression before release.
    slab(bm, 14 * BAY, 3 * BAY, (0, y, 6 * M))
    # Side walls forming the threshold.
    for side in (-1, 1):
        box(bm, (1.2 * M, 3 * BAY, 6 * M), (side * 5 * BAY, y, 3 * M))
    # The portal itself — a thick rectilinear frame, the building's core motif.
    for side in (-1, 1):
        box(bm, (1.6 * M, 2 * M, 9 * M), (side * 4 * M, HALF + 2 * M, 4.5 * M))
    box(bm, (10 * M, 2 * M, 1.6 * M), (0, HALF + 2 * M, 9.8 * M))
    # Floor plate and steps down into the hall.
    slab(bm, 14 * BAY, 3 * BAY, (0, y, LEVEL["ground"] - SLAB_T / 2))
    stair(bm, (0, HALF + 6 * M, LEVEL["ground"] - 1.7 * M), 1.7 * M,
          width=8 * M, direction=(0, -1))
    return _mesh("VENUE_ARRIVAL", bm, mats["concrete"], col)


def build_central_hall(mats, col):
    """
    The central hall — the venue's spatial heart.

    A 34 m volume with the Dancefloor at its centre, ringed by galleries,
    balconies and bridges. Every other district looks back into this room, which
    is what stops the acts reading as unrelated sets.
    """
    bm = bmesh.new()

    # Perimeter galleries at two levels, cantilevered into the volume.
    for level in ("gallery", "district"):
        z = LEVEL[level]
        depth = 3 * BAY if level == "gallery" else 2 * BAY
        for sign in (-1, 1):
            slab(bm, HALF * 2, depth, (0, sign * (HALF + depth / 2 - BAY), z))
            railing(bm, HALF * 2, (0, sign * (HALF - BAY + 0.3 * M), z + SLAB_T / 2))
            slab(bm, depth, HALF * 2, (sign * (HALF + depth / 2 - BAY), 0, z))
            railing(bm, HALF * 2, (sign * (HALF - BAY + 0.3 * M), 0, z + SLAB_T / 2),
                    Euler((0, 0, math.pi / 2)))
            # Recessed light channel under every gallery edge.
            light_channel(bm, HALF * 2, (0, sign * (HALF - BAY), z - 0.5 * M))

    # Vertical circulation connecting ground to both galleries.
    for sign in (-1, 1):
        stair(bm, (sign * (HALF - 2 * BAY), -HALF + BAY, LEVEL["ground"]),
              LEVEL["gallery"], width=4 * M, direction=(0, 1))

    # Balconies projecting into the room, at the module rhythm.
    for i in (-2, 0, 2):
        for sign in (-1, 1):
            slab(bm, 3 * BAY, BAY, (i * 2 * BAY, sign * (HALF - BAY - BAY / 2),
                                    LEVEL["district"]))
            railing(bm, 3 * BAY, (i * 2 * BAY, sign * (HALF - BAY - BAY), LEVEL["district"] + SLAB_T / 2))

    return _mesh("VENUE_CENTRAL_HALL", bm, mats["concrete"], col)


def build_canopy(mats, col):
    """
    THE LUMINOUS GRID CANOPY — the ceiling as a hero element.

    Suspended on the same module as the floor, so ceiling and floor speak the
    same language and the room reads as intentionally designed. Hung from the
    structure above with visible rods rather than floating.
    """
    bm = bmesh.new()
    z = LEVEL["canopy"]

    # Primary suspended beams on the bay grid.
    for gx in range(-6, 7):
        box(bm, (0.5 * M, HALF * 2 + 4 * BAY, 1.1 * M), (gx * BAY, 0, z))
    for gy in range(-6, 7):
        box(bm, (HALF * 2 + 4 * BAY, 0.5 * M, 1.1 * M), (0, gy * BAY, z))

    # Coffered panels inside each bay, recessed and internally lit.
    for gx in range(-5, 6):
        for gy in range(-5, 6):
            x, y = gx * BAY + BAY / 2, gy * BAY + BAY / 2
            if abs(x) > HALF + BAY or abs(y) > HALF + BAY:
                continue
            box(bm, (BAY - 1.4 * M, BAY - 1.4 * M, 0.3 * M), (x, y, z + 0.5 * M))

    # Hanger rods: the canopy is suspended, not floating.
    for gx in range(-6, 7, 2):
        for gy in range(-6, 7, 2):
            cyl(bm, 0.09 * M, 5 * M, (gx * BAY, gy * BAY, z + 3.5 * M), seg=6)

    return _mesh("VENUE_CANOPY", bm, mats["steel"], col)


def build_canopy_lights(mats, col):
    """The canopy's luminous elements, as a separate emissive mesh."""
    bm = bmesh.new()
    z = LEVEL["canopy"]
    for gx in range(-5, 6):
        for gy in range(-5, 6):
            x, y = gx * BAY + BAY / 2, gy * BAY + BAY / 2
            if abs(x) > HALF + BAY or abs(y) > HALF + BAY:
                continue
            box(bm, (BAY - 2.6 * M, BAY - 2.6 * M, 0.1 * M), (x, y, z + 0.2 * M))
    return _mesh("VENUE_CANOPY_LIGHT", bm, mats["luminous"], col)


def build_road_terrace(mats, col):
    """
    ROAD — THE COVERAGE TERRACE.

    A broad, horizontal, analytical landscape of tiered platforms reached from
    the central hall by bridge. Retains sight lines back to the hall.
    """
    bm = bmesh.new()
    ox = -(HALF + 5 * BAY)

    for tier in range(4):
        z = LEVEL["district"] - tier * 3 * M
        w = (7 - tier) * BAY
        d = 5 * BAY
        slab(bm, w, d, (ox - tier * BAY, 0, z))
        railing(bm, w, (ox - tier * BAY, d / 2, z + SLAB_T / 2))
        light_channel(bm, w, (ox - tier * BAY, -d / 2 + 0.4 * M, z - 0.5 * M))
        # Retaining wall between tiers, so the level change is built.
        box(bm, (0.8 * M, d, 3 * M), (ox - tier * BAY - w / 2, 0, z - 1.5 * M))
        # Supports beneath every platform.
        for sx in (-0.36, 0.36):
            for sy in (-0.36, 0.36):
                column(bm, (ox - tier * BAY + w * sx, d * sy, LEVEL["ground"]),
                       z - LEVEL["ground"], size=0.9 * M)

    # The bridge that physically connects ROAD to the central hall.
    bridge(bm, 5 * BAY, (ox + 4 * BAY, 0, LEVEL["district"]), width=6 * M)
    return _mesh("VENUE_ROAD", bm, mats["concrete"], col)


def build_guidance_canyon(mats, col):
    """
    GUIDANCE — THE GUIDANCE CANYON.

    Tall modular structures rising through several levels, separated by a narrow
    passage. Vertical, directional and intimate, with framed views back toward
    the central hall.
    """
    bm = bmesh.new()
    ox = HALF + 5 * BAY

    for side in (-1, 1):
        for i in range(5):
            y = (i - 2) * 3 * BAY
            h = (14 + (i % 3) * 8) * M
            base = LEVEL["ground"]
            w = 2 * BAY
            box(bm, (w, 2 * BAY, h), (ox + side * 3 * BAY, y, base + h / 2))
            # Stepped setbacks, derived from raised Dancefloor modules.
            box(bm, (w - 2 * M, 2 * BAY - 2 * M, 2 * M),
                (ox + side * 3 * BAY, y, base + h + 1 * M))
            # Luminous joint between masses — a repeated motif.
            light_channel(bm, 2 * BAY, (ox + side * 3 * BAY - side * w / 2, y, base + h * 0.55),
                          Euler((0, 0, math.pi / 2)))

    # Suspended pathways threading the canyon at two heights.
    for z in (LEVEL["gallery"], LEVEL["district"]):
        bridge(bm, 9 * BAY, (ox, 0, z), Euler((0, 0, math.pi / 2)), width=3.5 * M)

    # The narrowing passage that leads in from ROAD.
    for side in (-1, 1):
        box(bm, (BAY, 4 * BAY, 12 * M), (ox - 5 * BAY, side * 2.5 * BAY, 6 * M))

    return _mesh("VENUE_GUIDANCE", bm, mats["concrete"], col)


def build_underfloor(mats, col):
    """
    SIGNALS — back-of-house computational infrastructure.

    The glamorous levels above are supported by a massive operational system
    below, exactly as a resort is. Structural bays repeat, conduits have routes
    and destinations, and the columns overhead visibly continue down into it.
    """
    bm = bmesh.new()

    for level_name, spacing in (("mech", 2), ("deep", 3)):
        z = LEVEL[level_name]
        # Technical floor plates with service voids between them.
        for gx in range(-5, 6, spacing):
            for gy in range(-5, 6, spacing):
                slab(bm, BAY * 1.6, BAY * 1.6, (gx * BAY, gy * BAY, z), thickness=0.4 * M)

        # Primary routing corridors running the length of the plan.
        for gx in range(-4, 5, 2):
            box(bm, (1.6 * M, 12 * BAY, 0.9 * M), (gx * BAY, 0, z + 2.2 * M))
        for gy in range(-4, 5, 2):
            box(bm, (12 * BAY, 1.6 * M, 0.9 * M), (0, gy * BAY, z + 3.6 * M))

        # Maintenance bridges between plates.
        for gx in range(-3, 4, 3):
            bridge(bm, 3 * BAY, (gx * BAY, 0, z + 1.6 * M), width=2.4 * M)

    # Vertical service shafts tying the levels together.
    for x, y in ((-3 * BAY, 3 * BAY), (3 * BAY, -3 * BAY), (-4 * BAY, -4 * BAY)):
        box(bm, (2.5 * BAY, 2.5 * BAY, LEVEL["ground"] - LEVEL["deep"]),
            (x, y, (LEVEL["ground"] + LEVEL["deep"]) / 2))

    return _mesh("VENUE_UNDERFLOOR", bm, mats["technical"], col)


def build_underfloor_light(mats, col):
    """Illuminated rails and junctions — the infrastructure's own lighting."""
    bm = bmesh.new()
    for level_name in ("mech", "deep"):
        z = LEVEL[level_name]
        for gx in range(-4, 5, 2):
            light_channel(bm, 12 * BAY, (gx * BAY, 0, z + 2.75 * M),
                          Euler((0, 0, math.pi / 2)))
        for gy in range(-4, 5, 2):
            light_channel(bm, 12 * BAY, (0, gy * BAY, z + 4.15 * M))
        # Junction nodes where routes meet.
        for gx in range(-4, 5, 2):
            for gy in range(-4, 5, 2):
                box(bm, (1.1 * M, 1.1 * M, 0.5 * M), (gx * BAY, gy * BAY, z + 3.0 * M))
    return _mesh("VENUE_UNDERFLOOR_LIGHT", bm, mats["luminous"], col)


def build_convergence_atrium(mats, col):
    """
    MODEL — THE CONVERGENCE ATRIUM.

    The one place where ROAD, Guidance, the infrastructure below, the central
    Dancefloor, the bridges and the canopy can all be perceived at once. The
    architectural climax, and the space where the Bridge finally completes.
    """
    bm = bmesh.new()

    # A tall void cut through the levels on the hall's main axis.
    for side in (-1, 1):
        for z_name in ("gallery", "district", "observatory"):
            z = LEVEL[z_name]
            slab(bm, 2 * BAY, 8 * BAY, (side * 4 * BAY, 0, z))
            railing(bm, 8 * BAY, (side * (4 * BAY - BAY), 0, z + SLAB_T / 2),
                    Euler((0, 0, math.pi / 2)))

    # The completing span, held open until One Plane resolves it.
    bridge(bm, 6 * BAY, (0, 0, LEVEL["district"]), width=5 * M, complete=False)
    return _mesh("VENUE_ATRIUM", bm, mats["concrete"], col)


def build_observatory(mats, col):
    """
    THE OBSERVATORY — an elevated viewing terrace.

    A premium skybox translated into the building's own language: broad terrace,
    smoked glass balustrade, restrained ceiling and a large opening toward the
    city. The calmest part of the experience, where the commercial content lives.
    """
    bm = bmesh.new()
    z = LEVEL["observatory"]
    ox, oy = 0, -(HALF + 4 * BAY)

    slab(bm, 10 * BAY, 5 * BAY, (ox, oy, z), thickness=0.8 * M)
    # Supporting core and raking struts, so the terrace is held up.
    box(bm, (3 * BAY, 3 * BAY, z - LEVEL["ground"]), (ox, oy, (z + LEVEL["ground"]) / 2))
    for sx in (-1, 1):
        for sy in (-1, 1):
            column(bm, (ox + sx * 4 * BAY, oy + sy * 2 * BAY, LEVEL["ground"]),
                   z - LEVEL["ground"], size=1.0 * M)

    # Smoked glass balustrade facing the hall.
    glass_wall(bm, 10 * BAY, 1.3 * M, (ox, oy + 2.5 * BAY, z + 0.4 * M))
    # Restrained ceiling over the terrace, with an opening toward the city.
    slab(bm, 10 * BAY, 5 * BAY, (ox, oy, z + 5.5 * M), thickness=0.5 * M)
    for sx in (-1, 1):
        box(bm, (0.9 * M, 5 * BAY, 5.5 * M), (ox + sx * 5 * BAY, oy, z + 2.75 * M))
    # Warm architectural cove around the terrace edge.
    light_channel(bm, 10 * BAY, (ox, oy - 2.4 * BAY, z + 5.0 * M))
    return _mesh("VENUE_OBSERVATORY", bm, mats["stone"], col)


def build_facade(mats, col):
    """
    The enclosing envelope.

    Stepped translucent masses rather than a box, so the volume never resolves
    as a room with four walls, and the upper world dissolves into atmosphere
    rather than meeting a lid.
    """
    bm = bmesh.new()
    outer = HALF + 9 * BAY

    for sign in (-1, 1):
        for step, (inset, height) in enumerate(((0, 40), (3, 26), (6, 15))):
            h = height * M
            glass_wall(bm, outer * 2 - inset * BAY, h,
                       (0, sign * (outer - step * 2 * BAY), LEVEL["ground"]),
                       mullion_every=BAY)
            glass_wall(bm, outer * 2 - inset * BAY, h,
                       (sign * (outer - step * 2 * BAY), 0, LEVEL["ground"]),
                       Euler((0, 0, math.pi / 2)), mullion_every=BAY)
    return _mesh("VENUE_FACADE", bm, mats["glass"], col)


def build_city(mats, col):
    """
    Distant extensions of the same venue.

    Not a new city: the building continuing outward, on the same module and the
    same structural language, so the final reveal is recognition rather than a
    change of subject.
    """
    bm = bmesh.new()
    for i in range(28):
        a = _fract(math.sin(i * 12.9898) * 43758.5453)
        b = _fract(math.sin(i * 78.233) * 43758.5453)
        angle = (i / 28) * math.tau + a * 0.2
        radius = (14 + b * 16) * BAY
        x, y = math.cos(angle) * radius, math.sin(angle) * radius
        h = (12 + a * 46) * M
        w = (2 + int(b * 4)) * BAY
        box(bm, (w, w, h), (x, y, LEVEL["ground"] + h / 2), Euler((0, 0, a * math.pi)))
        # Setback, matching the venue's own stepped language.
        box(bm, (w * 0.7, w * 0.7, h * 0.22),
            (x, y, LEVEL["ground"] + h + h * 0.11), Euler((0, 0, a * math.pi)))
    return _mesh("VENUE_CITY", bm, mats["concrete"], col)


def _fract(v):
    return v - math.floor(v)


# --- material library -------------------------------------------------------

def material_library(greybox=True):
    """
    A locked library of primary material families.

    In greybox everything is one neutral clay so the architecture is judged on
    form alone: if the districts look unrelated without their colour, the
    building is still disjointed.
    """
    specs = {
        "concrete": (0.34, 0.85, 0.0),
        "steel": (0.26, 0.45, 0.85),
        "glass": (0.42, 0.12, 0.0),
        "acrylic": (0.55, 0.5, 0.0),
        "stone": (0.30, 0.3, 0.0),
        "aluminium": (0.46, 0.32, 0.9),
        "resin": (0.5, 0.45, 0.0),
        "technical": (0.28, 0.75, 0.3),
        "luminous": (0.8, 0.4, 0.0),
    }
    made = {}
    for name, (value, rough, metal) in specs.items():
        mat = bpy.data.materials.new(f"DF_{name}")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes["Principled BSDF"]
        v = 0.34 if greybox and name != "luminous" else value
        bsdf.inputs["Base Color"].default_value = (v, v, v, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.85 if greybox else rough
        bsdf.inputs["Metallic"].default_value = 0.0 if greybox else metal
        made[name] = mat
    return made


# --- entry point ------------------------------------------------------------

def build(mats=None, greybox=True, parent=None):
    """Builds the whole venue into a VENUE collection."""
    mats = mats or material_library(greybox)
    col = bpy.data.collections.new("VENUE")
    (parent or bpy.context.scene.collection).children.link(col)

    return {
        "STRUCTURE": build_structure(mats, col),
        "ARRIVAL": build_arrival(mats, col),
        "CENTRAL_HALL": build_central_hall(mats, col),
        "CANOPY": build_canopy(mats, col),
        "CANOPY_LIGHT": build_canopy_lights(mats, col),
        "ROAD": build_road_terrace(mats, col),
        "GUIDANCE": build_guidance_canyon(mats, col),
        "UNDERFLOOR": build_underfloor(mats, col),
        "UNDERFLOOR_LIGHT": build_underfloor_light(mats, col),
        "ATRIUM": build_convergence_atrium(mats, col),
        "OBSERVATORY": build_observatory(mats, col),
        "FACADE": build_facade(mats, col),
        "CITY": build_city(mats, col),
    }, mats
