import { withoutPawnSkills, withMigratedSkills } from './scenarios/legacy-skills';
import { expect,test } from 'vitest';
import { passiveCoolingFixture,fixtureCooler } from './scenarios/passive-cooling';
import { applyCommand,stepWorld,serializeWorld,deserializeWorld,validateWorld } from '../src/sim/index';
import { reconcileTemperature } from '../src/sim/temperature';
import { applyThermalSources } from '../src/sim/thermal-sources';
import { burnFuel,fuelCapacity,wantsFuel,PASSIVE_COOLER_CAPACITY } from '../src/sim/fuel';
import { rotAge } from '../src/sim/food-preservation';
import { woodAccount } from './scenarios/colony-player';
import { queryOrderOptions } from '../src/sim/player-orders';
import { canStandAt,furnitureDelay } from '../src/sim/furniture-travel';
import { groundOccupancyAllows,storageOccupancyAllows } from '../src/sim/occupancy';
import { constructionRecipe } from '../src/sim/construction-materials';
import type { World } from '../src/sim/types';
import { coolingDecisions } from './scenarios/cooling-player';

function until(w:World,condition:()=>boolean,max=1200) {
  for(let i=0;i<max&&!condition();i++)stepWorld(w);
  expect(condition(),`tick ${w.tick}`).toBe(true);expect(validateWorld(w)).toEqual([]);
}

test('physical 50-wood construction, cooling without refrigeration, empty refill, interruption and deconstruction conserve matter',()=>{
  const w=passiveCoolingFixture(),initial=woodAccount(w),pawn=w.pawns[0]!;
  expect(constructionRecipe({kind:'passive-cooler',material:'wood'})).toMatchObject({work:20,coreWork:200,ingredients:[{item:'wood',quantity:50}]});
  expect(applyCommand(w,{type:'designate',kind:'passive-cooler',material:'wood',x:16,z:16}).ok).toBe(true);
  until(w,()=>w.jobs[0]?.construction==='frame');
  expect(w.structures.some(s=>s.kind==='passive-cooler')).toBe(false);
  const resumed=deserializeWorld(serializeWorld(w)),control=structuredClone(w);stepWorld(resumed,200);stepWorld(control,200);expect(resumed).toEqual(control);
  until(w,()=>w.structures.some(s=>s.kind==='passive-cooler'));
  const cooler=w.structures.find(s=>s.kind==='passive-cooler')!;
  expect(cooler.fuel).toEqual({ticks:30000,burned:0,autoRefuel:true});expect(cooler.bills).toBeUndefined();expect(woodAccount(w)).toBe(initial);
  const baseline=structuredClone(w);baseline.structures.find(s=>s.id===cooler.id)!.fuel!.ticks=0;baseline.structures.find(s=>s.id===cooler.id)!.fuel!.autoRefuel=false;
  stepWorld(w,500);stepWorld(baseline,500);
  expect(w.thermal!.regions[0]!.temperature).toBe(17);
  expect(baseline.thermal!.regions[0]!.temperature).toBeGreaterThan(22);
  const food=w.piles.find(p=>p.item==='rice')!,other=baseline.piles.find(p=>p.id===food.id)!;
  expect(rotAge(food,w.tick)).toBe(rotAge(other,baseline.tick));expect(food.rot?.rate??1).toBe(1);
  expect(canStandAt(w,cooler)).toBe(false);expect(furnitureDelay(w,{x:15,z:16},cooler)).toBe(3);
  expect(groundOccupancyAllows(w,cooler)).toBe(false);expect(storageOccupancyAllows(w,cooler)).toBe(false);
  expect(applyCommand(w,{type:'designate',kind:'uninstall',x:16,z:16}).ok).toBe(false);
  expect(applyCommand(w,{type:'refuel-policy',structureId:cooler.id,enabled:false}).ok).toBe(true);
  // Advance only the fuel subsystem to its boundary, retaining its accounting
  // and valid global tick. Full air/actor continuation is exercised above.
  const remaining=cooler.fuel!.ticks;for(let i=0;i<remaining;i++){w.tick++;burnFuel(w);}
  expect(cooler.fuel).toMatchObject({ticks:0,burned:30000});expect(w.structures).toContain(cooler);
  expect(fuelCapacity(w,cooler.id)).toBe(0);expect(fuelCapacity(w,cooler.id,undefined,true)).toBe(50);
  expect(applyCommand(w,{type:'refuel-policy',structureId:cooler.id,enabled:true}).ok).toBe(true);
  until(w,()=>pawn.haul?.destination.type==='fuel'&&pawn.haul.phase==='deliver');
  const interrupted=structuredClone(w);expect(applyCommand(interrupted,{type:'refuel-policy',structureId:cooler.id,enabled:false}).ok).toBe(true);
  expect(interrupted.pawns[0]!.haul).toBeNull();expect(woodAccount(interrupted)).toBe(initial);
  const saved=deserializeWorld(serializeWorld(w));stepWorld(saved,120);const parallel=structuredClone(w);stepWorld(parallel,120);expect(saved).toEqual(parallel);
  until(w,()=>cooler.fuel!.ticks>0);expect(woodAccount(w)).toBe(initial);
  // Manual order bypasses the automatic toggle, but retains real pickup,
  // exclusive reservation and the 24-tick refuel service.
  applyCommand(w,{type:'refuel-policy',structureId:cooler.id,enabled:false});
  const option=queryOrderOptions(w,pawn.id,cooler).find(o=>o.haulTarget?.type==='fuel');expect(option?.enabled).toBe(true);
  expect(applyCommand(w,{type:'order-haul',pawnId:pawn.id,target:{type:'fuel',structureId:cooler.id},queue:false}).ok).toBe(true);
  until(w,()=>!!pawn.haul?.serviceProgress);expect(cooler.fuel!.ticks).toBeLessThan(6000);
  const inService=deserializeWorld(serializeWorld(w));stepWorld(inService,50);const peer=structuredClone(w);stepWorld(peer,50);expect(inService).toEqual(peer);
  until(w,()=>pawn.haul===null);expect(cooler.fuel!.ticks).toBeGreaterThan(10000);expect(woodAccount(w)).toBe(initial);
  expect(applyCommand(w,{type:'designate',kind:'deconstruct',x:16,z:16}).ok).toBe(true);
  until(w,()=>!w.structures.some(s=>s.id===cooler.id));
  expect(w.deconstructed.fuelTicks).toBe(42000);expect(w.deconstructed.lostWood).toBe(0);expect(woodAccount(w)).toBe(initial);
});

