import {roundTradeSilver} from './trade-prices.ts';
import type {TradeRequestWealth284} from './trade-request-state-284.ts';
import {colonyWealth} from './colony-wealth.ts';
import type {World,MaterialPile} from './types.ts';
import {WEAPON_QUALITIES} from './equipment-rules.ts';
import {isPerishable,ticksUntilRot} from './food-preservation.ts';
import {tradeRequestContent284,type TradeRequestFamily284} from './trade-request-content-284.ts';

export const TRADE_REQUEST_DAY_284=60000;
const curve=(points:readonly (readonly [number,number])[],x:number):number=>{
 if(x<=points[0]![0])return points[0]![1];
 for(let i=1;i<points.length;i++){const a=points[i-1]!,b=points[i]!;if(x<=b[0])return a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);}
 return points.at(-1)![1];
};
/** Explicit local proxy, never the raid-weighted number or native WealthTotal.
 * Known material pricing/visibility boundaries remain those of colonyWealth;
 * all unpriced owners are reported without inventing a healthy/fixed price. */
export function captureTradeRequestWealth284(home:World):TradeRequestWealth284 {
 const w=colonyWealth(home);
 return {basis:'known-material-v1',value:w.items+w.structures+w.floors,items:w.items,structures:w.structures,floors:w.floors,
  unpricedPiles:w.unpricedPileIds.length,unpricedPacked:w.unpricedPackedIds.length,unpricedStructures:w.unpricedStructureIds.length,unpricedPawns:w.unpricedPawnIds.length};
}
/** A private temporary count draw. This declared original seed contract never
 * advances the campaign RNG and makes no claim of Core seed/hash parity. */
export function tradeRequestCountDraw284(seed:number,core:number,family:TradeRequestFamily284):number {
 let x=(seed^Math.trunc(core)^0x28437a1)>>>0;
 for(let i=0;i<family.length;i++)x=Math.imul(x^family.charCodeAt(i),16777619)>>>0;
 x=x||1;x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;
}
export function tradeRequestQuantity284(baseValue:number,wealth:number,draw:number):number {
 if(!Number.isFinite(baseValue)||baseValue<=0||!Number.isFinite(wealth)||wealth<0||!Number.isFinite(draw)||draw<0||draw>=1)throw Error('Invalid trade request quantity inputs');
 const amount=Math.max(1,roundTradeSilver((500+Math.floor(2001*draw))*curve([[0,.3],[50000,1],[300000,2]],wealth)/baseValue));
 return amount>200?roundTradeSilver(amount/10)*10:amount>100?roundTradeSilver(amount/5)*5:amount;
}
export function tradeRequestRewardBudget284(baseValue:number,quantity:number,wealth:number,draw:number):number {
 return baseValue*quantity*curve([[0,1.15],[50000,1],[300000,.85]],wealth)*(1.5+.6*draw);
}
/** Duration is fixed at offer creation; the active clock starts on acceptance. */
export function tradeRequestDuration284(travelCore:number,draw:number):number|undefined {
 if(!Number.isFinite(travelCore)||travelCore<0||!Number.isFinite(draw)||draw<0||draw>=1)return;
 const t=travelCore/TRADE_REQUEST_DAY_284,minDays=Math.ceil(Math.max(t+6,t*1.35));
 return minDays>28?undefined:Math.max(12+Math.floor(draw*17),minDays)*TRADE_REQUEST_DAY_284;
}
export function tradeRequestGoodwill284(budget:number,current:number,draw:number):number {
 const exact=curve([[100,10],[500,15],[1000,20],[2000,35],[5000,50]],budget),floor=Math.floor(exact);
 return Math.max(1,Math.min(100-current,floor+(draw<exact-floor?1:0)));
}
/** Delivery is deliberately stricter than estimated availability. No HP floor,
 * sale price, negotiator, worn equipment or stock outside this inventory. */
export function eligibleTradeRequestThing284(p:MaterialPile,family:TradeRequestFamily284,tick:number):boolean {
 const def=tradeRequestContent284(family);
 return !!def&&def.items.includes(p.item)&&p.owner.type==='inventory'
  &&(!isPerishable(p.item)||ticksUntilRot(p,tick)>0)
  &&(!p.weapon||WEAPON_QUALITIES.indexOf(p.weapon.quality)>=WEAPON_QUALITIES.indexOf('normal'))
  &&(!p.apparel||p.apparel.corpseWear284===false&&WEAPON_QUALITIES.indexOf(p.apparel.quality)>=WEAPON_QUALITIES.indexOf('normal'));
}
