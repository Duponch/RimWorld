import type { Cell,Resource,World } from './types.ts';
import { ingestFoodRisk } from './food-hygiene.ts';
import type { WildAnimal } from './wildlife-state.ts';
import { harvestable,isPlant,plantGrowth } from './plants.ts';
import { plantLeafless } from './plant-life.ts';
import { ITEM_DEFINITIONS,type ItemId } from './items.ts';
import { reservedSource,reservedSourcesByPile } from './materials.ts';
import { releaseAssignments } from './work-release.ts';
import { animalNutritionMax } from './animal-life.ts';
import { grazingResult,plantNutrition } from './biome-flora.ts';
import { penRegion } from './animal-pens.ts';

/** A closed pen bounds actual food candidates; it never supplies nutrition. */
export function grazingPen(world:World,a:WildAnimal):ReadonlySet<number>|undefined {
  const id=a.domestic?.penMarkerId;if(!id)return;
  const region=penRegion(world,id);
  return region?.closed&&region.cells.has(a.z*world.width+a.x)?region.cells:undefined;
}

export interface AnimalFood extends Cell { id:number;kind:'plant'|'pile';quantity:number }
// Herbivory is an explicit content profile. New nutritious items do not silently
// become animal food; prepared meals remain admissible under the existing rule.
const herbivoreFoods:ReadonlySet<ItemId>=new Set(['berries','rice','potato','corn','agave-fruit','simple-meal','fine-meal','vegetarian-fine-meal','lavish-meal','survival-meal','legacy-portion']);
function invalidatePlantWork(world:World,r:Resource,removed=false):void {
  const ids=new Set(world.jobs.filter(j=>j.x===r.x&&j.z===r.z&&(j.kind==='cut'||j.kind==='harvest'&&(removed||!harvestable(world,r)))).map(j=>j.id));
  if(!ids.size)return;
  for(const pawn of world.pawns){if(pawn.jobId!==null&&ids.has(pawn.jobId))releaseAssignments(world,pawn);pawn.orders.queue=pawn.orders.queue.filter(order=>typeof order!=='number'||!ids.has(order));}
  world.jobs=world.jobs.filter(j=>!ids.has(j.id));
}
function unclaimedPlant(world:World,r:Resource,except:number):boolean {
  return !world.wildlife?.animals.some(a=>a.id!==except&&a.meal?.kind==='plant'&&a.meal.id===r.id)
    &&!world.jobs.some(j=>j.reservedBy!==null&&j.x===r.x&&j.z===r.z&&['harvest','cut','sow'].includes(j.kind));
}
export function animalFoods(world:World,a:WildAnimal):AnimalFood[] {
  const result:AnimalFood[]=[];
  const capacity=animalNutritionMax(a);
  const pen=grazingPen(world,a);
  // A food search can inspect thousands of plants. Collect competing claims
  // once for this decision instead of walking every animal and job per plant.
  const claimedPlants=new Set<number>();
  for(const other of world.wildlife?.animals??[])if(other.id!==a.id&&other.meal?.kind==='plant')claimedPlants.add(other.meal.id);
  const reservedPlantCells=new Set<number>();
  for(const job of world.jobs)if(job.reservedBy!==null&&(job.kind==='harvest'||job.kind==='cut'||job.kind==='sow'))reservedPlantCells.add(job.z*world.width+job.x);
  for(const r of world.resources)if((!pen||pen.has(r.z*world.width+r.x))&&isPlant(r)&&!plantLeafless(world,r)) {
    const growth=plantGrowth(world,r);
    if(growth>=.1&&plantNutrition(r,growth)>0&&!claimedPlants.has(r.id)&&!reservedPlantCells.has(r.z*world.width+r.x))result.push({id:r.id,kind:'plant',x:r.x,z:r.z,quantity:1});
  }
  let reservations:ReadonlyMap<number,number>|undefined;
  for(const p of world.piles)if(p.kind==='food'&&herbivoreFoods.has(p.item)&&p.owner.type==='ground'&&(!pen||pen.has(p.owner.z*world.width+p.owner.x))) {
    // No reservation scan is needed when this decision sees only plants.
    reservations??=reservedSourcesByPile(world,a.id);
    const available=p.quantity-(reservations.get(p.id)??0),nutrition=ITEM_DEFINITIONS[p.item].nutrition/100;
    if(available>0&&nutrition>0)result.push({id:p.id,kind:'pile',x:p.owner.x,z:p.owner.z,quantity:Math.min(available,Math.max(1,Math.ceil((capacity-a.food)/nutrition)))});
  }
  return result;
}
export function animalMealTarget(world:World,a:WildAnimal,resourcesById?:ReadonlyMap<number,Resource>):Cell|undefined {
  const meal=a.meal;if(!meal)return;
  const pen=grazingPen(world,a);
  if(meal.kind==='plant') {
    const r=resourcesById?resourcesById.get(meal.id):world.resources.find(r=>r.id===meal.id);
    if(!r||!isPlant(r)||plantLeafless(world,r))return;
    const growth=plantGrowth(world,r);
    return growth>=.1&&plantNutrition(r,growth)>0&&unclaimedPlant(world,r,a.id)&&(!pen||pen.has(r.z*world.width+r.x))?r:undefined;
  }
  const p=world.piles.find(p=>p.id===meal.id);
  return p?.kind==='food'&&herbivoreFoods.has(p.item)&&p.owner.type==='ground'&&p.quantity-reservedSource(world,p.id,a.id)>=meal.quantity&&(!pen||pen.has(p.owner.z*world.width+p.owner.x))?p.owner:undefined;
}
/** Called only after physical contact and the complete ingestion interval. */
export function finishAnimalMeal(world:World,a:WildAnimal):void {
  const s=world.wildlife!,m=a.meal!,ingested=m.kind==='pile'?world.piles.find(p=>p.id===m.id):undefined;let nutrition=0;
  const capacity=animalNutritionMax(a);
  if(m.kind==='plant') {
    const r=world.resources.find(r=>r.id===m.id)!;if(!isPlant(r))return;
    const growth=plantGrowth(world,r),result=grazingResult(r,growth,capacity-a.food);nutrition=result.nutrition;
    if(result.removes){
      world.resources=world.resources.filter(p=>p!==r);s.eatenPlants++;
      invalidatePlantWork(world,r,true);
    } else {r.growth=growth-result.growthConsumed;r.growthTick=world.tick;invalidatePlantWork(world,r);}
  } else {
    const p=world.piles.find(p=>p.id===m.id)!;nutrition=ITEM_DEFINITIONS[p.item].nutrition*m.quantity/100;
    p.quantity-=m.quantity;s.eatenItems+=m.quantity;if(!p.quantity)world.piles.splice(world.piles.indexOf(p),1);
  }
  a.food=Math.min(capacity,a.food+nutrition);s.eatenNutrition+=nutrition;
  delete a.meal;a.state='idle';a.nextDecision=world.tick;
  if(ingested)ingestFoodRisk(world,a,ingested,false);
}
