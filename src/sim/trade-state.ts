import type { ItemId } from './items.ts';

export interface TradeTask { traderId:number; phase:'approach'|'ready'; startedAt:number }
export interface TradeLine { pileId:number; quantity:number }
export interface TradeReceipt { tick:number; negotiatorId:number; traderId:number; silver:number; forgone:number; lines:{item:ItemId;quantity:number;unitPrice:number}[] }
export interface TradeLedger { count:number; silverPaid:number; silverReceived:number; forgone:number; bought:Partial<Record<ItemId,number>>; sold:Partial<Record<ItemId,number>>; recent:TradeReceipt[] }
/** Positive quantities buy from the visitor; negative quantities sell to them. */
export type TradeCommand={type:'enable-visitors'}|{type:'order-trade';pawnId:number;traderId:number}|{type:'cancel-trade';pawnId:number}
  |{type:'trade-execute';pawnId:number;traderId:number;lines:TradeLine[];quote:string;acceptShortfall:boolean};
