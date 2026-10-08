import { expect,test } from 'vitest';
import { stepWorld } from '../src/sim/engine.ts';
import { newDoorState } from '../src/sim/door-rules.ts';
import { groundCapacity,groundPile,nearbyGround } from '../src/sim/ground-placement.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { adoptPrisonBreaks,advancePrisonBreaks,endPrisonBreak,prisonBreakMtbDays,reconcilePrisonBreaks,startPrisonBreak } from '../src/sim/prison-break.ts';
import { PRISON_BREAK_CHECK_INTERVAL,nextPrisonBreakRandom,prisonBreakActive,prisonBreakHistoryFactor,prisonBreakMeleeOwned,seedPrisonBreak } from '../src/sim/prison-break-state.ts';
import { createPrisonerState } from '../src/sim/prisoner-state.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import type { Pawn,Structure,World } from '../src/sim/types.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { recruitmentUiFixture } from './scenarios/prison-camp.ts';

function fixture() {
  const {world:w,actorId,patientId,bedId}=recruitmentUiFixture();
  const p=w.pawns.find(p=>p.id===patientId)!,actor=w.pawns.find(p=>p.id===actorId)!,bed=w.structures.find(b=>b.id===bedId)!;
  p.prisoner!.mode='maintain';adoptPrisonBreaks(w);return {w,p,actor,bed};
}
function prisoner(w:World,original:Pawn,x:number,z:number):Pawn {
  const p=structuredClone(original);p.id=w.nextId++;p.name=`Détenu ${p.id}`;p.x=x;p.z=z;p.bedId=null;
  p.prisoner=createPrisonerState(w,p);p.need=null;p.path=[];p.moveCooldown=0;p.motion=null;p.state='idle';
  w.pawns.push(p);adoptPrisonBreaks(w);return p;
}
function extraRoom(w:World,x:number,z:number):void {
  for(let dz=0;dz<5;dz++)for(let dx=0;dx<5;dx++)if(dx===0||dx===4||dz===0||dz===4) {
    const door=dx===0&&dz===2,s:Structure=fixtureBuilding(w,door?'door':'wall',x+dx,z+dz);s.material='wood';if(door)s.door=newDoorState(w.tick);
  }
  const bed:Structure=fixtureBuilding(w,'bed',x+2,z+2);bed.prisoner=true;
}
function carriedMeal(w:World,p:Pawn) {
  const meal={id:w.nextId++,kind:'food' as const,item:'survival-meal' as const,quantity:1,owner:{type:'pawn' as const,pawnId:p.id}};
  w.piles.push(meal);p.state='eating';p.need={kind:'eat',phase:'ingest',sourcePileId:meal.id,carryPileId:meal.id,quantity:1,progress:7,dining:{target:{x:p.x,z:p.z},seatId:null,tableId:null}};
  return meal;
}
function fillFloor(w:World,p:Pawn):void {
  for(const c of nearbyGround(w,p))if(!groundPile(w,c)&&groundCapacity(w,c,'survival-meal',p.id)>0)
    w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:1,owner:{type:'ground',...c}});
}

test('adoption seeds a sparse private stream once without inventing participation or changing existing RNGs',()=>{
  const {w,p}=fixture();delete p.prisoner!.breakout;
  const rng=w.rng,prisonerRng=p.prisoner!.rng,next=w.nextId;adoptPrisonBreaks(w);
  expect(p.prisoner!.breakout).toEqual({rng:seedPrisonBreak(w.seed,p.id,p.prisoner!.capturedAt)});
  const state=p.prisoner!.breakout;adoptPrisonBreaks(w);expect(p.prisoner!.breakout).toBe(state);
  expect(w.rng).toBe(rng);expect(p.prisoner!.rng).toBe(prisonerRng);expect(w.nextId).toBe(next);expect(w.events).toEqual([]);
});

test('the Core history curve is linear at both intervals and clamps beyond ten days',()=>{
  for(const [days,factor] of [[-1,20],[0,20],[2.5,10.75],[5,1.5],[7.5,1.25],[10,1],[100,1]])expect(prisonBreakHistoryFactor(days!)).toBe(factor);
});

