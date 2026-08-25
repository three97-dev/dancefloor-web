/**
 * The environment must be alive.
 *
 * This runs entirely off elapsed real time, independent of scroll. When the
 * visitor stops scrolling the world keeps operating: signals move elsewhere,
 * systems respond, architecture changes subtly, light reflects from events
 * happening off-camera.
 *
 * The point is not decoration. The environment has to imply that something much
 * larger exists beyond the current composition, and that it existed before the
 * visitor arrived.
 */

import type { ExperienceState } from '../scroll/ExperienceTimeline';
import type { QualitySettings } from '../quality';

/**
 * Named, reusable event families.
 *
 * Distinct families matter because a single randomised "twinkle" reads as noise.
 * Events with different shapes, durations and locations read as a system doing
 * different kinds of work.
 */
export type AmbientEventKind =
	/** Several remote tiles activate in sequence. */
	| 'DISTANT_PULSE'
	/** A signal traverses a distant bridge. */
	| 'SIGNAL_CROSSING'
	/** A remote structure changes elevation slightly. */
	| 'TOWER_SHIFT'
	/** A vertical signal travels through a distant shaft. */
	| 'SHAFT_ACTIVITY'
	/** A remote corridor activates. */
	| 'LIGHT_WAKE'
	/** Several structures subtly reconfigure. */
	| 'SYSTEM_SETTLE'
	/** An off-camera event casts light across nearby glass. */
	| 'REFLECTION_PASS'
	/** One system reacts seconds after another. */
	| 'REMOTE_RESPONSE'
	/** A signal disappears behind architecture and reappears elsewhere. */
	| 'DISTANT_ROUTING'
	/** A very subtle low-frequency illumination change across a region. */
	| 'GRID_BREATH'
	/** Environmental illumination shifts hue slightly across a whole zone. */
	| 'AMBIENT_COLOR_DRIFT'
	/** Low-intensity light travels deep beneath the floor. */
	| 'INFRASTRUCTURE_FLOW';

export interface AmbientEvent {
	readonly kind: AmbientEventKind;
	/** Seconds since the event began. */
	age: number;
	readonly duration: number;
	/** Where in the world, in world units. */
	readonly position: [number, number, number];
	/** 0-1 envelope, computed per frame. */
	intensity: number;
	/**
	 * Peak strength. Most events are barely perceptible: a world where
	 * everything moves reads as animated, whereas a world where a few selected
	 * things move unpredictably reads as alive.
	 */
	readonly amplitude: number;
	/** Colour bias, -1 amber … 0 cyan … 1 violet. */
	readonly hue: number;
	/** Set when this event was spawned as a reaction to another. */
	readonly causedBy?: AmbientEventKind;
}

interface FamilySpec {
	readonly kind: AmbientEventKind;
	/** Mean seconds between occurrences. */
	readonly period: number;
	readonly duration: [number, number];
	/** Distance band from the origin this family occupies. */
	readonly radius: [number, number];
	readonly height: [number, number];
	/** Whether this family can trigger a delayed response elsewhere. */
	readonly causal?: boolean;
}

/**
 * Families are tuned so the far world is busier than the near world. Activity
 * the visitor is not looking at is what sells the scale.
 */
const FAMILIES: readonly FamilySpec[] = [
	{ kind: 'DISTANT_PULSE', period: 6.5, duration: [2.2, 4.0], radius: [40, 120], height: [0, 2], causal: true },
	{ kind: 'SIGNAL_CROSSING', period: 11, duration: [3.0, 5.5], radius: [30, 90], height: [18, 26], causal: true },
	{ kind: 'TOWER_SHIFT', period: 17, duration: [4.0, 7.0], radius: [90, 260], height: [10, 80] },
	{ kind: 'SHAFT_ACTIVITY', period: 13, duration: [2.5, 4.5], radius: [60, 130], height: [0, 60], causal: true },
	{ kind: 'LIGHT_WAKE', period: 9, duration: [2.0, 3.5], radius: [50, 150], height: [2, 14] },
	{ kind: 'SYSTEM_SETTLE', period: 23, duration: [5.0, 9.0], radius: [70, 200], height: [4, 40] },
	{ kind: 'REFLECTION_PASS', period: 8, duration: [1.4, 2.6], radius: [12, 45], height: [1, 8] },
	{ kind: 'DISTANT_ROUTING', period: 14, duration: [4.0, 7.0], radius: [80, 220], height: [0, 30], causal: true },
	{ kind: 'GRID_BREATH', period: 19, duration: [7.0, 12.0], radius: [30, 110], height: [0, 1] },
	// Colour itself is ambient behaviour: the environment's hue must not be static.
	{ kind: 'AMBIENT_COLOR_DRIFT', period: 21, duration: [8.0, 14.0], radius: [20, 140], height: [4, 50] },
	// Deep beneath the floor, where the infrastructure keeps working unseen.
	{ kind: 'INFRASTRUCTURE_FLOW', period: 10, duration: [5.0, 9.0], radius: [30, 150], height: [-30, -6], causal: true }
];

/** REMOTE_RESPONSE is never scheduled directly — it only answers another event. */
const RESPONSE_DELAY: [number, number] = [1.8, 4.5];

/** How many recent events to remember, to avoid repeating the same sequence. */
const MEMORY = 6;

