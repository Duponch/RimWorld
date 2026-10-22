import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {readAnimalTraining282,trainingRefusal282,setAnimalTrainingWanted282,nextTrainable282,completeAnimalTraining282,
  advanceAnimalTraining282,canAnimalHaul282,animalCarryLimit282,animalTrainingDecayPeriodCore282,
  ANIMAL_TRAINING_INTERVAL_CORE_282,ANIMAL_TRAINING_STEPS_282,ANIMAL_TRAINING_CONVERSATION_CORE_282,
  ANIMAL_TRAINING_FINAL_CORE_282,ANIMAL_HAUL_CHECK_CORE_282,ANIMAL_HAUL_CHANCE_282,
  type AnimalTrainingSkill282} from '../src/sim/animal-training-282.ts';
import {validateWorld} from '../src/sim/serialization.ts';
import {validStartingPetHeader256} from '../src/sim/starting-pet-state-256.ts';
import {animalBodySize} from '../src/sim/animal-life.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';

type Camp459=ReturnType<typeof animalHaulingCamp459>;
const current={schemaVersion:282} as const;
function wanted(f:Camp459,skill:AnimalTrainingSkill282,value=true){
  expect(setAnimalTrainingWanted282(f.world,f.animal.id,skill,value)).toMatchObject({ok:true});
  if(!f.animal.training)throw Error('A real changed request must adopt the tracker');
  return f.animal.training;
}
function adopted(){const f=animalHaulingCamp459();wanted(f,'haul');return f;}

/** Pure tracker calls on consecutive local clock inputs, NOT a played World
 * or clinical-age replay. Food, body clocks and services are exercised by the
 * separate engine loop; this file never submits these later clock views as a
 * full saved campaign. No probability or gameplay RNG is supplied here. */
function nextAttempt(f:Camp459){
  const until=Math.ceil(((f.animal.training?.lastAttemptCore??-ANIMAL_TRAINING_INTERVAL_CORE_282)+ANIMAL_TRAINING_INTERVAL_CORE_282)/10);
  while(f.world.tick<until){f.world.tick++;advanceAnimalTraining282(f.world,f.animal);}
}
function learn(f:Camp459,skill:'obedience'|'haul',count:number){
  for(let i=0;i<count;i++){
    nextAttempt(f);expect(nextTrainable282(f.world,f.animal)).toBe(skill);
    expect(completeAnimalTraining282(f.world,f.animal,skill,true,f.handler.id)).toBe(true);
  }
}
function learnedHaul(){const f=adopted();learn(f,'obedience',3);learn(f,'haul',7);return f;}

/** An authored scalar deadline input at the real Rare phase. Deliberately
 * detached from the full World/clinical clock: tests one boundary without
 * claiming that twelve days of colony gameplay were executed. */
function atDecay(f:Camp459){
  const state=f.animal.training!;
  let tick=Math.ceil(state.nextDecayCore/10);
  tick+=(f.animal.id%25-tick%25+25)%25;
  f.world.tick=tick;state.lastLocalCore=tick*10-10;
  return advanceAnimalTraining282(f.world,f.animal);
}

test('BEFORE is one valid original Labrador with finite property, no starting receipt and no earned training',()=>{
  const f=animalHaulingCamp459(),{world:w,animal:a}=f;
  expect(validateWorld(w)).toEqual([]);expect(w.wildlife!.animals).toEqual([a]);
  expect(a.species).toBe('labrador-retriever');expect(a.domestic!.tameness).toBe(5);
  expect(a.startingPet).toBeUndefined();expect(a.training).toBeUndefined();expect(canAnimalHaul282(w,a)).toBe(false);
  expect(readAnimalTraining282(a,'obedience')).toMatchObject({steps:0,learned:false,wanted:false,maxSteps:3});
  expect(readAnimalTraining282(a,'haul')).toMatchObject({steps:0,learned:false,wanted:false,maxSteps:7});
  expect(w.piles.filter(p=>p.item==='kibble').map(p=>p.quantity)).toEqual([60,60]);
  expect(w.piles.filter(p=>p.item==='survival-meal').map(p=>p.quantity)).toEqual([6,6]);
  expect(w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0)).toBe(20);
  expect(f.handler.skills.animals!.level).toBe(20);expect(f.preparation.constructorState.counter).toBeGreaterThan(0);
});

