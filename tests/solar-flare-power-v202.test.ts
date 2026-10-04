import { expect,test } from 'vitest';
import { createWorld } from '../src/sim/engine.ts';
import { advancePower,reconcilePower } from '../src/sim/power.ts';
import { newPowerState,powerWatts } from '../src/sim/power-rules.ts';
import { BATTERY_ENERGY_SCALE } from '../src/sim/power-battery.ts';
import { burnFuel,newBuildingFuel } from '../src/sim/fuel.ts';
import { lightSources } from '../src/sim/light-sources.ts';
import { sunLampActive } from '../src/sim/sun-lamp.ts';
import { productionStationUsable } from '../src/sim/production-recipes.ts';
import { WorkEnvironmentCache } from '../src/sim/work-environment.ts';
import { coolerFaces,advanceCoolers,newCoolerState } from '../src/sim/cooler.ts';
import { reconcileTemperature } from '../src/sim/temperature.ts';
import { updateDoors } from '../src/sim/doors.ts';
import { doorOpenness,doorOpenTicks,newDoorState } from '../src/sim/door-rules.ts';
import { rainElectricalEligible } from '../src/sim/rain-electric.ts';
import { canBreakdownNow,triggerBreakdown } from '../src/sim/breakdowns.ts';
import type { Structure,StructureKind,World } from '../src/sim/types.ts';

/** Prepared domain clock: only power boundaries run, not a natural incident
 * opportunity. Each supplied condition has an ordinary 9000–30000 Core span. */
function camp(endCore=29000):World {
  const w=createWorld(202,32,32);
  w.tick=2000;w.tiles=w.tiles.map(()=>({terrain:'grass'}));
  w.structures=[];w.resources=[];w.pawns=[];w.packed=[];w.piles=[];
  delete w.climate;delete w.gameProfile;delete w.roofing;
  w.worldIncidents={profile:'cassandra-world-v1',adoptedAt:0,rng:202,nextCheck:90100,
    checks:0,opportunities:1,flares:1,lastStart:2000,lastEndCore:endCore,active:{start:2000,endCore}};
  return w;
}
function building(w:World,kind:StructureKind,x:number,z:number):Structure {
  const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'steel',power:newPowerState(kind)};
  if(kind==='wood-generator'){s.fuel=newBuildingFuel(kind);s.fuel.ticks=45000;}
  if(kind==='battery')s.battery={stored:100*BATTERY_ENERGY_SCALE,half:true};
  if(kind==='wind-turbine')s.wind={autoCut:false,updateCounter:0,cachedWatts:0};
  if(kind==='cooler')s.cooler=newCoolerState();
  w.structures.push(s);return s;
}
function powered(w:World,...consumers:Structure[]):void {
  reconcilePower(w);
  for(const s of consumers){expect(s.power!.parentId).not.toBeNull();s.power!.on=true;}
}
function tick(w:World):void {w.tick++;advancePower(w);}

test('a balanced network without storage keeps actual light until the first 20-Core shedding boundary',()=>{
  const w=camp(),source=building(w,'wood-generator',10,10),lamp=building(w,'standing-lamp',12,10);
  lamp.power!.switchOn=true;powered(w,lamp);
  const power=structuredClone(lamp.power),rng=w.rng,fuel=structuredClone(source.fuel);
  advancePower(w); // The activation tick still contains only pre-condition boundaries.
  expect(lamp.power).toEqual(power);expect(w.rng).toBe(rng);
  tick(w);expect(lamp.power).toEqual(power);expect(w.rng).toBe(rng);
  expect(lightSources(w).some(s=>s.cell===lamp.z*w.width+lamp.x)).toBe(true);
  tick(w);expect(lamp.power).toEqual({...power,on:false});expect(w.rng).not.toBe(rng);
  expect(lightSources(w).some(s=>s.cell===lamp.z*w.width+lamp.x)).toBe(false);
  expect(source.power!.on).toBe(true);expect(source.fuel).toEqual(fuel);
  const stoppedRng=w.rng;tick(w);tick(w);
  expect(lamp.power!.on).toBe(false);expect(w.rng).toBe(stoppedRng);
});

test.each([{count:50,stopped:2,rng:1150042706},{count:70,stopped:3,rng:22020245}])(
  'round-even five-percent shedding and replacement draws preserve the $count-consumer network',({count,stopped,rng})=>{
    const w=camp();w.rng=17;
    for(const x of [10,12,14])building(w,'wood-generator',x,11);
    const lamps:Structure[]=[];
    for(let z=7;z<17&&lamps.length<count;z++)for(let x=7;x<17&&lamps.length<count;x++){
      if((z===11||z===12)&&x>=10&&x<=15)continue;
      lamps.push(building(w,'standing-lamp',x,z));
    }
    powered(w,...lamps);tick(w);expect(w.rng).toBe(17);tick(w);
    // 50×.05=2.5 rounds to two. 70×.05=3.5 rounds to four;
    // seed17 picks positions 0,18,22,0, so only three distinct lamps stop.
    expect(lamps.filter(s=>!s.power!.on)).toHaveLength(stopped);
    expect(w.rng).toBe(rng);
    expect(w.structures.filter(s=>s.kind==='wood-generator').every(s=>s.power!.on)).toBe(true);
    expect(lamps.every(s=>s.power!.parentId!==null&&s.damage===undefined&&s.breakdown===undefined)).toBe(true);
  });

