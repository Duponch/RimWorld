import { SCHEMA_VERSION } from '../src/sim/types';
import { withoutPawnSkills } from './scenarios/legacy-skills';
import { withoutV37LightWork } from './scenarios/legacy-light-work';
import { expect, test } from 'vitest';
import { createWorld, applyCommand, stepWorld, refreshStock, addGroundMaterial, serializeWorld, deserializeWorld, validateWorld } from '../src/sim/index';
import { queryOrderOptions } from '../src/sim/player-orders';
import { startTravel } from '../src/sim/movement';
import { rotAge } from '../src/sim/food-preservation';
import type { World } from '../src/sim/types';

export function orderCamp(count=2):World {
  const w=createWorld(42,32,32);w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];w.piles=[];w.jobs=[];w.structures=[];w.pawns=w.pawns.slice(0,count);
  w.pawns.forEach((p,i)=>{p.x=12+i*2;p.z=16;p.hunger=100;p.rest=100;p.schedule.fill('anything');p.priorities={ doctor:0,craft:2,mine:2,build:1,haul:0,gather:1,grow:1,cook:0};});
  for(const x of [11,18,22]) {
    w.resources.push({id:w.nextId++,kind:'tree',x,z:17,amount:12});
    expect(applyCommand(w,{type:'designate',kind:'chop',x,z:17}).ok).toBe(true);
  }
  refreshStock(w);return w;
}
function ticks(w:World,count:number):void {for(let i=0;i<count;i++){stepWorld(w);expect(validateWorld(w),JSON.stringify({tick:w.tick,pawns:w.pawns,jobs:w.jobs})).toEqual([]);}}

test('forced work overrides proximity and schedule, queues reserve exclusively, then ordinary eating resumes; save replay is exact',()=>{
  const w=orderCamp(),p=w.pawns[0]!,other=w.pawns[1]!,[near,first,second]=w.jobs;
  p.hunger=25;p.rest=25;p.schedule.fill('sleep');addGroundMaterial(w,'food',4,{x:10,z:16},'survival-meal');
  const queryBefore=JSON.stringify(w);expect(queryOrderOptions(w,p.id,first!)[0]?.enabled).toBe(true);expect(JSON.stringify(w)).toBe(queryBefore);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:first!.id,queue:false})).toMatchObject({ok:true});
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:second!.id,queue:true})).toMatchObject({ok:true});
  const before=JSON.stringify(w);
  expect(applyCommand(w,{type:'order-job',pawnId:other.id,jobId:second!.id,queue:false}).reason).toMatch(/réservé/);expect(JSON.stringify(w)).toBe(before);
  expect(applyCommand(w,{type:'priority',pawnId:other.id,work:'gather',value:0}).ok).toBe(true);
  const copy=deserializeWorld(serializeWorld(w));let sawSecond=false;
  for(let i=0;i<350&&(w.jobs.some(j=>j.id===first!.id||j.id===second!.id));i++) {
    ticks(w,1);if(p.jobId===second!.id)sawSecond=true;
    expect(p.need).toBeNull();expect(w.jobs.find(j=>j.id===near!.id)?.progress).toBe(0);
  }
  expect(sawSecond).toBe(true);expect(w.jobs.map(j=>j.id)).toEqual([near!.id]);expect(w.stock.wood).toBe(24);
  expect(p.orders).toEqual({active:null,queue:[]});expect(p.hunger).toBeLessThan(25);
  ticks(w,70);expect(w.events.some(e=>e.message.includes('a mangé'))||p.need?.kind==='eat').toBe(true);
  stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);
});

