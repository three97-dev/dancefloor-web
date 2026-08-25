/**
 * Viewport classification.
 *
 * Responsiveness here is not a desktop site scaled down. Each class keeps the
 * same content order, narrative meaning, visual metaphor and seven acts, but
 * camera choreography, object density, depth and UI placement all differ.
 *
 * 3D behavior responds to viewport state in JavaScript, not only CSS.
 */

export type ViewportClass = 'desktop-large' | 'desktop' | 'tablet' | 'mobile-large' | 'mobile-small';

/** The three deliberate experiences the classes collapse into. */
export type CameraClass = 'desktop' | 'tablet' | 'mobile';

export const BREAKPOINTS = {
	desktopLarge: 1440,
	desktop: 1024,
	tablet: 768,
	mobileLarge: 480
} as const;

export function classifyViewport(width: number): ViewportClass {
	if (width >= BREAKPOINTS.desktopLarge) return 'desktop-large';
	if (width >= BREAKPOINTS.desktop) return 'desktop';
	if (width >= BREAKPOINTS.tablet) return 'tablet';
	if (width >= BREAKPOINTS.mobileLarge) return 'mobile-large';
	return 'mobile-small';
}

export function cameraClassFor(viewport: ViewportClass): CameraClass {
	switch (viewport) {
		case 'desktop-large':
		case 'desktop':
			return 'desktop';
		case 'tablet':
			return 'tablet';
		default:
			return 'mobile';
	}
}

export type Orientation = 'portrait' | 'landscape';

export interface ViewportState {
	readonly width: number;
	readonly height: number;
	readonly aspect: number;
	readonly viewport: ViewportClass;
	readonly camera: CameraClass;
	readonly orientation: Orientation;
	/** True for coarse pointers — do not emulate hover. */
	readonly touch: boolean;
	readonly reducedMotion: boolean;
}

export function readViewportState(): ViewportState {
	const width = window.innerWidth;
	const height = window.innerHeight;
	const viewport = classifyViewport(width);
	return {
		width,
		height,
		aspect: width / height,
		viewport,
		camera: cameraClassFor(viewport),
		orientation: height >= width ? 'portrait' : 'landscape',
		touch: window.matchMedia('(pointer: coarse)').matches,
		reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
	};
}
