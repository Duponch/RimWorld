import { withoutMedicalWork } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization';
import { startTravel } from '../src/sim/movement';
import { updatePawnHealth,injurePawn } from '../src/sim/health';
import { pawnBody,physicalWorkFactor,physicalEatingFactor } from '../src/sim/health-rules';
import { createMedicalRecord,medicalBleed } from '../src/sim/injury-state';
import { BLOOD_UNIT } from '../src/sim/injury-rules';
import { refreshStock } from '../src/sim/materials';
import { processEating } from '../src/sim/eating';
import { workProgress } from '../src/sim/work-progress';
import { fixtureBuilding } from './scenarios/deconstruction';
import { medicalCamp,medicalCarrier,controlledInjury,roofAccidentCamp } from './scenarios/health';
import type { World } from '../src/sim/types';

const valid=(w:World)=>expect(validateWorld(w),JSON.stringify({errors:validateWorld(w),tick:w.tick,pawns:w.pawns,jobs:w.jobs})).toEqual([]);
function continueExactly(w:World,n:number){valid(w);const copy=deserializeWorld(serializeWorld(w));for(let i=0;i<n;i++){stepWorld(w);stepWorld(copy);if(i%20===0)valid(w);}expect(copy).toEqual(w);valid(w);}
function until(w:World,done:()=>boolean,max=2000){for(let i=0;i<max&&!done();i++)stepWorld(w);expect(done(),JSON.stringify(w.pawns)).toBe(true);valid(w);}

test('real roof support removal injures the worker and bystander, voluntary removal is harmless, replay keeps hits and job cleanup',()=>{
  for(const action of ['deconstruct','remove-roof'] as const){
    const w=roofAccidentCamp(),p=w.pawns[0]!,before=w.rng;
    const command=action==='deconstruct'?{type:'designate' as const,kind:action,x:14,z:16}:{type:'area' as const,action,from:{x:13,z:16},to:{x:14,z:17}};
    expect(applyCommand(w,command).ok).toBe(true);valid(w);continueExactly(w,1);const saved=serializeWorld(w);
    until(w,()=>w.roofing!.constructed.length===0);const copy=deserializeWorld(saved);stepWorld(copy,w.tick-copy.tick);expect(copy).toEqual(w);
    if(action==='deconstruct'){
      expect(w.pawns.every(p=>!!p.health)).toBe(true);expect(w.rng).not.toBe(before);expect(w.jobs).toEqual([]);
      for(const actor of w.pawns){expect(actor.health!.injuries.length+actor.health!.missing.length).toBeGreaterThan(0);expect(actor.jobId).toBeNull();}
      expect(w.deconstructed.count).toBe(1);expect(p.state).toBe('dead');
    }else {expect(w.pawns.every(p=>!p.health)).toBe(true);expect(w.rng).toBe(before);expect(w.structures).toHaveLength(1);}
    expect(p.state).not.toBe('working');continueExactly(w,120);
  }
});

test('incapacity during a captured edge releases tasks immediately, conserves undroppable cargo and allows another actor to clear the floor',()=>{
  for(const fatal of [false,true]){
    const w=medicalCarrier(),p=w.pawns[0]!,helper=w.pawns[1]!,held=w.piles.find(q=>q.owner.type==='pawn')!;
    startTravel(w,p,{x:3,z:2});const edge=structuredClone(p.motion);valid(w);
    if(fatal)controlledInjury(w,p,'heart',15000);else {controlledInjury(w,p,'left-leg',30000);controlledInjury(w,p,'right-leg',30000);}
    expect(p.state).toBe(fatal?'dead':'downed');expect(p.motion).toEqual(edge);expect(p.haul).toBeNull();expect(p.orders).toEqual({active:null,queue:[]});expect(p.interruptedCargo).toBe(true);
    expect(startTravel(w,p,{x:4,z:2})).toBe(false);expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:w.jobs[0]!.id,queue:false}).ok).toBe(false);
    const deathNeeds={hunger:p.hunger,rest:p.rest};continueExactly(w,12);expect(p.moveCooldown).toBe(0);expect(p.interruptedCargo).toBe(true);
    const source=w.piles.find(q=>q.owner.type==='ground'&&q.owner.x===2&&q.owner.z===3)!;
    expect(applyCommand(w,{type:'priority',pawnId:helper.id,work:'haul',value:1}).ok).toBe(true);
    expect(applyCommand(w,{type:'order-haul',pawnId:helper.id,target:{type:'pile',pileId:source.id},queue:false}).ok).toBe(true);
    until(w,()=>!p.interruptedCargo);expect(w.piles.find(q=>q.id===held.id)).toMatchObject({quantity:10,item:'steel',owner:{type:'ground',x:2,z:3}});
    expect(p.state).toBe(fatal?'dead':'downed');if(fatal)expect({hunger:p.hunger,rest:p.rest}).toEqual(deathNeeds);continueExactly(w,60);
  }
});

