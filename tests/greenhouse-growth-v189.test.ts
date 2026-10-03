import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { annualGrowingLightIntegral } from '../src/sim/environment.ts';
import { crashlandedProfile } from '../src/sim/game-profile.ts';
import { LightEnvironmentCache } from '../src/sim/light-environment.ts';
import { checkpointPlantGrowth,reconcilePlantLighting } from '../src/sim/plant-lighting.ts';
import { fullGrowingLightIntegral,plantGrowth,PLANT_DEFINITIONS } from '../src/sim/plants.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { reconcilePower } from '../src/sim/power.ts';
import { addGroundMaterial,refreshStock } from '../src/sim/materials.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { adoptSiteClimate,climateTick } from '../src/sim/site-climate.ts';
import { reconcileTemperature } from '../src/sim/temperature.ts';
import { updatePlantTemperatures } from '../src/sim/thermal-plants.ts';
import type { Command,Pawn,Resource,Structure,World } from '../src/sim/types.ts';
import { deconstructionCamp } from './scenarios/deconstruction.ts';
import { fixturePower } from './scenarios/power.ts';

function command(w:World,c:Command):void {expect(applyCommand(w,c),JSON.stringify(c)).toMatchObject({ok:true});}
function valid(w:World):void {const errors=validateWorld(w);expect(errors,JSON.stringify({tick:w.tick,errors})).toEqual([]);}
function until(w:World,done:()=>boolean,max=1000):void {
  for(let n=0;n<max&&!done();n++)stepWorld(w);
  valid(w);expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns.map(p=>({xy:[p.x,p.z],job:p.jobId})),structures:w.structures})).toBe(true);
}
function replay(w:World,ticks=17):void {
  valid(w);const resumed=deserializeWorld(serializeWorld(w));stepWorld(w,ticks);stepWorld(resumed,ticks);expect(resumed).toEqual(w);valid(w);
}
function crop(w:World,x:number,z:number):Resource {
  const plant:Resource={id:w.nextId++,kind:'rice',x,z,amount:6,growth:.2,growthTick:w.tick};
  w.resources=[...w.resources,plant];return plant;
}
/** Prepared physical room and fueled connected generators. Actual power startup,
 * switch work, construction, sowing and growth are advanced by stepWorld. */
