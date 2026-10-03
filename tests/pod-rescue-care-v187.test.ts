import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { resolveSelectedPodRescue } from '../src/sim/pod-rescue.ts';
import { wantsRescue } from '../src/sim/rescue.ts';
import { isCarePatient,isColonist,isPlayerPatient } from '../src/sim/affiliation.ts';
import { medicalRestNeeded,treatmentTarget } from '../src/sim/care-rules.ts';
import { medicalStatus } from '../src/sim/injury-state.ts';
import { addMaterial,refreshStock,reservedSource } from '../src/sim/materials.ts';
import { FEED_TICKS } from '../src/sim/feeding-rules.ts';
import type { Command,Pawn,World } from '../src/sim/types.ts';
import { medicalCamp } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';

function valid(w:World):void {
  const errors=validateWorld(w);
  expect(errors,JSON.stringify({tick:w.tick,errors,p:w.pawns.map(p=>({id:p.id,state:p.state,xy:[p.x,p.z],rescue:p.rescue,tend:p.tend,feed:p.feed,need:p.need}))})).toEqual([]);
}
function until(w:World,done:()=>boolean,max=1400):void {
  for(let n=0;n<max&&!done();n++)stepWorld(w);
  valid(w);expect(done()).toBe(true);
}
function replay(w:World,ticks=3):void {
  valid(w);const copy=deserializeWorld(serializeWorld(w));
  stepWorld(copy,ticks);stepWorld(w,ticks);expect(copy).toEqual(w);valid(w);
}
/** Prepared small clinic. The capsule opens, patient moves and all services
 * execute through the ordinary engine; no admission or lying state is injected. */
function clinic(doctors=1) {
  const w=medicalCamp(doctors),d=w.pawns[0]!;
  expect(resolveSelectedPodRescue(w,187)).toBe(true);
  const landing=w.podRescues!.pending!.cell;
  for(const [index,q] of w.pawns.entries()) {
    q.x=landing.x-4;q.z=landing.z+index*2;
    q.priorities.doctor=1;q.skills.medicine={level:8,passion:0,xp:0,dailyXp:0};
  }
  const bed=fixtureBuilding(w,'bed',landing.x+7,landing.z);Object.assign(bed,{medical:true});
  stepWorld(w,10);const p=w.pawns.find(p=>p.podRescue)!;
  expect(p).toBeDefined();valid(w);return {w,d,p,bed};
}
const rescue=(w:World,d:Pawn,p:Pawn)=>applyCommand(w,{type:'order-rescue',pawnId:d.id,patientId:p.id,queue:false});
function admit(w:World,d:Pawn,p:Pawn):void {
  expect(rescue(w,d,p).ok).toBe(true);until(w,()=>p.podRescue!.admittedAt!==undefined);
  expect(p.need).toMatchObject({kind:'sleep',phase:'sleep'});valid(w);
}
const count=(w:World,item:string)=>w.piles.filter(q=>q.item===item).reduce((sum,q)=>sum+q.quantity,0);

test('civilian rescue stays a player choice until real pickup, carried edges and bed deposit',()=>{
  const {w,d,p,bed}=clinic(2),other=w.pawns[1]!,initial={x:p.x,z:p.z};
  expect(medicalStatus(p.health!)).toBe('downed');expect(wantsRescue(p)).toBe(false);expect(wantsRescue(p,true)).toBe(true);
  stepWorld(w,25);expect(d.rescue).toBeUndefined();expect(other.rescue).toBeUndefined();
  expect({x:p.x,z:p.z}).toEqual(initial);expect(p.need).toBeNull();expect(p.podRescue!.admittedAt).toBeUndefined();
  expect(applyCommand(w,{type:'order-tend',pawnId:d.id,patientId:p.id,queue:false}).ok).toBe(false);
  expect(applyCommand(w,{type:'order-feed',pawnId:d.id,patientId:p.id,queue:false}).ok).toBe(false);
  expect(rescue(w,d,p).ok).toBe(true);expect(d.rescue?.phase).toBe('approach');
  const accepted=serializeWorld(w);expect(rescue(w,other,p).ok).toBe(false);expect(serializeWorld(w)).toBe(accepted);
  replay(w);expect(p.podRescue!.admittedAt).toBeUndefined();
  until(w,()=>d.rescue?.phase==='carry'&&d.moveCooldown>0);
  expect(p.need).toBeNull();expect(p.podRescue!.admittedAt).toBeUndefined();
  expect({x:p.x,z:p.z}).toEqual({x:d.x,z:d.z});expect(p.motion).toEqual(d.motion);expect(p.moveCooldown).toBe(d.moveCooldown);
  replay(w);expect(p.podRescue!.admittedAt).toBeUndefined();
  until(w,()=>p.podRescue!.admittedAt!==undefined);
  expect(p.podRescue!.admittedAt).toBe(w.tick);expect({x:p.x,z:p.z}).toEqual({x:bed.x,z:bed.z});
  expect(p.moveCooldown).toBe(0);expect(d.rescue).toBeUndefined();expect(p.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:bed.id});
  expect(isCarePatient(p)).toBe(true);expect(isPlayerPatient(p)).toBe(false);expect(isColonist(p)).toBe(false);replay(w);
});

