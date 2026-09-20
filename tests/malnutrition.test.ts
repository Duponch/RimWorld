import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { expect,test } from 'vitest';
import { MALNUTRITION_UNIT,malnutritionModifiers,malnutritionRate,malnutritionStage } from '../src/sim/malnutrition';
import { advanceMedical } from '../src/sim/injury-evolution';
import { createMedicalRecord,assessMedical,reconcileMedicalDeath,addResolvedInjury } from '../src/sim/injury-state';
import { validateMedicalRecord } from '../src/sim/injury-validation';
import { injurePawn,reconcilePawnHealth,updatePawnHealth } from '../src/sim/health';
import { advanceHeatExposure } from '../src/sim/heat-exposure';
import { advanceAnimalHealth } from '../src/sim/wildlife-health';
import { animalCombatCamp } from './scenarios/animal-combat';
import { applyCommand,stepWorld } from '../src/sim/engine';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization';
import { addMaterial,refreshStock } from '../src/sim/materials';
import { moodThoughts } from '../src/sim/mood';
import { medicalCamp } from './scenarios/health';
import { fixtureBuilding } from './scenarios/deconstruction';
import type { World } from '../src/sim/types';

const random=()=>{throw new Error('Malnutrition must not draw mutable randomness');};
function valid(w:World){expect(validateWorld(w)).toEqual([]);}
function replay(w:World,n:number){const c=deserializeWorld(serializeWorld(w));stepWorld(w,n);stepWorld(c,n);expect(c).toEqual(w);valid(w);}

test('individual rate, interval, thresholds and physiological death preserve exact continuation',()=>{
  const rates=Array.from({length:100},(_,i)=>malnutritionRate(i+1));expect(Math.min(...rates)).toBeGreaterThanOrEqual(906000);expect(Math.max(...rates)).toBeLessThanOrEqual(1359000);expect(new Set(rates).size).toBe(100);
  const h=createMedicalRecord(),context={phase:1,posture:'standing' as const,starving:true,malnutritionRate:malnutritionRate(1)};
  advanceMedical(h,6000,context,random);expect(h.malnutrition).toBe(400*context.malnutritionRate);expect(h.tick).toBe(6000);
  const restored=structuredClone(h);advanceMedical(h,183,context,random);for(let i=0;i<183;i++)advanceMedical(restored,1,context,random);expect(restored).toEqual(h);
  for(const [severity,consciousness] of [[1,.95],[200000000,.9],[400000000,.8],[600000000,.7],[800000000,.1]]){
    const record={...createMedicalRecord(),malnutrition:severity!};expect(assessMedical(record).capacities.consciousness).toBe(consciousness);expect(validateMedicalRecord(record)).toBeNull();
  }
  expect(malnutritionStage(199999999)).toBe(1);expect(malnutritionStage(200000000)).toBe(2);expect(malnutritionModifiers(1).hungerFactor).toBe(1.5);expect(malnutritionModifiers(200000000).hungerFactor).toBe(1.6);
  advanceMedical(h,20000,context,random);expect(h.death?.cause).toBe('malnutrition');expect(h.malnutrition).toBe(MALNUTRITION_UNIT);expect(validateMedicalRecord(h)).toBeNull();
  const frozen=structuredClone(h);advanceMedical(h,100,{...context,starving:false},random);expect(h).toEqual(frozen);
  const combined=createMedicalRecord();addResolvedInjury(combined,'brain','bruise',8000,()=>.999);expect(combined.death).toBeUndefined();combined.malnutrition=400000000;reconcileMedicalDeath(combined);expect(combined.death?.cause).toBe('vital-failure');
});

test('empty food causes a real condition; policy and ingestion govern recovery without a medicine or instant cure',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;p.hunger=0;p.foodPolicyId=4;
  addMaterial(w,'food',5,{type:'ground',x:p.x+2,z:p.z},'survival-meal');refreshStock(w);valid(w);
  stepWorld(w,45);expect(p.health?.malnutrition).toBeGreaterThan(0);expect(p.hunger).toBe(0);expect(w.piles.reduce((n,p)=>n+p.quantity,0)).toBe(5);replay(w,3);
  expect(applyCommand(w,{type:'food-policy-assign',pawnId:p.id,policyId:1}).ok).toBe(true);
  let ingested=false;for(let i=0;i<300;i++){stepWorld(w);if(p.hunger>50){ingested=true;break;}}
  expect(ingested).toBe(true);expect(p.health?.malnutrition).toBeGreaterThan(0);expect(w.piles.reduce((n,p)=>n+p.quantity,0)).toBe(4);expect(moodThoughts(w,p).some(t=>t.id.startsWith('starvation-'))).toBe(false);
  replay(w,300);expect(p.health?.malnutrition).toBeUndefined();expect(p.state).not.toBe('dead');
});

