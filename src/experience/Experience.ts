/**
 * The experience: one renderer, one world, one camera, one journey.
 *
 * Created once when the canvas mounts and torn down only on unmount. Everything
 * downstream reads from a single normalized progress value.
 */

import { AssetManager } from './AssetManager';
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
	/** ?lighting=1 — bloom/fog/grain off, to prove the lighting stands alone. */
	lightingQA?: boolean;
	/** Base path, so assets resolve when the site is served from a subpath. */
	base?: string;
	/** Enables the luminance probe, which needs a preserved drawing buffer. */
	debug?: boolean;
	/** ?off=tiles,lighting — skip systems, to bisect frame cost. */
	skip?: readonly string[];
	/** ?noshadow=1 — drop the shadow pass. */
	noShadow?: boolean;
	/** Called each frame with the derived state, for the debug overlay. */
	onState?: (state: ExperienceState, stats: ExperienceStats) => void;
}

export class Experience {
	#renderer: Renderer;
	#world: World;
	#camera: CameraController;
	#scroll: ScrollController;
	#post: PostProcessingSystem;
	#performance: PerformanceManager;
	#assets: AssetManager;

	#view: ViewportState;
	#quality: QualitySettings;
	#state: ExperienceState;

	#raf = 0;
	#luminance = 0;
	#awaitingSize = false;
	#luminanceTick = 0;
	#lastTime = 0;
	#running = false;
	#onState?: (state: ExperienceState, stats: ExperienceStats) => void;

	constructor(options: ExperienceOptions) {
		this.#view = readViewportState();
		this.#quality = chooseQuality(this.#view, probeGpu());
		this.#onState = options.onState;

		this.#renderer = new Renderer(options.canvas, this.#quality, options.debug ?? false);
		this.#world = new World(this.#quality);
		this.#camera = new CameraController(this.#view);
		this.#post = new PostProcessingSystem(
			this.#renderer.renderer,
			this.#world.scene,
			this.#camera.camera,
			this.#quality
		);

		if (options.lightingQA) this.#post.setLightingQA(true);

		if (options.skip?.length) for (const name of options.skip) this.#world.skip.add(name);
		if (options.noShadow) this.#renderer.renderer.shadowMap.enabled = false;

		this.#state = deriveState(0, 0);

		this.#scroll = new ScrollController({
			cameraClass: this.#view.camera,
			reducedMotion: this.#view.reducedMotion
		});

		this.#performance = new PerformanceManager(this.#quality, this.#view.camera === 'mobile', (q) => {
			this.#quality = q;
			this.#renderer.setQuality(q);
			this.#post.setSize(this.#view.width, this.#view.height, q.pixelRatio);
			// Reduce complexity, never the art direction: colour and primary
			// architecture survive every tier.
			this.#world.shell.setComplexity(q.tier === 'LOW' ? 0.2 : q.tier === 'MEDIUM' ? 0.6 : 1);
		});

		// The world arrives progressively. The experience is already running by
		// the time the first group lands, so nothing here blocks the first frame.
		this.#assets = new AssetManager({
			base: options.base ?? '',
			// Far silhouettes are pure scale; a LOW-tier device should not pay for them.
			skip: this.#quality.tier === 'LOW' ? ['far'] : [],
			onGroup: (loaded) => this.#world.addAssets(loaded)
		});
		void this.#assets.loadAll();

		this.#resize();
		window.addEventListener('resize', this.#resize);
		window.addEventListener('orientationchange', this.#resize);
		// A page opened in a background tab reports a zero viewport, which would
		// leave the canvas 0x0 with no resize event ever arriving to correct it.
		document.addEventListener('visibilitychange', this.#resize);
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

		// True frame time, and a clamped copy for simulation.
		//
		// These must stay separate: the clamp stops a backgrounded tab
		// fast-forwarding the ambient world, but feeding it to the frame-rate
		// monitor makes a 2 FPS scene report 47, because the accumulator only
		// ever advances by the clamp. That hid a real performance collapse.
		const realDt = (now - this.#lastTime) / 1000;
		const dt = Math.min(0.05, realDt);
		this.#lastTime = now;

		this.#renderer.beginFrame();
		this.#scroll.raf(now);

		// Ambient time advances whether or not the visitor is scrolling.
		const elapsed = this.#world.ambient.elapsed + dt;
		this.#state = deriveState(this.#scroll.progress, elapsed);

		this.#camera.update(this.#state.progress, dt);
		// The atmosphere volume travels with the camera, so it has no reachable edge.
		const eye = this.#camera.camera.position;
		this.#world.atmosphere.setCenter(eye.x, eye.y, eye.z);
		this.#world.update(dt, this.#state, eye);
		this.#post.update(this.#state);

		if (this.#post.enabled) this.#post.render();
		else this.#renderer.render(this.#world.scene, this.#camera.camera);

		// Fog is atmosphere, not a way to hide empty space, so QA reduces it.
		if (this.#post.lightingQA) this.#world.atmosphere.setFogScale(0.15);

		this.#performance.sample(realDt, now);

		const info = this.#renderer.renderer.info;
		// readPixels stalls, so only sample when someone is watching, and rarely.
		this.#luminanceTick = (this.#luminanceTick + 1) % 30;
		if (this.#onState && this.#luminanceTick === 0) {
			this.#luminance = this.#renderer.sampleLuminance();
		}

		this.#onState?.(this.#state, {
			fps: this.#performance.fps,
			tier: this.#quality.tier,
			pixelRatio: this.#quality.pixelRatio,
			drawCalls: info.render.calls,
			triangles: info.render.triangles,
			ambientEvents: this.#world.living.events.length,
			assets: this.#assets.loaded.join(',') || 'none',
			viewport: this.#view.viewport,
			anchor: this.#camera.nearestAnchor(this.#state.progress).anchor,
			luminance: this.#luminance,
			lightingQA: this.#post.lightingQA
		});
	};

	#onPointerMove = (event: PointerEvent) => {
		// Normalized device coords, -1 to 1.
		const x = (event.clientX / window.innerWidth) * 2 - 1;
		const y = -((event.clientY / window.innerHeight) * 2 - 1);
		this.#camera.setPointer(x, y);
	};

	#resize = () => {
		const next = readViewportState();

		// Nothing can be sized against a zero viewport. Bail and try again on
		// the next frame rather than baking a dead 0x0 canvas.
		if (next.width === 0 || next.height === 0) {
			if (!this.#awaitingSize) {
				this.#awaitingSize = true;
				requestAnimationFrame(() => {
					this.#awaitingSize = false;
					this.#resize();
				});
			}
			return;
		}

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
		document.removeEventListener('visibilitychange', this.#resize);
		window.removeEventListener('pointermove', this.#onPointerMove);
		this.#assets.dispose();
		this.#scroll.dispose();
		this.#post.dispose();
		this.#world.dispose();
		this.#renderer.dispose();
	}
}

export interface ExperienceStats {
	fps: number;
	tier: string;
	pixelRatio: number;
	drawCalls: number;
	triangles: number;
	ambientEvents: number;
	assets: string;
	viewport: string;
	anchor: string;
	/** Mean luminance of the rendered frame, 0-1. The art-direction check. */
	luminance: number;
	lightingQA: boolean;
}

export { WebGLUnavailableError };
export type { ExperienceState };
