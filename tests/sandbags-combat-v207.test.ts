import { expect,test } from 'vitest';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { barrierMaxHp,damageBarrier } from '../src/sim/barriers';
import { structureMaxHp,structureFlammability } from '../src/sim/thing-damage-rules';
import { structureBeauty } from '../src/sim/room-beauty';
import { captureWorldShotGrid } from '../src/sim/combat-world';
import { shotCover } from '../src/sim/combat-report';
import { clearShotSegment } from '../src/sim/combat-space';
import { createBulletFlight } from '../src/sim/bullet-flight';
import { registerWorldProjectile } from '../src/sim/projectile-system';
import { combatShotBatch } from '../src/sim/combat-shot-batch';
import { deconstructionCamp,fixtureBuilding } from './scenarios/deconstruction';
import type { World,Structure } from '../src/sim/types';

function until(w:World,predicate:()=>boolean,limit=1000){for(let i=0;i<limit&&!predicate();i++)stepWorld(w);expect(predicate()).toBe(true);expect(validateWorld(w)).toEqual([]);}
function replay(w:World,ticks=20){const copy=deserializeWorld(serializeWorld(w));stepWorld(w,ticks);stepWorld(copy,ticks);expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(validateWorld(w)).toEqual([]);}

test('low canonical .55 cover changes the facing report without blocking sight, regardless of meshes',()=>{
  const w=deconstructionCamp(),s:Structure=fixtureBuilding(w,'sandbags',17,16);s.material='cloth';const grid=captureWorldShotGrid(w);
  expect(grid.coverAt(17,16)).toMatchObject({key:`structure:${s.id}`,fill:.55});expect(grid.blocksSight(17,16)).toBe(false);
  expect(clearShotSegment(grid,{x:10,z:16},{x:18,z:16})).toBe(true);
  expect(shotCover(grid,{x:10,z:16},{x:18,z:16}).blockChance).toBeCloseTo(.55);
  expect(shotCover(grid,{x:25,z:16},{x:18,z:16}).blockChance).toBe(0);
  expect(shotCover(grid,{x:16,z:16},{x:25,z:16}).blockChance).toBe(0);
  expect(barrierMaxHp(s)).toBe(300);expect(structureMaxHp(s)).toBe(300);expect(structureFlammability(s)).toBe(0);expect(structureBeauty(s)).toBe(-10);
});

test('real projectile impact destroys low cover, returns a recipe quarter and invalidates the next fixed capture',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!,s:Structure=fixtureBuilding(w,'sandbags',18,16);s.material='cloth';s.damage=299;
  const flight=createBulletFlight({origin:{x:17.5,z:16.5},destination:{x:18.5,z:16.5},launcherKey:`pawn:${p.id}`,equipmentKey:null,intendedKey:`structure:${s.id}`,usedKey:`structure:${s.id}`,flags:7,preventFriendlyFire:false,speedPerCoreTick:.55});
  const projectile=registerWorldProjectile(w,flight,'normal',{friendlyPawnIds:[],friendlyFireFactor:.4}),batch=combatShotBatch(w),before=batch.read();
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);
  expect(projectile.arrival?.effect).toBe('barrier');expect(w.structures).toEqual([]);expect(batch.read()).not.toBe(before);
  const returned=w.piles.filter(p=>p.item==='cloth').reduce((n,p)=>n+p.quantity,0);expect([1,2]).toContain(returned);expect(returned+(w.destroyed?.lost.cloth??0)).toBe(5);expect(w.destroyed?.count).toBe(1);expect(w.deconstructed.count).toBe(0);replay(w);
});

test('melee contact damages the sac and home repair restores actual HP without remote gains or textile spending',()=>{
  const w=deconstructionCamp(),p=w.pawns[0]!,s:Structure=fixtureBuilding(w,'sandbags',p.x+4,p.z);s.material='cloth';
  expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);
  expect(applyCommand(w,{type:'melee',pawnIds:[p.id],targetId:s.id,structure:true}).ok).toBe(true);stepWorld(w);expect(s.damage).toBeUndefined();until(w,()=>!!s.damage);replay(w,1);
  expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:false}).ok).toBe(true);until(w,()=>!p.melee);
  const damage=s.damage!,piles=JSON.stringify(w.piles);stepWorld(w,20);expect(s.damage).toBe(damage);
  expect(applyCommand(w,{type:'area',action:'home',from:s,to:s}).ok).toBe(true);
  until(w,()=>p.state==='working');replay(w,1);until(w,()=>!s.damage);expect(JSON.stringify(w.piles)).toBe(piles);expect(w.destroyed).toBeUndefined();
});

test('destructive salvage refuses exhausted identity or loss capacity before touching HP, owners or PRNG',()=>{
  const w=deconstructionCamp(),s:Structure=fixtureBuilding(w,'sandbags',17,16);s.material='cloth';s.damage=299;
  w.nextId=Number.MAX_SAFE_INTEGER;const before=serializeWorld(w);expect(damageBarrier(w,s,1)).toBe(false);expect(serializeWorld(w)).toBe(before);
  w.nextId=s.id+1;w.destroyed={count:Number.MAX_SAFE_INTEGER,lost:{cloth:1}};const overflow=serializeWorld(w);expect(damageBarrier(w,s,1)).toBe(false);expect(serializeWorld(w)).toBe(overflow);
});
