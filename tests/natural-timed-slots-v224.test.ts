import { expect, test } from 'vitest';
import { NaturalResourcePresentation } from '../src/render/NaturalResourcePresentation';
import { createWorld } from '../src/sim/index';
import type { Resource, World } from '../src/sim/types';

function camp(immatureDominant=false):World {
  const world=createWorld(224,32,32);world.tick=0;
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.resources=[];
  for(let i=0;i<96;i++)world.resources.push({id:world.nextId++,kind:i%3===0?'berries':'tree',
    species:i%3===0?'berry-bush':'oak',x:2+i%24,z:2+Math.floor(i/24),amount:10,
    growth:(immatureDominant||i%17===0) ? .12+(i%5)*.15 : 1,growthTick:0,growthThermalFactor:1});
  world.resources.splice(3,0,{id:world.nextId++,kind:'rice',x:3,z:12,amount:8,growth:.1,growthTick:0});
  world.resources.splice(13,0,{id:world.nextId++,kind:'healroot',x:4,z:12,amount:1,growth:.5,growthTick:0,growthThermalFactor:1});
  world.resources[7]!.plantLife={since:0,age:0,darkTicks:0,leaflessAt:0,nextCheck:7000};
  return world;
}
function oracle(){
  const reference=new NaturalResourcePresentation(),candidate=new NaturalResourcePresentation();
  return (world:World,reset=false,immutable=true)=>{
    const before=structuredClone(world);
    const expected=reference.read(world,reset,false),actual=candidate.read(world,reset,immutable);
    expect(world).toStrictEqual(before);
    expect(actual===undefined).toBe(expected===undefined);
    expect(actual?.resources).toEqual(expected?.resources);
    expect([...candidate.changes]).toEqual([...reference.changes]);
    for(const [,change]of candidate.changes)if(change.resource)expect(world.resources).toContain(change.resource);
    return [...candidate.changes];
  };
}

test.each([false,true])('timed immutable slots match the mutable value oracle across growth and leaf expiry, immatureDominant=%s',immatureDominant=>{
  const base=camp(immatureDominant),read=oracle();read(base,true);
  let observedChanges=0;
  for(const tick of [1,1499,1500,2500,4799,4800,5999,6000,6001,12000,18000,30000,36000]) {
    observedChanges+=read({...base,tick}).length;
  }
  expect(observedChanges).toBeGreaterThan(0);
  read({...base,tick:36000,resources:base.resources.slice()});
  const replaced=base.resources.map((resource,index)=>index===18?{...resource,x:27}:resource);
  read({...base,tick:36000,resources:replaced});
  const reordered=replaced.slice().reverse();read({...base,tick:36000,resources:reordered});
  const removed=reordered.filter((_,index)=>index!==8);read({...base,tick:36000,resources:removed});
  const added:Resource={id:base.nextId++,kind:'berries',species:'berry-bush',x:26,z:15,amount:10,growth:.1,growthTick:36000};
  read({...base,tick:36000,resources:[...removed,added]});
});

test('a mutable read revokes timed immutable slots, including a same-tick mutation and a formerly stable plant',()=>{
  const world=camp(),read=oracle();read(world,true,true);read({...world,tick:1},false,true);
  read(world,false,false);
  const stable=world.resources.find(resource=>resource.growth===1)!;
  stable.x=28;stable.growth=.1;stable.growthTick=0;
  world.resources[7]!.plantLife!.leaflessAt=world.tick;
  read(world,false,false);
  read({...world,tick:1500},false,true);
  read({...world,tick:6000},false,true);
  const stableAgain={...world,tick:6001,resources:world.resources.map(resource=>({...resource,growth:1,plantLife:undefined}))};
  read(stableAgain,false,true);read({...stableAgain,tick:6002},false,true);
  read({...stableAgain,tick:6002},false,false);
  stableAgain.resources[1]!.x=29;read(stableAgain,false,false);
  read({...stableAgain,tick:6003},false,true);
  read({...stableAgain,tick:6003},true,true);
});
