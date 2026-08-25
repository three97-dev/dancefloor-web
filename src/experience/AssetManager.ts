/**
 * Progressive asset loading.
 *
 * The first meaningful frame has to appear quickly, so the world arrives in
 * priority order rather than as one blocking download: hero architecture first,
 * then the upper world that lights it, then recurring geography, and last the
 * far silhouettes that only supply scale.
 *
 * Nothing here blocks the render loop. The experience starts with atmosphere and
 * the Dancefloor, and the architecture appears as it lands.
 */

import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Group } from 'three';

/** Load priority. Lower numbers arrive first. */
export type AssetGroup = 'core' | 'upper' | 'districts' | 'underfloor' | 'far';

/**
 * Priority order. The spaces the visitor is standing in first, then the rooms
 * they travel to, then back-of-house, then the distant extensions.
 */
export const LOAD_ORDER: readonly AssetGroup[] = [
	'core',
	'upper',
	'districts',
	'underfloor',
	'far'
];

export interface LoadedGroup {
	readonly group: AssetGroup;
	readonly scene: Group;
}

export interface AssetManagerOptions {
	/** Base path, so the site works from a subpath as well as the root. */
	base?: string;
	/**
	 * Groups to skip entirely. Mobile at LOW quality does not need the far
	 * silhouettes, and downloading geometry that never appears is waste rather
	 * than art direction.
	 */
	skip?: readonly AssetGroup[];
	/** Called as each group lands, so the world can be assembled incrementally. */
	onGroup: (loaded: LoadedGroup) => void;
}

export class AssetManager {
	#gltf: GLTFLoader;
	#draco: DRACOLoader;
	#base: string;
	#skip: Set<AssetGroup>;
	#onGroup: (loaded: LoadedGroup) => void;
	#disposed = false;
	#loaded = new Set<AssetGroup>();

	constructor(options: AssetManagerOptions) {
		this.#base = options.base ?? '';
		this.#skip = new Set(options.skip ?? []);
		this.#onGroup = options.onGroup;

		this.#draco = new DRACOLoader();
		this.#draco.setDecoderPath(`${this.#base}/draco/`);
		// WASM where available; the JS fallback is much slower but universal.
		this.#draco.setDecoderConfig({ type: 'wasm' });

		this.#gltf = new GLTFLoader();
		this.#gltf.setDRACOLoader(this.#draco);
	}

	get loaded(): readonly AssetGroup[] {
		return [...this.#loaded];
	}

	/**
	 * Loads every group in priority order.
	 *
	 * Sequential rather than parallel on purpose: parallel downloads would let a
	 * far-geometry request compete for bandwidth with the architecture the first
	 * frame actually needs.
	 */
	async loadAll(): Promise<void> {
		for (const group of LOAD_ORDER) {
			if (this.#disposed) return;
			if (this.#skip.has(group)) continue;

			try {
				const gltf = await this.#gltf.loadAsync(`${this.#base}/world/world-${group}.glb`);
				if (this.#disposed) return;
				this.#loaded.add(group);
				this.#onGroup({ group, scene: gltf.scene });
			} catch (error) {
				// A missing group degrades the world; it must not break the site.
				console.warn(`[assets] could not load "${group}"`, error);
			}
		}
	}

	dispose() {
		this.#disposed = true;
		this.#draco.dispose();
	}
}
