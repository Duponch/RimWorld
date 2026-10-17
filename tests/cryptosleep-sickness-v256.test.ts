import {describe,it,expect} from 'vitest';
import {makeCryptosleepSickness256,addCryptosleepSickness256,advanceCryptosleepSickness256,validCryptosleepSicknessState256,validCryptosleepSicknessHeader256,cryptosleepVomitChance256} from '../src/sim/cryptosleep-sickness-256';
import {validCryptosleepSicknessTransport256,validCryptosleepSicknessWorldTransport256} from '../src/sim/cryptosleep-sickness-save-256';
import {createMedicalRecord,assessMedical,reconcileMedicalDeath} from '../src/sim/injury-state';
import {advanceMedical} from '../src/sim/injury-evolution';
import {validateMedicalRecord} from '../src/sim/injury-validation';
import {BLOOD_UNIT} from '../src/sim/injury-rules';
import {HEALTHY_BODY} from '../src/sim/body-capacities';
import {processPawnVomiting,processAnimalVomiting} from '../src/sim/food-hygiene';
import {processVomit} from '../src/sim/food-poisoning-runtime';
import {exposeFoodPoisoning} from '../src/sim/food-poisoning';
import {reconcilePawnHealth,updatePawnHealth} from '../src/sim/health';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256';
import {personalMoodThoughts} from '../src/sim/mood';
import {serializeWorld,deserializeWorld} from '../src/sim/serialization';
import {WorldGenerationRandom} from '../src/sim/world-generation-random';
import {huntingCamp} from './scenarios/hunting';
import type {MedicalContext} from '../src/sim/injury-types';

/** Isolated clinical records and explicitly prepared huntingCamp Worlds.
 * No map/roster/holder is fabricated and no scenario/generator/biological
 * chronology is claimed. ROOT alone runs these prepared cases. */
const random=(duration=8001,seed=-17)=>({integer:(min:number,max:number)=>{expect([min,max]).toEqual([8000,12001]);return duration;},integerValue:()=>seed});
const clinical:MedicalContext={phase:17,posture:'standing',starving:false,cryptosleepSicknessSpawned:false};
const validate=(h:unknown,version=256)=>validateMedicalRecord(h,true,true,true,true,false,false,true,true,true,true,true,version,true);
function prepared(){const w=huntingCamp();w.schemaVersion=256;w.deterioration!.lastTick=w.tick;const p=w.pawns[0]!;p.health=createMedicalRecord(w.tick);return {w,p,h:p.health};}

