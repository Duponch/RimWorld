import { expect,test } from 'vitest';
import { clearShotSegment,findShotLine,leaningCells } from '../src/sim/combat-space';
import { accuracyAtDistance,chooseMissCover,coverBase,interceptionDistanceFactor,shotAim,shotCover } from '../src/sim/combat-report';
import { combatQueryField } from './scenarios/combat-queries';
import type { Cell } from '../src/sim/types';

/** Independent continuous segment/box clipping oracle. An infinitesimal vertical
 * offset resolves exact-corner ambiguity on the canonical increasing-x segment;
 * it does not reproduce the production boundary-walking algorithm. */
function crossesCell(a:Cell,b:Cell,c:Cell):boolean {
  if(a.x===c.x&&a.z===c.z||b.x===c.x&&b.z===c.z)return false;
  if(a.x>b.x||a.x===b.x&&a.z>b.z)[a,b]=[b,a];
  const offset=a.x===b.x?0:-Math.sign(b.z-a.z)*1e-7;
  const from=[a.x+.5,a.z+.5+offset],to=[b.x+.5,b.z+.5+offset],low=[c.x,c.z];
  let entry=0,exit=1;
  for(let axis=0;axis<2;axis++) {
    const delta=to[axis]-from[axis];
    if(delta===0){if(from[axis]<=low[axis]||from[axis]>=low[axis]+1)return false;continue;}
    let near=(low[axis]-from[axis])/delta,far=(low[axis]+1-from[axis])/delta;
    if(near>far)[near,far]=[far,near];entry=Math.max(entry,near);exit=Math.min(exit,far);
  }
  return entry<exit;
}

test('centre rays match continuous geometry in every octant, reversal and endpoint semantics',()=>{
  const f=combatQueryField(7,7),cells:Array<Cell>=Array.from({length:49},(_,i)=>({x:i%7,z:Math.floor(i/7)}));
  let checked=0;
  for(const a of cells)for(const b of cells)for(const obstacle of cells) {
    f.walls[obstacle.z*7+obstacle.x]=1;
    const actual=clearShotSegment(f.grid,a,b),expected=!crossesCell(a,b,obstacle);
    if(actual!==expected)throw Error(JSON.stringify({a,b,obstacle,actual,expected}));
    f.walls[obstacle.z*7+obstacle.x]=0;checked++;
  }
  expect(checked).toBe(117649);
  expect(clearShotSegment(f.grid,{x:-1,z:0},{x:0,z:0})).toBe(false);
  expect(clearShotSegment(f.grid,{x:0,z:0},{x:7,z:0})).toBe(false);
  expect(clearShotSegment(f.grid,{x:0,z:0},{x:NaN,z:0})).toBe(false);
  expect(()=>clearShotSegment(f.grid,cells[0],cells[1],1,1)).toThrow();
});

