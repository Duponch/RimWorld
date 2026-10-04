import { expect,test } from 'vitest';
import { createWorld,deserializeWorld,serializeWorld,validateWorld,stepWorld,SCHEMA_VERSION } from '../src/sim/index.ts';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots.ts';
import { TileSnapshotCache } from '../src/bridge/tile-snapshot-cache.ts';
import { miningSkill } from '../src/sim/mining-skills.ts';
import { withoutMiningSkill, withoutTelevisionRecreation, withMigratedTelevisionRecreation } from './scenarios/legacy-skills.ts';
import { visitorTradeFixture } from './scenarios/visitors.ts';
import { medicalCamp } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { resolveSelectedPodRescue } from '../src/sim/pod-rescue.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { visitorAtEdge } from '../src/sim/visitor-navigation.ts';
import type { Pawn,World } from '../src/sim/types.ts';

test('185 is strictly validated before a neutral migration: damaged ore and captured stroke remain untouched',()=>{
  const old=withoutTelevisionRecreation(withoutMiningSkill(createWorld(42,32,32)));
  Object.assign(old,{schemaVersion:185});
  old.tiles[0]={terrain:'rock',ore:'steel',miningDamage:1440};
  const encoded=JSON.stringify(old),migrated=deserializeWorld(encoded);
  expect(migrated).toEqual(withMigratedTelevisionRecreation({...old,schemaVersion:SCHEMA_VERSION}));
  expect(JSON.stringify(old)).toBe(encoded);
  expect(migrated.tiles[0]!.miningYield).toBeUndefined();
  expect(migrated.pawns.every(p=>p.skills.mining===undefined)).toBe(true);
  expect(miningSkill(migrated.pawns[0]!)).toEqual({level:8,xp:0,dailyXp:0,passion:0});
  expect(validateWorld(migrated)).toEqual([]);
  for(const corrupt of [
    (w:any)=>{w.pawns[0].skills.mining={level:8,xp:0,dailyXp:0,passion:0};},
    (w:any)=>{w.tiles[0].miningYield=.96;},
    (w:any)=>{w.tiles[0].miningDamage=1520;},
  ]){
    const w=structuredClone(old);corrupt(w);
    expect(()=>deserializeWorld(JSON.stringify(w))).toThrow(/Invalid version 185 save/);
  }
});

test('current Mining profiles and weighted ore contributions reject corruption without losing accepted packets',()=>{
  const world=createWorld(42,32,32);world.tiles[0]={terrain:'rock',ore:'steel',miningDamage:80,miningYield:.032};
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  expect(decoder.adopt(structuredClone(encoder.encode(world,0,1))).status).toBe('applied');
  const accepted=structuredClone(world);
  for(const corrupt of [
    (w:any)=>{w.pawns[0].skills.mining.level=21;},
    (w:any)=>{w.pawns[0].skills.mining.xp=-1000000;},
    (w:any)=>{w.pawns[0].skills.mining.future=true;},
    (w:any)=>{w.tiles[0].miningYield=.2;},
    (w:any)=>{w.tiles[0].miningYield=-.01;},
    (w:any)=>{w.tiles[0].miningYield=Infinity;},
    (w:any)=>{delete w.tiles[0].ore;},
    (w:any)=>{delete w.tiles[0].miningDamage;},
  ]){
    const w=structuredClone(accepted);corrupt(w);
    expect(validateWorld(w).length).toBeGreaterThan(0);
    const ownEncoder=new SnapshotEncoder(),ownDecoder=new SnapshotDecoder();
    expect(ownDecoder.adopt(structuredClone(ownEncoder.encode(accepted,0,1))).status).toBe('applied');
    const packet=structuredClone(ownEncoder.encode(w,0,1));
    expect(ownDecoder.adopt(packet).status).toBe('resync');
    const freshEncoder=new SnapshotEncoder();freshEncoder.encode(accepted,0,1);
    const repaired=structuredClone(freshEncoder.encode(accepted,0,1));
    expect(ownDecoder.adopt(repaired).status).toBe('applied');
  }
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
});

