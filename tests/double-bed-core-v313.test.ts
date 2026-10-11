import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { bedAssignmentReason,bedSlotCell,bedSlotBodyCenter,bedSlotClaimed,bedSlotForPatient,bedSlotsCount,civilBedShareAllowed,pawnBedSlot } from '../src/sim/bed-slots.ts';
import { blockedCells,reachableCells } from '../src/sim/pathfinding.ts';
import { processSleeping } from '../src/sim/sleeping.ts';
import { collapseFromExhaustion,processNeeds,type NeedContext } from '../src/sim/needs.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import { COMPLEX_FURNITURE_RESEARCH_COST } from '../src/sim/research.ts';
import { medicalCamp } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { exhaustedCarrier } from './scenarios/interrupted-cargo.ts';
import type { Cell,Pawn,Structure,World } from '../src/sim/types.ts';

function camp(orientation:0|1|2|3=0,count=2){
  const w=medicalCamp(count),bed:Structure=fixtureBuilding(w,'double-bed',10,10,orientation);
  Object.assign(bed,{material:'wood',quality:'normal'});
  w.research={points:0,project:null,complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:w.tick}};
  for(const [index,p] of w.pawns.entries()){
    Object.assign(p,{x:5+index*10,z:10,rest:10,hunger:100,needCooldown:0,planCooldown:0});p.schedule.fill('anything');
  }
  return {w,bed,a:w.pawns[0]!,b:w.pawns[1]!};
}
function context(w:World,p:Pawn,onSearch?:(goals?:ReadonlySet<number>)=>void):NeedContext {
  return {search:goals=>{onSearch?.(goals);return reachableCells(w,p,blockedCells(w),new Set(),goals);},move:()=>{},release:()=>releaseWork(w,p),event:()=>{}};
}
function until(w:World,done:()=>boolean,max=240){
  for(let n=0;n<max&&!done();n++)stepWorld(w,1);
  expect(done(),`Real transition at tick ${w.tick}`).toBe(true);
}
function sleepTarget(p:Pawn):Cell|null{return p.need?.kind==='sleep'?p.need.target:null;}
function partner(w:World,a:Pawn,b:Pawn,kind:'lover'|'spouse'){
  w.relationships={links:[{kind,aId:Math.min(a.id,b.id),bId:Math.max(a.id,b.id),recordedAt:w.tick}]};
}
function posture(p:Pawn){return structuredClone({bedId:p.bedId,bedSlot:p.bedSlot,need:p.need,motion:p.motion,path:p.path,state:p.state,rest:p.rest});}

test.each([
  {orientation:0 as const,heads:[{x:10,z:10},{x:11,z:10}],centers:[{x:10,z:10.5},{x:11,z:10.5}]},
  {orientation:1 as const,heads:[{x:10,z:10},{x:10,z:9}],centers:[{x:10.5,z:10},{x:10.5,z:9}]},
  {orientation:2 as const,heads:[{x:10,z:10},{x:9,z:10}],centers:[{x:10,z:9.5},{x:9,z:9.5}]},
  {orientation:3 as const,heads:[{x:10,z:10},{x:10,z:11}],centers:[{x:9.5,z:10},{x:9.5,z:11}]},
])('two nonpartner owners arrive and rest on distinct real heads, orientation $orientation',({orientation,heads,centers})=>{
  const {w,bed,a,b}=camp(orientation),rng=w.rng;
  expect(bedSlotsCount(bed)).toBe(2);expect(bedSlotCell(bed,0)).toEqual(heads[0]);expect(bedSlotCell(bed,1)).toEqual(heads[1]);
  expect(bedSlotBodyCenter(bed,0)).toEqual(centers[0]);expect(bedSlotBodyCenter(bed,1)).toEqual(centers[1]);
  expect(applyCommand(w,{type:'assign-bed',bedId:bed.id,pawnId:a.id,slot:0}).ok).toBe(true);
  expect(applyCommand(w,{type:'assign-bed',bedId:bed.id,pawnId:b.id,slot:1}).ok).toBe(true);expect(w.rng).toBe(rng);
  expect(validateWorld(w)).toEqual([]);
  until(w,()=>[a,b].every(p=>p.need?.kind==='sleep'&&p.need.phase==='sleep'&&p.moveCooldown===0));
  expect(sleepTarget(a)).toEqual(heads[0]);expect(sleepTarget(b)).toEqual(heads[1]);
  expect({x:a.x,z:a.z}).toEqual(heads[0]);expect({x:b.x,z:b.z}).toEqual(heads[1]);
  const rest=[a.rest,b.rest];stepWorld(w,4);expect(a.rest).toBeGreaterThan(rest[0]!);expect(b.rest).toBeGreaterThan(rest[1]!);
  expect([a.bedSlot,b.bedSlot]).toEqual([0,1]);expect(validateWorld(w)).toEqual([]);
});

