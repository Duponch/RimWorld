import type { Cell,Resource,World } from './types.ts';
import { ingestFoodRisk } from './food-hygiene.ts';
import type { WildAnimal } from './wildlife-state.ts';
import { harvestable,isPlant,plantGrowth } from './plants.ts';
import { plantLeafless } from './plant-life.ts';
import { ITEM_DEFINITIONS,type ItemId } from './items.ts';
import { isAnimalMeat } from './biome-items.ts';
import { animalSpecies } from './animal-species.ts';
import { corpseFresh } from './corpses.ts';
import { corpsePartNutrition,projectCorpseConsumption,selectCorpsePart } from './corpse-anatomy.ts';
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
const herbivoreFoods:ReadonlySet<ItemId>=new Set(['nutrient-paste-meal','berries','rice','potato','corn','agave-fruit','simple-meal','fine-meal','vegetarian-fine-meal','carnivore-fine-meal','lavish-meal','vegetarian-lavish-meal','carnivore-lavish-meal','survival-meal','legacy-portion']);
const preparedFoods:ReadonlySet<ItemId>=new Set(['nutrient-paste-meal','simple-meal','fine-meal','vegetarian-fine-meal','carnivore-fine-meal','lavish-meal','vegetarian-lavish-meal','carnivore-lavish-meal','survival-meal','legacy-portion']);
export const animalPileFood=(world:World,a:WildAnimal,p:World['piles'][number]):boolean=>animalSpecies(a.species).predator
  ?p.kind==='corpse'?world.schemaVersion>=178&&corpseFresh(p,world.tick)&&!!p.corpse&&corpsePartNutrition(p.corpse,'torso')>.001
    :p.kind==='food'&&(isAnimalMeat(p.item)||preparedFoods.has(p.item))
  :p.kind==='food'&&herbivoreFoods.has(p.item);
