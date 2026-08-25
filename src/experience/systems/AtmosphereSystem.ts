/**
 * Atmosphere and darkness.
 *
 * Pure black is forbidden as an environmental shortcut: black must represent
 * depth, never absence. So the scene is never cleared to nothing — it is cleared
 * to a graded volume that keeps charcoal, blue-black and warm black separable,
 * and that still reads as air when there is nothing else in frame.
 *
 * Even intentional negative space has to carry atmospheric gradient, so that a
 * copy-safe area is dark *and* clearly part of a place.
 */

import {
	BackSide,
	Color,
	FogExp2,
	Mesh,
	ShaderMaterial,
	SphereGeometry,
	type Scene
} from 'three';
import type { QualitySettings } from '../quality';
import type { ExperienceState } from '../scroll/ExperienceTimeline';

/** Distinct blacks. Keeping them separable is what stops the world flattening. */
export const DARKS = {
	/** Deepest, coolest — the far volume above and beyond the architecture. */
	deep: new Color('#070b10'),
	/** Mid air, faintly blue. */
	air: new Color('#101821'),
	/** Warm black, used low where the floor's own light spills. */
	warm: new Color('#14140f'),
	/** Atmospheric grey — the haze band that far geometry dissolves into. */
	haze: new Color('#2b3742')
} as const;

const VERTEX = /* glsl */ `
	varying vec3 vWorld;
	void main() {
		vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

const FRAGMENT = /* glsl */ `
	uniform vec3 uDeep;
	uniform vec3 uAir;
	uniform vec3 uWarm;
	uniform vec3 uHaze;
	uniform float uHorizon;
	uniform float uHazeStrength;
	varying vec3 vWorld;

	void main() {
		float h = normalize(vWorld).y;

		// Below the horizon the air warms slightly, as if lit from the floor.
		vec3 lower = mix(uWarm, uAir, smoothstep(-1.0, 0.0, h));
		// Above it, the volume cools and deepens with altitude.
		vec3 upper = mix(uAir, uDeep, smoothstep(0.0, 0.75, h));
		vec3 color = h < 0.0 ? lower : upper;

		// A haze band sits on the horizon, so far architecture has something to
		// dissolve into rather than simply ending.
		float band = exp(-pow((h - uHorizon) * 4.5, 2.0));
		color = mix(color, uHaze, band * uHazeStrength);

		gl_FragColor = vec4(color, 1.0);
	}
`;

export class AtmosphereSystem {
	readonly dome: Mesh;
	#material: ShaderMaterial;
	#fog: FogExp2;

	constructor(scene: Scene, _quality: QualitySettings) {
		this.#material = new ShaderMaterial({
			uniforms: {
				uDeep: { value: DARKS.deep.clone() },
				uAir: { value: DARKS.air.clone() },
				uWarm: { value: DARKS.warm.clone() },
				uHaze: { value: DARKS.haze.clone() },
				uHorizon: { value: 0.02 },
				uHazeStrength: { value: 0.5 }
			},
			vertexShader: VERTEX,
			fragmentShader: FRAGMENT,
			side: BackSide,
			depthWrite: false,
			fog: false
		});

		// Large enough to sit outside the world, small enough to stay in the far
		// plane. It never writes depth, so it cannot occlude anything.
		this.dome = new Mesh(new SphereGeometry(600, 32, 24), this.#material);
		this.dome.name = 'ATMOSPHERE';
		this.dome.frustumCulled = false;
		this.dome.renderOrder = -1;
		scene.add(this.dome);

		// Exponential fog reads as air rather than as a fade to nothing, and its
		// colour matches the horizon band so the two cannot disagree.
		this.#fog = new FogExp2(DARKS.air.getHex(), 0.0075);
		scene.fog = this.#fog;
		// Deliberately not null: clearing to nothing is what produces the void.
		scene.background = null;
	}

	/** Follows the camera so the volume never has an edge the visitor can reach. */
	setCenter(x: number, y: number, z: number) {
		this.dome.position.set(x, y, z);
	}

	update(state: ExperienceState) {
		// Air thins as the camera climbs for the city reveal, and the haze band
		// drops below the horizon so the world reads as being seen from above.
		this.#fog.density = 0.0075 * state.fog;
		this.#material.uniforms.uHorizon.value = 0.02 - state.city * 0.28;
		this.#material.uniforms.uHazeStrength.value = 0.5 + state.city * 0.25;
	}

	dispose() {
		this.dome.geometry.dispose();
		this.#material.dispose();
		this.dome.removeFromParent();
	}
}