test('replacing or clearing slot0 leaves the slot1 sleeper and captured motion unchanged',()=>{
  const {w,bed,a,b}=camp(0,3),incoming=w.pawns[2]!;
  expect(applyCommand(w,{type:'assign-bed',bedId:bed.id,pawnId:a.id,slot:0}).ok).toBe(true);
  expect(applyCommand(w,{type:'assign-bed',bedId:bed.id,pawnId:b.id,slot:1}).ok).toBe(true);
  until(w,()=>[a,b].every(p=>p.need?.kind==='sleep'&&p.need.phase==='sleep'));
  const sibling=posture(b);
  const old=fixtureBuilding(w,'bed',16,16);incoming.bedId=old.id;
  expect(applyCommand(w,{type:'assign-bed',bedId:bed.id,pawnId:incoming.id,slot:0}).ok).toBe(true);
  expect(a.bedId).toBeNull();expect(a.bedSlot).toBeUndefined();expect(a.need).toBeNull();
  expect(incoming.bedId).toBe(bed.id);expect(incoming.bedSlot).toBe(0);expect(posture(b)).toEqual(sibling);
  expect(applyCommand(w,{type:'assign-bed',bedId:bed.id,pawnId:null,slot:0}).ok).toBe(true);
  expect(incoming.bedId).toBeNull();expect(incoming.bedSlot).toBeUndefined();expect(posture(b)).toEqual(sibling);
  expect(applyCommand(w,{type:'assign-bed',bedId:bed.id,pawnId:b.id,slot:1}).ok).toBe(true);expect(posture(b)).toEqual(sibling);
});

test('removing the first owner does not renumber the remaining durable place',()=>{
  const {w,bed,a,b}=camp();a.bedId=bed.id;a.bedSlot=0;b.bedId=bed.id;b.bedSlot=1;
  until(w,()=>[a,b].every(p=>p.need?.kind==='sleep'&&p.need.phase==='sleep'));
  const target=structuredClone(sleepTarget(b)),rest=b.rest;
  // The projection now contains only the remaining on-map person. The slot
  // helper must not infer a new place from that person's owner-array rank.
  w.pawns=w.pawns.filter(p=>p.id!==a.id);
  processSleeping(w,b,context(w,b),false);
  expect(b.bedSlot).toBe(1);expect(sleepTarget(b)).toEqual(target);expect({x:b.x,z:b.z}).toEqual(target);
  expect(b.rest).toBeGreaterThan(rest);expect(bedSlotClaimed(w,bed,0)).toBe(false);
});

test.each(['lover','spouse'] as const)('only an actual %s may automatically join a partially owned bed',kind=>{
  const {w,bed,a,b}=camp();
  expect(applyCommand(w,{type:'assign-bed',bedId:bed.id,pawnId:a.id,slot:0}).ok).toBe(true);
  expect(civilBedShareAllowed(w,bed,b)).toBe(false);
  processSleeping(w,b,context(w,b),true);expect(b.bedId).toBeNull();expect(b.need?.kind==='sleep'&&b.need.bedId).toBeNull();
  releaseWork(w,b);b.needCooldown=0;partner(w,a,b,kind);const rng=w.rng;
  let searches=0;processSleeping(w,b,context(w,b,()=>searches++),true);
  expect(searches).toBe(1);expect(b.bedId).toBe(bed.id);expect(b.bedSlot).toBe(1);expect(sleepTarget(b)).toEqual({x:11,z:10});expect(w.rng).toBe(rng);
});

