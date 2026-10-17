import type {GroupForageRevision256,GroupForageUnits256} from './group-forage-state-256.ts';
import type {ItemId} from './items.ts';
import type {WorldGroupRecord} from './world-map-state.ts';
/** Counts of inventory units, never equipment/apparel or nutrition equivalents. */
export type GroupInventoryVector=Partial<Record<ItemId,number>>;
export interface GroupMemberOrigin {
 pawnId:number;originMapId:number;context:WorldGroupRecord['context'];
 /** Only an actual new259 ExitMap may write this absolute entry receipt. */
 enteredAtAbsCore?:number;
}
export interface GroupMemberProjectionContext extends GroupMemberOrigin {filthPresent:boolean}
/** Created by an actual operation only; it does not rewrite former departure receipts. */
export interface GroupReorganization {
 revision:1;openedAt:number;
 inventoryEffects?:GroupInventoryVector;
 packed?:import('./group-packed-balance-256.ts').GroupPackedBalance256;
 /** Includes existing matching terminal inventories, which are never transferable. */
 opening:GroupInventoryVector;
 effectsAtOpening:GroupInventoryVector;
 received:GroupInventoryVector;sent:GroupInventoryVector;
 /** Only used when an older group has no historical mixed-provision contract. */
 pemmicanSinceOpening?:{consumed:number;spoiled:number};
 /** Received fruits do not promote a historical group to the forage cadence. */
 foodSinceOpening?:{consumed:GroupForageUnits256;spoiled:GroupForageUnits256};
 birth?:{kind:'split';parentGroupId:number;at:number}|{kind:'reform';sourceMapId:number;at:number};
 memberOrigins:GroupMemberOrigin[];
}
/** Native interval accumulator is serialized; the tweener's position is not. */
export interface GroupTravelRevision {revision:1;tickDelta:number;forage:GroupForageRevision256}
export type GroupReorganizationCommand=
 |{type:'group-split';groupId:number;memberIds:number[];inventory:{pileId:number;quantity:number}[];packedIds?:number[];animalIds?:number[]}
 |{type:'group-merge';groupIds:number[]};