test('interruptions keep the active diagonal and food age, and invalid/unreachable orders have no side effects',()=>{
  const w=orderCamp(1),p=w.pawns[0]!,target=w.jobs[1]!;
  addGroundMaterial(w,'food',4,p,'rice');const pile=w.piles[0]!;
  pile.owner={type:'pawn',pawnId:p.id};p.need={kind:'eat',phase:'ingest',sourcePileId:pile.id,carryPileId:pile.id,quantity:4,progress:5,dining:{target:{x:p.x,z:p.z},seatId:null,tableId:null}};p.state='eating';
  startTravel(w,p,{x:p.x+1,z:p.z+1});p.need.phase='travel';p.need.progress=0;p.state='moving';const edge=structuredClone(p.motion),age=rotAge(pile,w.tick);
  const before=JSON.stringify(w);p.priorities.gather=0;const disabled=JSON.stringify(w);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:target.id,queue:false}).ok).toBe(false);expect(JSON.stringify(w)).toBe(disabled);p.priorities.gather=1;
  for(const c of [{x:18,z:16},{x:18,z:18},{x:17,z:17},{x:19,z:17}])w.tiles[c.z*w.width+c.x]={terrain:'water'};
  const blocked=JSON.stringify(w);expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:target.id,queue:false}).reason).toMatch(/accès/);expect(JSON.stringify(w)).toBe(blocked);
  const restored=deserializeWorld(before),actor=restored.pawns[0]!;
  expect(applyCommand(restored,{type:'order-job',pawnId:actor.id,jobId:target.id,queue:false}).ok).toBe(true);
  expect(actor.motion).toEqual(edge);expect(restored.piles[0]!.owner).toMatchObject({type:'ground'});expect(rotAge(restored.piles[0]!,restored.tick)).toBe(age);
  expect(actor.need).toBeNull();expect(validateWorld(restored)).toEqual([]);ticks(restored,8);
  const snapshot=JSON.stringify(restored);expect(applyCommand(restored,{type:'order-job',pawnId:actor.id,jobId:999999,queue:false}).ok).toBe(false);expect(JSON.stringify(restored)).toBe(snapshot);
});

test('Shift waits for ingestion, accepted orders survive priority zero, explicit cancellation and collapse release reservations',()=>{
  const w=orderCamp(1),p=w.pawns[0]!;p.hunger=50;
  addGroundMaterial(w,'food',1,p,'survival-meal');const pile=w.piles[0]!;pile.owner={type:'pawn',pawnId:p.id};
  p.need={kind:'eat',phase:'ingest',sourcePileId:pile.id,carryPileId:pile.id,quantity:1,progress:35,dining:{target:{x:p.x,z:p.z},seatId:null,tableId:null}};p.state='eating';
  const job=w.jobs[1]!,second=w.jobs[2]!;
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:true}).ok).toBe(true);expect(p.need?.progress).toBe(35);expect(p.orders.active).toBeNull();
  ticks(w,14);expect(p.jobId).toBeNull();ticks(w,2);expect(p.jobId).toBe(job.id);expect(w.piles.some(x=>x.id===pile.id)).toBe(false);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:second.id,queue:true}).ok).toBe(true);
  expect(applyCommand(w,{type:'cancel',x:second.x,z:second.z}).ok).toBe(true);expect(p.orders.queue).toEqual([]);expect(validateWorld(w)).toEqual([]);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:w.jobs[0]!.id,queue:true}).ok).toBe(true);
  expect(applyCommand(w,{type:'priority',pawnId:p.id,work:'gather',value:0}).ok).toBe(true);expect(p.orders.active).toBe(job.id);expect(p.orders.queue).toHaveLength(1);
  const disabled=deserializeWorld(serializeWorld(w));ticks(disabled,350);expect(disabled.jobs).toEqual([]);expect(disabled.stock.wood).toBe(24);
  expect(applyCommand(w,{type:'clear-orders',pawnId:p.id}).ok).toBe(true);expect(p.orders).toEqual({active:null,queue:[]});expect(w.jobs.every(j=>j.reservedBy===null)).toBe(true);
  p.priorities.gather=1;expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:w.jobs[0]!.id,queue:true}).ok).toBe(true);p.collapsePending=true;p.rest=0;p.restZeroTicks=150;
  ticks(w,8);expect(p.orders).toEqual({active:null,queue:[]});expect(p.need).toMatchObject({kind:'sleep'});expect(w.jobs.every(j=>j.reservedBy===null)).toBe(true);
});

