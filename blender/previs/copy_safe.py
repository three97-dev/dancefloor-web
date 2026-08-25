"""
Copy-safe anchors.

The forbidden workflow is: build a beautiful composition, export it, then hunt
for somewhere to put the text. Negative space has to be authored, which means
the architecture and the camera accommodate the content rather than the content
squeezing into whatever gap survived.

Each anchor is an empty placed in the world at the point a copy block should
occupy, sized to the block. The exporter turns them into normalized screen-space
rectangles per camera, so the runtime can assert that copy never lands on busy
geometry — and the debug overlay can draw them.
"""

import bpy

from anchors import CLASSES, MOBILE, ORDER, TABLET, DESKTOP, three_to_blender

# Which anchors carry copy, and how the block sits relative to the camera target.
# Offsets are in camera-relative terms: (right, up, forward) in world units,
# applied from the camera toward its target.
COPY_BLOCKS = {
    # Hero copy sits left of the tile, over the wall mass, well clear of the module.
    "HERO":        {"DESKTOP": (-3.4, 1.5, 2.0), "TABLET": (-2.4, 1.4, 1.6), "MOBILE": (0.0, 1.5, 1.2)},
    # Thesis deliberately moves to the opposite corner: the journey has begun.
    "HERO_PULL":   {"DESKTOP": (7.0, -3.0, 6.0), "TABLET": (4.5, -2.5, 5.0), "MOBILE": (0.0, 3.2, 4.0)},
    "FRACTURE":    {"DESKTOP": (12.0, 6.0, 10.0), "TABLET": (8.0, 5.0, 8.0), "MOBILE": (0.0, 7.0, 6.0)},
    "ROAD":        {"DESKTOP": (-14.0, 7.0, 12.0), "TABLET": (-9.0, 6.0, 9.0), "MOBILE": (0.0, 6.5, 7.0)},
    "GUIDANCE":    {"DESKTOP": (9.0, 5.0, 11.0), "TABLET": (6.0, 4.5, 9.0), "MOBILE": (0.0, 6.0, 7.0)},
    # Capture is the no-copy moment: nothing is registered for it deliberately.
    "MODEL":       {"DESKTOP": (0.0, 4.0, 14.0), "TABLET": (0.0, 3.5, 11.0), "MOBILE": (0.0, 5.0, 8.0)},
    "OBSERVATORY": {"DESKTOP": (6.0, 2.0, 10.0), "TABLET": (4.0, 2.0, 8.0), "MOBILE": (0.0, 4.0, 6.0)},
    "CITY":        {"DESKTOP": (0.0, 10.0, 26.0), "TABLET": (0.0, 8.0, 20.0), "MOBILE": (0.0, 9.0, 16.0)},
}

# Block size in world units at that depth, roughly the copy column.
BLOCK_SIZE = {"DESKTOP": (10.0, 5.0), "TABLET": (8.0, 5.0), "MOBILE": (5.5, 6.0)}


def build(parent_collection=None):
    """Creates WEB_COPY_<ANCHOR>_<CLASS> empties for every copy-bearing anchor."""
    col = bpy.data.collections.new("WEB_ANCHORS")
    (parent_collection or bpy.context.scene.collection).children.link(col)

    made = {}
    tables = {"DESKTOP": DESKTOP, "TABLET": TABLET, "MOBILE": MOBILE}

    for anchor in ORDER:
        offsets = COPY_BLOCKS.get(anchor)
        if not offsets:
            continue

        for class_name, (_letter, _table, _aspect) in CLASSES.items():
            spec = tables[class_name][anchor]
            offset = offsets[class_name]

            eye = _v(three_to_blender(spec["position"]))
            look = _v(three_to_blender(spec["target"]))

            forward = _norm(_sub(look, eye))
            # World up is +Z in Blender; right is forward x up.
            right = _norm(_cross(forward, (0.0, 0.0, 1.0)))
            up = _cross(right, forward)

            point = tuple(
                eye[i] + forward[i] * offset[2] + right[i] * offset[0] + up[i] * offset[1]
                for i in range(3)
            )

            name = f"WEB_COPY_{anchor}_{class_name}"
            empty = bpy.data.objects.new(name, None)
            empty.empty_display_type = "CUBE"
            width, height = BLOCK_SIZE[class_name]
            empty.empty_display_size = 1.0
            empty.scale = (width / 2, 0.1, height / 2)
            empty.location = point
            empty["df_anchor"] = anchor
            empty["df_class"] = class_name
            empty["df_block"] = f"{width}x{height}"
            col.objects.link(empty)
            made[name] = empty

    return made


def _v(t):
    return (float(t[0]), float(t[1]), float(t[2]))


def _sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def _cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def _norm(v):
    length = (v[0] ** 2 + v[1] ** 2 + v[2] ** 2) ** 0.5 or 1.0
    return (v[0] / length, v[1] / length, v[2] / length)
