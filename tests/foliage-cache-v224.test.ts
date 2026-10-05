import { expect, test } from 'vitest';
import { FoliageAmbience } from '../src/audio/ambience';
import { FoliageAmbience as ReferenceFoliageAmbience } from './scenarios/foliage-ambience-baseline-v224';
import { createWorld } from '../src/sim/index';
import type { Resource, World } from '../src/sim/types';

type Census={density:Float32Array;columns:number;rows:number};
const bits=(census:FoliageAmbience|ReferenceFoliageAmbience)=>{
  const field=census as unknown as Census;
  return {columns:field.columns,rows:field.rows,
    words:Array.from(new Uint32Array(field.density.buffer,field.density.byteOffset,field.density.length))};
};
function camp(timed=true):World {
  const world=createWorld(224,32,32);world.tick=0;world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.resources=[];
  for(let i=0;i<192;i++)world.resources.push({id:world.nextId++,kind:i%3===0?'berries':'tree',
    species:i%3===0?'berry-bush':'oak',x:2+i%24,z:2+Math.floor(i/24),amount:10,
    growth:timed&&i%19===0 ? .123+(i%5)*.1 : 1,growthTick:0,growthThermalFactor:1});
  if(timed)world.resources[7]!.plantLife={since:0,age:0,darkTicks:0,leaflessAt:0,nextCheck:7000};
  world.resources.push({id:world.nextId++,kind:'tree',species:'saguaro',x:31,z:31,amount:20,growth:.2,growthTick:0});
  world.resources.push({id:world.nextId++,kind:'rice',x:3,z:12,amount:8,growth:.1,growthTick:0});
  return world;
}
function oracle(){
  const reference=new ReferenceFoliageAmbience(),candidate=new FoliageAmbience();
  return (world:World,immutable=true)=>{
    const before=structuredClone(world);
    reference.adopt(world);candidate.adopt(world,immutable);
    expect(world).toStrictEqual(before);expect(bits(candidate)).toEqual(bits(reference));
    for(const [x,z]of [[0,0],[16,16],[31,31],[-10,5],[16-.001,16],[16+.001,16],[NaN,0]])
      expect(Object.is(candidate.gain(x!,z!),reference.gain(x!,z!))).toBe(true);
    return bits(candidate);
  };
}

test('immutable foliage captures preserve exact Float32 accumulation order through growth, leaf expiry and reordered snapshots',()=>{
  const base=camp(),read=oracle();const initial=read(base);
  for(const tick of [1,1500,2500,5999,6000,6001,18000,30000,36000])read({...base,tick});
  expect(read({...base,tick:6000}).words).not.toEqual(initial.words);
  const copied={...base,tick:6000,resources:base.resources.slice()};read(copied);
  const replaced=copied.resources.map((resource,index)=>index===29?{...resource,x:27}:resource);
  read({...copied,resources:replaced});
  read({...copied,resources:replaced.slice().reverse()});
  read({...copied,resources:replaced.filter((_,index)=>index!==8)});
  const added:Resource={id:base.nextId++,kind:'berries',species:'berry-bush',x:26,z:15,amount:10,growth:.283,growthTick:6000};
  read({...copied,resources:[...replaced,added]});
});

test('fully stable foliage can retain the census while still noticing same-tick replacement and mutable revocation',()=>{
  const world=camp(false),read=oracle();read(world);read({...world,tick:1});read({...world,tick:500});
  read({...world,tick:500,resources:world.resources.map((resource,index)=>index===0?{...resource,x:25}:resource)});
  read(world,false);
  world.resources[1]!.x=28;world.resources[1]!.growth=.13;
  read(world,false);read({...world,tick:1500});
  read({...world,tick:1500},false);
  world.resources[2]!.species='saguaro';read({...world,tick:1500});
  read({...world,tick:1500},false);
  world.resources[3]!.plantLife={since:0,age:0,darkTicks:0,leaflessAt:1500,nextCheck:9000};
  read({...world,tick:1500});read({...world,tick:7499});read({...world,tick:7500});
});

test('census dimensions, empty replacement and resumed immutable ownership match the original mutable implementation',()=>{
  const world=camp(),read=oracle();read(world);
  const wider={...world,width:64,height:32,tiles:Array.from({length:2048},()=>({terrain:'grass' as const}))};read(wider);
  const taller={...wider,width:32,height:64};read(taller);
  const empty={...taller,resources:[]};read(empty);read({...empty,tick:12000});
  read({...world,tick:12000});read(world,false);read({...world,tick:12001});
});
