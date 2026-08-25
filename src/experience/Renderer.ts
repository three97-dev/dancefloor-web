/**
 * The one persistent WebGL rendering context.
 *
 * WebGL2 is the production baseline. The renderer is created once and stays
 * mounted for the life of the page — never recreated when entering a section.
 */

import {
	ACESFilmicToneMapping,
	PerspectiveCamera,
	Scene,
	SRGBColorSpace,
	WebGLRenderer
} from 'three';
import type { QualitySettings } from './quality';

export class WebGLUnavailableError extends Error {
	constructor(message = 'WebGL could not be initialised', options?: ErrorOptions) {
		super(message, options);
		this.name = 'WebGLUnavailableError';
	}
}

export class Renderer {
	readonly renderer: WebGLRenderer;
	readonly isWebGL2: boolean;

	constructor(canvas: HTMLCanvasElement, quality: QualitySettings) {
		let renderer: WebGLRenderer;
		try {
			renderer = new WebGLRenderer({
				canvas,
				antialias: quality.tier !== 'LOW',
				alpha: false,
				powerPreference: 'high-performance',
				stencil: false,
				// Post-processing owns the depth buffer; the default target does not need it.
				depth: true
			});
		} catch (cause) {
			throw new WebGLUnavailableError(undefined, { cause });
		}

		this.renderer = renderer;
		this.isWebGL2 = renderer.capabilities.isWebGL2;

		renderer.setPixelRatio(quality.pixelRatio);
		renderer.outputColorSpace = SRGBColorSpace;
		// The world should feel photographable.
		renderer.toneMapping = ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1;
		renderer.shadowMap.enabled = quality.shadows;
		renderer.info.autoReset = false;
	}

	setQuality(quality: QualitySettings) {
		this.renderer.setPixelRatio(quality.pixelRatio);
		this.renderer.shadowMap.enabled = quality.shadows;
	}

	resize(width: number, height: number) {
		this.renderer.setSize(width, height, false);
	}

	/**
	 * Clears the per-frame counters.
	 *
	 * `info.autoReset` is off so that a frame's stats survive until they are
	 * read. That means the reset has to happen explicitly at the top of every
	 * frame — including frames drawn through the composer, which never touch
	 * `render()` below and would otherwise accumulate counts forever.
	 */
	beginFrame() {
		this.renderer.info.reset();
	}

	render(scene: Scene, camera: PerspectiveCamera) {
		this.renderer.render(scene, camera);
	}

	/**
	 * Mean luminance of the rendered frame, 0-1.
	 *
	 * This exists to make the art-direction failure test measurable rather than
	 * a matter of opinion: a frame that reads as "black background with neon
	 * objects" has a very low mean with a few bright outliers, while a luminous
	 * architectural environment sits far higher.
	 *
	 * `readPixels` stalls the pipeline, so this samples three scanlines and is
	 * only ever called from the debug overlay.
	 */
	sampleLuminance(): number {
		const gl = this.renderer.getContext();
		const { width, height } = this.renderer.domElement;
		if (width === 0 || height === 0) return 0;

		const rows = [Math.floor(height * 0.25), Math.floor(height * 0.5), Math.floor(height * 0.75)];
		const buffer = new Uint8Array(width * 4);
		let total = 0;
		let samples = 0;

		for (const y of rows) {
			gl.readPixels(0, y, width, 1, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
			// Stride across the row rather than reading every pixel.
			for (let x = 0; x < width; x += 4) {
				const o = x * 4;
				total += (0.2126 * buffer[o] + 0.7152 * buffer[o + 1] + 0.0722 * buffer[o + 2]) / 255;
				samples++;
			}
		}

		return samples === 0 ? 0 : total / samples;
	}

	dispose() {
		this.renderer.dispose();
	}
}
