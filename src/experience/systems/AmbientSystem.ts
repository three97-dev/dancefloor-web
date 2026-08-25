/**
 * Ambient life. Mandatory: this runs off elapsed real time, never scroll.
 *
 * When the visitor stops scrolling the system keeps operating — asynchronous
 * LED pulses, occasional signal propagation, slow reflection changes. Timing is
 * procedural so nothing reads as a loop.
 */

export class AmbientSystem {
	#elapsed = 0;
	/** Scales ambient amplitude; the observatory sections stay calmer. */
	#intensity = 1;

	update(dt: number) {
		this.#elapsed += dt;
	}

	get elapsed() {
		return this.#elapsed;
	}

	setIntensity(value: number) {
		this.#intensity = Math.min(1, Math.max(0, value));
	}

	/**
	 * Per-tile ambient activity, 0-1.
	 *
	 * Three incommensurable periods keep the pattern from repeating on any
	 * human timescale, and the per-tile phase offset means neighbours never
	 * pulse together.
	 */
	activityAt(_index: number, phase: number): number {
		const t = this.#elapsed;
		const slow = Math.sin(t * 0.21 + phase * 6.283) * 0.5 + 0.5;
		const mid = Math.sin(t * 0.53 + phase * 19.7) * 0.5 + 0.5;
		const fast = Math.sin(t * 1.19 + phase * 41.3) * 0.5 + 0.5;

		// Most tiles idle low; a few reach a visible pulse at any moment.
		const combined = slow * 0.45 + mid * 0.35 + fast * 0.2;
		const gated = Math.pow(combined, 3.2);
		return gated * this.#intensity;
	}
}
