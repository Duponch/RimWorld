import type { ItemId } from './items.ts';
import type { ArtRecipe,ArtMaterial } from './art-rules.ts';
import type { WeaponQuality } from './equipment-rules.ts';

export interface TradeTask { traderId:number; phase:'approach'|'ready'; startedAt:number }
export type TradeLine = {pileId:number;quantity:number;packedId?:never} | {packedId:number;quantity:number;pileId?:never};
export type TradeReceiptLine = {item:ItemId;packedId?:never;quantity:number;unitPrice:number} | {item?:never;packedId:number;kind:ArtRecipe;material:ArtMaterial;quality:WeaponQuality;damage:number;art:{authorId:number;createdAt:number};quantity:1|-1;unitPrice:number};
export interface TradeReceipt { tick:number; negotiatorId:number; traderId:number; silver:number; forgone:number; lines:TradeReceiptLine[] }
export interface TradeLedger { count:number; silverPaid:number; silverReceived:number; forgone:number; bought:Partial<Record<ItemId,number>>; sold:Partial<Record<ItemId,number>>; artBought?:Partial<Record<ArtRecipe,number>>; artSold?:Partial<Record<ArtRecipe,number>>; recent:TradeReceipt[] }
/** Positive quantities buy from the visitor; negative quantities sell to them. */
export type TradeCommand={type:'enable-visitors'}|{type:'order-trade';pawnId:number;traderId:number}|{type:'cancel-trade';pawnId:number}
  |{type:'trade-execute';pawnId:number;traderId:number;lines:TradeLine[];quote:string;acceptShortfall:boolean};
