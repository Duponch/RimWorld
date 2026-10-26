import {describe,expect,it} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {toxicFalloutDose294,toxicFalloutIdentityFactor294,toxicFalloutDue294,toxicFalloutExposure294,applyToxicFalloutDose294,adoptFalloutClinicalMind294} from '../src/sim/toxic-fallout-dose-294.ts';
import {advanceMedical} from '../src/sim/injury-evolution.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {updatePawnHealth} from '../src/sim/health.ts';
import {advanceAnimalHealth} from '../src/sim/wildlife-health.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {constructFreshInitialWildAnimal256} from '../src/sim/initial-animal-constructor-256.ts';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {enableWildlife} from '../src/sim/wildlife.ts';
import {startingPawn} from '../src/sim/starting-pawns.ts';
import {groupPawnInterval256} from '../src/sim/group-core-cadence-256.ts';
import {medicalCivilTick271} from '../src/sim/suspended-human-clock-271.ts';
import type {MedicalContext,MedicalRecord} from '../src/sim/injury-types.ts';
import type {World} from '../src/sim/types.ts';

const f=Math.fround;
/** Declared controlled exposure fixture; not a played storyteller incident. */
function condition(w:World,startCore=0,endCore=100_000){
 w.miscIncidents={profile:'cassandra-misc-v1',adoptedAt:0,rng:1,nextCheck:1200,introDone:true,checks:0,opportunities:1,heatwaves:0,
  toxicFallout:{adoptedAt:0,count:1,lastStart:0,active:{startCore,endCore,rng:77,cursor:0}}};
 return w;
}
function human(){const w=condition(deconstructionCamp());w.tick=346;const p=startingPawn(w.nextId++,'Victime préparée',12,12,0,55,w.seed,345,294);delete p.health;w.pawns=[p];w.roofing={constructed:[],build:[],remove:[],cursor:0};return {w,p};}
const medical=(id=1,fallout?:MedicalContext['toxicFallout294']):MedicalContext=>({civilTick:346,phase:id%60,posture:'standing',starving:false,toxicOwner:{id,spawned:true,awake:true},...(fallout?{toxicFallout294:fallout}:{})});
const doseAt3451=(dose=f(.02))=>({firstCore:3451,lastCore:3451,dose});