test('readers and an unchanged unchecked request do not adopt a tracker or mutate property, clocks or RNG',()=>{
  const f=animalHaulingCamp459(),before=JSON.stringify(f.world),original=f.animal;
  expect(readAnimalTraining282(f.animal,'tameness')).toEqual({steps:5,learned:true,wanted:true,maxSteps:5});
  expect(trainingRefusal282(f.world,f.animal,'haul')).toBeUndefined();
  expect(setAnimalTrainingWanted282(f.world,f.animal.id,'haul',false)).toMatchObject({ok:true,affected:0});
  expect(nextTrainable282(f.world,f.animal)).toBeUndefined();expect(animalCarryLimit282(f.animal,'wood')).toBe(56);
  expect(JSON.stringify(f.world)).toBe(before);expect(f.world.wildlife!.animals[0]).toBe(original);
});

test('schema281 and future283 refuse the new intent before adoption without changing the original or streams',()=>{
  for(const version of [281,283]){
    const f=animalHaulingCamp459(),header:{schemaVersion:number}=f.world;header.schemaVersion=version;
    const before=JSON.stringify(f.world);
    expect(setAnimalTrainingWanted282(f.world,f.animal.id,'haul',true).ok).toBe(false);
    expect(trainingRefusal282(f.world,f.animal,'haul')).toBeDefined();expect(f.animal.training).toBeUndefined();
    expect(canAnimalHaul282(f.world,f.animal)).toBe(false);expect(JSON.stringify(f.world)).toBe(before);
  }
});

test('first real wanted change adopts existing Tameness and its deadline, without giving Obedience or Haul',()=>{
  const f=animalHaulingCamp459(),domestic=f.animal.domestic!,old=structuredClone(domestic),rng=f.world.rng,id=f.world.nextId;
  const state=wanted(f,'haul');
  expect(state).toMatchObject({revision:1,sinceCore:0,lastLocalCore:0,nextDecayCore:old.nextDecay*10,tamenessWanted:true});
  expect(state.masterId).toBeUndefined();expect(state.lastAttemptCore).toBeUndefined();
  expect(readAnimalTraining282(f.animal,'obedience')).toMatchObject({steps:0,learned:false,wanted:true});
  expect(readAnimalTraining282(f.animal,'haul')).toMatchObject({steps:0,learned:false,wanted:true});
  expect(nextTrainable282(f.world,f.animal)).toBe('obedience');expect(domestic).toEqual(old);
  const bytes=JSON.stringify(state);expect(setAnimalTrainingWanted282(f.world,f.animal.id,'haul',true)).toMatchObject({ok:true,affected:0});
  expect(f.animal.training).toBe(state);expect(JSON.stringify(state)).toBe(bytes);expect(f.world.rng).toBe(rng);expect(f.world.nextId).toBe(id);
});

test('wanted dependency changes preserve real acquired steps and disabling a prerequisite disables its dependents',()=>{
  const f=adopted();learn(f,'obedience',3);
  const old=readAnimalTraining282(f.animal,'obedience'),deadline=f.animal.training!.nextDecayCore,last=f.animal.training!.lastAttemptCore;
  wanted(f,'obedience',false);
  expect(readAnimalTraining282(f.animal,'obedience')).toMatchObject({...old,wanted:false});
  expect(readAnimalTraining282(f.animal,'haul').wanted).toBe(false);expect(readAnimalTraining282(f.animal,'tameness').wanted).toBe(true);
  expect(f.animal.training!.nextDecayCore).toBe(deadline);expect(f.animal.training!.lastAttemptCore).toBe(last);
  expect(nextTrainable282(f.world,f.animal)).toBeUndefined();wanted(f,'haul');
  expect(readAnimalTraining282(f.animal,'obedience')).toMatchObject({...old,wanted:true});
});