function invalidatePlantWork(world:World,r:Resource,removed=false):void {
  const ids=new Set(world.jobs.filter(j=>j.x===r.x&&j.z===r.z&&(j.kind==='cut'||j.kind==='harvest'&&(removed||!harvestable(world,r)))).map(j=>j.id));
  if(!ids.size)return;
  for(const pawn of world.pawns){if(pawn.jobId!==null&&ids.has(pawn.jobId))releaseAssignments(world,pawn);pawn.orders.queue=pawn.orders.queue.filter(order=>typeof order!=='number'||!ids.has(order));}
  world.jobs=world.jobs.filter(j=>!ids.has(j.id));
}
/** Snapshot-local job claims for repeated active-meal checks in one wildlife tick. */
export function reservedPlantWorkCells(world:World):Set<number> {
  const cells=new Set<number>();
  for(const job of world.jobs)if(job.reservedBy!==null&&['harvest','cut','sow'].includes(job.kind))
    cells.add(job.z*world.width+job.x);
  return cells;
}
function unclaimedPlant(world:World,r:Resource,except:number,workCells?:ReadonlySet<number>):boolean {
  return !world.wildlife?.animals.some(a=>a.id!==except&&a.meal?.kind==='plant'&&a.meal.id===r.id)
    &&(workCells?!workCells.has(r.z*world.width+r.x):!world.jobs.some(j=>j.reservedBy!==null&&j.x===r.x&&j.z===r.z&&['harvest','cut','sow'].includes(j.kind)));
}
function grazeablePlant(r:Resource,growth:number):boolean {
  return growth>=(r.species==='healroot-wild'||r.kind==='healroot'?.65:.1)&&plantNutrition(r,growth)>0;
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
  if(!animalSpecies(a.species).predator)for(const r of world.resources)if((!pen||pen.has(r.z*world.width+r.x))&&isPlant(r)&&!plantLeafless(world,r)) {
    const growth=plantGrowth(world,r);
    if(grazeablePlant(r,growth)&&!claimedPlants.has(r.id)&&!reservedPlantCells.has(r.z*world.width+r.x))result.push({id:r.id,kind:'plant',x:r.x,z:r.z,quantity:1});
  }
  let reservations:ReadonlyMap<number,number>|undefined;
  for(const p of world.piles)if(animalPileFood(world,a,p)&&p.owner.type==='ground'&&(!pen||pen.has(p.owner.z*world.width+p.owner.x))) {
    // No reservation scan is needed when this decision sees only plants.
    reservations??=reservedSourcesByPile(world,a.id);
    const available=p.quantity-(reservations.get(p.id)??0),nutrition=ITEM_DEFINITIONS[p.item].nutrition/100;
    if(p.corpse){if(available===1)result.push({id:p.id,kind:'pile',x:p.owner.x,z:p.owner.z,quantity:1});continue;}
    if(available>0&&nutrition>0)result.push({id:p.id,kind:'pile',x:p.owner.x,z:p.owner.z,quantity:Math.min(available,Math.max(1,Math.ceil((capacity-a.food)/nutrition)))});
  }
  return result;
}
export function animalMealTarget(world:World,a:WildAnimal,resourcesById?:ReadonlyMap<number,Resource>,workCells?:ReadonlySet<number>):Cell|undefined {
  const meal=a.meal;if(!meal)return;
  const pen=grazingPen(world,a);
  if(meal.kind==='plant') {
    if(animalSpecies(a.species).predator)return;
    const r=resourcesById?resourcesById.get(meal.id):world.resources.find(r=>r.id===meal.id);
    if(!r||!isPlant(r)||plantLeafless(world,r))return;
    const growth=plantGrowth(world,r);
    return grazeablePlant(r,growth)&&unclaimedPlant(world,r,a.id,workCells)&&(!pen||pen.has(r.z*world.width+r.x))?r:undefined;
  }
  const p=world.piles.find(p=>p.id===meal.id);
  return p&&animalPileFood(world,a,p)&&p.owner.type==='ground'&&p.quantity-reservedSource(world,p.id,a.id)>=meal.quantity&&(!p.corpse||meal.quantity===1)&&(!pen||pen.has(p.owner.z*world.width+p.owner.x))?p.owner:undefined;
}
/** Called only after physical contact and the complete ingestion interval. */
export function finishAnimalMeal(world:World,a:WildAnimal):void {
  const target=animalMealTarget(world,a);
  if(!target||(a.motion?.end??0)>world.tick||Math.abs(a.x-target.x)+Math.abs(a.z-target.z)>1)return;
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
    const p=world.piles.find(p=>p.id===m.id)!;
    if(p.corpse){
      const part=selectCorpsePart(p.corpse,capacity-a.food),projection=part&&projectCorpseConsumption(p.corpse,part.part,world.tick);
      if(!part||!projection)return;
      // Keep the original target identity until every committed recovery ends.
      if(projection.consumesWhole&&(world.pawns.some(pawn=>pawn.melee?.strike?.targetId===p.id)
        ||s.animals.some(other=>other.strike?.targetId===p.id))){m.progress=0;return;}
      nutrition=part.nutrition;
      if(!Number.isFinite(s.eatenNutrition+nutrition)||s.eatenNutrition+nutrition>Number.MAX_SAFE_INTEGER
        ||projection.consumesWhole&&!Number.isSafeInteger(s.eatenItems+1))return;
      if(projection.consumesWhole){
        world.piles.splice(world.piles.indexOf(p),1);s.eatenItems++;
        for(const hunter of s.animals)if(hunter.predation?.targetId===p.id){
          delete hunter.predation;hunter.path=[];hunter.nextDecision=world.tick;
          if((hunter.motion?.end??0)<=world.tick)hunter.state='idle';
        }
      }
      else p.corpse.consumedParts=projection.consumedParts;
      a.food=Math.min(capacity,a.food+nutrition);s.eatenNutrition+=nutrition;
      if(!projection.consumesWhole&&a.food<capacity*.9){m.progress=0;a.state='eating';return;}
      delete a.meal;a.state='idle';a.nextDecision=world.tick;return;
    }
    nutrition=ITEM_DEFINITIONS[p.item].nutrition*m.quantity/100;
    p.quantity-=m.quantity;s.eatenItems+=m.quantity;if(!p.quantity)world.piles.splice(world.piles.indexOf(p),1);
  }
  a.food=Math.min(capacity,a.food+nutrition);s.eatenNutrition+=nutrition;
  delete a.meal;a.state='idle';a.nextDecision=world.tick;
  if(ingested)ingestFoodRisk(world,a,ingested,false);
}