test('a valid own simple bed precedes partner sharing; an empty double admits one new owner at a time',()=>{
  const {w,bed,a,b}=camp();partner(w,a,b,'lover');a.bedId=bed.id;a.bedSlot=0;
  const own=fixtureBuilding(w,'bed',20,10);b.bedId=own.id;
  processSleeping(w,b,context(w,b),true);expect(b.bedId).toBe(own.id);expect(b.bedSlot).toBeUndefined();
  const empty=camp();let searches=0;
  processSleeping(empty.w,empty.a,context(empty.w,empty.a,()=>searches++),true);
  processSleeping(empty.w,empty.b,context(empty.w,empty.b,()=>searches++),true);
  expect(searches).toBe(2);expect(empty.a.bedId).toBe(empty.bed.id);expect(empty.b.bedId).toBeNull();
});

test('zone membership is checked at head1 before winner and before owned-goal search',()=>{
  const {w,bed,a,b}=camp();a.bedId=bed.id;a.bedSlot=0;b.bedId=bed.id;b.bedSlot=1;
  const inside=fixtureBuilding(w,'bed',20,10),id=w.nextId++;
  w.allowedAreas=[{id,label:'Tête0 seulement',color:0,cells:[bed.z*w.width+bed.x,inside.z*w.width+inside.x]}];b.allowedAreaId=id;
  let goals:ReadonlySet<number>|undefined,searches=0;
  processSleeping(w,b,context(w,b,g=>{goals=g;searches++;}),true);
  expect(goals).toBeUndefined();expect(searches).toBe(1);expect(b.bedId).toBe(inside.id);expect(b.bedSlot).toBeUndefined();
  expect(a.bedSlot).toBe(0);expect(sleepTarget(b)).toEqual({x:inside.x,z:inside.z});
});

test('automatic candidate head1 survives when head0 alone is forbidden',()=>{
  const {w,bed,a,b}=camp();a.bedId=bed.id;a.bedSlot=0;partner(w,a,b,'lover');
  const id=w.nextId++;w.allowedAreas=[{id,label:'Seconde tête',color:0,cells:[10*w.width+11]}];b.allowedAreaId=id;
  processSleeping(w,b,context(w,b),true);expect(b.bedSlot).toBe(1);expect(sleepTarget(b)).toEqual({x:11,z:10});
});

test('sleep gains no rest until the captured edge to its own head has finished',()=>{
  const {w,bed,a}=camp(),target=bedSlotCell(bed,1)!;a.bedId=bed.id;a.bedSlot=1;Object.assign(a,target);
  a.need={kind:'sleep',phase:'travel',bedId:bed.id,target};a.motion={from:{x:target.x-1,z:target.z},to:{...target},start:w.tick,end:w.tick+3};a.moveCooldown=3;
  const rest=a.rest;processSleeping(w,a,context(w,a),false);expect(a.rest).toBe(rest);expect(a.need.phase).toBe('travel');
  w.tick+=3;a.moveCooldown=0;processSleeping(w,a,context(w,a),false);expect(a.need.phase).toBe('sleep');expect(a.rest).toBeGreaterThan(rest);
});

test('collapse on owned head1 keeps that bed; the corresponding foot provides no bed bonus',()=>{
  const {w,bed,a,b}=camp();a.bedId=bed.id;a.bedSlot=0;b.bedId=bed.id;b.bedSlot=1;
  Object.assign(b,bedSlotCell(bed,1));b.collapsePending=true;collapseFromExhaustion(w,b,context(w,b));
  expect(b.need?.kind==='sleep'&&b.need.bedId).toBe(bed.id);expect(sleepTarget(b)).toEqual({x:11,z:10});
  releaseWork(w,b);b.z++;b.collapsePending=true;collapseFromExhaustion(w,b,context(w,b));
  expect(b.need?.kind==='sleep'&&b.need.bedId).toBeNull();expect(b.bedSlot).toBe(1);
});

