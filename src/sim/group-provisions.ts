import {allowedFoodFromPolicies,type FoodPolicy} from './food-policy.ts';
import {ticksUntilRot} from './food-preservation.ts';
import type {GroupState,GroupProvisions} from './group-state.ts';
import type {MaterialPile,Pawn} from './types.ts';

export const GROUP_PROVISIONS_SCHEMA=250;
export const newGroupProvisions=():GroupProvisions=>({revision:1,pemmicanLoadedUnits:0,pemmicanConsumedUnits:0,pemmicanSpoiledUnits:0});
export const mixedGroupProvisions=(g:Pick<GroupState,'provisions'>&{reorganization?:{revision:1}}):boolean=>g.provisions?.revision===1||g.reorganization?.revision===1;
export function groupPemmicanCounter(g:Extract<GroupState,{members:unknown}>,kind:'consumed'|'spoiled'):number {
 const value=g.provisions?(kind==='consumed'?g.provisions.pemmicanConsumedUnits:g.provisions.pemmicanSpoiledUnits):g.reorganization?.pemmicanSinceOpening?.[kind];
 if(value===undefined)throw Error('Missing actual pemmican accounting');return value;
}
export function setGroupPemmicanCounter(g:Extract<GroupState,{members:unknown}>,kind:'consumed'|'spoiled',value:number):void {
 if(!Number.isSafeInteger(value)||value<0)throw Error('Pemmican counter overflow');
 if(g.provisions){if(kind==='consumed')g.provisions.pemmicanConsumedUnits=value;else g.provisions.pemmicanSpoiledUnits=value;}
 else if(g.reorganization?.pemmicanSinceOpening)g.reorganization.pemmicanSinceOpening[kind]=value;else throw Error('Missing actual pemmican accounting');
}
export const freshGroupProvision=(p:MaterialPile,tick:number):boolean=>!p.foodPoison&&(p.item==='survival-meal'||p.item==='pemmican'&&ticksUntilRot(p,tick)>0);
/** Inputs are already actual inventories or explicitly selected source quantities. */
export function groupProvisionCounts(items:readonly MaterialPile[],tick:number){
 let rations=0,pemmicanUnits=0,provisionNutrition=0;
 for(const p of items){if(p.item==='survival-meal')rations+=p.quantity;else if(p.item==='pemmican')pemmicanUnits+=p.quantity;
  if(freshGroupProvision(p,tick))provisionNutrition+=p.quantity*(p.item==='survival-meal'?90:5);
 }
 return {rations,pemmicanUnits,provisionNutrition};
}
/** Exact two-food matching: satisfy exclusive diets first. One intact pack or
 * eighteen pemmican units supplies the local .9-nutrition safety minimum.
 * Flexible members use only the stock left after those exclusive claims. */
export function groupProvisionMinimum(members:readonly Pawn[],items:readonly MaterialPile[],policies:readonly FoodPolicy[],tick:number):boolean {
 const stock=groupProvisionCounts(items.filter(p=>freshGroupProvision(p,tick)),tick);let packs=0,pemmican=0,flexible=0;
 for(const p of members){const allowed=allowedFoodFromPolicies(policies,p),a=allowed.includes('survival-meal'),b=allowed.includes('pemmican');
  if(a&&b)flexible++;else if(a)packs++;else if(b)pemmican++;else return false;
 }
 const r=stock.rations-packs,q=stock.pemmicanUnits-pemmican*18;
 return Number.isSafeInteger(stock.provisionNutrition)&&r>=0&&q>=0&&r+Math.floor(q/18)>=flexible;
}
