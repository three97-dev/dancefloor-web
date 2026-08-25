/**
 * Environmental lighting.
 *
 * The Dancefloor is *not* the only meaningful light source. It stays special
 * because its activity carries semantic meaning, not because everything else is
 * dark. So the world gets broad architectural illumination in complementary
 * pairs — cyan against magenta, blue against amber — and shadows that fall to a
 * tinted colour rather than collapsing to neutral black.
 */

import {
	AmbientLight,
	Color,
	DirectionalLight,
	HemisphereLight,
	PointLight,
	type Scene
} from 'three';
import { shadowFor } from '../palette';
import type { QualitySettings } from '../quality';
import type { ExperienceState } from '../scroll/ExperienceTimeline';

export class LightingSystem {
	/** Broad coloured fill — the bulk of the environment's readability. */
	#hemi: HemisphereLight;
	/** Lifts absolute shadow off black so no surface is ever unreadable. */
	#ambient: AmbientLight;
	/** Key: the act's dominant illumination. */
	#key: DirectionalLight;
	/** Counter-light in the complementary hue, from the opposite side. */
	#counter: DirectionalLight;
	/** Warm lower-level system, providing separation from the cool architecture. */
	#under: PointLight | null = null;
	/** The floor's own spill. */
	#floor: PointLight | null = null;

	#shadowTint = new Color();

	constructor(scene: Scene, quality: QualitySettings) {
		// Sky/ground hemisphere carries the ambient colour field, which is the
		// 35-45% of the frame that should read as coloured environment.
		this.#hemi = new HemisphereLight('#3a4a9e', '#241a3d', 2.4);
		scene.add(this.#hemi);

		// Deliberately not zero: this is what keeps shadowed architecture legible
		// and stops the frame resolving as black-plus-neon.
		this.#ambient = new AmbientLight('#2b3566', 1.3);
		scene.add(this.#ambient);

		this.#key = new DirectionalLight('#31e0f0', 1.5);
		this.#key.position.set(-60, 55, -40);
		this.#key.castShadow = quality.shadows;
		if (quality.shadows) {
			this.#key.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
			this.#key.shadow.camera.far = 320;
			this.#key.shadow.camera.left = -120;
			this.#key.shadow.camera.right = 120;
			this.#key.shadow.camera.top = 120;
			this.#key.shadow.camera.bottom = -120;
			this.#key.shadow.bias = -0.0009;
		}
		scene.add(this.#key);

		// Complementary, and never shadow-casting: its job is colour separation.
		this.#counter = new DirectionalLight('#e0479f', 0.9);
		this.#counter.position.set(70, 30, 55);
		scene.add(this.#counter);

		if (quality.maxLights >= 4) {
			this.#under = new PointLight('#ffab3d', 26, 140, 2);
			this.#under.position.set(0, -6, -10);
			scene.add(this.#under);

			this.#floor = new PointLight('#31e0f0', 18, 90, 2);
			this.#floor.position.set(0, 1.6, 0);
			scene.add(this.#floor);
		}
	}

	update(state: ExperienceState) {
		const t = state.territory;

		this.#key.color.copy(t.key);
		this.#counter.color.copy(t.counter);

		// Ambient and hemisphere follow the territory, so the whole frame shifts
		// colour with the act rather than only the emissive elements.
		// Sky term takes the haze lifted toward the key, so upward-facing surfaces
		// pick up the environment rather than falling to the ambient floor.
		this.#hemi.color.copy(t.haze).lerp(t.key, 0.3);
		this.#hemi.groundColor.copy(t.shadow);
		this.#ambient.color.copy(t.ambient).lerp(t.haze, 0.45);

		// Shadows fall to a tinted complement of the key, never to neutral black.
		this.#shadowTint.copy(shadowFor(t.key));
		this.#hemi.groundColor.lerp(this.#shadowTint, 0.5);

		// The city reveal is the most luminous state; the observatory is calmer.
		const lift = 1 + state.city * 0.5 - state.alignment * 0.12;
		this.#hemi.intensity = 2.4 * lift;
		this.#ambient.intensity = 1.3 * lift;
		this.#key.intensity = 1.5 * lift;
		this.#counter.intensity = 0.9 * lift;

		if (this.#under) {
			this.#under.color.copy(t.accent);
			// The underfloor is one of the richest colour environments in the site.
			this.#under.intensity = 26 + state.returnPath * 40;
		}
		if (this.#floor) {
			this.#floor.color.copy(t.key);
			this.#floor.intensity = 18 + state.corridor * 22 + state.terrain * 10;
			this.#floor.position.z = -state.corridor * 14;
		}
	}

	dispose() {
		for (const light of [this.#hemi, this.#ambient, this.#key, this.#counter, this.#under, this.#floor]) {
			light?.removeFromParent();
		}
	}
}
