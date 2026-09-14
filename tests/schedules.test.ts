import { expect, test } from 'vitest';
import { addGroundMaterial, applyCommand, createWorld, deserializeWorld, serializeWorld, stepWorld, validateWorld } from '../src/sim/index';
import { defaultSchedule, hourOfDay, wantsSleep } from '../src/sim/schedule';
import { BED_REST_PER_TICK, GROUND_REST_PER_TICK, collapseProbability, updateRest } from '../src/sim/rest';
import { withoutPostV11Fields } from './scenarios/legacy-save';
import type { Command, World } from '../src/sim/types';

function camp(): World {
  const w = createWorld(42, 16, 16); w.pawns = [w.pawns[0]!]; w.tiles = w.tiles.map(() => ({terrain: 'grass'})); w.resources = []; w.piles = []; w.stock = {wood: 0, food: 0};
  Object.assign(w.pawns[0]!, {x: 2, z: 2, rest: 70, hunger: 90, priorities: {gather: 0, build: 0, haul: 0, grow: 0, cook: 0}});
  const bed = {id: w.nextId++, kind: 'bed' as const, x: 10, z: 10, orientation: 0 as const, footprint: 'standard' as const};
  w.structures = [bed]; w.pawns[0]!.bedId = bed.id; return w;
}
function checked(w: World, ticks = 1) { for (let i = 0; i < ticks; i++) { stepWorld(w); expect(validateWorld(w), `tick ${w.tick}`).toEqual([]); } }
function until(w: World, condition: () => boolean, limit = 1000) { for (let i = 0; i < limit && !condition(); i++) checked(w); expect(condition(), JSON.stringify(w.pawns)).toBe(true); }
function paint(w: World, assignment: 'anything' | 'work' | 'sleep', hours = Array.from({length: 24}, (_, h) => h)) {
  expect(applyCommand(w, {type: 'schedule-paint', pawnId: w.pawns[0]!.id, assignment, hours})).toEqual({ok: true});
}

test('24 plages atomiques : frontières de sommeil, passage minuit/aube, lit physique et continuation exacte', () => {
  const w = camp(), p = w.pawns[0]!;
  expect(defaultSchedule().filter(s => s === 'sleep')).toHaveLength(8);
  expect([0,249,250,1499,1500,5499,5500,5999,6000].map(hourOfDay)).toEqual([0,0,1,5,6,21,22,23,0]);
  for (const [assignment, rest, expected] of [['sleep',75,false],['sleep',74.99,true],['anything',30,false],['anything',29.99,true],['work',0,false]] as const) {
    paint(w,assignment);p.rest=rest;expect(wantsSleep(w,p)).toBe(expected);
  }
  paint(w,'sleep'); p.rest=70;
  const before=serializeWorld(w);
  for (const command of [
    {type:'schedule-paint',pawnId:p.id,hours:[],assignment:'sleep'},
    {type:'schedule-paint',pawnId:p.id,hours:[0,24],assignment:'sleep'},
    {type:'schedule-paint',pawnId:p.id,hours:[0,0],assignment:'sleep'},
    {type:'schedule-paint',pawnId:p.id,hours:[0,1.5],assignment:'sleep'},
    {type:'schedule-paint',pawnId:p.id,hours:[0],assignment:'joy'},
    {type:'schedule-replace',pawnId:p.id,assignments:Array(23).fill('sleep')},
    {type:'schedule-replace',pawnId:p.id,assignments:Array(24)},
    {type:'schedule-replace',pawnId:-1,assignments:defaultSchedule()},
  ]) { expect(applyCommand(w,command as Command).ok).toBe(false);expect(serializeWorld(w)).toBe(before); }
  const copy=defaultSchedule();expect(applyCommand(w,{type:'schedule-replace',pawnId:p.id,assignments:copy}).ok).toBe(true);copy[0]='work';expect(p.schedule[0]).toBe('sleep');
  checked(w);expect(p.need).toMatchObject({kind:'sleep',phase:'travel',bedId:p.bedId});expect(p.rest).toBeLessThan(70);
  const saved=serializeWorld(w),restored=deserializeWorld(saved);checked(w,100);checked(restored,100);expect(serializeWorld(restored)).toBe(serializeWorld(w));
  until(w,()=>p.state==='sleeping');expect([p.x,p.z]).toEqual([10,10]);
  p.rest=40;w.tick=1499;p.needCooldown=0;checked(w);expect(p.state).toBe('sleeping'); // Sleep -> Anything keeps the sleeper.
  paint(w,'work',[6]);checked(w);expect(p.need).toBeNull();expect(p.state).toBe('idle');
  paint(w,'sleep');p.rest=10;checked(w);expect(p.state).toBe('sleeping');
  paint(w,'work');checked(w,100);expect(p.state).toBe('sleeping');until(w,()=>p.need===null);expect(p.rest).toBeGreaterThanOrEqual(20);expect(p.rest).toBeLessThan(20.1);
  paint(w,'sleep');p.rest=74;checked(w);p.rest=99.99;paint(w,'anything');checked(w);expect(p.rest).toBe(100);expect(p.need).toBeNull();
  w.tick=5999;p.rest=70;paint(w,'sleep',[0]);checked(w);expect(hourOfDay(w.tick)).toBe(0);expect(p.state).toBe('sleeping');
});