test('a still-learned but incomplete Tameness prerequisite needs its real maintenance before an Obedience lesson',()=>{
  const f=animalHaulingCamp459();f.animal.domestic!.tameness=4;wanted(f,'haul');
  expect(readAnimalTraining282(f.animal,'tameness')).toMatchObject({steps:4,learned:true});
  expect(nextTrainable282(f.world,f.animal)).toBe('tameness');
  expect(completeAnimalTraining282(f.world,f.animal,'obedience',true,f.handler.id)).toBe(false);
  expect(completeAnimalTraining282(f.world,f.animal,'tameness',true,f.handler.id)).toBe(true);
  expect(f.animal.domestic!.tameness).toBe(5);expect(nextTrainable282(f.world,f.animal)).toBeUndefined();
  nextAttempt(f);expect(nextTrainable282(f.world,f.animal)).toBe('obedience');
});

test('a failed final attempt consumes its cooldown but no step or RNG, and the exact15000Core boundary admits the next attempt',()=>{
  const f=adopted(),before=readAnimalTraining282(f.animal,'obedience'),rng=f.world.rng,wildRng=f.world.wildlife!.rng,deadline=f.animal.training!.nextDecayCore;
  expect(completeAnimalTraining282(f.world,f.animal,'obedience',false,f.handler.id)).toBe(true);
  expect(readAnimalTraining282(f.animal,'obedience')).toEqual(before);expect(f.animal.training!.lastAttemptCore).toBe(0);
  expect(f.animal.training!.nextDecayCore).toBe(deadline);expect(nextTrainable282(f.world,f.animal)).toBeUndefined();
  expect(completeAnimalTraining282(f.world,f.animal,'obedience',true,f.handler.id)).toBe(false);
  while(f.world.tick<1499){f.world.tick++;advanceAnimalTraining282(f.world,f.animal);}
  expect(nextTrainable282(f.world,f.animal)).toBeUndefined();f.world.tick++;advanceAnimalTraining282(f.world,f.animal);
  expect(nextTrainable282(f.world,f.animal)).toBe('obedience');
  const bytes=JSON.stringify(f.animal);
  expect(completeAnimalTraining282(f.world,f.animal,'obedience',true,f.world.nextId+500)).toBe(false);
  expect(completeAnimalTraining282(f.world,structuredClone(f.animal),'obedience',true,f.handler.id)).toBe(false);
  expect(JSON.stringify(f.animal)).toBe(bytes);expect(f.world.rng).toBe(rng);expect(f.world.wildlife!.rng).toBe(wildRng);
});

test('three real accepted Obedience successes then seven Haul successes confer the skills once and name the actual trainer as master',()=>{
  const f=adopted(),rng=f.world.rng,initialDomestic=structuredClone(f.animal.domestic);
  expect(completeAnimalTraining282(f.world,f.animal,'haul',true,f.handler.id)).toBe(false);
  learn(f,'obedience',3);expect(readAnimalTraining282(f.animal,'obedience')).toMatchObject({steps:3,learned:true});
  expect(f.animal.training!.masterId).toBe(f.handler.id);expect(canAnimalHaul282(f.world,f.animal)).toBe(false);
  learn(f,'haul',6);expect(readAnimalTraining282(f.animal,'haul')).toMatchObject({steps:6,learned:false});
  expect(canAnimalHaul282(f.world,f.animal)).toBe(false);learn(f,'haul',1);
  expect(readAnimalTraining282(f.animal,'haul')).toMatchObject({steps:7,learned:true});expect(canAnimalHaul282(f.world,f.animal)).toBe(true);
  expect(nextTrainable282(f.world,f.animal)).toBeUndefined();expect(completeAnimalTraining282(f.world,f.animal,'haul',true,f.handler.id)).toBe(false);
  expect(f.animal.training!.nextDecayCore).toBe(f.world.tick*10+720000);expect(f.animal.domestic).toEqual(initialDomestic);
  expect(f.world.rng).toBe(rng);expect(f.world.wildlife!.animals[0]).toBe(f.animal);
});

