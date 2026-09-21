import type { Cell } from './types.ts';
import type { TravelSegment } from './travel-timing.ts';
import type { MedicalRecord } from './injury-types.ts';
import type { StaggerState } from './stagger.ts';
import { ANIMAL_SPECIES,type AnimalSpeciesId,type FaunaBiomeId } from './animal-species.ts';

export interface WildAnimal extends Cell {
  id:number; species:AnimalSpeciesId; sex:'female'|'male';
  /** Nutrition units, distinct from a human's percentage gauge. */
  food:number; rest:number;
  state:'idle'|'moving'|'eating'|'sleeping'|'hungry'|'downed'|'dead';
  health?:MedicalRecord;
  burning?:import('./fire-rules.ts').BurningReaction;
  corpseRot?:import('./food-preservation.ts').RotState;
  flee?:{danger:Cell;until:number};
  stagger?:StaggerState;
  stun?:import('./stun.ts').StunState;
  threat?:{targetId:number;harmedAtCore:number};
  retaliation?:{targetId:number;untilCore:number};
  strike?:NonNullable<import('./melee-state.ts').MeleeState['strike']>;
  sleepUntilCore?:number;
  path:Cell[]; motion?:TravelSegment; nextDecision:number;
  meal?:{kind:'plant'|'pile';id:number;quantity:number;progress:number};
}
export interface WildlifeState {
  profile:'temperate-hares-v1'|'biome-herbivores-v1'; rng:number; animals:WildAnimal[];
  eatenPlants:number; eatenNutrition:number; eatenItems:number;
  population?:{biome:FaunaBiomeId;fullTargetWeight:number;targetWeight:number;nextCheck:number;checks:number;arrivals:number};
}
/** Compatibility alias: existing V76 callers and snapshots keep exact values. */
export const HARE=ANIMAL_SPECIES.hare;
export const MAX_WILDLIFE=256;
export function wildlifeRandom(s:WildlifeState):number {
  let n=s.rng;n^=n<<13;n^=n>>>17;n^=n<<5;s.rng=n>>>0;return s.rng/0x100000000;
}
