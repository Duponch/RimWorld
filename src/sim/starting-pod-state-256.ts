import type {Cell,MaterialPile,Pawn,World} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
export const CORE_STARTING_ARRIVAL_PROFILE_256='crashlanded-pods-core256-v1' as const;
/** Only this creation holder may own the actual unsplit Silver800 and Meal50. Each
 * other contained item still has its normal real condition/owner record.
 * This is NOT a higher ground/inventory stack limit. */
export interface CoreStartingPod256 {
 id:number;skyfallerId:number;cell:Cell;
 pawn:Pawn;items:MaterialPile[];animals:WildAnimal[];
 /** Same physical records above; this list contains references only. */
 order:{kind:'human'|'animal'|'item';id:number}[];
 damage?:number;
 phase:'incoming'|'landed';fallCore:number;remainingCore:number;ageCore:number;roofHit:boolean;
}
export interface DestroyedStartingPod256 {id:number;cell:Cell;atTick:number;humanId:number;animalIds:number[]}
export interface CoreStartingArrivalPending256 {
 profile:typeof CORE_STARTING_ARRIVAL_PROFILE_256;phase:'incoming'|'landed';
 start:0;landAt:number;openAt:number;personalTick:0;
 atCore:number;pods:CoreStartingPod256[];
 /** Actual already-opened anchors, no retained Thing/Pawn copy. */
 openedCells:Cell[];destroyedPods?:DestroyedStartingPod256[];
}
export interface CoreStartingArrivalOpened256 {
 profile:typeof CORE_STARTING_ARRIVAL_PROFILE_256;phase:'opened';
 start:0;landAt:number;openAt:number;openedAt:number;cells:Cell[];destroyedPods?:DestroyedStartingPod256[];
}
export type CoreStartingArrival256=CoreStartingArrivalPending256|CoreStartingArrivalOpened256;
export const CORE_STARTING_OPEN_DELAY_256=110;
/** Read the same held original once, never a second spawned/world owner. */
export function captureCoreStartingAnimals256(world:Pick<World,'startingArrival'>):WildAnimal[]{
 const a=world.startingArrival;return a?.profile===CORE_STARTING_ARRIVAL_PROFILE_256&&a.phase!=='opened'?a.pods.flatMap(p=>p.animals):[];
}

/** Existing phase means holder completion; only cells are actual openings. */
export function finishCoreStartingArrival256(world:World,a:CoreStartingArrivalPending256):void {
 if(world.startingArrival!==a||a.pods.length)return;world.startingArrival={profile:a.profile,phase:'opened',start:a.start,landAt:a.landAt,openAt:a.openAt,openedAt:world.tick,cells:a.openedCells.map(c=>({...c})),...a.destroyedPods?{destroyedPods:a.destroyedPods.map(p=>({...p,cell:{...p.cell},animalIds:[...p.animalIds]}))}:{}};
}
