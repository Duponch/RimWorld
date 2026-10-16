import {pawnWorldGroup} from './world-map-context.ts';
import type { Cell, MaterialPile, Pawn, World } from './types.ts';
import type { CommercialBuyLine, CommercialTextileTotals } from './commercial-state.ts';

export interface GroupSource {
  pileId: number;
  quantity: number;
  item: 'pemmican' | 'survival-meal' | 'silver' | 'cloth' | 'muffalo-wool' | 'wood' | 'steel';
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
  | { kind: 'paused' | 'night' | 'at-site' | 'awaiting-entry' }
  | { kind: 'incapacity'; pawnIds: number[] }
  | { kind: 'overload'; grams: number; capacityGrams: number }
  | { kind: 'unreachable'; destination: number };
interface GroupCommon {
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
      memberIds: number[];
      rendezvous: Cell;
      meeting: { pawnId: number; cell: Cell }[];
      manifest: GroupSource[];
      cursor: number;
      exits: { pawnId: number; cell: Cell | null }[];
    })
  | (GroupCommon & {
      phase: 'travelling' | 'at-site' | 'awaiting-entry';
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
      pendingPileIds: number[];
    });

/** A retained dead human identity and possessions, not a playable Corpse.
 * This owner is frozen at the clinical death; it cannot act, ingest or return. */
export interface GroupLoss {
  groupId: number;
  tile: number;
  tick: number;
  pawn: Pawn;
  items: MaterialPile[];
}
export type GroupCommand =
  | { type: 'planet-adopt' }
  | { type: 'group-start'; originMapId?:number; memberIds: number[]; destination: number; sources: CommercialBuyLine[] }
  | { type: 'group-cancel'; groupId?:number }
  | { type: 'group-pause'; groupId?:number; paused: boolean }
  | { type: 'group-route'; groupId?:number; destination: number }
  | { type: 'group-buy'; groupId?:number; lines: CommercialBuyLine[]; quote: string }
  | { type: 'group-sell'; groupId?:number; lines: CommercialBuyLine[]; quote: string }
  | { type: 'group-unload'; originMapId?:number; groupId?:number; memberIds: number[] };

export const GROUP_MAX_MEMBERS = 8;
export const GROUP_MAX_LOSSES = 64;

/** A reference held by an actual on-map group intent, after shape validation. */
export const groupOnMapMember=(world:World,id:number):boolean=>world.worldMaps||world.campaignMap?.revision===2?!!pawnWorldGroup(world,id):!!world.group&&'memberIds' in world.group&&world.group.memberIds.includes(id);
