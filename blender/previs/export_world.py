"""
Exports the world to GLB for the runtime.

Blender builds the world; WebGL runs it. Until this existed the world only lived
in previs, so the browser rendered a Dancefloor floating in atmosphere while the
architecture sat in a .blend file nobody shipped.

Split by load priority rather than exported as one monolith: the first
meaningful frame must appear quickly, so hero architecture arrives before the
far environment.

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

# Priority groups, mirroring the brief's loading order. Objects are named by the
# functions in world_shell.py and landmarks.py.
GROUPS = {
    # Arrives first: the architecture the hero composition is framed against.
    "core": [
        "FLOOR_SECONDARY",
        "WALL_MASSES",
        "STRUCTURAL_COLUMNS",
        "MID_TERRACES",
    ],
    # The upper world and the structures that light it.
    "upper": [
        "CEILING_ARCHITECTURE",
        "TRANSLUCENT_MASSES",
        "ENVIRONMENT_LIGHT_STRUCTURES",
        "OPENINGS",
        "SHAFTS",
    ],
    # Recurring geography — needed before the camera travels, not before it starts.
    "landmarks": [
        "LANDMARK_SPINE",
        "LANDMARK_BRIDGE",
        "LANDMARK_BRIDGE_SPAN",
        "LANDMARK_BEACON",
        "LANDMARK_GLASS_WALL",
        "LANDMARK_OBSERVATORY",
        "BRIDGES",
    ],
    # Silhouette and scale only. Last, and the first thing mobile may skip.
    "far": [
        "BACKGROUND_TOWERS",
        "DISTANT_PLATFORMS",
        "FAR_GEOMETRY",
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
        # Draco is in the required stack and these are box-heavy meshes that
        # compress well. The runtime carries the matching decoder.
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
    size = os.path.getsize(path)
    tris = sum(len(o.data.loop_triangles) for o in objects if o.type == "MESH" and o.data)
    return {"file": os.path.basename(path), "bytes": size, "objects": len(objects), "triangles": tris}


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    build_scene.build("ACT_I_FIELD_AT_REST")

    # Triangle counts need evaluated meshes.
    for obj in bpy.data.objects:
        if obj.type == "MESH" and obj.data:
            obj.data.calc_loop_triangles()

    results = {}
    for name, members in GROUPS.items():
        info = export_group(name, members)
        if info:
            results[name] = info
            print(f"  {name:10} {info['bytes'] / 1024:8.1f} KB  "
                  f"{info['objects']:3d} objects  {info['triangles']:6d} tris")

    total = sum(r["bytes"] for r in results.values())
    print(f"WORLD_EXPORT {len(results)} groups, {total / 1024:.1f} KB total -> {OUT_DIR}")


if __name__ == "__main__":
    main()
