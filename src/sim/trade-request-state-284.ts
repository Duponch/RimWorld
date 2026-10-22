import type {ItemId} from './items.ts';
import type {MaterialPile} from './types.ts';
import type {WeaponQuality} from './equipment-rules.ts';
import type {TradeRequestFamily284} from './trade-request-content-284.ts';

/** One quest family, separate from world Sites, merchant stock and map goods.
 * Only option.items is a physical owner; manifests and receipts are scalars. */
export interface TradeRewardThing284 {
 id:number;item:ItemId;quantity:number;quality?:WeaponQuality;
}
export interface TradeRewardOption284 {
 id:number;goodwill:number;original:TradeRewardThing284[];items:MaterialPile[];
}
export interface TradeRequestWealth284 {
 basis:'known-material-v1';value:number;items:number;structures:number;floors:number;
 unpricedPiles:number;unpricedPacked:number;unpricedStructures:number;unpricedPawns:number;
}
export interface TradeRewardCleanup284 extends TradeRewardThing284 {
 optionId:number;atCore:number;reason:'not-chosen'|'offer-expired'|'mission-expired'|'hostile';
}
export interface TradeConsumedThing284 {sourceId:number;id:number;item:ItemId;quantity:number}
export interface TradeDeliveredThing284 extends TradeRewardThing284 {pawnId:number}
export interface TradeRequestFulfillment284 {
 atCore:number;groupId:number;consumed:TradeConsumedThing284[];delivered:TradeDeliveredThing284[];
 goodwill:{before:number;afterBonus:number;afterReward:number;bonusRequested:12;rewardRequested:number};
}
export interface TradeRequest284 {
 id:number;homeMapId:number;settlementId:number;factionId:number;giverId:number;tile:number;settlementName:string;
 offeredAtCore:number;offerExpiresAtCore:number;durationCore:number;
 family:TradeRequestFamily284;quantity:number;baseMarketValue:number;wealth:TradeRequestWealth284;rewardBudget:number;
 options:TradeRewardOption284[];dismissed:boolean;status:'offered'|'accepted'|'succeeded'|'expired'|'failed';
 acceptedAtCore?:number;expiresAtCore?:number;selectedOptionId?:number;
 /** Actual destruction event, retained after its temporary map/Site is gone. */
 destinationLost?:{atCore:number;destroyedSiteId:number};
 closed?:{atCore:number;reason:'offer-expired'|'mission-expired'|'hostile'|'fulfilled'};
 cleanup:TradeRewardCleanup284[];fulfillment?:TradeRequestFulfillment284;
}
export interface TradeRequests284 {revision:1;adoptedAtCore:number;nextId:number;entries:TradeRequest284[]}
export type TradeRequestCommand284=
 |{type:'trade-request-answer';requestId:number;optionId:number}
 |{type:'trade-request-dismiss';requestId:number;dismissed:boolean}
 |{type:'trade-request-fulfill';requestId:number;groupId:number;quote:string;confirm:boolean};

export interface TradeRequestQuote284 {
 ok:true;quote:string;requestId:number;groupId:number;available:number;required:number;
 consumed:readonly {pileId:number;item:ItemId;quantity:number}[];
 rewards:readonly TradeDeliveredThing284[];mass:{grams:number;capacityGrams:number};
}
