import { expect,test } from 'vitest';
import { newApparelState } from '../src/sim/apparel-rules.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { controlledInjury } from './scenarios/health.ts';
import { recruitmentUiFixture } from './scenarios/prison-camp.ts';
import { groundCapacity,groundPile,nearbyGround } from '../src/sim/ground-placement.ts';
import { addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import { mentalState } from '../src/sim/mental-state.ts';
import { startTravel } from '../src/sim/movement.ts';
import type { NeedContext } from '../src/sim/needs.ts';
import { blockedCells,reachableCells,routeToCell } from '../src/sim/pathfinding.ts';
import { capturePrisonTopology } from '../src/sim/prison-space.ts';
import { processPrisonerRelease,releaseProposal,releaseReady,startPrisonerRelease } from '../src/sim/prisoner-release.ts';
import { processRescue,reconcileRescues } from '../src/sim/rescue.ts';
import { carrierOf,syncPatient } from '../src/sim/rescue-state.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import type { Pawn,World } from '../src/sim/types.ts';

function fixture(){
  const f=recruitmentUiFixture(),w=f.world,a=w.pawns[0]!,p=w.pawns[2]!;
  a.priorities.warden=1;a.priorities.basic=0;p.prisoner!.mode='release';
  return {...f,w,a,p};
}
const reach=(w:World,a:Pawn)=>reachableCells(w,a,blockedCells(w),new Set());
function proposal(w:World,a:Pawn,p:Pawn){
  const result=releaseProposal(w,a,p,reach(w,a));expect(result).toBeDefined();
  if(!result)throw Error('Expected an accessible prisoner release');return result;
}
function context(w:World,a:Pawn):NeedContext {
  return {search:goals=>reachableCells(w,a,blockedCells(w),new Set(),goals),move:target=>{a.path=routeToCell(w,target,reach(w,a))??[];},
    release:()=>releaseWork(w,a),event:message=>w.events.push({tick:w.tick,type:'command',message})};
}
/** Prepare a pickup boundary only; the full-loop test below uses real travel. */
function pickUp(w:World,a:Pawn,p:Pawn){
  const next=proposal(w,a,p);startPrisonerRelease(a,next);
  a.x=p.x;a.z=p.z;a.path=[];a.moveCooldown=0;a.motion=null;
  processRescue(w,a,context(w,a));expect(a.rescue?.phase).toBe('carry');return next.task.release!;
}
function depositBoundary(w:World,a:Pawn){
  const target=a.rescue!.release!.drop;a.x=target.x;a.z=target.z;a.path=[];a.moveCooldown=0;a.motion=null;
  syncPatient(w,a);processRescue(w,a,context(w,a));
}
function valid(w:World){expect(validateWorld(w)).toEqual([]);}
function until(w:World,done:()=>boolean,limit=1200){
  for(let i=0;i<limit&&!done();i++)stepWorld(w);
  expect(done(),JSON.stringify({tick:w.tick,p:w.pawns.map(p=>({id:p.id,state:p.state,rescue:p.rescue,prisoner:p.prisoner,path:p.path})),events:w.events.slice(-4)})).toBe(true);
}

test('release chooses a deterministic outside deposit and independent edge without consuming RNG',()=>{
  const {w,a,p}=fixture(),before=structuredClone(w),one=proposal(w,a,p),two=proposal(w,a,p);
  expect(two).toEqual(one);expect(w).toEqual(before);
  expect(one.task).toMatchObject({patientId:p.id,bedId:0,phase:'approach'});
  expect(one.task.capture).toBeUndefined();
  const {drop,exit}=one.task.release!,map=capturePrisonTopology(w),room=map.at(drop.x,drop.z);
  expect(room).toMatchObject({kind:'space',touchesMapEdge:true});expect(map.at(exit.x,exit.z)).toBe(room);
  expect(drop).not.toEqual(exit);expect(exit.x===0||exit.z===0||exit.x===w.width-1||exit.z===w.height-1).toBe(true);
  expect(one.path.at(-1)).toEqual({x:p.x,z:p.z});
});

test('a closed forbidden exit and a map with no standing border postpone release',()=>{
  const first=fixture(),door=first.w.structures.find(s=>s.kind==='door')!;door.door!.forbidden=true;
  expect(releaseProposal(first.w,first.a,first.p,reach(first.w,first.a))).toBeUndefined();
  const second=fixture();
  for(let z=0;z<second.w.height;z++)for(let x=0;x<second.w.width;x++)if(!x||!z||x===second.w.width-1||z===second.w.height-1)second.w.tiles[z*second.w.width+x]!.terrain='water';
  expect(releaseProposal(second.w,second.a,second.p,reach(second.w,second.a))).toBeUndefined();
  expect(second.p.prisoner!.releasedAt).toBeUndefined();
});

test('BasicWorker can release with Warden disabled, but Manipulation still governs admission',()=>{
  const {w,a,p}=fixture();a.priorities.warden=0;a.priorities.basic=1;
  expect(releaseReady(w,a,p)).toBe(true);expect(proposal(w,a,p).task.release).toBeDefined();
  a.priorities.basic=0;expect(releaseReady(w,a,p)).toBe(false);a.priorities.basic=1;
  controlledInjury(w,a,'left-shoulder',30000);controlledInjury(w,a,'right-shoulder',30000);
  expect(releaseReady(w,a,p)).toBe(false);
});

test('downed, mentally unsettled, escaped and already released prisoners cannot be picked up again',()=>{
  const {w,a,p}=fixture();p.state='downed';expect(releaseReady(w,a,p)).toBe(false);p.state='idle';
  mentalState(p).crisis={kind:'sad-wander',age:0,target:null,waitUntil:w.tick+20};expect(releaseReady(w,a,p)).toBe(false);delete p.mental!.crisis;
  p.prisoner!.escape={x:0,z:10};expect(releaseReady(w,a,p)).toBe(false);delete p.prisoner!.escape;
  p.prisoner!.releasedAt=w.tick;expect(releaseReady(w,a,p)).toBe(false);
});

test('care and transport reservations exclude a second releasing worker',()=>{
  const {w,a,p}=fixture(),helper=w.pawns[1]!;helper.priorities.basic=1;
  helper.ward={kind:'chat',patientId:p.id,spot:{x:helper.x,z:helper.z},phase:'approach',progress:0,rapports:0};
  expect(releaseReady(w,a,p)).toBe(false);delete helper.ward;
  startPrisonerRelease(a,proposal(w,a,p));expect(releaseReady(w,helper,p)).toBe(false);
  expect(releaseWork(w,a)).toBe(true);expect(releaseReady(w,helper,p)).toBe(true);
});

test('pickup and actual deposit preserve the original prisoner, health, skills and clothing',()=>{
  const {w,a,p}=fixture();controlledInjury(w,p,'left-arm',1000);
  addGroundMaterial(w,'apparel',1,{x:17,z:16},'cloth-shirt');const shirt=w.piles.find(q=>q.item==='cloth-shirt')!;
  shirt.owner={type:'apparel',pawnId:p.id};shirt.apparel=newApparelState('cloth-shirt');refreshStock(w);
  const health=p.health,skills=p.skills,prisoner=p.prisoner,faction=p.faction,ids=w.pawns.map(q=>q.id),rng=w.rng;
  const destination=pickUp(w,a,p);expect(carrierOf(w,p.id)).toBe(a);expect(p.prisoner!.releasedAt).toBeUndefined();
  expect(p.bedId).not.toBeNull();expect(p.need).toBeNull();expect(p.path).toEqual([]);
  depositBoundary(w,a);
  expect(a.rescue).toBeUndefined();expect(w.pawns).toContain(p);expect(w.pawns.map(q=>q.id)).toEqual(ids);
  expect(p.prisoner).toBe(prisoner);expect(p.health).toBe(health);expect(p.skills).toBe(skills);expect(p.faction).toBe(faction);
  expect(w.piles.find(q=>q.id===shirt.id)).toBe(shirt);expect(shirt.owner).toEqual({type:'apparel',pawnId:p.id});
  expect(p.prisoner).toMatchObject({releasedAt:w.tick,escape:destination.exit});expect(p.bedId).toBeNull();expect(w.rng).toBe(rng);
  const events=w.events.length;processPrisonerRelease(w,a,context(w,a));expect(w.events).toHaveLength(events);
});

test('a carry waits until its captured edge has finished before release admission',()=>{
  const {w,a,p}=fixture(),destination=pickUp(w,a,p);
  // Explicit terminal-edge fixture: x/z already name the destination, while
  // its motion still owns the interval leading there.
  const from={x:a.x,z:a.z};a.x=destination.drop.x;a.z=destination.drop.z;
  a.motion={from,to:{...destination.drop},start:w.tick,end:w.tick+3};a.moveCooldown=3;syncPatient(w,a);
  processRescue(w,a,context(w,a));expect(p.prisoner!.releasedAt).toBeUndefined();expect(a.rescue?.phase).toBe('carry');
  w.tick+=3;a.moveCooldown=0;syncPatient(w,a);processRescue(w,a,context(w,a));
  expect(p.prisoner!.releasedAt).toBe(w.tick);expect(p.motion).toBeNull();
});

test.each(['cancel','downed','crisis','mode','destination'] as const)('interruption %s conserves the carried body and never grants release',cause=>{
  const {w,a,p}=fixture();pickUp(w,a,p);
  const next=a.path[0];expect(next).toBeDefined();if(!next)throw Error('Expected carry route');
  expect(startTravel(w,a,next)).toBe(true);a.path.shift();
  const position={x:p.x,z:p.z},motion=structuredClone(p.motion),cooldown=p.moveCooldown;
  if(cause==='cancel')releaseWork(w,a);
  if(cause==='downed')p.state='downed';
  if(cause==='crisis')mentalState(p).crisis={kind:'sad-wander',age:0,target:null,waitUntil:w.tick+20};
  if(cause==='mode')p.prisoner!.mode='maintain';
  if(cause==='destination')w.tiles[a.rescue!.release!.drop.z*w.width+a.rescue!.release!.drop.x]!.terrain='rock';
  reconcileRescues(w);
  expect(a.rescue).toBeUndefined();expect(p.prisoner!.releasedAt).toBeUndefined();
  expect({x:p.x,z:p.z}).toEqual(position);expect(p.motion).toEqual(motion);expect(p.moveCooldown).toBe(cooldown);expect(w.pawns).toContain(p);
});

test('a pending body cannot be marked released when patient cargo has no physical drop space',()=>{
  const {w,a,p}=fixture();startPrisonerRelease(a,proposal(w,a,p));a.x=p.x;a.z=p.z;a.path=[];
  const meal={id:w.nextId++,kind:'food' as const,item:'survival-meal' as const,quantity:1,owner:{type:'pawn' as const,pawnId:p.id}};w.piles.push(meal);
  // Fill only legitimate nearby drop cells; the prison and its exit keep
  // their original topology, so it is cargo conservation that defers pickup.
  for(const c of nearbyGround(w,p))if(!groundPile(w,c)&&groundCapacity(w,c,'survival-meal',p.id)>0)
    w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:1,owner:{type:'ground',...c}});
  processPrisonerRelease(w,a,context(w,a));
  expect(a.rescue?.phase).toBe('approach');expect(p.prisoner!.releasedAt).toBeUndefined();
  expect(meal.owner).toEqual({type:'pawn',pawnId:p.id});expect(w.pawns).toContain(p);
});

