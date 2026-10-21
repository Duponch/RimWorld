import type {GroupAnimalOwners256,GroupAnimalPreparation256} from './group-animal-state-256.ts';
import type {PackedFurniture} from './furniture-rules.ts';
import type {GroupReorganization,GroupTravelRevision,GroupReorganizationCommand,GroupMemberOrigin} from './group-reorganization-state.ts';
import {pawnWorldGroup} from './world-map-context.ts';
import type { Cell, MaterialPile, Pawn, World } from './types.ts';
import type { CommercialBuyLine, CommercialTextileTotals } from './commercial-state.ts';

export interface GroupSource {
  pileId: number;
  quantity: number;
  item: MaterialPile['item'];
  /** Human pickup and subsequent real contact with this actual animal. */
  animalCarrierId?:number;
  deliveredToAnimal?:true;
  carrierId: number;
  carriedPileId?: number;
}
export interface GroupLedger {
  // Formation contacts only; these are not the current inventory or departure baseline.
  foodLoaded: number;
  foodConsumed: number;
  medicineUsed: number;
  silverLoaded: number;
  silverPaid: number;
  silverEarned: number;
  cargoLoaded: CommercialTextileTotals;
  sold: CommercialTextileTotals;
  bought: { medicine: number; component: number };
}
export interface GroupProvisions {
  revision:1;
  pemmicanLoadedUnits:number;
  pemmicanConsumedUnits:number;
  pemmicanSpoiledUnits:number;
}
export interface GroupFreight {
  revision:1;
  /** Formation pickup contacts only, never the departure inventory. */
  woodLoaded:number;
  steelLoaded:number;
}
export interface GroupDepartureBaseline {
  /** Real departure inventory only for a prospective freight formation. */
  freight?:{wood:number;steel:number};
  /** Present only for prospective mixed collective formations. Units, never rations. */
  pemmican?:number;
  food: number;
  silver: number;
  cargo: CommercialTextileTotals;
  medicine: number;
  component: number;
}
export interface GroupSegment {
  from: number;
  to: number;
  totalCore: number;
  remainingCore: number;
}
export type GroupStop =
  | { kind: 'paused' | 'night' | 'at-site' | 'awaiting-entry' | 'stationary' }
  | { kind: 'incapacity'; pawnIds: number[] }
  | { kind: 'overload'; grams: number; capacityGrams: number }
  | { kind: 'unreachable'; destination: number };
export interface GroupAdmission257 {revision:1|2}
export interface GroupHumanPreparation257 {revision:1;/** Only a real new261 formation may retain mobilisation until actual departure. */undraftIds261?:number[];releaseIds:number[];passengers:{pawnId:number;carrierId:number;phase:'approach'|'carry'|'waiting';captureOnPickup259?:true}[]}
interface GroupCommon {
  /** Present only on formations genuinely created after admission257. */
  admission?:GroupAdmission257;
  /** Absence preserves the engaged historical formation through its return. */
  freight?:GroupFreight;
  /** Absence preserves the historical ration-only expedition through return. */
  provisions?:GroupProvisions;
  /** Present only for a new departure from the persisted secondary map. */
  originTile?:number;
  id: number; // Group namespace; one active group initially.
  startedAt: number;
  destination: number;
  ledger: GroupLedger;
}
export type GroupState =
  | (GroupCommon & {
      phase: 'gathering' | 'loading' | 'leaving';
      /** Actual new formation intent; absent on migrated engaged groups. */
      travelPreparation?:true;
      humanPreparation?:GroupHumanPreparation257;
      animalPreparation?:GroupAnimalPreparation256;
      memberIds: number[];
      rendezvous: Cell;
      meeting: { pawnId: number; cell: Cell }[];
      bedrollLoading?:import('./group-bedroll-loading-256.ts').GroupBedrollLoading256;
      manifest: GroupSource[];
      cursor: number;
      exits: { pawnId: number; cell: Cell | null }[];
    })
  | (GroupCommon & {
      phase: 'travelling' | 'at-site' | 'awaiting-entry' | 'stationary';
      reorganization?:GroupReorganization;
      travel?:GroupTravelRevision;
      packed?:PackedFurniture[];
      animalOwners?:GroupAnimalOwners256;
      members: Pawn[]; // Original, exclusive owners.
      items: MaterialPile[];
      departedAt: number;
      lastPersonalTick: number;
      baseline: GroupDepartureBaseline;
      entry: Cell;
      tile: number;
      route: number[]; // Includes the next segment boundary if engaged.
      segment: GroupSegment | null;
      paused: boolean;
      stop: GroupStop | null;
    })
  | (GroupCommon & {
      phase: 'unloading';
      memberIds: number[];
      pendingPackedIds?:number[];
      animalIds?:number[];
      pendingPileIds: number[];
    });

/** A retained dead human identity and possessions, not a playable Corpse.
 * This owner is frozen at the clinical death; it cannot act, ingest or return. */
export interface GroupLoss {
  admission?:GroupAdmission257;
  /** Present only for a real prospective death after members of different origins met. */
  memberOrigin?:GroupMemberOrigin;
  packed?:PackedFurniture[];
  groupId: number;
  tile: number;
  tick: number;
  pawn: Pawn;
  items: MaterialPile[];
}
export type GroupCommand = import('./group-gift-state-274.ts').GroupGiftCommand274 | import('./caravan-arrival-261.ts').CaravanArrivalCommand261 | import('./group-reform-260.ts').GroupReformCommand260 | import('./group-caravan-carry-256.ts').GroupCaravanCarryCommand256 | GroupReorganizationCommand
  | { type: 'planet-adopt' }
  | { type: 'group-start'; retreat261?:true; originMapId?:number; memberIds: number[]; destination: number; sources: CommercialBuyLine[];packedIds?:number[];animalIds?:number[] }
  | { type: 'group-cancel'; groupId?:number }
  | { type: 'group-pause'; groupId?:number; paused: boolean }
  | { type: 'group-route'; groupId?:number; destination: number }
  | { type: 'group-buy'; groupId?:number; lines: CommercialBuyLine[]; quote: string }
  | { type: 'group-sell'; groupId?:number; lines: CommercialBuyLine[]; quote: string }
  | { type: 'group-unload'; originMapId?:number; groupId?:number; memberIds: number[];animalIds?:number[] };

export const GROUP_MAX_MEMBERS = 8;
export const GROUP_MAX_LOSSES = 64;

/** A reference held by an actual on-map group intent, after shape validation. */
export const groupOnMapMember=(world:World,id:number):boolean=>world.worldMaps||world.campaignMap?.revision===2?!!pawnWorldGroup(world,id):!!world.group&&'memberIds' in world.group&&world.group.memberIds.includes(id);
