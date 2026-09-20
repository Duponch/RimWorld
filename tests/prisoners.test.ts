import {expect,test} from 'vitest';
import {prisonerUiFixture,recruitmentUiFixture} from './scenarios/prison-camp.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {addGroundMaterial,reservedSource,refreshStock} from '../src/sim/materials.ts';
import {reconcilePawnHealth} from '../src/sim/health.ts';
import {releaseWork} from '../src/sim/work-release.ts';
import {blockedCells,reachableCells} from '../src/sim/pathfinding.ts';
import {selectFood} from '../src/sim/food-selection.ts';
import {groundCapacity} from '../src/sim/ground-placement.ts';
import {newDoorState} from '../src/sim/door-rules.ts';
import {feedingReason} from '../src/sim/feeding-rules.ts';
import {newApparelState} from '../src/sim/apparel-rules.ts';
import {isColonist,hostileTo} from '../src/sim/affiliation.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import type {Command,World,Structure} from '../src/sim/types.ts';

function valid(w:World){const errors=validateWorld(w);expect(errors,JSON.stringify({tick:w.tick,errors,p:w.pawns.map(p=>({id:p.id,state:p.state,need:p.need,ward:p.ward,rescue:p.rescue,prisoner:p.prisoner}))})).toEqual([]);}
function command(w:World,c:Command){expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});valid(w);}
function until(w:World,done:()=>boolean,max=5000){for(let n=0;n<max&&!done();n++){stepWorld(w);if(n%31===0)valid(w);}expect(done(),JSON.stringify({tick:w.tick,events:w.events.slice(-6),p:w.pawns.map(p=>({id:p.id,state:p.state,need:p.need,ward:p.ward,rescue:p.rescue}))})).toBe(true);valid(w);}
function replay(w:World,ticks=40){const copy=deserializeWorld(serializeWorld(w));stepWorld(w,ticks);stepWorld(copy,ticks);expect(serializeWorld(copy)).toBe(serializeWorld(w));valid(w);}
const quantity=(w:World,kind:string)=>w.piles.filter(p=>p.kind===kind).reduce((n,p)=>n+p.quantity,0);

test('assisted feeding uses the patient\'s prison stock without taking another prison\'s food',()=>{
  const {world:w}=recruitmentUiFixture(),a=w.pawns[0]!,free=w.pawns[1]!,p=w.pawns[2]!;
  for(let z=8;z<=12;z++)for(let x=23;x<=27;x++)if(x===23||x===27||z===8||z===12){
    const s:Structure=fixtureBuilding(w,x===23&&z===10?'door':'wall',x,z);
    if(s.kind==='door'){s.material='wood';s.door=newDoorState(w.tick);}
  }
  const bed:Structure=fixtureBuilding(w,'bed',25,10);bed.prisoner=true;
  addGroundMaterial(w,'food',1,{x:11,z:9},'simple-meal');
  const food=w.piles.filter(q=>q.owner.type==='ground'&&q.owner.x===11&&q.owner.z===9),reachable=reachableCells(w,a,blockedCells(w),new Set());
  expect(selectFood(w,a,food,reachable,p)?.id).toBe(food[0]!.id);
  expect(selectFood(w,a,food,reachable,free)).toBeUndefined();
  p.x=bed.x;p.z=bed.z;p.bedId=bed.id;valid(w);
  expect(selectFood(w,a,food,reachable,p)).toBeUndefined();
});

