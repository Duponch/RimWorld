import { expect,test } from 'vitest';
import { withoutPredatorFoodPolicies,withoutPredatorApparelPolicies } from './scenarios/legacy-save';
import { createWorld,deserializeWorld,serializeWorld,validateWorld } from '../src/sim/index';
import { enableWildlife } from '../src/sim/wildlife';
import { refreshStock } from '../src/sim/materials';
import { SCHEMA_VERSION } from '../src/sim/types';
import { SnapshotEncoder,SnapshotDecoder } from '../src/bridge/snapshots';
import { PresentationChanges } from '../src/bridge/presentation-changes';
import { validAnimalExit } from '../src/sim/wildlife-save';

function fixture(){
  const w=createWorld(186,16,16);
  w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.pawns=[];w.structures=[];w.jobs=[];w.piles=[];w.packed=[];
  w.resources=[{id:w.nextId++,kind:'berries',x:4,z:4,amount:10,growth:1,growthTick:0}];
  refreshStock(w);enableWildlife(w,1);w.resources=[];
  const a=w.wildlife!.animals[0]!;
  a.x=4;a.z=4;a.food=0;a.state='moving';a.nextDecision=0;
  a.path=[{x:3,z:4},{x:2,z:4},{x:1,z:4},{x:0,z:4}];
  return w;
}

test('173 is validated before neutral adoption; no departures or random draws are invented',()=>{
  const w=fixture(),legacy=withoutPredatorApparelPolicies(withoutPredatorFoodPolicies(JSON.parse(serializeWorld(w))));legacy.schemaVersion=173;
  const migrated=deserializeWorld(JSON.stringify(legacy));
  expect(migrated).toEqual({...legacy,schemaVersion:SCHEMA_VERSION});
  expect(migrated.wildlife?.exitedAnimals).toBeUndefined();
  expect(migrated.wildlife?.animals[0]?.exiting).toBeUndefined();
  expect(validateWorld(migrated)).toEqual([]);
  for(const future of ['route','counter'] as const){
    const forged=structuredClone(legacy);
    if(future==='route')forged.wildlife.animals[0].exiting={destination:{x:0,z:4},nextFoodCheck:100};
    else forged.wildlife.exitedAnimals=1;
    expect(()=>deserializeWorld(JSON.stringify(forged))).toThrow(/Invalid version 173/);
  }
});

test('exit route and ledger resume exactly; invalid geometry, clocks and activity are refused',()=>{
  const w=fixture(),a=w.wildlife!.animals[0]!;
  a.exiting={destination:{x:0,z:4},nextFoodCheck:100};w.wildlife!.exitedAnimals=2;
  expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const mutations=[
    (a:any)=>{a.exiting.destination.x=3;},
    (a:any)=>{a.exiting.destination.z=-1;},
    (a:any)=>{a.exiting.destination.y=0;},
    (a:any)=>{a.exiting.nextFoodCheck=101;},
    (a:any)=>{a.exiting.nextFoodCheck=.5;},
    (a:any)=>{a.exiting.teleport=true;},
    (a:any)=>{a.state='sleeping';},
    (a:any)=>{a.food=.01;},
    (a:any)=>{a.domestic={};},
    (a:any)=>{a.meal={kind:'plant',id:1,quantity:1,progress:0};},
    (a:any)=>{a.path[a.path.length-1]={x:0,z:5};},
  ];
  for(const mutate of mutations){
    const bad=structuredClone(w);mutate(bad.wildlife!.animals[0]!);
    expect(validAnimalExit(bad,174,bad.wildlife!.animals[0]!)).toBe(false);
    expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
  for(const count of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1]){
    const bad=structuredClone(w);bad.wildlife!.exitedAnimals=count;
    expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
});

test('same-tick exit phases are published and forged transport is rejected without replacing the witness',()=>{
  const w=fixture(),a=w.wildlife!.animals[0]!,observer=new PresentationChanges();
  expect(observer.capture(w)).toBe(true);expect(observer.capture(w)).toBe(false);
  a.exiting={destination:{x:0,z:4},nextFoodCheck:100};
  expect(observer.capture(w)).toBe(true);expect(observer.capture(w)).toBe(false);
  // Rechecking the same route is not a new discrete presentation phase.
  a.exiting.nextFoodCheck=50;expect(observer.capture(w)).toBe(false);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const checkpoint=structuredClone(encoder.encode(w,0,0)),adopted=decoder.adopt(checkpoint);
  expect(adopted.status).toBe('applied');
  const witness=adopted.status==='applied'?structuredClone(adopted.world):null;
  a.exiting.destination.x=3;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,0))).status).toBe('resync');
  if(adopted.status==='applied')expect(adopted.world).toEqual(witness);
  a.exiting.destination.x=0;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,0,true))).status).toBe('applied');
  delete a.exiting;w.wildlife!.exitedAnimals=1;
  expect(observer.capture(w)).toBe(true);
});
