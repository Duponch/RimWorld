import { expect, test } from 'vitest';
import { SnapshotDecoder, SnapshotEncoder, type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { applyCommand, createWorld, stepWorld } from '../src/sim/engine.ts';
import { HUMAN_YEAR_TICKS } from '../src/sim/human-age.ts';
import { crashlandedProfile } from '../src/sim/game-profile.ts';
import { enableCassandraRaids } from '../src/sim/cassandra-raids.ts';
import { adoptFluIncidents } from '../src/sim/flu-incidents.ts';
import { enableQuests } from '../src/sim/quests.ts';
import { addMaterial, refreshStock } from '../src/sim/materials.ts';
import type { World } from '../src/sim/types.ts';
import { medicalCamp } from './scenarios/health.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';
import { commercialCamp } from './helpers/commercial-v193.ts';

const age={biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:35*HUMAN_YEAR_TICKS};
const background={childhood:'school-child',adulthood:'researcher'} as const;
function adopt(decoder:SnapshotDecoder,packet:SnapshotMessage):World {
  const result=decoder.adopt(packet);if(result.status!=='applied')throw Error(JSON.stringify(result));return result.world;
}

test('same-tick profile changes cross a checkpoint/delta without mutating prior confirmed people',()=>{
  const world=createWorld(210,16,16),pawn=world.pawns[0]!,encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  pawn.age={...age};pawn.background={...background};
  const before=adopt(decoder,structuredClone(encoder.encode(world,0,0))),json=JSON.stringify(before);
  pawn.background={childhood:'quiet-child',adulthood:'medic'};
  const good=structuredClone(encoder.encode(world,0,0)),bad=structuredClone(good);
  (bad.world.pawns[0]!.background as unknown as Record<string,unknown>).childhood='unknown-child';
  expect(decoder.adopt(bad).status).toBe('resync');
  const after=adopt(decoder,good);expect(after.pawns[0]!.background).toEqual(pawn.background);
  expect(JSON.stringify(before)).toBe(json);expect(after.tick).toBe(before.tick);
});

test('future, partial, incompatible, and too-young active profiles refuse adoption atomically',()=>{
  const world=createWorld(211,16,16),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  world.pawns[0]!.age={...age};world.pawns[0]!.background={...background};
  const good=structuredClone(encoder.encode(world,0,0));
  const mutations:((packet:SnapshotMessage)=>void)[]=[
    packet=>{(packet.world as unknown as Record<string,unknown>).schemaVersion=190;},
    packet=>{packet.world.pawns[0]!.background={} as never;},
    packet=>{packet.world.pawns[0]!.background={childhood:'quiet-child',adulthood:'mercenary'};},
    packet=>{delete packet.world.pawns[0]!.age;},
    packet=>{packet.world.pawns[0]!.age!.biologicalTicks=19*HUMAN_YEAR_TICKS;},
    packet=>{packet.world.pawns[0]!.age!.chronologicalTicks=0;},
  ];
  for(const corrupt of mutations){const bad=structuredClone(good);corrupt(bad);expect(decoder.adopt(bad).status).toBe('resync');}
  expect(adopt(decoder,good).pawns[0]!.background).toEqual(background);
});

test('arrival offers require the advertised age/profile pair; old absence remains neutral',()=>{
  const world=createWorld(212,16,16),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const before=adopt(decoder,structuredClone(encoder.encode(world,0,0))),json=JSON.stringify(before);
  world.arrivals={profile:'camp-arrivals-v1',rng:1,nextCheck:6000,serial:1,accepted:0,declined:0,expired:0,
    pending:{id:1,name:'Mira',profile:0,openedAt:0,expiresAt:6000,age:{...age},background:{...background}}};
  const good=structuredClone(encoder.encode(world,0,0));
  for(const field of ['age','background'] as const){const bad=structuredClone(good);delete bad.world.arrivals!.pending![field];expect(decoder.adopt(bad).status).toBe('resync');}
  const future=structuredClone(good);(future.world as unknown as Record<string,unknown>).schemaVersion=190;
  expect(decoder.adopt(future).status).toBe('resync');
  const after=adopt(decoder,good);expect(after.arrivals!.pending!.background).toEqual(background);expect(after.arrivals!.pending!.age).toEqual(age);
  expect(JSON.stringify(before)).toBe(json);
  delete world.arrivals.pending!.background;delete world.arrivals.pending!.age;
  const legacy=adopt(decoder,structuredClone(encoder.encode(world,0,0)));
  expect(legacy.arrivals!.pending!.background).toBeUndefined();expect(legacy.arrivals!.pending!.age).toBeUndefined();
});

test('asylum profile guards run before committing the quest delta, including retained legacy absence',()=>{
  const world=deconstructionCamp(3);world.scenario={id:'crashlanded',revision:1,landing:{x:16,z:16}};
  world.gameProfile=crashlandedProfile();enableCassandraRaids(world);adoptFluIncidents(world);enableQuests(world);
  world.quests!.serial=1;world.quests!.entries=[{id:1,offeredAt:0,expiresAt:1800,name:'Mira',profile:0,joinDelay:60,raidDelay:200,status:'offered',age:{...age},background:{...background}}];
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),good=structuredClone(encoder.encode(world,0,0));
  const bad=structuredClone(good);delete bad.world.quests!.entries[0]!.age;
  expect(decoder.adopt(bad).status).toBe('resync');expect(adopt(decoder,good).quests!.entries[0]!.background).toEqual(background);
  delete world.quests!.entries[0]!.age;delete world.quests!.entries[0]!.background;
  expect(adopt(decoder,structuredClone(encoder.encode(world,0,0))).quests!.entries[0]!.background).toBeUndefined();
});

