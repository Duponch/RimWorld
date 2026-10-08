import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { advanceRaids,exitRaider } from '../src/sim/raids.ts';
import { exitPrisoner } from '../src/sim/prisoner-exit.ts';
import { validateRaids } from '../src/sim/raid-save.ts';
import { newApparelState } from '../src/sim/apparel-rules.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { recruitmentUiFixture } from './scenarios/prison-camp.ts';
import type { World } from '../src/sim/types.ts';

function captive(){
  // Existing captured boundary: preserve the same hostile pawn and its real
  // prisoner/raid owners, then let the ordinary raid controller close the raid.
  const {world:w,actorId,patientId}=recruitmentUiFixture(),p=w.pawns.find(q=>q.id===patientId)!;
  w.pawns.find(q=>q.id===actorId)!.priorities.basic=1;
  p.raid={group:1,exiting:true,goal:null};
  w.raids={profile:'camp-raids-v1',rng:1,nextCheck:null,serial:1,completed:0,departed:[],
    active:{id:1,startedAt:w.tick,deadline:w.tick+2600,lossPermille:500,members:[p.id],lost:[],phase:'assault'}};
  const shirt={id:w.nextId++,kind:'apparel' as const,item:'cloth-shirt' as const,quantity:1,
    owner:{type:'apparel' as const,pawnId:p.id},apparel:newApparelState('cloth-shirt')};
  w.piles.push(shirt);refreshStock(w);
  expect(validateWorld(w)).toEqual([]);advanceRaids(w);
  expect(w.raids.last).toMatchObject({captured:1,killed:0,downed:0,escaped:0});
  expect(validateWorld(w)).toEqual([]);
  return {w,p,shirt,actorId};
}
function until(w:World,done:()=>boolean){
  for(let i=0;i<2500&&!done();i++){stepWorld(w);if(i%47===0)expect(validateWorld(w)).toEqual([]);}
  expect(done(),JSON.stringify({tick:w.tick,events:w.events.slice(-5),pawns:w.pawns.map(p=>({id:p.id,state:p.state,rescue:p.rescue,prisoner:p.prisoner}))})).toBe(true);
  expect(validateWorld(w)).toEqual([]);
}
function departed(){
  const f=captive(),{w,p,shirt}=f;
  expect(applyCommand(w,{type:'prisoner-mode',patientId:p.id,mode:'release'}).ok).toBe(true);
  until(w,()=>p.prisoner!.releasedAt!==undefined);
  expect(w.pawns).toContain(p);expect(p.faction).toBe('outlaws');expect(p.raid).toEqual({group:1,exiting:true,goal:null});
  expect(w.raids!.departed).toEqual([]);expect(w.prisonDepartures).toBeUndefined();
  const releasedAt=p.prisoner!.releasedAt!;
  const copy=deserializeWorld(serializeWorld(w));
  until(w,()=>!w.pawns.includes(p));
  stepWorld(copy,w.tick-copy.tick);
  expect(serializeWorld(copy)).toBe(serializeWorld(w));
  expect(w.raids!.departed).toHaveLength(1);
  expect(w.raids!.departed[0]).toMatchObject({group:1,pawnId:p.id,reason:'released',capturedAt:p.prisoner!.capturedAt,releasedAt,items:[{id:shirt.id}]});
  return f;
}

test('released former raider keeps one raid receipt and the same apparel through deposit, exit and reload',()=>{
  const {w,p,shirt}=departed(),d=w.raids!.departed[0]!;
  expect(d.items[0]).toBe(shirt);expect(w.piles).not.toContain(shirt);expect(w.prisonDepartures).toBeUndefined();
  expect(w.raids!.last).toMatchObject({captured:1});
  expect(w.events.some(e=>e.message.includes('libération'))).toBe(true);
  expect(exitPrisoner(w,p)).toBe(false);expect(exitRaider(w,p)).toBe(false);
  expect(w.raids!.departed).toHaveLength(1);expect(validateWorld(w)).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('schema 201 refuses the released raid receipt before migration',()=>{
  const {w}=departed();
  expect(validateRaids(w,201,new Set(w.pawns.map(p=>p.id)))).toContain('Invalid raid departure.');
  const old=structuredClone(w);old.schemaVersion=201 as World['schemaVersion'];
  expect(()=>deserializeWorld(JSON.stringify(old))).toThrow();
});

test('released raid receipt requires ordered capture, deposit and exit timestamps',()=>{
  const {w}=departed();
  const mutations:((copy:World)=>void)[]=[
    v=>{delete v.raids!.departed[0]!.capturedAt;},
    v=>{delete v.raids!.departed[0]!.releasedAt;},
    v=>{v.raids!.departed[0]!.capturedAt=-1;},
    v=>{const d=v.raids!.departed[0]!;d.capturedAt=d.releasedAt!+1;},
    v=>{const d=v.raids!.departed[0]!;d.releasedAt=d.tick+1;},
    v=>{v.raids!.departed[0]!.releasedAt=.5;},
    v=>{delete v.raids!.departed[0]!.reason;},
    v=>{v.raids!.departed.push(structuredClone(v.raids!.departed[0]!));},
  ];
  for(const mutate of mutations){
    const bad=structuredClone(w);mutate(bad);
    expect(validateWorld(bad).length,mutate.toString()).toBeGreaterThan(0);
    expect(()=>deserializeWorld(JSON.stringify(bad)),mutate.toString()).toThrow();
  }
});

test('historical captive raid escape retains its old receipt without release provenance',()=>{
  const {w,p,shirt}=captive();
  p.x=0;p.z=10;p.bedId=null;p.need=null;p.path=[];p.motion=null;p.moveCooldown=0;p.prisoner!.escape={x:0,z:10};
  expect(validateWorld(w)).toEqual([]);expect(exitPrisoner(w,p)).toBe(true);
  const d=w.raids!.departed[0]!;
  expect(d.items).toEqual([shirt]);expect(d.reason).toBeUndefined();expect(d.capturedAt).toBeUndefined();expect(d.releasedAt).toBeUndefined();
  expect(w.prisonDepartures).toBeUndefined();expect(validateWorld(w)).toEqual([]);
  expect(validateRaids(w,201,new Set(w.pawns.map(q=>q.id)))).toEqual([]);
});
