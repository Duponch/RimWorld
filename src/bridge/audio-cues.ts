import type { World } from '../sim/types.ts';
import { isConstruction } from '../sim/construction-rules.ts';
import { isTailoring, stationAccepts, taskRecipe } from '../sim/production-recipes.ts';
import { WORK_FRACTIONS } from '../sim/work-progress.ts';
import { isColonist } from '../sim/affiliation.ts';
import type { AnimalSpeciesId } from '../sim/animal-species.ts';

type AnimalVoiceSpecies = Exclude<AnimalSpeciesId, 'snow-hare'>;
const animalVoiceSpecies = (species:AnimalSpeciesId):AnimalVoiceSpecies =>
  species === 'snow-hare' ? 'hare' : species;

export type AudioCueKind = 'mining.hit' | 'woodcutting.hit' | 'construction.hit'
  | 'cooking.work' | 'crafting.work' | 'tailoring.work' | 'butchering.work' | 'research.work'
  | 'weapon.gunshot' | 'weapon.melee' | 'door.open' | 'door.close'
  | 'haul.pickup' | 'haul.drop' | 'farming.sow' | 'farming.harvest' | 'eating.work'
  | 'cleaning.work' | 'medical.tend' | 'maintenance.work'
  | 'autodoor.open' | 'autodoor.close' | 'weather.thunder'
  | `animal.hurt.${AnimalVoiceSpecies}` | `animal.death.${AnimalVoiceSpecies}`
  | 'ui.threat' | 'ui.colonist-death'
  | 'ui.click' | 'ui.reject' | 'ui.panel';
export interface AudioCue {
  id: string;
  tick: number;
  kind: AudioCueKind;
  x: number;
  z: number;
  intensity?: number;
}

const MAX_CUES_PER_TICK = 32;
const MAX_PENDING_CUES = 128;
// Short, bounded gaps keep each action legible without a metronomic loop.
const WORK_CUE_INTERVAL_TICKS = [2, 3, 4, 5] as const;
const STATION_CUE_INTERVAL_TICKS = [5, 6, 7, 8, 9, 10, 11] as const;
const EATING_CUE_INTERVAL_TICKS = [4, 5, 6, 7] as const;

type WorkObservation = { key: string; progress: number; nextCueTick: number; cueCount: number };
type HaulObservation = { sourcePileId: number; phase: 'pickup' | 'deliver'; carryPileId: number | null;
  x: number; z: number; whole: boolean };

function workCueInterval(pawnId: number, key: string, cueCount: number, intervals: readonly number[]): number {
  // This hash belongs to presentation only; it consumes no simulation random state.
  let hash = (2166136261 ^ pawnId ^ Math.imul(cueCount, 0x9e3779b9)) >>> 0;
  for (let index = 0; index < key.length; index++)
    hash = Math.imul(hash ^ key.charCodeAt(index), 16777619) >>> 0;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d) >>> 0;
  hash ^= hash >>> 15;
  return intervals[(hash >>> 0) % intervals.length]!;
}

/** Presentation-only observer. Its state is neither simulation input nor saved. */
export class AudioCueRecorder {
  private initialized = false;
  private tick = -1;
  private tickCount = 0;
  private readonly pending: AudioCue[] = [];
  private work = new Map<number, WorkObservation>();
  private projectiles = new Set<number>();
  private shooting = new Map<number, number>();
  private melee = new Map<number, number>();
  private doors = new Map<number, boolean>();
  private hauls = new Map<number, HaulObservation>();
  private pawnStates = new Map<number, string>();
  private animalStates = new Map<number, { state: string; injurySeverity: number }>();
  private lightningCount = 0;
  private raidId: number | null = null;

  reset(): void {
    this.initialized = false;
    this.tick = -1;
    this.tickCount = 0;
    this.pending.length = 0;
    this.work.clear();
    this.projectiles.clear();
    this.shooting.clear();
    this.melee.clear();
    this.doors.clear();
    this.hauls.clear();
    this.pawnStates.clear();
    this.animalStates.clear();
    this.lightningCount = 0;
    this.raidId = null;
  }

