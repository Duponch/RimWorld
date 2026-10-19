import {isColonist} from './affiliation.ts';
import {allowedFood,type FoodItemId} from './food-policy.ts';
import {ITEM_DEFINITIONS,nutritionOf} from './items.ts';
import {ticksUntilRot} from './food-preservation.ts';
import {groupOnMapMember} from './group-state.ts';
import type {Pawn,World,MaterialPile,Structure} from './types.ts';

export type FoodReadabilityStatus='matched'|'blocked'|'empty'|'engaged'|'paste-unchecked'|'excluded';
export interface FoodPersonReadability {readonly pawnId:number;readonly status:FoodReadabilityStatus;readonly freshPileCount:number}
export interface FoodReadability {
 readonly byPawn:ReadonlyMap<number,FoodPersonReadability>;
 readonly blockedPawnIds:readonly number[];readonly evaluatedPawnIds:readonly number[];
 readonly engagedPawnIds:readonly number[];readonly pasteUncheckedPawnIds:readonly number[];readonly excludedPawnIds:readonly number[];
 /** Current fresh physical amount, nutrition units rather than local hundredths.
  * Each ground/local civilian-held pile counts once, not once per eater. */
 readonly freshNutrition:number;readonly survivalMeals:number;readonly freshPileCount:number;
}
const civil=(p:Pawn)=>isColonist(p)&&!p.prisoner&&!p.visitor&&!p.raid&&!p.podRescue&&p.state!=='dead'&&!p.health?.death;
function excluded(w:World,p:Pawn):boolean {
 return !!p.mental?.crisis||p.state==='downed'||p.state==='resting'||!!p.medicalSleep
  ||p.need?.kind==='sleep'&&p.need.medical!==undefined||groupOnMapMember(w,p.id)
  ||!!w.scout&&'pawnId' in w.scout&&w.scout.pawnId===p.id
  ||!!w.commercialTrip&&'pawnId' in w.commercialTrip&&w.commercialTrip.pawnId===p.id;
}
interface Bucket {items:Set<FoodItemId>;count:number}
const bucket=():Bucket=>({items:new Set(),count:0});

/** Pure, deliberately incomplete presentation reading of one confirmed map.
 * No reachability, prison topology, reservation, paste production or allocation
 * is inferred. Callers explicitly share this capture for the adoption cycle. */
export interface FoodReadabilityVisibility {pileVisible?(pile:MaterialPile):boolean;structureVisible?(structure:Structure):boolean}
export function captureFoodReadability(world:World,visibility:FoodReadabilityVisibility={}):FoodReadability {
 const people=world.pawns.filter(civil),ids=new Set(people.map(p=>p.id)),ground=bucket(),held=new Map<number,Bucket>();
 let freshNutrition=0,survivalMeals=0,freshPileCount=0;
 for(const pile of world.piles){
  if(pile.kind!=='food'||pile.item==='hay'||pile.quantity<=0||!ITEM_DEFINITIONS[pile.item].nutrition||visibility.pileVisible?.(pile)===false||ticksUntilRot(pile,world.tick)<=0)continue;
  const owner=pile.owner;
  if(owner.type!=='ground'&&(owner.type!=='pawn'||!ids.has(owner.pawnId)))continue;
  freshNutrition+=nutritionOf(pile)/100;freshPileCount++;if(pile.item==='survival-meal')survivalMeals+=pile.quantity;
  const target=owner.type==='ground'?ground:held.get(owner.pawnId)??bucket();target.items.add(pile.item as FoodItemId);target.count++;
  if(owner.type==='pawn')held.set(owner.pawnId,target);
 }
 const pasteExists=world.structures.some(s=>s.kind==='nutrient-paste-dispenser'&&visibility.structureVisible?.(s)!==false);
 const byPawn=new Map<number,FoodPersonReadability>(),blockedPawnIds:number[]=[],evaluatedPawnIds:number[]=[],engagedPawnIds:number[]=[],pasteUncheckedPawnIds:number[]=[],excludedPawnIds:number[]=[];
 for(const pawn of people){
  const own=held.get(pawn.id),count=ground.count+(own?.count??0);let status:FoodReadabilityStatus;
  if(excluded(world,pawn)){status='excluded';excludedPawnIds.push(pawn.id);}
  else if(pawn.need?.kind==='eat'){status='engaged';engagedPawnIds.push(pawn.id);}
  else{
   const allowed=allowedFood(world,pawn);
   if(allowed.some(item=>ground.items.has(item)||own?.items.has(item)))status='matched';
   else if(pasteExists&&allowed.includes('nutrient-paste-meal')){status='paste-unchecked';pasteUncheckedPawnIds.push(pawn.id);}
   else status=count?'blocked':'empty';
   if(status!=='paste-unchecked')evaluatedPawnIds.push(pawn.id);if(status==='blocked')blockedPawnIds.push(pawn.id);
  }
  byPawn.set(pawn.id,{pawnId:pawn.id,status,freshPileCount:count});
 }
 return {byPawn,blockedPawnIds,evaluatedPawnIds,engagedPawnIds,pasteUncheckedPawnIds,excludedPawnIds,freshNutrition,survivalMeals,freshPileCount};
}
