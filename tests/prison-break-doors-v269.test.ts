import {expect,test} from 'vitest';
import {recruitmentUiFixture} from './scenarios/prison-camp.ts';
import {blockedCells,canStep,reachableCells} from '../src/sim/pathfinding.ts';
import {prisonerAllowedCell,prisonerEscapeRoute} from '../src/sim/prison-space.ts';
import {readyDoorEntry} from '../src/sim/doors.ts';
import {doorOpenness,doorOpenTicks} from '../src/sim/door-rules.ts';
import {startTravel} from '../src/sim/movement.ts';

function fixture(){
  const {world:w,patientId}=recruitmentUiFixture(),p=w.pawns.find(p=>p.id===patientId)!,door=w.structures.find(s=>s.kind==='door')!;
  for(const a of w.pawns)if(a!==p){a.x=22;a.z=20+a.id;}
  p.prisoner!.breakout={rng:123,lastAt:w.tick,active:{startedAt:w.tick,initiatorId:p.id}};
  return {w,p,door};
}

test('active escape routes across a closed forbidden door without mutating the shared grid',()=>{
  const {w,p,door}=fixture();door.door!.forbidden=true;
  const blocked=blockedCells(w),before=blocked.slice();
  const route=prisonerEscapeRoute(w,p,goals=>reachableCells(w,p,blocked,new Set(),goals));
  expect(route?.some(c=>c.x===door.x&&c.z===door.z)).toBe(true);
  expect(blocked).toEqual(before);expect(door.door!.open).toBe(false);
  expect(prisonerAllowedCell(w,p,door)).toBe(true);
});

test('permission opens the physical leaf but never commits its edge early',()=>{
  const {w,p,door}=fixture();door.door!.forbidden=true;p.x=door.x+1;p.z=door.z;
  const next={x:door.x,z:door.z};
  expect(canStep(w,p,next,blockedCells(w),new Set())).toBe(true);
  expect(startTravel(w,p,next)).toBe(false);
  expect(p.x).toBe(door.x+1);expect(p.motion).toBeFalsy();expect(door.door!.open).toBe(true);
  expect(doorOpenness(door,w.tick)).toBe(0);
  w.tick+=Math.ceil(doorOpenTicks(door));
  expect(readyDoorEntry(w,p,next)).toBe(true);expect(startTravel(w,p,next)).toBe(true);
  expect(p.motion?.from).toEqual({x:door.x+1,z:door.z});expect(p.motion?.to).toEqual(next);
});

test('breakout permission preserves door-frame corners and ordinary prisoner/released permissions',()=>{
  const {w,p,door}=fixture();door.door!.forbidden=true;p.x=door.x+1;p.z=door.z+1;
  expect(canStep(w,p,{x:door.x,z:door.z},blockedCells(w),new Set())).toBe(false);
  delete p.prisoner!.breakout!.active;
  expect(readyDoorEntry(w,p,door)).toBe(false);expect(prisonerAllowedCell(w,p,door)).toBe(false);
  p.prisoner!.releasedAt=w.tick;
  expect(readyDoorEntry(w,p,door)).toBe(false);
  expect(prisonerAllowedCell(w,p,door)).toBe(false);
});
