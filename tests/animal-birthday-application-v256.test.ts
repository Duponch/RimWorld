import {describe,expect,it} from 'vitest';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {tryApplyAnimalAgeCondition256,simulateAnimalBirthdaySeverity256} from '../src/sim/animal-birthday-application-256.ts';
import {animalAgeConditionEffects256,validAnimalAgeConditions256,type AnimalAgeMedical256} from '../src/sim/animal-age-condition-state-256.ts';
import {advanceAnimalAgeConditionInterval256,tendAnimalAgeCondition256,tickAnimalConditionTends256,unresolvedAnimalConditionBindings256} from '../src/sim/animal-age-condition-runtime-256.ts';
import {medicalModel} from '../src/sim/body-model.ts';
import {partMissing,reconcileMedicalDeath} from '../src/sim/injury-state.ts';
import {validateMedicalRecord} from '../src/sim/injury-validation.ts';
import {groupPawnInterval256} from '../src/sim/group-core-cadence-256.ts';
import type {InitialAnimalRandom256} from '../src/sim/initial-animal-age-256.ts';
/** Prepared true anatomical clinical records, never a fake World or a claim
 * of a completed doctor/mental-state gameplay loop. ROOT alone executes. */
function stream(values:number[]){let count=0;const value=()=>{const v=values[count++];if(v===undefined)throw Error('Unexpected actual RNG draw');return v;};return {get count(){return count;},value,integer:(a:number,b:number)=>a+Math.floor(value()*(b-a)),float:(a:number,b:number)=>b<=a?a:Math.fround(Math.fround(Math.fround(value())*Math.fround(b-a))+a)} satisfies InitialAnimalRandom256&{readonly count:number};}
const record=(species:'duck'|'wild-boar'='duck'):AnimalAgeMedical256=>createAnimalMedicalRecord256({tick:100,schemaVersion:256},{species,ageTicks:360000,growthTracker:{revision:1,value:1,nextCheckCore:1240}});
const valid=(h:AnimalAgeMedical256,version=256,animal=true)=>validAnimalAgeConditions256(h,version,animal,h.tick,medicalModel(h),h.missing);
describe('actual Core birthday part application256',()=>{
 it('does not confuse canonical torso ID with a Torso Def or invent bird ears',()=>{
  const h=record(),rng=stream([]);expect(tryApplyAnimalAgeCondition256(h,'Frail',rng)).toEqual({status:'not-applied',reason:'no-eligible-part'});expect(tryApplyAnimalAgeCondition256(h,'HearingLoss',rng).status).toBe('not-applied');expect(rng.count).toBe(0);expect(h.animalAgeConditions).toBeUndefined();
 });
 it('affects each actual eye once and stops without draws when both are already affected',()=>{
  const h=record(),rng=stream([0,0,0]);const result=tryApplyAnimalAgeCondition256(h,'Cataract',rng);expect(result.status).toBe('applied');expect(rng.count).toBe(3);expect(h.animalAgeConditions!.cases.map(c=>c.part)).toEqual(['left-eye','right-eye']);expect(h.animalAgeConditions!.nextId).toBe(3);expect(valid(h)).toBe(true);expect(tryApplyAnimalAgeCondition256(h,'Cataract',stream([])).status).toBe('not-applied');
 });
 it('excludes missing organs and does not credit an impossible application',()=>{
  const h=record();h.missing.push({part:'left-eye',bornAt:100});expect(partMissing(h,'left-eye')).toBe(true);const rng=stream([.5]);expect(tryApplyAnimalAgeCondition256(h,'Cataract',rng).status).toBe('applied');expect(h.animalAgeConditions!.cases.map(c=>c.part)).toEqual(['right-eye']);expect(rng.count).toBe(1);expect(valid(h)).toBe(true);
 });
 it('preflights the actual two-organ identities without a partial record or RNG draw',()=>{
  const h=record();h.animalAgeConditions={revision:1,nextId:Number.MAX_SAFE_INTEGER-1,cases:[]};const before=JSON.stringify(h),rng=stream([]);expect(()=>tryApplyAnimalAgeCondition256(h,'Cataract',rng)).toThrow('identities exhausted');expect(JSON.stringify(h)).toBe(before);expect(rng.count).toBe(0);
 });
 it('creates the real carcinoma mode and two factors on a live original part',()=>{
  const h=record(),rng=stream([0,0,0,0,0]);expect(tryApplyAnimalAgeCondition256(h,'Carcinoma',rng).status).toBe('applied');const c=h.animalAgeConditions!.cases[0]!;expect(c.noPain).toBe(true);expect(c.growth).toEqual({mode:0,growingFactor:Math.fround(.45),remissionFactor:Math.fround(.7)});expect(c.tend).toEqual({ticksLeft:-1,quality:0,totalQuality:0});expect(rng.count).toBe(5);expect(valid(h)).toBe(true);expect(c.part.startsWith('a256-Bird-16')).toBe(false);
 });
 it('simulates past blockage severity and avoids the first life-threatening stage exactly',()=>{
  const h=record(),rng=stream([.5,.5]);expect(tryApplyAnimalAgeCondition256(h,'HeartArteryBlockage',rng).status).toBe('applied');const c=h.animalAgeConditions!.cases[0]!;simulateAnimalBirthdaySeverity256(c,50*3600000,1,stream([1]),true);expect(c.severity).toBe(.75);expect(valid(h)).toBe(true);
 });
 it('projects true part efficiency and condition capacities without adding a wound',()=>{
  const h=record();tryApplyAnimalAgeCondition256(h,'Dementia',stream([.5]));const effects=animalAgeConditionEffects256(h);expect(effects.partOffsets).toEqual([{part:'brain',offset:Math.fround(-.15)}]);expect(effects.hearing).toBe(Math.fround(-.25));expect(h.injuries).toEqual([]);expect(h.missing).toEqual([]);expect(valid(h)).toBe(true);
 });
 it('refuses historical/human/accessor/undefined/non-f32 disease data before use',()=>{
  const h=record();tryApplyAnimalAgeCondition256(h,'BadBack',stream([.5]));expect(valid(h,255)).toBe(false);expect(valid(h,256,false)).toBe(false);const invalid=structuredClone(h);invalid.animalAgeConditions!.cases[0]!.severity=.1;expect(valid(invalid)).toBe(false);
  let reads=0;const getter=record();Object.defineProperty(getter,'animalAgeConditions',{enumerable:true,get(){reads++;return h.animalAgeConditions;}});expect(valid(getter)).toBe(false);expect(reads).toBe(0);const own=record();Object.defineProperty(own,'animalAgeConditions',{value:undefined,enumerable:true});expect(valid(own)).toBe(false);
 });
 it('retains exact state on JSON and refuses a missing mental binding before mutation or draw',()=>{
  const h=record();tryApplyAnimalAgeCondition256(h,'Alzheimers',stream([.5]));const resumed:AnimalAgeMedical256=JSON.parse(JSON.stringify(h));expect(resumed).toEqual(h);expect(valid(resumed)).toBe(true);expect(unresolvedAnimalConditionBindings256(h,{})).toContain('actual-confused-mental-owner-and-jobs');const before=JSON.stringify(h),rng=stream([]);expect(()=>advanceAnimalAgeConditionInterval256(h,{actorId:17,atCore:1000,deltaCore:1,random:rng,bindings:{}})).toThrow('Unresolved');expect(JSON.stringify(h)).toBe(before);expect(rng.count).toBe(0);
 });
 it('uses the real asthma tending tracker and actual hash200 physiological interval',()=>{
  const h=record();tryApplyAnimalAgeCondition256(h,'Asthma',stream([0,.5,.5]));const c=h.animalAgeConditions!.cases[0]!,core=Array.from({length:200},(_,i)=>1001+i).find(t=>groupPawnInterval256(17,t,200,1))!;h.tick=Math.ceil(core/10);const before=c.severity;
  advanceAnimalAgeConditionInterval256(h,{actorId:17,atCore:core,deltaCore:1,random:stream([]),bindings:{reconcileHealth:()=>reconcileMedicalDeath(h)}});expect(c.severity).toBeGreaterThan(before);
  expect(tendAnimalAgeCondition256(h,c.id,.8,1,stream([.5]))).toBe(true);expect(c.tend!.ticksLeft).toBe(427500);expect(c.tend!.quality).toBe(Math.fround(.8));tickAnimalConditionTends256(h);expect(c.tend!.ticksLeft).toBe(427499);expect(valid(h)).toBe(true);
 });
 it('keeps the isolated medical validator strict with its actual condition causes',()=>{
  const h=record();tryApplyAnimalAgeCondition256(h,'HeartArteryBlockage',stream([.5,.5]));h.animalAgeConditions!.cases[0]!.severity=1;reconcileMedicalDeath(h);expect(h.death?.cause).toBe('heart-artery-blockage');expect(validateMedicalRecord(h,true,true,true,true,true,true,true,true,true,true,true,256)).toBeNull();expect(validateMedicalRecord(h,true,true,true,true,true,true,true,true,true,true,true,255)).not.toBeNull();
 });
});
