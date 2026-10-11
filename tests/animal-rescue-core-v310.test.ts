import { test,expect } from 'vitest';
import { herdCareCamp } from './helpers/veterinary-v277.ts';
import { applyCommand,stepWorld } from '../src/sim/index.ts';
import { createMedicalRecord,addResolvedInjury,reconcileMedicalDeath } from '../src/sim/injury-state.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { reconcileAnimalHealth } from '../src/sim/wildlife-health.ts';
import { animalRescueWanted,animalRescueProposal,startAnimalRescue,reconcileAnimalRescues,applyAnimalRescue } from '../src/sim/animal-rescue.ts';
import { animalClaimed,animalCarrier,releaseAnimalRescue,syncCarriedAnimals } from '../src/sim/animal-rest-state.ts';
import { reconcileAnimalRest,animalRestingSpot,animalSpotAvailable } from '../src/sim/animal-rest.ts';
import { animalHandlingClaimed } from '../src/sim/animal-handling.ts';
import { animalFeedingPatientReady } from '../src/sim/animal-feeding-rules.ts';
import { blockedCells,reachableCells } from '../src/sim/pathfinding.ts';
import { addMaterial,refreshStock } from '../src/sim/materials.ts';
import { advanceCorpses } from '../src/sim/corpses.ts';
import { validateWorld,serializeWorld,deserializeWorld } from '../src/sim/serialization.ts';
import type { AnimalSpeciesId } from '../src/sim/animal-species.ts';
import type { World,Structure } from '../src/sim/types.ts';

function camp(species:AnimalSpeciesId='muffalo'){
  const {world}=herdCareCamp(species),pawn=world.pawns[0]!,animal=world.wildlife!.animals[0]!;
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.piles=[];world.structures=[];world.stockpiles=[];world.growingZones=[];
  Object.assign(pawn,{x:4,z:4,hunger:100,rest:100});
  Object.assign(animal,{x:12,z:8,path:[],nextDecision:world.tick});delete animal.motion;
  animal.health={...createMedicalRecord(world.tick),body:species,bloodLoss:Math.round(BLOOD_UNIT*.65)};
  reconcileAnimalHealth(world,animal);
  const spot:Structure={id:world.nextId++,kind:'animal-sleeping-spot',x:6,z:10,orientation:0,footprint:'standard',medical:true};
  world.structures.push(spot);refreshStock(world);expect(validateWorld(world)).toEqual([]);
  return {world,pawn,animal,spot};
}
function begin(world:World){
  const p=world.pawns[0]!,proposal=animalRescueProposal(world,p,reachableCells(world,p,blockedCells(world),new Set()));
  expect(proposal).toBeDefined();startAnimalRescue(world,p,proposal!);
}
function until(world:World,predicate:()=>boolean,max=300){for(let n=0;n<max&&!predicate();n++)stepWorld(world,1);expect(predicate()).toBe(true);}

test('ordinary planner carries the original animal, preserves physiology and deposits in a real medical place',()=>{
  const {world,pawn,animal,spot}=camp(),id=animal.id,food=animal.food,tick=world.tick;
  expect(animalRescueWanted(world,pawn)).toBe(true);
  until(world,()=>pawn.animalRescue?.phase==='carry'&&!!pawn.motion&&pawn.motion.start<world.tick&&world.tick<pawn.motion.end);
  expect(animalCarrier(world,id)).toBe(pawn);expect(animal.path).toEqual([]);expect(animal.motion).toEqual(pawn.motion);
  expect(animal.motion).not.toBe(pawn.motion);expect(animal.health!.tick).toBe(world.tick);expect(animal.food).toBeLessThan(food);
  expect(world.piles.some(p=>p.id===id)).toBe(false);expect(animalFeedingPatientReady(world,animal)).toBe(false);
  expect(validateWorld(world)).toEqual([]);expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  until(world,()=>animal.animalRest?.phase==='sleep');
  expect(world.tick).toBeGreaterThan(tick);expect(world.wildlife!.animals.filter(a=>a.id===id)).toHaveLength(1);
  expect(pawn.animalRescue).toBeUndefined();expect(animalRestingSpot(world,animal)).toBe(spot);
  expect(animal.domestic!.bedId).toBeUndefined();expect(animal.state).toBe('downed');expect(validateWorld(world)).toEqual([]);
});

test.each(['hare','deer','gazelle','muffalo','dromedary'] as const)('rescue admits the real %s body without handling skill or violence',species=>{
  const {world,pawn,animal}=camp(species);pawn.priorities.handle=0;pawn.skills.animals={level:0,xp:0,dailyXp:0,passion:0};
  pawn.background={childhood:'quiet-child'};
  expect(applyAnimalRescue(world,{type:'order-animal-rescue',pawnId:pawn.id,animalId:animal.id})).toEqual({ok:true});
  expect(pawn.animalRescue?.phase).toBe('approach');expect(animalClaimed(world,animal.id)).toBe(true);
});

test('NoCare automatic rescue uses a normal place, but direct rescue and medical admission refuse it',()=>{
  const {world,pawn,animal,spot}=camp();animal.domestic!.care='none';
  expect(animalSpotAvailable(world,spot,animal)).toBe(false);delete spot.medical;
  expect(animalRescueWanted(world,pawn)).toBe(true);
  expect(applyAnimalRescue(world,{type:'order-animal-rescue',pawnId:pawn.id,animalId:animal.id}).ok).toBe(false);
  begin(world);expect(animal.domestic!.bedId).toBe(spot.id);expect(pawn.animalRescue?.phase).toBe('approach');
});

