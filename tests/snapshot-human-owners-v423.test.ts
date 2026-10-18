import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotValidationContext} from '../src/bridge/snapshots.ts';
import {captureHumanOwners,type HumanOwnershipCapture} from '../src/sim/human-owners.ts';
import {validateRelationshipWorld,validateRelationshipWorldForSnapshot} from '../src/sim/relationship-world-save.ts';
import {validDeathThoughtsTransport,validDeathThoughtsTransportForSnapshot} from '../src/sim/death-thoughts-save.ts';
import {validArtificialPartsWorldTransport,validArtificialPartsWorldTransportForSnapshot} from '../src/sim/health-save.ts';
import {validCobraClinicalWorld256,validCobraClinicalWorldForSnapshot256} from '../src/sim/toxic-buildup-save-256.ts';
import {validCryptosleepSicknessWorldTransport256,validCryptosleepSicknessWorldTransportForSnapshot256} from '../src/sim/cryptosleep-sickness-save-256.ts';
import {cobraAdmissionReason256,cobraAdmissionReasonForSnapshot256} from '../src/sim/cobra-admission-256.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {addCryptosleepSickness256} from '../src/sim/cryptosleep-sickness-256.ts';
import {generateWorld} from '../src/sim/generation.ts';
import {startingPawn} from '../src/sim/starting-pawns.ts';
import {enableWildlife} from '../src/sim/wildlife.ts';
import {constructInitialWildAnimal256} from '../src/sim/initial-animal-constructor-256.ts';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import type {World} from '../src/sim/types.ts';
import {medicalCamp} from './scenarios/health.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {preparedSchema256} from './helpers/legacy-fixture-guards.ts';

// Prepared real Worlds/actors. ROOT alone executes these domain and Decoder cases.
test('snapshot relationship reads keep both historical frontiers while a local reader captures only once',()=>{
  const w=medicalCamp(2),[a,b]=w.pawns;
  w.relationships={links:[{kind:'sibling',aId:a!.id,bId:b!.id,recordedAt:w.tick}]};
  let reads=0,captures=0,owners:HumanOwnershipCapture|undefined;
  const read=()=>{reads++;if(!owners){captures++;owners=captureHumanOwners(w);}return owners;};
  const before=structuredClone(w);
  expect(validateRelationshipWorldForSnapshot(w,w.schemaVersion,read)).toEqual([]);
  expect(reads).toBe(2);expect(captures).toBe(1);
  expect(validCobraClinicalWorldForSnapshot256(w,w.schemaVersion,read)).toBe(true);
  expect(validCryptosleepSicknessWorldTransportForSnapshot256(w,w.schemaVersion,read)).toBe(true);
  expect(captures).toBe(1);expect(w).toEqual(before);
  // The second historical read still has its own catch/refusal, even if the first succeeded.
  let second=0;const failSecond=()=>{if(++second===2)throw Error('late namespace refusal');return captureHumanOwners(w);};
  expect(validateRelationshipWorldForSnapshot(w,w.schemaVersion,failSecond)).toEqual(['Invalid human relationship namespace.']);
  expect(second).toBe(2);expect(w).toEqual(before);
});

test('absence guards avoid capture, while present undefined/future fields still reach their historical refusal',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;delete p.deathThoughts;delete p.health;
  let reads=0;const refused=():HumanOwnershipCapture=>{reads++;throw Error('owner refusal');};
  expect(validDeathThoughtsTransportForSnapshot(w,w.schemaVersion,refused)).toBe(true);
  expect(validArtificialPartsWorldTransportForSnapshot(w,w.schemaVersion,refused)).toBe(true);expect(reads).toBe(0);
  p.deathThoughts=undefined;
  expect(validDeathThoughtsTransportForSnapshot(w,w.schemaVersion,refused)).toBe(false);expect(reads).toBe(1);
  p.health=createMedicalRecord(w.tick);p.health.artificialParts=undefined;
  expect(validArtificialPartsWorldTransportForSnapshot(w,w.schemaVersion,refused)).toBe(false);expect(reads).toBe(2);
});

