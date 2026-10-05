import { expect,test } from 'vitest';
import { medicalCamp } from './scenarios/health.ts';
import { addResolvedInjury,medicalPain,medicalBleedUnits,medicalStatus,tendInjury,tendMissingPart } from '../src/sim/injury-state.ts';
import { advanceMedical } from '../src/sim/injury-evolution.ts';
import { createMechaMedicalRecord,commitMechanoidImpact,mechaAssessment } from '../src/sim/mechanoid-health.ts';
import { validateMechanoids,validMechaMedicalRecord } from '../src/sim/mechanoid-save.ts';
import { damageMechanoidWithBullet,damageMechanoidWithBomb,mechanoidProtection } from '../src/sim/mechanoid-impact.ts';
import { resolveUnarmoredBullet } from '../src/sim/bullet-impact.ts';
import { resolveBombImpact } from '../src/sim/bomb-impact.ts';
import type { Mechanoid } from '../src/sim/mechanoid-state.ts';

const noDraw=()=>{throw new Error('No biological random draw');};
function camp(){
  const w=medicalCamp(),m:Mechanoid={id:w.nextId++,mechKind:'scyther',x:20,z:20,state:'idle',path:[],heading:0,moveCooldown:0,planCooldown:0};
  w.mechanoids=[m];return {w,m};
}

test('solid wounds and missing members never bleed, hurt, heal, infect or become scars',()=>{
  const r=createMechaMedicalRecord(3000);
  addResolvedInjury(r,'scyther-thorax','gunshot',5000,noDraw);addResolvedInjury(r,'scyther-left-blade','cut',27000,noDraw);
  expect(medicalPain(r)).toBe(0);expect(medicalBleedUnits(r)).toBe(0);expect(r.bloodLoss).toBe(0);
  expect(r.injuries.every(i=>!i.scar&&!i.infection&&i.tended===undefined)).toBe(true);
  expect(tendInjury(r,r.injuries[0]!.id,1000)).toBe(false);expect(tendMissingPart(r,'scyther-left-blade')).toBe(false);
  const before=structuredClone(r);
  advanceMedical(r,100000,{phase:0,posture:'bed',starving:true,hunger:0,rest:0,malnutritionRate:1359000,bedHealPerDay:10,restingBonus:true},noDraw);
  expect(r).toEqual(before);expect(validMechaMedicalRecord(r,103000,false)).toBe(true);
});

test('external incapacity dies with certainty, preserves edge/recovery and adopts exactly the resolver RNG',()=>{
  const {w,m}=camp(),r=createMechaMedicalRecord(w.tick);
  m.motion={from:{x:19,z:20},to:{x:20,z:20},start:w.tick-1,end:w.tick+2};m.moveCooldown=2;m.path=[{x:21,z:20}];m.state='moving';
  // Edge and recovery are exercised separately: a strike never begins during
  // an active edge, while either physical owner can survive incapacitation.
  const edge=structuredClone(m.motion);
  addResolvedInjury(r,'scyther-left-leg','crack',40000,noDraw);addResolvedInjury(r,'scyther-right-leg','crack',40000,noDraw);
  expect(medicalStatus(r)).toBe('downed');const random={rng:0x12345678};
  expect(commitMechanoidImpact(w,m,r,random,w.tick*10)).toBe(true);
  expect(w.rng).toBe(random.rng);expect(m.state).toBe('dead');expect(m.health?.death).toEqual({tick:w.tick,cause:'downed'});
  expect(m.path).toEqual([]);expect(m.motion).toEqual(edge);expect(m.moveCooldown).toBe(2);
  expect(r.death).toBeUndefined();expect(validateMechanoids(w)).toEqual([]);
  const other=camp(),record=createMechaMedicalRecord(other.w.tick);
  addResolvedInjury(record,'scyther-left-leg','crack',40000,noDraw);addResolvedInjury(record,'scyther-right-foot','crack',27000,noDraw);
  other.m.melee={order:{targetId:other.w.pawns[0]!.id,startedDowned:false,jobUntilCore:other.w.tick*10+400},
    strike:{targetId:other.w.pawns[0]!.id,tool:'left-blade-cut',atCore:other.w.tick*10,untilCore:other.w.tick*10+120,outcome:'hit'}};
  const strike=structuredClone(other.m.melee.strike);
  expect(commitMechanoidImpact(other.w,other.m,record,{rng:other.w.rng},other.w.tick*10)).toBe(true);
  expect(other.m.melee).toEqual({order:null,strike});expect(validateMechanoids(other.w)).toEqual([]);
});

