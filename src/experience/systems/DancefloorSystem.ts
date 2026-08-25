/**
 * The Dancefloor itself: one instanced field of modular tiles.
 *
 * Every tile has a stable ID (tile_r05_c12) and runtime-controllable elevation,
 * emissive intensity, emissive color, opacity, internal LED activity and
 * visibility. Instancing keeps the whole field to a single draw call.
 *
 * Phase 1 uses greybox box geometry. The Blender tile module replaces the
 * geometry only — the attribute contract below does not change.
 */

import {
	BoxGeometry,
	Color,
	DynamicDrawUsage,
	InstancedBufferAttribute,
	InstancedMesh,
	Matrix4,
	MeshStandardMaterial,
	Object3D,
	type Scene
} from 'three';
import { GRID, PATCHES, coverageElevation, tileId } from '$content/scene-data';
import type { QualitySettings } from '../quality';
import type { ExperienceState } from '../scroll/ExperienceTimeline';

/**
 * Tile colour comes from the act's colour territory rather than a fixed palette.
 *
 * The districts are chromatically isolated during Fracture and share surfaces by
 * One Plane, so the tiles themselves carry the argument: colour communicates
 * fragmentation resolving into coordination.
 */
const REGION_MIX = [0.0, 0.35, 0.7, 0.15, 1.0, 0.5];

export interface TileState {
	elevation: number;
	emissive: number;
	activity: number;
	opacity: number;
}

export class DancefloorSystem {
	readonly mesh: InstancedMesh;
	readonly rows: number;
	readonly cols: number;
	readonly count: number;

	#dummy = new Object3D();
	#matrix = new Matrix4();

	/** Per-instance: x = emissive intensity, y = LED activity, z = opacity. */
	#attr: InstancedBufferAttribute;
	#colorAttr: InstancedBufferAttribute;

	/** Baseline coverage elevation per tile, from real scene data. */
	#coverage: Float32Array;
	/** Which system region a tile belongs to, for Act II fracture. */
	#region: Uint8Array;
	/** Deterministic per-tile phase offset, so ambient never looks looped. */
	#phase: Float32Array;

