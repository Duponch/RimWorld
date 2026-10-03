import { expect,test } from 'vitest';
import { meleePursuitCamp as pursuit } from './scenarios/melee-pursuit-v197.ts';
import { stepWorld,applyCommand,deserializeWorld,serializeWorld,validateWorld } from '../src/sim/index.ts';
import { pawnBody } from '../src/sim/health-rules.ts';
import { updatePawnHealth } from '../src/sim/health.ts';
import { meleeContact } from '../src/sim/melee-space.ts';
import { processMelee } from '../src/sim/melee.ts';
import { processTactics } from '../src/sim/tactics.ts';
import { canStep,blockedCells } from '../src/sim/pathfinding.ts';
import { startTravel } from '../src/sim/movement.ts';
import { LightEnvironmentCache } from '../src/sim/light-environment.ts';
import type { Pawn,World } from '../src/sim/types.ts';

function decision(w:World,chaser:Pawn,remaining:number) {
  const budget={remaining,pairs:32768},getLight=()=>new LightEnvironmentCache().read(w);
  processMelee(w,chaser,()=>blockedCells(w),budget,getLight);expect(validateWorld(w)).toEqual([]);return budget;
}

for(const mode of ['tactics','raid','flee','direct'] as const)test(`${mode}: a healthy unarmed pursuer closes a wounded moving target without safe-prefix pauses`,()=>{
  const {w,target,chaser}=pursuit(mode);expect(pawnBody(target).capacities.moving).toBe(.47);expect(pawnBody(chaser).capacities.moving).toBe(1);const started=w.tick,edges=new Map<number,NonNullable<Pawn['motion']>>();
  let observedStale=false,observedFlee=false,replay:World|undefined;
  // Independent temporal bound: cardinal speeds are 1/3 and .47/3 cells/tick.
  // A gap of eight closes in ~40 ticks; 60 allows grid/diagonal sampling.
  // No expected path is derived from meleeRoute or its choice of destination.
  for(let i=0;i<60&&!chaser.lastAttack;i++){
    const previous=chaser.motion&&structuredClone(chaser.motion),beforeTarget={x:target.x,z:target.z},beforeChaser={x:chaser.x,z:chaser.z};
    stepWorld(w);if(replay){stepWorld(replay);expect(serializeWorld(replay)).toBe(serializeWorld(w));}
    expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);
    if(chaser.motion){edges.set(chaser.motion.start,structuredClone(chaser.motion));
      if(previous&&chaser.motion.start!==previous.start&&!chaser.lastAttack)expect(chaser.motion.start-previous.end,`unexplained gap after edge at ${previous.end}`).toBeLessThanOrEqual(1);
    }
    observedFlee ||= !!target.flee;
    const end=chaser.path.at(-1),next=chaser.path[0],grid=blockedCells(w);
    if(end&&!meleeContact(w,end,target,grid)&&next&&canStep(w,chaser,next,grid,new Set())){
      observedStale=true;expect(chaser.moveCooldown,`safe stale prefix paused at ${w.tick}`).toBeGreaterThan(0);
      replay??=deserializeWorld(serializeWorld(w));
    }
    const attack=(chaser as Pawn).lastAttack;
    if(attack){
      // Combat runs before the movement decision in this tick: later target
      // movement can change contact again, so use the pre-decision cells.
      expect(meleeContact(w,beforeChaser,beforeTarget,grid)).toBe(true);
      expect(chaser.motion?.end??0).toBeLessThanOrEqual(attack.atCore/10);
      expect(attack.targetId).toBe(target.id);
    }
  }
  expect(observedStale).toBe(true);expect(replay).toBeDefined();expect(chaser.lastAttack).toBeDefined();expect(w.tick-started).toBeLessThanOrEqual(60);
  if(mode==='flee')expect(observedFlee).toBe(true);
  const occupied=[...edges.values()].reduce((n,m)=>n+Math.max(0,Math.min(w.tick,m.end)-Math.max(started,m.start)),0);
  expect(occupied/(w.tick-started)).toBeGreaterThan(.9);
  expect(target.x).toBeGreaterThan(24);expect(chaser.x).toBeGreaterThan(24);
  const recovery=chaser.melee?.strike;expect(recovery).toBeDefined();
  const saved=deserializeWorld(serializeWorld(w));
  for(let i=0;i<8;i++){stepWorld(w);stepWorld(saved);expect(validateWorld(w)).toEqual([]);expect(serializeWorld(saved)).toBe(serializeWorld(w));expect(chaser.melee?.strike?.untilCore).toBe(recovery!.untilCore);}
});

