import type { Cell, MaterialPile, Pawn } from './types.ts';

/** This stock has its own explicit container owner, never a hidden map pawn. */
export type CommercialStockPile=Omit<MaterialPile,'owner'>;
export type CommercialProduct='medicine'|'component';
export type CommercialTextile='cloth'|'muffalo-wool';
export type CommercialTextileTotals={cloth:number;'muffalo-wool':number};
export const isCommercialTextile=(item:unknown):item is CommercialTextile=>item==='cloth'||item==='muffalo-wool';
export const emptyCommercialTextiles=():CommercialTextileTotals=>({cloth:0,'muffalo-wool':0});
/** Compare the actual inventory with the persisted initial textile manifest. */
export function commercialCargoIntact(items:readonly MaterialPile[],pawnId:number,cargo?:CommercialTextileTotals):boolean {
  const totals=emptyCommercialTextiles();
  for(const i of items)if(i.owner.type==='inventory'&&i.owner.pawnId===pawnId&&isCommercialTextile(i.item))totals[i.item]+=i.quantity;
  return totals.cloth===(cargo?.cloth??0)&&totals['muffalo-wool']===(cargo?.['muffalo-wool']??0);
}
export interface CommercialReceipt {
  tick:number;
  pawnId:number;
  silver:number;
  medicine:number;
  component:number;
  sold?:CommercialTextileTotals;
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
  sold?:CommercialTextileTotals;
  silverPaid?:number;
}
export interface CommercialSource {
  sourcePileId:number;
  item:'survival-meal'|'silver'|CommercialTextile;
  quantity:number;
  carriedPileId?:number;
}
interface CommercialManifest {
  startedAt:number;
  foodQuantity:2|3;
  silverQuantity:number;
  cargo?:CommercialTextileTotals;
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
  sold?:CommercialTextileTotals;
  silverEarned?:number;
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
  | {type:'commercial-start';pawnId:number;foodPileId:number;quantity:2|3;silver:number;cargo?:CommercialBuyLine[]}
  | {type:'commercial-cancel'}
  | {type:'commercial-unload';pawnId:number}
  | {type:'commercial-buy';lines:CommercialBuyLine[];quote:string}
  | {type:'commercial-sell';lines:CommercialBuyLine[];quote:string}
  | {type:'commercial-return'};

export const COMMERCIAL_LEG_TICKS=750;
export const COMMERCIAL_DECISION_TICKS=250;
export const COMMERCIAL_MAX_SOURCES=32;
export const COMMERCIAL_MAX_STOCK=512;
export const COMMERCIAL_RECEIPTS=32;
/** Strictly greater than thirty Core days (1,800,000 Core ticks). */
export const COMMERCIAL_RESTOCK_TICKS=180000;