test('queue loses an access, clear-orders preserves designations, construction cannot skip delivery, V16 migration is strict',()=>{
  const w=orderCamp(1),p=w.pawns[0]!,second=w.jobs[2]!;
  applyCommand(w,{type:'order-job',pawnId:p.id,jobId:w.jobs[1]!.id,queue:false});applyCommand(w,{type:'order-job',pawnId:p.id,jobId:second.id,queue:true});
  for(const c of [{x:22,z:16},{x:22,z:18},{x:21,z:17},{x:23,z:17}])w.tiles[c.z*w.width+c.x]={terrain:'water'};
  ticks(w,160);expect(p.orders.queue).toEqual([]);expect(w.events.some(e=>e.message.includes('Accès perdu'))).toBe(true);
  expect(applyCommand(w,{type:'designate',kind:'wall',x:15,z:14}).ok).toBe(true);const wall=w.jobs.at(-1)!;
  const before=JSON.stringify(w);expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:wall.id,queue:false}).reason).toMatch(/Approvisionnement/);expect(JSON.stringify(w)).toBe(before);
  addGroundMaterial(w,'wood',5,{x:wall.x+1,z:wall.z},'wood');const delivery=w.piles.find(x=>x.owner.type==='ground'&&x.owner.x===wall.x+1&&x.owner.z===wall.z)!;delivery.owner={type:'job',jobId:wall.id};wall.construction='frame';refreshStock(w);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:wall.id,queue:false}).ok).toBe(true);ticks(w,130);expect(w.structures.some(s=>s.x===wall.x&&s.z===wall.z&&s.kind==='wall')).toBe(true);
  const fresh=orderCamp(1),actor=fresh.pawns[0]!;
  applyCommand(fresh,{type:'order-job',pawnId:actor.id,jobId:fresh.jobs[0]!.id,queue:false});applyCommand(fresh,{type:'order-job',pawnId:actor.id,jobId:fresh.jobs[1]!.id,queue:true});
  expect(applyCommand(fresh,{type:'clear-orders',pawnId:actor.id}).ok).toBe(true);expect(fresh.jobs).toHaveLength(3);expect(fresh.jobs.every(j=>j.reservedBy===null)).toBe(true);expect(validateWorld(fresh)).toEqual([]);
  const [a,b,c]=fresh.jobs;
  applyCommand(fresh,{type:'order-job',pawnId:actor.id,jobId:a!.id,queue:false});applyCommand(fresh,{type:'order-job',pawnId:actor.id,jobId:b!.id,queue:true});
  // Allow the approach in addition to the 100 ticks of cutting itself.
  for(let i=0;i<150&&fresh.jobs.some(j=>j.id===a!.id);i++)ticks(fresh,1);
  expect(fresh.jobs.some(j=>j.id===a!.id)).toBe(false);
  expect(actor.jobId).toBeNull();expect(actor.orders.queue).toEqual([b!.id]);
  expect(applyCommand(fresh,{type:'order-job',pawnId:actor.id,jobId:c!.id,queue:true}).ok).toBe(true);expect(actor.orders.queue).toEqual([b!.id,c!.id]);
  expect(queryOrderOptions(fresh,actor.id,c!,true)[0]!.enabled).toBe(false);expect(queryOrderOptions(fresh,actor.id,c!)[0]!.enabled).toBe(true);
  expect(applyCommand(fresh,{type:'order-job',pawnId:actor.id,jobId:c!.id,queue:false}).ok).toBe(true);expect(actor.orders).toEqual({active:c!.id,queue:[]});expect(b!.reservedBy).toBeNull();
  applyCommand(fresh,{type:'clear-orders',pawnId:actor.id});
  const raw=JSON.parse(serializeWorld(fresh));(raw.schemaVersion=16,withoutPawnSkills(raw));withoutV37LightWork(raw);for(const a of raw.pawns){delete a.priorities.mine;delete a.priorities.craft;}delete raw.deconstructed;delete raw.packed;for(const a of raw.pawns)delete a.orders;
  const migrated=deserializeWorld(JSON.stringify(raw));expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);expect(migrated.pawns[0]!.orders).toEqual({active:null,queue:[]});
  raw.pawns[0].orders={active:null,queue:[]};expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow(/version 16/);
  const corrupt=JSON.parse(serializeWorld(migrated));corrupt.pawns[0].orders.queue=[fresh.jobs[0]!.id,fresh.jobs[0]!.id];expect(()=>deserializeWorld(JSON.stringify(corrupt))).toThrow(/order/);
  for(const orders of [null,[],{active:'oops',queue:[]},{active:null,queue:Array(33).fill(1)},{active:null,queue:null},{active:null,queue:[-1]}]) {
    corrupt.pawns[0].orders=orders;expect(()=>deserializeWorld(JSON.stringify(corrupt))).toThrow(/order/);
  }
});