test('threshold, volume, continuous idle fuel, outside, concurrent sources and strict V39 migration',()=>{
  const w=passiveCoolingFixture(),s=fixtureCooler(w),layout=reconcileTemperature(w),room=w.thermal!.regions[0]!;
  for(const t of [-5,17,17.01,35]) {
    room.temperature=t;const fuel=s.fuel!.ticks;applyThermalSources(w,layout);burnFuel(w);w.tick++;
    expect(room.temperature).toBe(t<=17?t:Math.max(17,t-11/6/16));expect(s.fuel!.ticks).toBe(fuel-1);
  }
  const second=fixtureCooler(w);second.x=17;room.temperature=35;applyThermalSources(w,layout);expect(room.temperature).toBeCloseTo(35-22/6/16,12);
  w.structures.pop();s.fuel!.ticks=9001;expect(wantsFuel(w,s)).toBe(false);s.fuel!.ticks=9000;expect(wantsFuel(w,s)).toBe(true);
  const outside=structuredClone(w);outside.structures=outside.structures.filter(o=>o.kind!=='wall');const outdoors=reconcileTemperature(outside);applyThermalSources(outside,outdoors);burnFuel(outside);expect(outside.thermal?.regions??[]).toEqual([]);expect(outside.structures[0]!.fuel!.ticks).toBe(8999);
  const valid=serializeWorld(w);expect(validateWorld(w)).toEqual([]);
  for(const mutate of [(v:World)=>v.schemaVersion=39 as 43,(v:World)=>{delete v.structures.at(-1)!.material;},(v:World)=>v.structures.at(-1)!.orientation=1,(v:World)=>v.structures.at(-1)!.fuel!.ticks=PASSIVE_COOLER_CAPACITY+1,(v:World)=>v.structures.at(-1)!.bills=[]]) {
    const bad=JSON.parse(valid);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  }
  const old=passiveCoolingFixture(),legacy=JSON.parse(serializeWorld(old));(legacy.schemaVersion=39,withoutPawnSkills(legacy));expect(deserializeWorld(JSON.stringify(legacy))).toEqual(withMigratedSkills(old));
  const choices=coolingDecisions(old);expect(choices).toHaveLength(1);expect(applyCommand(old,choices[0]!.command).ok).toBe(true);expect(coolingDecisions(old)).toEqual([]);
  expect(coolingDecisions(outside)).toEqual([]);
  for(const material of [undefined,'steel','granite-blocks'] as const)expect(applyCommand(old,{type:'designate',kind:'passive-cooler',material,x:16,z:16}).ok).toBe(false);
});
