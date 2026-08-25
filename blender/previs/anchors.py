"""
Camera anchors for the Dancefloor previs.

Authored in **Three.js coordinates** (Y-up, -Z forward) because that is the
space the runtime consumes. The build script converts to Blender's Z-up space
when it places the cameras, and the exporter converts back, so a camera nudged
by hand in the viewport round-trips correctly.

    three (x, y, z)  ->  blender (x, -z, y)
    blender (x, y, z) ->  three (x, z, -y)

Each anchor names the section it sits against. `at` is normalized master
progress, and it is not a free parameter: the thirteen sections divide the
scroll evenly, so section i spans [(i-1)/13, i/13] and an anchor sits at the
centre of its section unless it is deliberately placed on a boundary.
"""

# Section order is load-bearing. Index here matches the runtime.
# Section spans, mirroring src/content/site.ts. The narrative allocation is
# deliberately uneven — the cinematic acts need room, the commercial sections
# do not — so anchors cannot be placed on equal thirteenths.
SECTION_SPANS = {
    "hero":            (0.00, 0.12),
    "thesis":          (0.12, 0.18),
    "problem":         (0.18, 0.30),
    "road":            (0.30, 0.42),
    "guidance":        (0.42, 0.53),
    "capture":         (0.53, 0.63),
    "model":           (0.63, 0.73),
    "audience":        (0.73, 0.77),
    "differentiation": (0.77, 0.81),
    "security":        (0.81, 0.84),
    "pricing":         (0.84, 0.87),
    "faq":             (0.87, 0.94),
    "close":           (0.94, 1.00),
}

SECTIONS = list(SECTION_SPANS)


def section_centre(name):
    """Normalized progress at the centre of a section."""
    lo, hi = SECTION_SPANS[name]
    return round((lo + hi) / 2, 4)


def section_start(name):
    return SECTION_SPANS[name][0]


ACTS = {
    "HERO": "ACT_I_FIELD_AT_REST",
    "HERO_PULL": "ACT_I_FIELD_AT_REST",
    "FRACTURE": "ACT_II_FRACTURE",
    "ROAD": "ACT_III_THE_PATCH",
    "GUIDANCE": "ACT_IV_THE_RISE",
    "CAPTURE": "ACT_V_RETURN_PATH",
    "MODEL": "ACT_VI_ONE_PLANE",
    "OBSERVATORY": "ACT_VI_ONE_PLANE",
    "CITY": "ACT_VII_THE_CITY",
    "SETTLE": "ACT_VII_THE_CITY",
}

# anchor -> (progress, section it depicts)
TIMING = {
    "HERO": (0.0, "hero"),
    "HERO_PULL": (section_start("thesis"), "thesis"),
    "FRACTURE": (section_centre("problem"), "problem"),
    "ROAD": (section_centre("road"), "road"),
    "GUIDANCE": (section_centre("guidance"), "guidance"),
    "CAPTURE": (section_centre("capture"), "capture"),
    "MODEL": (section_centre("model"), "model"),
    "OBSERVATORY": (round((SECTION_SPANS["audience"][0] + SECTION_SPANS["faq"][1]) / 2, 4), "security"),
    "CITY": (section_centre("close"), "close"),
    "SETTLE": (1.0, "close"),
}

# ---------------------------------------------------------------------------
# Camera compositions
#
# Re-authored against the built world. The previous set was placed in an empty
# void before any architecture existed, which left several anchors inside
# geometry — the desktop City anchor framed the underside of the ceiling slab.
#
# Landmarks the shots are composed against, in Blender coordinates:
#     SPINE        (-14, -30)  rising to  88
#     BRIDGE       (  0,  38)  deck at    22
#     BEACON       ( 96, -84)  rising to 146
#     GLASS_WALL   (  0, -46)  to         40
#     OBSERVATORY  ( 30,  -8)  deck at    40
#     OCULUS       centred, half-extent   34
#
# Every shot is checked against the three-layer rule: something close enough to
# parallax, the narrative action in the midground, and evidence the world keeps
# going behind it.
# ---------------------------------------------------------------------------

