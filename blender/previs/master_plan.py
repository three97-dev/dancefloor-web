"""
Master plan deliverable: top view, longitudinal section, cross section.

Required before further asset production. Their purpose is coherence — if the
plan does not read as one building, no amount of shading will make the acts feel
like the same place.

Rendered as orthographic clay so the architecture is judged on form alone.

    blender --background --python blender/previs/master_plan.py -- <out_dir>
"""

import os
import sys

import bpy
from mathutils import Euler

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.append(HERE)

import venue  # noqa: E402


def clean():
    bpy.ops.wm.read_homefile(use_empty=True, use_factory_startup=True)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.view_settings.view_transform = "Standard"
    scene.render.film_transparent = False


def flat_light():
    """Even, undramatic light: this is a drawing, not a photograph."""
    world = bpy.data.worlds.new("PLAN_WORLD")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.10, 0.11, 0.13, 1.0)
    bg.inputs["Strength"].default_value = 1.0
    bpy.context.scene.world = world

    for name, loc, rot, energy in (
        ("SUN_TOP", (0, 0, 300), (0, 0, 0), 4.5),
        ("SUN_SIDE", (200, -200, 120), (0.9, 0, 0.8), 3.2),
        ("SUN_BACK", (-180, 220, 100), (1.1, 0, -2.4), 1.8),
    ):
        data = bpy.data.lights.new(name, type="SUN")
        data.energy = energy
        obj = bpy.data.objects.new(name, data)
        obj.location = loc
        obj.rotation_euler = Euler(rot)
        bpy.context.scene.collection.objects.link(obj)


def ortho_camera(name, location, rotation, scale):
    data = bpy.data.cameras.new(name)
    data.type = "ORTHO"
    data.ortho_scale = scale
    data.clip_start = 0.1
    data.clip_end = 2000
    obj = bpy.data.objects.new(name, data)
    obj.location = location
    obj.rotation_euler = Euler(rotation)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def section_clip(camera, near):
    """A section is just a plan view with the near half clipped away."""
    camera.data.clip_start = near


def render(camera, path, resolution=(1800, 1200)):
    scene = bpy.context.scene
    scene.camera = camera
    scene.render.resolution_x, scene.render.resolution_y = resolution
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    out = argv[0] if argv else "/tmp/plan"
    os.makedirs(out, exist_ok=True)

    clean()
    flat_light()
    venue.build(greybox=True)

    span = 280

    # TOP VIEW — the entire venue plan.
    top = ortho_camera("PLAN_TOP", (0, 0, 400), (0, 0, 0), span)
    # Cut below the canopy so this reads as a floor plan rather than a roof.
    section_clip(top, 400 - (venue.LEVEL["district"] + 4))
    render(top, os.path.join(out, "01-top-view.png"), (1800, 1800))

    # LONGITUDINAL SECTION — levels above and below the Dancefloor.
    # Looking along +Y, clipped so the near half of the building is cut away.
    lon = ortho_camera("PLAN_LONGITUDINAL", (0, -400, venue.LEVEL["gallery"]),
                       (1.5708, 0, 0), span)
    section_clip(lon, 400)
    render(lon, os.path.join(out, "02-longitudinal-section.png"), (2000, 1100))

    # CROSS SECTION — central hall, galleries, infrastructure.
    cross = ortho_camera("PLAN_CROSS", (-400, 0, venue.LEVEL["gallery"]),
                         (1.5708, 0, -1.5708), span)
    section_clip(cross, 400)
    render(cross, os.path.join(out, "03-cross-section.png"), (2000, 1100))

    tris = sum(len(o.data.loop_triangles) for o in bpy.data.objects
               if o.type == "MESH" and o.data and o.data.calc_loop_triangles() is None)
    print(f"PLAN_DONE 3 drawings -> {out}  ({tris} tris)")


if __name__ == "__main__":
    main()
