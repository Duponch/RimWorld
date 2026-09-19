import { SCHEMA_VERSION } from '../src/sim/types';
import { expect,test } from 'vitest';
import { stepWorld,applyCommand,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { disturbanceEvents } from '../src/sim/disturbance';
import { sleepBlocked,lyingBlocked } from '../src/sim/disturbance-state';
import { medicalCamp,controlledInjury } from './scenarios/health';
import { fixtureBuilding } from './scenarios/deconstruction';
import { exhaustedCarrier } from './scenarios/interrupted-cargo';
import { encounterCamp } from './scenarios/encounter';
import { newDoorState } from '../src/sim/door-rules';
import { revolverProfile } from '../src/sim/ranged-statistics';
import { HP_UNIT } from '../src/sim/injury-rules';
import { registerWorldProjectile } from '../src/sim/projectile-system';
import { createBulletFlight } from '../src/sim/bullet-flight';
import type { Pawn,World } from '../src/sim/types';

function sleep(p:Pawn){p.need={kind:'sleep',phase:'sleep',bedId:null,target:{x:p.x,z:p.z}};p.state='sleeping';p.rest=10;p.schedule.fill('sleep');}
function run(w:World,n:number){for(let i=0;i<n;i++){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}}
function resume(w:World,n:number){const loaded=deserializeWorld(serializeWorld(w));run(w,n);run(loaded,n);expect(loaded).toEqual(w);}
function incoming(w:World,cell:{x:number;z:number}){
  return registerWorldProjectile(w,createBulletFlight({origin:{x:cell.x+.5,z:cell.z+.5},destination:{x:cell.x+.6,z:cell.z+.5},speedPerCoreTick:revolverProfile('normal').projectileTilesPerCoreTick,launcherKey:`pawn:${w.pawns.at(-1)!.id}`,intendedKey:null,usedKey:null,equipmentKey:null,flags:0,preventFriendlyFire:false}),'normal',{friendlyPawnIds:[],friendlyFireFactor:1});
}

test('real ground impact wakes a sleeper, retains rest and resumes the exact deadline after load',()=>{
  const w=medicalCamp(2),p=w.pawns[0];Object.assign(p,{x:8,z:8});sleep(p);const rest=p.rest;
  incoming(w,{x:9,z:8});run(w,1);
  expect(p.state).not.toBe('sleeping');expect(p.need).toBeNull();expect(p.rest).toBeLessThanOrEqual(rest);
  expect(p.disturbance).toEqual({sleepUntilCore:(w.tick-1)*10+1001,lieUntilCore:0});
  expect(w.events.some(e=>e.message.includes('impact'))).toBe(true);resume(w,50);expect(sleepBlocked(w,p)).toBe(true);
  run(w,55);expect(p.state).toBe('sleeping');const resumed=p.rest;run(w,10);expect(p.rest).toBeGreaterThan(resumed);
});

test('noise uses hearing, strict radius, connected air and current doors, not a wall-crossing circle or line of sight',()=>{
  const w=medicalCamp(5),[inside,outside,boundary,deaf,around]=w.pawns;
  for(const [p,x,z] of [[inside,8,8],[outside,14,8],[boundary,20,8],[deaf,8,9],[around,8,14]] as const){Object.assign(p,{x,z});sleep(p);}
  controlledInjury(w,deaf,'left-ear',20*HP_UNIT);controlledInjury(w,deaf,'right-ear',20*HP_UNIT);sleep(deaf);
  for(let z=0;z<w.height;z++)if(z!==8)fixtureBuilding(w,'wall',12,z);
  const door=Object.assign(fixtureBuilding(w,'door',12,8),{material:'wood' as const,door:newDoorState(w.tick)});
  fixtureBuilding(w,'wall',8,11); // sound travels around this local obstacle
  disturbanceEvents(w).impact({x:8,z:8},w.tick*10);
  expect(inside.need).toBeNull();expect(around.need).toBeNull();expect(outside.state).toBe('sleeping');expect(boundary.state).toBe('sleeping');expect(deaf.state).toBe('sleeping');
  Object.assign(door.door,{open:true,from:1,holdOpen:true});disturbanceEvents(w).impact({x:8,z:8},w.tick*10);
  expect(outside.need).toBeNull();expect(boundary.need?.kind).toBe('sleep');expect(deaf.disturbance).toBeUndefined();
  expect(validateWorld(w)).toEqual([]);resume(w,10);
});

test('awake medical rest ignores noise; the shared damage signal leaves the bed without curing injury and delays lying down only',()=>{
  const w=medicalCamp(2),p=w.pawns[0],bed=fixtureBuilding(w,'bed',8,8);p.bedId=bed.id;Object.assign(p,{x:8,z:8});controlledInjury(w,p,'left-arm',2*HP_UNIT);
  p.priorities.patient=1;p.rest=100;p.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:8,z:8},medical:'patient'};p.state='resting';
  const events=disturbanceEvents(w);events.impact(p,w.tick*10);expect(p.state).toBe('resting');expect(p.need?.kind).toBe('sleep');
  // The damage signal is shared by actual bullet, melee and roof producers.
  events.damage(p,w.tick*10,true);expect(p.need).toBeNull();expect(p.bedId).toBe(bed.id);expect(p.health!.injuries).toHaveLength(1);
  expect(lyingBlocked(w,p)).toBe(true);expect(sleepBlocked(w,p)).toBe(true);
  resume(w,40);expect(lyingBlocked(w,p)).toBe(false);expect(sleepBlocked(w,p)).toBe(true);
  // Patient may return while the longer noise clock still excludes ordinary sleep.
  expect(p.disturbance!.sleepUntilCore).toBeGreaterThan(w.tick*10);
});