test('capacities scale future edges, real work and ingestion; captured edges and saved fractions survive injury changes',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;controlledInjury(w,p,'left-leg',15000);controlledInjury(w,p,'left-hand',10000);
  const c=pawnBody(p).capacities;expect(c.moving).toBeLessThan(1);expect(c.manipulation).toBeLessThan(1);
  startTravel(w,p,{x:p.x+1,z:p.z+1});const captured=structuredClone(p.motion!);expect(captured.end-captured.start).toBeCloseTo(3*Math.SQRT2/c.moving,9);
  controlledInjury(w,p,'right-leg',1000);expect(p.motion).toEqual(captured);continueExactly(w,20);
  expect(physicalWorkFactor(p,'build')).toBeCloseTo(pawnBody(p).capacities.manipulation,9);
  controlledInjury(w,p,'left-eye',5000);expect(physicalWorkFactor(p,'build')).toBeGreaterThan(physicalWorkFactor(p,'mine'));
  p.priorities.gather=1;w.resources.push({id:w.nextId++,kind:'tree',x:p.x+1,z:p.z,amount:12});expect(applyCommand(w,{type:'designate',kind:'chop',x:p.x+1,z:p.z}).ok).toBe(true);
  until(w,()=>p.state==='working');const job=w.jobs[0]!,progress=workProgress(job),factor=physicalWorkFactor(p,'plant');stepWorld(w);expect(workProgress(job)-progress).toBeCloseTo(Math.round(factor*10000)/10000,8);continueExactly(w,30);
  const food=medicalCamp(),eater=food.pawns[0]!;eater.hunger=10;controlledInjury(food,eater,'jaw',5000);controlledInjury(food,eater,'left-hand',5000);
  const pile={id:food.nextId++,kind:'food' as const,item:'legacy-portion' as const,quantity:1,owner:{type:'pawn' as const,pawnId:eater.id}};food.piles.push(pile);refreshStock(food);
  eater.need={kind:'eat',phase:'ingest',sourcePileId:pile.id,carryPileId:pile.id,quantity:1,progress:0,dining:{target:{x:eater.x,z:eater.z},tableId:null,seatId:null}};eater.state='eating';
  const expected=physicalEatingFactor(eater),context={search:()=>null,move:()=>{throw Error('Unexpected travel');},release:()=>{throw Error('Unexpected release');},event:()=>{}};
  processEating(food,eater,context);expect(workProgress(eater.need)).toBeCloseTo(Math.round(expected*10000)/10000,9);valid(food);const task=eater.need;
  controlledInjury(food,eater,'left-leg',30000);controlledInjury(food,eater,'right-leg',30000);expect(eater.need).toBeNull();expect(task.progress).toBe(0);expect(food.piles[0]!.owner.type).toBe('ground');expect(eater.hunger).toBe(10);continueExactly(food,80);expect(food.piles).toHaveLength(1);
});