test('corner exposure, closed door mutation and occupied-cell range are separate from pathfinding',()=>{
  const f=combatQueryField(),a={x:3,z:8},b={x:12,z:8},target={cell:b,leans:true};
  for(let z=0;z<32;z++)f.set(8,z,{key:`wall-${z}`,full:true,fill:1},true);
  expect(findShotLine(f.grid,a,target,20)).toEqual({ok:false,reason:'blocked'});
  f.set(8,8,{key:'door',full:true,fill:1,openDoor:true});
  const opened=findShotLine(f.grid,a,target,20);expect(opened).toMatchObject({ok:true,from:a,to:b,distance:9});
  f.set(8,8,{key:'door',full:true,fill:1},true);
  expect(findShotLine(f.grid,a,target,20)).toEqual({ok:false,reason:'blocked'});
  expect(opened).toMatchObject({ok:true}); // Old query result is not rewritten by mutation.
  f.remove(8,8);expect(findShotLine(f.grid,a,target,8.999)).toEqual({ok:false,reason:'range'});
  expect(findShotLine(f.grid,a,target,9,9)).toMatchObject({ok:true});
  expect(findShotLine(f.grid,a,target,20,9.001)).toEqual({ok:false,reason:'range'});
  // Range uses the nearest occupied cell, not a building's farther anchor.
  expect(findShotLine(f.grid,a,{cell:{x:13,z:8},cells:[{x:13,z:8},b],full:true},9)).toMatchObject({ok:true,distance:10});
  const corner=combatQueryField();corner.set(4,3,{key:'corner',fill:1,full:true},true);
  const shot=findShotLine(corner.grid,{x:3,z:3},{cell:{x:9,z:3},leans:true},6);
  expect(shot).toMatchObject({ok:true,from:{x:3,z:2}});
  // Low cover may supply an origin; leaning never extends the original range.
  corner.set(4,4,{key:'low',fill:.5});
  expect(leaningCells(corner.grid,{x:3,z:4},{x:9,z:4})).toContainEqual({x:4,z:4});
  expect(findShotLine(corner.grid,{x:3,z:4},{cell:{x:9,z:4},leans:true},5)).toEqual({ok:false,reason:'range'});
  expect(findShotLine(corner.grid,a,{cell:b,cells:[]},20)).toEqual({ok:false,reason:'bounds'});
  expect(()=>findShotLine(corner.grid,a,target,Infinity)).toThrow();
  const edges=combatQueryField();edges.walls[5*32+4]=1;
  expect(findShotLine(edges.grid,{x:3,z:3},{cell:{x:4,z:6}},10)).toEqual({ok:false,reason:'blocked'});
  expect(findShotLine(edges.grid,{x:3,z:3},{cell:{x:4,z:6},full:true},10)).toMatchObject({ok:true,from:{x:3,z:3}});
});

test('directional cover combines passage, does not block through a wall and refreshes without identity caches',()=>{
  const f=combatQueryField(),target={x:12,z:12},shooter={x:4,z:8};
  // West cardinal has ~26.6 degrees -> .8; NW diagonal ~32.3 -> .6.
  f.set(11,12,{key:'west',fill:.375});f.set(11,11,{key:'diagonal',fill:1/3});
  const report=shotCover(f.grid,shooter,target);
  expect(report.contributions.find(c=>c.key==='west')?.chance).toBeCloseTo(.3,12);
  expect(report.contributions.find(c=>c.key==='diagonal')?.chance).toBeCloseTo(.2,12);
  expect(report.blockChance).toBeCloseTo(.44,12);expect(report.passChance).toBeCloseTo(.56,12);
  f.set(13,12,{key:'behind',fill:1,full:true},true);
  expect(shotCover(f.grid,shooter,target)).toEqual(report);
  expect(shotCover(f.grid,shooter,target,undefined,false).blockChance).toBe(0);
  expect(shotCover(f.grid,shooter,target,'west').blockChance).toBeCloseTo(.2,12);
  const old=JSON.stringify(report);
  f.set(11,12,{key:'west',fill:1,full:true,openDoor:true});f.remove(11,11);
  expect(shotCover(f.grid,shooter,target).blockChance).toBe(0);expect(JSON.stringify(report)).toBe(old);
  f.set(11,12,{key:'west',fill:1,full:true},true);
  expect(shotCover(f.grid,{x:3,z:12},target).blockChance).toBe(.75);
  // Cover coefficient alone never asserts a line is legal.
  for(let z=0;z<32;z++)f.walls[z*32+10]=1;
  expect(findShotLine(f.grid,{x:3,z:12},{cell:target,leans:true},20)).toEqual({ok:false,reason:'blocked'});
  expect(coverBase({key:'closed',full:true,fill:1})).toBe(.75);
  expect(()=>coverBase({key:'bad',fill:1.1})).toThrow();
});

