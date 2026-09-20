import type { Cell,Resource,World } from './types.ts';
import type { WildAnimal } from './wildlife-state.ts';
import { HARE } from './wildlife-state.ts';
import { isPlant,plantGrowth } from './plants.ts';
import { plantLeafless } from './plant-life.ts';
import { ITEM_DEFINITIONS,type ItemId } from './items.ts';
import { reservedSource } from './materials.ts';

export interface AnimalFood extends Cell { id:number;kind:'plant'|'pile';quantity:number }
const plantNutrition={berries:.35,rice:.18,potato:.25,corn:.4,cotton:.2} as const;
// Herbivory is an explicit content profile. New nutritious items do not silently
// become animal food; prepared meals remain admissible under the existing rule.
const hareFoods:ReadonlySet<ItemId>=new Set(['berries','rice','potato','corn','simple-meal','survival-meal','legacy-portion']);
function unclaimedPlant(world:World,r:Resource,except:number):boolean {
  return !world.wildlife?.animals.some(a=>a.id!==except&&a.meal?.kind==='plant'&&a.meal.id===r.id)
    &&!world.jobs.some(j=>j.reservedBy!==null&&j.x===r.x&&j.z===r.z&&['harvest','cut','sow'].includes(j.kind));
}
export function animalFoods(world:World,a:WildAnimal):AnimalFood[] {
  const result:AnimalFood[]=[];
  for(const r of world.resources)if(isPlant(r)&&!plantLeafless(world,r)&&plantGrowth(world,r)>=.1&&unclaimedPlant(world,r,a.id))result.push({id:r.id,kind:'plant',x:r.x,z:r.z,quantity:1});
  for(const p of world.piles)if(p.kind==='food'&&hareFoods.has(p.item)&&p.owner.type==='ground') {
    const available=p.quantity-reservedSource(world,p.id,a.id),nutrition=ITEM_DEFINITIONS[p.item].nutrition/100;
    if(available>0&&nutrition>0)result.push({id:p.id,kind:'pile',x:p.owner.x,z:p.owner.z,quantity:Math.min(available,Math.max(1,Math.ceil((HARE.nutrition-a.food)/nutrition)))});
  }
  return result;
}
export function animalMealTarget(world:World,a:WildAnimal):Cell|undefined {
  const meal=a.meal;if(!meal)return;
  if(meal.kind==='plant') {
    const r=world.resources.find(r=>r.id===meal.id);
    return r&&isPlant(r)&&!plantLeafless(world,r)&&plantGrowth(world,r)>=.1&&unclaimedPlant(world,r,a.id)?r:undefined;
  }
  const p=world.piles.find(p=>p.id===meal.id);
  return p?.kind==='food'&&hareFoods.has(p.item)&&p.owner.type==='ground'&&p.quantity-reservedSource(world,p.id,a.id)>=meal.quantity?p.owner:undefined;
}
/** Called only after physical contact and the complete ingestion interval. */
export function finishAnimalMeal(world:World,a:WildAnimal):void {
  const s=world.wildlife!,m=a.meal!;let nutrition=0;
  if(m.kind==='plant') {
    const r=world.resources.find(r=>r.id===m.id)!;if(!isPlant(r))return;
    const growth=plantGrowth(world,r),perPlant=plantNutrition[r.kind];nutrition=Math.min(HARE.nutrition-a.food,growth*perPlant);
    if(nutrition>=growth*perPlant){
      world.resources=world.resources.filter(p=>p!==r);s.eatenPlants++;
      // Only unclaimed designations can coexist with a grazing reservation.
      world.jobs=world.jobs.filter(j=>j.x!==r.x||j.z!==r.z||!['harvest','cut'].includes(j.kind));
    } else {r.growth=growth-nutrition/perPlant;r.growthTick=world.tick;}
  } else {
    const p=world.piles.find(p=>p.id===m.id)!;nutrition=ITEM_DEFINITIONS[p.item].nutrition*m.quantity/100;
    p.quantity-=m.quantity;s.eatenItems+=m.quantity;if(!p.quantity)world.piles.splice(world.piles.indexOf(p),1);
  }
  a.food=Math.min(HARE.nutrition,a.food+nutrition);s.eatenNutrition+=nutrition;
  delete a.meal;a.state='idle';a.nextDecision=world.tick;
}
