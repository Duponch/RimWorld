import { miningCamp } from './scenarios/mining';
import { expect, test } from 'vitest';
import { applyCommand, stepWorld, serializeWorld, deserializeWorld, validateWorld, createWorld, addGroundMaterial } from '../src/sim/index';
import { STONE_KINDS } from '../src/sim/geology';
import { ROCK_HP, PICK_DAMAGE, PICK_TICKS } from '../src/sim/mining-rules';
import { advanceMining } from '../src/sim/mining';
import { groundCapacity } from '../src/sim/ground-placement';
import { startTravel } from '../src/sim/movement';
import { blockedCells, reachableCells, routeToCell } from '../src/sim/pathfinding';
import { SnapshotEncoder, SnapshotDecoder } from '../src/bridge/snapshots';
import type { World } from '../src/sim/types';
import { generateSteel } from '../src/sim/ore';
import { furnitureDelay, navigationCosts } from '../src/sim/furniture-travel';

function tick(w:World,n=1) {for(let i=0;i<n;i++){stepWorld(w);expect(validateWorld(w),`tick=${w.tick}`).toEqual([]);}}
function until(w:World,done:()=>boolean,limit=500){for(let i=0;i<limit&&!done();i++)tick(w);expect(done(),JSON.stringify({jobs:w.jobs,pawns:w.pawns,piles:w.piles})).toBe(true);}

