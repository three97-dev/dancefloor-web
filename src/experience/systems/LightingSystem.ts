/**
 * Architectural lighting.
 *
 * Three layers, as a lighting designer would treat a real venue:
 *
 *   1. Architectural ambient — makes the building legible at all.
 *   2. Integrated architectural light — practicals physically built into the
 *      coves, reveals, canopy panels and rails of each space.
 *   3. Dancefloor and signal light — narrative, dynamic, semantic.
 *
 * The Dancefloor is special because its activity carries meaning, not because
 * everything else is dark. The acceptance test: with the floor switched off, a
 * photographer should still be able to expose the building.
 *
 * Practicals are drawn from a per-space rig and assigned to a bounded pool, so
 * an enclosed interior can be properly lit without the light count growing with
 * the size of the venue.
 */

import {
	AmbientLight,
	Color,
	DirectionalLight,
	HemisphereLight,
	PointLight,
	Vector3,
	type Scene
} from 'three';
import type { ActId } from '$content/types';
import { PRACTICAL_GAIN, RIGS, RIG_BUDGET, type PracticalSpec } from '../lighting-design';
import { shadowFor } from '../palette';
import type { QualitySettings } from '../quality';
import type { ExperienceState } from '../scroll/ExperienceTimeline';

/** Acts in order, so a rig can crossfade into the one that follows it. */
const ACT_ORDER: ActId[] = [
	'ACT_I_FIELD_AT_REST',
	'ACT_II_FRACTURE',
	'ACT_III_THE_PATCH',
	'ACT_IV_THE_RISE',
	'ACT_V_RETURN_PATH',
	'ACT_VI_ONE_PLANE',
	'ACT_VII_THE_CITY'
];

interface Candidate {
	spec: PracticalSpec;
	weight: number;
	distance: number;
}

export class LightingSystem {
	/** Layer 1 — architectural ambient. */
	#hemi: HemisphereLight;
	#ambient: AmbientLight;
	/** The room's direction. */
	#key: DirectionalLight;
	/** Complementary counter-light: no frame is ever a single hue. */
	#counter: DirectionalLight;

	/** Layer 2 — a bounded pool the active rigs are assigned into. */
	#pool: PointLight[] = [];
	#budget: number;

	#shadowTint = new Color();
	#eye = new Vector3();
	#candidates: Candidate[] = [];
	/** Set by the QA mode that proves the venue survives without emissives. */
	#practicalScale = 1;

	constructor(scene: Scene, quality: QualitySettings) {
		// Strong enough that the interiors are legible without the floor. Once
		// the world became an enclosed building this stopped being optional.
		this.#hemi = new HemisphereLight('#3a4a9e', '#241a3d', 4.2);
		scene.add(this.#hemi);

		this.#ambient = new AmbientLight('#2b3566', 2.4);
		scene.add(this.#ambient);

		this.#key = new DirectionalLight('#31e0f0', 1.5);
		this.#key.position.set(-60, 55, -40);
		this.#key.castShadow = quality.shadows;
		if (quality.shadows) {
			this.#key.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
			this.#key.shadow.camera.far = 420;
			this.#key.shadow.camera.left = -160;
			this.#key.shadow.camera.right = 160;
			this.#key.shadow.camera.top = 160;
			this.#key.shadow.camera.bottom = -160;
			this.#key.shadow.bias = -0.0011;
		}
		scene.add(this.#key);

		this.#counter = new DirectionalLight('#e0479f', 0.9);
		this.#counter.position.set(70, 30, 55);
		scene.add(this.#counter);

		this.#budget = RIG_BUDGET[quality.tier];
		for (let i = 0; i < this.#budget; i++) {
			// Always visible, never toggled. Changing the *number* of visible
			// lights changes the shader permutation, so Three.js recompiles every
			// material in the scene — every frame, if the pool is reassigned per
			// frame. An unused slot is silenced with zero intensity instead.
			const light = new PointLight('#ffffff', 0, 100, 2);
			this.#pool.push(light);
			scene.add(light);
		}
	}

	/** QA: prove the venue is exposed by architecture rather than emissives. */
	setPracticalScale(scale: number) {
		this.#practicalScale = scale;
	}

	update(state: ExperienceState, cameraPosition: Vector3) {
		const t = state.territory;
		this.#eye.copy(cameraPosition);

		this.#key.color.copy(t.key);
		this.#counter.color.copy(t.counter);
		this.#hemi.color.copy(t.haze).lerp(t.key, 0.3);
		this.#hemi.groundColor.copy(t.shadow);
		this.#ambient.color.copy(t.ambient).lerp(t.haze, 0.45);

		// Shadows fall to a tinted complement of the key, never to neutral black.
		this.#shadowTint.copy(shadowFor(t.key));
		this.#hemi.groundColor.lerp(this.#shadowTint, 0.5);

		const lift = 1 + state.city * 0.5 - state.alignment * 0.12;
		this.#hemi.intensity = 4.2 * lift;
		this.#ambient.intensity = 2.4 * lift;
		this.#key.intensity = 1.5 * lift;
		this.#counter.intensity = 0.9 * lift;

		this.#assignPracticals(state, t, lift);
	}

	/**
	 * Chooses which practicals get pool slots this frame.
	 *
	 * Rigs from the current act and the one it is becoming are both candidates,
	 * weighted by how far through the act the camera is. Within that set the
	 * nearest lights win, because a cove on the far side of the venue
	 * contributes nothing the visitor can see.
	 */
	#assignPracticals(state: ExperienceState, territory: ExperienceState['territory'], lift: number) {
		const index = ACT_ORDER.indexOf(state.activeAct);
		const next = ACT_ORDER[Math.min(ACT_ORDER.length - 1, index + 1)];
		// Crossfade over the last third of an act, matching the colour blend.
		const blend = Math.max(0, (state.actProgress - 0.66) / 0.34);

		this.#candidates.length = 0;
		this.#collect(RIGS[state.activeAct], 1 - blend * 0.5);
		if (next !== state.activeAct && blend > 0) this.#collect(RIGS[next], blend);

		this.#candidates.sort((a, b) => a.distance - b.distance);

		for (let i = 0; i < this.#pool.length; i++) {
			const light = this.#pool[i];
			const candidate = this.#candidates[i];
			if (!candidate) {
				light.intensity = 0;
				continue;
			}

			const { spec, weight } = candidate;
			light.position.set(...spec.position);
			light.distance = spec.distance;

			// Roles take the act's colour; literals stay literal, which is how
			// warm hospitality light survives a cyan act.
			if (spec.color === 'key' || spec.color === 'counter' || spec.color === 'accent' || spec.color === 'haze') {
				light.color.copy(territory[spec.color]);
			} else {
				light.color.set(spec.color);
			}

			light.intensity = spec.intensity * PRACTICAL_GAIN * weight * lift * this.#practicalScale;
		}
	}

	#collect(rig: readonly PracticalSpec[], weight: number) {
		for (const spec of rig) {
			const dx = spec.position[0] - this.#eye.x;
			const dy = spec.position[1] - this.#eye.y;
			const dz = spec.position[2] - this.#eye.z;
			this.#candidates.push({ spec, weight, distance: Math.hypot(dx, dy, dz) });
		}
	}

	dispose() {
		for (const light of [this.#hemi, this.#ambient, this.#key, this.#counter, ...this.#pool]) {
			light.removeFromParent();
		}
	}
}
