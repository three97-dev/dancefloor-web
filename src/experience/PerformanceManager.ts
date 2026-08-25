/**
 * Frame-rate adaptation.
 *
 * Monitors frame time and steps quality down when sustained performance falls
 * below target, in a fixed order: particles, pixel ratio, bloom, shadows,
 * atmosphere. The site must never sit at 15 FPS looking impressive —
 * smoothness is part of the art direction.
 */

import { degrade, type QualitySettings } from './quality';

const TARGET_FPS = { desktop: 60, mobile: 30 } as const;
/** Frames of sustained shortfall before stepping down. */
const PATIENCE = 90;
/** Never step down twice inside this window, so a stall cannot cascade. */
const COOLDOWN_MS = 4000;

export class PerformanceManager {
	#quality: QualitySettings;
	#isMobile: boolean;
	#onChange: (q: QualitySettings) => void;

	#frames = 0;
	#accum = 0;
	#fps = 60;
	#shortfall = 0;
	#lastChange = 0;
	#floorReached = false;

	constructor(
		quality: QualitySettings,
		isMobile: boolean,
		onChange: (q: QualitySettings) => void
	) {
		this.#quality = quality;
		this.#isMobile = isMobile;
		this.#onChange = onChange;
	}

	get fps() {
		return this.#fps;
	}

	get quality() {
		return this.#quality;
	}

	/**
	 * @param dt true seconds since the last frame — never the clamped
	 * simulation delta, or slow frames are invisible to this monitor
	 * @param now performance.now() milliseconds
	 */
	sample(dt: number, now: number) {
		this.#accum += dt;
		this.#frames++;
		if (this.#accum >= 0.5) {
			this.#fps = this.#frames / this.#accum;
			this.#frames = 0;
			this.#accum = 0;
		}

		if (this.#floorReached) return;

		const target = this.#isMobile ? TARGET_FPS.mobile : TARGET_FPS.desktop;
		// A 10% margin, so a normally-paced 60 does not trip the 60 target.
		this.#shortfall = this.#fps < target * 0.9 ? this.#shortfall + 1 : 0;

		if (this.#shortfall < PATIENCE) return;
		if (now - this.#lastChange < COOLDOWN_MS) return;

		const next = degrade(this.#quality, this.#isMobile);
		if (!next) {
			this.#floorReached = true;
			return;
		}

		this.#quality = next;
		this.#shortfall = 0;
		this.#lastChange = now;
		this.#onChange(next);
	}
}