test('steel veins preserve topology, extraction commits 40 units, transport splits and merges real stacks, V28 is validated before migration',()=>{
  for(const seed of [42,1,9173]) {
    const w=createWorld(seed,250,250),copy=createWorld(seed,250,250),remaining=new Set(w.tiles.flatMap((t,i)=>t.ore?[i]:[]));
    expect(copy).toEqual(w);expect(remaining.size,`seed ${seed}`).toBeGreaterThanOrEqual(30);
    for(const i of remaining)expect(w.tiles[i]).toMatchObject({terrain:'rock',ore:'steel'});
    while(remaining.size) {
      const frontier=[remaining.values().next().value!];remaining.delete(frontier[0]!);let size=0;
      while(frontier.length){const i=frontier.pop()!;size++;for(const j of [i-1,i+1,i-250,i+250])if(remaining.has(j)&&Math.abs(j%250-i%250)+Math.abs(Math.floor(j/250)-Math.floor(i/250))===1){remaining.delete(j);frontier.push(j);}}
      expect(size).toBeGreaterThanOrEqual(30);expect(size).toBeLessThanOrEqual(40);
    }
    const baseline=w.tiles.map(({ore:_ore,...t})=>t),rng=w.rng;w.tiles=structuredClone(baseline);generateSteel(w);
    expect(w.tiles).toEqual(copy.tiles);expect(w.rng).toBe(rng);expect(w.tiles.map(({ore:_ore,...t})=>t)).toEqual(baseline);
  }
  const w=miningCamp(2),i=11*32+11;w.tiles[i]={terrain:'rock',stone:'granite',ore:'steel'};
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();decoder.adopt(structuredClone(encoder.encode(w,0,1)));
  expect(applyCommand(w,{type:'designate',kind:'mine',x:11,z:11}).ok).toBe(true);
  until(w,()=>!!w.tiles[i]!.miningDamage);
  const damage=w.tiles[i]!.miningDamage!,copy=deserializeWorld(serializeWorld(w));
  expect(damage).toBe(80);expect(copy).toEqual(w);
  const delta=structuredClone(encoder.encode(w,0,1));expect(delta.kind==='delta'&&delta.tiles).toEqual([[i,'rock','granite',80,'steel']]);
  expect(decoder.adopt(delta).status).toBe('applied');
  expect(applyCommand(w,{type:'cancel',x:11,z:11}).ok).toBe(true);expect(w.tiles[i]!.miningDamage).toBe(damage);
  expect(applyCommand(w,{type:'designate',kind:'mine',x:11,z:11}).ok).toBe(true);
  until(w,()=>w.tiles[i]!.miningDamage===1440);
  const exhaustedId=w.nextId,oldRng=w.rng;w.nextId=Number.MAX_SAFE_INTEGER;
  stepWorld(w,11);expect(w.tiles[i]!.terrain).toBe('rock');expect(w.rng).toBe(oldRng);expect(w.piles).toHaveLength(0);w.nextId=exhaustedId;
  until(w,()=>w.tiles[i]!.terrain==='rough-stone');expect(w.tiles[i]).toEqual({terrain:'rough-stone',stone:'granite'});
  expect(w.piles).toHaveLength(1);expect(w.piles[0]).toMatchObject({kind:'steel',item:'steel',quantity:40,owner:{type:'ground',x:11,z:11}});
  const shown=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(shown.status==='applied'&&shown.world.tiles[i]).toEqual(w.tiles[i]);
  const targets=[{x:19,z:15},{x:20,z:15}];
  for(const c of targets)expect(applyCommand(w,{type:'stockpile',...c,enabled:true,filters:{wood:false,food:false,steel:true}}).ok).toBe(true);
  addGroundMaterial(w,'steel',40,targets[0]!,'steel');
  until(w,()=>w.pawns.some(p=>p.haul?.phase==='deliver'));
  const carried=deserializeWorld(serializeWorld(w)),sum=()=>w.piles.reduce((n,p)=>n+(p.item==='steel'?p.quantity:0),0);
  until(w,()=>w.piles.every(p=>p.owner.type==='ground'&&targets.some(c=>p.owner.type==='ground'&&c.x===p.owner.x&&c.z===p.owner.z)),900);
  stepWorld(carried,w.tick-carried.tick);expect(carried).toEqual(w);expect(sum()).toBe(80);expect(w.piles.map(p=>p.quantity).sort((a,b)=>a-b)).toEqual([5,75]);
  expect(groundCapacity(w,targets[0]!,'wood')).toBe(0);expect(w.piles.every(p=>!p.haulRequested)).toBe(true);
  expect(furnitureDelay(w,{x:18,z:15},targets[0]!)).toBe(1.4);expect(furnitureDelay(w,targets[0]!,targets[1]!)).toBe(1.4);
  expect(navigationCosts(w).costs!.get(15*32+19)).toBe(467);
  const old=JSON.parse(serializeWorld(miningCamp()));old.schemaVersion=28;for(const a of old.pawns)delete a.priorities.craft;old.tiles[i]={terrain:'rock',stone:'granite',miningDamage:80};
  const migrated=deserializeWorld(JSON.stringify(old));expect(migrated.schemaVersion).toBe(33);expect(migrated.tiles).toEqual(old.tiles);expect(migrated.stockpiles).toEqual(old.stockpiles);
  for(const change of [(s:any)=>s.tiles[i].ore='steel',(s:any)=>s.stockpiles.push({id:s.nextId++,x:20,z:20,filters:{wood:false,food:false,steel:true},capacity:75,priority:2}),(s:any)=>s.piles.push({id:s.nextId++,kind:'steel',item:'steel',quantity:40,owner:{type:'ground',x:20,z:20}})]){const bad=structuredClone(old);change(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/version 28/);}
  for(const tile of [{terrain:'grass',ore:'steel'},{terrain:'rough-stone',ore:'steel'},{terrain:'rock',ore:'gold'},{terrain:'rock',ore:'steel',miningDamage:1520}]){const bad=JSON.parse(serializeWorld(migrated));bad.tiles[i]=tile;expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();}
});