  capture(world: World): void {
    if (world.tick !== this.tick) { this.tick = world.tick; this.tickCount = 0; }
    const previousWork = this.work;
    const previousProjectiles = this.projectiles;
    const previousShooting = this.shooting;
    const previousMelee = this.melee;
    const previousDoors = this.doors;
    const previousHauls = this.hauls;
    const work = new Map<number, WorkObservation>();
    const projectiles = new Set<number>();
    const shooting = new Map<number, number>();
    const emittedShots = new Set<string>();
    const melee = new Map<number, number>();
    const doors = new Map<number, boolean>();
    const hauls = new Map<number, HaulObservation>();
    const pawnStates = new Map<number, string>();
    const animalStates = new Map<number, { state: string; injurySeverity: number }>();
    const jobs = new Map(world.jobs.map(job => [job.id, job]));
    let stations: Map<number, World['structures'][number]> | undefined;
    const stationFor = (id: number): World['structures'][number] | undefined => {
      stations ??= new Map(world.structures.map(station => [station.id, station]));
      return stations.get(id);
    };

    const recordWork = (pawnId: number, key: string, progress: number, kind: AudioCueKind,
      x: number, z: number, active: boolean, intervals: readonly number[]): void => {
      const previous = previousWork.get(pawnId);
      const sameTask = previous?.key === key;
      const nextCueTick = sameTask ? previous.nextCueTick : -Infinity;
      const cueCount = sameTask ? previous.cueCount : 0;
      if (this.initialized && active && sameTask && progress > previous.progress
        && world.tick >= nextCueTick) {
        this.add({ id: `${kind}:${world.tick}:${pawnId}:${key}`, tick: world.tick, kind, x, z });
        work.set(pawnId, { key, progress,
          nextCueTick: world.tick + workCueInterval(pawnId, key, cueCount, intervals), cueCount: cueCount + 1 });
      } else work.set(pawnId, { key, progress, nextCueTick, cueCount });
    };

    for (const pawn of world.pawns) {
      pawnStates.set(pawn.id, pawn.state);
      const previousPawnState = this.pawnStates.get(pawn.id);
      if (this.initialized && previousPawnState !== undefined && previousPawnState !== 'dead'
        && pawn.state === 'dead' && isColonist(pawn))
        this.add({ id: `ui.colonist-death:${world.tick}:${pawn.id}`, tick: world.tick,
          kind: 'ui.colonist-death', x: pawn.x, z: pawn.z });
      const previousHaul = previousHauls.get(pawn.id);
      const haul = pawn.haul;
      if (haul) {
        hauls.set(pawn.id, { sourcePileId: haul.sourcePileId, phase: haul.phase,
          carryPileId: haul.carryPileId, x: pawn.x, z: pawn.z, whole: haul.whole === true });
        if (this.initialized && previousHaul?.sourcePileId === haul.sourcePileId
          && previousHaul.phase === 'pickup' && haul.phase === 'deliver'
          && haul.carryPileId !== null) {
          this.add({ id: `haul.pickup:${world.tick}:${pawn.id}:${haul.carryPileId}`,
            tick: world.tick, kind: 'haul.pickup', x: pawn.x, z: pawn.z });
        }
      }
      if (this.initialized && previousHaul?.phase === 'deliver' && previousHaul.carryPileId !== null
        && (!haul || haul.carryPileId !== previousHaul.carryPileId)) {
        const stillCarried = previousHaul.whole
          ? world.packed.some(pack => pack.building.id === previousHaul.carryPileId
            && pack.owner.type === 'pawn' && pack.owner.pawnId === pawn.id)
          : world.piles.some(pile => pile.id === previousHaul.carryPileId
            && pile.owner.type === 'pawn' && pile.owner.pawnId === pawn.id);
        if (!stillCarried) this.add({ id: `haul.drop:${world.tick}:${pawn.id}:${previousHaul.carryPileId}`,
          tick: world.tick, kind: 'haul.drop', x: pawn.x, z: pawn.z });
      }
      const job = pawn.jobId === null ? undefined : jobs.get(pawn.jobId);
      if (job && (job.kind === 'mine' || job.kind === 'chop' || job.kind === 'sow'
        || job.kind === 'harvest' || job.kind === 'cut' || job.kind === 'repair'
        || job.kind === 'fix-breakdown' || isConstruction(job)) && !job.furniture
        && job.installationWork !== 'haul') {
        const kind = job.kind === 'mine' ? 'mining.hit' : job.kind === 'chop' ? 'woodcutting.hit'
          : job.kind === 'sow' ? 'farming.sow'
            : job.kind === 'harvest' || job.kind === 'cut' ? 'farming.harvest'
              : job.kind === 'repair' || job.kind === 'fix-breakdown' ? 'maintenance.work' : 'construction.hit';
        recordWork(pawn.id, `job:${job.id}`, job.progress * WORK_FRACTIONS + (job.workRemainder ?? 0), kind,
          job.x, job.z, pawn.state === 'working', WORK_CUE_INTERVAL_TICKS);
      } else if (pawn.cleaning) {
        const task = pawn.cleaning;
        recordWork(pawn.id, `clean:${task.targets[0] ?? 'none'}`, task.progress, 'cleaning.work',
          pawn.x, pawn.z, task.phase === 'clean' && pawn.state === 'working', STATION_CUE_INTERVAL_TICKS);
      } else if (pawn.tend) {
        const task = pawn.tend;
        recordWork(pawn.id, `tend:${task.patientId}`, task.progress, 'medical.tend',
          pawn.x, pawn.z, task.phase === 'tend' && pawn.state === 'working', STATION_CUE_INTERVAL_TICKS);
      } else if (pawn.need?.kind === 'eat' && pawn.need.phase === 'ingest') {
        recordWork(pawn.id, `eat:${pawn.need.sourcePileId}:${pawn.need.carryPileId}`,
          pawn.need.progress * WORK_FRACTIONS + (pawn.need.workRemainder ?? 0), 'eating.work',
          pawn.x, pawn.z, pawn.state === 'eating', EATING_CUE_INTERVAL_TICKS);
      } else if (pawn.cooking) {
        const task = pawn.cooking, station = stationFor(task.stationId), recipe = taskRecipe(task);
        if (station && stationAccepts(station, recipe)) {
          const kind: AudioCueKind = recipe === 'simple-meal' || recipe === 'cook-simple-meal-bulk' || recipe === 'fine-meal' || recipe === 'cook-fine-meal-bulk' || recipe === 'vegetarian-fine-meal' || recipe === 'cook-vegetarian-fine-meal-bulk' || recipe === 'carnivore-fine-meal' || recipe === 'cook-carnivore-fine-meal-bulk' || recipe === 'lavish-meal' || recipe === 'vegetarian-lavish-meal' || recipe === 'cook-carnivore-lavish-meal' ? 'cooking.work'
            : recipe === 'butcher-creature' ? 'butchering.work'
              : isTailoring(recipe) ? 'tailoring.work' : 'crafting.work';
          recordWork(pawn.id, `production:${station.id}:${task.billId}:${recipe}`, task.progress, kind,
            station.x, station.z, task.phase === 'work' && pawn.state === 'working', STATION_CUE_INTERVAL_TICKS);
        }
      } else if (pawn.research) {
        const task = pawn.research, station = stationFor(task.stationId);
        if (station && (station.kind === 'research-bench' || station.kind === 'hi-tech-research-bench'))
          recordWork(pawn.id, `research:${station.id}`, task.worked, 'research.work', station.x, station.z,
            pawn.state === 'working', STATION_CUE_INTERVAL_TICKS);
      }
      const strike = pawn.melee?.strike;
      if (strike) {
        melee.set(pawn.id, strike.atCore);
        if (this.initialized && previousMelee.get(pawn.id) !== strike.atCore)
          this.add({ id: `melee:${strike.atCore}:${pawn.id}`, tick: world.tick,
            kind: 'weapon.melee', x: pawn.x, z: pawn.z });
      }
      const stance = pawn.shooting?.stance;
      if (stance?.phase === 'cooldown') {
        shooting.set(pawn.id, stance.startedAtCore);
        emittedShots.add(`${pawn.id}:${stance.startedAtCore}`);
        if (this.initialized && previousShooting.get(pawn.id) !== stance.startedAtCore) {
          this.add({ id: `shot:${pawn.id}:${stance.startedAtCore}`, tick: world.tick,
            kind: 'weapon.gunshot', x: pawn.x + .5, z: pawn.z + .5 });
        }
      }
    }
    for (const projectile of world.projectiles ?? []) {
      projectiles.add(projectile.id);
      const launcher = projectile.flight.launcherKey;
      const shotKey = launcher?.startsWith('pawn:') ? `${launcher.slice(5)}:${projectile.emittedAtCore}` : undefined;
      if (this.initialized && !previousProjectiles.has(projectile.id) && (!shotKey || !emittedShots.has(shotKey)))
        this.add({ id: `shot:${projectile.id}`, tick: world.tick, kind: 'weapon.gunshot',
          x: projectile.flight.origin.x, z: projectile.flight.origin.z });
    }
    for (const structure of world.structures) {
      if ((structure.kind !== 'door' && structure.kind !== 'fence-gate' && structure.kind !== 'autodoor') || !structure.door) continue;
      const open = structure.door.open;
      doors.set(structure.id, open);
      const previous = previousDoors.get(structure.id);
      if (this.initialized && previous !== undefined && previous !== open) {
        const kind = structure.kind === 'autodoor'
          ? open ? 'autodoor.open' : 'autodoor.close'
          : open ? 'door.open' : 'door.close';
        this.add({ id: `${kind}:${world.tick}:${structure.id}`, tick: world.tick,
          kind, x: structure.x, z: structure.z });
      }
    }
    for (const animal of world.wildlife?.animals ?? []) {
      const injurySeverity = animal.health?.injuries.reduce((total, injury) => total + injury.severity, 0) ?? 0;
      animalStates.set(animal.id, { state: animal.state, injurySeverity });
      const previous = this.animalStates.get(animal.id);
      if (!this.initialized || !previous) continue;
      const voiceSpecies=animalVoiceSpecies(animal.species);
      if (animal.state === 'dead' && previous.state !== 'dead')
        this.add({ id: `animal.death:${world.tick}:${animal.id}`, tick: world.tick,
          kind: `animal.death.${voiceSpecies}`, x: animal.x, z: animal.z });
      else if (animal.state !== 'dead' && injurySeverity > previous.injurySeverity)
        this.add({ id: `animal.hurt:${world.tick}:${animal.id}`, tick: world.tick,
          kind: `animal.hurt.${voiceSpecies}`, x: animal.x, z: animal.z });
    }
    // Ordinary deaths become a physical corpse pile before the worker publishes
    // its snapshot. Observe that exact identity once, without scanning all piles
    // during snapshots where no previously live animal disappeared.
    if (this.initialized) {
      const missing = new Set<number>();
      for (const [id, previous] of this.animalStates)
        if (previous.state !== 'dead' && !animalStates.has(id)) missing.add(id);
      if (missing.size) for (const pile of world.piles) {
        const corpse = pile.corpse;
        if (!corpse || !missing.has(corpse.animalId) || !corpse.health.death) continue;
        const owner = pile.owner;
        const position = owner.type === 'ground' ? owner
          : owner.type === 'pawn' ? world.pawns.find(pawn => pawn.id === owner.pawnId) : undefined;
        if (!position) continue;
        this.add({ id: `animal.death:${world.tick}:${corpse.animalId}`, tick: world.tick,
          kind: `animal.death.${animalVoiceSpecies(corpse.species)}`, x: position.x, z: position.z });
      }
    }
    const lightningCount = world.weather?.lightningCount ?? 0;
    const lightning = world.weather?.lastLightning;
    if (this.initialized && lightningCount > this.lightningCount && lightning)
      this.add({ id: `weather.thunder:${lightning.coreTick}`, tick: world.tick,
        kind: 'weather.thunder', x: lightning.x, z: lightning.z });
    const raidId = world.raids?.active?.phase === 'assault' ? world.raids.active.id : null;
    if (this.initialized && raidId !== null && raidId !== this.raidId)
      this.add({ id: `ui.threat:${world.tick}:${raidId}`, tick: world.tick,
        kind: 'ui.threat', x: 0, z: 0 });
    this.work = work;
    this.projectiles = projectiles;
    this.shooting = shooting;
    this.melee = melee;
    this.doors = doors;
    this.hauls = hauls;
    this.pawnStates = pawnStates;
    this.animalStates = animalStates;
    this.lightningCount = lightningCount;
    this.raidId = raidId;
    this.initialized = true;
  }

  drain(): AudioCue[] {
    const cues = this.pending.slice();
    this.pending.length = 0;
    return cues;
  }

  private add(cue: AudioCue): void {
    if (this.tickCount >= MAX_CUES_PER_TICK || this.pending.length >= MAX_PENDING_CUES) {
      // Keep severe interface alerts even if many local contacts occur on the
      // same tick. Presentation may discard one background cue, never a command.
      if (cue.kind !== 'ui.threat' && cue.kind !== 'ui.colonist-death') return;
      const sameTickFull = this.tickCount >= MAX_CUES_PER_TICK;
      const displaced = this.pending.findIndex(candidate =>
        (!sameTickFull || candidate.tick === this.tick)
        && candidate.kind !== 'ui.threat' && candidate.kind !== 'ui.colonist-death');
      if (displaced < 0) return;
      if (this.pending[displaced]!.tick === this.tick) this.tickCount--;
      this.pending.splice(displaced, 1);
    }
    this.pending.push(cue);
    this.tickCount++;
  }
}
