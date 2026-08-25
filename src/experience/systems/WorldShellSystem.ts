/**
 * The architectural world, loaded from Blender.
 *
 * Blender authors the geometry; this gives it runtime materials and makes it
 * respond to the act's colour territory. The greybox clay the .blend carries is
 * for authoring only — shipping it would put flat grey boxes in a luminous
 * world — so every material is replaced on arrival.
 *
 * The rule this exists to satisfy: the Dancefloor is the operating fabric
 * running through the world, not the world itself.
 */

import {
	Color,
	Group,
	Mesh,
	MeshStandardMaterial,
	type Object3D,
	type Scene
} from 'three';
import type { AssetGroup, LoadedGroup } from '../AssetManager';
import type { QualitySettings } from '../quality';
import type { ExperienceState } from '../scroll/ExperienceTimeline';

/**
 * Runtime materials, keyed by the Blender material they replace.
 *
 * All medium-value: coloured light cannot register on near-black surfaces, and
 * an environment where every material is black resolves as black-plus-neon
 * however good the lighting rig is.
 */
interface SurfaceSpec {
	color: Color;
	roughness: number;
	metalness: number;
	/** Self-lit architecture — the environment's own light sources. */
	emissive?: 'key' | 'counter' | 'accent' | 'haze';
	emissiveScale?: number;
}

/**
 * The locked material library, keyed by the Blender material it replaces.
 *
 * Eight primary families, assigned by architectural role rather than object by
 * object. All medium-value: coloured light cannot register on near-black
 * surfaces, and an environment where every material is black resolves as
 * black-plus-neon however good the lighting rig is.
 */
const SURFACE_BY_MATERIAL: Record<string, SurfaceSpec> = {
	// Major structural mass. Medium-dark graphite, never pure black.
	DF_concrete: { color: new Color('#5c6470'), roughness: 0.82, metalness: 0.02 },
	// Frames, structure, bridge elements, mullions.
	DF_steel: { color: new Color('#4b5361'), roughness: 0.44, metalness: 0.82 },
	// Barriers, partitions, facade volumes.
	DF_glass: { color: new Color('#6f8296'), roughness: 0.12, metalness: 0.0 },
	// Diffused light sources and architectural light fins.
	DF_acrylic: { color: new Color('#8496a8'), roughness: 0.5, metalness: 0.0, emissive: 'haze', emissiveScale: 0.5 },
	// Hospitality-scale surfaces. Receives coloured reflection well.
	DF_stone: { color: new Color('#525c6b'), roughness: 0.28, metalness: 0.05 },
	// Refined trims, ceiling details, mechanical parts.
	DF_aluminium: { color: new Color('#7d8794'), roughness: 0.34, metalness: 0.9 },
	// Computational volumes; light scatters through them.
	DF_resin: { color: new Color('#6b7a90'), roughness: 0.42, metalness: 0.0, emissive: 'counter', emissiveScale: 0.8 },
	// Infrastructure layers. More utilitarian, same core palette.
	DF_technical: { color: new Color('#464e5b'), roughness: 0.72, metalness: 0.3 },
	// Integrated architectural light: coves, reveals, canopy panels, rails.
	DF_luminous: { color: new Color('#93a5b8'), roughness: 0.38, metalness: 0.0, emissive: 'key', emissiveScale: 3.2 }
};

const FALLBACK: SurfaceSpec = { color: new Color('#5c6470'), roughness: 0.78, metalness: 0.05 };

/** Groups that only supply silhouette can drop out first under pressure. */
const OPTIONAL: readonly AssetGroup[] = ['far'];

export class WorldShellSystem {
	readonly root = new Group();

	#materials = new Map<string, MeshStandardMaterial>();
	#emissiveRoles = new Map<MeshStandardMaterial, SurfaceSpec['emissive']>();
	#emissiveScales = new Map<MeshStandardMaterial, number>();
	#groups = new Map<AssetGroup, Group>();
	#quality: QualitySettings;
	#emissiveColor = new Color();

	constructor(scene: Scene, quality: QualitySettings) {
		this.#quality = quality;
		this.root.name = 'WORLD_SHELL';
		scene.add(this.root);
	}

	/** Called as each priority group arrives. */
	add({ group, scene }: LoadedGroup) {
		const container = new Group();
		container.name = `WORLD_${group.toUpperCase()}`;

		scene.traverse((node: Object3D) => {
			if (!(node as Mesh).isMesh) return;
			const mesh = node as Mesh;
			// The shell receives shadow but does not cast it. In a 200m hall a
			// single directional light throws the interior into near-total
			// shadow, which crushes exactly the surfaces that are supposed to
			// stay readable. The Dancefloor still casts, where it reads.
			mesh.castShadow = false;
			mesh.receiveShadow = this.#quality.shadows;
			// Far geometry is silhouette only and never needs to be tested.
			mesh.frustumCulled = group !== 'far';
			mesh.material = this.#materialFor(mesh.material);
		});

		container.add(scene);
		this.root.add(container);
		this.#groups.set(group, container);
	}

	has(group: AssetGroup) {
		return this.#groups.has(group);
	}

	/**
	 * Drops optional geometry when the frame budget tightens.
	 *
	 * Complexity is reduced, never the art direction: the ambient colour and the
	 * primary architecture stay whatever the tier.
	 */
	setComplexity(level: number) {
		for (const group of OPTIONAL) {
			const container = this.#groups.get(group);
			if (container) container.visible = level > 0.35;
		}
	}

	update(state: ExperienceState) {
		const t = state.territory;
		// Self-lit architecture tracks the territory, so the world's own light
		// sources shift colour with the act rather than staying fixed.
		for (const [material, role] of this.#emissiveRoles) {
			if (!role) continue;
			this.#emissiveColor.copy(t[role]);
			material.emissive.copy(this.#emissiveColor);
			material.emissiveIntensity =
				(this.#emissiveScales.get(material) ?? 1) * (0.55 + state.city * 0.5 + state.alignment * 0.15);
		}
	}

	#materialFor(source: Mesh['material']): MeshStandardMaterial {
		const name = Array.isArray(source) ? source[0]?.name : source?.name;
		const key = name ?? 'default';

		const existing = this.#materials.get(key);
		if (existing) return existing;

		const spec = SURFACE_BY_MATERIAL[key] ?? FALLBACK;
		const material = new MeshStandardMaterial({
			color: spec.color.clone(),
			roughness: spec.roughness,
			metalness: spec.metalness
		});

		if (spec.emissive) {
			material.emissive = new Color(0x000000);
			material.emissiveIntensity = (spec.emissiveScale ?? 1) * 0.55;
			this.#emissiveRoles.set(material, spec.emissive);
			this.#emissiveScales.set(material, spec.emissiveScale ?? 1);
		}

		this.#materials.set(key, material);
		return material;
	}

	dispose() {
		for (const material of this.#materials.values()) material.dispose();
		this.root.traverse((node) => {
			const mesh = node as Mesh;
			if (mesh.isMesh) mesh.geometry?.dispose();
		});
		this.root.removeFromParent();
	}
}
