import { captureHumanOwners,everyHumanPawnOwner } from './human-owners.ts';
import { cookingSpot,ingredientPlaceFree,ingredientWithinReach,validBillSettings } from './cooking-bills.ts';
import { validateCooking } from './cooking-save.ts';
import { validCookingOrder } from './player-cooking-save.ts';
import { isCookingOrder } from './order-types.ts';
import { cremationIngredientAllowed,isCremationRecipe,validCremationIngredients } from './cremation-rules.ts';
import { reservedSource } from './materials.ts';
import { groundCapacity } from './ground-placement.ts';
import { canStandAt } from './furniture-travel.ts';
import { withoutQueuedOrder } from './haul-reservations.ts';
import { validatePileRecordShape } from './material-record-save.ts';
import { validHumanBodyShape } from './burial-save.ts';
import { isBlockMaterial } from './building-materials.ts';
import { footprintCells } from './definitions.ts';
import { validatePower } from './power-save.ts';
import type { PowerParentReader } from './power-parent-validation.ts';
import type { StagingGeometryReader } from './staging-validation.ts';
import type { CookingTask } from './cooking-types.ts';
import type { Pawn,World } from './types.ts';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,lo=0,hi=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=lo&&Number(v)<=hi;
const prospectiveBill=(b:unknown)=>object(b)&&(isCremationRecipe(b.recipe)||Object.hasOwn(b,'cremationFilter'));
const prospectivePawn=(p:Pawn)=>isCremationRecipe(p.cooking?.recipe)||(p.orders?.queue??[]).some(o=>isCookingOrder(o)&&isCremationRecipe(o.cooking.recipe));

/** The original World owns every human, corpse and clock. The guard neither
 * projects scouts nor decides policy, searches a route or consumes a body. */
