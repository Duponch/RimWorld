import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { startPrisonBreak,endPrisonBreak } from '../src/sim/prison-break.ts';
import { prisonBreakActive } from '../src/sim/prison-break-state.ts';
import { turretTargetAllowed } from '../src/sim/mini-turret.ts';
import { releaseReady } from '../src/sim/prisoner-release.ts';
import { tendingReason } from '../src/sim/tending.ts';
import { needsAssistedFeeding } from '../src/sim/feeding-rules.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { recruitmentUiFixture } from './scenarios/prison-camp.ts';
import { controlledInjury } from './scenarios/health.ts';
import { BLOOD_UNIT } from '../src/sim/injury-rules.ts';
import { reconcilePawnHealth } from '../src/sim/health.ts';
import { newMiniTurretState } from '../src/sim/mini-turret-state.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import type { Structure } from '../src/sim/types.ts';

function fixture(){
  const f=recruitmentUiFixture(),w=f.world,p=w.pawns.find(p=>p.id===f.patientId)!;
  for(const a of w.pawns.filter(q=>q!==p)){a.x=25;a.z=25+a.id;a.hostilityResponse='ignore';}
  return {...f,w,p};
}

test('a real breakout opens the forbidden closed door, resumes exactly, and exports the escaped person',()=>{
  const {w,p}=fixture(),door=w.structures.find(s=>s.kind==='door')!;door.door!.forbidden=true;
  expect(startPrisonBreak(w,p)).toBe(true);expect(validateWorld(w)).toEqual([]);
  let opened=false;
  for(let i=0;i<20;i++){stepWorld(w);opened||=door.door!.open;}
  expect(validateWorld(w)).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));
  for(let i=0;i<500&&w.pawns.some(q=>q.id===p.id);i++){
    stepWorld(w);stepWorld(resumed);opened||=door.door!.open;
    expect(serializeWorld(resumed)).toBe(serializeWorld(w));
    expect(validateWorld(w)).toEqual([]);
  }
  expect(w.pawns.some(q=>q.id===p.id)).toBe(false);
  expect(w.prisonDepartures?.at(-1)).toMatchObject({pawnId:p.id,capturedAt:p.prisoner!.capturedAt});
  expect(w.prisonDepartures?.at(-1)?.reason).toBeUndefined();
  expect(opened).toBe(true);expect(w.structures.includes(door)).toBe(true);
});

test('revolt prevents release and care, but downing ends hostility and permits real rescue to prison',()=>{
  const {w,p,actorId}=fixture(),a=w.pawns.find(q=>q.id===actorId)!;
  a.priorities.warden=1;a.priorities.basic=1;p.prisoner!.mode='release';
  expect(startPrisonBreak(w,p)).toBe(true);
  expect(turretTargetAllowed(p)).toBe(true);expect(releaseReady(w,a,p)).toBe(false);
  expect(needsAssistedFeeding(p)).toBe(false);expect(tendingReason(w,a,p,true)).toContain('révolte');
  expect(applyCommand(w,{type:'prisoner-mode',patientId:p.id,mode:'recruit'}).ok).toBe(false);
  const lastAt=p.prisoner!.breakout!.lastAt;
  controlledInjury(w,p,'torso',3000,'bruise');p.health!.bloodLoss=Math.round(.65*BLOOD_UNIT);reconcilePawnHealth(w,p);
  stepWorld(w);
  expect(prisonBreakActive(p)).toBe(false);expect(turretTargetAllowed(p)).toBe(false);
  expect(p.prisoner!.breakout!.lastAt).toBe(lastAt);expect(p.state).toBe('downed');
  expect(validateWorld(w)).toEqual([]);
  expect(applyCommand(w,{type:'prisoner-mode',patientId:p.id,mode:'maintain'}).ok).toBe(true);
  a.x=14;a.z=10;
  expect(applyCommand(w,{type:'order-rescue',pawnId:a.id,patientId:p.id,queue:false}).ok).toBe(true);
  for(let i=0;i<400&&a.rescue;i++)stepWorld(w);
  expect(a.rescue).toBeUndefined();expect(p.need).toMatchObject({kind:'sleep',bedId:p.bedId});
  expect(validateWorld(w)).toEqual([]);
  expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));
});

test('ordinary fatigue still interrupts a breakout instead of granting infinite activity',()=>{
  const {w,p}=fixture();expect(startPrisonBreak(w,p)).toBe(true);
  p.rest=0;p.collapsePending=true;
  stepWorld(w);
  expect(prisonBreakActive(p)).toBe(false);expect(p.need?.kind).toBe('sleep');
  expect(validateWorld(w)).toEqual([]);
});

test('ending a breakout cancels a turret aim but preserves an already committed burst and ammo',()=>{
  const {w,p}=fixture();expect(startPrisonBreak(w,p)).toBe(true);
  const turret:Structure=fixtureBuilding(w,'mini-turret',15,15);turret.turret=newMiniTurretState();
  const key=`pawn:${p.id}` as const;
  turret.turret.targetKey=key;turret.turret.warmup={remainingCore:12,totalCore:20};
  turret.turret.burst={targetKey:key,shotsLeft:1,delayCore:6};
  const burst=turret.turret.burst,ammo=turret.turret.ammoQ;
  endPrisonBreak(w,p);
  expect(turret.turret.targetKey).toBeNull();expect(turret.turret.warmup).toBeNull();
  expect(turret.turret.burst).toBe(burst);expect(turret.turret.ammoQ).toBe(ammo);
});