test('physical mining conserves wall damage across cancellation, diagonal contact, save and incremental snapshots for all five stones',()=>{
  for(const stone of STONE_KINDS) {
    const w=miningCamp(),p=w.pawns[0]!,x=11,z=11,i=z*w.width+x;
    w.tiles[i]={terrain:'rock',stone};w.tiles[11*w.width+10]={terrain:'rock',stone};w.tiles[12*w.width+11]={terrain:'rock',stone};
    const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();decoder.adopt(structuredClone(encoder.encode(w,0,1)));
    expect(applyCommand(w,{type:'designate',kind:'mine',x,z}).ok).toBe(true);
    const first=w.jobs[0]!;
    expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:first.id,queue:false}).ok).toBe(true);
    tick(w,PICK_TICKS+3);expect(w.tiles[i]!.miningDamage).toBe(PICK_DAMAGE);expect({x:p.x,z:p.z}).toEqual({x:10,z:12});
    const patch=structuredClone(encoder.encode(w,0,1));expect(patch.kind==='delta'&&patch.tiles).toEqual([[i,'rock',stone,80]]);
    const shown=decoder.adopt(patch);expect(shown.status==='applied'&&shown.world.tiles[i]).toEqual(w.tiles[i]);
    const restored=deserializeWorld(serializeWorld(w));tick(w,2);stepWorld(restored,2);expect(restored).toEqual(w);
    expect(applyCommand(w,{type:'cancel',x,z}).ok).toBe(true);expect(w.tiles[i]!.miningDamage).toBe(80);
    expect(applyCommand(w,{type:'designate',kind:'mine',x,z}).ok).toBe(true);expect(w.jobs[0]!.progress).toBe(0);
    expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:w.jobs[0]!.id,queue:false}).ok).toBe(true);
    w.rng=1;until(w,()=>w.tiles[i]!.terrain==='rough-stone');
    expect(w.tiles[i]).toEqual({terrain:'rough-stone',stone});expect(w.piles).toHaveLength(1);
    expect(p.orders.active).toBeNull();
    expect(w.piles[0]).toMatchObject({item:`${stone}-chunk`,kind:'chunk',quantity:1,owner:{type:'ground',x,z}});
    const final=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(final.status==='applied'&&final.world.tiles[i]).toEqual(w.tiles[i]);
    expect(ROCK_HP[stone]).toBeGreaterThan(80);
  }
});

test('excavation yields use one committed roll, expose the interior and chunks require hauling designation, typed reservations and real travel',()=>{
  const saturated=miningCamp();saturated.tiles[10*32+11]={terrain:'rock',stone:'sandstone',miningDamage:320};
  expect(applyCommand(saturated,{type:'designate',kind:'mine',x:11,z:10}).ok).toBe(true);
  const finalJob=saturated.jobs[0]!,nextId=saturated.nextId;saturated.nextId=Number.MAX_SAFE_INTEGER;saturated.rng=1;finalJob.progress=PICK_TICKS-1;
  expect(advanceMining(saturated,saturated.pawns[0]!,finalJob)).toBe(false);
  const invalidPreparation=structuredClone(saturated);invalidPreparation.nextId=nextId;invalidPreparation.jobs[0]!.progress=PICK_TICKS;
  expect(()=>deserializeWorld(serializeWorld(invalidPreparation))).toThrow(/mining/);
  expect(saturated.tiles[10*32+11]).toEqual({terrain:'rock',stone:'sandstone',miningDamage:320});
  expect(saturated.rng).toBe(1);expect(saturated.piles).toHaveLength(0);
  saturated.nextId=nextId;finalJob.progress=PICK_TICKS-1;
  expect(advanceMining(saturated,saturated.pawns[0]!,finalJob)).toBe(true);
  expect(saturated.rng).toBe(270369);expect(saturated.piles).toHaveLength(1);
  const w=miningCamp(2);const p=w.pawns[0]!;w.pawns[1]!.priorities.mine=0;
  for(let z=10;z<=11;z++)for(let x=11;x<=13;x++)w.tiles[z*w.width+x]={terrain:'rock',stone:'sandstone'};
  expect(applyCommand(w,{type:'area',action:'mine',from:{x:11,z:10},to:{x:13,z:11}})).toMatchObject({ok:true,affected:6});
  until(w,()=>!w.jobs.length,1100);expect(w.tiles.filter(t=>t.terrain==='rough-stone')).toHaveLength(6);
  if(!w.piles.length)addGroundMaterial(w,'chunk',1,{x:11,z:10},'sandstone-chunk');
  const chunks=w.piles.filter(p=>p.kind==='chunk').length,positions=structuredClone(w.piles);
  for(let z=15;z<15+chunks;z++)expect(applyCommand(w,{type:'stockpile',x:20,z,enabled:true,filters:{wood:false,food:false,chunk:true},capacity:1}).ok).toBe(true);
  tick(w,50);expect(w.piles).toEqual(positions);
  expect(applyCommand(w,{type:'area',action:'haul-chunks',from:{x:10,z:9},to:{x:14,z:12}}).ok).toBe(true);
  until(w,()=>w.pawns.some(a=>a.haul?.phase==='deliver'));
  const saved=serializeWorld(w),restored=deserializeWorld(saved);
  until(w,()=>w.piles.every(a=>a.owner.type==='ground'&&a.owner.x===20),500);stepWorld(restored,w.tick-restored.tick);expect(restored).toEqual(w);
  expect(w.piles.every(a=>a.quantity===1&&a.item==='sandstone-chunk')).toBe(true);expect(w.piles).toHaveLength(chunks);
  expect(groundCapacity(w,{x:20,z:15},'granite-chunk')).toBe(0);expect(w.piles.some(a=>a.haulRequested)).toBe(false);
  expect(applyCommand(w,{type:'area',action:'growing',from:{x:11,z:10},to:{x:13,z:11}}).ok).toBe(false);
  expect(applyCommand(w,{type:'designate',kind:'wall',x:11,z:10}).ok).toBe(true);
});