test('MTB uses current moving capacity and distinct external doors rather than every doorway',()=>{
  const {w,p}=fixture();expect(prisonBreakMtbDays(w,p)).toBe(60);
  p.health=createMedicalRecord(w.tick);p.health.missing=[{part:'left-leg',bornAt:w.tick-2000,tended:true}];
  expect(prisonBreakMtbDays(w,p)).toBe(120);delete p.health;
  w.structures=w.structures.filter(s=>s.x!==12||s.z!==10);
  const exit:Structure=fixtureBuilding(w,'door',12,10);exit.material='wood';exit.door=newDoorState(w.tick);
  expect(prisonBreakMtbDays(w,p)).toBe(30);
  const internal:Structure=fixtureBuilding(w,'door',10,9);internal.material='wood';internal.door=newDoorState(w.tick);
  expect(prisonBreakMtbDays(w,p)).toBe(30);
  p.prisoner!.breakout!.lastAt=w.tick;expect(prisonBreakMtbDays(w,p)).toBe(600);
  w.tick+=5*6000;expect(prisonBreakMtbDays(w,p)).toBe(45);w.tick+=5*6000;expect(prisonBreakMtbDays(w,p)).toBe(30);
});

test('initiation requires an awake mobile prisoner in a prison cell; collective admission may wake a sleeper',()=>{
  const {w,p,actor,bed}=fixture();p.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:p.x,z:p.z}};p.state='sleeping';
  expect(prisonBreakMtbDays(w,p)).toBe(-1);expect(prisonBreakMtbDays(w,p,true)).toBe(60);expect(startPrisonBreak(w,p)).toBe(false);
  p.need=null;p.state='downed';expect(prisonBreakMtbDays(w,p,true)).toBe(-1);p.state='idle';
  actor.rescue={patientId:p.id,bedId:bed.id,phase:'carry'};expect(prisonBreakMtbDays(w,p)).toBe(-1);delete actor.rescue;
  p.x=20;expect(prisonBreakMtbDays(w,p)).toBe(-1);p.x=10;
  p.prisoner!.releasedAt=w.tick;expect(prisonBreakMtbDays(w,p)).toBe(-1);
});

test('a start wakes and interrupts all admissible residents of the initiating cell without changing their identities',()=>{
  const {w,p,bed}=fixture(),sleeper=prisoner(w,p,11,10),rng=w.rng,prisonerRng=p.prisoner!.rng,next=w.nextId;
  sleeper.state='sleeping';sleeper.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:sleeper.x,z:sleeper.z}};
  const skills=sleeper.skills,prisonerState=sleeper.prisoner;sleeper.path=[{x:11,z:9}];
  expect(startPrisonBreak(w,p)).toBe(true);expect(prisonBreakActive(p)).toBe(true);expect(prisonBreakActive(sleeper)).toBe(true);
  expect(sleeper.prisoner).toBe(prisonerState);expect(sleeper.skills).toBe(skills);expect(w.pawns).toContain(sleeper);
  expect(sleeper.need).toBeNull();expect(sleeper.state).toBe('idle');expect(sleeper.path).toEqual([]);
  for(const pawn of [p,sleeper])expect(pawn.prisoner!.breakout).toMatchObject({lastAt:w.tick,active:{startedAt:w.tick,initiatorId:p.id}});
  expect(w.rng).toBe(rng);expect(p.prisoner!.rng).toBe(prisonerRng);expect(w.nextId).toBe(next);expect(w.events).toHaveLength(1);
});

test('a nearby separate prison room is retained by the initiator private 50 percent draw',()=>{
  for(const [rng,joins] of [[1,true],[8192,false]] as const) {
    const {w,p}=fixture();extraRoom(w,18,8);const neighbour=prisoner(w,p,20,10);p.prisoner!.breakout!.rng=rng;
    expect(nextPrisonBreakRandom(rng).value<.5).toBe(joins);expect(startPrisonBreak(w,p)).toBe(true);
    expect(prisonBreakActive(neighbour)).toBe(joins);expect(p.prisoner!.breakout!.rng).toBe(nextPrisonBreakRandom(rng).rng);
  }
});

