import { readFileSync } from 'node:fs';
import { expect,test } from 'vitest';
import { withoutMiningSkill } from './scenarios/legacy-skills.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization';
import { SCHEMA_VERSION,type World } from '../src/sim/types';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import { predationCamp,animal,body } from './helpers/predation-v190-fixture';
import { createMedicalRecord } from '../src/sim/injury-state';
import { BLOOD_UNIT } from '../src/sim/injury-rules';
import { reconcileAnimalHealth } from '../src/sim/wildlife-health';
import { advanceCorpses } from '../src/sim/corpses';
import { projectCorpseConsumption } from '../src/sim/corpse-anatomy';

const oldWorld=()=>JSON.parse(readFileSync('public/test-saves/v189/serre-electrique.json','utf8')) as World;
test('strict177 neutral178 migration keeps the published greenhouse and every historical field',()=>{
  const old=oldWorld(),before=structuredClone(old);expect(old.schemaVersion).toBe(177);
  expect(deserializeWorld(JSON.stringify(old))).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(old).toEqual(before);
  for(const item of ['red-fox-meat','foxfur']){
    const bad=oldWorld();bad.piles.push({id:bad.nextId++,kind:item==='foxfur'?'textile':'food',item:item as World['piles'][number]['item'],quantity:1,owner:{type:'ground',x:8,z:8}});
    expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/177/);
  }
  const bad=oldWorld();bad.foodPolicies[0]!.allowed.push('red-fox-meat');expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/177/);
  const badStorage=oldWorld();badStorage.stockpiles.push({id:badStorage.nextId++,x:8,z:8,filters:{wood:true,food:true},priority:1,capacity:75,items:{foxfur:true}});expect(()=>deserializeWorld(JSON.stringify(badStorage))).toThrow(/177/);
});

test('old biome population target remains herbivorous and no fox or hunt is retroactively generated',()=>{
  const w=withoutMiningSkill(predationCamp().w);w.wildlife!.animals=w.wildlife!.animals.filter(a=>a.species!=='red-fox');
  w.wildlife!.profile='biome-herbivores-v1';
  const p=w.wildlife!.population!;p.targetWeight=p.fullTargetWeight*2.3/12.27;
  w.schemaVersion=177 as World['schemaVersion'];
  for(const policy of w.foodPolicies)policy.allowed=policy.allowed.filter(i=>i!=='red-fox-meat');
  for(const policy of w.apparelPolicies??[])Object.assign(policy,{allowedItems:policy.allowedItems.filter(i=>!i.startsWith('foxfur-')),allowedMaterials:policy.allowedMaterials.filter(m=>m!=='foxfur')});
  const before=structuredClone(w),resumed=deserializeWorld(JSON.stringify(w));expect(resumed).toEqual({...before,schemaVersion:SCHEMA_VERSION});
  const bad=structuredClone(w);bad.wildlife!.animals[0]!.predation={targetId:bad.pawns[0]!.id,startedAtCore:bad.tick*10,firstHit:true};
  expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/177/);
});

function corpseCamp(){
  const {w,preyId}=predationCamp(),prey=animal(w,preyId);
  prey.health={...createMedicalRecord(w.tick),body:prey.species,bloodLoss:BLOOD_UNIT,death:{tick:w.tick,cause:'blood-loss'}};
  reconcileAnimalHealth(w,prey);advanceCorpses(w);expect(validateWorld(w)).toEqual([]);
  return {w,pile:body(w,preyId)!};
}
test('same-tick consumed anatomy is encoded without mutating the accepted checkpoint and corrupt deltas refuse atomically',()=>{
  const {w,pile}=corpseCamp(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,6,true)));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('checkpoint');
  const prior=first.world,before=structuredClone(prior);
  pile.corpse!.consumedParts=projectCorpseConsumption(pile.corpse!,'left-front-paw',w.tick)!.consumedParts;
  const delta=structuredClone(encoder.encode(w,0,6));expect(delta.kind).toBe('delta');
  const accepted=decoder.adopt(delta);expect(accepted.status).toBe('applied');if(accepted.status!=='applied')throw Error('anatomy');expect(accepted.world).toEqual(w);expect(prior).toEqual(before);
  const bad=structuredClone(delta);if(bad.kind!=='delta')throw Error('delta');bad.baseRevision++;bad.revision++;
  bad.piles!.upserted[0]!.corpse!.consumedParts![0]!.atTick=w.tick+1;
  expect(decoder.adopt(bad).status).toBe('resync');expect(accepted.world).toEqual(w);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const future=structuredClone(w);future.schemaVersion=177 as World['schemaVersion'];
  expect(()=>deserializeWorld(JSON.stringify(future))).toThrow(/177/);
});

test('predator intent is a closed shape with a real target, state and clock',()=>{
  const {w,foxId,preyId}=predationCamp(),fox=animal(w,foxId);fox.predation={targetId:preyId,startedAtCore:w.tick*10,firstHit:true};
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  for(const patch of [{targetId:foxId},{targetId:w.nextId+10},{startedAtCore:w.tick*10+1},{firstHit:'yes'},{phase:'fight'}]){
    const bad=structuredClone(w);Object.assign(animal(bad,foxId).predation!,patch);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
});
