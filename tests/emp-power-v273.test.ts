import { expect,test } from 'vitest';
import { applyEmpEffect,advanceEmp } from '../src/sim/emp-effects.ts';
import { empStructureActive } from '../src/sim/emp-state.ts';
import { advancePower,reconcilePower } from '../src/sim/power.ts';
import { newPowerState,powerWatts } from '../src/sim/power-rules.ts';
import { BATTERY_ENERGY_SCALE,batteryQuanta } from '../src/sim/power-battery.ts';
import { newBuildingFuel,burnFuel } from '../src/sim/fuel.ts';
import { advanceTurretOwner,turretOperational } from '../src/sim/mini-turret.ts';
import { serializeWorld,deserializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { BATTERIES_RESEARCH_COST } from '../src/sim/research.ts';
import { miningCamp } from './scenarios/mining.ts';
import { miniTurretCamp,campTurret,miniTurretQueries } from './scenarios/mini-turret-v212.ts';
import type { Structure,StructureKind,World } from '../src/sim/types.ts';

function camp():World {
  const w=miningCamp(0);w.structures=[];w.packed=[];
  w.research={project:null,points:0,batteries:{points:BATTERIES_RESEARCH_COST,completedAt:0}};return w;
}
function building(w:World,kind:StructureKind,x:number,z:number):Structure {
  const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'steel',power:newPowerState(kind)};
  if(kind==='wood-generator'){s.fuel=newBuildingFuel(kind);s.fuel.ticks=45000;}
  if(kind==='battery')s.battery={stored:100*BATTERY_ENERGY_SCALE,half:true};
  if(kind==='wind-turbine')s.wind={autoCut:false,updateCounter:0,cachedWatts:1000};
  w.structures.push(s);return s;
}
function ticks(w:World,n:number):void {for(let i=0;i<n;i++){w.tick++;advancePower(w);advanceEmp(w);}}

test.each(['wood-generator','solar-generator','wind-turbine'] as const)('%s output is zero only during EMP while switch, connection and fuel are retained',kind=>{
  const w=camp(),s=building(w,kind,10,10),power=structuredClone(s.power),core=w.tick*10;
  expect(powerWatts(s,w)).toBeGreaterThan(0);expect(applyEmpEffect(w,s,50,core)).toBe(true);
  expect(powerWatts(s,w)).toBe(0);expect(s.power).toEqual(power);expect(s.damage).toBeUndefined();
  expect(powerWatts(s,w,core+1499)).toBe(0);expect(powerWatts(s,w,core+1500)).toBeGreaterThan(0);
  if(kind==='wood-generator'){const fuel=s.fuel!.ticks;burnFuel(w);expect(s.fuel!.ticks).toBeLessThan(fuel);expect(powerWatts(s,w)).toBe(0);}
});

test('generator EMP produces ordinary network shedding and gradual restart, with exact saved continuation',()=>{
  const w=camp(),source=building(w,'wood-generator',10,10),lamp=building(w,'standing-lamp',12,10);
  reconcilePower(w);lamp.power!.on=true;const parent=lamp.power!.parentId;
  expect(applyEmpEffect(w,source,50,w.tick*10)).toBe(true);ticks(w,1);expect(lamp.power!.on).toBe(true);
  ticks(w,1);expect(lamp.power!.on).toBe(false);expect(lamp.power!.parentId).toBe(parent);
  expect(source.power!.on).toBe(true);const peer=deserializeWorld(serializeWorld(w));
  ticks(w,168);ticks(peer,168);expect(peer).toEqual(w);expect(lamp.power!.on).toBe(true);expect(source.emp).toBeUndefined();
  expect(validateWorld(w)).toEqual([]);
});

test('EMP battery retains energy and half quantum, refuses charging, and continues the same self discharge',()=>{
  const w=camp();building(w,'wood-generator',10,10);const store=building(w,'battery',12,10),before=batteryQuanta(store.battery!);
  const rng=w.rng;expect(applyEmpEffect(w,store,50,w.tick*10)).toBe(true);expect(batteryQuanta(store.battery!)).toBe(before);
  ticks(w,10);expect(batteryQuanta(store.battery!)).toBe(before-1000);expect(store.battery!.half).toBe(true);expect(w.rng).toBe(rng);
  const peer=deserializeWorld(serializeWorld(w));ticks(w,141);ticks(peer,141);expect(peer).toEqual(w);
  expect(store.emp).toBeUndefined();expect(batteryQuanta(store.battery!)).toBeGreaterThan(before-15100);
});

