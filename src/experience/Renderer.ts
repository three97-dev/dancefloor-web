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

	/** Small offscreen canvas used to measure frame luminance in debug. */
	#probe: HTMLCanvasElement | null = null;

	constructor(canvas: HTMLCanvasElement, quality: QualitySettings, debug = false) {
		let renderer: WebGLRenderer;
		try {
			renderer = new WebGLRenderer({
				canvas,
				antialias: quality.tier !== 'LOW',
				alpha: false,
				powerPreference: 'high-performance',
				stencil: false,
				// Post-processing owns the depth buffer; the default target does not need it.
				depth: true,
				// Only in debug: the luminance probe reads the canvas back, and
				// without this the drawing buffer is undefined after compositing.
				preserveDrawingBuffer: debug
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
		// ACES crushes midtones at unity, which underexposes architectural
		// surfaces and makes the emissives look bright only by comparison. The
		// world is supposed to be readable on its own, so it is exposed for the
		// architecture rather than for the LEDs.
		renderer.toneMappingExposure = 1.55;
		renderer.shadowMap.enabled = quality.shadows;
		renderer.info.autoReset = false;

		if (debug) {
			this.#probe = document.createElement('canvas');
			this.#probe.width = 48;
			this.#probe.height = 27;
		}
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
	 * This makes the art-direction criterion measurable rather than a matter of
	 * opinion: a frame reading as "black background with neon objects" has a very
	 * low mean with a few bright outliers, while a luminous architectural
	 * environment sits far higher.
	 *
	 * Implemented by downscaling the canvas into a small 2D context rather than
	 * with `readPixels`. Reading the WebGL buffer after the composer has run
	 * samples whichever render target was left bound and reports a frozen or
	 * zero value — which looks exactly like the failure it is supposed to detect.
	 * Requires `preserveDrawingBuffer`, so it is only available in debug.
	 */
	sampleLuminance(): number {
		if (!this.#probe) return 0;

		const source = this.renderer.domElement;
		if (source.width === 0 || source.height === 0) return 0;

		const ctx = this.#probe.getContext('2d', { willReadFrequently: true });
		if (!ctx) return 0;

		const { width, height } = this.#probe;
		ctx.drawImage(source, 0, 0, width, height);
		const { data } = ctx.getImageData(0, 0, width, height);

		let total = 0;
		for (let i = 0; i < data.length; i += 4) {
			total += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
		}
		return total / (data.length / 4);
	}

	dispose() {
		this.renderer.dispose();
	}
}