test('slaughter, concurrent animal services and nearby enemy suspend automatic rescue',()=>{
  const {world,pawn,animal}=camp();
  animal.domestic!.slaughter=true;expect(animalRescueWanted(world,pawn)).toBe(false);delete animal.domestic!.slaughter;
  const other=structuredClone(pawn);other.id=world.nextId++;other.x=20;other.z=20;other.animalCare={animalId:animal.id,spot:{x:13,z:8},phase:'approach',progress:0};world.pawns.push(other);
  expect(animalRescueWanted(world,pawn)).toBe(false);delete other.animalCare;
  other.faction='outlaws';expect(animalRescueWanted(world,pawn)).toBe(false);
  other.x=31;other.z=31;expect(animalRescueWanted(world,pawn)).toBe(true);
});

test('a moving fallen animal and blocked diagonal cannot be picked up across an unfinished edge',()=>{
  const {world,pawn,animal}=camp();pawn.x=11;pawn.z=7;
  world.structures.push({id:world.nextId++,kind:'wall',x:12,z:7,orientation:0,footprint:'standard'},
    {id:world.nextId++,kind:'wall',x:11,z:8,orientation:0,footprint:'standard'});
  begin(world);expect(pawn.path.length).toBeGreaterThan(0);expect(pawn.animalRescue!.phase).toBe('approach');
  releaseAnimalRescue(world,pawn);world.structures=world.structures.filter(s=>s.kind!=='wall');pawn.x=11;pawn.z=8;
  animal.motion={from:{x:11,z:8},to:{x:12,z:8},start:world.tick,end:world.tick+3,speedFactor:1,terrainDelay:0};
  begin(world);stepWorld(world,1);expect(pawn.animalRescue!.phase).toBe('approach');
});

test.each(['priority','draft','stun','manipulation','bed'] as const)('%s interruption releases carry with identical edge and patient ID',kind=>{
  const {world,pawn,animal,spot}=camp();begin(world);
  until(world,()=>pawn.animalRescue?.phase==='carry'&&!!pawn.motion&&world.tick<pawn.motion.end);
  const edge=structuredClone(animal.motion),position={x:animal.x,z:animal.z},rng=world.rng,health=structuredClone(animal.health);
  if(kind==='priority')expect(applyCommand(world,{type:'priority',pawnId:pawn.id,work:'doctor',value:0}).ok).toBe(true);
  if(kind==='draft')expect(applyCommand(world,{type:'draft',pawnIds:[pawn.id],enabled:true}).ok).toBe(true);
  if(kind==='stun')pawn.stun={sinceCore:world.tick*10,untilCore:world.tick*10+45};
  if(kind==='manipulation'){
    pawn.health=createMedicalRecord(world.tick);addResolvedInjury(pawn.health,'left-arm','cut',30000,()=>.999999);addResolvedInjury(pawn.health,'right-arm','cut',30000,()=>.999999);
  }
  if(kind==='bed')world.structures=world.structures.filter(s=>s!==spot);
  reconcileAnimalRescues(world);reconcileAnimalRest(world);
  expect(pawn.animalRescue).toBeUndefined();expect(animalCarrier(world,animal.id)).toBeUndefined();
  expect(animal.motion).toEqual(edge);expect({x:animal.x,z:animal.z}).toEqual(position);expect(animal.health).toEqual(health);
  expect(world.rng).toBe(rng);expect(animalHandlingClaimed(world,animal.id)).toBe(false);
  expect(world.wildlife!.animals.filter(a=>a.id===animal.id)).toHaveLength(1);expect(validateWorld(world)).toEqual([]);
});

test('death during carry releases the same body, retains it on a saturated floor, then creates one normal corpse',()=>{
  const {world,pawn,animal}=camp();begin(world);
  until(world,()=>pawn.animalRescue?.phase==='carry'&&!!pawn.motion&&world.tick<pawn.motion.end);
  animal.health!.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(animal.health!);reconcileAnimalHealth(world,animal);reconcileAnimalRescues(world);reconcileAnimalRest(world);
  expect(pawn.animalRescue).toBeUndefined();expect(animal.state).toBe('dead');const edge=animal.motion!;
  advanceCorpses(world);expect(world.wildlife!.animals).toContain(animal);
  world.tick=Math.ceil(edge.end);animal.health!.tick=animal.health!.death!.tick=world.tick;
  addMaterial(world,'wood',75,{type:'ground',x:animal.x,z:animal.z},'wood');refreshStock(world);
  advanceCorpses(world);expect(world.wildlife!.animals).toContain(animal);expect(world.piles.some(p=>p.id===animal.id)).toBe(false);
  world.piles=[];refreshStock(world);advanceCorpses(world);advanceCorpses(world);
  expect(world.wildlife!.animals.some(a=>a.id===animal.id)).toBe(false);expect(world.piles.filter(p=>p.corpse?.animalId===animal.id)).toHaveLength(1);
});

test('recovery while carried and carrier death both relinquish position ownership without cloning the patient',()=>{
  for(const kind of ['patient','carrier'] as const){
    const {world,pawn,animal}=camp();begin(world);until(world,()=>pawn.animalRescue?.phase==='carry'&&!!pawn.motion&&world.tick<pawn.motion.end);
    const edge=structuredClone(pawn.motion);
    if(kind==='patient'){animal.health!.bloodLoss=0;reconcileAnimalHealth(world,animal);}else pawn.state='dead';
    syncCarriedAnimals(world);reconcileAnimalRescues(world);
    expect(pawn.animalRescue).toBeUndefined();expect(animal.motion).toEqual(edge);expect(world.wildlife!.animals.filter(a=>a.id===animal.id)).toHaveLength(1);
  }
});