test('public mutable guards recapture after an identity mutation and ignore a forged extra reader',()=>{
  const w=medicalCamp(2),p=w.pawns[0]!;
  w.relationships={links:[]};p.deathThoughts=undefined;p.health=createMedicalRecord(w.tick);p.health.artificialParts=undefined;
  // Presence forces the death/anatomy owner path; the duplicate is a real repeated original.
  w.pawns.push(p);const before=structuredClone(w);let forgedReads=0;
  const forged=()=>{forgedReads++;throw Error('public API must not use caller reader');};
  type Extra=(world:World,version:number,extra:()=>never)=>unknown;
  expect((validateRelationshipWorld as Extra)(w,w.schemaVersion,forged)).toEqual(['Invalid human relationship namespace.']);
  for(const validate of [validDeathThoughtsTransport,validArtificialPartsWorldTransport,validCobraClinicalWorld256,validCryptosleepSicknessWorldTransport256])
    expect((validate as Extra)(w,w.schemaVersion,forged)).toBe(false);
  expect(forgedReads).toBe(0);expect(w).toEqual(before);
  w.pawns.pop();delete p.deathThoughts;delete p.health.artificialParts;
  expect(validateRelationshipWorld(w,w.schemaVersion)).toEqual([]);
  expect(validCobraClinicalWorld256(w)).toBe(true);expect(validCryptosleepSicknessWorldTransport256(w)).toBe(true);
});

test('shared clinical capture keeps the actual owner clock and refuses future cryptosleep without mutation',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;p.health=createMedicalRecord(w.tick);
  addCryptosleepSickness256(p.health,{integer:()=>8001,integerValue:()=>-17},w.schemaVersion);
  const owners=captureHumanOwners(w),before=structuredClone(w);
  expect(validCryptosleepSicknessWorldTransportForSnapshot256(w,w.schemaVersion,()=>owners)).toBe(true);
  expect(validCryptosleepSicknessWorldTransport256(w)).toBe(true);expect(w).toEqual(before);
  p.health.tick=w.tick+1;const future=structuredClone(w);
  expect(validCryptosleepSicknessWorldTransportForSnapshot256(w,w.schemaVersion,()=>owners)).toBe(false);
  expect(validCryptosleepSicknessWorldTransport256(w)).toBe(false);expect(w).toEqual(future);
});

test('public captures reject an ordinary structure with a casket accessor without invoking it',()=>{
  const w=medicalCamp(),b=fixtureBuilding(w,'wall',5,5);let getterReads=0;
  Object.defineProperty(b,'casket',{enumerable:true,get(){getterReads++;throw Error('untrusted holder getter');}});
  expect(validateRelationshipWorld(w,w.schemaVersion)).toEqual(['Invalid human relationship namespace.']);
  expect(validCobraClinicalWorld256(w)).toBe(false);expect(validCryptosleepSicknessWorldTransport256(w)).toBe(false);
  expect(getterReads).toBe(0);expect(w.structures[0]).toBe(b);
});

test('a real Cobra relays the same reader into cohort admission and still refuses missing historical mind',()=>{
  const w=generateWorld(82011,32,32,'temperate-crashlanded-v1');preparedSchema256(w);w.tick=100;w.deterioration!.lastTick=w.tick;
  const p=startingPawn(w.nextId++,'Original préparé',12,12,0,55,w.seed,w.tick,256);delete p.health;w.pawns.push(p);enableWildlife(w,0);
  const built=constructInitialWildAnimal256({fact:INITIAL_ANIMAL_FACTS_256.Cobra,id:w.nextId++,cell:{x:11,z:12},tick:w.tick,random:new WorldGenerationRandom(19),unspawnedAnimals:[]});
  expect(built.status).toBe('ready');if(built.status!=='ready')throw Error(JSON.stringify(built));w.wildlife!.animals.push(built.animal);
  let reads=0,captures=0,owners:HumanOwnershipCapture|undefined;
  const read=()=>{reads++;if(!owners){captures++;owners=captureHumanOwners(w);}return owners;};
  const before=structuredClone(w);
  expect(validCobraClinicalWorldForSnapshot256(w,256,read)).toBe(true);
  expect(reads).toBe(2);expect(captures).toBe(1);expect(cobraAdmissionReasonForSnapshot256(w,read)).toBeUndefined();
  expect(w).toEqual(before);
  const old=startingPawn(w.nextId++,'Historique',13,12,1,55,w.seed,w.tick);w.pawns.push(old);
  const rejected=structuredClone(w);
  expect(cobraAdmissionReason256(w)).toContain('Historical human');
  expect(validCobraClinicalWorldForSnapshot256(w,256,()=>captureHumanOwners(w))).toBe(false);
  expect(w).toEqual(rejected);
});

