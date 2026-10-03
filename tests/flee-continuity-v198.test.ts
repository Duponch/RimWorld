import { expect,test } from 'vitest';
import { mkdirSync,writeFileSync } from 'node:fs';
import { fleeContinuityCamp } from './scenarios/flee-continuity-v198.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index.ts';
import { pawnBody } from '../src/sim/health-rules.ts';
import { processFlee,threatQueries } from '../src/sim/threats.ts';
import { blockedCells,canStep } from '../src/sim/pathfinding.ts';
import { LightEnvironmentCache } from '../src/sim/light-environment.ts';
import { startTravel } from '../src/sim/movement.ts';
import { newDoorState,doorOpenTicks } from '../src/sim/door-rules.ts';
import { updateDoors } from '../src/sim/doors.ts';
import type { World,Pawn } from '../src/sim/types.ts';

function decide(w:World,p:Pawn,remaining=1) {
  const budget={remaining,pairs:32768};
  processFlee(w,p,threatQueries(w),()=>blockedCells(w),budget,()=>new LightEnvironmentCache().read(w));
  expect(validateWorld(w)).toEqual([]);return budget;
}
function saveFailure(name:string,w:World,trace:unknown) {
  mkdirSync('tmp/v198-flee',{recursive:true});
  writeFileSync(`tmp/v198-flee/${name}-checkpoint.json`,serializeWorld(w));
  writeFileSync(`tmp/v198-flee/${name}-trace.json`,JSON.stringify(trace,null,2));
}

for(const wounded of [false,true])test(`civilian escape stays continuous within its route and observes threats at refuge boundaries (${wounded?'real wounded pace':'healthy pace'})`,()=>{
  const {w,target,chaser}=fleeContinuityCamp(wounded),capacity=wounded ? .47 : 1;
  expect(pawnBody(target).capacities.moving).toBe(capacity);expect(pawnBody(chaser).capacities.moving).toBe(capacity);
  const trace:unknown[]=[],boundariesTrace:unknown[]=[],edges=new Map<number,NonNullable<Pawn['motion']>>();let replay:World|undefined,boundaries=0,observedAt:number|undefined;
  for(let i=0;i<(wounded?240:140);i++){
    const previous=target.motion&&structuredClone(target.motion),finishedRoute=!!previous&&!target.path.length,wasCowering=(target.flee?.until??0)>0;
    stepWorld(w);if(replay){stepWorld(replay);expect(serializeWorld(replay)).toBe(serializeWorld(w));}
    expect(validateWorld(w)).toEqual([]);expect(chaser.lastAttack).toBeUndefined();expect(target.stagger).toBeUndefined();
    const nearby=threatQueries(w).nearby(target).length>0;
    trace.push({tick:w.tick,position:{x:target.x,z:target.z},motion:target.motion&&structuredClone(target.motion),remaining:target.path.length,flee:target.flee&&structuredClone(target.flee),nearby,chaser:{x:chaser.x,z:chaser.z}});
    if(wasCowering&&target.flee?.until===0){
      observedAt=w.tick;expect((w.tick*10+target.id)%35).toBeLessThan(10);expect(previous!.end).toBeLessThanOrEqual(w.tick);
    }
    if(target.motion){edges.set(target.motion.start,structuredClone(target.motion));
      if(!finishedRoute&&!target.path.length){
        mkdirSync('tmp/v198-flee',{recursive:true});writeFileSync(`tmp/v198-flee/${wounded?'wounded':'healthy'}-before-arrival.json`,serializeWorld(w));
        replay??=deserializeWorld(serializeWorld(w));
      }
      if(previous&&target.motion.start!==previous.start){
        if(finishedRoute){
          boundaries++;replay??=deserializeWorld(serializeWorld(w));expect(observedAt).toBeDefined();
          const reactionDelay=w.tick-observedAt!;
          boundariesTrace.push({physicalEnd:previous.end,observedAt,start:target.motion.start,cowerObservationDelay:observedAt!-previous.end,reactionDelay});
          expect(reactionDelay,'extra local delay after the Core hash observation').toBeLessThanOrEqual(0);observedAt=undefined;
        }
        const gap=target.motion.start-previous.end;
        if(!finishedRoute&&gap>1){saveFailure(wounded?'wounded':'healthy',w,trace);}
        if(!finishedRoute)expect(gap,`unexplained intra-route pause at ${previous.end}; checkpoint under tmp/v198-flee`).toBeLessThanOrEqual(1);
      }
    }
  }
  expect(boundaries).toBeGreaterThanOrEqual(2);expect(replay).toBeDefined();expect(edges.size).toBeGreaterThan(20);
  mkdirSync('tmp/v198-flee',{recursive:true});writeFileSync(`tmp/v198-flee/${wounded?'wounded':'healthy'}-boundaries.json`,JSON.stringify(boundariesTrace,null,2));
});

test('a consumed flee route checks nearby threats only at the hash observation and renews in the admitted observation decision',()=>{
  const {w,target,chaser}=fleeContinuityCamp();chaser.x=18;target.path=[{x:25,z:48}];target.flee!.target={x:25,z:48};
  expect(startTravel(w,target,target.path[0]!)).toBe(true);target.path=[];target.flee!.until=Math.ceil(target.motion!.end)+120;
  w.tick=Math.ceil(target.motion!.end);target.moveCooldown=0;expect(validateWorld(w)).toEqual([]);
  const prior=structuredClone(target.motion!),copy=deserializeWorld(serializeWorld(w));
  expect(threatQueries(w).nearby(target)).not.toHaveLength(0);
  while((w.tick*10+target.id)%35>=10){
    expect(decide(w,target,1).remaining).toBe(1);expect(decide(copy,copy.pawns.find(p=>p.id===target.id)!,1).remaining).toBe(1);
    expect(target.motion).toEqual(prior);expect(target.flee!.until).toBeGreaterThan(w.tick);expect(serializeWorld(copy)).toBe(serializeWorld(w));w.tick++;copy.tick++;
  }
  const observed=w.tick,budget=decide(w,target),otherBudget=decide(copy,copy.pawns.find(p=>p.id===target.id)!);
  expect(otherBudget).toEqual(budget);expect(serializeWorld(copy)).toBe(serializeWorld(w));
  expect(budget.remaining).toBe(0);
  expect(target.motion!.start-observed).toBeLessThanOrEqual(0);expect(target.motion!.start).not.toBe(prior.start);expect(serializeWorld(copy)).toBe(serializeWorld(w));
});