test('capture carries the same hostile before admission; doctor treats and warden feeds the actual patient',()=>{
  const {world:w,actorId,patientId,bedId}=prisonerUiFixture(),a=w.pawns[0]!,d=w.pawns[1]!,p=w.pawns[2]!,before=quantity(w,'food'),med=quantity(w,'medicine');
  const ids=w.pawns.map(p=>p.id);
  expect(applyCommand(w,{type:'order-capture',pawnId:actorId,patientId,queue:false}).ok).toBe(false);
  command(w,{type:'prison-bed',bedId,enabled:true});command(w,{type:'medical-bed',bedId,enabled:true});
  command(w,{type:'order-capture',pawnId:actorId,patientId,queue:false});
  until(w,()=>a.rescue?.phase==='carry');expect(p.prisoner).toBeUndefined();expect(p.motion).toEqual(a.motion);replay(w,4);
  expect(a.motion?.speedFactor).toBeLessThanOrEqual(.6);expect(p.x).toBe(a.x);expect(p.z).toBe(a.z);
  until(w,()=>!!p.prisoner);expect(w.pawns.map(p=>p.id)).toEqual(ids);expect(p.need).toMatchObject({kind:'sleep',phase:'sleep',bedId});expect(p.bedId).toBeNull();expect(hostileTo(a,p)).toBe(false);
  expect(feedingReason(w,d,p)).toContain('Geôlier');
  command(w,{type:'priority',pawnId:actorId,work:'warden',value:1});command(w,{type:'priority',pawnId:d.id,work:'doctor',value:1});
  until(w,()=>!!a.feed);replay(w,2);expect(a.priorities.doctor).toBe(0);
  until(w,()=>p.hunger>50&&quantity(w,'medicine')<med);expect(quantity(w,'food')).toBe(before-1);expect(p.prisoner?.resistance).toBe(p.prisoner?.initialResistance);expect(p.health!.injuries.some(i=>i.tended)).toBe(true);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),adopted=decoder.adopt(structuredClone(encoder.encode(w,0,6)));
  expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world).toEqual(w);replay(w);
});

test('capture recovery, cancellation and room-wide bed conversion keep physical identities and claims',()=>{
  for(const when of ['before','during'] as const){
    const {world:w,actorId,patientId,bedId}=prisonerUiFixture(),a=w.pawns[0]!,p=w.pawns[2]!;
    command(w,{type:'prison-bed',bedId,enabled:true});command(w,{type:'order-capture',pawnId:actorId,patientId,queue:false});
    if(when==='during')until(w,()=>a.rescue?.phase==='carry');
    p.health!.bloodLoss=0;reconcilePawnHealth(w,p);stepWorld(w);
    if(when==='before'){expect(a.rescue).toBeUndefined();expect(p.prisoner).toBeUndefined();}
    else {until(w,()=>!!p.prisoner);expect(w.pawns).toContain(p);expect(p.state).not.toBe('downed');}
    valid(w);
  }
  const {world:w,actorId,patientId,bedId}=prisonerUiFixture(),a=w.pawns[0]!,p=w.pawns[2]!;
  const second:Structure=fixtureBuilding(w,'bed',11,10);command(w,{type:'prison-bed',bedId,enabled:true});expect(second.prisoner).toBe(true);
  command(w,{type:'order-capture',pawnId:actorId,patientId,queue:false});until(w,()=>a.rescue?.phase==='carry');
  command(w,{type:'clear-orders',pawnId:actorId});expect(p.prisoner).toBeUndefined();expect(a.rescue).toBeUndefined();expect(p.x).toBe(a.x);expect(p.z).toBe(a.z);replay(w,40);
  command(w,{type:'prison-bed',bedId,enabled:false});expect(second.prisoner).toBeUndefined();expect(w.pawns).toHaveLength(3);
});

