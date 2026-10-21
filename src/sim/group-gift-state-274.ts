import {diplomaticGiftGainFromBase274} from './diplomatic-gift-value-274.ts';
import {validWorldRelationKind274,worldGoodwillChange274} from './world-diplomacy-274.ts';
import type {CommercialTextile,CommercialTextileTotals} from './commercial-state.ts';
import type {WorldFactionRelationKind256} from './world-faction-catalog.ts';
import type {GroupMassView} from './group-panel-state.ts';
import type {MaterialPile} from './types.ts';

export interface GroupGiftReceipt274 {
 tick:number;groupId:number;pawnId:number;settlementId:number;factionId:number;postId:number;
 totals:CommercialTextileTotals;recognizedValue:number;baseGoodwill:number;requestedGain:number;adjustedGain:number;appliedGain:number;naturalGoodwill:0|-130;
 goodwillBefore:number;goodwillAfter:number;relationBefore:WorldFactionRelationKind256;relationAfter:WorldFactionRelationKind256;
}
export interface CommercialGifts274 {count:number;totals:CommercialTextileTotals;recent:GroupGiftReceipt274[]}
export interface GroupGiftGood274 {pile:MaterialPile;available:number;unitPrice:number}
export type GroupGiftQuote274={ok:false;reason:string}|{
 ok:true;signature:string;negotiatorId:number;settlementId:number;settlementName:string;factionId:number;factionName:string;postId:number;
 recognizedValue:number;baseGoodwill:number;requestedGain:number;adjustedGain:number;appliedGain:number;naturalGoodwill:0|-130;goodwillBefore:number;goodwillAfter:number;
 relationBefore:WorldFactionRelationKind256;relationAfter:WorldFactionRelationKind256;
 goods:GroupGiftGood274[];selected:{pileId:number;item:CommercialTextile;quantity:number;unitPrice:number}[];mass:GroupMassView;
};
export type GroupGiftCommand274={type:'group-gift274';groupId:number;lines:{pileId:number;quantity:number}[];quote:string};

const int=(v:unknown,lo=0,hi=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const closed=(v:unknown,keys:readonly string[]):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&keys.includes(k)&&Object.getOwnPropertyDescriptor(v,k)?.enumerable&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
const totals=(v:unknown):v is CommercialTextileTotals=>closed(v,['cloth','muffalo-wool'])&&Reflect.ownKeys(v).length===2&&int(v.cloth)&&int(v['muffalo-wool']);
const dense=(v:unknown,max:number):v is unknown[]=>Array.isArray(v)&&Object.getPrototypeOf(v)===Array.prototype&&v.length<=max&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>Object.hasOwn(Object.getOwnPropertyDescriptor(v,String(i))??{},'value')).every(Boolean);
const receiptKeys=['tick','groupId','pawnId','settlementId','factionId','postId','totals','recognizedValue','baseGoodwill','requestedGain','adjustedGain','naturalGoodwill','appliedGain','goodwillBefore','goodwillAfter','relationBefore','relationAfter'] as const;
/** Pure bounded field guard, shared by physical post owners and transport. */
export function validCommercialGifts274(value:unknown,version:number,tick:number,nextId:number):value is CommercialGifts274 {
 if(version!==274||!closed(value,['count','totals','recent'])||Reflect.ownKeys(value).length!==3||!int(value.count,1)||!totals(value.totals)||!dense(value.recent,32)||value.recent.length!==Math.min(value.count,32))return false;
 const accumulated=value.totals,count=value.count;
 let last=-1;const sum={cloth:0,'muffalo-wool':0};
 for(const r of value.recent){
  if(!closed(r,receiptKeys)||Reflect.ownKeys(r).length!==receiptKeys.length||!int(r.tick,0,tick)||r.tick<last||!int(r.pawnId,1,nextId-1)||!['groupId','settlementId','factionId','postId'].every(k=>int(r[k],1))||!totals(r.totals)||r.totals.cloth+r.totals['muffalo-wool']<=0
   ||typeof r.recognizedValue!=='number'||!Number.isFinite(r.recognizedValue)||r.recognizedValue<=0||Math.fround(r.recognizedValue)!==r.recognizedValue||!int(r.requestedGain,0,200)||!int(r.adjustedGain,0,250)||!int(r.appliedGain,0,250)||(r.naturalGoodwill!==0&&r.naturalGoodwill!==-130)||!int(r.goodwillBefore,-100,100)||!int(r.goodwillAfter,-100,100)||r.relationBefore==='hostile'||!validWorldRelationKind274(r.goodwillBefore,r.relationBefore,version)||!validWorldRelationKind274(r.goodwillAfter,r.relationAfter,version)
   ||typeof r.baseGoodwill!=='number'||!Number.isFinite(r.baseGoodwill)||r.baseGoodwill<=0||Math.fround(r.baseGoodwill)!==r.baseGoodwill||Math.abs(r.baseGoodwill-r.recognizedValue/40)>Math.max(r.baseGoodwill,r.recognizedValue/40)*64*2**-23||r.requestedGain!==diplomaticGiftGainFromBase274(r.goodwillBefore,r.baseGoodwill))return false;
  const change=worldGoodwillChange274(r.goodwillBefore,r.relationBefore as WorldFactionRelationKind256,r.naturalGoodwill as number,r.requestedGain);
  if(!change||r.adjustedGain!==change.adjustedGain||r.appliedGain!==change.appliedGain||r.goodwillAfter!==change.goodwillAfter||r.relationAfter!==change.kindAfter)return false;
  last=r.tick;sum.cloth+=r.totals.cloth;sum['muffalo-wool']+=r.totals['muffalo-wool'];
 }
 return (['cloth','muffalo-wool'] as const).every(item=>Number.isSafeInteger(sum[item])&&sum[item]<=accumulated[item]&&(count>32||sum[item]===accumulated[item]));
}
