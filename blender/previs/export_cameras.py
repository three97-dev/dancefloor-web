"""
Exports the previs cameras to JSON for the runtime.

This is what makes Blender the composition source of truth rather than a
parallel copy: positions, targets and FOVs are read back off the actual camera
objects, so a camera nudged by hand in the viewport reaches the browser.

    blender --background dancefloor-previs.blend \\
        --python blender/previs/export_cameras.py -- src/experience/camera/previs.json
"""

import json
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
import anchors  # noqa: E402


def vertical_fov(cam_data):
    """Blender stores a focal length; the runtime wants a vertical FOV."""
    if cam_data.sensor_fit == "VERTICAL":
        sensor = cam_data.sensor_height
    else:
        sensor = cam_data.sensor_width
    return math.degrees(2 * math.atan((sensor / 2) / cam_data.lens))


def look_target(obj, distance=1.0):
    """Where the camera is aimed, in world space, from its own -Z axis."""
    forward = obj.matrix_world.to_quaternion() @ Vector((0.0, 0.0, -1.0))
    return obj.matrix_world.translation + forward * distance


def export():
    out = {"generated_by": "blender/previs/export_cameras.py", "classes": {}}

    for class_name, (letter, table, aspect) in anchors.CLASSES.items():
        keyframes = []
        for key in anchors.ORDER:
            name = f"CAM_{letter}_{key}"
            obj = bpy.data.objects.get(name)
            if obj is None:
                raise SystemExit(f"missing camera {name} — run build_scene first")

            # Preserve the authored camera-to-target distance so hand edits to
            # either the camera or its aim survive the round trip.
            seed = table[key]
            seed_pos = Vector(anchors.three_to_blender(seed["position"]))
            seed_tgt = Vector(anchors.three_to_blender(seed["target"]))
            distance = max(0.001, (seed_tgt - seed_pos).length)

            position = anchors.blender_to_three(tuple(obj.matrix_world.translation))
            target = anchors.blender_to_three(tuple(look_target(obj, distance)))
            progress, section = anchors.TIMING[key]

            keyframes.append({
                "anchor": name,
                "act": anchors.ACTS[key],
                "section": section,
                "at": round(progress, 6),
                "position": [round(v, 4) for v in position],
                "target": [round(v, 4) for v in target],
                "fov": round(vertical_fov(obj.data), 3),
            })

        out["classes"][class_name.lower()] = {
            "master": f"CAM_MASTER_{class_name}",
            "aspect": round(aspect[0] / aspect[1], 4),
            "keyframes": keyframes,
        }

    return out


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    path = argv[0] if argv else "previs.json"
    data = export()
    with open(path, "w") as fh:
        json.dump(data, fh, indent="\t")
        fh.write("\n")
    total = sum(len(c["keyframes"]) for c in data["classes"].values())
    print(f"PREVIS_EXPORT {total} keyframes -> {path}")
