/**
 * Rendering quality tiers.
 *
 * Viewport width alone is insufficient, so the tier is chosen from screen size,
 * device memory, GPU capability and observed frame timing. The tier is not
 * exposed to users unless necessary.
 */

import type { ViewportState } from './viewport';

export type QualityTier = 'HIGH' | 'MEDIUM' | 'LOW';

export interface QualitySettings {
	tier: QualityTier;
	/** Never blindly window.devicePixelRatio. */
	pixelRatio: number;
	grid: { rows: number; cols: number };
	shadows: boolean;
	shadowMapSize: number;
	bloom: boolean;
	bloomResolutionScale: number;
	filmGrain: boolean;
	vignette: boolean;
	depthOfField: boolean;
	/** Concurrent travelling signals. */
	maxSignals: number;
	atmosphericLayers: number;
	/** Underfloor infrastructure geometry density, 0-1. */
	underfloorDensity: number;
	maxLights: number;
	anisotropy: number;
}

interface GpuProbe {
	webgl2: boolean;
	renderer: string;
	maxTextureSize: number;
}

/** Probes a throwaway context; the real renderer creates its own. */
export function probeGpu(): GpuProbe {
	const canvas = document.createElement('canvas');
	const gl2 = canvas.getContext('webgl2');
	const gl = gl2 ?? (canvas.getContext('webgl') as WebGLRenderingContext | null);
	if (!gl) return { webgl2: false, renderer: 'none', maxTextureSize: 0 };

	let renderer = 'unknown';
	const ext = gl.getExtension('WEBGL_debug_renderer_info');
	if (ext) renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? 'unknown');

	const probe = {
		webgl2: Boolean(gl2),
		renderer,
		maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number
	};
	gl.getExtension('WEBGL_lose_context')?.loseContext();
	return probe;
}

const SETTINGS: Record<QualityTier, Omit<QualitySettings, 'tier' | 'pixelRatio'>> = {
	HIGH: {
		grid: { rows: 48, cols: 48 },
		shadows: true,
		shadowMapSize: 2048,
		bloom: true,
		bloomResolutionScale: 0.5,
		filmGrain: true,
		vignette: true,
		depthOfField: true,
		maxSignals: 24,
		atmosphericLayers: 3,
		underfloorDensity: 1,
		maxLights: 6,
		anisotropy: 8
	},
	MEDIUM: {
		grid: { rows: 36, cols: 36 },
		shadows: true,
		shadowMapSize: 1024,
		bloom: true,
		bloomResolutionScale: 0.35,
		filmGrain: true,
		vignette: true,
		depthOfField: false,
		maxSignals: 12,
		atmosphericLayers: 2,
		underfloorDensity: 0.6,
		maxLights: 4,
		anisotropy: 4
	},
	LOW: {
		grid: { rows: 24, cols: 24 },
		shadows: false,
		shadowMapSize: 512,
		bloom: true,
		bloomResolutionScale: 0.25,
		filmGrain: false,
		vignette: true,
		depthOfField: false,
		maxSignals: 6,
		atmosphericLayers: 1,
		underfloorDensity: 0.3,
		maxLights: 2,
		anisotropy: 1
	}
};

function clampPixelRatio(tier: QualityTier, isMobile: boolean): number {
	const dpr = window.devicePixelRatio || 1;
	// Desktop may go to ~1.5-2; mobile caps around 1-1.5.
	const ceiling = isMobile ? (tier === 'LOW' ? 1 : 1.5) : tier === 'HIGH' ? 2 : 1.5;
	return Math.min(dpr, ceiling);
}

export function chooseQuality(view: ViewportState, gpu = probeGpu()): QualitySettings {
	const isMobile = view.camera === 'mobile';
	const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
	const cores = navigator.hardwareConcurrency ?? 4;
	const software = /swiftshader|llvmpipe|software/i.test(gpu.renderer);

	let tier: QualityTier;
	if (!gpu.webgl2 || software || memory <= 2 || cores <= 2) tier = 'LOW';
	else if (isMobile || memory <= 4 || cores <= 4 || gpu.maxTextureSize < 8192) tier = 'MEDIUM';
	else tier = 'HIGH';

	return { tier, pixelRatio: clampPixelRatio(tier, isMobile), ...SETTINGS[tier] };
}

/** One step down, for the frame-rate adaptation ladder. */
export function degrade(current: QualitySettings, isMobile: boolean): QualitySettings | null {
	const next: Record<QualityTier, QualityTier | null> = { HIGH: 'MEDIUM', MEDIUM: 'LOW', LOW: null };
	const tier = next[current.tier];
	if (!tier) return null;
	return { tier, pixelRatio: clampPixelRatio(tier, isMobile), ...SETTINGS[tier] };
}
