import type { Cell,Resource,World } from './types.ts';
import { ingestFoodRisk } from './food-hygiene.ts';
import type { WildAnimal } from './wildlife-state.ts';
import { harvestable,isPlant,plantGrowth } from './plants.ts';
import { plantLeafless } from './plant-life.ts';
import { ITEM_DEFINITIONS,type ItemId } from './items.ts';
import { reservedSource } from './materials.ts';
import { releaseAssignments } from './work-release.ts';
import { animalSpecies } from './animal-species.ts';
import { grazingResult,plantNutrition } from './biome-flora.ts';

export interface AnimalFood extends Cell { id:number;kind:'plant'|'pile';quantity:number }
// Herbivory is an explicit content profile. New nutritious items do not silently
// become animal food; prepared meals remain admissible under the existing rule.
const herbivoreFoods:ReadonlySet<ItemId>=new Set(['berries','rice','potato','corn','agave-fruit','simple-meal','survival-meal','legacy-portion']);
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
  const definition=animalSpecies(a.species);
  for(const r of world.resources)if(isPlant(r)&&!plantLeafless(world,r)) {
    const growth=plantGrowth(world,r);
    if(growth>=.1&&plantNutrition(r,growth)>0&&unclaimedPlant(world,r,a.id))result.push({id:r.id,kind:'plant',x:r.x,z:r.z,quantity:1});
  }
  for(const p of world.piles)if(p.kind==='food'&&herbivoreFoods.has(p.item)&&p.owner.type==='ground') {
    const available=p.quantity-reservedSource(world,p.id,a.id),nutrition=ITEM_DEFINITIONS[p.item].nutrition/100;
    if(available>0&&nutrition>0)result.push({id:p.id,kind:'pile',x:p.owner.x,z:p.owner.z,quantity:Math.min(available,Math.max(1,Math.ceil((definition.nutrition-a.food)/nutrition)))});
  }
  return result;
}
export function animalMealTarget(world:World,a:WildAnimal):Cell|undefined {
  const meal=a.meal;if(!meal)return;
  if(meal.kind==='plant') {
    const r=world.resources.find(r=>r.id===meal.id);
    if(!r||!isPlant(r)||plantLeafless(world,r))return;
    const growth=plantGrowth(world,r);
    return growth>=.1&&plantNutrition(r,growth)>0&&unclaimedPlant(world,r,a.id)?r:undefined;
  }
  const p=world.piles.find(p=>p.id===meal.id);
  return p?.kind==='food'&&herbivoreFoods.has(p.item)&&p.owner.type==='ground'&&p.quantity-reservedSource(world,p.id,a.id)>=meal.quantity?p.owner:undefined;
}
/** Called only after physical contact and the complete ingestion interval. */
export function finishAnimalMeal(world:World,a:WildAnimal):void {
  const s=world.wildlife!,m=a.meal!,ingested=m.kind==='pile'?world.piles.find(p=>p.id===m.id):undefined;let nutrition=0;
  const definition=animalSpecies(a.species);
  if(m.kind==='plant') {
    const r=world.resources.find(r=>r.id===m.id)!;if(!isPlant(r))return;
    const growth=plantGrowth(world,r),result=grazingResult(r,growth,definition.nutrition-a.food);nutrition=result.nutrition;
    if(result.removes){
      world.resources=world.resources.filter(p=>p!==r);s.eatenPlants++;
      invalidatePlantWork(world,r,true);
    } else {r.growth=growth-result.growthConsumed;r.growthTick=world.tick;invalidatePlantWork(world,r);}
  } else {
    const p=world.piles.find(p=>p.id===m.id)!;nutrition=ITEM_DEFINITIONS[p.item].nutrition*m.quantity/100;
    p.quantity-=m.quantity;s.eatenItems+=m.quantity;if(!p.quantity)world.piles.splice(world.piles.indexOf(p),1);
  }
  a.food=Math.min(definition.nutrition,a.food+nutrition);s.eatenNutrition+=nutrition;
  delete a.meal;a.state='idle';a.nextDecision=world.tick;
  if(ingested)ingestFoodRisk(world,a,ingested,false);
}