export function validateCremation(w:World,version:number,powerTopology?:PowerParentReader,indexStaging=false,geometry?:StagingGeometryReader):string[] {
  if(Object.hasOwn(w,'cremation'))return ['Unexpected cremation counter.'];
  if(Object.hasOwn(w,'packed')&&!Array.isArray(w.packed))return ['Malformed packed furniture container.'];
  const packs=[...(w.packed??[]),...[...(w.visitors?.departed??[]),...(w.podRescues?.departed??[])].flatMap(d=>d.packed??[])];
  const physical=[...w.structures,...w.jobs,...packs.map(p=>p.building)];
  const content=[...physical,...w.jobs.flatMap(j=>[j.furniture,j.deconstruction,j.flick,j.repair,j.fixBreakdown].filter(Boolean))];
  const bills=content.flatMap(s=>s&&'bills' in s&&Array.isArray(s.bills)?s.bills:[]);
  if(!content.some(s=>s&&'kind' in s&&s.kind==='electric-crematorium')&&!bills.some(prospectiveBill)&&everyHumanPawnOwner(w,p=>!prospectivePawn(p)))return [];
  if(version<225)return ['Future cremation station, recipe or filter.'];
  const errors:string[]=[],owners=captureHumanOwners(w);
  if(packs.some(p=>p.building.kind==='electric-crematorium')||w.jobs.some(j=>j.furniture?.kind==='electric-crematorium'))errors.push('Crematorium cannot be minified or installed.');
  for(const b of bills)if(prospectiveBill(b)&&(!object(b)||!isCremationRecipe(b.recipe)||!validBillSettings(b,'cremate-corpse',version)))errors.push('Invalid cremation bill or filter attached to another recipe.');
  for(const s of [...w.structures,...w.jobs])if(s.kind==='electric-crematorium'&&(!isBlockMaterial(s.material)||s.footprint!=='standard'||!int(s.orientation,0,3)||Object.hasOwn(s,'fuel')
    ||footprintCells(s).some(c=>!int(c.x,0,w.width-1)||!int(c.z,0,w.height-1))))errors.push('Invalid crematorium footprint or material.');
  errors.push(...validatePower(w,version,'electric-crematorium',powerTopology));
  errors.push(...validateCooking(w,version,new Set(),true,indexStaging,geometry));
  if(owners.pawnOwners.some(o=>o.kind!=='map'&&prospectivePawn(o.pawn!)))errors.push('Off-map owner retains a local cremation task.');
  const stations=new Set(w.pawns.filter(p=>p.cooking).map(p=>p.cooking!.stationId));
  const spots=new Set(w.pawns.filter(p=>p.cooking).map(p=>p.cooking!.spot.z*w.width+p.cooking!.spot.x));
  const checkedBodies=new Set<number>();
  const source=(p:Pawn,c:CookingTask,queued=false)=>{
    const station=w.structures.find(s=>s.id===c.stationId&&s.kind==='electric-crematorium'),bill=station?.bills?.find(b=>b.id===c.billId&&isCremationRecipe(b.recipe));
    if(!station||!bill||bill.suspended||!validCremationIngredients(c.ingredients)){errors.push('Invalid cremation station or whole corpse reservation.');return;}
    if(c.phase==='output'||c.productId!==null||c.storageId!==null||Object.hasOwn(c,'storageQuantity')||Object.hasOwn(c,'workTicks'))errors.push('Cremation cannot own an output or learning counter.');
    if((w.packed??[]).some(pack=>pack.owner.type==='pawn'&&pack.owner.pawnId===p.id))errors.push('Cremation worker carries packed furniture.');
    const spot=cookingSpot(station),part=c.ingredients[0]!,pile=w.piles.find(i=>i.id===part.pileId);
    if(c.spot.x!==spot.x||c.spot.z!==spot.z||!pile||!cremationIngredientAllowed(w,bill,pile)||pile.item!==part.item||reservedSource(w,part.pileId)>(part.stage==='held'?0:1)){errors.push('Invalid or multiply claimed cremation corpse.');return;}
    errors.push(...validatePileRecordShape(pile as unknown as Record<string,unknown>,w,version));
    if(pile.humanCorpse){
      const body=w.pawns.find(q=>q.id===pile.humanCorpse!.pawnId);
      if(!body||!validHumanBodyShape(body.body,version,w.tick,body.health)||body.body?.pileId!==pile.id||body.body.lostAt!==undefined||checkedBodies.has(body.id)
        ||w.pawns.some(q=>q.burial?.bodyPawnId===body.id))errors.push('Invalid or multiply claimed historical human corpse.');
      checkedBodies.add(pile.humanCorpse.pawnId);
    }
    if(part.stage==='held'?queued||pile.owner.type!=='pawn'||pile.owner.pawnId!==p.id:pile.owner.type!=='ground')errors.push('Invalid cremation corpse carrier.');
    if(part.stage==='placed'&&pile.owner.type==='ground'&&(pile.owner.x!==part.cell.x||pile.owner.z!==part.cell.z))errors.push('Cremation corpse is not at its reserved cell.');
    if(part.stage==='source'&&pile.owner.type==='ground'&&(pile.owner.x-station.x)**2+(pile.owner.z-station.z)**2>bill.radius**2)errors.push('Cremation corpse outside bill radius.');
    if(c.phase!=='interrupted'&&(!ingredientWithinReach(part.cell,spot,station)||!ingredientPlaceFree(w,part.cell,spot,'cremate-corpse',station,geometry)||!canStandAt(w,part.cell)))errors.push('Invalid cremation staging cell.');
  };
  for(const p of w.pawns)if(isCremationRecipe(p.cooking?.recipe)){
    // These are concurrent owners, not momentary danger or capacity checks.
    // An already committed movement/stun remains the existing task's clock.
    if((p.faction??'colony')!=='colony'||p.prisoner||p.visitor||p.raid||p.podRescue||!['moving','working'].includes(p.state)||!int(p.priorities.haul,1,4)
      ||p.recreation.task||p.burial||p.cleaning||p.firefighting||p.research||p.trade||p.ward||p.tend||p.feed||p.rescue||p.surgery
      ||p.animalHandling||p.animalCare||p.animalFeed||p.animalRescue||p.deepWork||p.orbitalTrade||p.equipmentTask||p.hunting
      ||p.allowedAreaReturn||p.shooting?.order||p.melee?.order||p.tactics?.targetId!==undefined&&p.tactics.targetId!==null
      ||p.tactics?.post||p.social?.fight)errors.push('Cremation worker has a conflicting activity or owner.');
    if(p.cooking!.phase==='work'&&((p.motion?.end??0)>w.tick||p.moveCooldown>0))errors.push('Cremation work precedes completion of the physical movement segment.');
    source(p,p.cooking!);
  }
  for(const p of w.pawns)for(const order of p.orders?.queue??[])if(isCookingOrder(order)&&isCremationRecipe(order.cooking.recipe)){
    if(!validCookingOrder(order,w)){errors.push('Invalid queued cremation order.');continue;}
    const c=order.cooking,key=c.spot.z*w.width+c.spot.x;
    if(stations.has(c.stationId)||spots.has(key))errors.push('Duplicate queued cremation station or interaction cell.');stations.add(c.stationId);spots.add(key);
    source(p,c,true);
    const part=c.ingredients[0]!,view=withoutQueuedOrder(w,order);
    if(part.stage==='source'&&groundCapacity(view,part.cell,part.item,p.id,geometry)<1)errors.push('Invalid queued cremation staging capacity.');
  }
  return errors;
}
export function validCremationTransport(w:World,version:number=w.schemaVersion,powerTopology?:PowerParentReader,indexStaging=false,geometry?:StagingGeometryReader):boolean {
  try{return validateCremation(w,version,powerTopology,indexStaging,geometry).length===0;}catch{return false;}
}