test('ore yield changes at the same tick are copied, encoded and removed independently of earlier snapshots',()=>{
  const w=createWorld(42,32,32),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  w.tiles[0]={terrain:'rock',ore:'steel',miningDamage:80,miningYield:.032};
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(first.status).toBe('applied');
  w.tiles[0]!.miningYield=.04;
  const delta=structuredClone(encoder.encode(w,0,1));
  expect(delta.kind==='delta'&&delta.tiles).toEqual([[0,'rock',undefined,80,'steel',undefined,.04]]);
  const second=decoder.adopt(delta);expect(second.status).toBe('applied');
  if(first.status==='applied')expect(first.world.tiles[0]!.miningYield).toBe(.032);
  if(second.status==='applied')expect(second.world.tiles[0]!.miningYield).toBe(.04);
  w.tiles[0]={terrain:'rough-stone'};
  const removal=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(removal.status).toBe('applied');
  if(removal.status==='applied')expect(removal.world.tiles[0]).toEqual({terrain:'rough-stone'});
  const cache=new TileSnapshotCache();cache.reset([{terrain:'rock',ore:'steel',miningDamage:80,miningYield:.04}]);
  cache.reset([{terrain:'soil'},{terrain:'grass'}]);expect(cache.diff([{terrain:'soil'},{terrain:'grass'}])).toEqual([]);
  cache.reset([{terrain:'rock',ore:'machinery',miningDamage:80,miningYield:.03}]);
  expect(cache.diff([{terrain:'rock',ore:'machinery',miningDamage:80,miningYield:.04}])).toEqual([[0,'rock',undefined,80,'machinery',undefined,.04]]);
});

test('legacy checkpoints and deltas reject future Mining keys, including own undefined, before replacing the base',()=>{
  const old=withoutTelevisionRecreation(withoutMiningSkill(createWorld(42,32,32)));Object.assign(old,{schemaVersion:185});
  old.tiles[0]={terrain:'rock',ore:'steel',miningDamage:80};
  for(const change of [
    (w:any)=>{w.pawns[0].skills.mining=undefined;},
    (w:any)=>{w.tiles[0].miningYield=undefined;},
    (w:any)=>{w.tiles[0].miningYield=.03;},
  ]){
    const bad=structuredClone(old);change(bad);
    expect(validateWorld(bad).length).toBeGreaterThan(0);
    const decoder=new SnapshotDecoder(),encoder=new SnapshotEncoder();
    expect(decoder.adopt(structuredClone(encoder.encode(bad,0,1))).status).toBe('resync');
    const correct=new SnapshotEncoder();expect(decoder.adopt(structuredClone(correct.encode(old,0,1))).status).toBe('applied');
  }
  const decoder=new SnapshotDecoder(),encoder=new SnapshotEncoder();
  expect(decoder.adopt(structuredClone(encoder.encode(old,0,1))).status).toBe('applied');
  const delta=structuredClone(encoder.encode(old,0,1));if(delta.kind!=='delta')throw Error('delta');
  delta.tiles=[[0,'rock',undefined,80,'steel',undefined,.03]];
  expect(decoder.adopt(delta).status).toBe('resync');delete delta.tiles;
  expect(decoder.adopt(delta).status).toBe('applied');
});

type MiningArchive='visitor'|'pod';
function archivedMiner(world:World,kind:MiningArchive):Pawn {
  return kind==='visitor'?world.visitors!.departed[0]!.pawn:world.podRescues!.departed[0]!.pawn;
}
function waitForMiningArchive(world:World,done:()=>boolean,max:number):void {
  for(let n=0;n<max&&!done();n++)stepWorld(world);
  expect(done()).toBe(true);expect(validateWorld(world)).toEqual([]);
}
/** Real producers and ordinary border walks create the frozen records. The pod
 * starts from an explicitly recovered checkpoint, as in its transport suite. */
function miningArchiveWorld(kind:MiningArchive):World {
  if(kind==='visitor'){
    const {world,traderId}=visitorTradeFixture(),pawn=world.pawns.find(p=>p.id===traderId)!;
    waitForMiningArchive(world,()=>pawn.visitor!.phase==='staying',3500);
    waitForMiningArchive(world,()=>pawn.visitor!.phase==='leaving',3500);
    const owned=world.piles.filter(p=>'pawnId' in p.owner&&p.owner.pawnId===traderId).map(p=>p.id);
    waitForMiningArchive(world,()=>!world.pawns.includes(pawn),3500);
    const departure=world.visitors!.departed.find(d=>d.pawn.id===traderId)!;
    expect(departure).toBeDefined();expect(departure.items.map(p=>p.id)).toEqual(owned);
    expect(visitorAtEdge(world,archivedMiner(world,kind))).toBe(true);
    return world;
  }
  const world=medicalCamp(),doctor=world.pawns[0]!;
  expect(resolveSelectedPodRescue(world,187)).toBe(true);
  const cell=world.podRescues!.pending!.cell;
  doctor.x=cell.x-4;doctor.z=cell.z;doctor.priorities.doctor=1;
  Object.assign(fixtureBuilding(world,'bed',cell.x+7,cell.z),{medical:true});
  stepWorld(world,10);
  const pawn=world.pawns.find(p=>p.podRescue)!;expect(pawn).toBeDefined();
  pawn.health=createMedicalRecord(world.tick);pawn.state='idle';pawn.podRescue!.admittedAt=world.tick;
  expect(validateWorld(world)).toEqual([]);
  const owned=world.piles.filter(p=>'pawnId' in p.owner&&p.owner.pawnId===pawn.id).map(p=>p.id),nextId=world.nextId;
  waitForMiningArchive(world,()=>world.podRescues!.departed.length===1,800);
  expect(world.pawns.some(p=>p.id===pawn.id)).toBe(false);expect(world.nextId).toBe(nextId);
  expect(world.podRescues!.departed[0]!.items.map(p=>p.id)).toEqual(owned);
  expect(visitorAtEdge(world,archivedMiner(world,kind))).toBe(true);
  return world;
}