test('a short successful route starts its next physical pursuit before the old twenty-tick search deadline',()=>{
  const {w,chaser}=pursuit('raid',4),started=w.tick;let exhaustedMoving=false;
  for(let i=0;i<35&&!chaser.lastAttack;i++){
    stepWorld(w);expect(validateWorld(w)).toEqual([]);
    if(!chaser.path.length&&chaser.moveCooldown>0&&!chaser.lastAttack){exhaustedMoving=true;expect(chaser.planCooldown).toBe(0);}
  }
  expect(exhaustedMoving).toBe(true);expect(chaser.lastAttack).toBeDefined();expect(w.tick-started).toBeLessThanOrEqual(35);
});

for(const remaining of [0,1])test(`safe stale prefix advances with ${remaining===0?'exhausted shared budget':'active search cooldown'} without a new search`,()=>{
  const {w,target,chaser}=pursuit('direct');
  expect(startTravel(w,target,{x:25,z:48})).toBe(true);target.path.shift();
  const oldPath=structuredClone(chaser.path);expect(meleeContact(w,oldPath.at(-1)!,target)).toBe(false);
  chaser.planCooldown=remaining?20:0;expect(validateWorld(w)).toEqual([]);
  const budget=decision(w,chaser,remaining);
  expect(budget.remaining).toBe(remaining);expect(chaser.path).toEqual(oldPath.slice(1));expect(chaser.motion?.to).toEqual(oldPath[0]);expect(chaser.moveCooldown).toBeGreaterThan(0);
});

test('an unavailable next cell or diagonal flank cannot be traversed while replanning is throttled',()=>{
  for(const diagonal of [false,true]){
    const {w,target,chaser}=pursuit('direct');
    if(diagonal){target.x=21;target.z=45;target.path=[];target.draft!.target=null;target.state='idle';
      expect(applyCommand(w,{type:'melee',pawnIds:[chaser.id],targetId:target.id}).ok).toBe(true);
      // A valid prepared saved route exercises a specific corner without
      // assuming that the production builder breaks equal-cost ties this way.
      chaser.path=[{x:17,z:47},{x:18,z:46},{x:19,z:46},{x:20,z:46}];
      expect(canStep(w,chaser,chaser.path[0]!,blockedCells(w),new Set())).toBe(true);expect(validateWorld(w)).toEqual([]);
    }
    const next=chaser.path[0]!;expect(next).toBeDefined();
    if(diagonal){expect(next.x-chaser.x).not.toBe(0);expect(next.z-chaser.z).not.toBe(0);w.tiles[chaser.z*w.width+next.x]={terrain:'rock'};}
    else w.tiles[next.z*w.width+next.x]={terrain:'rock'};
    const old={x:chaser.x,z:chaser.z};chaser.planCooldown=20;expect(validateWorld(w)).toEqual([]);
    expect(canStep(w,chaser,next,blockedCells(w),new Set())).toBe(false);
    expect(decision(w,chaser,0).remaining).toBe(0);expect(chaser).toMatchObject({...old,state:'idle',moveCooldown:0});expect(chaser.motion).toBeUndefined();
  }
});

test('an unreachable melee search retains its backoff and cannot retry on each following decision',()=>{
  const {w,target,chaser}=pursuit();chaser.tactics={targetId:target.id,post:null,reviewAtCore:w.tick*10+480};chaser.melee={order:{targetId:target.id,startedDowned:false},strike:null};
  for(let z=0;z<w.height;z++)w.tiles[z*w.width+20]={terrain:'rock'};
  expect(validateWorld(w)).toEqual([]);expect(decision(w,chaser,1).remaining).toBe(0);expect(chaser.planCooldown).toBe(20);expect(chaser.melee).toBeUndefined();expect(chaser.path).toEqual([]);
  const original={x:chaser.x,z:chaser.z};
  for(let i=0;i<19;i++){
    w.tick++;chaser.planCooldown--;updatePawnHealth(w,target);
    const budget={remaining:1,pairs:32768};processTactics(w,chaser,()=>blockedCells(w),budget,()=>new LightEnvironmentCache().read(w));
    expect(validateWorld(w)).toEqual([]);expect(budget.remaining).toBe(1);expect(chaser).toMatchObject(original);expect(chaser.moveCooldown).toBe(0);
  }
  w.tick++;chaser.planCooldown--;updatePawnHealth(w,target);
  const due={remaining:1,pairs:32768};processTactics(w,chaser,()=>blockedCells(w),due,()=>new LightEnvironmentCache().read(w));
  expect(validateWorld(w)).toEqual([]);expect(due.remaining).toBe(0);expect(chaser.planCooldown).toBe(20);expect(chaser).toMatchObject(original);
});