test('rescue claims exclude their beneficiary and never exclude the carrier instead',()=>{
  const {w,bed,a,b}=camp(0,3),carrier=w.pawns[2]!;a.bedId=bed.id;a.bedSlot=0;b.bedId=bed.id;b.bedSlot=1;
  carrier.rescue={patientId:b.id,bedId:bed.id,bedSlot:1,phase:'approach'};
  expect(bedSlotClaimed(w,bed,1,b.id)).toBe(false);expect(bedSlotClaimed(w,bed,1,carrier.id)).toBe(true);
  expect(bedSlotClaimed(w,bed,0,b.id)).toBe(true);expect(bedSlotForPatient(w,bed,b,carrier.id)).toBe(1);
});

test('assign-bed rejects missing/double slot, occupied cargo release is atomic',()=>{
  const {w,bed,a}=camp(),simple=fixtureBuilding(w,'bed',20,10),before=structuredClone(w);
  expect(applyCommand(w,{type:'assign-bed',bedId:bed.id,pawnId:a.id}).ok).toBe(false);
  expect(applyCommand(w,{type:'assign-bed',bedId:simple.id,pawnId:a.id,slot:0}).ok).toBe(false);expect(w).toEqual(before);
  const full=exhaustedCarrier(),p=full.pawns[0]!,blocked=fixtureBuilding(full,'double-bed',p.x,p.z);p.bedId=blocked.id;p.bedSlot=0;
  Object.assign(blocked,{material:'wood',quality:'normal'});
  full.research={points:0,project:null,complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:full.tick}};
  collapseFromExhaustion(full,p,context(full,p));expect(p.interruptedCargo).toBeDefined();expect(p.need?.kind).toBe('sleep');
  const snapshot=structuredClone(full);
  expect(applyCommand(full,{type:'assign-bed',bedId:blocked.id,pawnId:null,slot:0}).ok).toBe(false);expect(full).toEqual(snapshot);
});

test('simple historical shape and an empty allowed area keep the same navigation and sleep target',()=>{
  const {w,a}=camp();w.structures=[];const simple=fixtureBuilding(w,'bed',10,10);a.bedId=simple.id;
  expect(bedSlotsCount(simple)).toBe(1);expect(bedSlotCell(simple,1)).toBeUndefined();expect(pawnBedSlot(a,simple)).toBe(0);
  const baseline=reachableCells(w,a,blockedCells(w),new Set());
  const id=w.nextId++;w.allowedAreas=[{id,label:'Vide',color:0,cells:[]}];a.allowedAreaId=id;
  const empty=reachableCells(w,a,blockedCells(w),new Set());expect(empty.parents).toEqual(baseline.parents);expect(empty.costs).toEqual(baseline.costs);
  processSleeping(w,a,context(w,a),true);expect(a.bedSlot).toBeUndefined();expect(sleepTarget(a)).toEqual({x:10,z:10});
  a.bedId=null;a.bedSlot=1;processNeeds(w,a,context(w,a));expect(Object.hasOwn(a,'bedSlot')).toBe(false);
});

test('manual nonpartner admission is civil only and rejects unsupported roles',()=>{
  const {w,bed,a,b}=camp();expect(bedAssignmentReason(w,bed,b,1)).toBeUndefined();
  b.prisoner={mode:'maintain'} as Pawn['prisoner'];expect(bedAssignmentReason(w,bed,b,1)).toContain('colon libre');delete b.prisoner;
  bed.medical=true;expect(bedAssignmentReason(w,bed,a,0)).toContain('civile');expect(bedSlotForPatient(w,bed,a,a.id)).toBeUndefined();
  delete bed.medical;bed.prisoner=true;expect(bedAssignmentReason(w,bed,a,0)).toContain('civile');
  expect(bedSlotCell({...bed,orientation:8} as unknown as Structure,0)).toBeUndefined();
});
