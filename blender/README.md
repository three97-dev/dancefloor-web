# Blender previs

**Blender is the composition source of truth.** Camera positions, targets and
focal lengths are authored here and exported to the runtime — they are not
hand-tuned in TypeScript.

> Blender builds the world. WebGL runs the world. DOM explains the world.
> GSAP choreographs the journey.

## Files

| File | Purpose |
| --- | --- |
| `dancefloor-previs.blend` | The saved previs scene. Regenerable, but commit hand edits. |
| `previs/anchors.py` | Camera anchor table and the Three.js ↔ Blender coordinate conversion. |
| `previs/build_scene.py` | Builds the environment: tile module, field, underfloor, towers, cameras, lighting. |
| `previs/validate.py` | Renders every act against every viewport class. |
| `previs/export_cameras.py` | Reads the camera objects back out to `src/experience/camera/previs.json`. |
| `previs/run_build_export.py` | Build + save + export, in one pass. |
| `previs/run_validate.py` | CLI entry for the validation renders. |

## Workflow

Rebuild the scene and export cameras to the runtime:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python blender/previs/run_build_export.py
```

Render every act against every viewport class:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background --python blender/previs/run_validate.py -- /tmp/previs
```

To adjust a composition, move the camera in Blender, save, then re-export. Never
hand-edit `previs.json` — the next export overwrites it.

## Cameras

Three master cameras, each with ten anchors:

`CAM_MASTER_DESKTOP` · `CAM_MASTER_TABLET` · `CAM_MASTER_MOBILE`

Anchors are `CAM_{D,T,M}_{HERO, HERO_PULL, FRACTURE, ROAD, GUIDANCE, CAPTURE,
MODEL, OBSERVATORY, CITY, SETTLE}`.

Each carries custom properties the exporter reads: `df_progress`, `df_section`,
`df_act`, `df_class`, `df_aspect`.

Anchor timing is **not** a free parameter. The thirteen sections divide the
scroll evenly, so section *i* spans `[(i-1)/13, i/13]` and an anchor sits at the
centre of the section its act depicts.

## Coordinates

Anchors are authored in **Three.js space** (Y-up), since that is what the
runtime consumes:

```
three (x, y, z)   ->  blender (x, -z, y)
blender (x, y, z) ->  three (x, z, -y)
```

## Act states

The field is rebuilt per act using the same maths as `DancefloorSystem.ts` and
`ExperienceTimeline.ts`, ported to Python. A camera framed here frames what the
browser will actually draw. If the runtime maths changes, change
`build_scene.field_transform` and `build_scene.tile_emission` to match, or the
previs quietly stops being predictive.

## Notes

- The tile frame is four walls around an open well, not a solid block. The
  cavity has to be genuinely open for the infinity-mirror depth to read.
- The field stand-in is greybox. Final materials are Phase 6.
- `importlib.reload` does not remove deleted names, so a function can go missing
  from the file and still appear to work in a live session. Verify changes with a
  fresh `--background` run before trusting them.