function scoutOffMap():World {
  const world=medicalCamp(2),pawn=world.pawns[0]!;pawn.x=2;pawn.z=2;pawn.hunger=95;pawn.rest=95;
  world.resources=[];world.structures=[];world.jobs=[];world.piles=[];world.stockpiles=[];world.growingZones=[];
  for(const tile of world.tiles)tile.terrain='soil';
  for(const person of world.pawns){for(const work of Object.keys(person.priorities) as (keyof typeof person.priorities)[])person.priorities[work]=0;person.recreation.level=100;}
  addMaterial(world,'food',3,{type:'ground',x:3,z:2},'survival-meal');refreshStock(world);
  expect(applyCommand(world,{type:'scout-start',pawnId:pawn.id,pileId:world.piles[0]!.id,quantity:3}).ok).toBe(true);
  for(let tick=0;tick<100&&world.scout?.phase!=='travelling';tick++)stepWorld(world);
  expect(world.scout?.phase).toBe('travelling');return world;
}
function commercialOffMap():World {
  const {world,pawnId,foodId}=commercialCamp();
  expect(applyCommand(world,{type:'commercial-start',pawnId,foodPileId:foodId,quantity:2,silver:600}).ok).toBe(true);
  for(let tick=0;tick<300&&world.commercialTrip?.phase!=='outbound';tick++)stepWorld(world);
  expect(world.commercialTrip?.phase).toBe('outbound');return world;
}
test.each([['scout',scoutOffMap],['commerce',commercialOffMap]] as const)('%s validates its original off-map owner profile without replacing prior snapshots',(_name,prepare)=>{
  const world=prepare(),owner=world.scout??world.commercialTrip;
  if(!owner||!('pawn' in owner))throw Error('Off-map owner missing');owner.pawn.age={...age};owner.pawn.background={...background};
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),before=adopt(decoder,structuredClone(encoder.encode(world,0,0))),json=JSON.stringify(before);
  const good=structuredClone(encoder.encode(world,0,0)),bad=structuredClone(good),retained=bad.world.scout??bad.world.commercialTrip;
  if(!retained||!('pawn' in retained))throw Error('Off-map transport missing');
  retained.pawn.background={childhood:'builder'} as never;
  expect(decoder.adopt(bad).status).toBe('resync');expect(adopt(decoder,good)).toEqual(world);expect(JSON.stringify(before)).toBe(json);
});
