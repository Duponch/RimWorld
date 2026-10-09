import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { footprintCells } from '../src/sim/definitions.ts';
import { validateHydroponics } from '../src/sim/farming-save.ts';
import { validOrbitalTransport } from '../src/sim/orbital-save.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { HYDROPONICS_RESEARCH_COST } from '../src/sim/research.ts';
import { ValidationIdentityContext } from '../src/sim/validation-identities.ts';
import type { GrowingZone,Structure,World } from '../src/sim/types.ts';
import { orbitalCamp } from './helpers/orbital-v281.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';

function hydroFixture(){
  const w=deconstructionCamp(0,24);w.stockpiles=[];w.growingZones=[];
  w.research={project:null,points:0,hydroponics:{points:HYDROPONICS_RESEARCH_COST,completedAt:w.tick}};
  const basin:Structure={id:w.nextId++,kind:'hydroponics-basin',x:8,z:8,orientation:0,footprint:'standard',material:'steel',power:newPowerState('hydroponics-basin')};
  const zone:GrowingZone={id:w.nextId++,basinId:basin.id,plant:'rice',allowSow:true,allowCut:true,cells:footprintCells(basin).map(c=>c.z*w.width+c.x).sort((a,b)=>a-b)};
  w.structures.push(basin);w.growingZones.push(zone);return {w,basin,zone};
}
const hydroPair=(w:World)=>{
  const old=validateHydroponics(w,w.schemaVersion);
  expect(validateHydroponics(w,w.schemaVersion,undefined,new ValidationIdentityContext(w))).toEqual(old);
  return old;
};
const orbitalPair=(w:World)=>{
  const old=validOrbitalTransport(w,w.schemaVersion);
  expect(validOrbitalTransport(w,w.schemaVersion,undefined,new ValidationIdentityContext(w))).toBe(old);
  return old;
};

test('one capture distinguishes the six map collections from zones and all supplied packed owners',()=>{
  const w={pawns:[{id:1}],resources:[{id:2},{id:2}],structures:[{id:3}],jobs:[{id:4}],piles:[{id:5}],stockpiles:[{id:6}],growingZones:[{id:7}]} as unknown as World;
  const context=new ValidationIdentityContext(w),packs=[{building:{id:8}},{building:{id:9}}];
  const orbital=context.orbital(w,packs),hydro=context.hydro(w);
  for(let id=1;id<=9;id++){expect(hydro.has(id)).toBe(id<=6);expect(orbital.has(id)).toBe(true);}
  expect(hydro.has(10)).toBe(false);expect(orbital.has(10)).toBe(false);
  // Reading a different domain does not add its owners into the hydro view.
  expect(context.hydro(w).has(7)).toBe(false);expect(context.hydro(w).has(9)).toBe(false);
});

test('capture is lazy and reusable only for its bound World; membership retains Set equality',()=>{
  let reads=0;
  const w={pawns:[],resources:[{get id(){reads++;return 17;}},{id:NaN},{id:-0}],structures:[],jobs:[],piles:[],stockpiles:[],growingZones:[]} as unknown as World;
  const context=new ValidationIdentityContext(w);expect(reads).toBe(0);
  expect(context.orbital(w,[]).has(17)).toBe(true);expect(context.hydro(w).has(17)).toBe(true);expect(reads).toBe(1);
  expect(context.hydro(w).has(NaN)).toBe(true);expect(context.hydro(w).has(0)).toBe(true);
  const other={...w,resources:[{id:23}]} as unknown as World;expect(context.hydro(other).has(23)).toBe(true);expect(context.hydro(other).has(17)).toBe(false);
  expect(context.hydro(w).has(17)).toBe(true);
});

