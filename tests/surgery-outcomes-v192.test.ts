import { expect,test } from 'vitest';
import { BODY_PARTS } from '../src/sim/body-definition.ts';
import { createMedicalRecord,remainingPartHealth } from '../src/sim/injury-state.ts';
import { validateMedicalRecord } from '../src/sim/injury-validation.ts';
import { applySurgeryDamage } from '../src/sim/surgery-damage.ts';
import { resolveSurgeryOutcome,surgeryPartProtected,surgeryMinimumProtectedHealth,surgeryDamageCandidates,surgeryProtectedDamage } from '../src/sim/surgery-outcomes.ts';

test('vital protection includes paired organs and every containing ancestor, with minimum current ancestor HP',()=>{
  const r=createMedicalRecord(100);
  for(const id of ['left-lung','right-lung','left-kidney','right-kidney','heart','stomach','liver','brain','neck','head','skull','torso'] as const)expect(surgeryPartProtected(id),id).toBe(true);
  expect(surgeryPartProtected('left-arm')).toBe(false);
  r.injuries=[{id:1,part:'torso',kind:'cut',severity:38000,bornAt:100}];r.nextInjuryId=2;
  expect(surgeryMinimumProtectedHealth(r,'left-arm')).toBe(2);
  expect(surgeryProtectedDamage(r,'left-arm',25)).toBe(1);
  r.injuries[0]!.severity=39000;
  expect(surgeryDamageCandidates(r,'left-arm')).toEqual([]);
});
test('brain candidate and pre-worker damage protect half health, including an already injured brain',()=>{
  const r=createMedicalRecord(),half=BODY_PARTS.brain.hp/2;
  expect(surgeryDamageCandidates(r,'left-arm',true)).toContain('brain');
  expect(surgeryProtectedDamage(r,'brain',100)).toBe(half);
  r.injuries=[{id:1,part:'brain',kind:'cut',severity:4000,bornAt:0}];r.nextInjuryId=2;
  expect(surgeryDamageCandidates(r,'left-arm',true)).toContain('brain');expect(surgeryProtectedDamage(r,'brain',100)).toBe(1);
  r.injuries[0]!.severity=5000;expect(surgeryDamageCandidates(r,'left-arm',true)).not.toContain('brain');
});
test('explicit inside targets use their own Cut/Scratch/Stab/Crush workers, not forced melee selection',()=>{
  const cases=[['cut',[1000,2000]],['scratch',[1500,1500]],['stab',[1200,2250]],['crush',[3000,3000]]] as const;
  for(const [kind,amounts] of cases){
    const r=createMedicalRecord(100),hit=applySurgeryDamage(r,'left-lung',3,kind,()=>.99);
    expect(hit.layers.map(l=>l.part)).toEqual(['left-lung','torso']);expect(hit.layers.map(l=>l.severity)).toEqual(amounts);
    expect(hit.layers[0]!.kind).toBe(kind==='scratch'?'cut':kind);expect(hit.layers[1]!.kind).toBe(kind==='crush'?'cut':kind==='scratch'?'cut':kind);
    expect(validateMedicalRecord(r)).toBeNull();
  }
});
test('Crush duplicates through interior ancestry with solid mapping and no Blunt stun or random inner hit',()=>{
  const r=createMedicalRecord(100),hit=applySurgeryDamage(r,'left-humerus',2,'crush',()=>.99);
  expect(hit.layers).toEqual([{part:'left-humerus',severity:2000,kind:'crack'},{part:'left-arm',severity:2000,kind:'cut'}]);
  expect(remainingPartHealth(r,'left-humerus')).toBe(23000);expect(validateMedicalRecord(r)).toBeNull();
});
test('success is one result ticket and leaves anatomical commit to the caller without mutating the original',()=>{
  const r=createMedicalRecord(100),before=structuredClone(r);let draws=0;
  const result=resolveSurgeryOutcome(r,'left-arm',.98,()=>{draws++;return .1;});
  expect(result.kind).toBe('success');expect(result.hits).toEqual([]);expect(result.record).toEqual(before);expect(result.record).not.toBe(r);
  expect(r).toEqual(before);expect(draws).toBe(1);
});
test('conditional failure categories, chosen-damage budget and clinical continuation are deterministic on a copy',()=>{
  const r=createMedicalRecord(100),before=structuredClone(r);
  for(const [kind,initial] of [['catastrophic',[.99,.44]],['ridiculous',[.99,.9,.01]],['minor',[.99,.9,.99]]] as const){
    const a=[...initial] as number[],b=[...initial] as number[];
    const first=resolveSurgeryOutcome(r,'left-arm',0,()=>a.shift()??.99),second=resolveSurgeryOutcome(r,'left-arm',0,()=>b.shift()??.99);
    expect(first.kind).toBe(kind);expect(first).toEqual(second);expect(first.hits.length).toBeGreaterThan(0);
    expect(first.hits.reduce((n,h)=>n+h.damage,0)).toBeGreaterThanOrEqual(kind==='minor'?20:65);
    expect(validateMedicalRecord(first.record)).toBeNull();expect(r).toEqual(before);
  }
});
test('no accessible candidate terminates without damage; invalid/dead outcome refuses before RNG',()=>{
  const r=createMedicalRecord(100);r.injuries=[{id:1,part:'torso',kind:'cut',severity:39000,bornAt:100}];r.nextInjuryId=2;
  const result=resolveSurgeryOutcome(r,'left-arm',0,()=>.99);expect(result.hits).toEqual([]);expect(result.record).toEqual(r);
  const fail=()=>{throw new Error('No random draw allowed');};
  expect(()=>resolveSurgeryOutcome(r,'left-arm',NaN,fail)).toThrow('Invalid surgery outcome');
  r.death={tick:100,cause:'trauma'};expect(()=>resolveSurgeryOutcome(r,'left-arm',.5,fail)).toThrow('Invalid surgery outcome');
});

test('last selected hit can exceed the remaining budget; lethality already present cannot be cured by success',()=>{
  const r=createMedicalRecord(100),ticket=[.99,.99,.99,0,.99,0];
  const result=resolveSurgeryOutcome(r,'left-arm',0,()=>ticket.shift()??.99);
  expect(result.kind).toBe('minor');expect(result.hits).toHaveLength(1);expect(result.hits[0]!.damage).toBe(30);
  const lethal=createMedicalRecord(100);lethal.bloodLoss=300000000;const before=structuredClone(lethal);
  expect(()=>resolveSurgeryOutcome(lethal,'left-arm',.98,()=>{throw new Error('No ticket');})).toThrow('Invalid surgery outcome');expect(lethal).toEqual(before);
});
