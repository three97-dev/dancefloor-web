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

# ---------------------------------------------------------------------------
# Camera compositions — cut through the venue
#
# Re-cut against the architectural master plan. Every anchor now sits in a real
# space at a believable height, and every transition happens because the camera
# physically travels somewhere rather than because a value was interpolated.
#
# Camera heights vary with purpose: arrival is human (1.4-1.8 m), ROAD glides
# low, Guidance moves vertically, Signals sits at infrastructure scale, the
# Observatory is at human height on its deck, and only the City is aerial.
#
# Focal lengths stay in believable territory - roughly 24-35 mm equivalent for
# the large volumes, 35-50 mm for intimate moments. No 12 mm game views.
#
# The venue, in Blender coordinates (Z up):
#     central hall      +/-36, canopy soffit at  34
#     arrival           y = +72, soffit at        6
#     ROAD terrace      x = -96, tiers 18 down to 9
#     Guidance canyon   x = +96, masses to        30
#     Observatory       y = -84, deck at         30
#     underfloor        mechanical -8, deep     -18
# ---------------------------------------------------------------------------

DESKTOP = {
    # Arrival: human height, inside a compressed threshold, looking through the
    # portal at a volume that is implied rather than revealed.
    "HERO":        dict(position=(0.0, 1.65, -78.0),   target=(0.0, 8.0, -20.0),   fov=38),
    # Moving through the portal as the central hall opens up.
    "HERO_PULL":   dict(position=(0.0, 3.2, -56.0),    target=(0.0, 14.0, 10.0),   fov=44),
    # The main room. Gallery height, looking across the hall to the far balconies.
    "FRACTURE":    dict(position=(2.0, 16.0, -40.0),   target=(0.0, 10.0, 20.0),   fov=46),
    # The coverage terrace: low and gliding, broad and horizontal.
    "ROAD":        dict(position=(-58.0, 21.0, -26.0), target=(-100.0, 14.0, 4.0), fov=42),
    # The canyon: vertical and directional, climbing the modular masses.
    "GUIDANCE":    dict(position=(70.0, 8.0, 2.0),     target=(112.0, 30.0, 0.0),  fov=36),
    # Back-of-house, at infrastructure scale, between the routing corridors.
    "CAPTURE":     dict(position=(0.0, -6.0, -30.0),   target=(0.0, -12.0, 30.0),  fov=48),
    # The convergence atrium, rising through the levels.
    "MODEL":       dict(position=(0.0, 26.0, -60.0),   target=(0.0, 18.0, 20.0),   fov=44),
    # Standing on the Observatory deck, looking back over the venue.
    "OBSERVATORY": dict(position=(0.0, 32.0, 70.0),    target=(0.0, 16.0, -10.0),  fov=38),
    # The only aerial shot: the whole property, recognised rather than introduced.
    "CITY":        dict(position=(62.0, 152.0, -140.0), target=(0.0, 20.0, 0.0),   fov=44),
    "SETTLE":      dict(position=(30.0, 212.0, -200.0), target=(0.0, 10.0, 0.0),   fov=40),
}

TABLET = {
    "HERO":        dict(position=(0.0, 1.62, -70.0),   target=(0.0, 8.0, -20.0),   fov=42),
    "HERO_PULL":   dict(position=(0.0, 3.1, -50.0),    target=(0.0, 13.0, 8.0),    fov=48),
    "FRACTURE":    dict(position=(1.5, 15.0, -34.0),   target=(0.0, 10.0, 16.0),   fov=50),
    "ROAD":        dict(position=(-52.0, 20.0, -22.0), target=(-98.0, 14.0, 3.0),  fov=46),
    "GUIDANCE":    dict(position=(74.0, 7.0, 1.5),     target=(110.0, 28.0, 0.0),  fov=40),
    "CAPTURE":     dict(position=(0.0, -6.0, -26.0),   target=(0.0, -12.0, 26.0),  fov=52),
    "MODEL":       dict(position=(0.0, 24.0, -52.0),   target=(0.0, 17.0, 16.0),   fov=48),
    "OBSERVATORY": dict(position=(0.0, 31.8, 66.0),    target=(0.0, 16.0, -8.0),   fov=42),
    "CITY":        dict(position=(50.0, 138.0, -124.0), target=(0.0, 20.0, 0.0),   fov=48),
    "SETTLE":      dict(position=(24.0, 192.0, -178.0), target=(0.0, 10.0, 0.0),   fov=44),
}

MOBILE = {
    # Tighter inside the threshold, the portal framing the view ahead.
    "HERO":        dict(position=(0.0, 1.60, -62.0),   target=(0.0, 9.0, -22.0),   fov=46),
    "HERO_PULL":   dict(position=(0.0, 3.0, -46.0),    target=(0.0, 15.0, 4.0),    fov=52),
    # Between the gallery columns rather than across the whole room: the hall is
    # read through a framed opening, which is what portrait does well.
    "FRACTURE":    dict(position=(0.0, 13.0, -30.0),   target=(0.0, 12.0, 14.0),   fov=54),
    # Moving between coverage tiers, the terrace receding into depth.
    "ROAD":        dict(position=(-72.0, 19.0, -14.0), target=(-102.0, 15.0, 2.0), fov=50),
    # Straight up the canyon: the narrow passage is the composition.
    "GUIDANCE":    dict(position=(84.0, 5.5, 0.0),     target=(104.0, 32.0, 0.0),  fov=48),
    # Inside a routing corridor, infrastructure closing in on both sides.
    "CAPTURE":     dict(position=(0.0, -6.5, -22.0),   target=(0.0, -11.0, 22.0),  fov=56),
    # Rising through the atrium void, levels passing the frame.
    "MODEL":       dict(position=(0.0, 20.0, -42.0),   target=(0.0, 20.0, 10.0),   fov=52),
    "OBSERVATORY": dict(position=(0.0, 31.6, 58.0),    target=(0.0, 17.0, -6.0),   fov=46),
    "CITY":        dict(position=(34.0, 118.0, -104.0), target=(0.0, 22.0, 0.0),   fov=54),
    "SETTLE":      dict(position=(16.0, 164.0, -150.0), target=(0.0, 10.0, 0.0),   fov=48),
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
