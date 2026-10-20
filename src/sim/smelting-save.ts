import {isBurnApparelRecipe} from './burn-apparel-content.ts';
import { captureHumanOwners } from './human-owners.ts';
import { validateCooking } from './cooking-save.ts';
import { validCookingOrder } from './player-cooking-save.ts';
import { cookingSpot,ingredientPlaceFree,ingredientWithinReach,validBillSettings } from './cooking-bills.ts';
import { withoutQueuedOrder } from './haul-reservations.ts';
import { isCookingOrder } from './order-types.ts';
import { isSmeltingRecipe,smeltingIngredientAllowed } from './smelting-rules.ts';
import { reservedSource } from './materials.ts';
import { groundCapacity } from './ground-placement.ts';
import { validatePileRecordShape } from './material-record-save.ts';
import { validatePower } from './power-save.ts';
import { footprintCells } from './definitions.ts';
import { productionResearchUnlocked } from './machining.ts';
import type { PowerParentReader } from './power-parent-validation.ts';
import type { StagingGeometryReader } from './staging-validation.ts';
import type { World } from './types.ts';

const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,lo=0,hi=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=lo&&Number(v)<=hi;
const prospectiveBill=(b:unknown)=>obj(b)&&(isSmeltingRecipe(b.recipe)||Object.hasOwn(b,'smeltFilter'));

/** One prospective production domain; original owners and clocks remain real.
 * Shapes/staging reuse validateCooking, without running full validateWorld or
 * advancing power, deciding a job, repairing an input, or drawing the PRNG. */