test('same-room admission is deterministic while a remote prison and incapacitated people remain detained',()=>{
  const {w,p}=fixture(),same=prisoner(w,p,11,10),downed=prisoner(w,p,9,11);downed.state='downed';
  extraRoom(w,25,25);const distant=prisoner(w,p,27,27);p.prisoner!.breakout!.rng=1;
  expect(startPrisonBreak(w,p)).toBe(true);expect(prisonBreakActive(same)).toBe(true);
  expect(prisonBreakActive(downed)).toBe(false);expect(prisonBreakActive(distant)).toBe(false);expect(downed.state).toBe('downed');
});

test('a carried meal is deposited with its identity before escape; food is neither consumed nor duplicated',()=>{
  const {w,p}=fixture(),meal=carriedMeal(w,p),hunger=p.hunger;
  expect(startPrisonBreak(w,p)).toBe(true);expect(p.need).toBeNull();expect(w.piles.filter(q=>q.id===meal.id)).toEqual([meal]);
  expect(meal.owner.type).toBe('ground');expect(meal.quantity).toBe(1);expect(p.hunger).toBe(hunger);expect(p.interruptedCargo).toBeUndefined();
});

test('a full-floor initiator keeps its meal, claims and private lottery unchanged when start cannot commit',()=>{
  const {w,p}=fixture(),meal=carriedMeal(w,p);fillFloor(w,p);
  const before=structuredClone(w),state=p.prisoner!.breakout,need=p.need;
  expect(startPrisonBreak(w,p)).toBe(false);expect(w).toEqual(before);expect(p.need).toBe(need);expect(p.prisoner!.breakout).toBe(state);
  expect(meal.owner).toEqual({type:'pawn',pawnId:p.id});expect(prisonBreakActive(p)).toBe(false);
});

test('an obstructed secondary participant remains eating while a released initiator starts alone',()=>{
  const {w,p}=fixture(),other=prisoner(w,p,11,10),meal=carriedMeal(w,other);fillFloor(w,other);
  expect(startPrisonBreak(w,p)).toBe(true);expect(prisonBreakActive(p)).toBe(true);expect(prisonBreakActive(other)).toBe(false);
  expect(other.need).toMatchObject({kind:'eat',phase:'ingest',progress:7});expect(meal.owner).toEqual({type:'pawn',pawnId:other.id});
});

test('starting cancels targeted warden and care claims without touching an unrelated patient or confiscating apparel',()=>{
  const {w,p,actor,bed}=fixture(),doctor=w.pawns.find(q=>q!==p&&q!==actor)!;
  actor.ward={kind:'chat',patientId:p.id,spot:{x:actor.x,z:actor.z},phase:'approach',progress:0,rapports:0};
  doctor.rescue={patientId:p.id,bedId:bed.id,phase:'approach'};
  const possessions=w.piles.map(q=>[q.id,q.owner.type,q.quantity]);
  expect(startPrisonBreak(w,p)).toBe(true);expect(actor.ward).toBeUndefined();expect(doctor.rescue).toBeUndefined();
  expect(w.piles.map(q=>[q.id,q.owner.type,q.quantity])).toEqual(possessions);expect(p.faction).toBe('outlaws');
});

test('a committed edge and recovery survive both participation and termination, with last participation retained',()=>{
  const {w,p}=fixture();p.motion={from:{x:9,z:10},to:{x:10,z:10},start:w.tick-1,end:w.tick+2};p.moveCooldown=2;
  p.melee={order:null,strike:{targetId:w.pawns[0]!.id,atCore:w.tick*10-5,untilCore:w.tick*10+35,tool:'left-fist',outcome:'hit'}};
  const edge=p.motion,strike=p.melee.strike;expect(startPrisonBreak(w,p)).toBe(true);expect(p.motion).toBe(edge);expect(p.melee!.strike).toBe(strike);
  p.melee!.order={targetId:w.pawns[0]!.id,startedDowned:false,auto:'prison-break'};p.prisoner!.escape={x:0,z:10};p.path=[{x:9,z:10}];
  endPrisonBreak(w,p);expect(prisonBreakActive(p)).toBe(false);expect(p.prisoner!.breakout!.lastAt).toBe(w.tick);
  expect(p.melee).toEqual({order:null,strike});expect(p.motion).toBe(edge);expect(p.moveCooldown).toBe(2);expect(p.path).toEqual([]);expect(p.prisoner!.escape).toBeUndefined();
});