test('room food is private, the warden diet gates delivery, and eating only grants nutrition after ingestion',()=>{
  const {world:w,actorId,patientId}=recruitmentUiFixture(),a=w.pawns[0]!,p=w.pawns[2]!;a.x=18;a.z=10;p.hunger=24;p.foodPolicyId=4;
  command(w,{type:'priority',pawnId:actorId,work:'warden',value:1});stepWorld(w,25);expect(a.ward).toBeUndefined();
  command(w,{type:'food-policy-assign',pawnId:patientId,policyId:2});until(w,()=>a.ward?.kind==='food'&&a.ward.phase==='pickup');
  const task=a.ward!;if(task.kind!=='food')throw Error('food delivery expected');
  expect(reservedSource(w,task.sourcePileId)).toBe(task.quantity);expect(groundCapacity(w,task.spot,'wood')).toBe(0);replay(w,1);
  until(w,()=>a.ward?.kind==='food'&&a.ward.phase==='deliver');const total=quantity(w,'food');expect(p.hunger).toBeLessThan(24);replay(w,2);
  until(w,()=>w.piles.some(q=>q.owner.type==='ground'&&q.owner.x===task.spot.x&&q.owner.z===task.spot.z));
  // The player's food policy governs the supplier. A captive may eat food
  // already inside its room even when that policy is changed to Nothing.
  command(w,{type:'food-policy-assign',pawnId:patientId,policyId:4});command(w,{type:'priority',pawnId:actorId,work:'warden',value:0});
  const inside=w.piles.filter(q=>q.kind==='food'&&q.owner.type==='ground'&&q.owner.x===task.spot.x&&q.owner.z===task.spot.z);
  expect(selectFood(w,a,inside,reachableCells(w,a,blockedCells(w),new Set()))).toBeUndefined();
  until(w,()=>p.need?.kind==='eat'&&p.need.phase==='ingest');expect(quantity(w,'food')).toBe(total);expect(p.hunger).toBeLessThan(24);replay(w,1);
  until(w,()=>p.hunger>50);expect(quantity(w,'food')).toBe(total-1);expect(p.prisoner).toBeDefined();
});

test('persuasion at zero waits for a later real visit; recruitment preserves the person and completed effects on replay',()=>{
  const {world:w,actorId,patientId}=recruitmentUiFixture(),a=w.pawns[0]!,p=w.pawns[2]!,skills=structuredClone(p.skills);
  command(w,{type:'prisoner-mode',patientId,mode:'reduce'});command(w,{type:'priority',pawnId:actorId,work:'warden',value:1});
  until(w,()=>a.ward?.kind==='chat'&&a.ward.phase==='rapport'&&a.ward.rapports===3);replay(w,7);
  until(w,()=>p.prisoner?.resistance===0);expect(isColonist(p)).toBe(false);const first=p.prisoner!.lastChatTick!;expect(a.ward).toMatchObject({phase:'closing',rapports:5});replay(w,40);
  stepWorld(w,1020);expect(p.prisoner?.resistance).toBe(0);expect(p.prisoner?.lastChatTick).toBe(first);
  command(w,{type:'prisoner-mode',patientId,mode:'recruit'});until(w,()=>!!p.recruitment);
  expect(p.id).toBe(patientId);expect(p.prisoner).toBeUndefined();expect(p.faction).toBe('colony');expect(p.bedId).toBeNull();expect(p.skills).toEqual(skills);expect(w.pawns.filter(isColonist)).toHaveLength(3);
  expect(p.recruitment!.recruitedAt-first).toBeGreaterThan(1000);const joined=p.recruitment!.recruitedAt;
  replay(w,50);expect(p.recruitment!.recruitedAt).toBe(joined);
});

test('a real opening permits physical escape; closed prison and carried apparel survive continuation',()=>{
  const {world:w,patientId}=recruitmentUiFixture(),p=w.pawns[2]!,door=w.structures.find(s=>s.kind==='door')!;
  // Existing clothes are retained, then exported once at the actual border.
  addGroundMaterial(w,'apparel',1,{x:17,z:16},'cloth-shirt');
  const apparel=w.piles.find(q=>q.item==='cloth-shirt')!;apparel.owner={type:'apparel',pawnId:patientId};apparel.apparel=newApparelState('cloth-shirt');refreshStock(w);
  stepWorld(w,240);expect(p.prisoner?.escape).toBeUndefined();expect(w.pawns).toContain(p);
  // Removing a real wall is a topology boundary fixture; movement and exit
  // still run through the authoritative engine, never by removing the actor.
  w.structures=w.structures.filter(s=>s!==door);stepWorld(w);until(w,()=>!!p.prisoner?.escape);replay(w,40);
  expect(p.motion?.speedFactor).toBeLessThanOrEqual(.35);until(w,()=>!w.pawns.includes(p),1500);
  expect(w.prisonDepartures).toHaveLength(1);expect(w.prisonDepartures![0]).toMatchObject({pawnId:patientId,items:[{id:apparel.id}]});expect(w.piles.some(q=>q.id===apparel.id)).toBe(false);replay(w,30);
});
