import { expect,test } from 'vitest';
import { medicalCamp } from './scenarios/health.ts';
import { createMechaMedicalRecord,commitMechanoidImpact } from '../src/sim/mechanoid-health.ts';
import { addResolvedInjury } from '../src/sim/injury-state.ts';
import { validateMedicalRecord,validateScytherMedicalRecord } from '../src/sim/injury-validation.ts';
import { validMechaMedicalRecord,validMechanoidShape,validateMechanoids } from '../src/sim/mechanoid-save.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { stepWorld } from '../src/sim/engine.ts';
import type { Mechanoid } from '../src/sim/mechanoid-state.ts';

function camp(){
  const w=medicalCamp(),m:Mechanoid={id:w.nextId++,mechKind:'scyther',x:20,z:20,state:'idle',path:[],heading:0,moveCooldown:0,planCooldown:0};
  w.mechanoids=[m];return {w,m};
}
const noDraw=()=>{throw new Error('No biological roll');};

test('the future clinical body stays strict and cannot be adopted by old/human/animal record owners',()=>{
  const r=createMechaMedicalRecord(3000);addResolvedInjury(r,'scyther-thorax','gunshot',5000,noDraw);
  expect(validateScytherMedicalRecord(r,194)).toBeNull();expect(validateScytherMedicalRecord(r,193)).not.toBeNull();
  expect(validateMedicalRecord(r,true,true,true,true,false,false,true,true,true,true,true,194,true)).not.toBeNull();
  expect(validateMedicalRecord(r,true,true,false,false,true,true,true,true,true,true,true,194)).not.toBeNull();
  for(const forged of [{...r,bloodLoss:1},{...r,heatstroke:1},{...r,anesthetic:{sinceCore:30000,endCore:31000}},
    {...r,body:'human'}, {...r,injuries:[{...r.injuries[0]!,part:'torso'}]},
    {...r,injuries:[{...r.injuries[0]!,tended:1000}]},{...r,injuries:[{...r.injuries[0]!,scar:{threshold:1000}}]}])
    expect(validMechaMedicalRecord(forged,3000,false)).toBe(false);
  expect(validMechaMedicalRecord(r,2999,false)).toBe(false);expect(validMechaMedicalRecord(r,10000,false)).toBe(true);
  const dead=createMechaMedicalRecord(3000);addResolvedInjury(dead,'scyther-reactor','crack',27000,noDraw);
  expect(validMechaMedicalRecord(dead,3000,true)).toBe(true);expect(validMechaMedicalRecord(dead,3000,false)).toBe(false);
  expect(validMechaMedicalRecord({...dead,death:{tick:3001,cause:'vital-failure'}},3001,true)).toBe(false);
});

test('mechanical identity and clocks remain global while local injury identities remain clinical',()=>{
  const {w,m}=camp(),r=createMechaMedicalRecord(w.tick);addResolvedInjury(r,'scyther-thorax','gunshot',5000,noDraw);
  expect(commitMechanoidImpact(w,m,r,{rng:w.rng},w.tick*10)).toBe(true);
  expect(validMechanoidShape(m,194,w.tick)).toBe(true);expect(validMechanoidShape(m,193,w.tick)).toBe(false);
  const ids=new Set(w.pawns.map(p=>p.id));expect(validateMechanoids(w,194,ids)).toEqual([]);expect(ids.has(m.id)).toBe(true);
  const bad=structuredClone(w);bad.mechanoids![0]!.id=bad.pawns[0]!.id;
  expect(validateMechanoids(bad,194,new Set(bad.pawns.map(p=>p.id)))).toContain('Invalid mechanoid identity.');
  const future=structuredClone(w);future.mechanoids![0]!.health!.tick=w.tick+1;
  expect(validateMechanoids(future)).toContain('Invalid mechanoid shape.');
  const bio=structuredClone(w);Object.assign(bio.mechanoids![0],{hunger:100});
  expect(validateMechanoids(bio)).toContain('Invalid mechanoid shape.');
  // Local injury 1 is legal although a World owner already has global ID 1.
  expect(m.health!.injuries[0]!.id).toBe(1);expect(validateMechanoids(w,194,new Set(w.pawns.map(p=>p.id)))).toEqual([]);
});

test('World save/replay keeps a sparse living medical clock without creating physiology or new records',()=>{
  const {w,m}=camp(),r=createMechaMedicalRecord(w.tick);addResolvedInjury(r,'scyther-thorax','gunshot',5000,noDraw);
  expect(commitMechanoidImpact(w,m,r,{rng:w.rng},w.tick*10)).toBe(true);expect(validateWorld(w)).toEqual([]);
  const frozen=structuredClone(m.health),twin=deserializeWorld(serializeWorld(w));
  stepWorld(w,40);stepWorld(twin,40);
  expect(w.mechanoids![0]!.health).toEqual(frozen);expect(twin).toEqual(w);expect(validateWorld(w)).toEqual([]);
  const healthy=camp();stepWorld(healthy.w,40);expect(healthy.m.health).toBeUndefined();
});