export function validateSmelting(w:World,version:number,powerTopology?:PowerParentReader,indexStaging=false,geometry?:StagingGeometryReader):string[] {
  if(Object.hasOwn(w,'packed')&&!Array.isArray(w.packed))return ['Malformed packed furniture container.'];
  const errors:string[]=[],owners=captureHumanOwners(w),foreign=owners.slots.filter(s=>s.kind!=='map');
  if(owners.slots.some(s=>s.pawn&&Object.hasOwn(s.pawn,'orders')&&(!obj(s.pawn.orders)||!Array.isArray(s.pawn.orders.queue))))return ['Malformed production order container.'];
  const packs=[...(w.packed??[]),...foreign.flatMap(s=>s.packed)];
  const physical=[...w.structures,...w.jobs,...packs.map(p=>p.building)];
  const content=[...physical,
    ...w.jobs.flatMap(j=>[j.furniture,j.deconstruction,j.flick,j.fixBreakdown].filter(Boolean))];
  const machines=physical.filter(s=>s.kind==='electric-smelter');
  const machinePresent=content.some(s=>s?.kind==='electric-smelter');
  const bills=content.flatMap(s=>s&&'bills' in s&&Array.isArray(s.bills)?s.bills:[]);
  const taskPresent=owners.slots.some(s=>s.pawn&&(isSmeltingRecipe(s.pawn.cooking?.recipe)
    ||(s.pawn.orders?.queue??[]).some(o=>isCookingOrder(o)&&isSmeltingRecipe(o.cooking.recipe))));
  if(!machinePresent&&!bills.some(prospectiveBill)&&!taskPresent)return errors;
  if(version<222)return ['Future smelting station, recipe or filter.'];
  if(version<267&&(bills.some(b=>b?.recipe==='smelt-apparel')||owners.slots.some(s=>s.pawn&&(s.pawn.cooking?.recipe==='smelt-apparel'||s.pawn.orders.queue.some(o=>isCookingOrder(o)&&o.cooking.recipe==='smelt-apparel')))))return ['Future apparel-smelting recipe.'];
  for(const b of bills)if(prospectiveBill(b)&&(!obj(b)||!(isSmeltingRecipe(b.recipe)&&validBillSettings(b,b.recipe,version)||version>=251&&isBurnApparelRecipe(b.recipe)&&validBillSettings(b,'burn-apparel',version))))errors.push('Invalid smelting bill or filter attached to another recipe.');
  if(foreign.some(s=>s.pawn&&(isSmeltingRecipe(s.pawn.cooking?.recipe)
    ||(s.pawn.orders?.queue??[]).some(o=>isCookingOrder(o)&&isSmeltingRecipe(o.cooking.recipe)))))errors.push('Off-map owner retains a local smelting task.');
  if(machines.length&&!productionResearchUnlocked(w,'smelt-weapon'))errors.push('Unavailable electric smelter.');
  for(const s of machines)if(!s||Object.hasOwn(s,'fuel')||s.material!=='steel'||s.footprint!=='standard'||!int(s.orientation,0,3)
    ||footprintCells(s).some(c=>!int(c.x,0,w.width-1)||!int(c.z,0,w.height-1)))errors.push('Invalid electric smelter footprint or material.');
  // Archived packs have their own inactive state; do not project their owners.
  const powerWorld=packs.length===w.packed.length?w:{...w,packed:packs};
  errors.push(...validatePower(powerWorld,version,'electric-smelter',powerTopology));
  errors.push(...validateCooking(w,version,new Set(),true,indexStaging,geometry));
  for(const p of w.pawns)if(isSmeltingRecipe(p.cooking?.recipe)){
    const c=p.cooking!;
    const activePiles=c.phase==='output'?w.piles.filter(i=>i.id===c.productId):c.ingredients.map(i=>w.piles.find(p=>p.id===i.pileId)).filter(p=>p!==undefined);
    for(const pile of activePiles)errors.push(...validatePileRecordShape(pile as unknown as Record<string,unknown>,w,version));
    if(w.packed.some(pack=>pack.owner.type==='pawn'&&pack.owner.pawnId===p.id))errors.push('Smelting worker carries packed furniture.');
  }
  const stations=new Set(w.pawns.filter(p=>isSmeltingRecipe(p.cooking?.recipe)).map(p=>p.cooking!.stationId));
  const spots=new Set(w.pawns.filter(p=>p.cooking).map(p=>p.cooking!.spot.z*w.width+p.cooking!.spot.x));
  for(const p of w.pawns)for(const order of p.orders.queue)if(isCookingOrder(order)&&isSmeltingRecipe(order.cooking.recipe)){
    if(!validCookingOrder(order,w)){errors.push('Invalid queued smelting order.');continue;}
    const c=order.cooking,station=w.structures.find(s=>s.id===c.stationId&&s.kind==='electric-smelter'),bill=station?.bills?.find(b=>b.id===c.billId&&b.recipe===c.recipe);
    if(!station||!bill||bill.suspended||stations.has(station.id)){errors.push('Missing or duplicate queued smelting station.');continue;}
    const spot=cookingSpot(station),key=spot.z*w.width+spot.x;
    if(c.spot.x!==spot.x||c.spot.z!==spot.z||spots.has(key))errors.push('Invalid or duplicate queued smelting interaction cell.');
    stations.add(station.id);spots.add(key);
    const view=withoutQueuedOrder(w,order);
    for(const part of c.ingredients){
      const pile=w.piles.find(i=>i.id===part.pileId);
      if(!pile||!smeltingIngredientAllowed(bill,pile)||part.quantity!==1||pile.item!==part.item||pile.owner.type!=='ground'
        ||reservedSource(w,pile.id)>1||part.stage==='source'&&pile.owner.type==='ground'&&(pile.owner.x-station.x)**2+(pile.owner.z-station.z)**2>bill.radius**2
        ||!ingredientWithinReach(part.cell,spot,station)||!ingredientPlaceFree(w,part.cell,spot,bill.recipe,station,geometry)){
        errors.push('Invalid queued smelting weapon or staging.');continue;
      }
      errors.push(...validatePileRecordShape(pile as unknown as Record<string,unknown>,w,version));
      if(part.stage==='placed'?(pile.owner.x!==part.cell.x||pile.owner.z!==part.cell.z):groundCapacity(view,part.cell,part.item,p.id,geometry)<1)errors.push('Invalid queued smelting placement or capacity.');
    }
  }
  return errors;
}
export function validSmeltingTransport(w:World,version:number,powerTopology?:PowerParentReader,indexStaging=false,geometry?:StagingGeometryReader):boolean {
  try{return validateSmelting(w,version,powerTopology,indexStaging,geometry).length===0;}catch{return false;}
}