test('a safe flee prefix advances under an expired waiting date, active planning delay and zero budget',()=>{
  const {w,target}=fleeContinuityCamp();target.path=[{x:25,z:48},{x:26,z:48}];target.flee!.target={x:26,z:48};
  target.flee!.until=w.tick;target.planCooldown=20;expect(validateWorld(w)).toEqual([]);
  const old=structuredClone(target.path),budget=decide(w,target,0);
  expect(budget.remaining).toBe(0);expect(target.motion!.to).toEqual(old[0]);expect(target.path).toEqual(old.slice(1));expect(target.moveCooldown).toBeGreaterThan(0);
});

test('an exhausted escape search budget preserves intent and starts a real route when a query is admitted',()=>{
  const {w,target}=fleeContinuityCamp(),origin={x:target.x,z:target.z};
  expect(decide(w,target,0).remaining).toBe(0);expect(target.motion).toBeUndefined();expect(target.flee).toBeDefined();expect(target).toMatchObject(origin);
  expect(decide(w,target,1).remaining).toBe(0);expect(target.motion).toBeDefined();expect(target.moveCooldown).toBeGreaterThan(0);
});

test('a refuge observation under an exhausted query budget stays ready without waiting for another hash',()=>{
  const {w,target,chaser}=fleeContinuityCamp();chaser.x=18;target.flee!.until=w.tick+120;
  while((w.tick*10+target.id)%35>=10)w.tick++;
  expect(decide(w,target,0).remaining).toBe(0);expect(target.flee!.until).toBe(0);expect(target.motion).toBeUndefined();
  w.tick++;expect(decide(w,target,1).remaining).toBe(0);expect(target.motion).toBeDefined();
});

test('arrival without a nearby visible threat preserves the existing cowering period and ends without a fresh search',()=>{
  const {w,target}=fleeContinuityCamp();target.path=[{x:25,z:48}];target.flee!.target={x:25,z:48};
  expect(startTravel(w,target,target.path[0]!)).toBe(true);target.path=[];const deadline=Math.ceil(target.motion!.end)+120;target.flee!.until=deadline;
  w.tick=Math.ceil(target.motion!.end);target.moveCooldown=0;expect(threatQueries(w).nearby(target)).toHaveLength(0);
  for(let i=0;i<120;i++){
    expect(decide(w,target,1).remaining).toBe(1);expect(target.flee?.until).toBe(deadline);expect(target.motion!.end).toBeLessThanOrEqual(w.tick);w.tick++;
  }
  expect(decide(w,target,1).remaining).toBe(1);expect(target.flee).toBeUndefined();
});

test('escape never traverses a new solid obstacle or blocked diagonal while planning is delayed',()=>{
  for(const diagonal of [false,true]){
    const {w,target}=fleeContinuityCamp(),next={x:25,z:diagonal?49:48};
    target.path=[next,{x:26,z:next.z}];target.flee!.target={x:26,z:next.z};target.planCooldown=20;
    w.tiles[48*w.width+25]={terrain:'rock'};expect(canStep(w,target,next,blockedCells(w),new Set())).toBe(false);
    expect(decide(w,target,0).remaining).toBe(0);expect(target.path).toEqual([]);expect(target.motion).toBeUndefined();expect(target).toMatchObject({x:24,z:48});expect(target.planCooldown).toBe(20);
    for(let i=1;i<20;i++){
      w.tick++;target.planCooldown--;expect(decide(w,target,1).remaining).toBe(1);expect(target.motion).toBeUndefined();
    }
    w.tick++;target.planCooldown--;expect(decide(w,target,1).remaining).toBe(0);expect(target.motion).toBeDefined();expect(target.motion!.to).not.toEqual({x:25,z:48});
  }
});

test('a closed escape door waits for its real opening and retains exact continuation, without consuming its route',()=>{
  const {w,target}=fleeContinuityCamp(),door=Object.assign(fixtureBuilding(w,'door',25,48),{material:'wood' as const,door:newDoorState(w.tick)});
  target.path=[{x:25,z:48},{x:26,z:48}];target.flee!.target={x:26,z:48};
  const route=structuredClone(target.path),began=w.tick;
  expect(decide(w,target,0).remaining).toBe(0);expect(door.door?.open).toBe(true);expect(target.motion).toBeUndefined();expect(target.path).toEqual(route);
  const saved=deserializeWorld(serializeWorld(w));
  for(let i=1;i<=Math.ceil(doorOpenTicks(door));i++){
    w.tick++;saved.tick++;updateDoors(w);updateDoors(saved);decide(w,target,0);decide(saved,saved.pawns.find(p=>p.id===target.id)!,0);
    expect(serializeWorld(saved)).toBe(serializeWorld(w));
    if(i<doorOpenTicks(door)){expect(target.motion).toBeUndefined();expect(target.path).toEqual(route);}
  }
  expect(target.motion!.start).toBeGreaterThanOrEqual(began+doorOpenTicks(door));expect(target.motion!.to).toEqual(route[0]);expect(target.path).toEqual(route.slice(1));
});