test.each(['visitor','pod'] as const)('%s departures preserve Mining profiles and reject corrupt checkpoint/delta archives atomically',kind=>{
  const departed=miningArchiveWorld(kind);
  expect(archivedMiner(departed,kind).skills.mining).toBeDefined();
  expect(deserializeWorld(serializeWorld(departed))).toEqual(departed);
  for(const version of [185,186] as const){
    const world=structuredClone(departed);
    if(version===185){
      // Historical preparation only; neither accepted nor rejected packets are
      // sanitized. The generic helper does not cover civil pod archives.
      withoutTelevisionRecreation(withoutMiningSkill(world));delete archivedMiner(world,kind).skills.mining;
      Object.assign(world,{schemaVersion:185});
      expect(Object.hasOwn(archivedMiner(world,kind).skills,'mining')).toBe(false);
      const migrated=deserializeWorld(JSON.stringify(world));
      expect(migrated).toEqual(withMigratedTelevisionRecreation({...world,schemaVersion:SCHEMA_VERSION}));
      expect(Object.hasOwn(archivedMiner(migrated,kind).skills,'mining')).toBe(false);
      const frozen=JSON.stringify(archivedMiner(migrated,kind));
      expect(JSON.stringify(archivedMiner(deserializeWorld(serializeWorld(migrated)),kind))).toBe(frozen);
      stepWorld(migrated);
      expect(JSON.stringify(archivedMiner(migrated,kind))).toBe(frozen);
    }
    // The public validator accepts the current schema only; old packets are
    // checked through the strict deserializer before testing bridge transport.
    expect(validateWorld(deserializeWorld(JSON.stringify(world)))).toEqual([]);
    const archive=structuredClone(archivedMiner(world,kind)),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
    let accepted=decoder.adopt(structuredClone(encoder.encode(world,0,1)));
    expect(accepted.status).toBe('applied');
    if(accepted.status!=='applied')throw Error('archive checkpoint rejected');
    expect(accepted.world).toEqual(world);
    const corruptions:Array<(pawn:Pawn)=>void>=version===185?[
      pawn=>{pawn.skills.mining={level:8,xp:0,dailyXp:0,passion:0};},
      pawn=>{Object.defineProperty(pawn.skills,'mining',{value:undefined,enumerable:true,configurable:true});},
    ]:[
      pawn=>{pawn.skills.mining!.level=21;},
      pawn=>{pawn.skills.mining!.xp=-1000000;},
      pawn=>{Object.assign(pawn.skills.mining!,{future:true});},
    ];
    for(const checkpoint of [false,true]){
      stepWorld(world);expect(archivedMiner(world,kind)).toEqual(archive);
      const correct=structuredClone(encoder.encode(world,0,1,checkpoint));
      expect(correct.kind).toBe(checkpoint?'checkpoint':'delta');
      const previous=accepted.world,frozen=structuredClone(previous);
      for(const corrupt of corruptions){
        const invalid=structuredClone(correct),pawn=archivedMiner(invalid.world as World,kind);
        corrupt(pawn);
        expect(Object.hasOwn(pawn.skills,'mining')).toBe(true);
        expect(decoder.adopt(invalid).status).toBe('resync');
        expect(previous).toEqual(frozen);expect(archivedMiner(previous,kind)).toEqual(archive);
      }
      // The exact rejected revision must remain admissible once its original
      // valid packet is supplied; every earlier adopted world stays immutable.
      const repaired=decoder.adopt(correct);expect(repaired.status).toBe('applied');
      if(repaired.status!=='applied')throw Error('archive revision lost on refusal');
      expect(repaired.world).toEqual(world);expect(previous).toEqual(frozen);
      accepted=repaired;
    }
  }
});