test('a stunned battery cannot supply apparent reserve or restart its battery-only network',()=>{
  const w=camp(),store=building(w,'battery',10,10),lamp=building(w,'standing-lamp',12,10);
  reconcilePower(w);lamp.power!.on=true;const before=batteryQuanta(store.battery!);
  expect(applyEmpEffect(w,store,50,w.tick*10)).toBe(true);ticks(w,20);
  expect(lamp.power!.on).toBe(false);expect(batteryQuanta(store.battery!)).toBe(before-2000);
  const peer=deserializeWorld(serializeWorld(w));ticks(w,150);ticks(peer,150);expect(peer).toEqual(w);
  expect(lamp.power!.on).toBe(true);expect(batteryQuanta(store.battery!)).toBeLessThan(before-17000);
});

test('Core still distributes actual discharge among stunned and ordinary batteries once another reserve can supply the net',()=>{
  const w=camp(),a=building(w,'battery',10,10),b=building(w,'battery',11,10),lamp=building(w,'standing-lamp',12,10);
  reconcilePower(w);lamp.power!.on=true;const beforeA=batteryQuanta(a.battery!),beforeB=batteryQuanta(b.battery!);
  expect(applyEmpEffect(w,a,50,w.tick*10)).toBe(true);ticks(w,1);
  expect(beforeA-batteryQuanta(a.battery!)).toBe(400);expect(beforeB-batteryQuanta(b.battery!)).toBe(400);
});

test('packed battery keeps its exact energy and EMP clock through save/reload and expiry',()=>{
  const w=camp(),store=building(w,'battery',10,10),before=batteryQuanta(store.battery!);
  expect(applyEmpEffect(w,store,50,w.tick*10)).toBe(true);
  w.structures=[];store.power={on:false,parentId:null};w.packed.push({building:store,owner:{type:'ground',x:10,z:10}});
  const peer=deserializeWorld(serializeWorld(w));ticks(w,150);ticks(peer,150);expect(peer).toEqual(w);
  expect(w.packed[0]!.building.emp).toBeUndefined();expect(batteryQuanta(store.battery!)).toBe(before-15000);
  expect(validateWorld(w)).toEqual([]);
});

test('unadaptable devices extend the maximum end; unrelated consumers and conduits remain unaffected',()=>{
  const w=camp(),store=building(w,'battery',10,10),lamp=building(w,'standing-lamp',12,10),wire=building(w,'power-conduit',11,11),core=w.tick*10;
  expect(applyEmpEffect(w,store,75,core)).toBe(true);w.tick+=10;
  expect(applyEmpEffect(w,store,45,w.tick*10)).toBe(true);expect(store.emp).toEqual({sinceCore:core,untilCore:core+2250});
  expect(applyEmpEffect(w,store,75,w.tick*10)).toBe(true);expect(store.emp).toEqual({sinceCore:core,untilCore:core+2350});
  const before=structuredClone(w);expect(applyEmpEffect(w,lamp,50,w.tick*10)).toBe(false);expect(applyEmpEffect(w,wire,50,w.tick*10)).toBe(false);expect(w).toEqual(before);
});

test('an actual turret burst is suspended without ammo loss, then resumes at the exact EMP end',()=>{
  const w=miniTurretCamp(),turret=campTurret(w),gun=turret.turret!;
  let core=w.tick*10;
  for(let i=0;i<100&&!gun.burst;i++){
    core++;w.tick=Math.ceil(core/10);advanceTurretOwner(w,turret,core,miniTurretQueries(w));
  }
  expect(gun.burst).toBeTruthy();const burst=structuredClone(gun.burst),ammo=gun.ammoQ,projectiles=w.projectiles!.length;
  expect(applyEmpEffect(w,turret,50,core)).toBe(true);expect(turretOperational(w,turret,core)).toBe(false);
  for(let i=1;i<=20;i++)advanceTurretOwner(w,turret,core+i,miniTurretQueries(w));
  expect(gun.burst).toEqual(burst);expect(gun.ammoQ).toBe(ammo);expect(w.projectiles).toHaveLength(projectiles);
  expect(empStructureActive(turret,core+1499)).toBe(true);expect(turretOperational(w,turret,core+1500)).toBe(true);
  // Owner Core clock, not the publication clock, decides this boundary.
  advanceTurretOwner(w,turret,core+1500,miniTurretQueries(w));
  expect(gun.burst?.delayCore).toBe(burst!.delayCore-1);expect(gun.ammoQ).toBe(ammo);
});
