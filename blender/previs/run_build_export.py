"""Build the previs scene, save it, and export cameras in one pass.

    blender --background --python blender/previs/run_build_export.py
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.append(HERE)

import bpy  # noqa: E402
import build_scene  # noqa: E402
import export_cameras  # noqa: E402
import json  # noqa: E402

build_scene.build("ACT_I_FIELD_AT_REST")
bpy.context.scene.view_settings.look = "AgX - High Contrast"

blend = os.path.join(ROOT, "blender", "dancefloor-previs.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend)

out = os.path.join(ROOT, "src", "experience", "camera", "previs.json")
data = export_cameras.export()
with open(out, "w") as fh:
    json.dump(data, fh, indent="\t")
    fh.write("\n")

total = sum(len(c["keyframes"]) for c in data["classes"].values())
print(f"PREVIS_EXPORT {total} keyframes -> {out}")
