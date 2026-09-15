import { expect, test } from 'vitest';
import { createWorld, applyCommand, stepWorld, serializeWorld, deserializeWorld, validateWorld, addGroundMaterial } from '../src/sim/index';
import { generateSteel, generateMachinery } from '../src/sim/ore';
import { SnapshotEncoder, SnapshotDecoder } from '../src/bridge/snapshots';
import { addMaterial } from '../src/sim/materials';
import { groundCapacity } from '../src/sim/ground-placement';
import { furnitureDelay, navigationCosts } from '../src/sim/furniture-travel';
import { rockMaxHP } from '../src/sim/mining-rules';
import { miningCamp } from './scenarios/mining';
import type { World } from '../src/sim/types';

function until(w:World,done:()=>boolean,limit=700) {
  for(let n=0;n<limit&&!done();n++){stepWorld(w);expect(validateWorld(w),`tick ${w.tick}`).toEqual([]);}
  expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns,piles:w.piles})).toBe(true);
}

test('machinery deposits preserve steel and topology; strict V40 migration never invents industrial content',()=>{
  for(const seed of [42,93,2048]) {
    const w=createWorld(seed,250,250),copy=structuredClone(w),rng=w.rng,id=w.nextId;
    const remaining=new Set(w.tiles.flatMap((t,i)=>t.ore==='machinery'?[i]:[]));expect(remaining.size).toBeGreaterThanOrEqual(3);
    while(remaining.size) {
      const q=[remaining.values().next().value!];remaining.delete(q[0]!);
      for(let k=0;k<q.length;k++){const i=q[k]!;for(const j of [i-1,i+1,i-250,i+250])if(remaining.has(j)&&Math.abs(j%250-i%250)+Math.abs(Math.floor(j/250)-Math.floor(i/250))===1){remaining.delete(j);q.push(j);}}
      expect(q.length).toBeGreaterThanOrEqual(3);expect(q.length).toBeLessThanOrEqual(6);
      for(const i of q)expect(w.tiles[i]).toMatchObject({terrain:'rock',ore:'machinery'});
    }
    const strip=w.tiles.map(({ore:_ore,...t})=>t);w.tiles=structuredClone(strip);generateSteel(w);
    const steel=w.tiles.flatMap((t,i)=>t.ore==='steel'?[i]:[]);generateMachinery(w);
    expect(w.tiles).toEqual(copy.tiles);expect(w.tiles.flatMap((t,i)=>t.ore==='steel'?[i]:[])).toEqual(steel);
    expect(w.tiles.map(({ore:_ore,...t})=>t)).toEqual(strip);expect(w.rng).toBe(rng);expect(w.nextId).toBe(id);
  }
  const old=JSON.parse(serializeWorld(miningCamp()));old.schemaVersion=40;old.tiles[0]={terrain:'rock',stone:'slate',miningDamage:80};
  const restored=deserializeWorld(JSON.stringify(old));expect(restored).toEqual({...old,schemaVersion:41});
  for(const change of [(s:any)=>s.tiles[0].ore='machinery',(s:any)=>s.stockpiles.push({id:s.nextId++,x:20,z:20,filters:{wood:false,food:false,component:true},capacity:50,priority:2}),(s:any)=>s.piles.push({id:s.nextId++,kind:'component',item:'component',quantity:2,owner:{type:'ground',x:20,z:20}})]) {
    const bad=structuredClone(old);change(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/version 40/);
  }
  for(const tile of [{terrain:'grass',ore:'machinery'},{terrain:'rough-stone',ore:'machinery'},{terrain:'rock',ore:'machinery',miningDamage:2000},{terrain:'rock',ore:'unknown'}]) {
    const bad=structuredClone(restored);bad.tiles[0]=tile as any;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
  addGroundMaterial(restored,'component',50,{x:20,z:20},'component');
  expect(()=>addMaterial(restored,'component',1,{type:'ground',x:20,z:20},'component')).toThrow();
  const bad=structuredClone(restored);bad.piles[0]!.quantity=51;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
});

test('25 physical strikes, delayed final commit, snapshots and two haulers conserve components across a 50-unit stack boundary',()=>{
  const w=miningCamp(2),target={x:11,z:11},i=target.z*32+target.x;
  w.tiles[i]={terrain:'rock',stone:'slate',ore:'machinery'};expect(rockMaxHP(w.tiles[i]!)).toBe(2000);
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  expect(applyCommand(w,{type:'designate',kind:'mine',...target}).ok).toBe(true);
  until(w,()=>w.tiles[i]!.miningDamage===80);expect(w.piles).toHaveLength(0);
  const delta=structuredClone(encoder.encode(w,0,1));expect(delta.kind==='delta'&&delta.tiles).toEqual([[i,'rock','slate',80,'machinery']]);expect(decoder.adopt(delta).status).toBe('applied');
  const copy=deserializeWorld(serializeWorld(w));stepWorld(w,12);stepWorld(copy,12);expect(copy).toEqual(w);
  const damage=w.tiles[i]!.miningDamage;expect(applyCommand(w,{type:'cancel',...target}).ok).toBe(true);expect(w.tiles[i]!.miningDamage).toBe(damage);
  expect(applyCommand(w,{type:'designate',kind:'mine',...target}).ok).toBe(true);
  until(w,()=>w.tiles[i]!.miningDamage===1920);
  const nextId=w.nextId,rng=w.rng;w.nextId=Number.MAX_SAFE_INTEGER;stepWorld(w,11);
  expect(w.tiles[i]!.miningDamage).toBe(1920);expect(w.piles).toHaveLength(0);expect(w.rng).toBe(rng);w.nextId=nextId;
  until(w,()=>w.tiles[i]!.terrain==='rough-stone');expect(w.tiles[i]).toEqual({terrain:'rough-stone',stone:'slate'});
  expect(w.piles).toHaveLength(1);expect(w.piles[0]).toMatchObject({item:'component',kind:'component',quantity:2,owner:{type:'ground',...target}});
  const shown=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(shown.status==='applied'&&shown.world.tiles[i]).toEqual(w.tiles[i]);
  const targets=[{x:19,z:15},{x:20,z:15}];
  for(const c of targets)expect(applyCommand(w,{type:'stockpile',...c,enabled:true,filters:{wood:false,food:false,component:true},capacity:75}).ok).toBe(true);
  addGroundMaterial(w,'component',49,targets[0]!,'component');
  until(w,()=>w.pawns.some(p=>p.haul?.phase==='deliver'));const carried=deserializeWorld(serializeWorld(w));
  until(w,()=>w.piles.every(p=>p.owner.type==='ground'&&targets.some(c=>p.owner.type==='ground'&&c.x===p.owner.x&&c.z===p.owner.z)));
  stepWorld(carried,w.tick-carried.tick);expect(carried).toEqual(w);
  expect(w.piles.map(p=>p.quantity).sort((a,b)=>a-b)).toEqual([1,50]);expect(w.piles.every(p=>p.item==='component'&&!p.haulRequested)).toBe(true);
  expect(w.stock).toEqual({wood:0,food:0});expect(groundCapacity(w,targets[0]!,'steel')).toBe(0);
  expect(furnitureDelay(w,targets[0]!,targets[1]!)).toBe(1.4);expect(navigationCosts(w).costs!.get(15*32+19)).toBe(467);
  expect(applyCommand(w,{type:'stockpile',x:22,z:15,enabled:true,filters:{wood:false,food:false,component:1 as any}}).ok).toBe(false);
});
