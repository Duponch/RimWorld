import { expect,test } from 'vitest';
import { generateWorld } from '../src/sim/generation';
import { enableWildlife,advanceWildlife } from '../src/sim/wildlife';
import { addGroundMaterial } from '../src/sim/materials';
import { startingPawn } from '../src/sim/starting-pawns';
import { berryYield,plantGrowth } from '../src/sim/plants';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization';
import type { World } from '../src/sim/types';

const seeds=[42,93,2048,81733,0];
const index=(world:World,x:number,z:number)=>z*world.width+x;
const land=(world:World,i:number)=>!['water','rock'].includes(world.tiles[i]!.terrain);

test('natural landscapes preserve terrain contracts, varied growth and reproducibility without supplying a camp',()=>{
  let trees=0,berries=0,landCells=0,ready=0,unready=0,centralNonGrass=0;
  for(const seed of seeds) {
    const w=generateWorld(seed,250,250,'temperate-survivors-v1');
    expect(validateWorld(w),`seed ${seed}`).toEqual([]);
    expect(serializeWorld(generateWorld(seed+2**32,250,250,'temperate-survivors-v1'))).toBe(serializeWorld(w));
    expect(w.pawns).toEqual([]);expect(w.piles).toEqual([]);expect(w.structures).toEqual([]);
    expect(w.jobs).toEqual([]);expect(w.wildlife).toBeUndefined();expect(w.scenario).toBeUndefined();
    expect(w.rng).toBe((seed>>>0)||0x9e3779b9);
    const occupied=new Set<number>();
    for(const r of w.resources) {
      const i=index(w,r.x,r.z);expect(occupied.has(i)).toBe(false);occupied.add(i);
      expect(land(w,i)).toBe(true);
      if(r.kind==='tree')trees++;
      if(r.kind==='berries') {
        berries++;expect(r.growthTick).toBe(0);expect(r.growth).toBeGreaterThanOrEqual(0);
        expect(r.growth).toBeLessThanOrEqual(1);
        if(berryYield(w,r)>0)ready++;else unready++;
      }
    }
    landCells+=w.tiles.filter((_,i)=>land(w,i)).length;
    const rock=w.tiles.filter(t=>t.terrain==='rock');
    expect(rock.length/w.tiles.length).toBeLessThanOrEqual(.22);
    expect(rock.every(t=>!!t.stone)).toBe(true);
    expect(w.tiles.every(t=>!t.ore||t.terrain==='rock')).toBe(true);
    // Natural selection may move the landing instead of cutting a central valley.
    for(let z=122;z<=128;z++)for(let x=122;x<=128;x++)if(w.tiles[index(w,x,z)]!.terrain!=='grass')centralNonGrass++;
    const water=w.tiles.flatMap((t,i)=>t.terrain==='water'?[i]:[]),seen=new Set([water[0]!]),queue=[water[0]!];
    expect(water.length).toBeGreaterThan(0);
    for(let h=0;h<queue.length;h++) {
      const i=queue[h]!,x=i%w.width,z=Math.floor(i/w.width);
      for(const n of [z>0?i-w.width:-1,x<w.width-1?i+1:-1,z<w.height-1?i+w.width:-1,x>0?i-1:-1]) {
        if(n>=0&&!seen.has(n)&&w.tiles[n]!.terrain==='water'){seen.add(n);queue.push(n);}
      }
    }
    expect(seen.size).toBe(water.length);
    expect((water.some(i=>i<w.width)&&water.some(i=>i>=w.width*(w.height-1)))||
      (water.some(i=>i%w.width===0)&&water.some(i=>i%w.width===w.width-1))).toBe(true);
  }
  // Broad regression bounds on this profile, not claims about RimWorld density.
  expect(trees/landCells).toBeGreaterThan(.02);expect(trees/landCells).toBeLessThan(.09);
  expect(berries/landCells).toBeGreaterThan(.001);expect(berries/landCells).toBeLessThan(.012);
  expect(ready/berries).toBeGreaterThan(.2);expect(unready/berries).toBeGreaterThan(.2);
  expect(centralNonGrass).toBeGreaterThan(0);
});

test('natural fauna avoids people, supplies and packages, never invents free habitat and resumes exactly',()=>{
  const w=generateWorld(93,16,16,'temperate-survivors-v1');w.tiles=w.tiles.map(()=>({terrain:'grass'}));w.resources=[];
  const plant={id:w.nextId++,kind:'berries' as const,x:3,z:3,amount:10,growth:.6,growthTick:0};w.resources.push(plant);
  w.pawns.push(startingPawn(w.nextId++,'Ada',3,3,0,50));
  addGroundMaterial(w,'wood',10,{x:2,z:3});
  w.packed.push({building:{id:w.nextId++,kind:'stool',material:'wood',x:4,z:3,orientation:0,footprint:'standard',quality:'normal'},owner:{type:'ground',x:4,z:3}});
  w.structures.push({id:w.nextId++,kind:'wall',material:'wood',x:3,z:2,orientation:0,footprint:'standard'});
  const id=w.nextId,rng=w.rng;enableWildlife(w,12,'natural');
  expect(w.wildlife!.animals).toHaveLength(1);
  expect(w.wildlife!.animals[0]).toMatchObject({id,x:3,z:4,state:'idle'});
  expect(w.nextId).toBe(id+1);expect(w.rng).toBe(rng);expect(plantGrowth(w,plant)).toBe(.6);
  expect(validateWorld(w)).toEqual([]);
  const before=serializeWorld(w);enableWildlife(w,12,'natural');expect(serializeWorld(w)).toBe(before);
  const copy=deserializeWorld(before);
  for(let tick=1;tick<=30;tick++){w.tick=tick;copy.tick=tick;advanceWildlife(w);advanceWildlife(copy);}
  expect(copy).toEqual(w);expect(validateWorld(w)).toEqual([]);
  // Habitat can be exhausted or absent; count is a budget, never a spawn guarantee.
  const empty=generateWorld(42,8,8,'temperate-survivors-v1');empty.resources=[];
  const next=empty.nextId;enableWildlife(empty,12,'natural');expect(empty.wildlife!.animals).toEqual([]);expect(empty.nextId).toBe(next);
});

test('natural fauna disperses repeatably across available habitat and invalid options do not mutate worlds',()=>{
  for(const seed of seeds) {
    const w=generateWorld(seed,250,250,'temperate-survivors-v1'),copy=structuredClone(w),rng=w.rng;
    enableWildlife(w,12,'natural');enableWildlife(copy,12,'natural');
    expect(w.wildlife).toEqual(copy.wildlife);expect(w.rng).toBe(rng);expect(w.wildlife!.animals).toHaveLength(12);
    const animals=w.wildlife!.animals;
    for(let i=0;i<animals.length;i++)for(let j=i+1;j<animals.length;j++) {
      expect((animals[i]!.x-animals[j]!.x)**2+(animals[i]!.z-animals[j]!.z)**2).toBeGreaterThanOrEqual(36);
    }
    expect(validateWorld(w)).toEqual([]);
  }
  const w=generateWorld(1,16,16,'temperate-survivors-v1'),before=serializeWorld(w);
  expect(()=>enableWildlife(w,-1,'natural')).toThrow();
  expect(()=>enableWildlife(w,2,'unknown' as 'natural')).toThrow();
  expect(serializeWorld(w)).toBe(before);
  expect(()=>generateWorld(42,250,250,'unknown' as 'temperate-survivors-v1')).toThrow();
});