test('vital and trauma deaths precede incapacity; nonviolent incapacity does not invent the hostile death roll',()=>{
  for(const part of ['scyther-brain','scyther-reactor'] as const){
    const {w,m}=camp(),r=createMechaMedicalRecord(w.tick);addResolvedInjury(r,part,'crack',100000,noDraw);
    expect(commitMechanoidImpact(w,m,r,{rng:w.rng},w.tick*10)).toBe(true);expect(m.health?.death?.cause).toBe('vital-failure');
  }
  const {w,m}=camp(),r=createMechaMedicalRecord(w.tick);
  addResolvedInjury(r,'scyther-left-leg','crack',40000,noDraw);addResolvedInjury(r,'scyther-right-leg','crack',40000,noDraw);
  expect(commitMechanoidImpact(w,m,r,{rng:w.rng},w.tick*10,{externalViolence:false})).toBe(true);
  expect(m.state).toBe('downed');expect(m.health?.death).toBeUndefined();expect(validateMechanoids(w)).toEqual([]);
  // Trauma sums surviving injuries, not HP removed by amputated members.
  const trauma=createMechaMedicalRecord(w.tick);
  for(const [part,amount] of [['scyther-thorax',52],['scyther-neck',39],['scyther-head',39],['scyther-left-arm',39],['scyther-right-arm',29]] as const)
    addResolvedInjury(trauma,part,'crack',amount*1000,noDraw);
  expect(trauma.death?.cause).toBe('trauma');
});

test('Bullet and Bomb reuse the real mechanical armor and solid layered medical kernel',()=>{
  const r=createMechaMedicalRecord(3000),before=structuredClone(r);
  const bullet=resolveUnarmoredBullet(r,{damage:6,part:'scyther-brain'},()=>.999999);
  expect(bullet.layers.map(l=>[l.part,l.kind,l.severity])).toEqual([['scyther-brain','gunshot',6000],['scyther-head','gunshot',6000]]);
  const bomb=resolveBombImpact(r,{damage:16,part:'scyther-reactor'},()=>.4);
  expect(bomb.fragments).toBe(3);expect(bomb.layers.slice(0,2)).toEqual([{part:'scyther-reactor',kind:'crack',severity:5334},{part:'scyther-thorax',kind:'crack',severity:5334}]);
  expect(r).toEqual(before);
  const blocked=mechanoidProtection('sharp',.1,()=>.1)('scyther-thorax',10);expect(blocked.amount).toBe(0);
  const partialDraws=[.2,.99],partial=mechanoidProtection('sharp',.1,()=>partialDraws.shift()!)('scyther-thorax',10);
  expect(partial).toMatchObject({amount:5,converted:true});expect(partialDraws).toEqual([]);
  const {w,m}=camp(),xp=structuredClone(w.pawns[0]!.skills);
  expect(damageMechanoidWithBullet(w,m,{damage:5,part:'scyther-thorax'},w.tick*10,.4)?.selected).toBe('scyther-thorax');
  expect(m.health?.injuries[0]).toMatchObject({kind:'gunshot',severity:5000});expect(w.pawns[0]!.skills).toEqual(xp);
  const hit=damageMechanoidWithBomb(w,m,w.tick*10,16);expect(hit?.fragments).toBeGreaterThanOrEqual(2);
  expect(m.health?.bloodLoss).toBe(0);expect(validateMechanoids(w)).toEqual([]);
});

test('clinical refusal is atomic for wrong clock/body/biological state and saturated local injury IDs',()=>{
  const {w,m}=camp(),before=JSON.stringify(w),r=createMechaMedicalRecord(w.tick),random={rng:0x98765432};
  expect(commitMechanoidImpact(w,m,r,random,w.tick*10+1)).toBe(false);
  expect(commitMechanoidImpact(w,m,{...r,bloodLoss:1},random,w.tick*10)).toBe(false);
  expect(commitMechanoidImpact(w,m,{...r,body:'hare'},random,w.tick*10)).toBe(false);
  expect(commitMechanoidImpact(w,m,{...r,malnutrition:1},random,w.tick*10)).toBe(false);
  expect(JSON.stringify(w)).toBe(before);expect(random.rng).toBe(0x98765432);
  r.nextInjuryId=Number.MAX_SAFE_INTEGER;const recordBefore=JSON.stringify(r);
  expect(()=>resolveBombImpact(r,{damage:50,part:'scyther-thorax'},()=>.999999)).toThrow(/capacity exhausted/);expect(JSON.stringify(r)).toBe(recordBefore);
});
