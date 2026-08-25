/**
 * Mock revenue data for the 3D acts and the ROAD table.
 *
 * This exists so tile height means real book coverage rather than noise.
 * Elevation in Act III is driven from these numbers — never decorative.
 * Replace with real (or realistic customer-shaped) data before launch; do not
 * present any of it as evidence of a real customer.
 */

export interface Patch {
	/** Stable identifier, also used as the tile ID prefix. */
	readonly id: string;
	readonly rep: string;
	readonly segment: 'enterprise' | 'mid-market' | 'smb';
	/** Named accounts assigned to the rep. */
	readonly intentAccounts: number;
	/** Open opportunity value as a multiple of quota. 1.0 = exactly covered. */
	readonly coverage: number;
	/** Distribution of open pipeline across stages, summing to 1. */
	readonly stageMix: Readonly<Record<DealStage, number>>;
}

export type DealStage = 'discovery' | 'validation' | 'proposal' | 'commit';

export const DEAL_STAGES: readonly DealStage[] = ['discovery', 'validation', 'proposal', 'commit'];

/**
 * Coverage below this multiple means the rep cannot mathematically hit quota.
 * Act III reads this as the line between a sunken tile and a raised one.
 */
export const COVERAGE_TARGET = 3.0;

export const PATCHES: readonly Patch[] = [
	{ id: 'p01', rep: 'Rep 01', segment: 'mid-market', intentAccounts: 84, coverage: 3.8, stageMix: { discovery: 0.42, validation: 0.28, proposal: 0.19, commit: 0.11 } },
	{ id: 'p02', rep: 'Rep 02', segment: 'mid-market', intentAccounts: 61, coverage: 1.9, stageMix: { discovery: 0.55, validation: 0.24, proposal: 0.14, commit: 0.07 } },
	{ id: 'p03', rep: 'Rep 03', segment: 'enterprise', intentAccounts: 32, coverage: 4.4, stageMix: { discovery: 0.31, validation: 0.3, proposal: 0.24, commit: 0.15 } },
	{ id: 'p04', rep: 'Rep 04', segment: 'mid-market', intentAccounts: 77, coverage: 2.6, stageMix: { discovery: 0.48, validation: 0.26, proposal: 0.17, commit: 0.09 } },
	{ id: 'p05', rep: 'Rep 05', segment: 'smb', intentAccounts: 129, coverage: 3.1, stageMix: { discovery: 0.5, validation: 0.25, proposal: 0.16, commit: 0.09 } },
	{ id: 'p06', rep: 'Rep 06', segment: 'enterprise', intentAccounts: 28, coverage: 1.4, stageMix: { discovery: 0.62, validation: 0.21, proposal: 0.12, commit: 0.05 } },
	{ id: 'p07', rep: 'Rep 07', segment: 'mid-market', intentAccounts: 69, coverage: 3.3, stageMix: { discovery: 0.4, validation: 0.29, proposal: 0.2, commit: 0.11 } },
	{ id: 'p08', rep: 'Rep 08', segment: 'smb', intentAccounts: 141, coverage: 2.2, stageMix: { discovery: 0.57, validation: 0.23, proposal: 0.13, commit: 0.07 } },
	{ id: 'p09', rep: 'Rep 09', segment: 'mid-market', intentAccounts: 58, coverage: 4.9, stageMix: { discovery: 0.35, validation: 0.28, proposal: 0.22, commit: 0.15 } },
	{ id: 'p10', rep: 'Rep 10', segment: 'enterprise', intentAccounts: 24, coverage: 2.9, stageMix: { discovery: 0.44, validation: 0.27, proposal: 0.18, commit: 0.11 } },
	{ id: 'p11', rep: 'Rep 11', segment: 'mid-market', intentAccounts: 91, coverage: 0.9, stageMix: { discovery: 0.71, validation: 0.18, proposal: 0.08, commit: 0.03 } },
	{ id: 'p12', rep: 'Rep 12', segment: 'smb', intentAccounts: 118, coverage: 3.6, stageMix: { discovery: 0.46, validation: 0.27, proposal: 0.18, commit: 0.09 } }
];

/**
 * Normalized elevation for a patch, 0-1, where the coverage target sits at 0.5.
 * Act III maps this straight onto tile height, so a rep who cannot hit quota is
 * visibly below the plane and a rep with room to work is visibly above it.
 */
export function coverageElevation(patch: Patch): number {
	const ratio = patch.coverage / COVERAGE_TARGET;
	// Compress so extreme coverage does not produce an absurd spike.
	const compressed = ratio <= 1 ? ratio * 0.5 : 0.5 + (1 - Math.exp(-(ratio - 1) * 1.2)) * 0.5;
	return Math.min(1, Math.max(0, compressed));
}

/** Reps who cannot mathematically get there. Act II isolates these. */
export const uncoveredPatches = () => PATCHES.filter((p) => p.coverage < COVERAGE_TARGET);

/**
 * The Dancefloor grid. Tiles carry stable IDs of the form `tile_r05_c12`.
 * Grid size is a rendering-quality decision, so the runtime picks the actual
 * dimensions per quality tier; these are the authored maxima.
 */
export const GRID = {
	rows: 48,
	cols: 48,
	/** Tile edge length in world units. */
	tileSize: 1,
	/** Gap between tiles, as a fraction of tileSize. Widens during Fracture. */
	seam: 0.04
} as const;

export const tileId = (row: number, col: number) =>
	`tile_r${String(row).padStart(2, '0')}_c${String(col).padStart(2, '0')}`;