	constructor(scene: Scene, quality: QualitySettings) {
		this.rows = quality.grid.rows;
		this.cols = quality.grid.cols;
		this.count = this.rows * this.cols;

		const geometry = new BoxGeometry(GRID.tileSize, 0.12, GRID.tileSize);
		const material = new MeshStandardMaterial({
			// Medium-value gunmetal, not near-black: the frame has to receive and
			// show environmental colour, otherwise the scene resolves as
			// black-plus-neon however good the lighting is.
			color: '#333b47',
			roughness: 0.38,
			metalness: 0.55,
			transparent: true
		});

		patchTileShader(material);

		this.mesh = new InstancedMesh(geometry, material, this.count);
		this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
		this.mesh.castShadow = quality.shadows;
		this.mesh.receiveShadow = quality.shadows;
		this.mesh.frustumCulled = false;
		this.mesh.name = 'DANCEFLOOR_FIELD';

		this.#attr = new InstancedBufferAttribute(new Float32Array(this.count * 3), 3);
		this.#attr.setUsage(DynamicDrawUsage);
		this.#colorAttr = new InstancedBufferAttribute(new Float32Array(this.count * 3), 3);
		this.#colorAttr.setUsage(DynamicDrawUsage);
		geometry.setAttribute('aTile', this.#attr);
		geometry.setAttribute('aTileColor', this.#colorAttr);

		this.#coverage = new Float32Array(this.count);
		this.#region = new Uint8Array(this.count);
		this.#phase = new Float32Array(this.count);
		this.#seed();

		scene.add(this.mesh);
	}

	/** Stable ID for a tile, matching the authored naming scheme. */
	idAt(row: number, col: number) {
		return tileId(row, col);
	}

	indexAt(row: number, col: number) {
		return row * this.cols + col;
	}

	/**
	 * Seeds coverage, region and phase.
	 *
	 * Coverage comes from the patch data, so tile height in Act III means real
	 * book coverage. Region assignment groups tiles into the system silos that
	 * Act II pulls apart.
	 */
	#seed() {
		const patches = PATCHES;
		for (let r = 0; r < this.rows; r++) {
			for (let c = 0; c < this.cols; c++) {
				const i = this.indexAt(r, c);
				// Patches tile across the field in blocks, so a rep's book reads as
				// a contiguous area of terrain rather than scattered noise.
				const blockR = Math.floor(r / Math.max(1, Math.floor(this.rows / 4)));
				const blockC = Math.floor(c / Math.max(1, Math.floor(this.cols / 3)));
				const patch = patches[(blockR * 3 + blockC) % patches.length];
				this.#coverage[i] = coverageElevation(patch);
				this.#region[i] = (blockR * 3 + blockC) % 6;
				// Deterministic hash, so the field looks identical on every load.
				this.#phase[i] = fract(Math.sin(r * 127.1 + c * 311.7) * 43758.5453);
			}
		}
	}

	/**
	 * Writes one frame of tile state.
	 *
	 * Ambient activity is added by AmbientSystem via `ambientAt`, which is
	 * elapsed-time driven and therefore keeps running when scroll stops.
	 */
	update(state: ExperienceState, ambientAt: (index: number, phase: number) => number) {
		const half = { r: (this.rows - 1) / 2, c: (this.cols - 1) / 2 };
		const seam = GRID.seam * (1 + state.fracture * 5);
		const step = GRID.tileSize + seam;

		const attr = this.#attr.array as Float32Array;
		const colors = this.#colorAttr.array as Float32Array;
		const color = new Color();

		for (let r = 0; r < this.rows; r++) {
			for (let c = 0; c < this.cols; c++) {
				const i = this.indexAt(r, c);
				const phase = this.#phase[i];
				const region = this.#region[i];

				// Act II drags whole regions apart along their own axis.
				const drift = state.fracture * (region % 2 === 0 ? 1 : -1) * (1.5 + region * 0.4);
				const x = (c - half.c) * step + drift * (region < 3 ? 1 : 0);
				const z = (r - half.r) * step + drift * (region >= 3 ? 1 : 0);

				// Act III: elevation carries meaning — it is real coverage, not decoration.
				const terrain = (this.#coverage[i] - 0.5) * 4 * state.terrain;
				// Act IV: the winning corridor rises; everything off-path stays down.
				const corridorBand = Math.exp(-Math.pow((c - half.c) / 3.2, 2));
				const corridor = corridorBand * state.corridor * 2.4;
				// Act VII: the field folds up into city massing.
				const cityBand = Math.exp(-Math.pow((r - half.r) / 9, 2)) * Math.abs(Math.sin(c * 0.7 + r * 0.3));
				const city = cityBand * state.city * 9;

				const ambient = ambientAt(i, phase);
				const y = terrain + corridor + city + ambient * 0.05;

				this.#dummy.position.set(x, y, z);
				this.#dummy.scale.set(1, 1 + city * 0.6, 1);
				this.#dummy.updateMatrix();
				this.mesh.setMatrixAt(i, this.#dummy.matrix);

				// Emissive: dormant field, lit where the system is doing work.
				// The world is already alive when the site loads: a resting tile is
				// lit, not black, and falls off with distance from the origin so
				// the opening close-up reads as one luminous object in darkness.
				// At rest the field is lit near the visitor and falls off with
				// distance, but never to nothing — a dormant tile still reads as a
				// surface in a lit room rather than a hole.
				const distance = Math.hypot(c - half.c, r - half.r);
				const rest = 0.34 * Math.exp(-distance / 9) + 0.11;

				// Coordination raises the whole field: by the City the metropolis
				// is operating coherently and this is the most luminous state of
				// the site, so the fabric cannot stay a dark island in a bright world.
				const coordinated = state.alignment * 0.22 + state.city * 0.55;

				const lit =
					rest +
					coordinated +
					state.terrain * Math.max(0, this.#coverage[i] - 0.5) * 1.4 +
					corridorBand * state.corridor * 0.9 +
					ambient * 0.45;

				const o = i * 3;
				attr[o] = lit;
				attr[o + 1] = ambient;
				attr[o + 2] = 1;

				// Regions develop distinct internal lighting behavior during Fracture,
				// then converge on one language as One Plane resolves.
				pickColor(color, region, state);
				colors[o] = color.r;
				colors[o + 1] = color.g;
				colors[o + 2] = color.b;
			}
		}

		this.mesh.instanceMatrix.needsUpdate = true;
		this.#attr.needsUpdate = true;
		this.#colorAttr.needsUpdate = true;
	}

	dispose() {
		this.mesh.geometry.dispose();
		(this.mesh.material as MeshStandardMaterial).dispose();
		this.mesh.removeFromParent();
	}
}

/**
 * A tile's colour for the current act.
 *
 * Regions sit at different points between the act's key and counter hues. As
 * `alignment` resolves they converge on the key, which is the visual form of
 * separate systems learning to behave as one.
 */
function pickColor(out: Color, region: number, state: ExperienceState) {
	const t = state.territory;
	const spread = REGION_MIX[region % REGION_MIX.length];

	// Fracture pushes regions apart chromatically; alignment pulls them back.
	const isolation = Math.max(state.fracture, 0.12) * (1 - state.alignment);
	out.copy(t.key).lerp(t.counter, spread * isolation);

	// A few regions carry the accent, so the field is never two hues only.
	if (region % 3 === 2) out.lerp(t.accent, 0.4 * isolation);
}

const fract = (v: number) => v - Math.floor(v);

/**
 * Injects per-instance emissive control into the standard material.
 *
 * A custom shader here materially improves the result — it is the only way to
 * drive emissive intensity and LED activity per tile inside one draw call —
 * rather than being novelty.
 */
function patchTileShader(material: MeshStandardMaterial) {
	material.onBeforeCompile = (shader) => {
		shader.vertexShader = shader.vertexShader
			.replace(
				'#include <common>',
				`#include <common>
				attribute vec3 aTile;
				attribute vec3 aTileColor;
				varying vec3 vTile;
				varying vec3 vTileColor;
				varying vec2 vTileUv;`
			)
			.replace(
				'#include <begin_vertex>',
				`#include <begin_vertex>
				vTile = aTile;
				vTileColor = aTileColor;
				vTileUv = uv;`
			);

		shader.fragmentShader = shader.fragmentShader
			.replace(
				'#include <common>',
				`#include <common>
				varying vec3 vTile;
				varying vec3 vTileColor;
				varying vec2 vTileUv;`
			)
			.replace(
				'#include <dithering_fragment>',
				`#include <dithering_fragment>
				// Infinity-mirror stand-in: concentric falloff from the tile centre,
				// so depth reads even on greybox geometry.
				vec2 centred = vTileUv - 0.5;
				float ring = 1.0 - smoothstep(0.0, 0.5, length(centred));
				float led = vTile.x * (0.35 + ring * 0.9) + vTile.y * 0.25;
				gl_FragColor.rgb += vTileColor * led;
				gl_FragColor.a *= vTile.z;`
			);
	};
	material.needsUpdate = true;
}