function greenhouse(kind:'sun-lamp'|'standing-lamp'='sun-lamp',climate=true) {
  const w=deconstructionCamp(1),p=w.pawns[0]!;w.tick=2000;w.stockpiles=[];w.packed=[];w.growingZones=[];
  p.x=8;p.z=7;p.hunger=p.rest=100;p.recreation.level=100;p.apparelAutomation=false;p.schedule.fill('work');
  for(const work of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[work]=0;
  for(let z=2;z<=12;z++)for(let x=2;x<=12;x++)if(x===2||x===12||z===2||z===12)
    w.structures.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard'});
  const roofs:number[]=[];for(let z=3;z<=11;z++)for(let x=3;x<=11;x++)roofs.push(z*w.width+x);
  w.roofing={constructed:roofs,build:[],remove:[],cursor:0};
  for(const x of [14,16,18])fixturePower(w,'wood-generator',x,4);
  const lamp:Structure={id:w.nextId++,kind,x:8,z:8,orientation:0,footprint:'standard',material:'steel',power:newPowerState(kind)};
  w.structures.push(lamp);const left=crop(w,5,8),right=crop(w,9,8);
  if(climate)command(w,{type:'climate-adopt'});
  refreshStock(w);reconcilePower(w);reconcileTemperature(w);valid(w);
  return {w,p,lamp,left,right};
}
function start(fixture:ReturnType<typeof greenhouse>):void {
  until(fixture.w,()=>fixture.lamp.power!.on,200);
  expect(fixture.lamp.power!.parentId).not.toBeNull();
}
function fullOracle(w:World,from:number,to:number):number {
  let sum=0;
  for(let tick=from+1;tick<=to;tick++) {
    const civil=climateTick(w,tick),phase=((civil%6000)+6000)%6000;
    if(phase>=1500&&phase<=4800)sum++;
  }
  return sum;
}

test('full artificial integral counts civil ticks independently, including rest boundaries and year crossing',()=>{
  const historical=deconstructionCamp(0),profile=deconstructionCamp(0);profile.gameProfile=crashlandedProfile();
  for(const w of [historical,profile]) {
    if(w===profile){w.tick=1731;adoptSiteClimate(w);}
    for(const [from,to] of [[1499,1500],[1500,1501],[4799,4800],[4800,4801],[5998,7502],[359900,360200]] as const)
      expect(fullGrowingLightIntegral(w,to)-fullGrowingLightIntegral(w,from)).toBe(fullOracle(w,from,to));
    expect(fullGrowingLightIntegral(w,6000)-fullGrowingLightIntegral(w,0)).toBe(3301);
  }
});

test('powered crops grow under a real roof; physical flicks checkpoint the old interval and resume without catch-up',()=>{
  const fixture=greenhouse(),{w,p,lamp,left}=fixture;start(fixture);
  expect(left.growthLight).toBe('artificial-full');const initial=plantGrowth(w,left),from=w.tick;
  replay(w,120);
  expect(plantGrowth(w,left)).toBeCloseTo(initial+fullOracle(w,from,w.tick)/(PLANT_DEFINITIONS.rice.growDays*6000),12);
  p.priorities.basic=1;command(w,{type:'power-flick',structureId:lamp.id,on:false});
  expect(lamp.power!.switchOn).not.toBe(false);
  until(w,()=>w.jobs.some(j=>j.flick?.structureId===lamp.id&&j.progress===10));
  replay(w,3);expect(lamp.power!.switchOn).toBe(false);expect(left.growthLight).toBe('dark');
  const stopped=plantGrowth(w,left);replay(w,100);expect(plantGrowth(w,left)).toBe(stopped);
  command(w,{type:'power-flick',structureId:lamp.id,on:true});
  until(w,()=>lamp.power!.switchOn===true);expect(lamp.power!.on).toBe(false);
  until(w,()=>lamp.power!.on);expect(left.growthLight).toBe('artificial-full');
  expect(plantGrowth(w,left)).toBe(stopped);replay(w,50);expect(plantGrowth(w,left)).toBeGreaterThan(stopped);
});

test('ordinary glow remains insufficient for growth and darkness, while full glow resets exposure at the individual vital check',()=>{
  const ordinary=greenhouse('standing-lamp'),full=greenhouse();start(ordinary);start(full);
  const cache=new LightEnvironmentCache();expect(cache.read(ordinary.w).lightAt(ordinary.left)).toBe(.5);
  const stopped=plantGrowth(ordinary.w,ordinary.left),beforeDark=ordinary.left.plantLife!.darkTicks;
  stepWorld(ordinary.w,250);stepWorld(full.w,250);valid(ordinary.w);valid(full.w);
  expect(plantGrowth(ordinary.w,ordinary.left)).toBe(stopped);
  expect(ordinary.left.plantLife!.darkTicks).toBeGreaterThan(beforeDark);
  expect(full.left.plantLife!.darkTicks).toBe(0);expect(plantGrowth(full.w,full.left)).toBeGreaterThan(.2);
  expect(ordinary.left.damage).toBeUndefined();expect(full.left.damage).toBeUndefined();
});

test('real wall construction cuts horticultural coverage without rewinding either crop; an actual new sowing starts at its birth',()=>{
  const fixture=greenhouse(),{w,p,left,right}=fixture;start(fixture);p.priorities.build=1;
  addGroundMaterial(w,'wood',25,{x:8,z:9},'wood');
  for(let z=6;z<=10;z++)command(w,{type:'designate',kind:'wall',material:'wood',x:6,z});
  until(w,()=>w.jobs.some(j=>j.kind==='wall'&&j.status==='active'));replay(w,5);
  until(w,()=>[6,7,8,9,10].every(z=>w.structures.some(s=>s.kind==='wall'&&s.x===6&&s.z===z)),1600);
  expect(left.growthLight).toBe('dark');expect(right.growthLight).toBe('artificial-full');
  const stopped=plantGrowth(w,left),growing=plantGrowth(w,right);replay(w,40);
  expect(plantGrowth(w,left)).toBe(stopped);expect(plantGrowth(w,right)).toBeGreaterThan(growing);
  p.priorities.build=0;p.priorities.grow=1;
  command(w,{type:'area',action:'growing',from:{x:9,z:9},to:{x:9,z:9}});
  until(w,()=>w.resources.some(r=>r.kind==='rice'&&r.x===9&&r.z===9));
  const born=w.resources.find(r=>r.kind==='rice'&&r.x===9&&r.z===9)!;
  expect(born.growth).toBe(.0001);expect(born.growthTick).toBe(w.tick);expect(born.plantLife!.bornAt).toBe(w.tick);
  expect(born.growthLight).toBe('artificial-full');expect(plantGrowth(w,born)).toBe(.0001);
  replay(w,20);expect(plantGrowth(w,born)).toBeGreaterThan(.0001);
});

test('temperature changes and civil adoption settle artificial growth before changing the interval source',()=>{
  const fixture=greenhouse('sun-lamp',false),{w,left}=fixture;start(fixture);stepWorld(w,50);
  let layout=reconcileTemperature(w);const room=layout.indices[left.z*w.width+left.x]!;
  const acquired=plantGrowth(w,left);w.thermal!.regions[room]!.temperature=3;updatePlantTemperatures(w,layout);
  expect(left.growth).toBe(acquired);expect(left.growthThermalFactor).toBe(.5);
  const anchor=w.tick;w.tick+=20;
  const cooled=acquired+fullOracle(w,anchor,w.tick)*.5/(PLANT_DEFINITIONS.rice.growDays*6000);
  expect(plantGrowth(w,left)).toBeCloseTo(cooled,12);
  expect(adoptSiteClimate(w)).toBe(true);expect(plantGrowth(w,left)).toBeCloseTo(cooled,12);
  expect(left.plantLife).toMatchObject({since:w.tick,age:0,darkTicks:0});
  expect(left.growthTick).toBe(w.tick);layout=reconcileTemperature(w);w.thermal!.regions[room]!.temperature=21;
  updatePlantTemperatures(w,layout);expect(left.growthThermalFactor).toBeUndefined();
  const saved=deserializeWorld(serializeWorld(w));stepWorld(w,30);stepWorld(saved,30);expect(saved).toEqual(w);valid(w);
});

test('stable reconciliation avoids plant visits and historical maps avoid resolving the light reader; primitive roof edits remain observable',()=>{
  const historical=deconstructionCamp(0);historical.tick=2000;const plain=crop(historical,4,4);
  const outdoor=crop(historical,6,4);
  historical.roofing={constructed:[4*historical.width+4],build:[],remove:[],cursor:0};
  reconcilePlantLighting(historical,()=>{throw new Error('Historical map should not request a light flood');});
  expect(plain.growthLight).toBeUndefined();
  historical.tick+=300;
  reconcilePlantLighting(historical,()=>{throw new Error('Stable historical map should not request a light flood');});
  expect(outdoor.growth).toBe(.2);expect(outdoor.growthTick).toBe(2000);expect(outdoor.growthLight).toBeUndefined();
  expect(plantGrowth(historical,outdoor)).toBeCloseTo(.2+
    (annualGrowingLightIntegral(historical)-annualGrowingLightIntegral(historical,2000))/(3*6000),12);
  const fixture=greenhouse(),{w,lamp}=fixture;start(fixture);const cache=new LightEnvironmentCache();
  let visits=0;w.resources=w.resources.map(plant=>new Proxy(plant,{get(target,key,receiver){visits++;return Reflect.get(target,key,receiver);}}));
  reconcilePlantLighting(w,cache.read(w));const before=JSON.stringify(w);visits=0;
  reconcilePlantLighting(w,cache.read(w));expect(visits).toBe(0);expect(JSON.stringify(w)).toBe(before);
  // No lamp remains: settling captured intervals does not need ordinary glow.
  w.structures=w.structures.filter(s=>s!==lamp);
  reconcilePlantLighting(w,()=>{throw new Error('No horticultural source remains');});
  const left=w.resources[0]!;expect(left.growthLight).toBe('dark');const held=left.growth;
  checkpointPlantGrowth(w,left);
  const cell=left.z*w.width+left.x,position=w.roofing!.constructed.indexOf(cell);
  w.roofing!.constructed.splice(position,1);
  reconcilePlantLighting(w,()=>{throw new Error('Primitive roof edit needs no artificial flood');});
  expect(left.growthLight).toBeUndefined();expect(plantGrowth(w,left)).toBe(held);
  const from=w.tick;w.tick+=20;
  expect(plantGrowth(w,left)).toBeCloseTo(held!+(annualGrowingLightIntegral(w)-annualGrowingLightIntegral(w,from))/(3*6000),12);
});
