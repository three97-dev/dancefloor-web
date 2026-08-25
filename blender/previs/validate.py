"""
Renders every act against every viewport class.

This is the Phase 2 gate: one connected environment, all seven acts validated,
all three major viewport compositions validated. Each act is rendered against
its own field state, so what is framed here is what the browser will show.
"""

import importlib
import os
import sys

import bpy

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import anchors  # noqa: E402
import build_scene  # noqa: E402

importlib.reload(anchors)
importlib.reload(build_scene)

# The anchor that best represents each act.
ACT_ANCHOR = {
    "ACT_I_FIELD_AT_REST": "HERO_PULL",
    "ACT_II_FRACTURE": "FRACTURE",
    "ACT_III_THE_PATCH": "ROAD",
    "ACT_IV_THE_RISE": "GUIDANCE",
    "ACT_V_RETURN_PATH": "CAPTURE",
    "ACT_VI_ONE_PLANE": "MODEL",
    "ACT_VII_THE_CITY": "CITY",
}

# Real device aspects, not arbitrary crops.
RESOLUTION = {"DESKTOP": (1280, 720), "TABLET": (1024, 768), "MOBILE": (540, 1170)}


def rebuild_act(act):
    """Swap only the act-dependent geometry; the environment persists."""
    world = bpy.data.collections["WORLD"]
    for name in ("FIELD", "FIELD_LED"):
        if name in bpy.data.objects:
            bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)
    for obj in [o for o in bpy.data.objects if o.name.startswith("TOWER_")]:
        bpy.data.objects.remove(obj, do_unlink=True)

    mats = {
        "steel": bpy.data.materials["DF_BlackenedSteel"],
        "matte": bpy.data.materials["DF_MatteComposite"],
        "led": bpy.data.materials["DF_EmissiveResin"],
    }
    build_scene.build_field(act, mats, world)
    build_scene.build_emissive_layer(act, mats, world)
    build_scene.build_towers(act, mats, world)
    build_scene.place_hero_tile(bpy.data.objects["TILE_MODULE"], act)


def run(out_dir, extra_anchors=()):
    build_scene.build("ACT_I_FIELD_AT_REST")
    scene = bpy.context.scene
    scene.view_settings.look = "AgX - High Contrast"
    os.makedirs(out_dir, exist_ok=True)

    written = []
    for act, anchor in ACT_ANCHOR.items():
        rebuild_act(act)
        for cls, (letter, _table, _aspect) in anchors.CLASSES.items():
            for key in (anchor, *[a for a in extra_anchors if anchors.ACTS[a] == act]):
                scene.camera = bpy.data.objects[f"CAM_{letter}_{key}"]
                scene.render.resolution_x, scene.render.resolution_y = RESOLUTION[cls]
                path = os.path.join(out_dir, f"{act}__{cls}__{key}.png")
                scene.render.filepath = path
                bpy.ops.render.render(write_still=True)
                written.append(os.path.basename(path))
    return written
