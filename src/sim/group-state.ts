import type { Cell, MaterialPile, Pawn, World } from './types.ts';
import type { CommercialBuyLine, CommercialTextileTotals } from './commercial-state.ts';

export interface GroupSource {
  pileId: number;
  quantity: number;
  item: 'survival-meal' | 'silver' | 'cloth' | 'muffalo-wool';
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
export interface GroupDepartureBaseline {
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
  | { type: 'group-start'; memberIds: number[]; destination: number; sources: CommercialBuyLine[] }
  | { type: 'group-cancel' }
  | { type: 'group-pause'; paused: boolean }
  | { type: 'group-route'; destination: number }
  | { type: 'group-buy'; lines: CommercialBuyLine[]; quote: string }
  | { type: 'group-sell'; lines: CommercialBuyLine[]; quote: string }
  | { type: 'group-unload'; memberIds: number[] };

export const GROUP_MAX_MEMBERS = 8;
export const GROUP_MAX_LOSSES = 64;

/** A reference held by an actual on-map group intent, after shape validation. */
export const groupOnMapMember=(world:World,id:number):boolean=>!!world.group&&'memberIds' in world.group&&world.group.memberIds.includes(id);
