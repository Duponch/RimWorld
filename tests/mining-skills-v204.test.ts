import { expect, test } from 'vitest';
import { applyCommand, deserializeWorld, serializeWorld, stepWorld } from '../src/sim/index.ts';
import { HEALTHY_BODY } from '../src/sim/body-capacities.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { advanceMining } from '../src/sim/mining.ts';
import { miningSkill, miningWorkSpeed, miningYield } from '../src/sim/mining-skills.ts';
import { pickDuration, validMiningYield } from '../src/sim/mining-rules.ts';
import { tickSkills, xpRequired } from '../src/sim/skills.ts';
import { workProgress } from '../src/sim/work-progress.ts';
import type { Tile } from '../src/sim/types.ts';
import { miningCamp } from './scenarios/mining.ts';

/** Explicit short prepared rock, with its ordinary designation and contact. */
function fixture(ore:Tile['ore']='steel',miners=1) {
  const world=miningCamp(miners),cell={x:11,z:12},index=cell.z*world.width+cell.x;
  world.tiles[index]={terrain:'rock',stone:'granite',...ore?{ore}:{}};
  for(const [i,pawn] of world.pawns.entries()){
    pawn.x=10+i*2;pawn.z=12;delete pawn.traits;
    pawn.skills.mining={level:8,xp:0,dailyXp:0,passion:0};
    pawn.recreation.level=100;
  }
  expect(applyCommand(world,{type:'designate',kind:'mine',...cell}).ok).toBe(true);
  return {world,index,pawn:world.pawns[0]!,job:world.jobs[0]!};
}

/** Drive actual stroke preparation without editing progress or applying damage. */
function hit(f:ReturnType<typeof fixture>,pawn=f.pawn,light=1) {
  const before=f.world.tiles[f.index]!.miningDamage;
  for(let ticks=0;ticks<300;ticks++) {
    const preparation=workProgress(f.job);
    if(advanceMining(f.world,pawn,f.job,()=>light))return true;
    if(f.world.tiles[f.index]!.miningDamage!==before||workProgress(f.job)<preparation)return false;
  }
  throw new Error('Prepared miner did not execute a stroke.');
}

function excavate(f:ReturnType<typeof fixture>,pawn=f.pawn) {
  for(let strokes=0;strokes<120;strokes++)if(hit(f,pawn))return;
  throw new Error('Prepared ore was not excavated.');
}

test('Mining stats use their own complete Core yield curve, physical factors and final light minimum',()=>{
  const {pawn,world}=fixture();delete pawn.skills.mining;
  const historical=structuredClone(pawn.skills);
  expect(miningSkill(pawn)).toEqual({level:8,xp:0,dailyXp:0,passion:0});
  expect(miningWorkSpeed(pawn)).toBe(1);expect(miningYield(pawn)).toBe(1);
  expect(pawn.skills).toEqual(historical);
  const yields=[.60,.70,.80,.85,.90,.925,.95,.975,1,1.01,1.02,1.03,1.04,1.05,1.06,1.07,1.08,1.09,1.10,1.12,1.13];
  for(let level=0;level<=20;level++){
    pawn.skills.mining={level,xp:0,dailyXp:0,passion:0};
    expect(miningYield(pawn),`level ${level}`).toBeCloseTo(yields[level]!,12);
  }
  for(const [level,speed] of [[0,.1],[4,.52],[8,1],[20,2.44]]){
    pawn.skills.mining!.level=level!;
    expect(miningWorkSpeed(pawn)).toBeCloseTo(speed!,12);
  }
  pawn.skills.mining!.level=8;pawn.health=createMedicalRecord(world.tick);
  const body={...HEALTHY_BODY,capacities:{...HEALTHY_BODY.capacities,manipulation:.5,sight:.5}};
  expect(miningWorkSpeed(pawn,body)).toBeCloseTo(.375,12);
  expect(miningWorkSpeed(pawn,body,.8)).toBeCloseTo(.3,12);
  expect(miningYield(pawn,body)).toBeCloseTo(.765,12);
  const enhanced={...HEALTHY_BODY,capacities:{...HEALTHY_BODY.capacities,manipulation:2,sight:2}};
  expect(miningWorkSpeed(pawn,enhanced)).toBe(2);
  expect(miningYield(pawn,enhanced)).toBe(1);
  pawn.skills.mining!.level=0;
  expect(miningWorkSpeed(pawn,body,.8)).toBe(.1);
});

