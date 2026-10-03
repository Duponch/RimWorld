import type { Cell, MaterialPile, Pawn } from './types.ts';

/** This stock has its own explicit container owner, never a hidden map pawn. */
export type CommercialStockPile=Omit<MaterialPile,'owner'>;
export type CommercialProduct='medicine'|'component';
export interface CommercialReceipt {
  tick:number;
  pawnId:number;
  silver:number;
  medicine:number;
  component:number;
}
export interface CivilianPost {
  stockedAt:number;
  rng:number;
  generation:number;
  stock:CommercialStockPile[];
  transactions:number;
  silverReceived:number;
  bought:{medicine:number;component:number};
  recent:CommercialReceipt[];
}
export interface CommercialSource {
  sourcePileId:number;
  item:'survival-meal'|'silver';
  quantity:number;
  carriedPileId?:number;
}
interface CommercialManifest {
  startedAt:number;
  foodQuantity:2|3;
  silverQuantity:number;
}
interface CommercialOffMap extends CommercialManifest {
  pawn:Pawn;
  items:MaterialPile[];
  foodPileId:number;
  departedAt:number;
  entry:Cell;
  consumed:number;
  silverPaid:number;
  bought:{medicine:number;component:number};
}
export type CommercialTrip =
  | (CommercialManifest & {phase:'loading';pawnId:number;manifest:CommercialSource[];cursor:number})
  | (CommercialManifest & {phase:'leaving';pawnId:number;foodPileId:number;exit:Cell|null})
  | (CommercialOffMap & {phase:'outbound';arrivesAt:number})
  | (CommercialOffMap & {phase:'at-post';arrivedAt:number;decisionUntil:number})
  | (CommercialOffMap & {phase:'returning'|'awaiting-entry';arrivedAt:number;leftPostAt:number;returnAt:number})
  | {phase:'unloading';pawnId:number;startedAt:number;pendingPileIds:number[]};

export type CommercialBuyLine={pileId:number;quantity:number};
export type CommercialCommand =
  | {type:'commercial-start';pawnId:number;foodPileId:number;quantity:2|3;silver:number}
  | {type:'commercial-cancel'}
  | {type:'commercial-unload';pawnId:number}
  | {type:'commercial-buy';lines:CommercialBuyLine[];quote:string}
  | {type:'commercial-return'};

export const COMMERCIAL_LEG_TICKS=750;
export const COMMERCIAL_DECISION_TICKS=250;
export const COMMERCIAL_MAX_SOURCES=32;
export const COMMERCIAL_MAX_STOCK=512;
export const COMMERCIAL_RECEIPTS=32;
/** Strictly greater than thirty Core days (1,800,000 Core ticks). */
export const COMMERCIAL_RESTOCK_TICKS=180000;
