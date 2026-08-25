/**
 * One normalized master progress, 0-1, and everything derived from it.
 *
 * Logic is not coupled to pixel positions: systems read this state object, and
 * the only thing that knows about scroll is ScrollController.
 */

import { ACTS, SECTIONS } from '$content/site';
import { blendTerritory, TERRITORIES, type ColorTerritory } from '../palette';
import type { ActId, Section } from '$content/types';

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
	/**
	 * The colour world at this moment, blended across the act boundary.
	 *
	 * Colour progresses continuously with the camera. A hard palette swap at an
	 * act boundary would read as the scene cut the whole experience forbids.
	 */
	territory: ColorTerritory;
}

/** Acts in order, so a territory can blend into the one that follows it. */
const ACT_ORDER = ACTS.map((a) => a.id);

function territoryAt(progress: number, act: ActId): ColorTerritory {
	const index = ACT_ORDER.indexOf(act);
	const next = ACT_ORDER[Math.min(ACT_ORDER.length - 1, index + 1)];
	const [start, end] = ACT_RANGES[act];
	const local = end === start ? 0 : (progress - start) / (end - start);
	// Blend only over the last third of an act, so each territory has time to
	// establish itself before it starts becoming the next one.
	const t = Math.max(0, (local - 0.66) / 0.34);
	return blendTerritory(TERRITORIES[act], TERRITORIES[next], Math.min(1, t));
}

/**
 * Where each act owns the timeline.
 *
 * Derived from the narrative allocation the brief specifies, not from equal
 * division. The allocation is deliberately uneven: the cinematic acts need room
 * to breathe and the commercial sections do not. An act therefore spans exactly
 * the sections it backs, and those spans are declared on the sections
 * themselves so the DOM and the world cannot drift apart.
 *
 * Act VI extends past its own section to cover the five commercial sections.
 * That is deliberate: the Observatory is a calm elevated state above the
 * resolved one-plane world, not a new environment.
 */
function actRange(act: ActId): [number, number] {
	const owned = SECTIONS.filter((s) => s.act === act);
	if (owned.length === 0) return [0, 1];
	return [owned[0].span[0], owned[owned.length - 1].span[1]];
}

const ACT_RANGES: Record<ActId, [number, number]> = {
	ACT_I_FIELD_AT_REST: actRange('ACT_I_FIELD_AT_REST'),
	ACT_II_FRACTURE: actRange('ACT_II_FRACTURE'),
	ACT_III_THE_PATCH: actRange('ACT_III_THE_PATCH'),
	ACT_IV_THE_RISE: actRange('ACT_IV_THE_RISE'),
	ACT_V_RETURN_PATH: actRange('ACT_V_RETURN_PATH'),
	// One Plane holds through Audience, Differentiation, Security, Pricing, FAQ.
	ACT_VI_ONE_PLANE: [
		actRange('ACT_VI_ONE_PLANE')[0],
		SECTIONS[SECTIONS.length - 1].span[0]
	],
	ACT_VII_THE_CITY: actRange('ACT_VII_THE_CITY')
};

/** A section's span, by id. Used by the scroll mapping and the debug overlay. */
export const spanFor = (id: Section['id']): [number, number] => {
	const section = SECTIONS.find((s) => s.id === id);
	return section ? [section.span[0], section.span[1]] : [0, 1];
};

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

	const [fractureIn, fractureOut] = ACT_RANGES.ACT_II_FRACTURE;
	const [terrainIn, terrainOut] = ACT_RANGES.ACT_III_THE_PATCH;
	const [corridorIn, corridorOut] = ACT_RANGES.ACT_IV_THE_RISE;
	const [returnIn, returnOut] = ACT_RANGES.ACT_V_RETURN_PATH;
	const [alignIn, alignOut] = [ACT_RANGES.ACT_VI_ONE_PLANE[0], spanFor('model')[1]];
	const [cityIn, cityOut] = ACT_RANGES.ACT_VII_THE_CITY;

	return {
		progress: p,
		activeAct,
		actProgress: actProgressAt(p, activeAct),
		elapsed,
		// Fracture opens over the problem section and only fully closes when
		// One Plane pulls the separated regions back together.
		fracture: band(p, fractureIn, fractureOut, alignIn, alignOut),
		// Coverage terrain rises for ROAD and stays as the ground beneath.
		terrain: band(p, terrainIn, terrainOut, spanFor('faq')[0], spanFor('faq')[1]),
		// The guidance corridor opens, then flattens into the aligned plane.
		corridor: band(p, corridorIn, corridorOut, alignIn, alignOut),
		// Return-path traffic peaks over capture and persists more quietly after.
		returnPath: band(p, returnIn, returnOut, spanFor('faq')[0], cityIn),
		// Alignment resolves across the model section and holds through the
		// observatory, which is why the commercial sections feel calm.
		alignment: ramp(p, alignIn, alignOut),
		city: ramp(p, cityIn, cityOut),
		// Air thins as the camera climbs out of the field for the city reveal.
		fog: 1 - ramp(p, cityIn, cityOut) * 0.65,
		territory: territoryAt(p, activeAct)
	};
}

export const ACT_BOUNDARIES = ACT_RANGES;