test('only a live active escape mandate owns prison-break melee, and reconciliation ends medical incapacity or release',()=>{
  for(const reason of ['downed','dead','released','removed'] as const) {
    const {w,p}=fixture(),order={targetId:w.pawns[0]!.id,startedDowned:false,auto:'prison-break' as const};
    expect(prisonBreakMeleeOwned(w,p,order)).toBe(false);expect(startPrisonBreak(w,p)).toBe(true);p.melee={order,strike:null};
    expect(prisonBreakMeleeOwned(w,p,order)).toBe(true);
    const state=p.prisoner!.breakout;
    if(reason==='released')p.prisoner!.releasedAt=w.tick;else if(reason==='removed')delete p.prisoner;else p.state=reason;
    reconcilePrisonBreaks(w);expect(prisonBreakActive(p)).toBe(false);expect(p.melee).toBeUndefined();expect(state!.lastAt).toBe(w.tick);
    expect(prisonBreakMeleeOwned(w,p,order)).toBe(false);
  }
});

test('the stable hash phase samples its private lottery once on a played check and starts the selected episode',()=>{
  const {w,p}=fixture(),rng=w.rng,prisonerRng=p.prisoner!.rng;
  p.prisoner!.breakout!.rng=1;w.tick+=((p.id-w.tick%PRISON_BREAK_CHECK_INTERVAL+PRISON_BREAK_CHECK_INTERVAL)%PRISON_BREAK_CHECK_INTERVAL)-1;
  advancePrisonBreaks(w);expect(p.prisoner!.breakout!.rng).toBe(1);expect(prisonBreakActive(p)).toBe(false);
  w.tick++;advancePrisonBreaks(w);expect(prisonBreakActive(p)).toBe(true);expect(p.prisoner!.breakout!.rng).toBe(nextPrisonBreakRandom(1).rng);
  expect(w.rng).toBe(rng);expect(p.prisoner!.rng).toBe(prisonerRng);
});

test('repeated start and a non-prisoner refuse without redrawing or minting IDs, while old schemas remain neutral',()=>{
  const {w,p,actor}=fixture();expect(startPrisonBreak(w,actor)).toBe(false);expect(startPrisonBreak(w,p)).toBe(true);
  const before=structuredClone(w);expect(startPrisonBreak(w,p)).toBe(false);expect(w).toEqual(before);
  const old=fixture().w;for(const q of old.pawns)if(q.prisoner)delete q.prisoner.breakout;
  (old as unknown as {schemaVersion:number}).schemaVersion=203;const original=structuredClone(old);
  adoptPrisonBreaks(old);advancePrisonBreaks(old);expect(old).toEqual(original);expect(startPrisonBreak(old,old.pawns.find(q=>q.prisoner)!)).toBe(false);
});

test('saving before the next hash check preserves stream, activation and the played continuation',()=>{
  const {w,p}=fixture();p.prisoner!.breakout!.rng=1;
  w.tick+=((p.id-w.tick%PRISON_BREAK_CHECK_INTERVAL+PRISON_BREAK_CHECK_INTERVAL)%PRISON_BREAK_CHECK_INTERVAL)-1;
  expect(validateWorld(w)).toEqual([]);const resumed=deserializeWorld(serializeWorld(w));
  stepWorld(w,3);stepWorld(resumed,3);expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  expect(prisonBreakActive(p)).toBe(true);expect(p.prisoner!.breakout!.lastAt).toBe(p.prisoner!.breakout!.active!.startedAt);
});
