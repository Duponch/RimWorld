import { expect,test } from 'vitest';
import { withoutMiningSkill, withoutTelevisionRecreation, withMigratedTelevisionRecreation } from './scenarios/legacy-skills.ts';
import { stepWorld } from '../src/sim/engine.ts';
import { ensureFireState } from '../src/sim/fire-rules.ts';
import { applyPlantFrost } from '../src/sim/plant-life.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { damageResource } from '../src/sim/thing-damage.ts';
import { SCHEMA_VERSION,type Resource,type World } from '../src/sim/types.ts';
import { climaticHealrootCamp,cultivatedHealroot,healrootCamp } from './helpers/healroot-domestic-v195.ts';

test('strict181 migrates by number alone without inventing a plant, dose, profile, exposure or draw',()=>{
  const old=withoutTelevisionRecreation(withoutMiningSkill(healrootCamp()));ensureFireState(old);
  (old as {schemaVersion:number}).schemaVersion=(withoutTelevisionRecreation(old),181);
  const before=structuredClone(old),encoded=JSON.stringify(old);
  expect(deserializeWorld(encoded)).toEqual(withMigratedTelevisionRecreation({...before,schemaVersion:SCHEMA_VERSION}));
  expect(old).toEqual(before);expect(JSON.stringify(old)).toBe(encoded);
  const invalid=structuredClone(old);invalid.rng=0;
  expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow(/Invalid version 181 save/);
});

test('181 refuses cultivated identities in resources, zones and historical fire losses before migration',()=>{
  const old=withoutTelevisionRecreation(withoutMiningSkill(healrootCamp()));ensureFireState(old);(old as {schemaVersion:number}).schemaVersion=(withoutTelevisionRecreation(old),181);
  const mutations:Array<(w:World)=>void>=[
    w=>{cultivatedHealroot(w,.3);},
    w=>{const p=cultivatedHealroot(w);delete p.growth;delete p.growthTick;},
    w=>{w.growingZones.push({id:w.nextId++,plant:'healroot',allowSow:true,allowCut:true,cells:[4*w.width+5]});},
    w=>{w.fires!.ledger.resources.healroot=1;},
    w=>{w.fires!.ledger.resources.healroot=0;},
  ];
  for(const mutate of mutations){
    const bad=structuredClone(old);mutate(bad);const retained=JSON.stringify(bad);
    expect(()=>deserializeWorld(retained)).toThrow(/Invalid version 181 save/);
    expect(JSON.stringify(bad)).toBe(retained);
  }
});

test('a prepared born cultivated root keeps its leafless condition and exact continuation through real ticks',()=>{
  // Maturity is prepared; this test proves state continuation, not elapsed sowing.
  const w=climaticHealrootCamp(),plant=cultivatedHealroot(w,.3);
  for(const p of w.pawns){p.priorities.grow=0;p.priorities.gather=0;}
  stepWorld(w,plant.plantLife!.nextCheck-w.tick);
  expect(applyPlantFrost(w,plant,true,-30)).toBe(false);
  expect(plant.plantLife!.leaflessAt).toBe(w.tick);
  expect(damageResource(w,plant,59,'darkness')).toBe(true);
  expect(validateWorld(w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w)),before=structuredClone(w);
  expect(resumed).toEqual(before);expect(resumed.resources[0]!.plantLife!.bornAt).toBe(3000);
  stepWorld(w,23);stepWorld(resumed,23);
  expect(resumed).toEqual(w);expect(validateWorld(w)).toEqual([]);
  expect(w.resources[0]!.damage).toBe(59);expect(w.resources[0]!.amount).toBe(1);
  expect(w.resources[0]!.plantLife!.leaflessAt).toBe(before.resources[0]!.plantLife!.leaflessAt);
});

test('current cultivated identity rejects impossible amount, HP and vital checkpoints atomically',()=>{
  const w=climaticHealrootCamp();cultivatedHealroot(w,.3);const retained=structuredClone(w);
  const changes:Array<(p:Resource)=>void>=[
    p=>{p.amount=0;},p=>{p.amount=2;},p=>{p.damage=0;},p=>{p.damage=60;},p=>{p.damage=59.5;},
    p=>{p.growth=1.01;},p=>{p.growthTick=w.tick+1;},p=>{delete p.growthTick;},
    p=>{delete p.plantLife;},p=>{p.plantLife!.bornAt=w.tick+1;},
    p=>{p.plantLife!.nextCheck++;},p=>{p.plantLife!.leaflessAt=w.tick+1;},
    p=>{p.species='healroot-wild';},
  ];
  for(const mutate of changes){
    const bad=structuredClone(w);mutate(bad.resources[0]!);
    expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();expect(w).toEqual(retained);
  }
  expect(deserializeWorld(serializeWorld(w))).toEqual(retained);
});

test('the sixtieth physical HP removes one cultivated plant and preserves its fire loss without creating medicine',()=>{
  const w=healrootCamp(),plant=cultivatedHealroot(w);const id=plant.id,rng=w.rng,nextId=w.nextId;
  expect(damageResource(w,plant,59)).toBe(true);expect(w.resources).toContain(plant);
  expect(damageResource(w,plant,1)).toBe(true);expect(w.resources.some(p=>p.id===id)).toBe(false);
  expect(w.fires!.ledger.resources.healroot).toBe(1);expect(w.piles).toEqual([]);
  expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  for(const count of [0,-1,.5,Number.MAX_SAFE_INTEGER+1]){
    const bad=structuredClone(w);bad.fires!.ledger.resources.healroot=count;
    expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
});