test('interrupted approach and carry never admit a civilian; generic foreign people retain their original role',()=>{
  for(const phase of ['approach','carry'] as const) {
    const {w,d,p}=clinic();expect(rescue(w,d,p).ok).toBe(true);
    if(phase==='carry')until(w,()=>d.rescue?.phase==='carry'&&d.moveCooldown>0);
    const location={x:p.x,z:p.z},motion=structuredClone(p.motion);
    expect(applyCommand(w,{type:'clear-orders',pawnId:d.id}).ok).toBe(true);
    expect(d.rescue).toBeUndefined();expect(p.podRescue!.admittedAt).toBeUndefined();expect(p.need).toBeNull();
    expect({x:p.x,z:p.z}).toEqual(location);expect(p.motion).toEqual(motion);
    replay(w,25);expect(d.rescue).toBeUndefined();expect(p.podRescue!.admittedAt).toBeUndefined();
    expect(rescue(w,d,p).ok).toBe(true);until(w,()=>p.podRescue!.admittedAt!==undefined);
  }
  const {w,d,p}=clinic();delete p.podRescue;delete w.podRescues;valid(w);
  const before=serializeWorld(w);expect(rescue(w,d,p).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  stepWorld(w,25);expect(d.rescue).toBeUndefined();expect(isCarePatient(p)).toBe(false);valid(w);
});

test('admitted civilian receives a carried meal and consumed medicine with physical bedside contact, without colonial authority',()=>{
  const {w,d,p,bed}=clinic();p.hunger=24;
  addMaterial(w,'food',3,{type:'ground',x:bed.x-5,z:bed.z+3},'survival-meal');
  addMaterial(w,'medicine',8,{type:'ground',x:bed.x-4,z:bed.z+3},'herbal-medicine');refreshStock(w);
  for(const c of [{type:'medical-care',pawnId:p.id,care:'herbal'},{type:'food-policy-assign',pawnId:p.id,policyId:w.foodPolicies[0]!.id}] as Command[]) {
    const before=serializeWorld(w);expect(applyCommand(w,c).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  }
  admit(w,d,p);
  expect(applyCommand(w,{type:'medical-policy',pawnId:p.id,enabled:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'food-policy-assign',pawnId:p.id,policyId:w.foodPolicies[0]!.id}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-feed',pawnId:d.id,patientId:p.id,queue:false}).ok).toBe(true);
  const source=w.piles.find(q=>q.id===d.feed!.sourcePileId)!;expect(reservedSource(w,source.id)).toBe(1);
  const food=count(w,'survival-meal'),xp=d.skills.medicine.xp;
  replay(w);until(w,()=>d.feed?.phase==='deliver');
  const held=w.piles.find(q=>q.id===d.feed!.carryPileId)!;
  expect(held.owner).toEqual({type:'pawn',pawnId:d.id});expect(count(w,'survival-meal')).toBe(food);expect(p.hunger).toBeLessThan(24);
  replay(w);until(w,()=>d.feed?.phase==='feed');
  expect(Math.abs(d.x-p.x)+Math.abs(d.z-p.z)).toBe(1);expect(d.moveCooldown).toBe(0);
  const ticks=FEED_TICKS-d.feed!.progress;
  stepWorld(w,ticks-1);expect(count(w,'survival-meal')).toBe(food);expect(p.hunger).toBeLessThan(24);
  stepWorld(w);expect(count(w,'survival-meal')).toBe(food-1);expect(w.piles.some(q=>q.id===held.id)).toBe(false);
  expect(p.hunger).toBeGreaterThan(90);expect(d.skills.medicine.xp).toBe(xp);
  expect(p.memories.some(m=>m.kind==='ate-without-table')).toBe(false);replay(w);
  expect(applyCommand(w,{type:'medical-policy',pawnId:p.id,enabled:true}).ok).toBe(true);
  expect(applyCommand(w,{type:'medical-care',pawnId:p.id,care:'herbal'}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-tend',pawnId:d.id,patientId:p.id,queue:false}).ok).toBe(true);
  const doses=count(w,'herbal-medicine');until(w,()=>d.tend?.phase==='pickup');replay(w);
  until(w,()=>d.tend?.phase==='approach'&&!!d.tend.medicine?.carryPileId);
  expect(w.piles.find(q=>q.id===d.tend!.medicine!.carryPileId)!.owner).toEqual({type:'pawn',pawnId:d.id});
  expect(count(w,'herbal-medicine')).toBe(doses);expect(p.health!.injuries.every(i=>i.tended===undefined)).toBe(true);replay(w);
  until(w,()=>d.tend?.phase==='tend');expect(Math.abs(d.x-p.x)+Math.abs(d.z-p.z)).toBe(1);
  expect(d.skills.medicine.xp).toBe(xp);replay(w);
  until(w,()=>p.health!.injuries.some(i=>i.tended!==undefined));
  expect(count(w,'herbal-medicine')).toBe(doses-1);expect(d.skills.medicine.xp).toBeGreaterThan(xp);
  expect(w.podRescues!.incidents[0]!.tendedAt).toBeDefined();expect(w.podRescues!.incidents[0]!.result).toBeUndefined();
  for(const c of [{type:'priority',pawnId:p.id,work:'doctor',value:1},{type:'draft',pawnIds:[p.id],enabled:true},{type:'self-tend-policy',pawnId:p.id,enabled:true}] as Command[]) {
    const before=serializeWorld(w);expect(applyCommand(w,c).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
  }
  expect(Object.values(p.priorities).every(n=>n===0)).toBe(true);expect(p.draft).toBeUndefined();expect(p.selfTend).toBeUndefined();replay(w);
  until(w,()=>!treatmentTarget(p)&&medicalStatus(p.health!)==='mobile',2500);
  until(w,()=>p.state==='resting'&&p.need?.kind==='sleep'&&p.need.medical==='bedrest',300);
  expect(medicalRestNeeded(p)).toBe(true);expect(p.need).toMatchObject({kind:'sleep',phase:'sleep',bedId:bed.id});
  expect(w.pawns).toContain(p);expect(w.podRescues!.departed).toHaveLength(0);replay(w,10);
});
