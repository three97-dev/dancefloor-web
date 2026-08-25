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

# Desktop: cinematic maximum. Wide lateral compositions — the visitor travels
# ACROSS the field.
DESKTOP = {
    "HERO":        dict(position=(1.74, 0.90, 1.74), target=(0.52, 0.10, 0.52), fov=30),
    "HERO_PULL":   dict(position=(2.4, 1.6, 6.5),    target=(0, 0, 0),       fov=40),
    "FRACTURE":    dict(position=(-9, 4.2, 12),      target=(1.5, 0.4, 0),   fov=46),
    "ROAD":        dict(position=(-16, 3.1, 4),      target=(-2, 1.2, -2),   fov=42),
    "GUIDANCE":    dict(position=(-4, 2.4, -8),      target=(-4, 3.2, -22),  fov=38),
    "CAPTURE":     dict(position=(-2, -2.6, -26),    target=(3, -1.4, -34),  fov=50),
    "MODEL":       dict(position=(6, 6.5, -30),      target=(0, 0.5, -18),   fov=44),
    "OBSERVATORY": dict(position=(2, 14, -6),        target=(0, 0.5, -20),   fov=40),
    "CITY":        dict(position=(10, 46, -6),       target=(0, 0, -14),     fov=52),
    "SETTLE":      dict(position=(4, 62, 30),        target=(0, 0, -8),      fov=48),
}

# Tablet: cinematic compressed. Closer, less lateral travel — the visitor moves
# THROUGH the environment.
TABLET = {
    "HERO":        dict(position=(1.62, 0.84, 1.62), target=(0.52, 0.10, 0.52), fov=34),
    "HERO_PULL":   dict(position=(1.5, 1.4, 5.2),    target=(0, 0, 0),       fov=44),
    "FRACTURE":    dict(position=(-5, 3.6, 9),       target=(0.8, 0.4, 0),   fov=50),
    "ROAD":        dict(position=(-9, 2.8, 3),       target=(-1.5, 1.1, -3), fov=46),
    "GUIDANCE":    dict(position=(-3, 2.2, -7),      target=(-3, 3, -20),    fov=42),
    "CAPTURE":     dict(position=(-1.5, -2.4, -24),  target=(2, -1.3, -32),  fov=54),
    "MODEL":       dict(position=(4, 5.6, -28),      target=(0, 0.5, -18),   fov=48),
    "OBSERVATORY": dict(position=(1.5, 12, -5),      target=(0, 0.5, -19),   fov=44),
    "CITY":        dict(position=(6, 40, -8),        target=(0, 0, -15),     fov=56),
    "SETTLE":      dict(position=(2, 54, 22),        target=(0, 0, -9),      fov=52),
}

# Mobile: cinematic focused. DEPTH rather than width — this is critical. The
# camera travels forward and upward between a few chosen tiles, and every
# position must leave deliberate negative space for copy.
MOBILE = {
    "HERO":        dict(position=(1.52, 0.96, 1.52), target=(0.52, 0.10, 0.52), fov=40),
    "HERO_PULL":   dict(position=(0.4, 0.9, 3.0),    target=(0, 0.1, -1.2),  fov=52),
    "FRACTURE":    dict(position=(0, 1.5, 5.5),      target=(0, 0.3, -3),    fov=58),
    "ROAD":        dict(position=(0.6, 1.9, 1.5),    target=(0.2, 0.9, -6),  fov=54),
    "GUIDANCE":    dict(position=(0, 1.7, -6),       target=(0, 2.6, -19),   fov=48),
    "CAPTURE":     dict(position=(0, -2.1, -22),     target=(0.4, -1.2, -31), fov=60),
    "MODEL":       dict(position=(1.2, 4.4, -26),    target=(0, 0.6, -19),   fov=54),
    "OBSERVATORY": dict(position=(0.5, 9.5, -8),     target=(0, 0.6, -21),   fov=50),
    "CITY":        dict(position=(1.5, 34, -12),     target=(0, 0, -17),     fov=62),
    "SETTLE":      dict(position=(0, 46, 14),        target=(0, 0, -10),     fov=58),
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