export class LivingEnvironmentSystem {
	#elapsed = 0;
	#events: AmbientEvent[] = [];
	#next = new Map<AmbientEventKind, number>();
	#recent: AmbientEventKind[] = [];
	#pending: { at: number; spec: FamilySpec; cause: AmbientEventKind }[] = [];
	#max: number;
	/** Deterministic PRNG, so the world is identical on every load. */
	#seed = 0x2f6e2b1;

	constructor(quality: QualitySettings) {
		// Distant activity is the first thing to go when the frame budget tightens.
		this.#max = quality.tier === 'HIGH' ? 14 : quality.tier === 'MEDIUM' ? 8 : 4;
		// Stagger the first occurrence of each family so they do not all fire at once.
		FAMILIES.forEach((f, i) => this.#next.set(f.kind, this.#random() * f.period + i * 0.7));
	}

	get events(): readonly AmbientEvent[] {
		return this.#events;
	}

	get elapsed() {
		return this.#elapsed;
	}

	setQuality(quality: QualitySettings) {
		this.#max = quality.tier === 'HIGH' ? 14 : quality.tier === 'MEDIUM' ? 8 : 4;
		if (this.#events.length > this.#max) this.#events.length = this.#max;
	}

	update(dt: number, state: ExperienceState) {
		this.#elapsed += dt;

		for (const event of this.#events) {
			event.age += dt;
			// Asymmetric envelope: quick to arrive, slow to leave, like real systems.
			const t = Math.min(1, event.age / event.duration);
			event.intensity = Math.sin(Math.pow(t, 0.6) * Math.PI) * event.amplitude;
		}
		this.#events = this.#events.filter((e) => e.age < e.duration);

		// Events queued as reactions to earlier ones.
		this.#pending = this.#pending.filter((p) => {
			if (this.#elapsed < p.at) return true;
			this.#spawn(p.spec, p.cause);
			return false;
		});

		// The observatory is a calm elevated state, so the world quietens there.
		const calm = 1 - state.alignment * 0.45;

		for (const spec of FAMILIES) {
			const due = this.#next.get(spec.kind) ?? 0;
			if (this.#elapsed < due) continue;

			// Randomised window rather than a fixed interval, so nothing loops.
			const jitter = 0.55 + this.#random() * 0.9;
			this.#next.set(spec.kind, this.#elapsed + (spec.period / calm) * jitter);

			// Recent-event memory prevents the same family repeating back to back.
			if (this.#recent.slice(-2).includes(spec.kind)) continue;
			if (this.#events.length >= this.#max) continue;

			const event = this.#spawn(spec);

			// Off-camera causality: one system reacting to another, seconds later,
			// is what implies the environment exists independently of the camera.
			if (spec.causal && this.#random() > 0.45) {
				const responder = FAMILIES[Math.floor(this.#random() * FAMILIES.length)];
				const delay = RESPONSE_DELAY[0] + this.#random() * (RESPONSE_DELAY[1] - RESPONSE_DELAY[0]);
				this.#pending.push({ at: this.#elapsed + delay, spec: responder, cause: event.kind });
			}
		}
	}

	#spawn(spec: FamilySpec, cause?: AmbientEventKind): AmbientEvent {
		const angle = this.#random() * Math.PI * 2;
		const radius = spec.radius[0] + this.#random() * (spec.radius[1] - spec.radius[0]);
		const height = spec.height[0] + this.#random() * (spec.height[1] - spec.height[0]);

		// Roughly 70% very subtle, 20% clearly observable, 10% major.
		const roll = this.#random();
		const amplitude = roll < 0.7 ? 0.18 + this.#random() * 0.14 : roll < 0.9 ? 0.45 + this.#random() * 0.2 : 0.8 + this.#random() * 0.2;

		const event: AmbientEvent = {
			kind: cause ? 'REMOTE_RESPONSE' : spec.kind,
			age: 0,
			amplitude,
			duration: spec.duration[0] + this.#random() * (spec.duration[1] - spec.duration[0]),
			position: [Math.cos(angle) * radius, height, Math.sin(angle) * radius],
			intensity: 0,
			// Mostly the system's own cyan; amber and violet are occasional accents.
			hue: (this.#random() - 0.5) * (this.#random() > 0.75 ? 2 : 0.35),
			causedBy: cause
		};

		this.#events.push(event);
		this.#recent.push(event.kind);
		if (this.#recent.length > MEMORY) this.#recent.shift();
		return event;
	}

	/**
	 * Aggregate hue drift currently requested by AMBIENT_COLOR_DRIFT events.
	 * Small by design — the environment breathes colour, it does not cycle it.
	 */
	get colorDrift(): number {
		let drift = 0;
		for (const event of this.#events) {
			if (event.kind !== 'AMBIENT_COLOR_DRIFT') continue;
			drift += event.intensity * event.hue;
		}
		return Math.max(-1, Math.min(1, drift));
	}

	/** Aggregate illumination contributed by ambient activity near a point. */
	illuminationAt(x: number, z: number, falloff = 60): number {
		let total = 0;
		for (const event of this.#events) {
			const dx = event.position[0] - x;
			const dz = event.position[2] - z;
			const distance = Math.hypot(dx, dz);
			total += event.intensity * Math.exp(-distance / falloff);
		}
		return Math.min(1, total);
	}

	/** Mulberry32 — small, fast, and deterministic across reloads. */
	#random(): number {
		this.#seed = (this.#seed + 0x6d2b79f5) | 0;
		let t = this.#seed;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	}
}
