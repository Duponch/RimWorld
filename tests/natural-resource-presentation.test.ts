import { expect,test } from 'vitest';
import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';
import { decodeStoredSave } from '../src/ui/save-storage-codec.ts';
import { deserializeWorld } from '../src/sim/serialization.ts';
import { createWorld } from '../src/sim/engine.ts';
import { NaturalResourcePresentation } from '../src/render/NaturalResourcePresentation.ts';
import type { Resource } from '../src/sim/types.ts';

const tree=(id:number,x:number):Resource=>({id,kind:'tree',species:'oak',x,z:2,amount:10,growth:1,growthTick:0});

test('immutable resource snapshots reuse stable slots but detect replacement and reordering',()=>{
  const world=createWorld(42,32,32),first=tree(101,2),second=tree(102,3);
  world.resources=[first,second];
  const presentation=new NaturalResourcePresentation();
  expect(presentation.read(world,true,true)).toBeDefined();
  const stable={...world,tick:world.tick+1,resources:[first,second]};
  expect(presentation.read(stable,false,true)).toBeUndefined();
  expect(presentation.read({...stable,tick:stable.tick+1},false,true)).toBeUndefined();
  expect(presentation.changes.size).toBe(0);
  const replacement={...first,x:6};
  const replaced={...stable,resources:[replacement,second]};
  expect(presentation.read(replaced,false,true)).toBeDefined();
  expect([...presentation.changes.keys()]).toEqual([first.id]);
  const reordered={...replaced,resources:[second,replacement]};
  expect(presentation.read(reordered,false,true)).toBeDefined();
  expect([...presentation.changes.keys()].sort((a,b)=>a-b)).toEqual([first.id,second.id]);
  expect(presentation.read({...reordered,resources:[second,replacement]},false,true)).toBeUndefined();
  second.x=9; // Direct simulation callers may mutate resources in place.
  expect(presentation.read(reordered)).toBeDefined();
  expect([...presentation.changes.keys()]).toEqual([second.id]);
});

test('immutable snapshots still detect visual changes caused only by world time',()=>{
  const world=createWorld(42,32,32),berry:Resource={id:201,kind:'berries',species:'berry-bush',x:3,z:3,amount:10,growth:.64,growthTick:0};
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.resources=[berry];world.tick=0;
  const presentation=new NaturalResourcePresentation();
  presentation.read(world,true,true);
  let changed=false;
  for(let tick=100;tick<=36000;tick+=100){
    const next={...world,tick};
    if(presentation.read(next,false,true)){changed=true;break;}
  }
  expect(changed).toBe(true);
  const leaf:Resource={...tree(202,4),plantLife:{since:0,age:0,darkTicks:0,leaflessAt:0,nextCheck:7000}};
  const before={...world,tick:5999,resources:[leaf]};
  presentation.read(before,true,true);
  expect(presentation.read({...before,tick:6000},false,true)).toBeDefined();
  expect(presentation.changes.get(leaf.id)?.resource).toBe(leaf);
});

test.skipIf(process.env.NATURAL_RESOURCE_BENCH!=='1')('benchmark immutable mixed resources',async()=>{
  const world=deserializeWorld(await decodeStoredSave(readFileSync('public/test-saves/v98/mixed-100.json','utf8')));
  const measure=(copyArray:boolean,immutableSnapshot:boolean)=>{
    const worlds=Array.from({length:100},(_,i)=>({...world,tick:world.tick+i+1,resources:copyArray?world.resources.slice():world.resources}));
    const presentation=new NaturalResourcePresentation();presentation.read(world,true,immutableSnapshot);
    for(let i=0;i<20;i++)presentation.read(worlds[i]!,false,immutableSnapshot);
    const ms:number[]=[];
    for(let rep=0;rep<10;rep++){
      const start=performance.now();
      for(const next of worlds)presentation.read(next,false,immutableSnapshot);
      ms.push(performance.now()-start);
    }
    ms.sort((a,b)=>a-b);
    return {medianTotalMs:ms[5],medianPerReadMs:ms[5]!/worlds.length,minTotalMs:ms[0],maxTotalMs:ms.at(-1)};
  };
  console.log(JSON.stringify({resources:world.resources.length,reads:100,repeats:10,
    direct:measure(false,false),sharedArray:measure(false,true),copiedArray:measure(true,true)}));
});
