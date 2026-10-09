import { herdCareCamp } from './veterinary-v277.ts';
import { BLOOD_UNIT } from '../../src/sim/injury-rules.ts';
import { reconcileAnimalHealth } from '../../src/sim/wildlife-health.ts';
import { animalNutritionMax } from '../../src/sim/animal-life.ts';
import { addMaterial,refreshStock } from '../../src/sim/materials.ts';
import type { AnimalSpeciesId } from '../../src/sim/animal-species.ts';

/** Prepared hungry, physically downed owned animal. No meal, task or food
 * transfer is precommitted; the existing veterinary anatomy stays authentic. */
export function animalFeedingCamp(species:AnimalSpeciesId='muffalo',size=32){
  const f=herdCareCamp(species,size),{world,animalId,doctorId}=f;
  const animal=world.wildlife!.animals.find(a=>a.id===animalId)!;
  world.piles=[];animal.food=animalNutritionMax(animal)*.3;animal.health!.bloodLoss=Math.round(BLOOD_UNIT*.65);
  for(const injury of animal.health!.injuries)injury.tended=1000;
  reconcileAnimalHealth(world,animal);
  addMaterial(world,'food',75,{type:'ground',x:3,z:8},'rice');
  const sourceId=world.piles.find(p=>p.item==='rice')!.id;
  refreshStock(world);world.events=[];
  return {world,animalId,doctorId,sourceId};
}