DESKTOP = {
    # FG the hero tile and its frame; MG columns and the Spine; BG the Glass Wall
    # and the district beyond it. Copy sits left, over the darker wall mass.
    "HERO":        dict(position=(2.0, 2.4, -6.0),   target=(48.0, 5.6, -36.0),  fov=38),
    # Pull back and up: the field resolves, the ceiling and columns arrive.
    "HERO_PULL":   dict(position=(15.0, 7.5, -27.0), target=(0.0, 1.5, -2.0),    fov=42),
    # Three districts at different depths, the incomplete Bridge crossing above.
    "FRACTURE":    dict(position=(-31.0, 21.0, -58.0), target=(1.0, 6.5, -19.0), fov=46),
    # Wide, horizontal, analytical. Terraces layer the midground.
    "ROAD":        dict(position=(-47.0, 8.5, -11.0), target=(7.0, 2.0, 5.0),    fov=44),
    # Vertical and directional: down the corridor toward the Spine, which rises.
    "GUIDANCE":    dict(position=(2.0, 3.0, -24.0),  target=(-5.0, 11.0, 22.0),  fov=38),
    # Underfloor. Conduits pass close to camera; infrastructure recedes far below.
    "CAPTURE":     dict(position=(0.5, -9.0, -18.0),  target=(0.0, -6.0, 20.0),  fov=52),
    # Rising back through the plane as the systems align. Everything visited is visible.
    "MODEL":       dict(position=(27.0, 30.0, -46.0), target=(0.0, 10.0, -4.0),  fov=44),
    # On the Observatory deck, looking out over the system operating below.
    "OBSERVATORY": dict(position=(31.0, 44.0, -5.0),  target=(2.0, 7.0, 19.0),   fov=40),
    # Through the oculus. The hall, its districts and the Beacon all read at once.
    "CITY":        dict(position=(12.0, 122.0, -31.0), target=(0.0, 20.0, 5.0),  fov=52),
    # The world recedes but never stops. Footer content enters over this.
    "SETTLE":      dict(position=(0.0, 168.0, -62.0), target=(0.0, 18.0, 0.0),   fov=46),
}

TABLET = {
    "HERO":        dict(position=(1.8, 2.3, -5.5),   target=(42.0, 5.5, -32.0),  fov=42),
    "HERO_PULL":   dict(position=(11.0, 6.5, -21.0), target=(0.0, 1.5, -2.0),    fov=46),
    "FRACTURE":    dict(position=(-22.0, 17.0, -44.0), target=(1.0, 6.0, -16.0), fov=50),
    "ROAD":        dict(position=(-34.0, 7.5, -9.0), target=(5.0, 2.0, 4.0),     fov=48),
    "GUIDANCE":    dict(position=(1.8, 2.8, -23.0),  target=(-4.5, 11.0, 21.0),  fov=42),
    "CAPTURE":     dict(position=(0.4, -8.6, -16.0), target=(0.0, -6.0, 18.0),   fov=56),
    "MODEL":       dict(position=(21.0, 26.0, -38.0), target=(0.0, 9.0, -3.0),   fov=48),
    "OBSERVATORY": dict(position=(31.0, 43.0, -3.0), target=(3.0, 8.0, 17.0),    fov=44),
    "CITY":        dict(position=(9.0, 112.0, -26.0), target=(0.0, 20.0, 4.0),   fov=56),
    "SETTLE":      dict(position=(0.0, 152.0, -52.0), target=(0.0, 18.0, 0.0),   fov=50),
}

MOBILE = {
    # Close on the tile with the Spine behind it; sky-side of frame stays open.
    "HERO":        dict(position=(1.6, 2.2, -5.0),   target=(34.0, 5.6, -28.0),  fov=48),
    # Forward, not sideways: the field opens ahead while the frame stays tall.
    "HERO_PULL":   dict(position=(4.0, 4.2, -13.0),  target=(0.0, 2.4, 2.0),     fov=52),
    # Between districts rather than above them, gaps receding into depth.
    "FRACTURE":    dict(position=(-6.0, 9.0, -30.0), target=(-2.0, 5.0, 2.0),    fov=58),
    # Move between coverage structures, terrain running away from camera.
    "ROAD":        dict(position=(-16.0, 6.0, -6.0), target=(-2.0, 2.4, 16.0),   fov=54),
    # Straight down the corridor; the Spine gives the shot its vertical.
    "GUIDANCE":    dict(position=(1.5, 2.6, -22.0),  target=(-4.0, 12.0, 20.0),  fov=48),
    "CAPTURE":     dict(position=(0.0, -8.2, -13.0), target=(0.0, -5.5, 16.0),   fov=60),
    # Rise vertically through architecture before the system below is revealed.
    "MODEL":       dict(position=(12.0, 22.0, -28.0), target=(2.0, 8.0, -2.0),   fov=54),
    "OBSERVATORY": dict(position=(30.0, 42.5, -1.0), target=(6.0, 9.0, 15.0),    fov=50),
    "CITY":        dict(position=(5.0, 96.0, -20.0), target=(0.0, 22.0, 3.0),    fov=62),
    "SETTLE":      dict(position=(0.0, 130.0, -42.0), target=(0.0, 18.0, 0.0),   fov=56),
}

CLASSES = {
    "DESKTOP": ("D", DESKTOP, (16, 9)),
    "TABLET": ("T", TABLET, (4, 3)),
    "MOBILE": ("M", MOBILE, (9, 19.5)),
}

ORDER = ["HERO", "HERO_PULL", "FRACTURE", "ROAD", "GUIDANCE", "CAPTURE",
         "MODEL", "OBSERVATORY", "CITY", "SETTLE"]


def three_to_blender(v):
    x, y, z = v
    return (x, -z, y)


def blender_to_three(v):
    x, y, z = v
    return (x, z, -y)