test('hydro keeps its errors for collisions, repeated zones and malformed record collections',()=>{
  expect(hydroPair(hydroFixture().w)).toEqual([]);
  const collision=hydroFixture();collision.w.resources.push({id:collision.zone.id,kind:'tree',x:1,z:1,amount:10});
  expect(hydroPair(collision.w)).toContain('Invalid hydroponics growing zone.');
  const duplicate=hydroFixture();duplicate.w.growingZones.push(duplicate.zone);
  expect(hydroPair(duplicate.w)).toContain('Invalid hydroponics growing zone.');
  for(const value of [new Array(1),[null],{}]){
    const {w}=hydroFixture();Object.assign(w,{resources:value});
    expect(hydroPair(w)).toEqual(['Invalid hydroponics world collections or dimensions.']);
  }
});

test('orbital retains identity collisions from resources, zones, local packs and foreign packs',()=>{
  expect(orbitalPair(orbitalCamp().world)).toBe(true);
  for(const domain of ['resource','zone','local-pack','foreign-pack'] as const){
    const {world:w,shipId}=orbitalCamp();
    const building:Structure={id:shipId,kind:'dining-chair',x:1,z:1,orientation:0,footprint:'standard',quality:'normal'};
    if(domain==='resource')w.resources.push({id:shipId,kind:'tree',x:1,z:1,amount:10});
    else if(domain==='zone')w.growingZones.push({id:shipId,cells:[33],plant:'rice',allowSow:true,allowCut:true});
    else if(domain==='local-pack')w.packed.push({building,owner:{type:'ground',x:2,z:2}});
    else {
      const pawn=w.pawns.pop()!;
      w.visitors={departed:[{tick:w.tick,pawn,items:[],packed:[{building,owner:{type:'ground',x:2,z:2}}]}]} as never;
    }
    expect(orbitalPair(w),domain).toBe(false);
  }
});

test('orbital duplicate ships and sparse resource collections keep their original refusals',()=>{
  const duplicate=orbitalCamp().world;duplicate.orbital!.ships.push(duplicate.orbital!.ships[0]!);expect(orbitalPair(duplicate)).toBe(false);
  const sparse=orbitalCamp().world;sparse.resources=new Array(1);expect(orbitalPair(sparse)).toBe(false);
});

test('absent content and future-schema short circuits never ask the identity context for records',()=>{
  const throwing=new Proxy([],{get(){throw Error('unexpected resource traversal');}});
  const absent=deconstructionCamp(0,24);absent.stockpiles=[];absent.growingZones=[];Object.assign(absent,{resources:throwing});
  expect(hydroPair(absent)).toEqual([]);expect(orbitalPair(absent)).toBe(true);
  const future=hydroFixture().w;future.schemaVersion=202 as World['schemaVersion'];Object.assign(future,{resources:throwing});
  expect(hydroPair(future)).toEqual(['Future hydroponics content.']);
  const orbitalFuture=orbitalCamp().world;orbitalFuture.schemaVersion=215 as World['schemaVersion'];Object.assign(orbitalFuture,{resources:throwing});
  expect(orbitalPair(orbitalFuture)).toBe(false);
});

test('standalone calls retain repeated getter reads and observe in-place identity changes',()=>{
  const {w,zone}=hydroFixture();let reads=0,id=w.nextId++;
  w.resources.push({get id(){reads++;return id;},kind:'tree',x:1,z:1,amount:10});
  expect(validateHydroponics(w,w.schemaVersion)).toEqual([]);expect(reads).toBe(1);
  id=zone.id;expect(validateHydroponics(w,w.schemaVersion)).toContain('Invalid hydroponics growing zone.');expect(reads).toBe(2);
});

test('a refused identity delta does not retain captured membership or damage an older accepted view',()=>{
  const {world:w,shipId}=orbitalCamp(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('checkpoint');
  const held=structuredClone(first.world);w.tick++;
  const good=structuredClone(encoder.encode(w,0,6)),bad=structuredClone(good);
  bad.world.growingZones.push({id:shipId,cells:[33],plant:'rice',allowSow:true,allowCut:true});
  expect(decoder.adopt(bad).status).toBe('resync');expect(decoder.adopt(good).status).toBe('applied');expect(first.world).toEqual(held);
});
