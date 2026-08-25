/**
 * The single environment.
 *
 * One scene, built once, that evolves continuously. Nothing here is recreated
 * when the visitor enters a new section — the acts are states of this world,
 * not separate worlds.
 */

import { Scene } from 'three';
import type { QualitySettings } from './quality';
import type { ExperienceState } from './scroll/ExperienceTimeline';
import { AmbientSystem } from './systems/AmbientSystem';
import { AtmosphereSystem } from './systems/AtmosphereSystem';
import { DancefloorSystem } from './systems/DancefloorSystem';
import { EnvironmentSystem } from './systems/EnvironmentSystem';
import { LightingSystem } from './systems/LightingSystem';
import { LivingEnvironmentSystem } from './systems/LivingEnvironmentSystem';
import { SignalSystem } from './systems/SignalSystem';
import { WorldShellSystem } from './systems/WorldShellSystem';
import type { LoadedGroup } from './AssetManager';

export class World {
	readonly scene = new Scene();
	readonly dancefloor: DancefloorSystem;
	readonly signals: SignalSystem;
	readonly environment: EnvironmentSystem;
	readonly lighting: LightingSystem;
	readonly atmosphere: AtmosphereSystem;
	/** The Blender-authored architecture the Dancefloor runs through. */
	readonly shell: WorldShellSystem;
	readonly ambient = new AmbientSystem();
	/** Distant activity, off-camera causality, remote responses. Scroll-independent. */
	readonly living: LivingEnvironmentSystem;

	constructor(quality: QualitySettings) {
		this.scene.name = 'DANCEFLOOR_WORLD';
		// Atmosphere first: everything else is composed inside this volume.
		this.atmosphere = new AtmosphereSystem(this.scene, quality);
		this.lighting = new LightingSystem(this.scene, quality);
		this.shell = new WorldShellSystem(this.scene, quality);
		this.dancefloor = new DancefloorSystem(this.scene, quality);
		this.environment = new EnvironmentSystem(this.scene, quality);
		this.signals = new SignalSystem(this.scene, quality);
		this.living = new LivingEnvironmentSystem(quality);
	}

	/** Receives a priority group as it finishes downloading. */
	addAssets(loaded: LoadedGroup) {
		this.shell.add(loaded);
	}

	update(dt: number, state: ExperienceState) {
		this.ambient.update(dt);
		// Runs off elapsed time, so the world keeps operating when scroll stops.
		this.living.update(dt, state);
		this.dancefloor.update(state, (i, phase) => this.ambient.activityAt(i, phase));
		this.environment.update(state);
		this.signals.update(dt, state);
		this.lighting.update(state);
		this.shell.update(state);
		this.atmosphere.update(state);
	}

	dispose() {
		this.dancefloor.dispose();
		this.signals.dispose();
		this.environment.dispose();
		this.lighting.dispose();
		this.shell.dispose();
		this.atmosphere.dispose();
	}
}
