import { expect, test } from 'vitest';
import { SnapshotDecoder, SnapshotEncoder, type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { applyCommand, stepWorld } from '../src/sim/engine.ts';
import { addGroundMaterial } from '../src/sim/materials.ts';
import { startBerserk, startMurderousRage, startTantrum } from '../src/sim/mental-break.ts';
import { serializeWorld, deserializeWorld } from '../src/sim/serialization.ts';
import { validArchivedMeleeThreat } from '../src/sim/visitor-save.ts';
import { exitVisitor, visitorGroupDanger } from '../src/sim/visitors.ts';
import type { Pawn, World } from '../src/sim/types.ts';
import { AGGRESSIVE_CRISIS_KINDS, crisisBuildings, mentalCrisesCamp, type AggressiveCrisisKind } from './helpers/mental-crises-v211.ts';
import { visitorTradeFixture } from './scenarios/visitors.ts';

const starters:Record<AggressiveCrisisKind,(world:World,pawn:Pawn)=>boolean>={tantrum:startTantrum,berserk:startBerserk,'murderous-rage':startMurderousRage};
function camp(){const world=mentalCrisesCamp();crisisBuildings(world);return world;}
function adopt(decoder:SnapshotDecoder,packet:SnapshotMessage):World {
  const result=decoder.adopt(packet);if(result.status!=='applied')throw Error(JSON.stringify(result));return result.world;
}

test.each(AGGRESSIVE_CRISIS_KINDS)('%s checkpoint and delta corruption preserve both the prior frame and the accepted revision',kind=>{
  for(const checkpoint of [false,true]){
    const world=camp(),pawn=world.pawns[0]!,encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
    const before=adopt(decoder,structuredClone(encoder.encode(world,0,0))),json=JSON.stringify(before);
    expect(starters[kind](world,pawn)).toBe(true);
    const good=structuredClone(encoder.encode(world,0,0,checkpoint));
    const cases:Array<(packet:SnapshotMessage)=>void>=[
      p=>{p.world.pawns[0]!.mental!.crisis!.age=-30;},
      p=>{Object.assign(p.world.pawns[0]!.mental!.crisis!,{kind:'unannounced-crisis'});},
      p=>{Object.assign(p.world.pawns[0]!.mental!.crisis!,{future:true});},
      p=>{Object.assign(p.world.pawns[0]!.mental!.crisis!,{targetId:p.world.nextId});},
      p=>{Object.assign(p.world.pawns[0]!.mental!.crisis!,{targetId:p.world.pawns[0]!.id});},
      p=>{p.world.pawns[0]!.mental!.crisis!.target={x:-1,z:0};},
      p=>{p.world.pawns[0]!.mental!.crisis!.waitUntil=Number.NaN;},
      p=>{Object.assign(p.world.pawns[0]!.mental!,{crisis:null});},
      p=>{Object.assign(p.world.pawns[0]!,{mental:null});},
      p=>{p.world.pawns[0]!.meleeThreat={attackerId:p.world.pawns[0]!.id,atCore:p.world.tick*10};},
      p=>{p.world.pawns[0]!.meleeThreat={attackerId:p.world.pawns[1]!.id,atCore:p.world.tick*10+1};},
      p=>{p.world.pawns[0]!.melee={order:{targetId:p.world.pawns[1]!.id,startedDowned:false,auto:'retaliation',untilCore:p.world.tick*10+200},strike:null};},
    ];
    for(const corrupt of cases){
      const bad=structuredClone(good);corrupt(bad);expect(decoder.adopt(bad).status).toBe('resync');
      expect(JSON.stringify(before)).toBe(json);
    }
    const after=adopt(decoder,good);expect(after).toEqual(world);expect(after.tick).toBe(before.tick);expect(JSON.stringify(before)).toBe(json);
  }
});

test('191 refuses future crisis/ownership/threat keys, including an explicitly present undefined threat',()=>{
  const world=camp(),base=structuredClone(new SnapshotEncoder().encode(world,0,0));
  (base.world as {schemaVersion:number}).schemaVersion=191;
  const cases:Array<(packet:SnapshotMessage)=>void>=[
    p=>{p.world.pawns[0]!.meleeThreat=undefined;},
    p=>{p.world.pawns[0]!.meleeThreat={attackerId:p.world.pawns[1]!.id,atCore:p.world.tick*10};},
    p=>{p.world.pawns[0]!.melee={order:{targetId:p.world.pawns[1]!.id,startedDowned:false,auto:'mental'},strike:null};},
    p=>{p.world.pawns[0]!.melee={order:{targetId:p.world.pawns[1]!.id,startedDowned:false,untilCore:p.world.tick*10+200},strike:null};},
  ];
  for(const corrupt of cases){const bad=structuredClone(base);corrupt(bad);expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');}
  for(const kind of AGGRESSIVE_CRISIS_KINDS){
    const future=camp();expect(starters[kind](future,future.pawns[0]!)).toBe(true);
    const bad=structuredClone(new SnapshotEncoder().encode(future,0,0));(bad.world as {schemaVersion:number}).schemaVersion=191;
    expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');
  }
  expect(new SnapshotDecoder().adopt(base).status).toBe('applied');
});

test('a real off-map departure retains its expired threat but refuses new private crisis ownership atomically',()=>{
  const world=camp(),pawn=world.pawns[0]!;
  pawn.meleeThreat={attackerId:world.pawns[1]!.id,atCore:world.tick*10-600};
  addGroundMaterial(world,'food',2,{x:pawn.x,z:pawn.z+1},'survival-meal');
  const food=world.piles.find(p=>p.item==='survival-meal')!;
  expect(applyCommand(world,{type:'scout-start',pawnId:pawn.id,pileId:food.id,quantity:2}).ok).toBe(true);
  for(let i=0;i<700&&!(world.scout&&'pawn' in world.scout);i++)stepWorld(world);
  const owner=world.scout;if(!owner||!('pawn' in owner))throw Error('Actual scout departure missing');
  expect(owner.pawn.meleeThreat).toEqual(pawn.meleeThreat);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),before=adopt(decoder,structuredClone(encoder.encode(world,0,0))),json=JSON.stringify(before);
  const good=structuredClone(encoder.encode(world,0,0)),bad=structuredClone(good),retained=bad.world.scout;
  if(!retained||!('pawn' in retained))throw Error('Off-map transport missing');
  retained.pawn.melee={order:{targetId:world.pawns[0]!.id,startedDowned:false,auto:'retaliation',untilCore:world.tick*10+200},strike:null};
  expect(decoder.adopt(bad).status).toBe('resync');expect(adopt(decoder,good)).toEqual(world);expect(JSON.stringify(before)).toBe(json);
});

test('visitor departure freezes the real threat at its own clock; saves and transport reject future dates and self identities',()=>{
  const {world,traderId,pawnId}=visitorTradeFixture(),visitor=world.pawns.find(p=>p.id===traderId)!;
  // Prepared edge, with no departure, injury or attack already accomplished.
  visitor.x=0;visitor.z=5;visitor.meleeThreat={attackerId:pawnId,atCore:world.tick*10-600};
  visitorGroupDanger(world,visitor,'hostile');expect(exitVisitor(world,visitor)).toBe(true);
  const departure=world.visitors!.departed.find(d=>d.pawn.id===traderId)!,frozen=JSON.stringify(departure);
  expect(departure.pawn.meleeThreat).toEqual(visitor.meleeThreat);expect(validArchivedMeleeThreat(departure.pawn,world,departure.tick)).toBe(true);
  stepWorld(world,3);expect(JSON.stringify(departure)).toBe(frozen);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  const good=structuredClone(new SnapshotEncoder().encode(world,0,0));expect(new SnapshotDecoder().adopt(good).status).toBe('applied');
  for(const [attackerId,atCore] of [[traderId,departure.tick*10],[world.nextId,departure.tick*10],[pawnId,departure.tick*10+1]]){
    const corrupt=structuredClone(world),record=corrupt.visitors!.departed.find(d=>d.pawn.id===traderId)!;
    record.pawn.meleeThreat={attackerId:attackerId!,atCore:atCore!};
    expect(()=>deserializeWorld(JSON.stringify(corrupt))).toThrow(/frozen visitor departure/);
    const bad=structuredClone(new SnapshotEncoder().encode(corrupt,0,0));expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');
  }
  const old=structuredClone(good);(old.world as {schemaVersion:number}).schemaVersion=191;
  expect(new SnapshotDecoder().adopt(old).status).toBe('resync');
});
