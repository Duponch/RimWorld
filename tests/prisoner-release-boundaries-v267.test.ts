import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { INGEST_TICKS } from '../src/sim/eating.ts';
import { groundCapacity,groundPile,nearbyGround } from '../src/sim/ground-placement.ts';
import type { NeedContext } from '../src/sim/needs.ts';
import { processPrisoner } from '../src/sim/prisoners.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import { recruitmentUiFixture } from './scenarios/prison-camp.ts';
import type { World } from '../src/sim/types.ts';

function fixture(){
  const {world:w,actorId,patientId}=recruitmentUiFixture(),a=w.pawns.find(p=>p.id===actorId)!,p=w.pawns.find(p=>p.id===patientId)!;
  a.priorities.basic=1;a.priorities.warden=0;
  expect(applyCommand(w,{type:'prisoner-mode',patientId:p.id,mode:'release'})).toEqual({ok:true});
  return {w,a,p};
}
function until(w:World,done:()=>boolean,limit=1400){
  for(let i=0;i<limit&&!done();i++)stepWorld(w);
  expect(done(),JSON.stringify({tick:w.tick,p:w.pawns.map(p=>({id:p.id,state:p.state,rescue:p.rescue,prisoner:p.prisoner,path:p.path})),events:w.events.slice(-5)})).toBe(true);
}
const valid=(w:World)=>expect(validateWorld(w)).toEqual([]);

test('the real planner releases with BasicWorker alone, deposits outside and then exits independently',()=>{
  const {w,a,p}=fixture(),id=p.id,faction=p.faction;
  until(w,()=>a.rescue?.phase==='carry');
  expect(a.priorities.warden).toBe(0);expect(a.rescue).toMatchObject({bedId:0,patientId:id});
  expect(p.prisoner!.releasedAt).toBeUndefined();valid(w);
  until(w,()=>p.prisoner!.releasedAt!==undefined);
  const releasedAt=p.prisoner!.releasedAt;
  expect(w.pawns).toContain(p);expect(a.rescue).toBeUndefined();expect(p.faction).toBe(faction);
  expect(p.x>0&&p.z>0&&p.x<w.width-1&&p.z<w.height-1).toBe(true);valid(w);
  until(w,()=>!w.pawns.includes(p));
  expect(w.prisonDepartures).toHaveLength(1);
  expect(w.prisonDepartures![0]).toMatchObject({pawnId:id,reason:'released',releasedAt});valid(w);
});

test('disabling one admitted work type keeps the carry; disabling the last type releases the physical body',()=>{
  const {w,a,p}=fixture();
  expect(applyCommand(w,{type:'priority',pawnId:a.id,work:'warden',value:1})).toEqual({ok:true});
  until(w,()=>a.rescue?.phase==='carry'&&a.moveCooldown>0);valid(w);
  const task=a.rescue,position={x:p.x,z:p.z},edge=structuredClone(p.motion),cooldown=p.moveCooldown;
  expect(applyCommand(w,{type:'priority',pawnId:a.id,work:'warden',value:0})).toEqual({ok:true});
  expect(a.rescue).toBe(task);expect(a.priorities.basic).toBe(1);
  expect({x:p.x,z:p.z}).toEqual(position);expect(p.motion).toEqual(edge);valid(w);
  expect(applyCommand(w,{type:'priority',pawnId:a.id,work:'basic',value:0})).toEqual({ok:true});
  expect(a.rescue).toBeUndefined();expect(p.prisoner!.releasedAt).toBeUndefined();expect(w.pawns).toContain(p);
  expect({x:p.x,z:p.z}).toEqual(position);expect(p.motion).toEqual(edge);expect(p.moveCooldown).toBe(cooldown);valid(w);
});

test('a released person finishes a real carried meal when a full floor prevents conservative interruption',()=>{
  const {w,p}=fixture();
  // Recovery boundary: the released person has an already engaged meal and
  // no active departure route. Ingestion itself uses the normal needs code.
  p.x=15;p.z=10;p.bedId=null;p.path=[];p.motion=null;p.moveCooldown=0;p.state='eating';p.hunger=20;
  p.prisoner!.releasedAt=w.tick;delete p.prisoner!.escape;
  const meal={id:w.nextId++,kind:'food' as const,item:'survival-meal' as const,quantity:1,owner:{type:'pawn' as const,pawnId:p.id}};
  w.piles.push(meal);
  p.need={kind:'eat',phase:'ingest',sourcePileId:meal.id,carryPileId:meal.id,quantity:1,progress:0,
    dining:{target:{x:p.x,z:p.z},seatId:null,tableId:null}};
  for(const c of nearbyGround(w,p))if(!groundPile(w,c)&&groundCapacity(w,c,'survival-meal',p.id)>0)
    w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:1,owner:{type:'ground',...c}});
  const wood=w.piles.filter(q=>q.item==='wood').reduce((n,q)=>n+q.quantity,0),releasedAt=p.prisoner!.releasedAt;
  let failedReleases=0;
  const context:NeedContext={search:()=>null,move:()=>{throw Error('Ingestion must not move the person');},
    release:()=>{const result=releaseWork(w,p);if(!result)failedReleases++;return result;},
    event:message=>w.events.push({tick:w.tick,type:'need',message})};
  expect(context.release()).toBe(false);expect(p.need?.kind).toBe('eat');
  processPrisoner(w,p,context);
  expect(p.need).toMatchObject({kind:'eat',phase:'ingest',progress:1});expect(p.hunger).toBe(20);expect(w.piles).toContain(meal);
  for(let i=1;i<INGEST_TICKS;i++){w.tick++;processPrisoner(w,p,context);}
  expect(failedReleases).toBeGreaterThan(1);expect(p.need).toBeNull();expect(p.hunger).toBeGreaterThan(20);expect(w.piles).not.toContain(meal);
  expect(p.prisoner!.releasedAt).toBe(releasedAt);expect(w.pawns).toContain(p);expect({x:p.x,z:p.z}).toEqual({x:15,z:10});
  expect(w.piles.filter(q=>q.item==='wood').reduce((n,q)=>n+q.quantity,0)).toBe(wood);
});
