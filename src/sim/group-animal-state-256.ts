import type {WildAnimal} from './wildlife-state.ts';
import type {GroupMemberOrigin,GroupInventoryVector} from './group-reorganization-state.ts';
import type {MaterialPile} from './types.ts';
import type {PackedFurniture} from './furniture-rules.ts';
/** A biological original plus its real immutable provenance. Bed ownership is
 * the shared mapBed on the original, never a second animal-only reference. */
export type GroupAnimalOrigin256=GroupMemberOrigin;
export interface GroupAnimalOwners256 {
 revision:1;members:WildAnimal[];origins:GroupAnimalOrigin256[];order:number[];
 /** Only actual transfer into a historical group creates this accumulator.
  * New travel uses travel.tickDelta. All callbacks share MotionRuntime. */
 interval?:{revision:1;startedAt:number;atCore:number;tickDelta:number};
}
export interface GroupAnimalPreparationLine256 {
 animalId:number;handlerId:number;mode:'lead'|'carry';gathered:boolean;
}
export interface GroupAnimalPreparation256 {revision:1;lines:GroupAnimalPreparationLine256[]}
export interface GroupAnimalLoss256 {reason:'death'|'caravan-lost';groupId:number;tile:number;tick:number;animal:WildAnimal;origin:GroupAnimalOrigin256;items:MaterialPile[];packed?:PackedFurniture[]}
export interface GroupInventoryEffects256 {inventoryEffects?:GroupInventoryVector}
export type CaravanPhysicalPawn256=import('./types.ts').Pawn|WildAnimal;