test('near cover, shooter-cell exclusion and weighted miss selection preserve distinct contracts',()=>{
  const f=combatQueryField(),target={x:10,z:10};f.set(9,10,{key:'near',fill:.6});
  expect(shotCover(f.grid,{x:8,z:10},target).blockChance).toBeCloseTo(.6*.3333,12);
  expect(shotCover(f.grid,{x:7,z:10},target).blockChance).toBeCloseTo(.6*.66666,12);
  expect(shotCover(f.grid,{x:6,z:10},target).blockChance).toBe(.6);
  const own=shotCover(f.grid,{x:9,z:10},target);expect(own.blockChance).toBe(0);expect(own.contributions[0].blocks).toBe(false);
  expect(chooseMissCover(own,.5)?.key).toBe('near');
  // Same object ID on two footprint cells is not silently deduplicated.
  f.set(9,9,{key:'near',fill:.5});const report=shotCover(f.grid,{x:2,z:6},target);
  expect(report.contributions).toHaveLength(2);expect(report.contributions.every(c=>c.key==='near')).toBe(true);
  const first=report.contributions[0].chance/report.contributions.reduce((n,c)=>n+c.chance,0);
  expect(chooseMissCover(report,first-1e-8)?.cell).toEqual(report.contributions[0].cell);
  expect(chooseMissCover(report,first+1e-8)?.cell).toEqual(report.contributions[1].cell);
  expect(chooseMissCover(report,1-1e-12)?.cell).toEqual(report.contributions[1].cell);
  const counts=[0,0];
  for(let i=0;i<10000;i++)counts[chooseMissCover(report,(i+.5)/10000)?.cell.z===10?0:1]++;
  expect(Math.abs(counts[0]-10000*.48/(.48+.3))).toBeLessThan(1);
  expect(()=>chooseMissCover(report,1)).toThrow();
  expect(chooseMissCover(shotCover(f.grid,target,target),0)).toBeUndefined();
});

test('aim report matches independent pedagogical calculation and posture boundary cases without double penalty',()=>{
  const factors={distance:20,pawnAccuracy:.98,weaponAccuracy:[.8,.8,.8,.8] as const,targetSize:1,standing:true,weather:.9,blindSmoke:false};
  const report=shotAim(factors,.6),expected=Math.pow(.98,20)*.8*.9*.6;
  expect(report.estimatedHit).toBeCloseTo(expected,14);
  expect(shotAim({...factors,blindSmoke:true},.6).estimatedHit).toBeCloseTo(expected*.7,14);
  const lying=shotAim({...factors,standing:false},.6);
  expect(lying.aimIgnoringPosture).toBe(report.aimIgnoringPosture);expect(lying.estimatedHit).toBeCloseTo(expected/2,14);
  for(const [distance,execution,posture] of [[3.9,7.5,1],[3.90001,1,1],[4.49999,1,1],[4.5,1,.5]])expect(shotAim({...factors,standing:false,distance})).toMatchObject({execution,posture});
  expect(shotAim({...factors,standing:false,distance:3.9},1).estimatedHit).toBe(1);
  expect(shotAim({...factors,pawnAccuracy:0,weather:0}).standardAim).toBe(.0201);
  expect(shotAim({...factors,targetSize:.01}).size).toBe(.5);
  expect(shotAim({...factors,targetSize:10}).size).toBe(2);
  expect(shotAim(factors,0).estimatedHit).toBe(0);
  expect(()=>shotAim({...factors,pawnAccuracy:1.1})).toThrow();
  expect(()=>shotAim({...factors,distance:NaN})).toThrow();
  const curve=[.8,.75,.55,.4] as const;
  for(const [d,value] of [[0,.8],[3,.8],[7.5,.775],[12,.75],[18.5,.65],[25,.55],[32.5,.475],[40,.4],[41,.4]])expect(accuracyAtDistance(curve,d)).toBeCloseTo(value,14);
  for(const [d,factor] of [[0,0],[25,0],[84.5,.5],[144,1],[200,1]])expect(interceptionDistanceFactor(d)).toBe(factor);
});

test('queries are pure and local on a 250-square field, independent of unrelated population',()=>{
  const f=combatQueryField(250,250),a={x:120,z:120},target={cell:{x:139,z:137},leans:true};
  // Populate unrelated cells without a map-sized scan per query.
  for(let z=0;z<250;z++)for(let x=0;x<100;x++)f.set(x,z,{key:`${x}:${z}`,fill:.5},x%5===0);
  const before=[...f.covers],walls=f.walls.slice();f.resetReads();
  const first=findShotLine(f.grid,a,target,25.9);expect(first).toMatchObject({ok:true});
  const report=shotCover(f.grid,a,target.cell);expect(report.blockChance).toBe(0);
  expect(f.reads()).toBeLessThan(100);
  a.x=119;expect(first).toMatchObject({ok:true,from:{x:120,z:120}});
  expect(f.covers).toEqual(new Map(before));expect(f.walls).toEqual(walls);
});
