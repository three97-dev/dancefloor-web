# Dancefloor.ai

A cinematic, scroll-driven 3D website for Dancefloor.ai, a Revenue Operating System.

**One world. One camera. One journey.** The homepage is a single continuous camera
move through one environment — thirteen content sections mapped onto seven acts,
with no hard cuts, no per-section backgrounds and no teleportation.

> Blender builds the world. WebGL runs the world. DOM explains the world. GSAP
> choreographs the journey.

## Stack

SvelteKit · TypeScript · Three.js (direct — **not** React Three Fiber) · GSAP ·
Lenis · Vite · Blender.

One persistent `WebGLRenderer` on a WebGL2 baseline stays mounted for the life of
the page. All meaningful copy lives in semantic DOM, server-rendered and readable
with JavaScript disabled; WebGL is supplementary.

## Getting started

Use **pnpm**. npm fails on this project's dependency ranges in some environments.

```bash
pnpm install
```

```bash
pnpm dev
```

Append `?debug=1` to any route for the scene inspector: experience progress,
active act, camera anchor, quality tier, FPS and the derived environment state.

## Layout

| Path | Holds |
| --- | --- |
| `src/content/` | Every headline, section and route. The single source for the argument. |
| `src/experience/` | The WebGL world: renderer, camera, scroll, systems, materials. |
| `src/experience/camera/` | Three separate compositions — desktop, tablet, mobile. |
| `src/components/` | Structural Svelte components. They hold no prose. |
| `blender/` | Scene authoring and camera previs. Blender is the composition source of truth. |

Scene code references section IDs only, so copy can be edited without touching
any 3D code.

## Responsiveness

Not a desktop site scaled down. Each class keeps the same content order, narrative
meaning, visual metaphor and seven acts, but gets its own camera composition and
scroll length: desktop travels *across* the field, tablet moves *through* it, and
mobile moves *deeper into* it using depth rather than width.

## Status

Phase 1 (greybox) is complete. Geometry is placeholder and materials are not final.
Body copy is deliberately pending — see `src/content/types.ts`.
