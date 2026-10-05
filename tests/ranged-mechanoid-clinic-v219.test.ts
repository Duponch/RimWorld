import { expect,test } from 'vitest';
import { medicalCamp } from './scenarios/health.ts';
import { mechanoidBodyModel } from '../src/sim/mechanoid-anatomy.ts';
import { type MechanoidKind } from '../src/sim/mechanoid-definition.ts';
import { createMechaMedicalRecord,commitMechanoidImpact,mechaAssessment,mechaMass } from '../src/sim/mechanoid-health.ts';
import { addResolvedInjury,addResolvedInjuryBatch,medicalStatus,medicalPain,medicalBleedUnits,partMissing,tendInjury } from '../src/sim/injury-state.ts';
import { advanceMedical } from '../src/sim/injury-evolution.ts';
import { validateMedicalRecord,validateMechanoidMedicalRecord } from '../src/sim/injury-validation.ts';
import { validMechaMedicalRecord,validateMechanoids } from '../src/sim/mechanoid-save.ts';
import { damageMechanoidWithBullet,damageMechanoidWithBomb } from '../src/sim/mechanoid-impact.ts';
import type { BodyPartId } from '../src/sim/body-definition.ts';
import type { Mechanoid } from '../src/sim/mechanoid-state.ts';

const noDraw=()=>{throw Error('Solid mechanical injury must not draw scar, infection or death-on-downed.');};
function camp(kind:MechanoidKind){
  const w=medicalCamp(),m:Mechanoid={id:w.nextId++,mechKind:kind,x:20,z:20,state:'idle',path:[],heading:0,moveCooldown:0,planCooldown:0};
  w.mechanoids=[m];return {w,m};
}

test('the two primary bodies keep their own HP, hierarchy, groups and functional chains after actual amputations',()=>{
  const lancer=mechanoidBodyModel('lancer'),pikeman=mechanoidBodyModel('pikeman');
  expect(lancer.parts).toHaveLength(30);expect(pikeman.parts).toHaveLength(20);
  for(const model of [lancer,pikeman]){
    expect(model.coverage.reduce((n,v)=>n+v,0)).toBeCloseTo(1,12);
    expect(model.parts.every(p=>p.id.startsWith(`${model.kind}-`))).toBe(true);
    expect(model.parts.some(p=>p.id.endsWith('-blade'))).toBe(false);
    expect(new Set(model.parts.map(p=>p.id)).size).toBe(model.parts.length);
  }
  expect(lancer.byId['lancer-thorax'].hp).toBe(29);expect(lancer.byId['lancer-brain'].hp).toBe(8);
  expect(lancer.byId['lancer-left-hand']).toMatchObject({hp:15,parent:'lancer-left-arm'});
  expect(lancer.parts.filter(p=>p.groups.includes('left-hand')).map(p=>p.id)).toEqual([
    'lancer-left-pinky','lancer-left-middle-finger','lancer-left-index-finger','lancer-left-thumb']);
  expect(pikeman.byId['pikeman-thorax'].hp).toBe(34);expect(pikeman.byId['pikeman-brain'].hp).toBe(9);
  expect(pikeman.byId['pikeman-left-front-foot']).toMatchObject({hp:17,parent:'pikeman-left-front-leg',groups:['front-left-leg']});
  for(const kind of ['lancer','pikeman'] as const)expect(mechaAssessment({mechKind:kind})).toMatchObject({movingCapable:true,painShock:false,vitalFailure:false,
    capacities:{consciousness:1,moving:1,manipulation:1,sight:1,hearing:1}});
  const hand=createMechaMedicalRecord(3000,'lancer');addResolvedInjury(hand,'lancer-left-hand','cut',15000,noDraw);
  expect(partMissing(hand,'lancer-left-thumb')).toBe(true);expect(mechaAssessment({mechKind:'lancer',health:hand}).capacities).toMatchObject({moving:1,manipulation:.5});
  expect(mechaMass({mechKind:'lancer',health:hand})).toBeCloseTo(58.266,12);
  const legs=createMechaMedicalRecord(3000,'pikeman');
  addResolvedInjury(legs,'pikeman-left-front-leg','crack',26000,noDraw);
  expect(mechaMass({mechKind:'pikeman',health:legs})).toBeCloseTo(49.2,12);
  expect(mechaAssessment({mechKind:'pikeman',health:legs}).capacities).toMatchObject({moving:.75,manipulation:1});
  addResolvedInjury(legs,'pikeman-right-front-foot','crack',17000,noDraw);
  expect(mechaAssessment({mechKind:'pikeman',health:legs}).capacities.moving).toBe(.5);
  addResolvedInjury(legs,'pikeman-left-rear-foot','crack',17000,noDraw);
  expect(medicalStatus(legs)).toBe('downed');expect(mechaAssessment({mechKind:'pikeman',health:legs}).vitalFailure).toBe(false);
});