test('a healthy target with equal speed stays ahead through repeated tactical reviews without invented catches',()=>{
  const {w,target,chaser}=pursuit();delete target.health;expect(pawnBody(target).capacities.moving).toBe(1);expect(validateWorld(w)).toEqual([]);
  const reviews=new Set<number>(),edges=new Map<number,NonNullable<Pawn['motion']>>(),started=w.tick;let stale=false,expiredWhileMoving=false;
  for(let i=0;i<120;i++){
    const old=chaser.motion&&structuredClone(chaser.motion);stepWorld(w);expect(validateWorld(w)).toEqual([]);
    expect(chaser.lastAttack).toBeUndefined();expect(chaser.melee?.strike).toBeFalsy();expect(meleeContact(w,chaser,target)).toBe(false);
    if(chaser.tactics?.reviewAtCore)reviews.add(chaser.tactics.reviewAtCore);
    if(chaser.tactics&&w.tick*10>=chaser.tactics.reviewAtCore){expiredWhileMoving=true;expect(chaser.moveCooldown).toBeGreaterThan(0);}
    if(chaser.motion){edges.set(chaser.motion.start,structuredClone(chaser.motion));if(old&&chaser.motion.start!==old.start)expect(chaser.motion.start-old.end).toBeLessThanOrEqual(1);}
    const end=chaser.path.at(-1),next=chaser.path[0],grid=blockedCells(w);
    if(end&&!meleeContact(w,end,target,grid)&&next&&canStep(w,chaser,next,grid,new Set())){stale=true;expect(chaser.moveCooldown).toBeGreaterThan(0);}
  }
  // Search cooldown may defer a review past its Core deadline. On this
  // 120-tick runway initial acquisition plus one executed review are assured;
  // deferred expiration must preserve continuous physical movement too.
  expect(stale).toBe(true);expect(expiredWhileMoving).toBe(true);expect(reviews.size).toBeGreaterThanOrEqual(2);expect(target.x).toBeLessThan(80);
  const occupied=[...edges.values()].reduce((n,m)=>n+Math.max(0,Math.min(w.tick,m.end)-Math.max(started,m.start)),0);expect(occupied/120).toBeGreaterThan(.95);
});

for(const remaining of [0,1])test(`expired same-target tactical review with budget ${remaining} preserves safe movement and charges only an executed query`,()=>{
  const {w,target,chaser}=pursuit('direct');chaser.faction='outlaws';delete chaser.draft;
  chaser.tactics={targetId:target.id,post:null,reviewAtCore:0};
  expect(startTravel(w,target,{x:25,z:48})).toBe(true);target.path.shift();expect(validateWorld(w)).toEqual([]);
  const route=structuredClone(chaser.path),intent=structuredClone(chaser.melee?.order),first=route[0],rng=w.rng;
  const budget={remaining,pairs:32768};processTactics(w,chaser,()=>blockedCells(w),budget,()=>new LightEnvironmentCache().read(w));
  expect(validateWorld(w)).toEqual([]);expect(budget.remaining).toBe(0);expect(chaser.tactics.targetId).toBe(target.id);
  expect(chaser.melee?.order).toEqual(intent);expect(chaser.path).toEqual(route.slice(1));expect(chaser.motion?.to).toEqual(first);expect(chaser.moveCooldown).toBeGreaterThan(0);
  if(remaining){expect(chaser.tactics.reviewAtCore).toBeGreaterThan(w.tick*10);expect(w.rng).not.toBe(rng);}
  else{expect(chaser.tactics.reviewAtCore).toBe(0);expect(w.rng).toBe(rng);}
});

test('drafted automatic melee retains its permission to defend at contact without gaining pursuit',()=>{
  const {w,target,chaser}=pursuit('direct');target.faction='outlaws';delete target.draft;target.path=[];target.state='idle';
  chaser.melee={order:{targetId:target.id,startedDowned:false,auto:'draft'},strike:null};
  chaser.path=[];chaser.state='idle';const origin={x:chaser.x,z:chaser.z};
  expect(validateWorld(w)).toEqual([]);expect(decision(w,chaser,1).remaining).toBe(1);expect(chaser.melee).toBeUndefined();expect(chaser).toMatchObject(origin);expect(chaser.motion).toBeUndefined();
});
