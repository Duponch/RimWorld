import {computeThreatPoints,summaryHealthPercent} from './threat-points.ts';
import {pileMarketValue} from './trade-prices.ts';
import {structureRoomMarketValue} from './room-market-value.ts';
import {actualAnimalProfile256} from './actual-animal-profile-256.ts';
import {animalMarketValue261,type AnimalPriceClinicalCapture261} from './caravan-animal-value-261.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {AwayGroup} from './group-capture.ts';
import type {Pawn} from './types.ts';
const f=Math.fround;
export interface CaravanValueAuthorities261 {
 humanMarketValue(pawn:Pawn):number|undefined;
 animalClinical?(animal:WildAnimal):AnimalPriceClinicalCapture261|undefined;
 /** True only for actual player faction owners. Captives' possessions still
  * count, while their own market value does not. */
 isPlayerHuman(pawn:Pawn):boolean;
 isFreeColonist(pawn:Pawn):boolean;
 /** Release training ASSIGNABILITY, not completed training. An actual Core
  * eligibility capture is required, never an assumed tamed-animal multiplier. */
 canAssignRelease(animal:WildAnimal):boolean|undefined;
}
export type CaravanPointsCapture261={ok:true;wealth:number;freeColonists:number;colonistHealthSum:number;animalHealthPower:number}|{ok:false;reason:string};
/** Current pile/packed valuation is reused. Unknown humans/animals/objects
 * reject the entire capture: no lower-bound wealth silently changes an incident.
 * Root's real owner preflight must already establish unique recursive holders. */
export function captureCaravanPoints261(group:AwayGroup,a:CaravanValueAuthorities261):CaravanPointsCapture261 {
 let wealth=f(0),freeColonists=0,colonistHealthSum=f(0),animalHealthPower=f(0);
 for(const item of group.items){const value=pileMarketValue(item);if(value===undefined)return {ok:false,reason:`Missing caravan pile market value ${item.id}`};wealth=f(wealth+f(value*item.quantity));}
 for(const pack of group.packed??[]){try{wealth=f(wealth+f(structureRoomMarketValue(pack.building)));}catch(error){if(!(error instanceof RangeError))throw error;return {ok:false,reason:`Missing caravan packed market value ${pack.building.id}`};}}
 for(const human of group.members){if(a.isPlayerHuman(human)){const value=a.humanMarketValue(human);if(value===undefined||!Number.isFinite(value)||value<0)return {ok:false,reason:`Missing caravan human market value ${human.id}`};wealth=f(wealth+f(value));}
  if(a.isFreeColonist(human)){freeColonists++;colonistHealthSum=f(colonistHealthSum+f(human.health?summaryHealthPercent(human.health):1));}}
 for(const animal of group.animalOwners?.members??[]){
  if(!animal.domestic)continue;
  const value=animalMarketValue261(animal,a.animalClinical?.(animal));if(!value.ok)return value;wealth=f(wealth+value.value);
  if(animal.state==='downed'||animal.state==='dead')continue;
  const eligible=a.canAssignRelease(animal);if(eligible===undefined)return {ok:false,reason:`Missing caravan release assignability ${animal.id}`};
  if(eligible){const health=animal.health?summaryHealthPercent(animal.health):1;animalHealthPower=f(animalHealthPower+f(actualAnimalProfile256(animal).combatPower*f(f(.35)+f(f(.65)*f(health)))));}
 }
 return {ok:true,wealth:f(wealth*f(.7)),freeColonists,colonistHealthSum,animalHealthPower};
}
/** Current Adventure Story adaptation/minimum/time profile reused explicitly.
 * Core caravan differs from a home map by .7 wealth, .7 animal combat points,
 * and a real per-opportunity [.7,.9] draw. The caller supplies complete wealth
 * already multiplied by.7 (capture above), not colony sampled lower-bound wealth.
 * Human SummaryHealth and local seeded minimum remain existing declared models. */
export function calculateCaravanThreatPoints261(c:Extract<CaravanPointsCapture261,{ok:true}>,context:{elapsedDays:number;adaptationDays:number;seedBucket:number},draw:()=>number):number {
 const ordinary=computeThreatPoints({knownWealth:c.wealth,freeColonists:c.freeColonists,colonistHealthSum:c.colonistHealthSum,...context});
 if(!Number.isFinite(c.animalHealthPower)||c.animalHealthPower<0)throw Error('Invalid animal combat-power capture');
 const r=draw();if(!Number.isFinite(r)||r<0||r>=1)throw Error('Invalid caravan point draw');
 const animalPoints=f(f(c.animalHealthPower*f(.08))*f(.7));
 const randomFactor=f(f(.7)+f(f(.2)*f(r)));
 const unbounded=f(f(f(f(ordinary.wealthPoints+ordinary.colonistPoints+animalPoints)*randomFactor)*f(ordinary.adaptationFactor))*f(.6)*f(ordinary.timeFactor));
 return Math.min(10000,Math.max(ordinary.minimum,unbounded));
}
