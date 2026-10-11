import { herdCareCamp } from './veterinary-v277.ts';
import { adultAgeTicks,animalNutritionMax } from '../../src/sim/animal-life.ts';
import { animalCareTargets } from '../../src/sim/animal-care.ts';
import { medicineCount } from '../../src/sim/care-rules.ts';
import { BLOOD_UNIT } from '../../src/sim/injury-rules.ts';
import { addResolvedInjury,createMedicalRecord,medicalBleed } from '../../src/sim/injury-state.ts';
import { reconcileAnimalHealth } from '../../src/sim/wildlife-health.ts';
import { addMaterial,refreshStock } from '../../src/sim/materials.ts';
import { validateWorld } from '../../src/sim/serialization.ts';
import type { WildAnimal } from '../../src/sim/wildlife-state.ts';

/** A prepared clinical scene, not a natural injury campaign. The blood loss
 * keeps the actual animal down; untreated anatomical bruises need one real
 * dose without adding bleeding during the UI walkthrough. No spot, rescue,
 * rest assignment, treatment, food transfer or cargo is precommitted. */
export function animalRescueCamp(){
  const fixture=herdCareCamp('muffalo',32),world=fixture.world;
  const doctor=world.pawns.find(p=>p.id===fixture.doctorId)!,animal=world.wildlife!.animals[0]!;
  world.resources=[];world.jobs=[];world.structures=[];world.stockpiles=[];world.growingZones=[];world.packed=[];world.events=[];
  delete doctor.health;delete doctor.background;delete doctor.traits;
  for(const work of Object.keys(doctor.priorities) as (keyof typeof doctor.priorities)[])doctor.priorities[work]=0;
  Object.assign(doctor,{x:7,z:8,hunger:100,rest:100,mood:90,comfort:80,beauty:80,planCooldown:0});
  doctor.recreation.level=100;doctor.schedule.fill('work');doctor.foodPolicyId=2;
  doctor.skills.animals={level:0,xp:0,dailyXp:0,passion:0};doctor.skills.medicine.level=12;
  Object.assign(animal,{x:24,z:16,food:animalNutritionMax(animal)*.3,rest:1,state:'idle',path:[],nextDecision:world.tick});
  animal.health={...createMedicalRecord(world.tick),body:'muffalo',bloodLoss:Math.round(BLOOD_UNIT*.7)};
  addResolvedInjury(animal.health,'left-front-leg','bruise',5000,()=>.999999);
  addResolvedInjury(animal.health,'right-rear-leg','bruise',5000,()=>.999999);
  reconcileAnimalHealth(world,animal);
  const sleeper:WildAnimal={id:world.nextId++,species:'hare',sex:'female',ageTicks:adultAgeTicks('hare'),
    x:9,z:13,food:.19,rest:.2,state:'idle',path:[],nextDecision:world.tick,
    domestic:{since:world.tick,care:'herbal',tameness:5,nextDecay:world.tick+45000,lastTraining:world.tick}};
  world.wildlife!.animals.push(sleeper);
  addMaterial(world,'food',75,{type:'ground',x:3,z:10},'rice');
  const foodSourceId=world.piles.find(p=>p.item==='rice')!.id;
  const doses=medicineCount(animalCareTargets(animal));
  if(animal.state!=='downed'||animal.health.death||animal.health.injuries.some(i=>i.tended!==undefined)||medicalBleed(animal.health)!==0||doses!==1)
    throw new Error('V310 fixture needs a living downed animal with untreated injuries, no bleeding and exactly one treatment dose.');
  world.events=[];refreshStock(world);
  const errors=validateWorld(world);if(errors.length)throw new Error(`Invalid V310 native fixture: ${errors.join('; ')}`);
  return {world,animalId:animal.id,sleeperId:sleeper.id,doctorId:doctor.id,medicineSourceId:fixture.sourceId,foodSourceId,doses,
    normalSpot:{x:9,z:12},medicalSpot:{x:7,z:16}};
}
