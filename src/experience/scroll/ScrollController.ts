/**
 * scroll -> Lenis -> normalized experienceProgress -> the rest of the world.
 *
 * The DOM is the single source of scroll height: the thirteen sections are the
 * page, so the journey still works with JavaScript disabled and nothing has to
 * reconcile a phantom spacer against real content.
 *
 * Scroll length per camera class is expressed by setting `--journey-vh`, which
 * the sections divide between themselves. Mobile therefore gets a genuinely
 * shorter journey rather than the desktop distance preserved.
 *
 * Ambient state deliberately does NOT flow through here. When the user stops
 * scrolling the world keeps operating, so ambient runs off elapsed real time
 * in AmbientSystem instead.
 */

import Lenis from 'lenis';
import type { SectionId } from '$content/types';
import { compositionFor } from '../camera/CameraController';
import { spanFor } from './ExperienceTimeline';
import type { CameraClass } from '../viewport';

export interface ScrollControllerOptions {
	cameraClass: CameraClass;
	reducedMotion: boolean;
}

export class ScrollController {
	#lenis: Lenis | null = null;
	#progress = 0;
	#sections: { top: number; bottom: number; from: number; to: number }[] = [];

	constructor(options: ScrollControllerOptions) {
		this.setScrollLength(options.cameraClass);

		// Reduced motion keeps native scrolling — smoothing is itself motion.
		if (!options.reducedMotion) {
			this.#lenis = new Lenis({
				duration: 1.1,
				smoothWheel: true,
				// Never smooth touch scrolling; it fights the platform.
				syncTouch: false
			});
		}

		this.measure();
		window.addEventListener('scroll', this.#read, { passive: true });
		window.addEventListener('resize', this.#onResize, { passive: true });
	}

	/**
	 * Mobile must not preserve desktop scroll distance. Narrative rhythm matters
	 * more than numeric parity, so each class declares its own length in vh.
	 */
	setScrollLength(cls: CameraClass) {
		document.documentElement.style.setProperty(
			'--journey-vh',
			String(compositionFor(cls).scrollVh)
		);
		// Section heights just changed, so the map is stale.
		requestAnimationFrame(() => this.measure());
	}

	get progress() {
		return this.#progress;
	}

	/**
	 * Re-measures section positions. Cheap, and only called on resize or when
	 * the scroll length changes.
	 */
	measure() {
		this.#sections = Array.from(
			document.querySelectorAll<HTMLElement>('main section[id]')
		).map((el) => {
			const rect = el.getBoundingClientRect();
			const top = rect.top + window.scrollY;
			// Each section declares the slice of the journey it owns.
			const [from, to] = spanFor(el.id as SectionId);
			return { top, bottom: top + rect.height, from, to };
		});
		this.#read();
	}

	/** Driven from the main loop so Lenis shares one rAF with the renderer. */
	raf(timeMs: number) {
		this.#lenis?.raf(timeMs);
	}

	/** Pause momentum while an overlay such as the mobile menu is open. */
	setPaused(paused: boolean) {
		if (!this.#lenis) return;
		if (paused) this.#lenis.stop();
		else this.#lenis.start();
	}

	/**
	 * Maps raw scroll onto *narrative* progress.
	 *
	 * Progress cannot be raw document scroll: the footer sits below the thirteen
	 * sections, so a straight scrollY/scrollHeight would run the acts ahead of
	 * the copy they are supposed to depict.
	 *
	 * Nor can the sections be treated as equal thirteenths. The narrative
	 * allocation is deliberately uneven — Fracture and ROAD own 12% each while
	 * Security owns 3% — so each section is measured in the DOM and mapped onto
	 * the span it declares. Section heights are derived from the same spans, so
	 * the two agree by construction.
	 *
	 * A section is active while the centre of the viewport is inside it.
	 */
	#read = () => {
		const sections = this.#sections;
		const count = sections.length;
		if (count === 0) {
			const scrollable = document.documentElement.scrollHeight - window.innerHeight;
			this.#progress = scrollable <= 0 ? 0 : clamp01(window.scrollY / scrollable);
			return;
		}

		const centre = window.scrollY + window.innerHeight / 2;

		// Past the last section (the footer): hold at the end of the journey.
		if (centre >= sections[count - 1].bottom) {
			this.#progress = 1;
			return;
		}

		for (let i = 0; i < count; i++) {
			const { top, bottom, from, to } = sections[i];
			if (centre < bottom) {
				const height = bottom - top;
				const local = height <= 0 ? 0 : clamp01((centre - top) / height);
				this.#progress = clamp01(from + (to - from) * local);
				return;
			}
		}

		this.#progress = 1;
	};

	#onResize = () => this.measure();

	dispose() {
		window.removeEventListener('scroll', this.#read);
		window.removeEventListener('resize', this.#onResize);
		this.#lenis?.destroy();
		this.#lenis = null;
	}
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
