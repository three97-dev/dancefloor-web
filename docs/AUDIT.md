# Phase 1 — Audit

Against *Dancefloor.ai Master Website Execution Prompt* (71pp, 2026-08-24).

The previous build was made against the earlier 39-page brief. The updated brief
was clearly written after seeing it: §8 names **"Dancefloor + black WebGL void"**
as *"the major environmental correction required in the current implementation."*
That is an accurate description of what shipped.

This audit covers what §97 Phase 1 asks for: what exists, what works, what to
retain, what conflicts, where the black voids are, performance bottlenecks, and
missing responsive states.

---

## 1. What exists

Deployed at `three97-dev.github.io/dancefloor-web`, ~3,500 lines across 54 files.

| Area | State |
| --- | --- |
| SvelteKit + TS, 16 routes, all prerendered | Working |
| One persistent `WebGLRenderer`, WebGL2 baseline | Working |
| `DancefloorSystem` — 2,304 instanced tiles, per-tile emissive/elevation | Working |
| `SignalSystem` — signals routing surface → underfloor → back up | Working |
| `AmbientSystem` — elapsed-time pulses, independent of scroll | Working, but thin |
| `LightingSystem`, `EnvironmentSystem`, `PostProcessingSystem` | Working |
| `PerformanceManager` — HIGH/MEDIUM/LOW + degradation ladder | Working |
| Camera previs authored in Blender, exported to `previs.json` | Working |
| 30 camera anchors × 3 viewport classes | Working |
| No-WebGL fallback from Blender stills | Working |
| `?debug=1` overlay | Working, needs expansion |
| Content layer, 13 sections, verbatim headlines | Working, body copy pending |

Measured: 60–75 FPS desktop, 60 FPS mobile emulation, 0 typecheck errors.

---

## 2. What works and should be retained

These survive the new brief unchanged and should **not** be rebuilt:

- **The whole DOM/content layer.** §77 and §90 want exactly what exists: copy in
  `content/*.ts`, structural components holding no prose, scene code referencing
  section IDs only.
- **Blender as composition source of truth.** §66 asks for viewport-specific
  camera choreography authored in Blender. The `previs.json` export already does
  this, and does it better than the `CameraDesktop/Tablet/Mobile.ts` files §90
  sketches — §90 itself says adapt rather than refactor to match its tree.
- **Ambient/narrative time separation.** §78 describes precisely the split that
  is implemented.
- **Quality tiers and the degradation ladder.** §72–73 match, with one ordering
  correction noted below.
- **The tile module construction.** §7's materials list matches what is modelled;
  the hollow infinity cavity is right.
- **Fallback, accessibility, reduced motion, prerendering, CTA hierarchy.**

---

## 3. What conflicts with the new brief

Ordered by how much work each implies.

### 3.1 The world does not exist — §8, §9, §10, §11, §98, §100

**This is the whole audit in one line.** The build is a Dancefloor field floating
in nothing. The brief requires a monumental architectural environment:

```
MONUMENTAL LIVING ARCHITECTURAL WORLD
  → REVENUE SYSTEM CITY
    → DANCEFLOOR FABRIC
      → UNDERFLOOR INFRASTRUCTURE
        → DISTANT SYSTEMS
          → SIGNALS + ARCHITECTURAL ACTIVITY
```

150–300 m across, 50–100 m vertical, whose boundaries the visitor rarely
perceives. `WORLD_SHELL` with floor, wall masses, structural columns, ceiling
architecture, distant platforms, background towers, bridges, openings, shafts,
far geometry. **None of this exists.** The Dancefloor is currently the entire
environment; the brief says it must be *one manifestation* of a larger system.

### 3.2 Greybox was done against black — §92

The brief is explicit: **do not use black as the background during greybox.**
Black hides missing geometry; grey exposes empty horizons, missing walls, world
edges and insufficient depth. Every previs render was made against near-black
with bloom enabled — the exact conditions the brief says will conceal an
under-designed world. That is why the void was not obvious sooner.

### 3.3 Compositions fail the layering and void tests — §12, §93, §94

§12 requires foreground, midground and background in every important
composition. §94 targets **essentially zero accidental void**. The current Act I
and Act VII renders are a lit object against darkness with no foreground element
and no background architecture — precisely what §12 says to avoid.

### 3.4 Scroll rhythm is wrong — §28

The implementation divides the timeline into thirteen equal 7.69% slices. The
brief specifies a deliberately uneven allocation:

