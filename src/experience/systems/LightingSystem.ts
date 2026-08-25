/**
 * Environmental and emissive lighting.
 *
 * The Dancefloor itself provides most of the illumination, so this is a small
 * number of selective real-time lights over emissive materials — never dozens
 * of dynamic point lights.
 */

import { AmbientLight, DirectionalLight, PointLight, type Scene } from 'three';
import type { QualitySettings } from '../quality';
import type { ExperienceState } from '../scroll/ExperienceTimeline';

export class LightingSystem {
	#ambient: AmbientLight;
	#key: DirectionalLight;
	#fill: PointLight | null = null;

	constructor(scene: Scene, quality: QualitySettings) {
		// Base: charcoal, black, dark grey. The floor supplies the colour.
		this.#ambient = new AmbientLight('#20272c', 0.55);
		scene.add(this.#ambient);

		this.#key = new DirectionalLight('#8fa6b8', 0.7);
		this.#key.position.set(-12, 22, 10);
		this.#key.castShadow = quality.shadows;
		if (quality.shadows) {
			this.#key.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
			this.#key.shadow.camera.far = 120;
			this.#key.shadow.bias = -0.0006;
		}
		scene.add(this.#key);

		if (quality.maxLights >= 4) {
			// One soft bounce standing in for light spilling out of the tiles.
			this.#fill = new PointLight('#39c6d6', 8, 40, 2);
			this.#fill.position.set(0, 1.4, 0);
			scene.add(this.#fill);
		}

	}

	update(state: ExperienceState) {
		// Atmosphere and fog belong to AtmosphereSystem; this owns only the
		// practical lights over the floor's own illumination.
		// The key light lifts as the world opens up.
		this.#key.intensity = 0.7 + state.city * 0.5 + state.alignment * 0.2;

		if (this.#fill) {
			this.#fill.intensity = 8 + state.corridor * 14 + state.alignment * 6;
			this.#fill.position.z = -state.corridor * 12;
		}
	}

	dispose() {
		this.#ambient.removeFromParent();
		this.#key.removeFromParent();
		this.#fill?.removeFromParent();
	}
}
