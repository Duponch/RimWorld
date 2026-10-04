import { expect,test } from 'vitest';
import { applyCommand,createWorld,stepWorld } from '../src/sim/engine.ts';
import { adoptWeather } from '../src/sim/weather.ts';
import { footprintCells } from '../src/sim/definitions.ts';
import { BATTERY_ENERGY_SCALE,batteryWattDays } from '../src/sim/power-battery.ts';
import { structureMaxHp } from '../src/sim/thing-damage-rules.ts';
import { triggerBreakdown } from '../src/sim/breakdowns.ts';
import { fixturePower } from './scenarios/power.ts';
import { adoptRainElectrical,advanceRainElectrical,isRainElectricalKind,rainElectricalEligible,RAIN_ELECTRICAL_KINDS } from '../src/sim/rain-electric.ts';
import { validRainElectrical } from '../src/sim/rain-electric-save.ts';
import { advanceRainClock,rainElectricBuilding,rainElectricCamp } from './helpers/rain-electric-v194.ts';
import type { World } from '../src/sim/types.ts';

/** Independent stream oracle: masks each shift as unsigned arithmetic. */
function draws(seed:number,count:number):{state:number;values:number[]} {
  let n=seed>>>0;const values:number[]=[];
  for(let i=0;i<count;i++){
    n=(n^((n*8192)>>>0))>>>0;n=(n^Math.floor(n/131072))>>>0;n=(n^((n*32)>>>0))>>>0;
    values.push(n/2**32);
  }
  return {state:n,values};
}
function seedWhere(predicate:(values:number[])=>boolean):number {
  for(let seed=1;seed<1_000_000;seed++)if(predicate(draws(seed,5).values))return seed;
  throw Error('No prepared stream seed.');
}
const admittedSeed=()=>seedWhere(v=>v[0]!<.02&&v[1]!<.2);
function attempt(world:World,seed:number):number {
  world.rainElectrical!.rng=seed;
  const core=(Math.floor(world.rainElectrical!.lastCoreTick/97)+1)*97;
  while(world.tick*10<core){advanceRainClock(world);advanceRainElectrical(world);}
  return core;
}

test('adoption is prospective, pause and absent weather leave the streams untouched',()=>{
  const world=createWorld(194,32,32),before=JSON.stringify(world);
  stepWorld(world,0);expect(JSON.stringify(world)).toBe(before);
  adoptRainElectrical(world);expect(world.rainElectrical).toBeUndefined();
  adoptWeather(world);const rng=world.rng,weatherRng=world.weather!.rng;
  adoptRainElectrical(world);
  expect(world.rainElectrical).toEqual({revision:1,adoptedAt:world.tick,lastCoreTick:world.tick*10,rng:((world.seed^0x278fd37b)>>>0)||1,discharges:0});
  const state=JSON.stringify(world.rainElectrical);adoptRainElectrical(world);advanceRainElectrical(world);
  expect(JSON.stringify(world.rainElectrical)).toBe(state);expect(world.rng).toBe(rng);expect(world.weather!.rng).toBe(weatherRng);
});

test('97 Core boundaries, singleton selection and a real Flame contact keep independent streams',()=>{
  const world=rainElectricCamp(),heater=rainElectricBuilding(world,'heater'),seed=admittedSeed();
  world.rainElectrical!.rng=seed;const worldRng=world.rng,weatherRng=world.weather!.rng;
  const core=(Math.floor(world.tick*10/97)+1)*97;
  while((world.tick+1)*10<core){advanceRainClock(world);advanceRainElectrical(world);}
  expect(world.rainElectrical!.rng).toBe(seed);expect(world.rainElectrical!.discharges).toBe(0);
  advanceRainClock(world);advanceRainElectrical(world);
  expect(world.rainElectrical!.rng).toBe(draws(seed,3).state);
  expect(world.rainElectrical!.lastDischarge).toEqual({coreTick:core,structureId:heater.id,kind:'heater',x:10,z:10});
  expect(heater.damage).toBe(5);expect(world.fires).toBeDefined();
  expect(world.events.some(e=>e.message.includes('Décharge électrique'))).toBe(true);
  expect(world.rng).toBe(worldRng);expect(world.weather!.rng).toBe(weatherRng);
  expect(validRainElectrical(world.rainElectrical,181,world)).toBe(true);
  const unchanged=JSON.stringify(world);advanceRainElectrical(world);expect(JSON.stringify(world)).toBe(unchanged);
});

test('zero and certain second chances do not draw; first rejection never collects or selects',()=>{
  const empty=rainElectricCamp(),seed=admittedSeed();attempt(empty,seed);
  expect(empty.rainElectrical!.rng).toBe(draws(seed,1).state);expect(empty.fires).toBeUndefined();
  const dry=rainElectricCamp();rainElectricBuilding(dry,'heater');dry.weather!.current='clear';dry.weather!.previous='clear';attempt(dry,seed);
  expect(dry.rainElectrical!.rng).toBe(draws(seed,1).state);
  const certain=rainElectricCamp();
  for(let i=0;i<5;i++)rainElectricBuilding(certain,'heater',4+i*4,10).power!.on=false;
  attempt(certain,seed);expect(certain.rainElectrical!.rng).toBe(draws(seed,2).state);expect(certain.rainElectrical!.discharges).toBe(0);
  const rejected=rainElectricCamp();rainElectricBuilding(rejected,'heater');
  const refused=seedWhere(v=>v[0]!>=.02);attempt(rejected,refused);
  expect(rejected.rainElectrical!.rng).toBe(draws(refused,1).state);expect(rejected.rainElectrical!.discharges).toBe(0);
});