describe('Core map fallout exposure and its existing clinical owner294',()=>{
 it('multiplies both racial resistances without body size and keeps the adapted identity factor stable',()=>{
  for(const id of [1,2,19,2_000_003]){
   const factor=toxicFalloutIdentityFactor294(id),full=toxicFalloutDose294(id,0,0);
   expect(factor).toBeGreaterThanOrEqual(f(.85));expect(factor).toBeLessThanOrEqual(f(1.15));expect(toxicFalloutIdentityFactor294(id)).toBe(factor);
   expect(toxicFalloutDose294(id,.5,0)).toBe(f(full*.5));
   expect(toxicFalloutDose294(id,.5,.5)).toBe(f(full*.25));
   expect(toxicFalloutDose294(id,1,.8)).toBe(0);expect(toxicFalloutDose294(id,0,1)).toBe(0);
  }
  expect(()=>toxicFalloutDose294(1,NaN,0)).toThrow('resistance');
 });

 it('uses global3451 inside local step346 and includes exactly the last native active Core tick',()=>{
  const {w,p}=human();w.tick=345;expect(toxicFalloutDue294(w)).toBe(false);
  w.tick=346;expect(toxicFalloutDue294(w)).toBe(true);
  expect(toxicFalloutExposure294(w,p,true,345)).toEqual(doseAt3451(toxicFalloutDose294(p.id,0,0)));
  expect(toxicFalloutExposure294(w,p,true,0)).toEqual(doseAt3451(toxicFalloutDose294(p.id,0,0)));
  expect(toxicFalloutExposure294(w,p,true,346)).toBeUndefined();
  condition(w,3451,3451);expect(toxicFalloutExposure294(w,p,true,345)?.firstCore).toBe(3451);
  condition(w,3452,9999);expect(toxicFalloutExposure294(w,p,true,345)).toBeUndefined();
  condition(w,0,3450);expect(toxicFalloutExposure294(w,p,true,345)).toBeUndefined();
 });

 it('does not inspect geometry or allocate dossiers between boundaries and ignores historical schemas',()=>{
  const {w,p}=human();w.tick=345;const before=structuredClone(p),rng=w.rng;
  Object.defineProperty(w,'roofing',{configurable:true,get(){throw Error('No roof read was due');}});
  expect(toxicFalloutExposure294(w,p,true,344)).toBeUndefined();
  updatePawnHealth(w,p);expect(p).toEqual(before);expect(w.rng).toBe(rng);expect(p.health).toBeUndefined();
  w.schemaVersion=293 as World['schemaVersion'];w.tick=346;expect(toxicFalloutExposure294(w,p,true,345)).toBeUndefined();
 });

 it('uses the physical motion origin and each constructed/thin/thick roof without inferring indoor safety',()=>{
  const {w,p}=human(),index=p.z*w.width+p.x,from={x:p.x-1,z:p.z};
  for(const roofing of [{constructed:[index],build:[],remove:[],cursor:0},{constructed:[],build:[],remove:[],cursor:0,natural:{thin:[index],thick:[]}},{constructed:[],build:[],remove:[],cursor:0,natural:{thin:[],thick:[index]}}]){
   w.roofing=roofing;expect(toxicFalloutExposure294(w,p,true,345)).toBeUndefined();
  }
  p.motion={from,to:{x:p.x,z:p.z},start:345,end:347};
  expect(toxicFalloutExposure294(w,p,true,345)).toBeDefined();
  w.roofing={constructed:[from.z*w.width+from.x],build:[],remove:[],cursor:0};
  expect(toxicFalloutExposure294(w,p,true,345)).toBeUndefined();
  p.motion.end=346;expect(toxicFalloutExposure294(w,p,true,345)).toBeDefined();
 });

 it('creates once for a positive environmental dose, while zero, immunity and later doses draw nothing',()=>{
  const h=createMedicalRecord(345);let draws=0;const random=()=>{draws++;return .5;};
  applyToxicFalloutDose294(h,0,random);expect(h.toxicBuildup).toBeUndefined();expect(draws).toBe(0);
  applyToxicFalloutDose294(h,f(.02),random);expect(draws).toBe(1);expect(h.toxicBuildup?.severity).toBe(f(.02));
  applyToxicFalloutDose294(h,f(.03),random);expect(draws).toBe(1);expect(h.toxicBuildup?.severity).toBe(f(f(.02)+f(.03)));
  const mech={...createMedicalRecord(345),body:'scyther' as const};applyToxicFalloutDose294(mech,f(.02),random);expect(mech.toxicBuildup).toBeUndefined();expect(draws).toBe(1);
  expect(()=>applyToxicFalloutDose294(h,f(.02),()=>NaN)).not.toThrow();
 });

 it('applies dose before clinical death and cannot recover a lethal dose later in the same Core tick',()=>{
  const h=createMedicalRecord(345);h.toxicBuildup={severity:f(.99),bornAt:345};
  advanceMedical(h,1,medical(1,doseAt3451()),()=>.999);
  expect(h.death).toEqual({tick:346,cause:'toxic-buildup'});expect(h.toxicBuildup!.severity).toBe(f(f(.99)+f(.02)));
 });

 it('keeps Core recovery during fallout instead of importing the Biotech recovery blockade',()=>{
  const id=Array.from({length:10_000},(_,i)=>i+1).find(id=>groupPawnInterval256(id,3455,200,1))!;
  expect(id).toBeDefined();const h=createMedicalRecord(345);h.toxicBuildup={severity:f(.1),bornAt:345};
  advanceMedical(h,1,medical(id,doseAt3451()),()=>.999);
  expect(h.toxicBuildup!.severity).toBe(f(f(f(.1)+f(.02))+f(f(-.08)*f(.0033333334))));
 });

 it('resumes civil3451 on a younger suspended clinical clock without retrospectively dosing the gap',()=>{
  const h=createMedicalRecord(45);h.civilTick271=345;let draws=0;
  advanceMedical(h,1,medical(2,doseAt3451()),()=>{draws++;return .999;});
  expect(h.tick).toBe(46);expect(h.civilTick271).toBe(346);expect(h.toxicBuildup?.bornAt).toBe(46);
  expect(h.toxicBuildup!.severity).toBeGreaterThan(0);expect(draws).toBe(1);
  const before=structuredClone(h);expect(()=>advanceMedical(h,0,{...medical(2),toxicFallout294:doseAt3451()},()=>.5)).toThrow('segment');expect(h).toEqual(before);
 });

 it('the real human adapter creates only the due dossier and repeated flushes never redose it',()=>{
  const {w,p}=human();updatePawnHealth(w,p);expect(p.health?.toxicBuildup?.severity).toBeGreaterThan(0);
  expect(medicalCivilTick271(p.health!)).toBe(346);const before=structuredClone(p),rng=w.rng;
  for(let i=0;i<3;i++)updatePawnHealth(w,p);expect(p).toEqual(before);expect(w.rng).toBe(rng);
 });

 it('actual carried and cryptosleep-held humans receive neither a new dossier nor a creation draw',()=>{
  for(const mode of ['rescue','cryptosleep','roof'] as const){
   const {w,p}=human(),rng=w.rng;
   if(mode==='rescue'){const carrier=structuredClone(p);carrier.id=w.nextId++;carrier.rescue={patientId:p.id,bedId:0,phase:'carry'};w.pawns.push(carrier);}
   if(mode==='cryptosleep')p.cryptosleepHeldAt271=345;
   if(mode==='roof')w.roofing!.constructed=[p.z*w.width+p.x];
   updatePawnHealth(w,p);expect(p.health).toBeUndefined();expect(w.rng).toBe(rng);
  }
 });

 it('adopts only the existing clinical wander authority on the first adverse dose to a literal historical human',()=>{
  const {w}=human(),p=startingPawn(w.nextId++,'Original historique',12,12,0,55,w.seed,345);
  delete p.health;p.mental={below:[450,300,150],cooldown:7,catharsis:[999]};w.pawns=[p];
  const before=structuredClone(p);w.tick=345;updatePawnHealth(w,p);expect(p).toEqual(before);expect(p.mental.wander).toBeUndefined();
  w.tick=346;updatePawnHealth(w,p);expect(p.mental.wander).toEqual({revision:1,nextMoveOrderIsWait:false});
  const after=structuredClone(p);delete after.health;delete after.mental!.wander;expect(after).toEqual(before);
  // Record roundtrip/continued clinical adapter only. Full campaign admission
  // and native save/reload are qualified separately by the main integration.
  const copy=JSON.parse(JSON.stringify(p)) as typeof p;w.pawns=[copy];const mind=structuredClone(copy.mental);
  w.tick++;updatePawnHealth(w,copy);expect(copy.mental).toEqual(mind);expect(copy.health?.toxicBuildup?.severity).toBeGreaterThan(0);
 });

 it('does not adopt a historical mind through a roof, zero dose, old schema or refused original',()=>{
  for(const mode of ['roof','zero','historical','refusal'] as const){
   const {w}=human(),p=startingPawn(w.nextId++,'Absence historique',12,12,0,55,w.seed,345);delete p.health;w.pawns=[p];
   const before=structuredClone(p),rng=w.rng;
   if(mode==='roof'){w.roofing!.constructed=[p.z*w.width+p.x];updatePawnHealth(w,p);}
   if(mode==='zero')adoptFalloutClinicalMind294(p,294,{firstCore:3451,lastCore:3451,dose:0});
   if(mode==='historical')adoptFalloutClinicalMind294(p,293,doseAt3451());
   if(mode==='refusal'){Object.preventExtensions(p);expect(()=>updatePawnHealth(w,p)).toThrow('mutable actual map owner');}
   expect(p).toEqual(before);expect(p.mental?.wander).toBeUndefined();expect(w.rng).toBe(rng);
  }
 });

 it('the actual animal adapter retains its native race dose and excludes a rescue carrier',()=>{
  for(const carried of [false,true]){
   const {world:w,animal:a,handler,spotId}=animalHaulingCamp459();condition(w);w.tick=346;delete a.health;
   w.roofing={constructed:[],build:[],remove:[],cursor:0};if(carried)handler.animalRescue={animalId:a.id,spotId,phase:'carry'};
   const rng=w.rng;advanceAnimalHealth(w,a);
   if(carried){expect(a.health).toBeUndefined();expect(w.rng).toBe(rng);}else{
    const health=a.health as MedicalRecord|undefined;expect(health?.toxicBuildup?.severity).toBeGreaterThan(0);expect(health!.animalBirthTick).toBe(w.tick-a.ageTicks);
    expect(health!.toxicBuildup!.severity).toBeLessThan(toxicFalloutDose294(a.id,0,0));
    const before=structuredClone(a),afterRng=w.rng;advanceAnimalHealth(w,a);expect(a).toEqual(before);expect(w.rng).toBe(afterRng);
   }
  }
 });

 it('a rejected explosive toxic death preserves the entire original owner and PRNG transaction',()=>{
  const w=condition(deconstructionCamp());w.tick=345;
  const made=constructFreshInitialWildAnimal256({fact:INITIAL_ANIMAL_FACTS_256.Boomalope,id:w.nextId,cell:{x:10,z:10},tick:w.tick,random:new WorldGenerationRandom(w.seed)});
  if(made.status!=='ready')throw Error('Declared explosive fixture blocked: '+made.reason);
  const a=made.animal;w.nextId++;enableWildlife(w,0);w.wildlife!.animals.push(a);
  a.health=createAnimalMedicalRecord256(w,a);a.health.toxicBuildup={severity:f(.999),bornAt:345};w.tick++;a.ageTicks++;
  w.roofing={constructed:[],build:[],remove:[],cursor:0};w.nextId=Number.MAX_SAFE_INTEGER;
  const before=structuredClone(w),health=a.health;
  expect(()=>advanceAnimalHealth(w,a)).toThrow('Cannot reserve animal death explosion');expect(w).toEqual(before);expect(a.health).toBe(health);
 });
});