test.each(['lancer','pikeman'] as const)('%s external incapacity dies without another draw and preserves its captured edge',kind=>{
  const {w,m}=camp(kind),r=createMechaMedicalRecord(w.tick,kind);
  m.motion={from:{x:19,z:20},to:{x:20,z:20},start:w.tick-1,end:w.tick+2};m.moveCooldown=2;m.path=[{x:21,z:20}];m.state='moving';
  const edge=structuredClone(m.motion),parts:BodyPartId[]=kind==='lancer'?['lancer-left-leg','lancer-right-leg']:
    ['pikeman-left-front-leg','pikeman-right-front-leg','pikeman-left-rear-leg'];
  for(const part of parts)addResolvedInjury(r,part,'crack',mechanoidBodyModel(kind).byId[part].hp*1000,noDraw);
  expect(medicalStatus(r)).toBe('downed');expect(r.death).toBeUndefined();const random={rng:0x12345678};
  expect(commitMechanoidImpact(w,m,r,random,w.tick*10)).toBe(true);
  expect(m.health?.death).toEqual({tick:w.tick,cause:'downed'});expect(m.state).toBe('dead');expect(w.rng).toBe(0x12345678);expect(random.rng).toBe(0x12345678);
  expect(m.motion).toEqual(edge);expect(m.moveCooldown).toBe(2);expect(m.path).toEqual([]);expect(r.death).toBeUndefined();expect(validateMechanoids(w)).toEqual([]);
  const other=camp(kind);expect(commitMechanoidImpact(other.w,other.m,r,{rng:other.w.rng},other.w.tick*10,{externalViolence:false})).toBe(true);
  expect(other.m.state).toBe('downed');expect(other.m.health?.death).toBeUndefined();expect(validateMechanoids(other.w)).toEqual([]);
});

test('trauma thresholds retain the last half-point and do not substitute an early vital or downing result',()=>{
  const cases:readonly [MechanoidKind,readonly [BodyPartId,number][]][]=[
    ['lancer',[['lancer-thorax',28000],['lancer-neck',21000],['lancer-head',21000],['lancer-left-arm',21000],['lancer-right-arm',16999]]],
    ['pikeman',[['pikeman-thorax',33000],['pikeman-neck',25000],['pikeman-head',25000],['pikeman-left-rear-leg',22000],['pikeman-right-rear-leg',22000],['pikeman-smell-sensor',499]]],
  ];
  for(const [kind,hits] of cases){
    const r=createMechaMedicalRecord(3000,kind);addResolvedInjuryBatch(r,hits.map(([part,severity])=>({part,severity,kind:'crack'})),noDraw);
    expect(r.death).toBeUndefined();expect(medicalStatus(r)).toBe('mobile');expect(validateMechanoidMedicalRecord(r,197,kind)).toBeNull();
    addResolvedInjury(r,hits.at(-1)![0],'crack',1,noDraw);
    expect(r.injuries.reduce((sum,i)=>sum+i.severity,0)).toBe(kind==='lancer'?108000:127500);
    expect(r.death).toEqual({tick:3000,cause:'trauma'});expect(validateMechanoidMedicalRecord(r,197,kind)).toBeNull();
  }
});

test.each(['lancer','pikeman'] as const)('%s never advances biological time and rejects cross-body or biological records atomically',kind=>{
  const {w,m}=camp(kind),r=createMechaMedicalRecord(w.tick,kind);
  addResolvedInjury(r,`${kind}-thorax`,'gunshot',1000,noDraw);const before=structuredClone(r);
  expect(medicalPain(r)).toBe(0);expect(medicalBleedUnits(r)).toBe(0);expect(tendInjury(r,r.injuries[0]!.id,1000)).toBe(false);
  advanceMedical(r,100000,{phase:0,posture:'bed',starving:true,hunger:0,rest:0,malnutritionRate:1359000,bedHealPerDay:10,restingBonus:true},noDraw);
  expect(r).toEqual(before);expect(validMechaMedicalRecord(r,w.tick+100000,false,kind,197)).toBe(true);
  expect(validateMedicalRecord(r,true,true,true,true,false,false,true,true,true,true,true,197,true)).not.toBeNull();
  expect(validateMechanoidMedicalRecord(r,196,kind)).not.toBeNull();expect(validateMechanoidMedicalRecord(r,197,kind==='lancer'?'pikeman':'lancer')).not.toBeNull();
  const worldBefore=JSON.stringify(w),random={rng:0x98765432};
  for(const bad of [{...r,body:'scyther' as const},{...r,bloodLoss:1},{...r,malnutrition:1},{...r,tick:w.tick+1}])
    expect(commitMechanoidImpact(w,m,bad,random,w.tick*10)).toBe(false);
  expect(JSON.stringify(w)).toBe(worldBefore);expect(random.rng).toBe(0x98765432);
});

test.each(['lancer','pikeman'] as const)('%s Bullet and fragmented Bomb retain the real body and never create a skill owner',kind=>{
  const {w,m}=camp(kind),xp=w.pawns.map(p=>structuredClone(p.skills));
  const bullet=damageMechanoidWithBullet(w,m,{damage:1,part:`${kind}-thorax`},w.tick*10,1);
  expect(bullet?.selected).toBe(`${kind}-thorax`);expect(m.health?.injuries[0]).toMatchObject({part:`${kind}-thorax`,kind:'gunshot',severity:1000});
  const bomb=damageMechanoidWithBomb(w,m,w.tick*10,16);expect(bomb?.fragments).toBeGreaterThanOrEqual(2);
  expect(m.health?.body).toBe(kind);expect(m.health?.bloodLoss).toBe(0);expect(w.pawns.map(p=>p.skills)).toEqual(xp);expect(validateMechanoids(w)).toEqual([]);
});
