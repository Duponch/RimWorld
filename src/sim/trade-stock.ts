import { freshRot } from './food-preservation.ts';
import { ITEM_DEFINITIONS, type ItemId } from './items.ts';
import { WEAPON_QUALITIES, type WeaponQuality } from './equipment-rules.ts';
import { tradeCatalogueEntry } from './trade-catalogue.ts';
import type { MaterialPile } from './types.ts';

interface StockCandidate {readonly value:number;readonly item?:ItemId}
/** All 25 Core-only WeaponRanged candidates participate. Unsupported selections
 * stay absent; their weights are never reassigned to the two delivered guns. */
export const VISITOR_RANGED_POOL:readonly StockCandidate[]=Object.freeze([
  {value:135.4,item:'revolver'},{value:139},{value:220},{value:340},{value:380},{value:505},
  {value:255,item:'bolt-action-rifle'},{value:255},{value:405},{value:355},{value:425},{value:480},
  {value:530},{value:1160},{value:1000},{value:1000},{value:265},{value:245},{value:315},
  {value:44.64},{value:109.2},{value:66},{value:104.4},{value:1010},{value:1355},
]);
/** The 22 Core Clothing definitions use abstract (no stuff) base values. The
 * tribal garment is Sellable-only; the flak vest has no Clothing trade tag. */
export const VISITOR_CLOTHING_POOL:readonly StockCandidate[]=Object.freeze([
  {value:56.48},{value:46.48},{value:121.6},{value:44.32},{value:60.8},{value:45.04},
  {value:91.52},{value:250},{value:121.6},{value:22.88},{value:174.96},{value:151.96},
  {value:188.8},{value:85.76},{value:85.76},{value:99.72,item:'cloth-shirt'},
  {value:196},{value:165.2},{value:475},{value:225},{value:290},{value:178},
]);
/** Soft materials allowed for the shirt: cloth 1.4 of 3.875 commonality.
 * Other textiles/leathers remain omitted rather than silently turned into cloth. */
export const VISITOR_SHIRT_CLOTH_CHANCE=1.4/3.875;
export function visitorSelectionWeight(value:number):number {
  if(value<=500)return 1-value/1000;
  if(value<=1500)return .5-(value-500)*.0003;
  if(value<=5000)return .2-(value-1500)/35000;
  return .1;
}
function random(state:{rng:number}):number {
  let n=state.rng;n^=n<<13;n^=n>>>17;n^=n<<5;state.rng=n>>>0;return state.rng/4294967296;
}
function integer(state:{rng:number},min:number,max:number):number{return min+Math.floor(random(state)*(max-min+1));}
function select(state:{rng:number},pool:readonly StockCandidate[]):StockCandidate {
  let ticket=random(state)*pool.reduce((sum,p)=>sum+visitorSelectionWeight(p.value),0);
  for(const candidate of pool){ticket-=visitorSelectionWeight(candidate.value);if(ticket<0)return candidate;}
  return pool[pool.length-1]!;
}
function traderQuality(state:{rng:number}):WeaponQuality {
  const gaussian=Math.sqrt(-2*Math.log(Math.max(1/4294967296,random(state))))*Math.sin(2*Math.PI*random(state));
  return WEAPON_QUALITIES[Math.max(2,Math.min(5,Math.floor(2.5+gaussian)))]!;
}
export interface VisitorStockPlan {piles:MaterialPile[];nextId:number;rng:number}
/** Pure pre-plan. Callers commit its identities and PRNG only after a real entry
 * is available. Personal food is produced separately and is never sale stock.
 * This private generator reproduces distributions, not Unity's random sequence. */
export function generateVisitorStock(seed:number,pawnId:number,nextId:number,tick:number):VisitorStockPlan {
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||!Number.isSafeInteger(pawnId)||pawnId<=0||!Number.isSafeInteger(nextId)||nextId<=0||!Number.isSafeInteger(tick)||tick<0)throw new RangeError('Invalid visitor stock planning input.');
  const state={rng:seed||1},piles:MaterialPile[]=[];
  const add=(item:ItemId,quantity:number,quality?:WeaponQuality)=>{
    if(quantity<=0)return;
    if(!Number.isSafeInteger(nextId+1))throw new RangeError('Visitor stock identity overflow.');
    const kind=ITEM_DEFINITIONS[item].kind,pile:MaterialPile={id:nextId++,kind,item,quantity,owner:{type:'inventory',pawnId},...freshRot(item,tick)};
    if(quality){const condition={quality,hitPoints:tradeCatalogueEntry(item)!.maxHitPoints};if(kind==='weapon')pile.weapon=condition;else pile.apparel=condition;}
    piles.push(pile);
  };
  add('silver',integer(state,50,250));
  add('component',integer(state,-2,5));
  add('survival-meal',integer(state,3,6));
  add('medicine',integer(state,1,6));
  // Barrels, recreational drugs and DLC techprints have no delivered item here.
  // MultiDef Cloth/Chocolate has no count/price range in this Core definition:
  // it can buy either but creates zero units, so no cloth quantity is invented.
  if(integer(state,0,1)){
    const candidate=select(state,VISITOR_RANGED_POOL),quality=traderQuality(state);
    if(candidate.item)add(candidate.item,1,quality);
  }
  if(integer(state,0,1)){
    const candidate=select(state,VISITOR_CLOTHING_POOL),cloth=random(state)<VISITOR_SHIRT_CLOTH_CHANCE,quality=traderQuality(state);
    if(candidate.item&&cloth)add(candidate.item,1,quality);
  }
  return {piles,nextId,rng:state.rng};
}
