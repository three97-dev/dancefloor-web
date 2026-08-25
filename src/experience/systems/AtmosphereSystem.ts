/**
 * Atmosphere and colour.
 *
 * The environment must read first as *coloured architectural atmosphere* and
 * only second as luminous digital objects. So the volume the world sits inside
 * is never neutral and never near-black: it carries the act's colour territory,
 * a horizon band for far architecture to dissolve into, and a warmer floor of
 * light where the Dancefloor's own illumination spills upward.
 *
 * The hard test: if disabling bloom turns the scene mostly black, the lighting
 * is wrong. Nothing here depends on bloom.
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

const VERTEX = /* glsl */ `
	varying vec3 vWorld;
	void main() {
		vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

const FRAGMENT = /* glsl */ `
	uniform vec3 uAmbient;
	uniform vec3 uHaze;
	uniform vec3 uKey;
	uniform vec3 uCounter;
	uniform vec3 uAccent;
	uniform float uHorizon;
	uniform float uLuminosity;
	uniform float uUnderfloor;
	varying vec3 vWorld;

	void main() {
		vec3 dir = normalize(vWorld);
		float h = dir.y;

		// Upper volume: the ambient wash deepens with altitude but never reaches
		// black — structures are meant to dissolve upward into coloured air, not
		// vanish against a lid.
		vec3 upper = mix(uAmbient, uAmbient * 0.78 + uHaze * 0.10, smoothstep(0.0, 0.9, h));

		// Below the horizon the environment picks up the floor's own light.
		vec3 lower = mix(uAmbient, uAmbient * 0.85 + uKey * 0.14, smoothstep(0.0, -0.6, h));

		vec3 color = h < 0.0 ? lower : upper;

		// Beneath the floor the world is not a black tunnel: it is one of the
		// richest colour environments in the site, layered by depth — cyan and
		// blue overhead, violet through the middle, amber and coral far below.
		if (uUnderfloor > 0.0) {
			float depth = smoothstep(0.1, -0.9, h);
			vec3 deep = mix(uCounter * 0.5, uKey * 0.6, depth);
			deep += uAccent * depth * 0.55;
			color = mix(color, color * 0.7 + deep, uUnderfloor * depth);
		}

		// The horizon band: far architecture resolves into this rather than
		// disappearing, which is what keeps the horizon from going featureless.
		float band = exp(-pow((h - uHorizon) * 3.2, 2.0));
		color = mix(color, uHaze, band * 0.85);

		// Two large off-camera sources, on opposite sides, in complementary hues.
		// This is what stops any frame reading as a single flat colour.
		float keySide = smoothstep(-0.35, 0.85, dot(dir, normalize(vec3(-0.8, 0.25, -0.5))));
		float counterSide = smoothstep(-0.3, 0.9, dot(dir, normalize(vec3(0.85, 0.15, 0.45))));
		color += uKey * keySide * 0.30;
		color += uCounter * counterSide * 0.24;

		gl_FragColor = vec4(color * uLuminosity, 1.0);
	}
`;

export class AtmosphereSystem {
	readonly dome: Mesh;
	#material: ShaderMaterial;
	#fog: FogExp2;
	#fogColor = new Color();
	#fogScale = 1;

	constructor(scene: Scene, _quality: QualitySettings) {
		this.#material = new ShaderMaterial({
			uniforms: {
				uAmbient: { value: new Color('#151a3a') },
				uHaze: { value: new Color('#2a3a72') },
				uKey: { value: new Color('#31e0f0') },
				uCounter: { value: new Color('#e0479f') },
				uAccent: { value: new Color('#ffab3d') },
				uUnderfloor: { value: 0 },
				uHorizon: { value: 0.02 },
				uLuminosity: { value: 1 }
			},
			vertexShader: VERTEX,
			fragmentShader: FRAGMENT,
			side: BackSide,
			depthWrite: false,
			fog: false
		});

		this.dome = new Mesh(new SphereGeometry(600, 48, 32), this.#material);
		this.dome.name = 'ATMOSPHERE';
		this.dome.frustumCulled = false;
		this.dome.renderOrder = -1;
		scene.add(this.dome);

		// Fog carries colour too: near is clear, mid picks up the territory, far
		// resolves into luminous saturated haze.
		this.#fog = new FogExp2(0x2a3a72, 0.0052);
		scene.fog = this.#fog;
		scene.background = null;
	}

	/** QA reduces fog, to prove depth comes from architecture rather than haze. */
	setFogScale(scale: number) {
		this.#fogScale = scale;
	}

	/** Follows the camera so the volume never has an edge the visitor can reach. */
	setCenter(x: number, y: number, z: number) {
		this.dome.position.set(x, y, z);
	}

	update(state: ExperienceState) {
		const t = state.territory;
		const u = this.#material.uniforms;

		(u.uAmbient.value as Color).copy(t.ambient);
		(u.uHaze.value as Color).copy(t.haze);
		(u.uKey.value as Color).copy(t.key);
		(u.uCounter.value as Color).copy(t.counter);
		(u.uAccent.value as Color).copy(t.accent);
		u.uUnderfloor.value = state.returnPath;

		// The city reveal is the most luminous state of the site.
		u.uLuminosity.value = 1 + state.city * 0.55 + state.alignment * 0.15;
		// The haze band drops below the horizon as the camera climbs, so the
		// world reads as being seen from above rather than across.
		u.uHorizon.value = 0.02 - state.city * 0.3;

		// Fog takes the haze colour, so distance and horizon can never disagree.
		this.#fogColor.copy(t.haze);
		this.#fog.color.copy(this.#fogColor);
		this.#fog.density = 0.0052 * state.fog * this.#fogScale;
	}

	dispose() {
		this.dome.geometry.dispose();
		this.#material.dispose();
		this.dome.removeFromParent();
	}
}