describe('prospective cryptosleep sickness with actual clinical and physical owners',()=>{
 it('draws MakeHediff duration then noise, and preserves the old component when the new one merges',()=>{
  const order:string[]=[],h=createMedicalRecord();
  addCryptosleepSickness256(h,{integer:(min,max)=>{order.push('duration');expect([min,max]).toEqual([8000,12001]);return 8001;},integerValue:()=>{order.push('noise');return -17;}},256);
  expect(order).toEqual(['duration','noise']);expect(h.cryptosleepSickness).toEqual({remainingCore:8001,initialCore:8001,noiseSeed:-17});
  const component=h.cryptosleepSickness!;component.remainingCore=2000;addCryptosleepSickness256(h,random(12000,999),256);
  expect(h.cryptosleepSickness).toBe(component);expect(component).toEqual({remainingCore:12000,initialCore:8001,noiseSeed:-17});expect(validate(h)).toBeNull();
  const stream=new WorldGenerationRandom(553),before=stream.state.counter;makeCryptosleepSickness256(stream);expect(stream.state.counter-before).toBe(2);
 });
 it('uses only real non-suspended clinical intervals, consumes off-map MTB trials, and freezes at real death',()=>{
  const h=createMedicalRecord();addCryptosleepSickness256(h,random(),256);let draws=0;
  advanceMedical(h,100,clinical,()=>{draws++;return .99;});expect(h.tick).toBe(100);expect(h.cryptosleepSickness!.remainingCore).toBe(7001);expect(draws).toBe(2);
  const before=JSON.stringify(h);expect(advanceCryptosleepSickness256(h.cryptosleepSickness!,4000,true)).toBe(true);expect(JSON.stringify(h)).toBe(before);
  advanceMedical(h,1,clinical,()=>.99);expect(h.tick).toBe(101);expect(h.cryptosleepSickness!.remainingCore).toBe(6991);
  h.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(h);expect(h.death).toEqual({tick:101,cause:'blood-loss'});
  const terminal=JSON.stringify(h);advanceMedical(h,500,clinical,()=>{throw Error('Terminal must not draw');});expect(JSON.stringify(h)).toBe(terminal);
 });
 it('composes real capacities and one sick thought, then expires without a stale cached body or a random cure',()=>{
  const {w,p,h}=prepared(),thoughts=()=>personalMoodThoughts(p,{tick:h.tick,people:new Map(),items:w.piles,difficultyMood:0});expect(assessMedical(h)).toBe(HEALTHY_BODY);addCryptosleepSickness256(h,random(8000),256);
  const body=assessMedical(h);expect(body.capacities.consciousness).toBe(.8);expect(body.capacities.moving).toBeCloseTo(.72,10);expect(body.capacities.manipulation).toBeCloseTo(.72,10);
  h.cryptosleepSickness!.noiseSeed=22;expect(assessMedical(h)).toBe(body);expect(thoughts().filter(t=>t.id==='sick')).toHaveLength(1);
  advanceMedical(h,800,{...clinical,phase:p.id%60},()=>.99);expect(h.cryptosleepSickness).toBeUndefined();expect(assessMedical(h)).toBe(HEALTHY_BODY);expect(thoughts().some(t=>t.id==='sick')).toBe(false);
 });
 it('refuses255, forged descriptors/ranges and two physical episode owners before invoking a getter',()=>{
  const h=createMedicalRecord();addCryptosleepSickness256(h,random(),256);expect(validate(h,255)).not.toBeNull();
  expect(validCryptosleepSicknessHeader256(h,256,true)).toBe(false);expect(validCryptosleepSicknessHeader256({...h,cryptosleepSickness:undefined},256)).toBe(false);
  const inherited=Object.create({cryptosleepSickness:h.cryptosleepSickness});expect(validCryptosleepSicknessHeader256(inherited,256)).toBe(false);
  let reads=0;const getter={...h};Object.defineProperty(getter,'cryptosleepSickness',{enumerable:true,get(){reads++;throw Error('Future getter must not run');}});expect(validate(getter)).not.toBeNull();expect(reads).toBe(0);
  const nested=structuredClone(h);Object.defineProperty(nested.cryptosleepSickness!,'remainingCore',{enumerable:true,get(){reads++;return 100;}});expect(validate(nested)).not.toBeNull();expect(reads).toBe(0);
  expect(validCryptosleepSicknessState256({remainingCore:12001,initialCore:8000,noiseSeed:1})).toBe(false);
  h.cryptosleepSickness!.vomit={remainingCore:400,cell:{x:1,z:1}};h.foodPoisoning={...exposeFoodPoisoning(undefined,'unknown','survival-meal',0),vomit:{remainingCore:300,cell:{x:1,z:1}}};expect(validate(h)).not.toBeNull();
  const old=createMedicalRecord();advanceMedical(old,10,{phase:0,posture:'standing',starving:false},()=>{throw Error('Literal healthy record must not draw');});expect(old).toEqual(createMedicalRecord(10));expect(validate(old,255)).toBeNull();
 });
 it('keeps exact RAW on a real prepared World and checks the actual frozen versus spatial owner frontier',()=>{
  const {w,p,h}=prepared();addCryptosleepSickness256(h,random(12000,2147483647),256);
  expect(validCryptosleepSicknessWorldTransport256(w,256)).toBe(true);const raw=serializeWorld(w),loaded=deserializeWorld(raw);expect(serializeWorld(loaded)).toBe(raw);
  expect(validCryptosleepSicknessTransport256(p,256,w.tick)).toBe(true);expect(validCryptosleepSicknessTransport256(p,255,w.tick)).toBe(false);
  h.cryptosleepSickness!.vomit={remainingCore:300,cell:{x:p.x,z:p.z}};expect(validCryptosleepSicknessTransport256(p,256,w.tick)).toBe(false);expect(validCryptosleepSicknessTransport256(p,256,w.tick,w)).toBe(true);
  h.cryptosleepSickness!.vomit.cell={x:p.x+3,z:p.z};expect(validCryptosleepSicknessTransport256(p,256,w.tick,w)).toBe(false);
  h.cryptosleepSickness!.vomit.cell={x:p.x,z:p.z};p.path=[{x:p.x+1,z:p.z}];expect(validCryptosleepSicknessTransport256(p,256,w.tick,w)).toBe(false);
 });
 it('uses the true600Core MTB ratio and keeps a residual physical episode after illness expiry',()=>{
  const state=makeCryptosleepSickness256(random(8000));expect(cryptosleepVomitChance256(state)).toBe(.08);
  let draws=0,starts=0,deposits=0;const context={awake:true,position:{x:1,z:1},foodLevel:100,foodMax:100,random:()=>{draws++;return draws===1?.079:0;},canStand:()=>true,start:()=>{starts++;return true;},deposit:()=>{deposits++;}};
  const first=processVomit(state,0,0,context,cryptosleepVomitChance256(state));expect(first).toEqual({active:true,foodLevel:96});expect(starts).toBe(1);expect(deposits).toBe(1);
  state.remainingCore=1;state.vomit!.remainingCore=10;expect(advanceCryptosleepSickness256(state,10)).toBe(true);expect(state.remainingCore).toBe(0);expect(cryptosleepVomitChance256(state)).toBe(0);
  expect(processVomit(state,1,0,{...context,foodLevel:96},0).active).toBe(true);expect(state.vomit).toBeUndefined();expect(starts).toBe(1);expect(deposits).toBe(1);
 });
 it('interrupts at real local contact, keeps one physical job with an independent disease, and cancels it on actual death',()=>{
  const w=huntingCamp();w.schemaVersion=256;const p=w.pawns[0]!;w.tick+=((p.id%60-w.tick%60+60)%60);const h=p.health=createMedicalRecord(w.tick);p.hunger=100;p.moveCooldown=0;p.state='idle';p.path=[];
  addCryptosleepSickness256(h,random(),256);w.rng=1;const possessions=w.piles.slice();
  expect(processPawnVomiting(w,p)).toBe(true);expect(h.foodPoisoning).toBeUndefined();expect(p.hunger).toBe(96);expect(w.filth?.items.some(f=>f.kind==='vomit')).toBe(true);expect(w.piles).toEqual(possessions);
  const episode=h.cryptosleepSickness!.vomit!,remaining=episode.remainingCore;expect(Math.max(Math.abs(episode.cell.x-p.x),Math.abs(episode.cell.z-p.z))).toBeLessThanOrEqual(1);
  // A separate genuine poisoning record cannot acquire a second physical job.
  h.foodPoisoning=exposeFoodPoisoning(undefined,'unknown','survival-meal',w.tick);w.tick++;updatePawnHealth(w,p);
  expect(processPawnVomiting(w,p)).toBe(true);expect(h.foodPoisoning.vomit).toBeUndefined();expect(episode.remainingCore).toBe(remaining-10);expect(p.hunger).toBe(96);
  h.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(h);reconcilePawnHealth(w,p);expect(p.state).toBe('dead');expect(h.cryptosleepSickness!.vomit).toBeUndefined();expect(h.cryptosleepSickness!.remainingCore).toBe(7991);
 });
 it('reuses the animal physical driver on the same real original without an invented poisoned food or holder',()=>{
  const w=huntingCamp();w.schemaVersion=256;const a=w.wildlife!.animals[0]!;w.tick+=((a.id%60-w.tick%60+60)%60);a.health=createAnimalMedicalRecord256(w,a);a.food=.2;a.state='idle';a.path=[];delete a.motion;
  addCryptosleepSickness256(a.health,random(),256);w.rng=1;expect(processAnimalVomiting(w,a)).toBe(true);expect(a.health.foodPoisoning).toBeUndefined();expect(a.food).toBeCloseTo(.192,7);expect(a.health.cryptosleepSickness!.vomit).toBeDefined();
 });
});