test('only one current leaf decays, wanted off does not revoke learned Haul, and ancestors remain intact',()=>{
  const f=learnedHaul(),rng=f.world.rng,tameness=f.animal.domestic!.tameness;
  wanted(f,'haul',false);expect(canAnimalHaul282(f.world,f.animal)).toBe(true);
  expect(atDecay(f)).toEqual({becameWild:false,decayed:'haul'});
  expect(readAnimalTraining282(f.animal,'haul')).toMatchObject({steps:6,learned:true,wanted:false});
  expect(readAnimalTraining282(f.animal,'obedience')).toMatchObject({steps:3,learned:true});
  expect(f.animal.domestic!.tameness).toBe(tameness);expect(canAnimalHaul282(f.world,f.animal)).toBe(true);expect(f.world.rng).toBe(rng);
  for(let i=0;i<6;i++)expect(atDecay(f).decayed).toBe('haul');
  expect(readAnimalTraining282(f.animal,'haul')).toMatchObject({steps:0,learned:false,wanted:false});expect(canAnimalHaul282(f.world,f.animal)).toBe(false);
  expect(readAnimalTraining282(f.animal,'obedience').steps).toBe(3);expect(f.animal.domestic!.tameness).toBe(tameness);
});

test('maintenance of a still-learned leaf restores its steps without postponing the one next decay',()=>{
  const f=learnedHaul();atDecay(f);
  const deadline=f.animal.training!.nextDecayCore;
  expect(nextTrainable282(f.world,f.animal)).toBe('haul');
  expect(completeAnimalTraining282(f.world,f.animal,'haul',true,f.handler.id)).toBe(true);
  expect(readAnimalTraining282(f.animal,'haul')).toMatchObject({steps:7,learned:true});
  expect(f.animal.training!.nextDecayCore).toBe(deadline);expect(f.animal.training!.lastAttemptCore).toBe(f.world.tick*10);
});

test('absence and a real held marker pause the shared deadline without catch-up; dead actors do not advance it',()=>{
  const f=adopted(),state=f.animal.training!,deadline=state.nextDecayCore;
  f.world.tick=1;advanceAnimalTraining282(f.world,f.animal);expect(state.lastLocalCore).toBe(10);
  f.animal.shipCryptosleepHeldAt277=1;f.world.tick=1001;
  const held=JSON.stringify(state);expect(advanceAnimalTraining282(f.world,f.animal)).toEqual({becameWild:false});expect(JSON.stringify(state)).toBe(held);
  expect(canAnimalHaul282(f.world,f.animal)).toBe(false);delete f.animal.shipCryptosleepHeldAt277;
  f.world.tick=1002;expect(advanceAnimalTraining282(f.world,f.animal)).toEqual({becameWild:false});
  expect(state.lastLocalCore).toBe(10020);expect(state.nextDecayCore).toBe(deadline+10000);
  const after=JSON.stringify(state);f.animal.state='dead';f.world.tick++;
  expect(advanceAnimalTraining282(f.world,f.animal)).toEqual({becameWild:false});expect(JSON.stringify(state)).toBe(after);
  expect(readAnimalTraining282(f.animal,'obedience').steps).toBe(0);expect(f.animal.domestic!.tameness).toBe(5);
});

test('zero-wildness pets keep Tameness but do not acquire a blanket exemption for their other learned skills',()=>{
  const f=adopted();wanted(f,'haul',false);wanted(f,'obedience',false);
  const oldDomestic=structuredClone(f.animal.domestic);expect(atDecay(f)).toEqual({becameWild:false});expect(f.animal.domestic).toEqual(oldDomestic);
  expect(animalTrainingDecayPeriodCore282(f.animal)).toBe(720000);
  wanted(f,'obedience');learn(f,'obedience',3);expect(atDecay(f)).toEqual({becameWild:false,decayed:'obedience'});
  expect(readAnimalTraining282(f.animal,'obedience')).toMatchObject({steps:2,learned:true});expect(f.animal.domestic).toEqual(oldDomestic);
});