test('covered and inactive candidates still count, without reroll after selecting a protected anchor',()=>{
  const world=rainElectricCamp(),protectedBuilding=rainElectricBuilding(world,'heater',8,8);
  rainElectricBuilding(world,'heater',20,20);
  world.roofing={constructed:[protectedBuilding.z*world.width+protectedBuilding.x],build:[],remove:[],cursor:0};
  // Second roll is between the probabilities for one and two candidates.
  const seed=seedWhere(v=>v[0]!<.02&&v[1]!>=.2&&v[1]!<.4&&v[2]!<.5);
  attempt(world,seed);expect(world.rainElectrical!.rng).toBe(draws(seed,3).state);
  expect(world.rainElectrical!.discharges).toBe(0);expect(world.fires).toBeUndefined();
});

test('the ten catalogue properties, real activity, battery threshold and anchor roof remain distinct',()=>{
  const world=rainElectricCamp();
  expect(RAIN_ELECTRICAL_KINDS).toHaveLength(10);
  for(const kind of RAIN_ELECTRICAL_KINDS){const b=rainElectricBuilding(world,kind);expect(rainElectricalEligible(world,b)).toBe(true);}
  for(const kind of ['standing-lamp','cooler','autodoor','wood-generator','solar-generator','wind-turbine','power-conduit','power-switch'] as const){
    const b=rainElectricBuilding(world,kind);expect(isRainElectricalKind(kind)).toBe(false);expect(rainElectricalEligible(world,b)).toBe(false);
  }
  const battery=world.structures.find(b=>b.kind==='battery')!;
  battery.battery!.stored=100*BATTERY_ENERGY_SCALE;expect(rainElectricalEligible(world,battery)).toBe(false);
  battery.battery!.half=true;expect(rainElectricalEligible(world,battery)).toBe(true);
  const tail=footprintCells(battery)[1]!;
  world.roofing={constructed:[tail.z*world.width+tail.x],build:[],remove:[],cursor:0};expect(rainElectricalEligible(world,battery)).toBe(true);
  world.roofing.constructed=[battery.z*world.width+battery.x];expect(rainElectricalEligible(world,battery)).toBe(false);
  world.roofing.constructed=[];
  const sun=world.structures.find(b=>b.kind==='sun-lamp')!;sun.power!.on=false;expect(rainElectricalEligible(world,sun)).toBe(false);
  sun.power!.on=true;sun.power!.switchOn=false;expect(rainElectricalEligible(world,sun)).toBe(false);
  const heater=world.structures.find(b=>b.kind==='heater')!;
  expect(triggerBreakdown(world,heater.id)).toBe(true);expect(heater.power!.on).toBe(false);expect(rainElectricalEligible(world,heater)).toBe(false);
  world.structures=world.structures.filter(b=>b!==battery);expect(rainElectricalEligible(world,battery)).toBe(false);
});

test('rotated emprises draw only a non-singleton axis, and rainfall never drains stored energy',()=>{
  for(const orientation of [0,1,2,3] as const){
    const world=rainElectricCamp(),battery=rainElectricBuilding(world,'battery',10,10,orientation),seed=admittedSeed();
    const before=batteryWattDays(battery.battery!),cells=footprintCells(battery);attempt(world,seed);
    const last=world.rainElectrical!.lastDischarge!,r=draws(seed,4);
    expect(world.rainElectrical!.rng).toBe(r.state);expect(cells.some(c=>c.x===last.x&&c.z===last.z)).toBe(true);
    const xs=cells.map(c=>c.x),zs=cells.map(c=>c.z),offset=Math.floor(r.values[3]!*2);
    expect(last.x).toBe(Math.min(...xs)+(orientation%2?offset:0));expect(last.z).toBe(Math.min(...zs)+(orientation%2?0:offset));
    expect(batteryWattDays(battery.battery!)).toBe(before);expect(world.fires!.batteryWicks).toHaveLength(0);
  }
});

test('snow shares the rain risk and a destroyed device leaves one historical contact',()=>{
  const world=rainElectricCamp(),heater=rainElectricBuilding(world,'heater');
  world.weather!.current='snow-hard';world.weather!.previous='snow-hard';heater.damage=structureMaxHp(heater)-1;
  attempt(world,admittedSeed());expect(world.structures.some(s=>s.id===heater.id)).toBe(false);
  expect(world.rainElectrical!.discharges).toBe(1);expect(world.rainElectrical!.lastDischarge!.structureId).toBe(heater.id);
  expect(validRainElectrical(world.rainElectrical,181,world)).toBe(true);
});

test('an electric tailoring bench receives real supply and stops only after physical flick work',()=>{
  const world=rainElectricCamp(32,1),pawn=world.pawns[0]!;
  world.weather!.current='clear';world.weather!.previous='clear';pawn.priorities.basic=1;
  fixturePower(world,'wood-generator',5,5);
  const bench=rainElectricBuilding(world,'electric-tailor-bench',8,8);bench.power!.on=false;
  stepWorld(world,20);expect(bench.power!.parentId).not.toBeNull();expect(bench.power!.on).toBe(true);
  expect(rainElectricalEligible(world,bench)).toBe(true);
  expect(applyCommand(world,{type:'power-flick',structureId:bench.id,on:false}).ok).toBe(true);
  expect(bench.power!.switchOn).not.toBe(false);expect(rainElectricalEligible(world,bench)).toBe(true);
  for(let tick=0;tick<200&&bench.power!.switchOn!==false;tick++)stepWorld(world,1);
  expect(bench.power!.switchOn).toBe(false);expect(bench.power!.on).toBe(false);
  expect(rainElectricalEligible(world,bench)).toBe(false);expect(world.jobs.some(j=>j.flick?.structureId===bench.id)).toBe(false);
});
