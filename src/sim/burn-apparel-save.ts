import {isBurnApparelRecipe} from './burn-apparel-content.ts';
import {burnApparelIngredientAllowed,validBurnApparelIngredients} from './burn-apparel-rules.ts';
import {captureHumanOwners,everyHumanPawnOwner} from './human-owners.ts';
import {validateCooking} from './cooking-save.ts';
import {validCookingOrder} from './player-cooking-save.ts';
import {cookingSpot,ingredientWithinReach,ingredientPlaceFree,validBillSettings} from './cooking-bills.ts';
import {isCookingOrder} from './order-types.ts';
import {withoutQueuedOrder} from './haul-reservations.ts';
import {reservedSource} from './materials.ts';
import {groundCapacity} from './ground-placement.ts';
import {validatePileRecordShape} from './material-record-save.ts';
import type {StagingGeometryReader} from './staging-validation.ts';
import type {CookingTask} from './cooking-types.ts';
import type {Pawn,World} from './types.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,lo=0,hi=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=lo&&Number(v)<=hi;
// These domains own local work, bills, contained people or frozen records.
// Large map grids and unrelated catalogue permissions are never traversed.
const DOMAINS=['pawns','structures','jobs','packed','startingArrival','scout','commercialTrip','group','groupLosses',
 'visitors','podRescues','raids','prisonDepartures','arrivals','quests','orbital'] as const;
function historicalDomain(value:unknown):boolean {
 if(Array.isArray(value))return value.every(historicalDomain);
 if(!record(value))return true;
 for(const key of Object.keys(value)){
  if(key==='tiles'||key==='resources'||key==='planet')continue;
  const child=value[key];
  if(key==='recipe'&&isBurnApparelRecipe(child))return false;
  if(!historicalDomain(child))return false;
 }
 return true;
}
/** RAW and full/delta envelopes are rejected before migration or adoption.
 * The field is a recipe marker, never a free-form label or an apparel item. */
export function validBurnApparelHistoricalTransport(value:unknown,version:number):boolean {
 try{
  if(version>=251||!record(value))return true;
  const world=record(value.world)?value.world:value;
  const domains=(w:unknown)=>!record(w)||DOMAINS.every(key=>historicalDomain(w[key]));
  return domains(world)&&(!record(world.secondarySite)||domains(world.secondarySite.map))
   &&(world===value||historicalDomain(value.structures));
 }catch{return false;}
}

/** The existing production guard owns shapes, physical staging and clocks.
 * This bounded addition closes whole-apparel, queue and foreign-owner edges. */
