/**
 * Restrained post processing.
 *
 * Controlled bloom, subtle vignette, light grain. ACES Filmic tone mapping is
 * applied by the renderer, not here. Bloom must never wash over the whole image.
 */

import { Vector2 } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import type { QualitySettings } from '../quality';
import type { ExperienceState } from '../scroll/ExperienceTimeline';

/** Vignette plus a little animated grain, in one cheap pass. */
const GradeShader = {
	uniforms: {
		tDiffuse: { value: null },
		uTime: { value: 0 },
		uVignette: { value: 0.85 },
		uGrain: { value: 0.035 }
	},
	vertexShader: /* glsl */ `
		varying vec2 vUv;
		void main() {
			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
		}
	`,
	fragmentShader: /* glsl */ `
		uniform sampler2D tDiffuse;
		uniform float uTime;
		uniform float uVignette;
		uniform float uGrain;
		varying vec2 vUv;

		float hash(vec2 p) {
			return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
		}

		void main() {
			vec4 color = texture2D(tDiffuse, vUv);

			vec2 centred = vUv - 0.5;
			float vig = 1.0 - dot(centred, centred) * uVignette;
			color.rgb *= vig;

			float grain = hash(vUv * 900.0 + uTime) - 0.5;
			color.rgb += grain * uGrain;

			gl_FragColor = color;
		}
	`
};

export class PostProcessingSystem {
	readonly composer: EffectComposer;
	#bloom: UnrealBloomPass | null = null;
	#grade: ShaderPass | null = null;
	#enabled: boolean;
	#lightingQA = false;

	constructor(
		renderer: WebGLRenderer,
		scene: Scene,
		camera: PerspectiveCamera,
		quality: QualitySettings
	) {
		this.composer = new EffectComposer(renderer);
		this.composer.addPass(new RenderPass(scene, camera));
		this.#enabled = quality.bloom || quality.vignette || quality.filmGrain;

		if (quality.bloom) {
			const size = renderer.getSize(new Vector2());
			this.#bloom = new UnrealBloomPass(
				size.multiplyScalar(quality.bloomResolutionScale),
				0.55, // strength — deliberately low
				0.7, // radius
				0.82 // threshold — only genuinely bright emissives bloom
			);
			this.composer.addPass(this.#bloom);
		}

		if (quality.vignette || quality.filmGrain) {
			this.#grade = new ShaderPass(GradeShader);
			this.#grade.uniforms.uVignette.value = quality.vignette ? 0.85 : 0;
			this.#grade.uniforms.uGrain.value = quality.filmGrain ? 0.035 : 0;
			this.composer.addPass(this.#grade);
		}
	}

	get enabled() {
		return this.#enabled && !this.#lightingQA;
	}

	/**
	 * Lighting QA: bloom off, fog reduced, no grain, no vignette.
	 *
	 * The scene must still show architectural legibility, visible materials,
	 * coloured illumination, depth and separation. If it turns mostly black
	 * without bloom, the lighting is wrong — bloom enhances emissive intensity,
	 * it does not create the lighting design.
	 */
	setLightingQA(on: boolean) {
		this.#lightingQA = on;
		if (this.#bloom) this.#bloom.enabled = !on;
		if (this.#grade) this.#grade.enabled = !on;
	}

	get lightingQA() {
		return this.#lightingQA;
	}

	setSize(width: number, height: number, pixelRatio: number) {
		this.composer.setPixelRatio(pixelRatio);
		this.composer.setSize(width, height);
	}

	update(state: ExperienceState) {
		if (this.#grade) this.#grade.uniforms.uTime.value = state.elapsed;
		if (this.#bloom) {
			// The city reveal is the one moment bloom is allowed to open up.
			this.#bloom.strength = 0.55 + state.city * 0.35 + state.corridor * 0.15;
		}
	}

	render() {
		this.composer.render();
	}

	dispose() {
		this.composer.dispose();
	}
}
