"""
Recurring architectural landmarks.

These are what turn a set of compositions into a place. Each is seen repeatedly
from different angles across the journey, so the visitor subconsciously
concludes: I have actually travelled somewhere.

    THE SPINE       huge vertical frame. Visible in Hero, passed beneath later,
                    seen from above during City.
    THE BRIDGE      incomplete during Fracture, resolved during One Plane.
    THE BEACON      distant illuminated vertical shaft. Orientation across scenes.
    THE GLASS WALL  separates systems early; becomes the Security metaphor.
    THE OBSERVATORY visible from earlier scenes; the physical location for
                    Audience through FAQ.
"""

import math

import bmesh
import bpy
from mathutils import Euler, Matrix

from world_shell import HALL, _box, _cyl, _mesh


def build_spine(mats, col):
    """A huge vertical structural frame near the fabric, read at every altitude."""
    bm = bmesh.new()
    x, y = -14.0, -30.0
    h = 92.0
    base = HALL["floor_z"]

    # Two legs and a series of cross ties — a frame, not a solid tower, so the
    # camera can pass beneath and through it.
    for side in (-1, 1):
        _box(bm, (2.6, 2.6, h), (x + side * 6.0, y, base + h / 2))
    for i in range(9):
        z = base + 6 + i * 10.0
        _box(bm, (15.0, 2.0, 1.2), (x, y, z))
    # Cantilevered head.
    _box(bm, (22.0, 6.0, 3.0), (x + 3, y, base + h))
    return _mesh("LANDMARK_SPINE", bm, mats["clay_light"], col)


def build_bridge(mats, col):
    """
    The Bridge. Modelled in two halves with a deliberate gap: Fracture shows the
    gap, One Plane closes it. The closing piece is a separate object so the
    runtime can move it.
    """
    bm = bmesh.new()
    y, z = 38.0, 22.0
    for side in (-1, 1):
        _box(bm, (30.0, 6.0, 1.4), (side * 22.0, y, z))
        _box(bm, (30.0, 0.5, 1.8), (side * 22.0, y + 2.8, z + 1.6))
        # Pier.
        _box(bm, (3.0, 3.0, z - HALL["floor_z"]),
             (side * 34.0, y, HALL["floor_z"] + (z - HALL["floor_z"]) / 2))
    span = _mesh("LANDMARK_BRIDGE", bm, mats["clay_light"], col)

    # The missing centre span, parked open. Runtime closes it during One Plane.
    bm2 = bmesh.new()
    _box(bm2, (16.0, 6.0, 1.4), (0, y, z))
    closing = _mesh("LANDMARK_BRIDGE_SPAN", bm2, mats["clay"], col)
    closing.location.z = -9.0  # dropped out of the deck until it resolves
    return span, closing


def build_beacon(mats, col):
    """
    A distant illuminated vertical shaft. Its only job is orientation: wherever
    the camera is, the Beacon says which way is which.
    """
    bm = bmesh.new()
    x, y = 96.0, -84.0
    h = 150.0
    _cyl(bm, 4.2, h, (x, y, HALL["floor_z"] + h / 2), segments=16)
    # Banding, so its height is legible at distance.
    for i in range(10):
        _cyl(bm, 5.6, 1.4, (x, y, HALL["floor_z"] + 8 + i * 14.0), segments=16)
    return _mesh("LANDMARK_BEACON", bm, mats["clay_light"], col)


def build_glass_wall(mats, col):
    """
    A tall partition that separates districts early on. Later it becomes the
    containment metaphor for Security — an architectural boundary, never a
    shield or padlock.
    """
    bm = bmesh.new()
    y = -46.0
    h = 44.0
    # Mullions plus panels, so it reads as glazing rather than a slab.
    for i in range(-6, 7):
        _box(bm, (0.6, 0.6, h), (i * 7.0, y, HALL["floor_z"] + h / 2))
    _box(bm, (86.0, 0.25, h), (0, y, HALL["floor_z"] + h / 2))
    _box(bm, (88.0, 1.6, 1.6), (0, y, HALL["floor_z"] + h))
    _box(bm, (88.0, 1.6, 1.2), (0, y, HALL["floor_z"] + 0.6))
    return _mesh("LANDMARK_GLASS_WALL", bm, mats["clay"], col)


def build_observatory(mats, col):
    """
    A large elevated viewing architecture. Visible from below in earlier acts,
    then physically occupied for Audience through FAQ — which is how those
    sections stay inside the world instead of leaving it.
    """
    bm = bmesh.new()
    x, y, z = 30.0, -8.0, 40.0

    # Deck and parapet.
    _box(bm, (44.0, 30.0, 1.8), (x, y, z))
    for sx, sy, w, d in ((0, 15.4, 44.0, 0.6), (0, -15.4, 44.0, 0.6),
                         (22.4, 0, 0.6, 30.0), (-22.4, 0, 0.6, 30.0)):
        _box(bm, (w, d, 1.5), (x + sx, y + sy, z + 1.6))

    # Supporting core and struts.
    _box(bm, (8.0, 8.0, z - HALL["floor_z"]),
         (x, y, HALL["floor_z"] + (z - HALL["floor_z"]) / 2))
    for angle in (0.4, 2.1, 3.9, 5.6):
        _box(bm, (1.4, 1.4, 26.0),
             (x + math.cos(angle) * 16, y + math.sin(angle) * 11, z - 12),
             rotation=Euler((math.radians(14), 0, angle)))

    # Canopy overhead, so the deck is a room and not just a platform.
    _box(bm, (48.0, 34.0, 1.2), (x, y, z + 13.0))
    for sx in (-20, 20):
        for sy in (-13, 13):
            _box(bm, (1.0, 1.0, 12.0), (x + sx, y + sy, z + 7.0))
    return _mesh("LANDMARK_OBSERVATORY", bm, mats["clay_light"], col)


def build(mats, parent_collection=None):
    col = bpy.data.collections.new("LANDMARKS")
    (parent_collection or bpy.context.scene.collection).children.link(col)

    bridge, bridge_span = build_bridge(mats, col)
    return {
        "SPINE": build_spine(mats, col),
        "BRIDGE": bridge,
        "BRIDGE_SPAN": bridge_span,
        "BEACON": build_beacon(mats, col),
        "GLASS_WALL": build_glass_wall(mats, col),
        "OBSERVATORY": build_observatory(mats, col),
    }
