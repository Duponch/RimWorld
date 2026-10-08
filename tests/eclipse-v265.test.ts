import { expect,test } from 'vitest';
import { generateWorld } from '../src/sim/generation.ts';
import { activeEclipse,checkpointEclipseGrowth,eclipseLightFactor,ECLIPSE_MAX_DURATION,ECLIPSE_TRANSITION_TICKS } from '../src/sim/eclipse.ts';
import { annualGrowingLightIntegral,annualNaturalLight,growingLightIntegral,naturalLight,seasonalNaturalLight } from '../src/sim/environment.ts';
import { climateTick,siteClimateDefinition,TICKS_PER_YEAR } from '../src/sim/site-climate.ts';
import { fullGrowingLightIntegral,plantGrowth } from '../src/sim/plants.ts';
import { solarPowerOutput } from '../src/sim/solar-rules.ts';
import type { Resource,Structure,World } from '../src/sim/types.ts';

function fixture(start=1200,duration=4500,seasonal=false):World {
  const world=generateWorld(265,16,16);world.tick=start;world.structures=[];world.resources=[];
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));delete world.roofing;delete world.gameProfile;delete world.climate;
  if(seasonal)world.climate={revision:1,profile:'temperate-reference',adoptedAt:0,calendarOrigin:0};
  world.miscIncidents={profile:'cassandra-misc-v1',adoptedAt:0,rng:123,nextCheck:start+100,introDone:true,
    checks:0,opportunities:0,heatwaves:0,weather:{adoptedAt:0,coldSnaps:0,eclipses:1,eclipse:{start,end:start+duration}}};
  return world;
}
function lightOracle(world:World,tick:number):number {
  const civil=climateTick(world,tick),interval=world.miscIncidents?.weather?.eclipse;
  const base=world.climate?seasonalNaturalLight(siteClimateDefinition(world).latitude,civil):naturalLight(civil);
  const dim=interval&&tick>=interval.start&&tick<interval.end
    ?Math.max(0,Math.min(1,(tick-interval.start)/20,(interval.end-tick)/20)):0;
  return base*(1-dim);
}
function intervalOracle(world:World,from:number,to:number):number {
  let sum=0;
  for(let tick=from+1;tick<=to;tick++) {
    const civil=climateTick(world,tick),phase=((civil%6000)+6000)%6000/6000;
    if(phase>=.25&&phase<=.8)sum+=Math.max(0,(lightOracle(world,tick)-.51)/.49);
  }
  return sum;
}
const integralBetween=(world:World,from:number,to:number)=>annualGrowingLightIntegral(world,to)-annualGrowingLightIntegral(world,from);

test('eclipse: absence preserves historical light and integral exactly',()=>{
  const world=fixture();delete world.miscIncidents;
  for(const tick of [0,1500,3000,4800,6000,123456]) {
    expect(annualNaturalLight(world,tick)).toBe(naturalLight(tick));
    expect(annualGrowingLightIntegral(world,tick)).toBe(growingLightIntegral(tick));
  }
  expect(activeEclipse(world)).toBeUndefined();expect(eclipseLightFactor(world)).toBe(1);
});

test('eclipse: strict active bounds and two twenty-tick transitions',()=>{
  const world=fixture(),{start,end}=world.miscIncidents!.weather!.eclipse!;
  expect(ECLIPSE_TRANSITION_TICKS).toBe(20);
  expect(activeEclipse(world,start-1)).toBeUndefined();expect(activeEclipse(world,start)).toEqual({start,end});
  expect(activeEclipse(world,end)).toBeUndefined();
  for(const [tick,factor] of [[start,1],[start+10,.5],[start+20,0],[end-20,0],[end-10,.5],[end,1]])
    expect(eclipseLightFactor(world,tick)).toBe(factor);
});

test('eclipse: natural daylight reaches zero, without creating light at night',()=>{
  const world=fixture(1000);
  expect(annualNaturalLight(world,3000)).toBe(0);
  for(const tick of [0,1000,1010,1020,5480,5490,5500,6000])expect(annualNaturalLight(world,tick)).toBe(lightOracle(world,tick));
});

test('eclipse: solar uses the same natural glow and existing roof fraction',()=>{
  const world=fixture(2900),solar:Structure={id:1,kind:'solar-generator',x:4,z:4,orientation:0,footprint:'standard'};
  world.tick=2900;expect(solarPowerOutput(world,solar)).toBeCloseTo(1700*lightOracle(world,2900),12);
  world.roofing={constructed:[4*world.width+4],build:[],remove:[],cursor:0};
  expect(solarPowerOutput(world,solar)).toBeCloseTo(1700*lightOracle(world,2900)*15/16,12);
  world.tick=3000;expect(solarPowerOutput(world,solar)).toBe(0);
});