test('real Decoder scopes expire after a late graph refusal; retry and next same-tick adoption recapture',()=>{
  const scopes:{reads:number;captures:number}[]=[];
  class ScopedDecoder extends SnapshotDecoder {
    protected override createValidationContext(next:World):SnapshotValidationContext {
      const base=super.createValidationContext(next),scope={reads:0,captures:0};scopes.push(scope);
      let owners:HumanOwnershipCapture|undefined;
      return {...base,humanOwners:{read(world){scope.reads++;if(world!==next)return captureHumanOwners(world);
        if(!owners){scope.captures++;owners=captureHumanOwners(next);}return owners;}}};
    }
  }
  const w=medicalCamp(2);w.relationships={links:[]};const encoder=new SnapshotEncoder(),decoder=new ScopedDecoder(),publicDecoder=new SnapshotDecoder();
  const checkpoint=structuredClone(encoder.encode(w,0,1)),first=decoder.adopt(checkpoint);
  expect(first).toEqual(publicDecoder.adopt(structuredClone(checkpoint)));expect(first.status).toBe('applied');
  if(first.status!=='applied')throw Error('checkpoint refused');const original=structuredClone(first.world);
  const packet=structuredClone(encoder.encode(w,0,1));expect(packet.kind).toBe('delta');
  const bad=structuredClone(packet);
  bad.world.relationships={links:[{kind:'sibling',aId:w.pawns[0]!.id,bId:w.pawns[0]!.id,recordedAt:w.tick}]};
  const refused=decoder.adopt(bad);expect(refused).toEqual(publicDecoder.adopt(structuredClone(bad)));expect(refused.status).toBe('resync');
  expect(first.world).toEqual(original);
  const retry=decoder.adopt(packet);expect(retry).toEqual(publicDecoder.adopt(structuredClone(packet)));expect(retry.status).toBe('applied');
  if(retry.status!=='applied')throw Error('retry refused');
  w.pawns[0]!.hunger-=1; // An actual changed DTO at the SAME confirmed tick.
  const sameTick=structuredClone(encoder.encode(w,0,1));expect(sameTick.kind).toBe('delta');
  const changed=decoder.adopt(sameTick);expect(changed).toEqual(publicDecoder.adopt(structuredClone(sameTick)));
  expect(changed.status).toBe('applied');if(changed.status!=='applied')throw Error('same tick refused');
  expect(changed.world.tick).toBe(first.world.tick);expect(changed.world.pawns[0]!.hunger).toBe(w.pawns[0]!.hunger);
  const full=structuredClone(encoder.encode(w,0,1,true));expect(full.kind).toBe('checkpoint');
  const refreshed=decoder.adopt(full);expect(refreshed).toEqual(publicDecoder.adopt(structuredClone(full)));expect(refreshed.status).toBe('applied');
  // A real source replacement creates a new epoch and remaps the pawn order.
  const replacement=structuredClone(w);replacement.pawns.reverse();const remap=structuredClone(encoder.encode(replacement,0,1));
  expect(remap.kind).toBe('checkpoint');expect(remap.epoch).toBeGreaterThan(full.epoch);
  const replaced=decoder.adopt(remap);expect(replaced).toEqual(publicDecoder.adopt(structuredClone(remap)));expect(replaced.status).toBe('applied');
  expect(first.world).toEqual(original);
  expect(scopes).toHaveLength(6);
  for(const scope of scopes){expect(scope.captures).toBe(1);expect(scope.reads).toBeGreaterThanOrEqual(2);}
  if(replaced.status!=='applied')throw Error('replacement refused');const confirmed=structuredClone(replaced.world);
  for(const fault of ['owner','clinical'] as const){
    const good=structuredClone(encoder.encode(replacement,0,1)),invalid=structuredClone(good);
    if(fault==='owner')invalid.world.pawns.push(invalid.world.pawns[0]!);
    else{
      const p=invalid.world.pawns[0]!;p.health=createMedicalRecord(invalid.world.tick+1);
      addCryptosleepSickness256(p.health,{integer:()=>8001,integerValue:()=>-17},invalid.world.schemaVersion);
    }
    const rejected=decoder.adopt(invalid);expect(rejected).toEqual(publicDecoder.adopt(structuredClone(invalid)));expect(rejected.status).toBe('resync');
    expect(replaced.world).toEqual(confirmed);
    const fresh=decoder.adopt(good);expect(fresh).toEqual(publicDecoder.adopt(structuredClone(good)));expect(fresh.status).toBe('applied');
    expect(scopes.at(-1)!.captures).toBe(1);expect(replaced.world).toEqual(confirmed);
  }
});
