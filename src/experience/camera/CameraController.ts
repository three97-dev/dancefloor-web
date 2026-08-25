/**
 * Interpolates the camera between Blender-authored cinematic states.
 *
 * One camera, one continuous journey. The controller never cuts: it walks a
 * Catmull-Rom spline through the active composition's keyframes so the move
 * between acts is a camera move, not a transition.
 */

import { CatmullRomCurve3, PerspectiveCamera, Vector3 } from 'three';
import type { CameraClass, ViewportState } from '../viewport';
import { CAMERA_DESKTOP, CAMERA_MOBILE, CAMERA_TABLET } from './previs';
import type { CameraComposition, CameraKeyframe } from './types';

const COMPOSITIONS: Record<CameraClass, CameraComposition> = {
	desktop: CAMERA_DESKTOP,
	tablet: CAMERA_TABLET,
	mobile: CAMERA_MOBILE
};

export const compositionFor = (cls: CameraClass) => COMPOSITIONS[cls];

/** Smoothstep, so arrivals at each anchor ease rather than snap. */
const ease = (t: number) => t * t * (3 - 2 * t);

export class CameraController {
	readonly camera: PerspectiveCamera;

	#composition: CameraComposition;
	#positionCurve: CatmullRomCurve3;
	#targetCurve: CatmullRomCurve3;
	#target = new Vector3();

	/** Pointer offset in normalized device coords, desktop only. */
	#pointer = { x: 0, y: 0 };
	#pointerSmoothed = { x: 0, y: 0 };

	/**
	 * Lagged progress, so the camera arrives at a position rather than snapping
	 * to it. This is what makes the move feel physically operated instead of
	 * scrubbed: acceleration and deceleration come out of the lag, not out of
	 * easing curves baked into the spline.
	 */
	#smoothedProgress = 0;
	#progressVelocity = 0;

	/** Elapsed time, for the idle drift. */
	#elapsed = 0;
	/** Seconds since progress last changed meaningfully. */
	#still = 0;

	#drift = new Vector3();

	constructor(view: ViewportState) {
		this.#composition = COMPOSITIONS[view.camera];
		this.camera = new PerspectiveCamera(this.#composition.keyframes[0].fov, view.aspect, 0.05, 900);
		const curves = buildCurves(this.#composition);
		this.#positionCurve = curves.position;
		this.#targetCurve = curves.target;
		this.update(0, 0);
	}

	/** Swap composition when the viewport class changes. Never rescale one path. */
	setComposition(cls: CameraClass) {
		if (this.#composition === COMPOSITIONS[cls]) return;
		this.#composition = COMPOSITIONS[cls];
		const curves = buildCurves(this.#composition);
		this.#positionCurve = curves.position;
		this.#targetCurve = curves.target;
	}

	get composition() {
		return this.#composition;
	}

	setAspect(aspect: number) {
		this.camera.aspect = aspect;
		this.camera.updateProjectionMatrix();
	}

	/** Desktop pointer parallax. Ignored when the composition disables it. */
	setPointer(x: number, y: number) {
		this.#pointer.x = x;
		this.#pointer.y = y;
	}

	/**
	 * @param progress normalized master progress, 0-1
	 * @param dt seconds since last frame, for pointer smoothing
	 */
	update(progress: number, dt: number) {
		const target = Math.min(1, Math.max(0, progress));
		this.#elapsed += dt;

		// Critically damped spring toward the scroll position. The camera has
		// mass: it takes a moment to get moving and a moment to settle, and it
		// never overshoots into a bounce.
		const stiffness = 42;
		const damping = 2 * Math.sqrt(stiffness);
		const accel = (target - this.#smoothedProgress) * stiffness - this.#progressVelocity * damping;
		this.#progressVelocity += accel * dt;
		this.#smoothedProgress += this.#progressVelocity * dt;

		const moving = Math.abs(target - this.#smoothedProgress) > 0.0004;
		this.#still = moving ? 0 : this.#still + dt;

		const t = Math.min(1, Math.max(0, this.#smoothedProgress));

		this.#positionCurve.getPoint(t, this.camera.position);
		this.#targetCurve.getPoint(t, this.#target);

		// Idle drift. When scrolling stops the composition must not freeze into
		// a screenshot, so the camera keeps breathing — far below the threshold
		// where it would read as a bob.
		const settled = Math.min(1, this.#still / 0.9);
		if (settled > 0) {
			const a = this.#elapsed * 0.11;
			const b = this.#elapsed * 0.073;
			this.#drift.set(Math.sin(a) * 0.05, Math.sin(b * 1.31) * 0.035, Math.cos(a * 0.87) * 0.05);
			this.camera.position.addScaledVector(this.#drift, settled);
			// A few hundredths of a degree of rotational breathing.
			this.#target.y += Math.sin(b) * 0.03 * settled;
		}

		const parallax = this.#composition.parallax;
		if (parallax > 0) {
			// Critically damped-ish follow so the parallax never feels twitchy.
			const k = 1 - Math.exp(-dt * 6);
			this.#pointerSmoothed.x += (this.#pointer.x - this.#pointerSmoothed.x) * k;
			this.#pointerSmoothed.y += (this.#pointer.y - this.#pointerSmoothed.y) * k;
			this.camera.position.x += this.#pointerSmoothed.x * parallax;
			this.camera.position.y += this.#pointerSmoothed.y * parallax * 0.6;
		}

		this.camera.fov = interpolateFov(this.#composition.keyframes, t);
		this.camera.updateProjectionMatrix();
		this.camera.lookAt(this.#target);
	}

	/** True while the camera is settled and only drifting. */
	get idle() {
		return this.#still > 0.9;
	}

	/** For the debug overlay and the no-WebGL still picker. */
	nearestAnchor(progress: number): CameraKeyframe {
		return this.#composition.keyframes.reduce((best, kf) =>
			Math.abs(kf.at - progress) < Math.abs(best.at - progress) ? kf : best
		);
	}
}

function buildCurves(composition: CameraComposition) {
	const kfs = composition.keyframes;
	return {
		position: new CatmullRomCurve3(kfs.map((k) => new Vector3(...k.position)), false, 'catmullrom', 0.4),
		target: new CatmullRomCurve3(kfs.map((k) => new Vector3(...k.target)), false, 'catmullrom', 0.4)
	};
}

/**
 * FOV is interpolated per-segment rather than along the spline, so a keyframe's
 * declared focal length is honoured exactly when the camera arrives at it.
 */
function interpolateFov(kfs: readonly CameraKeyframe[], t: number): number {
	if (t <= kfs[0].at) return kfs[0].fov;
	const last = kfs[kfs.length - 1];
	if (t >= last.at) return last.fov;

	for (let i = 0; i < kfs.length - 1; i++) {
		const a = kfs[i];
		const b = kfs[i + 1];
		if (t >= a.at && t <= b.at) {
			const span = b.at - a.at;
			const local = span === 0 ? 0 : (t - a.at) / span;
			return a.fov + (b.fov - a.fov) * ease(local);
		}
	}
	return last.fov;
}
