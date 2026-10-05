import { expect,test } from 'vitest';
import { createWorld } from '../src/sim/index.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { campTurret,miniTurretCamp } from './scenarios/mini-turret-v212.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';

test('strict192 migration advances only version, preserves all owners and refuses future state before migration',()=>{
  const old=createWorld(73,32,32);Object.assign(old,{schemaVersion:192});const bytes=JSON.stringify(old);
  expect(deserializeWorld(bytes)).toEqual({...old,schemaVersion:SCHEMA_VERSION});expect(JSON.stringify(old)).toBe(bytes);
  const changes:Array<(w:World)=>void>=[
    w=>{w.pawns[0]!.bombRefuge={sourceId:1,target:{x:1,z:1},endCore:240};},
    w=>{w.research={project:null,points:0,gunTurrets:{points:0}};},
    w=>{w.bombWaves=[];},
    w=>{Object.assign(w.structures[0]!,{turret:{}});},
    w=>{w.destroyed={count:0,lost:{},items:{wood:1}};},
  ];
  for(const change of changes){const bad=structuredClone(old);if(!bad.structures.length)bad.structures.push({id:bad.nextId++,kind:'wall',x:1,z:1,orientation:0,footprint:'standard'});change(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/version 192/);}
});

test('canon checkpoints reject forged private phase, extra fields, minification, historical type collisions and unknown losses',()=>{
  const w=miniTurretCamp(),bytes=serializeWorld(w);expect(deserializeWorld(bytes)).toEqual(w);
  const changes:Array<(w:World)=>void>=[
    w=>{delete campTurret(w).turret;},w=>{campTurret(w).material='wood';},w=>{campTurret(w).quality='normal';},
    w=>{campTurret(w).turret!.burst={targetKey:`pawn:${w.pawns[1]!.id}`,shotsLeft:1,delayCore:0};},
    w=>{campTurret(w).turret!.targetKey=`animal:${w.pawns[0]!.id}`;},
    w=>{Object.assign(campTurret(w).turret!,{freeAmmo:1});},
    w=>{const s=campTurret(w);w.structures=w.structures.filter(v=>v!==s);w.packed.push({building:s,owner:{type:'ground',x:s.x,z:s.z}});},
    w=>{w.destroyed={count:0,lost:{}};},w=>{w.destroyed={count:0,lost:{},woodPotentialLost:1};},
    w=>{w.destroyed={count:0,lost:{},resources:{rock:1}};},
    w=>{Object.assign(w.pawns[0]!,{bombRefuge:{sourceId:w.nextId-1,target:{x:4,z:4},endCore:w.tick*10+200}});},
  ];
  for(const change of changes){const bad=JSON.parse(bytes) as World;change(bad);expect(validateWorld(bad).length).toBeGreaterThan(0);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
  expect(serializeWorld(w)).toBe(bytes);
  w.destroyed={count:0,lost:{},items:{wood:2},resources:{tree:1},woodPotentialLost:3};expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