test('an absent historical profile learns only during executable contact, with common passion, traits and saturation',()=>{
  const f=fixture();delete f.pawn.skills.mining;
  f.pawn.x=8;
  const unworked=structuredClone(f.job);
  expect(advanceMining(f.world,f.pawn,f.job)).toBe(false);
  expect(f.job).toEqual(unworked);expect(f.pawn.skills.mining).toBeUndefined();
  f.pawn.x=10;f.pawn.health=createMedicalRecord(f.world.tick);
  const unable={...HEALTHY_BODY,capacities:{...HEALTHY_BODY.capacities,manipulation:0}};
  expect(advanceMining(f.world,f.pawn,f.job,()=>1,unable)).toBe(false);
  expect(f.job).toEqual(unworked);expect(f.pawn.skills.mining).toBeUndefined();
  f.pawn.state='downed';expect(advanceMining(f.world,f.pawn,f.job)).toBe(false);
  expect(f.pawn.skills.mining).toBeUndefined();f.pawn.state='idle';
  expect(advanceMining(f.world,f.pawn,f.job)).toBe(false);
  expect(f.pawn.skills.mining).toEqual({level:8,xp:245,dailyXp:245,passion:0});
  f.pawn.skills.mining!.dailyXp=4000001;
  const before=f.pawn.skills.mining!.xp;advanceMining(f.world,f.pawn,f.job);
  expect(f.pawn.skills.mining!.xp-before).toBe(49);
  f.pawn.skills.mining!.dailyXp=0;f.pawn.skills.mining!.passion=2;f.pawn.traits=['fast-learner'];
  const fast=f.pawn.skills.mining!.xp;advanceMining(f.world,f.pawn,f.job);
  expect(f.pawn.skills.mining!.xp-fast).toBe(1838);
});

test('the first stroke captures before level-up; later captures use the learned level and retain fractional cadence',()=>{
  const f=fixture('machinery');
  f.pawn.skills.mining={level:7,xp:xpRequired(7)-700,dailyXp:0,passion:1};
  advanceMining(f.world,f.pawn,f.job);
  expect(f.pawn.skills.mining!.level).toBe(8);expect(f.job.pickTicks).toBe(114);
  for(let i=0;i<10;i++)advanceMining(f.world,f.pawn,f.job);
  expect(f.world.tiles[f.index]!.miningDamage).toBeUndefined();
  advanceMining(f.world,f.pawn,f.job);
  expect(f.world.tiles[f.index]!.miningDamage).toBe(80);
  expect(f.world.tiles[f.index]!.miningYield).toBeCloseTo(.04,12);
  expect(f.job.pickTicks).toBe(100);expect(workProgress(f.job)).toBeCloseTo(.6,12);
  const fractional=fixture('machinery');fractional.pawn.skills.mining!.level=9;
  for(let i=0;i<8;i++)advanceMining(fractional.world,fractional.pawn,fractional.job);
  expect(fractional.world.tiles[fractional.index]!.miningDamage).toBeUndefined();
  advanceMining(fractional.world,fractional.pawn,fractional.job);
  expect(fractional.job.pickTicks).toBe(89);expect(workProgress(fractional.job)).toBeCloseTo(.1,12);
  for(let i=0;i<9;i++)advanceMining(fractional.world,fractional.pawn,fractional.job,()=>.8);
  expect(fractional.world.tiles[fractional.index]!.miningDamage).toBe(160);
  expect(workProgress(fractional.job)).toBeCloseTo(.2,12);
  expect(fractional.job.pickTicks).toBe(112);
  expect(pickDuration(100/62.5)).toBe(62);expect(pickDuration(100/63.5)).toBe(64);
});

test('damage-weighted yield preserves earlier miners and clips the overkilling part of the final hit',()=>{
  const f=fixture('steel',2),expert=f.world.pawns[1]!;
  f.pawn.skills.mining!.level=0;expert.skills.mining!.level=20;
  expect(hit(f)).toBe(false);
  expect(f.world.tiles[f.index]!.miningYield).toBeCloseTo(.6*80/1500,12);
  const beginnerXP=f.pawn.skills.mining!.xp;
  f.world.rng=123456789;excavate(f,expert);
  // .6*80/1500 + 1.13*1420/1500 => 44.069333... units;
  // the prepared xorshift draw .632127... rounds downward, not expert-only45.
  expect(f.world.piles).toHaveLength(1);expect(f.world.piles[0]!.quantity).toBe(44);
  expect(f.world.rng).toBe(2714967881);expect(f.pawn.skills.mining!.xp).toBe(beginnerXP);
  expect(f.world.tiles[f.index]).toEqual({terrain:'rough-stone',stone:'granite'});
  const old=fixture();old.world.tiles[old.index]!.miningDamage=1440;old.pawn.skills.mining!.level=20;
  old.world.rng=123456789;excavate(old);
  // Historical 1440 damage contributes .96; remaining60 contributes .0452.
  // Using an entire80 here would wrongly round to41 with the same draw.
  expect(old.world.piles[0]!.quantity).toBe(40);expect(old.world.rng).toBe(2714967881);
});

test('every neutral ore yields its exact existing quantity and commits its draw even at an integral product',()=>{
  for(const [ore,quantity] of [['steel',40],['machinery',2],['gold',40],['plasteel',40]] as const){
    const f=fixture(ore);f.world.rng=1;excavate(f);
    expect(f.world.piles[0]).toMatchObject({item:ore==='machinery'?'component':ore,quantity,owner:{type:'ground',x:11,z:12}});
    expect(f.world.rng).toBe(270369);
    expect(f.world.tiles[f.index]).toEqual({terrain:'rough-stone',stone:'granite'});
  }
  const minimal=fixture('machinery');minimal.pawn.skills.mining!.level=0;
  minimal.world.tiles[minimal.index]={terrain:'rock',stone:'granite',ore:'machinery',miningDamage:1920,miningYield:0};
  minimal.world.rng=123456789;excavate(minimal);
  expect(minimal.world.piles[0]!.quantity).toBe(1);
});

