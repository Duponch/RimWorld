import { medicalCamp } from '../scenarios/health.ts';
import { animalSpecies,type AnimalSpeciesId } from '../../src/sim/animal-species.ts';
import { adultAgeTicks } from '../../src/sim/animal-life.ts';
import { createMedicalRecord,addResolvedInjury } from '../../src/sim/injury-state.ts';
import { addMaterial,refreshStock } from '../../src/sim/materials.ts';
import { enableBiomeWildlife } from '../../src/sim/wildlife.ts';
import type { WildAnimal } from '../../src/sim/wildlife-state.ts';
import type { World } from '../../src/sim/types.ts';

/** Prepared physical veterinary visit, shared by tests and the native UI
 * walkthrough. No task, treatment or medicine ownership is precommitted. */
export function herdCareCamp(species:AnimalSpeciesId='muffalo',size=32):{
  world:World;animalId:number;doctorId:number;sourceId:number;
} {
  const world=medicalCamp(1,size),doctor=world.pawns[0]!;
  world.resources=[];world.jobs=[];world.structures=[];world.piles=[];world.packed=[];
  delete doctor.health;delete doctor.background;
  Object.assign(doctor,{x:7,z:8,hunger:100,rest:100,mood:90,comfort:80,beauty:80,planCooldown:0});
  doctor.recreation.level=100;doctor.priorities.doctor=1;doctor.skills.medicine.level=12;
  enableBiomeWildlife(world,'temperate-forest');
  const definition=animalSpecies(species),animal:WildAnimal={
    id:world.nextId++,species,sex:'female',ageTicks:adultAgeTicks(species),
    x:size-8,z:Math.floor(size/2),food:definition.nutrition*.95,rest:1,
    state:'sleeping',path:[],nextDecision:world.tick,
    domestic:{since:world.tick,care:'industrial',tameness:5,nextDecay:world.tick+45000,
      ...(species==='muffalo'||species==='dromedary'?{productFullness:0}:{})},
    health:{...createMedicalRecord(world.tick),body:species},
  };
  addResolvedInjury(animal.health!,'left-front-leg','cut',Math.round(3000*definition.healthScale),()=>.999999);
  addResolvedInjury(animal.health!,'right-rear-leg','cut',Math.round(3000*definition.healthScale),()=>.999999);
  world.wildlife!.animals=[animal];
  addMaterial(world,'medicine',3,{type:'ground',x:3,z:8},'medicine');
  const sourceId=world.piles.find(p=>p.item==='medicine')!.id;
  refreshStock(world);
  return {world,animalId:animal.id,doctorId:doctor.id,sourceId};
}