test('eclipse: fixed-site integral matches inclusive scalar oracle across rest and transitions',()=>{
  const world=fixture();
  for(const [from,to] of [[0,1200],[1200,1220],[1220,4780],[4780,5700],[5700,6200],[1100,6100]])
    expect(integralBetween(world,from!,to!)).toBeCloseTo(intervalOracle(world,from!,to!),8);
});

test('eclipse: seasonal integral crosses year and maximum-duration boundaries',()=>{
  const start=TICKS_PER_YEAR-2000,world=fixture(start,ECLIPSE_MAX_DURATION,true);
  for(const [from,to] of [[start-10,start+30],[start,start+7500],[start+7480,start+7600]])
    expect(integralBetween(world,from!,to!)).toBeCloseTo(intervalOracle(world,from!,to!),8);
});

test('eclipse: derived loss cache follows climate origin, latitude and event replacement',()=>{
  const world=fixture(1200,4500,true);
  for(const profile of ['temperate-reference','boreal-reference','arid-reference'] as const) {
    world.climate!.profile=profile;world.climate!.calendarOrigin+=1199;
    expect(integralBetween(world,1200,5700)).toBeCloseTo(intervalOracle(world,1200,5700),8);
  }
  world.miscIncidents!.weather!.eclipse={start:6000,end:10500};
  expect(integralBetween(world,6000,10500)).toBeCloseTo(intervalOracle(world,6000,10500),8);
});

test('eclipse: boundary checkpoints preserve growth before installation and after deletion',()=>{
  const world=fixture(),interval=world.miscIncidents!.weather!.eclipse!;
  delete world.miscIncidents!.weather!.eclipse;
  const plant:Resource={id:10,kind:'rice',x:4,z:4,amount:6,growth:.2,growthTick:1000};world.resources=[plant];
  const acquired=plantGrowth(world,plant);checkpointEclipseGrowth(world);
  expect(plant.growth).toBe(acquired);world.miscIncidents!.weather!.eclipse=interval;
  world.tick=interval.end;
  const expected=acquired+intervalOracle(world,interval.start,interval.end)/(3*6000);
  checkpointEclipseGrowth(world);expect(plant.growth).toBeCloseTo(expected,12);
  delete world.miscIncidents!.weather!.eclipse;expect(plantGrowth(world,plant)).toBe(plant.growth);
  world.tick+=100;
  expect(plantGrowth(world,plant)).toBeCloseTo(expected+(growingLightIntegral(world.tick)-growingLightIntegral(interval.end))/(3*6000),12);
});

test('eclipse: artificial full light keeps its independent growth integral',()=>{
  const world=fixture(),plant:Resource={id:10,kind:'rice',x:4,z:4,amount:6,growth:.2,growthTick:1200,growthLight:'artificial-full'};
  world.resources=[plant];world.roofing={constructed:[4*world.width+4],build:[],remove:[],cursor:0};world.tick=4000;
  const expected=.2+(fullGrowingLightIntegral(world,4000)-fullGrowingLightIntegral(world,1200))/(3*6000);
  expect(plantGrowth(world,plant)).toBe(expected);checkpointEclipseGrowth(world);expect(plant.growth).toBe(expected);
});

test('eclipse: JSON continuation reconstructs derived prefix exactly without changing state or RNG',()=>{
  const world=fixture(1200,7500,true);world.tick=3200;
  const state=JSON.stringify(world),before=annualGrowingLightIntegral(world),resumed:World=JSON.parse(state);
  expect(annualGrowingLightIntegral(resumed)).toBe(before);
  for(const tick of [3210,4800,6000,8700,9000]) {
    world.tick=resumed.tick=tick;
    expect(annualGrowingLightIntegral(resumed)).toBe(annualGrowingLightIntegral(world));
    expect(annualNaturalLight(resumed)).toBe(annualNaturalLight(world));
  }
  world.tick=3200;expect(JSON.stringify(world)).toBe(state);
});

test('eclipse: malformed unbounded intervals cannot allocate an arbitrary prefix',()=>{
  const world=fixture(1200,7501);expect(()=>annualGrowingLightIntegral(world,1201)).toThrow('Invalid bounded eclipse interval');
});