test('first injury or thermal exposure cannot consume or duplicate the due hunger pulse',()=>{
  for(const exposure of ['heat','injury'] as const){
    const w=medicalCamp(),p=w.pawns[0]!;p.hunger=0;delete p.health;
    while(w.tick%30!==p.id%30)w.tick++;
    if(exposure==='heat')advanceHeatExposure(w,p,()=>100);else injurePawn(w,p,'torso','bruise',1000);
    expect(w.pawns[0]!.health?.malnutrition).toBe(malnutritionRate(p.id));
    updatePawnHealth(w,p);expect(w.pawns[0]!.health?.malnutrition).toBe(malnutritionRate(p.id));
    replay(w,30);
  }
});

test('a hungry hare shares the phased condition and recovers without a human body',()=>{
  const w=animalCombatCamp(),a=w.wildlife!.animals[0]!;a.food=0;
  while(w.tick%15!==a.id%15)w.tick++;
  advanceAnimalHealth(w,a);expect(a.health?.body).toBe('hare');expect(a.health?.malnutrition).toBe(malnutritionRate(a.id));
  advanceAnimalHealth(w,a);expect(a.health?.malnutrition).toBe(malnutritionRate(a.id));
  const restored=deserializeWorld(serializeWorld(w));a.food=.2;restored.wildlife!.animals[0]!.food=.2;
  w.tick+=15;restored.tick+=15;advanceAnimalHealth(w,a);advanceAnimalHealth(restored,restored.wildlife!.animals[0]!);
  expect(restored).toEqual(w);expect(a.health?.malnutrition).toBeUndefined();valid(w);
});

test('severe hunger uses physical bedside feeding, frees incapacity and conserves the meal through save',()=>{
  const w=medicalCamp(2),doctor=w.pawns[0]!,p=w.pawns[1]!;doctor.priorities.doctor=1;
  p.hunger=0;p.health={...createMedicalRecord(w.tick),malnutrition:810000000};reconcilePawnHealth(w,p);
  const bed=fixtureBuilding(w,'bed',p.x,p.z);Object.assign(bed,{medical:true});p.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:p.x,z:p.z}};
  addMaterial(w,'food',8,{type:'ground',x:doctor.x-2,z:doctor.z},'survival-meal');refreshStock(w);valid(w);
  let feeding=false;for(let i=0;i<300;i++){stepWorld(w);if(doctor.feed?.phase==='feed'){feeding=true;break;}}
  expect(feeding).toBe(true);expect(p.hunger).toBe(0);expect(p.state).toBe('downed');replay(w,10);
  for(let i=0;i<300&&p.hunger===0;i++)stepWorld(w);expect(p.hunger).toBeGreaterThan(50);expect(p.health.malnutrition).toBeGreaterThan(800000000);valid(w);
  replay(w,500);expect(p.state).not.toBe('downed');expect(p.health.malnutrition).toBeLessThan(800000000);expect(w.piles.some(p=>p.kind==='medicine')).toBe(false);
});

test('genuine V83 save migrates neutrally; new disease and invalid severity cannot hide in old schemas',()=>{
  const old=JSON.parse(gunzipSync(readFileSync('tests/fixtures/scenario-v83.json.gz')).toString()),migrated=deserializeWorld(JSON.stringify(old));
  expect(migrated).toEqual({...old,schemaVersion:84});valid(migrated);
  for(const severity of [0,-1,.5,1000000001]){const c=structuredClone(migrated);c.pawns[0]!.health={...createMedicalRecord(c.tick),malnutrition:severity};expect(validateWorld(c).length).toBeGreaterThan(0);}
  const forged=structuredClone(old);forged.pawns[0].health={...createMedicalRecord(old.tick),malnutrition:1};expect(()=>deserializeWorld(JSON.stringify(forged))).toThrow(/version 83/);
  replay(migrated,3);
});