export function validateBurnApparel(w:World,version:number,indexStaging=false,geometry?:StagingGeometryReader):string[] {
 const archivedPacks=[...(w.visitors?.departed??[]),...(w.podRescues?.departed??[])].flatMap(d=>d.packed??[]);
 const physical=[...w.structures,...w.jobs,...(w.packed??[]).map(p=>p.building),...archivedPacks.map(p=>p.building)];
 const content=[...physical,...w.jobs.flatMap(j=>[j.furniture,j.deconstruction,j.flick,j.repair,j.fixBreakdown].filter(Boolean))];
 const bills=content.flatMap(s=>s&&'bills' in s&&Array.isArray(s.bills)?s.bills:[]);
 const prospective=(p:Pawn)=>isBurnApparelRecipe(p.cooking?.recipe)||(p.orders?.queue??[]).some(o=>isCookingOrder(o)&&isBurnApparelRecipe(o.cooking.recipe));
 if(!bills.some(b=>isBurnApparelRecipe(b?.recipe))&&everyHumanPawnOwner(w,p=>!prospective(p)))return [];
 if(version<251)return ['Future apparel-burning recipe.'];
 const errors:string[]=[],owners=captureHumanOwners(w),foreign=owners.slots.filter(s=>s.kind!=='map');
 if([...w.packed,...archivedPacks].some(pack=>pack.building.bills?.some(b=>isBurnApparelRecipe(b?.recipe)))
  ||w.jobs.some(j=>j.furniture&&'bills' in j.furniture&&Array.isArray(j.furniture.bills)&&j.furniture.bills.some(b=>isBurnApparelRecipe(b?.recipe))))errors.push('Apparel-burning stations cannot be minified or installed.');
 for(const s of content)if(s&&'bills' in s&&Array.isArray(s.bills))for(const b of s.bills)if(isBurnApparelRecipe(b?.recipe)
  &&(!('kind' in s)||s.kind!=='campfire'&&s.kind!=='electric-crematorium'||!validBillSettings(b,'burn-apparel',version)))errors.push('Invalid apparel-burning station or bill.');
 if(foreign.some(s=>s.pawn&&prospective(s.pawn)))errors.push('Off-map owner retains local apparel-burning work.');
 errors.push(...validateCooking(w,version,new Set(),true,indexStaging,geometry));
 if(errors.length)return errors;
 const stations=new Set(w.pawns.filter(p=>p.cooking).map(p=>p.cooking!.stationId));
 const spots=new Set(w.pawns.filter(p=>p.cooking).map(p=>p.cooking!.spot.z*w.width+p.cooking!.spot.x));
 for(const p of w.pawns)for(const o of p.orders.queue)if(isCookingOrder(o)&&!isBurnApparelRecipe(o.cooking.recipe)){
  stations.add(o.cooking.stationId);spots.add(o.cooking.spot.z*w.width+o.cooking.spot.x);
 }
 const source=(p:Pawn,c:CookingTask,queued=false)=>{
  if(!['gather','work'].includes(c.phase)||c.productId!==null||c.storageId!==null||Object.hasOwn(c,'storageQuantity')||Object.hasOwn(c,'workTicks')
   ||!validBurnApparelIngredients(c.ingredients)){errors.push('Apparel burning requires one whole input and no output.');return;}
  const station=w.structures.find(s=>s.id===c.stationId&&(s.kind==='campfire'||s.kind==='electric-crematorium'));
  const bill=station?.bills?.find(b=>b.id===c.billId&&isBurnApparelRecipe(b.recipe));
  const part=c.ingredients[0]!,pile=w.piles.find(i=>i.id===part.pileId);
  if(!station||!bill||bill.suspended||!pile||!burnApparelIngredientAllowed(bill,pile)||part.item!==pile.item||part.quantity!==1||pile.quantity!==1){errors.push('Invalid or filtered whole apparel input.');return;}
  errors.push(...validatePileRecordShape(pile as unknown as Record<string,unknown>,w,version));
  const spot=cookingSpot(station);
  if(c.spot.x!==spot.x||c.spot.z!==spot.z||reservedSource(w,pile.id)>(part.stage==='held'?0:1))errors.push('Invalid or multiply claimed apparel-burning input.');
  if(part.stage==='held'?queued||pile.owner.type!=='pawn'||pile.owner.pawnId!==p.id:pile.owner.type!=='ground')errors.push('Invalid apparel-burning input owner.');
  if(part.stage==='placed'&&pile.owner.type==='ground'&&(pile.owner.x!==part.cell.x||pile.owner.z!==part.cell.z))errors.push('Apparel-burning input is not at its staging cell.');
  if(part.stage==='source'&&pile.owner.type==='ground'&&(pile.owner.x-station.x)**2+(pile.owner.z-station.z)**2>bill.radius**2)errors.push('Apparel-burning input outside bill radius.');
  if(!ingredientWithinReach(part.cell,spot,station)||!ingredientPlaceFree(w,part.cell,spot,'burn-apparel',station,geometry))errors.push('Invalid apparel-burning staging cell.');
  if(w.packed.some(pack=>pack.owner.type==='pawn'&&pack.owner.pawnId===p.id))errors.push('Apparel-burning worker carries packed furniture.');
 };
 for(const p of w.pawns)if(isBurnApparelRecipe(p.cooking?.recipe)){
  if((p.faction??'colony')!=='colony'||p.prisoner||p.visitor||p.raid||p.podRescue||!['moving','working'].includes(p.state)||!int(p.priorities.haul,1,4)
   ||p.recreation.task||p.burial||p.cleaning||p.firefighting||p.research||p.trade||p.ward||p.tend||p.feed||p.rescue||p.surgery
   ||p.animalHandling||p.animalCare||p.animalFeed||p.animalRescue||p.deepWork||p.orbitalTrade||p.equipmentTask||p.hunting
   ||p.allowedAreaReturn||p.shooting?.order||p.melee?.order||p.tactics?.targetId!==undefined&&p.tactics.targetId!==null||p.tactics?.post||p.social?.fight)errors.push('Apparel-burning worker has a conflicting activity or owner.');
  if(p.cooking!.phase==='work'&&((p.motion?.end??0)>w.tick||p.moveCooldown>0))errors.push('Apparel burning precedes completion of movement.');
  source(p,p.cooking!);
 }
 for(const p of w.pawns)for(const o of p.orders.queue)if(isCookingOrder(o)&&isBurnApparelRecipe(o.cooking.recipe)){
  if(!validCookingOrder(o,w)){errors.push('Invalid queued apparel-burning order.');continue;}
  const c=o.cooking,key=c.spot.z*w.width+c.spot.x;
  if(stations.has(c.stationId)||spots.has(key))errors.push('Duplicate queued apparel-burning workstation.');
  stations.add(c.stationId);spots.add(key);source(p,c,true);
  const part=c.ingredients[0]!;
  if(part.stage==='source'&&groundCapacity(withoutQueuedOrder(w,o),part.cell,part.item,p.id,geometry)<1)errors.push('Invalid queued apparel-burning staging capacity.');
 }
 return errors;
}
export function validBurnApparelTransport(w:World,version:number=w.schemaVersion,indexStaging=false,geometry?:StagingGeometryReader):boolean {
 try{return validateBurnApparel(w,version,indexStaging,geometry).length===0;}catch{return false;}
}
