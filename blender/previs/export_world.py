"""
Exports the venue to GLB for the runtime.

Split by load priority so the first meaningful frame arrives quickly: the spaces
the visitor is standing in first, then the rooms they travel to, then the
distant extensions that only supply scale.

    blender --background --python blender/previs/export_world.py
"""

import os
import sys

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.append(HERE)

import build_scene  # noqa: E402

OUT_DIR = os.path.join(ROOT, "static", "world")

GROUPS = {
    # Where the visitor arrives and what they first see.
    "core": [
        "VENUE_STRUCTURE",
        "VENUE_ARRIVAL",
        "VENUE_CENTRAL_HALL",
    ],
    # The ceiling is a hero element, so it lands with the room it belongs to.
    "upper": [
        "VENUE_CANOPY",
        "VENUE_CANOPY_LIGHT",
        "VENUE_FACADE",
    ],
    # The districts the camera travels to.
    "districts": [
        "VENUE_ROAD",
        "VENUE_GUIDANCE",
        "VENUE_ATRIUM",
        "VENUE_OBSERVATORY",
    ],
    # Back-of-house, only visible during the return path.
    "underfloor": [
        "VENUE_UNDERFLOOR",
        "VENUE_UNDERFLOOR_LIGHT",
    ],
    # Silhouette and scale only; the first thing a low-tier device may skip.
    "far": [
        "VENUE_CITY",
    ],
}


def export_group(name, object_names):
    objects = [bpy.data.objects[n] for n in object_names if n in bpy.data.objects]
    missing = [n for n in object_names if n not in bpy.data.objects]
    if missing:
        print(f"  ! missing from {name}: {', '.join(missing)}")
    if not objects:
        return None

    for obj in bpy.data.objects:
        obj.select_set(False)
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]

    path = os.path.join(OUT_DIR, f"world-{name}.glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_normals=True,
        export_texcoords=False,
        export_materials="EXPORT",
    )
    tris = sum(len(o.data.loop_triangles) for o in objects if o.type == "MESH" and o.data)
    return {"bytes": os.path.getsize(path), "objects": len(objects), "triangles": tris}


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    build_scene.build("ACT_I_FIELD_AT_REST")

    for obj in bpy.data.objects:
        if obj.type == "MESH" and obj.data:
            obj.data.calc_loop_triangles()

    total = 0
    for name, members in GROUPS.items():
        info = export_group(name, members)
        if info:
            total += info["bytes"]
            print(f"  {name:11} {info['bytes'] / 1024:8.1f} KB  "
                  f"{info['objects']:2d} objects  {info['triangles']:7d} tris")

    print(f"WORLD_EXPORT {total / 1024:.1f} KB total -> {OUT_DIR}")


if __name__ == "__main__":
    main()