| Beat | Brief | Current | Δ |
| --- | --- | --- | --- |
| Hero / Field at rest | 0–12% | 0–7.7% | short |
| Thesis | 12–18% | 7.7–15.4% | shifted |
| Problem / Fracture | 18–30% | 15.4–23.1% | **short by 4.3pt** |
| ROAD / Patch | 30–42% | 23.1–30.8% | **short by 4.3pt** |
| Guidance / Rise | 42–53% | 30.8–38.5% | short |
| Capture / Return path | 53–63% | 38.5–46.2% | short |
| Model / One plane | 63–73% | 46.2–53.8% | short |
| Audience → FAQ | 73–94% | 53.8–92.3% | **too long** |
| City / Final CTA | 94–100% | 92.3–100% | close |

The cinematic acts are all compressed and the commercial sections are given
nearly twice the room they should have. This also invalidates the camera anchor
`at` values, which were derived from the equal-thirteenths model.

### 3.5 Missing runtime systems — §14, §15, §16

- **`LivingEnvironmentSystem.ts` does not exist.** §14 requires a dedicated
  system for distant activity, background signals, environmental illumination,
  architectural movement, remote responses and secondary system behaviour.
  `AmbientSystem` only pulses tiles.
- **No ambient event families.** §15 wants 8–12 named, reusable families
  (`DISTANT_PULSE`, `SIGNAL_CROSSING`, `TOWER_SHIFT`, `SHAFT_ACTIVITY`,
  `LIGHT_WAKE`, `SYSTEM_SETTLE`, `REFLECTION_PASS`, `REMOTE_RESPONSE`,
  `DISTANT_ROUTING`, `GRID_BREATH`) with randomised timing and recent-event
  memory. Current ambience is a per-tile sine, which is a loop by another name.
- **No off-camera causality.** §16 requires events that begin outside the frame
  and propagate inward.

### 3.6 No recurring landmarks — §13

`THE SPINE`, `THE BRIDGE`, `THE BEACON`, `THE GLASS WALL`, `THE OBSERVATORY`.
These are what create geography and the sense of having actually travelled. None
exist. The Observatory is currently only a camera anchor pointing at empty space,
though §46 and §51 make it a physical location where five content sections live.

### 3.7 Content layout does not vary — §31, §32, §55, §59

Every section renders identically: left-aligned, same width, same vertical
position. §59 gives an explicit per-section rhythm (copy left / right / central /
split / editorial) and says **do not repeat one layout for every section**. §32
wants Thesis to appear in a different part of the frame from Hero to establish
that the journey has begun. §31 wants an asymmetric hero at 40–55% viewport width.

### 3.8 No product surfaces, no proof sequence — §37, §38, §40, §81

§81 requires `CLAIM → EXPERIENCE → PRODUCT → OUTCOME` and §37 a two-phase ROAD
(experience, then product proof). There are no product surfaces in the build at
all — `road-coverage`, `guidance-surface`, `signal-routing`, `model-ontology`
exist only as identifiers in the content model.

### 3.9 Missing scene metadata — §76

Layout constants live in component CSS. §76 wants centralised per-section
metadata: camera per viewport class, content alignment and width per class,
product-surface placement. Needed before §59's layout variety can be data-driven
rather than hand-written per section.

### 3.10 Missing copy-safe authoring — §58

§58 forbids building a composition and then hunting for somewhere to put text.
Blender needs `WEB_COPY_*` empties per section and viewport class, authored as
intentional negative space. The previs has none, which is why mobile framing
happened to work rather than being designed.

### 3.11 Smaller conflicts

| § | Requirement | Current |
| --- | --- | --- |
| 19 | No pure black; maintain object/environment/shadow separation | `scene.background = null`, fog `#05070a` |
| 24 | Camera should feel physically operated | Pure spline evaluation, no inertia or settle |
| 25 | Idle camera drift 0.02–0.06° when scrolling stops | None — composition freezes into a screenshot |
| 22 | Several parallax rates per move | Pointer parallax only |
| 34 | Fracture copy reveals line by line | Whole block fades at once |
| 35 | Three questions as environmental labels | Absent |
| 43 | Deliberate no-copy interval underfloor | Absent |
| 51 | FAQ moves to natural document scrolling | Stays pinned |
| 53 | Nine modules resolve into the 3×3 mark | Absent |
| 73 | Degrade order: particles → DPR → bloom → shadows → atmosphere → distant activity | Tier-based, not staged in this order |
| 88 | LOD0/1/2 | Single LOD |
| 91 | `?debug=1&world=1` world inspector | Not implemented |
| 95 | 11 named QA viewports | Tested 3 |

---

## 4. Where the black voids occur

Concretely, in code:

| Location | Cause |
| --- | --- |
| `LightingSystem.ts:43` | `scene.background = null` → clears to literal black |
| `LightingSystem.ts:41` | `Fog('#05070a', …)` — near-black, so distance fades to nothing rather than to atmosphere |
| Act I, all classes | Nothing above the horizon line; no ceiling, no far architecture |
| Act VII, desktop | The grid's own edge is visible against void, with unfilled frame to the right |
| Everywhere above the floor plane | No world shell, so the upper half of most frames is empty |
| `app.css` `--ink-900: #05070a` | DOM background matches, so the void extends into the page itself |