test('the complete release travels through the prison door, resumes in carry and exits once with clothing',()=>{
  const {w,a,p}=fixture();addGroundMaterial(w,'apparel',1,{x:17,z:16},'cloth-shirt');
  const shirt=w.piles.find(q=>q.item==='cloth-shirt')!;shirt.owner={type:'apparel',pawnId:p.id};shirt.apparel=newApparelState('cloth-shirt');refreshStock(w);
  expect(applyCommand(w,{type:'prisoner-mode',patientId:p.id,mode:'release'})).toEqual({ok:true});
  until(w,()=>a.rescue?.phase==='carry'&&a.moveCooldown>0);valid(w);
  const restored=deserializeWorld(serializeWorld(w));stepWorld(w,4);stepWorld(restored,4);expect(serializeWorld(restored)).toBe(serializeWorld(w));
  until(w,()=>p.prisoner!.releasedAt!==undefined);const releasedAt=p.prisoner!.releasedAt;
  expect(w.pawns).toContain(p);expect(p.x>0&&p.z>0&&p.x<w.width-1&&p.z<w.height-1).toBe(true);valid(w);
  until(w,()=>!w.pawns.includes(p));expect(w.prisonDepartures).toHaveLength(1);
  expect(w.prisonDepartures![0]).toMatchObject({pawnId:p.id,reason:'released',releasedAt,items:[{id:shirt.id}]});
  stepWorld(w,30);expect(w.prisonDepartures).toHaveLength(1);valid(w);
});