test('surplus sources never charge storage during the condition; packed batteries leak and wood still burns',()=>{
  const w=camp(),wood=building(w,'wood-generator',10,10),store=building(w,'battery',12,10);
  const solar=building(w,'solar-generator',20,20),wind=building(w,'wind-turbine',2,2);
  const packed=building(w,'battery',25,5);w.structures=w.structures.filter(s=>s!==packed);
  packed.power!.on=false;packed.power!.parentId=null;
  w.packed.push({building:packed,owner:{type:'ground',x:25,z:5}});
  const before=store.battery!.stored,packedBefore=packed.battery!.stored,solarOutput=powerWatts(solar,w),rng=w.rng;
  expect(solarOutput).toBeGreaterThan(0);expect(powerWatts(wind,w)).toBe(0);
  for(let n=0;n<10;n++){tick(w);burnFuel(w);}
  expect(store.battery).toEqual({stored:before-1000,half:true});
  expect(packed.battery).toEqual({stored:packedBefore-1000,half:true});
  expect(wood.fuel).toMatchObject({ticks:44978,burned:22,burnRemainder:0});
  expect([wood,solar,wind].every(s=>s.power!.on)).toBe(true);
  expect(powerWatts(solar,w)).toBeGreaterThan(0);expect(w.rng).toBe(rng);
});

test('a battery-only network does not spend energy even while its consumer awaits actual shedding',()=>{
  const w=camp(),store=building(w,'battery',10,10),lamp=building(w,'standing-lamp',12,10);
  powered(w,lamp);const before=store.battery!.stored;
  tick(w);expect(lamp.power!.on).toBe(true);expect(store.battery!.stored).toBe(before-100);
  tick(w);expect(lamp.power!.on).toBe(false);expect(store.battery).toEqual({stored:before-200,half:true});
  const peer=structuredClone(w);for(let n=0;n<13;n++){tick(w);tick(peer);}
  expect(peer).toEqual(w);expect(store.battery!.stored).toBe(before-1500);
});

test('storage resumes on the first Core strictly after a partial final boundary, without crediting skipped surplus',()=>{
  const w=camp(29005),source=building(w,'wood-generator',10,10),store=building(w,'battery',12,10);
  w.tick=2899;const before=store.battery!.stored;
  tick(w);expect(store.battery!.stored).toBe(before-100);
  tick(w); // 29001..29005 disabled; 29006..29010 charge at the ordinary 50% rate.
  expect(store.battery).toEqual({stored:before-200+5*1000,half:true});
  expect(source.power!.on).toBe(true);
});

test('a final partial tick resumes ordinary startup at 200 Core and preserves an actual off switch',()=>{
  const w=camp(29199),source=building(w,'wood-generator',10,10),store=building(w,'battery',12,10);
  const lamp=building(w,'standing-lamp',13,9),manualOff=building(w,'standing-lamp',13,10);
  reconcilePower(w);manualOff.power!.switchOn=false;
  w.tick=2918;const before=store.battery!.stored,rng=w.rng,parent=lamp.power!.parentId;
  tick(w);expect(lamp.power!.on).toBe(false);expect(w.rng).toBe(rng);
  tick(w); // 29191..29199 disabled; startup and one surplus transfer at29200.
  expect(lamp.power).toEqual({on:true,parentId:parent});
  expect(manualOff.power!.on).toBe(false);expect(manualOff.power!.switchOn).toBe(false);
  expect(store.battery!.stored).toBe(before-200+970);expect(w.rng).not.toBe(rng);
  expect(source.fuel!.ticks).toBe(45000); // advancePower never owns fuel burning.
  const peer=structuredClone(w);for(let n=0;n<21;n++){tick(w);tick(peer);}
  expect(peer).toEqual(w);
});

test('manual source stop and fuel exhaustion remain independent causes; a zero battery creates no restart',()=>{
  const w=camp(29000),source=building(w,'wood-generator',10,10),store=building(w,'battery',12,10);
  const lamp=building(w,'standing-lamp',13,9);powered(w,lamp);
  source.power!.switchOn=false;source.power!.on=false;store.battery={stored:0};
  const fuel=structuredClone(source.fuel);tick(w);burnFuel(w);tick(w);burnFuel(w);
  expect(source.fuel).toEqual(fuel);expect(lamp.power!.on).toBe(false);expect(store.battery).toEqual({stored:0});
  source.power!.switchOn=true;source.fuel!.ticks=0;
  w.tick=2899;tick(w);tick(w);for(let n=0;n<40;n++)tick(w);
  expect(source.power!.on).toBe(false);expect(lamp.power!.on).toBe(false);
  expect(source.power!.switchOn).toBe(true);expect(store.battery).toEqual({stored:0});
});