test('blood loss, recovery, true sleep and irreversible death respect world time, cognition and bed use',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;p.health=createMedicalRecord(w.tick);p.health.bloodLoss=.61*BLOOD_UNIT;updatePawnHealth(w,p);expect(p.state).toBe('downed');const joy=structuredClone(p.recreation),rest=p.rest;
  stepWorld(w,10);expect(p.recreation).toEqual(joy);expect(p.rest).toBeLessThan(rest);expect(p.medicalSleep).toBeUndefined();
  p.rest=50;stepWorld(w);expect(p.medicalSleep).toBe(true);expect(p.rest).toBeGreaterThan(50);continueExactly(w,180);until(w,()=>p.state!=='downed',1500);expect(p.medicalSleep).toBeUndefined();
  const bedWorld=medicalCamp(),sleeper=bedWorld.pawns[0]!,bed=fixtureBuilding(bedWorld,'bed',sleeper.x,sleeper.z);sleeper.bedId=bed.id;sleeper.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:bed.x,z:bed.z}};sleeper.state='sleeping';sleeper.rest=50;
  controlledInjury(bedWorld,sleeper,'left-leg',30000);controlledInjury(bedWorld,sleeper,'right-leg',30000);expect(sleeper.need).toMatchObject({bedId:bed.id});continueExactly(bedWorld,20);
  expect(applyCommand(bedWorld,{type:'assign-bed',bedId:bed.id,pawnId:null}).ok).toBe(true);expect(sleeper.state).toBe('downed');valid(bedWorld);
  const bleeding=medicalCamp(),patient=bleeding.pawns[0]!;patient.hunger=0;controlledInjury(bleeding,patient,'torso',10000,'cut');patient.health!.bloodLoss=.99*BLOOD_UNIT;expect(medicalBleed(patient.health!)).toBe(.6);updatePawnHealth(bleeding,patient);until(bleeding,()=>patient.state==='dead',120);const record=structuredClone(patient.health),need=patient.hunger;continueExactly(bleeding,200);expect(patient.health).toEqual(record);expect(patient.hunger).toBe(need);
});

test('strict V44 migration adds no injury; malformed records, clock, states and activity are rejected before replacement',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;const old=structuredClone(w);old.schemaVersion=44 as typeof old.schemaVersion;withoutMedicalWork(old);const migrated=deserializeWorld(JSON.stringify(old));expect(migrated).toEqual({...old,schemaVersion:53,pawns:old.pawns.map(p=>({...p,skills:{...p.skills,medicine:{level:8,xp:0,dailyXp:0,passion:0}},priorities:{...p.priorities,doctor:1,patient:1,bedrest:3}}))});
  controlledInjury(w,p,'left-leg',30000);controlledInjury(w,p,'right-leg',30000);valid(w);
  const edits=[(q:World)=>q.pawns[0]!.health!.tick--,(q:World)=>q.pawns[0]!.state='idle',(q:World)=>q.pawns[0]!.health!.missing.push({...q.pawns[0]!.health!.missing[0]!}),(q:World)=>{q.pawns[0]!.health=undefined;},(q:World)=>{q.schemaVersion=44 as typeof q.schemaVersion;}];
  for(const edit of edits){const bad=structuredClone(w);edit(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
  const noHands=medicalCamp(),h=noHands.pawns[0]!;controlledInjury(noHands,h,'left-shoulder',30000);controlledInjury(noHands,h,'right-shoulder',30000);expect(pawnBody(h).capacities.manipulation).toBe(0);h.priorities.gather=1;noHands.resources.push({id:noHands.nextId++,kind:'tree',x:h.x+1,z:h.z,amount:12});expect(applyCommand(noHands,{type:'designate',kind:'chop',x:h.x+1,z:h.z}).ok).toBe(true);expect(applyCommand(noHands,{type:'order-job',pawnId:h.id,jobId:noHands.jobs[0]!.id,queue:false}).ok).toBe(false);continueExactly(noHands,100);expect(noHands.resources).toHaveLength(1);
  const fatal=medicalCamp();injurePawn(fatal,fatal.pawns[0]!,'heart','cut',15000);valid(fatal);continueExactly(fatal,10);
});
