/**
 * One normalized master progress, 0-1, and everything derived from it.
 *
 * Logic is not coupled to pixel positions: systems read this state object, and
 * the only thing that knows about scroll is ScrollController.
 */

import { ACTS } from '$content/site';
import type { ActId } from '$content/types';

export interface ExperienceState {
	/** Master progress, 0-1. */
	progress: number;
	activeAct: ActId;
	/** Progress within the active act, 0-1. */
	actProgress: number;
	/** Seconds since the experience started. Ambient time, not scroll. */
	elapsed: number;
	/** How separated the field is, 0 = one plane, 1 = fully fractured. */
	fracture: number;
	/** How strongly coverage terrain drives tile height, 0-1. */
	terrain: number;
	/** Strength of the guidance corridor, 0-1. */
	corridor: number;
	/** Signal traffic on the return path, 0-1. */
	returnPath: number;
	/** Convergence into one connected architecture, 0-1. */
	alignment: number;
	/** City reveal, 0-1. */
	city: number;
	/** Fog density multiplier. */
	fog: number;
}

/**
 * Where each act owns the timeline.
 *
 * These are derived from where the sections actually sit in the document, not
 * chosen by feel: the thirteen sections divide the scroll evenly, so section i
 * spans [(i-1)/13, i/13]. An act therefore covers exactly the span of the
 * sections it backs — which is the whole premise, since the act has to depict
 * what the section on screen is claiming.
 *
 * Act VI extends past its own section to cover the five commercial sections.
 * That is deliberate: the observatory is a calm elevated state above the
 * resolved one-plane world, not a new environment.
 */
const S = (i: number) => i / 13;

const ACT_RANGES: Record<ActId, [number, number]> = {
	ACT_I_FIELD_AT_REST: [S(0), S(2)], // hero, thesis
	ACT_II_FRACTURE: [S(2), S(3)], // problem
	ACT_III_THE_PATCH: [S(3), S(4)], // road
	ACT_IV_THE_RISE: [S(4), S(5)], // guidance
	ACT_V_RETURN_PATH: [S(5), S(6)], // capture
	ACT_VI_ONE_PLANE: [S(6), S(12)], // model, then the observatory sections
	ACT_VII_THE_CITY: [S(12), 1.0] // close
};

/** Section boundaries, for readability in the ramps below. */
export const SECTION_AT = S;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Ramp from 0 to 1 across [a, b], clamped outside. */
const ramp = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));

/** Rise across [a,b] then fall across [c,d]. */
const band = (v: number, a: number, b: number, c: number, d: number) =>
	Math.min(ramp(v, a, b), 1 - ramp(v, c, d));

export function actAt(progress: number): ActId {
	for (const act of ACTS) {
		const [start, end] = ACT_RANGES[act.id];
		if (progress >= start && progress < end) return act.id;
	}
	return 'ACT_VII_THE_CITY';
}

export function actProgressAt(progress: number, act: ActId): number {
	const [start, end] = ACT_RANGES[act];
	return clamp01((progress - start) / (end - start));
}

export function deriveState(progress: number, elapsed: number): ExperienceState {
	const p = clamp01(progress);
	const activeAct = actAt(p);

	return {
		progress: p,
		activeAct,
		actProgress: actProgressAt(p, activeAct),
		elapsed,
		// Fracture opens over the problem section and only fully closes when
		// One Plane pulls the separated regions back together.
		fracture: band(p, S(2), S(3), S(6), S(7)),
		// Coverage terrain rises for ROAD and stays as the ground beneath.
		terrain: band(p, S(3), S(4), S(11), S(12)),
		// The guidance corridor opens, then flattens into the aligned plane.
		corridor: band(p, S(4), S(5), S(6), S(7)),
		// Return-path traffic peaks over capture and persists more quietly after.
		returnPath: band(p, S(5), S(6), S(11.5), S(12.5)),
		// Alignment resolves across the model section and holds through the
		// observatory, which is why the commercial sections feel calm.
		alignment: ramp(p, S(6), S(7)),
		city: ramp(p, S(12), 1.0),
		// Air thins as the camera climbs out of the field for the city reveal.
		fog: 1 - ramp(p, S(12), 1.0) * 0.65
	};
}

export const ACT_BOUNDARIES = ACT_RANGES;
