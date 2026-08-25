/**
 * Information moving through the world.
 *
 * Signals route surface -> underfloor -> across infrastructure -> back upward,
 * and change the system as they travel. Colour semantics: a moving light is a
 * signal, a crossing signal is a connection, convergence is context.
 */

import {
	AdditiveBlending,
	BufferGeometry,
	Float32BufferAttribute,
	Points,
	PointsMaterial,
	type Scene
} from 'three';
import { GRID } from '$content/scene-data';
import type { QualitySettings } from '../quality';
import type { ExperienceState } from '../scroll/ExperienceTimeline';

interface Signal {
	/** 0-1 along its route. */
	t: number;
	speed: number;
	lane: number;
	/** Whether this signal has dropped below the floor yet. */
	depth: number;
	active: boolean;
}

export class SignalSystem {
	readonly points: Points;
	#signals: Signal[] = [];
	#positions: Float32Array;
	#max: number;

	constructor(scene: Scene, quality: QualitySettings) {
		this.#max = quality.maxSignals;
		this.#positions = new Float32Array(this.#max * 3);

		const geometry = new BufferGeometry();
		geometry.setAttribute('position', new Float32BufferAttribute(this.#positions, 3));

		const material = new PointsMaterial({
			size: 0.4,
			sizeAttenuation: true,
			color: '#ffab3d',
			transparent: true,
			opacity: 0.9,
			blending: AdditiveBlending,
			depthWrite: false
		});

		this.points = new Points(geometry, material);
		this.points.frustumCulled = false;
		this.points.name = 'SIGNALS';
		scene.add(this.points);

		for (let i = 0; i < this.#max; i++) {
			this.#signals.push({
				t: i / this.#max,
				speed: 0.06 + (i % 5) * 0.017,
				lane: ((i % 7) - 3) * (GRID.tileSize * 3),
				depth: 0,
				active: false
			});
		}
	}

	update(dt: number, state: ExperienceState) {
		// Act II stops signals at boundaries; the return path is where they travel.
		const traffic = Math.max(state.returnPath, state.alignment * 0.8, 0.12);
		const budget = Math.ceil(this.#max * traffic);
		const span = GRID.tileSize * GRID.rows * 0.5;

		for (let i = 0; i < this.#max; i++) {
			const s = this.#signals[i];
			s.active = i < budget;

			const o = i * 3;
			if (!s.active) {
				// Park inactive signals far below the camera rather than deleting them.
				this.#positions[o + 1] = -9999;
				continue;
			}

			s.t = (s.t + dt * s.speed) % 1;

			// The route: run out along the surface, drop under, travel the
			// infrastructure, then climb back up somewhere else.
			const leg = s.t;
			let x: number;
			let y: number;
			let z: number;

			if (leg < 0.3) {
				const k = leg / 0.3;
				x = s.lane;
				y = 0.35;
				z = span - k * span * 2;
			} else if (leg < 0.45) {
				const k = (leg - 0.3) / 0.15;
				x = s.lane;
				y = 0.35 - k * 3.2;
				z = -span;
			} else if (leg < 0.8) {
				const k = (leg - 0.45) / 0.35;
				x = s.lane + Math.sin(k * Math.PI) * span * 0.5;
				y = -2.85;
				z = -span + k * span * 2;
			} else {
				const k = (leg - 0.8) / 0.2;
				x = s.lane;
				y = -2.85 + k * 3.2;
				z = span;
			}

			// Act II: signals reach the region boundary and stop dead.
			if (state.fracture > 0.35 && Math.abs(z) > span * 0.45 * (1 - state.fracture)) {
				y = 0.35;
			}

			this.#positions[o] = x;
			this.#positions[o + 1] = y;
			this.#positions[o + 2] = z;
		}

		const attr = this.points.geometry.getAttribute('position');
		(attr.array as Float32Array).set(this.#positions);
		attr.needsUpdate = true;

		const material = this.points.material as PointsMaterial;
		material.opacity = 0.35 + traffic * 0.55;
		// A moving light is a signal, and it carries the act's accent hue so the
		// return path reads amber against blue-violet infrastructure.
		material.color.copy(state.territory.accent);
	}

	dispose() {
		this.points.geometry.dispose();
		(this.points.material as PointsMaterial).dispose();
		this.points.removeFromParent();
	}
}