test('horaires et actions : finir la tâche, manger malgré Travail, réveil critique accessible et aucun sommeil volontaire affamé', () => {
  const w=camp(),p=w.pawns[0]!;paint(w,'work');p.priorities.gather=1;
  w.resources.push({id:w.nextId++,kind:'tree',x:3,z:2,amount:12});
  expect(applyCommand(w,{type:'designate',kind:'chop',x:3,z:2}).ok).toBe(true);
  checked(w,5);const job=w.jobs[0]!;expect(job.progress).toBeGreaterThan(0);paint(w,'sleep');p.rest=45;
  checked(w);expect(p.jobId).toBe(job.id);until(w,()=>w.jobs.length===0);until(w,()=>p.state==='sleeping');
  expect(w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0)).toBe(12);
  const foodless=deserializeWorld(serializeWorld(w));foodless.pawns[0]!.hunger=12;foodless.pawns[0]!.rest=2;foodless.pawns[0]!.needCooldown=0;
  checked(foodless);expect(foodless.pawns[0]!.state).toBe('sleeping');
  addGroundMaterial(foodless,'food',1,{x:2,z:2},'survival-meal');foodless.pawns[0]!.needCooldown=0;
  checked(foodless);expect(foodless.pawns[0]!.need).toMatchObject({kind:'eat',phase:'pickup'}); // No artificial five-point rest lock.
  paint(foodless,'work');until(foodless,()=>foodless.stock.food===0);expect(foodless.pawns[0]!.hunger).toBeGreaterThan(90);
  const starved=camp();starved.pawns[0]!.hunger=0;starved.pawns[0]!.rest=0;paint(starved,'sleep');checked(starved,150);
  expect(starved.pawns[0]!.need).toBeNull();expect(starved.pawns[0]!.state).not.toBe('sleeping');
  const sealed=camp(),q=sealed.pawns[0]!;sealed.tiles[10*16+9]={terrain:'water'};sealed.tiles[10*16+11]={terrain:'water'};sealed.tiles[9*16+10]={terrain:'water'};sealed.tiles[11*16+9]={terrain:'water'};sealed.tiles[11*16+11]={terrain:'water'};sealed.tiles[12*16+10]={terrain:'water'};
  checked(sealed);expect(q.need).toMatchObject({kind:'sleep',bedId:null,target:{x:2,z:2}});expect(q.rest).toBeCloseTo(70-95/6000+GROUND_REST_PER_TICK,8);
});

test('fatigue adulte, effondrement probabiliste et migration V11 préservent les états et le rejeu', () => {
  const w=camp(),p=w.pawns[0]!;paint(w,'work');
  for(const [rest,factor] of [[60,1],[28,1],[27.99,.7],[14,.7],[13.99,.3],[1,.3],[.99,.6]]) {
    p.rest=rest!;updateRest(w,p);expect(p.rest).toBeCloseTo(rest!-95/6000*factor!,10);
  }
  expect(BED_REST_PER_TICK*2625).toBeCloseTo(100,10);expect(GROUND_REST_PER_TICK/BED_REST_PER_TICK).toBeCloseTo(.8,12);
  expect([100,101,1499,1500,3000,4500].map(collapseProbability)).toEqual([0,.01,.01,.02,.03,.04]);
  p.rest=0;p.restZeroTicks=0;const rng=w.rng;checked(w,100);expect(p.need).toBeNull();expect(w.rng).toBe(rng);
  const checkpoint=serializeWorld(w),replay=deserializeWorld(checkpoint);
  until(w,()=>w.events.some(e=>e.message.includes('s’effondre')),2500);
  checked(replay,w.tick-replay.tick);expect(serializeWorld(replay)).toBe(serializeWorld(w));expect(p.state).toBe('sleeping');
  expect(p.need).toMatchObject({bedId:null,target:{x:2,z:2}});
  // Complete checkpoints use current schema; malformed schedule/collapse state cannot replace them.
  for(const mutate of [(v:any)=>v.pawns[0].schedule.push('work'),(v:any)=>v.pawns[0].schedule[1]='joy',(v:any)=>v.pawns[0].restZeroTicks=4501,(v:any)=>v.pawns[0].collapsePending=true,(v:any)=>v.restRules='other']) {
    const bad=JSON.parse(serializeWorld(w));mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
  const old=withoutPostV11Fields(JSON.parse(checkpoint));old.schemaVersion=11;delete old.deconstructed;
  const migrated=deserializeWorld(JSON.stringify(old));expect(migrated.restRules).toBe('legacy');expect(migrated.pawns[0]!.schedule).toEqual(Array(24).fill('anything'));
  const stripped=withoutPostV11Fields(JSON.parse(serializeWorld(migrated)));stripped.schemaVersion=11;delete stripped.deconstructed;expect(stripped).toEqual(old);
  migrated.pawns[0]!.rest=80;const before=migrated.pawns[0]!.rest;checked(migrated);expect(migrated.pawns[0]!.rest).toBeCloseTo(before-.008,10);
});