The fallback stills inherit all of this, since they were rendered from the same
scene.

---

## 5. Performance bottlenecks

Not currently a problem — 60–75 FPS — but the world does not exist yet, and
adding it is what will cost.

- **Per-frame CPU tile loop.** `DancefloorSystem.update()` walks all 2,304 tiles
  every frame in JS, writing two instanced attributes and a matrix each. This is
  the single hottest path and will not scale to a full architectural world.
  Should move to GPU via instanced attributes updated on state change, or a
  vertex shader driven by uniforms.
- **`EnvironmentSystem` recomputes deterministic scatter every frame** using
  `sin()` hashes that never change. Should be computed once.
- **No frustum culling** — `frustumCulled = false` on the field and signals.
  Acceptable for one field; not for a 300 m world.
- **No LOD, no instancing beyond the tile field, no texture compression.**
  KTX2/Basis and Draco/Meshopt are in the required stack but unused, because
  there are no authored assets yet.
- **Bloom at 0.5 resolution scale on HIGH** will need re-checking once emissive
  architecture exists.

---

## 6. Missing responsive states

- Only 3 of §95's 11 QA viewports were tested (1440×900, 823×771, 375×812).
  Untested: 3440×1440, 2560×1440, 1920×1080, 1366×768, 1024×768, 834×1194,
  768×1024, 430×932, 390×844, 375×667.
- **Ultrawide is unhandled.** §95: ultrawide should receive *more world*, not
  more FOV. With no world, ultrawide currently receives more void.
- **Landscape mobile** has no distinct treatment.
- **Tablet portrait vs landscape** are not distinguished.
- Scroll lengths (1000/800/650vh) are within §70's targets and can stay.

---

## 7. Recommended order

Following §97, adapted to what already exists:

1. **Greybox the world in grey** — `WORLD_SHELL`, landmarks, physical geography,
   neutral background, clay materials, no bloom or fog. This is the correction
   everything else depends on.
2. **Re-author camera previs** against the real world, with `WEB_COPY_*` anchors.
3. **Fix the scroll rhythm** to §28 and re-time the camera anchors.
4. **Build `LivingEnvironmentSystem`** with the ambient event families.
5. **Scene metadata + content layout variety.**
6. Then materials, product surfaces, commercial content, City and footer.

Items 3 and 5 are pure code and independent of the world, so they can land first
and cheaply. Item 1 is the long pole.

---

## 8. What this does not change

The deployment, the content architecture, the route structure, the conversion
model, the accessibility work and the Blender→runtime camera pipeline are all
sound and stay. The correction is environmental, not architectural: the code that
runs the world is largely right, but **the world it runs is missing.**

---

## 9. Addendum — findings from the first grey greybox pass

Added after building `WORLD_SHELL` and rendering the §93 completion test in grey.
§92 earned its keep immediately: both of these were invisible against black.

### 9.1 The camera anchors collide with the world

The anchors were authored in Phase 2 against an empty void, before any
architecture existed. Now that the shell is in, several are inside or behind
geometry — the desktop `CITY` anchor sits at 46 m with the ceiling slab at 66 m,
so the City reveal frames the underside of the ceiling instead of the system
below.

This is an ordering mistake on my part, not a modelling one. §97 puts **Phase 2
greybox world before Phase 3 camera previs** precisely so the cameras can be
authored against something. They were built in the reverse order and must now be
re-authored. The Blender → `previs.json` pipeline makes that a re-author rather
than a rewrite.

### 9.2 Scale relationship is wrong

The Dancefloor fabric is ~48 m across inside a ~200 m hall, so the hall reads as
a room the field sits in rather than a monumental environment the field is one
district of. §36 wants *hundreds* of modules extending into the environment.
Either the fabric grows substantially or the hall tightens and gains depth
layers between the field edge and the wall masses — currently the eye jumps
straight from tiles to a flat grey wall with no midground.

### 9.3 The ceiling caps the City ascent

Act VII rises through the architecture, but the hall is closed at 66 m. The
ascent needs either a much taller volume or — better, and more in keeping with
§10's long openings and shafts — to exit *through* an opening, so the City
reveal is a change of vantage rather than a ceiling collision.

### 9.4 Draw-call instrumentation was lying

The debug overlay reported 22,202 draw calls and 62.6 M triangles at 75 FPS,
which is not physically consistent. Cause: `renderer.info.autoReset` is off, and
the explicit reset lived in `Renderer.render()` — a path that is skipped
whenever post-processing is enabled, which is always. Counters accumulated
across every frame since load.

Actual figures after the fix: **20 draw calls, 58 k triangles**. Instancing is
working correctly. Worth recording because the bad number would have justified a
pointless optimisation pass on a scene that does not need one.