test('rough terrain and chunks share weighted and physical travel, strict V27 migration rejects future fields and resumes active edges',()=>{
  const w=miningCamp(),p=w.pawns[0]!;p.x=10;p.z=10;
  w.tiles[10*w.width+11]={terrain:'rough-stone',stone:'granite'};
  startTravel(w,p,{x:11,z:10});expect(p.motion!.end-p.motion!.start).toBeCloseTo(3.2);expect(validateWorld(w)).toEqual([]);
  const copy=deserializeWorld(serializeWorld(w));expect(copy).toEqual(w);
  p.moveCooldown=0;delete p.motion;p.x=10;p.z=10;
  const reach=reachableCells(w,p,blockedCells(w),new Set());expect(reach.costs[10*w.width+11]).toBe(1067);expect(routeToCell(w,{x:11,z:10},reach)).toEqual([{x:11,z:10}]);
  addGroundMaterial(w,'chunk',1,{x:11,z:10},'granite-chunk');addGroundMaterial(w,'chunk',1,{x:12,z:10},'slate-chunk');
  startTravel(w,p,{x:11,z:10});expect(p.motion!.end-p.motion!.start).toBeCloseTo(7.2);w.tick+=8;startTravel(w,p,{x:12,z:10});expect(p.motion!.end-p.motion!.start).toBeCloseTo(3);
  const old=JSON.parse(serializeWorld(miningCamp()));old.schemaVersion=27;for(const a of old.pawns){delete a.priorities.mine;delete a.priorities.craft;}
  const migrated=deserializeWorld(JSON.stringify(old));expect(migrated.schemaVersion).toBe(33);expect(migrated.pawns[0]!.priorities.mine).toBe(2);expect(migrated.tiles).toEqual(old.tiles);
  for(const mutate of [(s:any)=>s.tiles[0].miningDamage=80,(s:any)=>s.tiles[0].terrain='rough-stone',(s:any)=>s.pawns[0].priorities.mine=1]){const bad=structuredClone(old);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/version 27/);}
  const broken=JSON.parse(serializeWorld(migrated));broken.tiles[0]={terrain:'rock',stone:'sandstone',miningDamage:400};expect(validateWorld(broken).length).toBeGreaterThan(0);
});