test('real tailoring, horticultural light, cooling and engaged-door readers follow the actual power transition',()=>{
  // One consumer per independent source forces each real function to be shed
  // at the same20-Core boundary without a fixture choosing the random target.
  const w=camp();
  building(w,'wood-generator',4,4);const tailor=building(w,'electric-tailor-bench',6,4);
  for(const x of [16,18,20])building(w,'wood-generator',x,4);
  const lamp=building(w,'sun-lamp',20,6);
  building(w,'wood-generator',4,20);const cooler=building(w,'cooler',6,20);
  building(w,'wood-generator',20,20);const door=building(w,'autodoor',22,20);
  powered(w,tailor,lamp,cooler,door);
  door.door={...newDoorState(w.tick),open:true,closeAt:2100,duration:doorOpenTicks(door)};
  const environment=new WorkEnvironmentCache();
  expect(environment.read(w).production(tailor,tailor).station).toBe(1);
  tick(w);expect(sunLampActive(w,lamp)).toBe(true);expect(cooler.power!.on).toBe(true);
  // Rebase this physically engaged door just before the supply boundary.
  door.door!.changedAt=2001;door.door!.from=.1;
  const layout=reconcileTemperature(w),{cold,hot}=coolerFaces(cooler);
  layout.indices=new Int32Array(w.tiles.length).fill(-1);
  layout.indices[cold.z*w.width+cold.x]=0;layout.indices[hot.z*w.width+hot.x]=1;
  w.thermal={regions:[{cells:[cold.z*w.width+cold.x],temperature:30},{cells:[hot.z*w.width+hot.x],temperature:20}]};
  cooler.cooler!.target=0;advanceCoolers(w,layout,20);expect(w.thermal.regions[0]!.temperature).toBeLessThan(30);
  const cooled=w.thermal.regions[0]!.temperature;
  // Keep a half-open slow stone door segment while checking that the real
  // supply controls speed without jumping its current fraction.
  door.material='granite-blocks';door.door!.duration=doorOpenTicks(door);
  tick(w);const beforeRebase=doorOpenness(door,w.tick);updateDoors(w);
  expect(doorOpenness(door,w.tick)).toBe(beforeRebase);expect(door.door!.duration).toBe(doorOpenTicks(door));
  expect(door.door!.duration).toBe(10);expect(door.door!.forbidden).toBe(false);expect(door.door!.open).toBe(true);
  expect(productionStationUsable(tailor)).toBe(true);
  expect(environment.read(w).production(tailor,tailor).station).toBe(.5);
  expect(sunLampActive(w,lamp)).toBe(false);
  expect(lightSources(w).some(s=>s.cell===lamp.z*w.width+lamp.x)).toBe(false);
  advanceCoolers(w,layout,20);expect(w.thermal.regions[0]!.temperature).toBe(cooled);expect(cooler.cooler!.high).toBe(false);
});

test('progressive solar shedding removes a rain consumer risk while charged batteries, producer faults and manual stops stay distinct',()=>{
  // Prepared exposure/condition, not an observed natural rain discharge or
  // failure distribution. The real power boundaries decide actual activity.
  const w=camp(),source=building(w,'wood-generator',10,10),store=building(w,'battery',12,10);
  store.battery={stored:101*BATTERY_ENERGY_SCALE};
  const stove=building(w,'electric-stove',13,9),manualOff=building(w,'wood-generator',24,24);
  manualOff.power!.on=false;manualOff.power!.switchOn=false;
  powered(w,stove);const initialEnergy=store.battery.stored,condition=structuredClone(w.worldIncidents);
  expect(rainElectricalEligible(w,stove)).toBe(true);expect(rainElectricalEligible(w,store)).toBe(true);
  tick(w);burnFuel(w);
  expect(stove.power!.on).toBe(true);expect(rainElectricalEligible(w,stove)).toBe(true);
  expect(canBreakdownNow(stove)).toBe(true);expect(canBreakdownNow(source)).toBe(true);
  expect(store.battery.stored).toBe(initialEnergy-100);expect(manualOff.fuel!.ticks).toBe(45000);
  tick(w);burnFuel(w);
  expect(stove.power!.on).toBe(false);expect(rainElectricalEligible(w,stove)).toBe(false);
  expect(canBreakdownNow(stove)).toBe(false);expect(canBreakdownNow(source)).toBe(true);
  expect(store.battery.stored).toBe(initialEnergy-200);expect(rainElectricalEligible(w,store)).toBe(true);
  const fuel=source.fuel!.ticks;
  expect(triggerBreakdown(w,source.id)).toBe(true);tick(w);burnFuel(w);
  expect(source.breakdown).toEqual({brokenAt:2002});expect(source.power!.on).toBe(false);
  expect(source.fuel!.ticks).toBe(fuel);expect(manualOff.fuel!.ticks).toBe(45000);
  expect(manualOff.power!.switchOn).toBe(false);expect(store.battery.stored).toBe(initialEnergy-300);
  expect(rainElectricalEligible(w,store)).toBe(true);expect(w.worldIncidents).toEqual(condition);
});