test('three civilian policies react after waking; a forced task and a travelling sleeper keep their commitments',()=>{
  for(const response of ['flee','ignore','attack'] as const){
    const w=encounterCamp(),p=w.pawns[0],enemy=w.pawns[3];applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:false});applyCommand(w,{type:'hostility-response',pawnId:p.id,response});
    p.x=10;enemy.x=16;sleep(p);incoming(w,{x:11,z:10});run(w,1);
    expect(p.state).not.toBe('sleeping');
    if(response==='flee')expect(p.flee).toBeDefined();else if(response==='attack')expect(p.shooting?.order?.auto?.kind).toBe('response');else {expect(p.flee).toBeUndefined();expect(p.shooting).toBeUndefined();}
    resume(w,12);
  }
  const w=medicalCamp(),p=w.pawns[0];p.need={kind:'sleep',phase:'travel',bedId:null,target:{x:p.x+2,z:p.z}};p.path=[{x:p.x+1,z:p.z},{x:p.x+2,z:p.z}];p.state='moving';
  const before=structuredClone(p.need),path=structuredClone(p.path);disturbanceEvents(w).impact(p,w.tick*10);
  expect(p.need).toEqual(before);expect(p.path).toEqual(path);
  const cargo=exhaustedCarrier(),carrier=cargo.pawns[0];carrier.rest=60;carrier.collapsePending=false;
  const haul=structuredClone(carrier.haul),queue=structuredClone(carrier.orders.queue),held=cargo.piles.find(q=>q.owner.type==='pawn')!;
  disturbanceEvents(cargo).impact(carrier,cargo.tick*10);expect(carrier.haul).toEqual(haul);expect(carrier.orders.queue).toEqual(queue);expect(held.owner).toEqual({type:'pawn',pawnId:carrier.id});
  carrier.rest=0;carrier.collapsePending=true;run(cargo,1);expect(carrier.interruptedCargo).toBe(true);expect(carrier.state).toBe('sleeping');
  disturbanceEvents(cargo).impact(carrier,cargo.tick*10);expect(carrier.need).toBeNull();expect(carrier.interruptedCargo).toBe(true);expect(held.quantity).toBe(10);resume(cargo,5);
});

test('downed patients never stand from noise or hits; harm wakes only sleeping NPC allies; strict V61 migration',()=>{
  const w=medicalCamp(4),[downed,colonist,npc,source]=w.pawns;for(const p of w.pawns){Object.assign(p,{x:8,z:8});sleep(p);}
  controlledInjury(w,downed,'left-leg',50*HP_UNIT);controlledInjury(w,downed,'right-leg',50*HP_UNIT);
  npc.faction='outlaws';source.faction='outlaws';const before=structuredClone(downed.need);
  disturbanceEvents(w).damage(source,w.tick*10,true);
  expect(npc.need).toBeNull();expect(colonist.state).toBe('sleeping');expect(downed.state).toBe('downed');expect(downed.need).toEqual(before);
  disturbanceEvents(w).impact(downed,w.tick*10);expect(downed.state).toBe('downed');expect(downed.need).toEqual(before);resume(w,10);
  const old=medicalCamp(),saved=JSON.parse(serializeWorld(old));saved.schemaVersion=61;
  const loaded=deserializeWorld(JSON.stringify(saved));expect(loaded.schemaVersion).toBe(SCHEMA_VERSION);expect(loaded.pawns[0].disturbance).toBeUndefined();
  saved.pawns[0].disturbance={sleepUntilCore:0,lieUntilCore:0};expect(()=>deserializeWorld(JSON.stringify(saved))).toThrow('version 61');
  for(const value of [[],{},null,{sleepUntilCore:-1,lieUntilCore:0},{sleepUntilCore:0,lieUntilCore:old.tick*10+401},{sleepUntilCore:0,lieUntilCore:0,extra:true}]){
    const bad=JSON.parse(serializeWorld(old));bad.pawns[0].disturbance=value;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
});


test('actual melee hit wakes the target without skipping attacker recovery or granting target rest',()=>{
  const w=encounterCamp(),attacker=w.pawns[0],target=w.pawns[3];attacker.x=15;sleep(target);
  expect(applyCommand(w,{type:'melee',pawnIds:[attacker.id],targetId:target.id}).ok).toBe(true);
  run(w,1);expect(target.health!.injuries.length).toBeGreaterThan(0);expect(target.need).toBeNull();expect(target.state).not.toBe('sleeping');
  expect(target.disturbance!.lieUntilCore).toBeGreaterThan(w.tick*10);expect(target.rest).toBeLessThanOrEqual(10);
  expect(attacker.melee?.strike?.outcome).toBe('hit');const recovery=attacker.melee!.strike!.untilCore;resume(w,3);expect(attacker.melee!.strike!.untilCore).toBe(recovery);
});
