/**
 * The experience: one renderer, one world, one camera, one journey.
 *
 * Created once when the canvas mounts and torn down only on unmount. Everything
 * downstream reads from a single normalized progress value.
 */

import { CameraController } from './camera/CameraController';
import { PerformanceManager } from './PerformanceManager';
import { chooseQuality, probeGpu, type QualitySettings } from './quality';
import { Renderer, WebGLUnavailableError } from './Renderer';
import { deriveState, type ExperienceState } from './scroll/ExperienceTimeline';
import { ScrollController } from './scroll/ScrollController';
import { PostProcessingSystem } from './systems/PostProcessingSystem';
import { readViewportState, type ViewportState } from './viewport';
import { World } from './World';

export interface ExperienceOptions {
	canvas: HTMLCanvasElement;
	/** Called each frame with the derived state, for the debug overlay. */
	onState?: (state: ExperienceState, fps: number) => void;
}

export class Experience {
	#renderer: Renderer;
	#world: World;
	#camera: CameraController;
	#scroll: ScrollController;
	#post: PostProcessingSystem;
	#performance: PerformanceManager;

	#view: ViewportState;
	#quality: QualitySettings;
	#state: ExperienceState;

	#raf = 0;
	#lastTime = 0;
	#running = false;
	#onState?: (state: ExperienceState, fps: number) => void;

	constructor(options: ExperienceOptions) {
		this.#view = readViewportState();
		this.#quality = chooseQuality(this.#view, probeGpu());
		this.#onState = options.onState;

		this.#renderer = new Renderer(options.canvas, this.#quality);
		this.#world = new World(this.#quality);
		this.#camera = new CameraController(this.#view);
		this.#post = new PostProcessingSystem(
			this.#renderer.renderer,
			this.#world.scene,
			this.#camera.camera,
			this.#quality
		);

		this.#state = deriveState(0, 0);

		this.#scroll = new ScrollController({
			cameraClass: this.#view.camera,
			reducedMotion: this.#view.reducedMotion
		});

		this.#performance = new PerformanceManager(this.#quality, this.#view.camera === 'mobile', (q) => {
			this.#quality = q;
			this.#renderer.setQuality(q);
			this.#post.setSize(this.#view.width, this.#view.height, q.pixelRatio);
		});

		this.#resize();
		window.addEventListener('resize', this.#resize);
		window.addEventListener('orientationchange', this.#resize);
		if (!this.#view.touch) window.addEventListener('pointermove', this.#onPointerMove);

		this.start();
	}

	get state() {
		return this.#state;
	}

	get quality() {
		return this.#quality;
	}

	get camera() {
		return this.#camera;
	}

	get scroll() {
		return this.#scroll;
	}

	start() {
		if (this.#running) return;
		this.#running = true;
		this.#lastTime = performance.now();
		this.#raf = requestAnimationFrame(this.#tick);
	}

	stop() {
		this.#running = false;
		cancelAnimationFrame(this.#raf);
	}

	#tick = (now: number) => {
		if (!this.#running) return;
		this.#raf = requestAnimationFrame(this.#tick);

		// Clamp dt so a backgrounded tab does not fast-forward the ambient world.
		const dt = Math.min(0.05, (now - this.#lastTime) / 1000);
		this.#lastTime = now;

		this.#scroll.raf(now);

		// Ambient time advances whether or not the visitor is scrolling.
		const elapsed = this.#world.ambient.elapsed + dt;
		this.#state = deriveState(this.#scroll.progress, elapsed);

		this.#camera.update(this.#state.progress, dt);
		this.#world.update(dt, this.#state);
		this.#post.update(this.#state);

		if (this.#post.enabled) this.#post.render();
		else this.#renderer.render(this.#world.scene, this.#camera.camera);

		this.#performance.sample(dt, now);
		this.#onState?.(this.#state, this.#performance.fps);
	};

	#onPointerMove = (event: PointerEvent) => {
		// Normalized device coords, -1 to 1.
		const x = (event.clientX / window.innerWidth) * 2 - 1;
		const y = -((event.clientY / window.innerHeight) * 2 - 1);
		this.#camera.setPointer(x, y);
	};

	#resize = () => {
		const next = readViewportState();
		const classChanged = next.camera !== this.#view.camera;
		this.#view = next;

		this.#renderer.resize(next.width, next.height);
		this.#camera.setAspect(next.aspect);
		this.#post.setSize(next.width, next.height, this.#quality.pixelRatio);

		if (classChanged) {
			// A different viewport class gets a different composition and a
			// different scroll length — never the same path rescaled.
			this.#camera.setComposition(next.camera);
			this.#scroll.setScrollLength(next.camera);
		}
	};

	dispose() {
		this.stop();
		window.removeEventListener('resize', this.#resize);
		window.removeEventListener('orientationchange', this.#resize);
		window.removeEventListener('pointermove', this.#onPointerMove);
		this.#scroll.dispose();
		this.#post.dispose();
		this.#world.dispose();
		this.#renderer.dispose();
	}
}

export { WebGLUnavailableError };
export type { ExperienceState };