test('natural chunks keep their drop chance and single quantity at both extremes of Mining',()=>{
  for(const [seed,drops] of [[1,1],[123456789,0]])for(const level of [0,20]){
    const f=fixture(undefined);f.world.tiles[f.index]={terrain:'rock',stone:'sandstone'};
    f.pawn.skills.mining!.level=level;f.world.rng=seed!;excavate(f);
    expect(f.world.piles).toHaveLength(drops!);
    if(drops)expect(f.world.piles[0]).toMatchObject({item:'sandstone-chunk',quantity:1});
    expect(f.world.tiles[f.index]).toEqual({terrain:'rough-stone',stone:'sandstone'});
  }
});

test('a refused final hit keeps ore, contribution, IDs and PRNG while actual work still teaches Mining',()=>{
  const f=fixture();
  f.world.tiles[f.index]={terrain:'rock',stone:'granite',ore:'steel',miningDamage:1440,miningYield:.9};
  f.world.rng=123456789;const nextId=f.world.nextId;f.world.nextId=Number.MAX_SAFE_INTEGER;
  const tile=structuredClone(f.world.tiles[f.index]),xp=f.pawn.skills.mining!.xp;
  expect(hit(f)).toBe(false);
  expect(f.world.tiles[f.index]).toEqual(tile);expect(f.world.rng).toBe(123456789);
  expect(f.world.nextId).toBe(Number.MAX_SAFE_INTEGER);expect(f.world.piles).toEqual([]);
  expect(f.pawn.skills.mining!.xp).toBeGreaterThan(xp);
  expect(workProgress(f.job)).toBeLessThan(f.job.pickTicks!/10);
  f.world.nextId=nextId;expect(hit(f)).toBe(true);
  expect(f.world.piles).toHaveLength(1);expect(f.world.piles[0]!.quantity).toBe(37);
  expect(f.world.rng).toBe(2714967881);expect(f.world.nextId).toBe(nextId+1);
});

test('real order, travel, cancellation and saved continuation conserve contact XP and partial ore contribution',()=>{
  const f=fixture();delete f.pawn.skills.mining;f.pawn.x=5;
  expect(applyCommand(f.world,{type:'order-job',pawnId:f.pawn.id,jobId:f.job.id,queue:false}).ok).toBe(true);
  stepWorld(f.world,8);expect(f.pawn.skills.mining).toBeUndefined();
  for(let i=0;i<70&&f.world.tiles[f.index]!.miningDamage===undefined;i++)stepWorld(f.world);
  expect(f.world.tiles[f.index]!.miningDamage).toBe(80);
  expect(f.world.tiles[f.index]!.miningYield).toBeCloseTo(80/1500,12);
  const copy=deserializeWorld(serializeWorld(f.world));stepWorld(f.world,17);stepWorld(copy,17);
  expect(copy).toEqual(f.world);
  const xp=f.pawn.skills.mining!.xp,tile=structuredClone(f.world.tiles[f.index]);
  expect(applyCommand(f.world,{type:'cancel',x:f.job.x,z:f.job.z}).ok).toBe(true);
  expect(f.pawn.skills.mining!.xp).toBe(xp);expect(f.world.tiles[f.index]).toEqual(tile);
  expect(applyCommand(f.world,{type:'designate',kind:'mine',x:f.job.x,z:f.job.z}).ok).toBe(true);
  const next=f.world.jobs[0]!;
  expect(next.progress).toBe(0);expect(f.world.tiles[f.index]).toEqual(tile);
});

test('Mining forgetting and daily reset share existing skill cadence; prospective contribution is strictly bounded',()=>{
  const {world,pawn}=fixture();pawn.skills.mining={level:20,xp:1000000,dailyXp:4000001,passion:2};
  world.tick=3000+(20-(3000+pawn.id)%20)%20;tickSkills(world,pawn);
  expect(pawn.skills.mining!.xp).toBe(988000);
  const reset=6000+(20-pawn.id%20)%20;world.tick=reset;tickSkills(world,pawn);
  expect(pawn.skills.lastResetTick).toBe(reset);expect(pawn.skills.mining!.dailyXp).toBe(-12000);
  const tile={terrain:'rock',ore:'steel',miningDamage:80,miningYield:80/1500};
  expect(validMiningYield(tile,186)).toBe(true);
  expect(validMiningYield(tile,185)).toBe(false);
  expect(validMiningYield({...tile,miningYield:undefined},185)).toBe(false);
  for(const miningYield of [NaN,Infinity,-.1,1.26,.1])expect(validMiningYield({...tile,miningYield},186)).toBe(false);
  expect(validMiningYield({...tile,miningYield:0},186)).toBe(true);
  expect(validMiningYield({...tile,ore:undefined},186)).toBe(false);
});