test('the attested public starting Husky receipt is readable but cannot resurrect a later explicit zero',()=>{
  // Only the actual published animal is extracted as a pure reader input.
  // No receipt, pet generator or14MB campaign is fabricated/migrated/played.
  const source=JSON.parse(readFileSync(new URL('../public/test-saves/v419/les-eclaircies.json',import.meta.url),'utf8')) as {wildlife:{animals:WildAnimal[]}};
  const actual=source.wildlife.animals.find(a=>a.id===3120&&a.species==='husky');
  if(!actual)throw Error('The preserved V419 original Husky is missing');
  expect(validStartingPetHeader256(actual,263)).toBe(true);expect(actual.startingPet!.masterId).toBe(7);
  const a=structuredClone(actual),receipt=JSON.stringify(a.startingPet);
  expect(readAnimalTraining282(a,'obedience')).toEqual({steps:3,learned:true,wanted:true,maxSteps:3});
  a.training={revision:1,sinceCore:0,lastLocalCore:0,nextDecayCore:720000,tamenessWanted:true,
    obedience:{steps:0,learned:false,wanted:true},haul:{steps:0,learned:false,wanted:false}};
  expect(readAnimalTraining282(a,'obedience')).toEqual({steps:0,learned:false,wanted:true,maxSteps:3});
  expect(JSON.stringify(a.startingPet)).toBe(receipt);expect(actual.training).toBeUndefined();
});

test('Haul admission uses the actual life-stage size and native trainability, not an invented adult-only rule',()=>{
  const f=animalHaulingCamp459();
  // Pure species/stage inputs, not a changed original submitted to World save.
  const stage=(species:WildAnimal['species'],growth:number):WildAnimal=>({...structuredClone(f.animal),species,
    growthTracker:{...f.animal.growthTracker!,value:Math.fround(growth)}});
  const lab=stage('labrador-retriever',.75),husky=stage('husky',.75),bear=stage('grizzly-bear',0);
  expect(animalBodySize(lab)).toBe(.375);expect(trainingRefusal282(current,lab,'haul')).toBeDefined();
  expect(animalBodySize(husky)).toBeCloseTo(.43,6);expect(trainingRefusal282(current,husky,'haul')).toBeUndefined();
  expect(animalBodySize(bear)).toBeCloseTo(.43,6);expect(trainingRefusal282(current,bear,'haul')).toBeUndefined();
  expect(trainingRefusal282(current,stage('warg',1),'haul')).toBeDefined();
  expect(trainingRefusal282(current,stage('labrador-retriever',1),'haul')).toBeUndefined();
});

test('local carry is bounded by volume, current body and each real stack limit, separately from caravan mass',()=>{
  const {animal:a}=animalHaulingCamp459();
  expect(animalBodySize(a)).toBe(.75);
  for(const item of ['wood','steel','chemfuel','neutroamine','hay','muffalo-wool','kibble'] as const)expect(animalCarryLimit282(a,item),item).toBe(56);
  for(const item of ['silver','gold'] as const)expect(animalCarryLimit282(a,item),item).toBe(500);
  expect(animalCarryLimit282(a,'medicine')).toBe(25);expect(animalCarryLimit282(a,'component')).toBe(50);
  expect(animalCarryLimit282(a,'survival-meal')).toBe(10);expect(animalCarryLimit282(a,'cloth-shirt')).toBe(1);
  const husky:WildAnimal={...structuredClone(a),species:'husky'};expect(animalCarryLimit282(husky,'wood')).toBe(64);
  a.state='downed';expect(animalCarryLimit282(a,'silver')).toBe(0);
  expect(ANIMAL_TRAINING_STEPS_282).toEqual({tameness:5,obedience:3,haul:7});
  expect(ANIMAL_TRAINING_CONVERSATION_CORE_282).toBe(270);expect(ANIMAL_TRAINING_FINAL_CORE_282).toBe(100);
  expect(ANIMAL_HAUL_CHECK_CORE_282).toBe(2500);expect(ANIMAL_HAUL_CHANCE_282).toBe(2/3);
});
