import { expect,test } from 'vitest';
import { adoptMiscIncidents,MISC_FIRST_CHECK } from '../src/sim/cassandra-misc.ts';
import { footprintCells } from '../src/sim/definitions.ts';
import { startFire } from '../src/sim/fire.ts';
import { newBuildingFuel } from '../src/sim/fuel.ts';
import { crashlandedProfile } from '../src/sim/game-profile.ts';
import { createWorld } from '../src/sim/index.ts';
import { BATTERY_ENERGY_SCALE,batteryQuanta,batteryWattDays } from '../src/sim/power-battery.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { adoptShortCircuits,eligibleShortCircuit,resolveSelectedShortCircuit,SHORT_CIRCUIT_COOLDOWN } from '../src/sim/short-circuit.ts';
import type { Structure,World } from '../src/sim/types.ts';

/** Isolated network fixture. Persistence/provenance is covered by save tests. */
function camp():World {
  const world=createWorld(266,32,32);world.schemaVersion=201 as World['schemaVersion'];
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.pawns=[];world.resources=[];
  world.piles=[];world.jobs=[];world.structures=[];world.packed=[];world.stockpiles=[];world.growingZones=[];
  world.stock={wood:0,food:0};world.gameProfile=crashlandedProfile();world.tick=MISC_FIRST_CHECK-1;
  adoptMiscIncidents(world);adoptShortCircuits(world);world.tick=MISC_FIRST_CHECK;
  world.miscIncidents!.checks=1;world.miscIncidents!.nextCheck=MISC_FIRST_CHECK+100;world.miscIncidents!.opportunities=1;
  return world;
}
function building(world:World,kind:Structure['kind'],x:number,z:number,wd=0):Structure {
  const s:Structure={id:world.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'steel',power:newPowerState(kind)};
  if(kind==='battery')s.battery={stored:wd*BATTERY_ENERGY_SCALE};
  if(kind==='wood-generator'){s.fuel=newBuildingFuel(kind);s.fuel.ticks=45000;}
  world.structures.push(s);return s;
}
function storedNetwork(world:World,wd:number,x=10,z=10):{conduit:Structure;battery:Structure} {
  const conduit=building(world,'power-conduit',x,z),battery=building(world,'battery',x-1,z,wd);
  return {conduit,battery};
}
/** Seed oracle for expected uniform candidate selection, independently unsigned. */
function firstDraw(seed:number):number {
  let n=seed>>>0;n=(n^((n*8192)>>>0))>>>0;n=(n^Math.floor(n/131072))>>>0;n=(n^((n*32)>>>0))>>>0;
  return n/2**32;
}

test('adoption is prospective and the previous schema and absent storyteller stay neutral',()=>{
  const world=camp(),before=structuredClone(world),rng=world.rng;
  adoptShortCircuits(world);expect(world).toEqual(before);expect(world.rng).toBe(rng);
  delete world.miscIncidents!.shortCircuits;world.schemaVersion=200 as World['schemaVersion'];
  adoptShortCircuits(world);expect(world.miscIncidents!.shortCircuits).toBeUndefined();
  world.schemaVersion=201 as World['schemaVersion'];delete world.gameProfile;
  adoptShortCircuits(world);expect(world.miscIncidents!.shortCircuits).toBeUndefined();
});

test('only an exact placed conduit on a genuinely active source network is eligible',()=>{
  const world=camp(),battery=building(world,'battery',9,10,40);
  expect(eligibleShortCircuit(world)).toBe(false);
  const conduit=building(world,'power-conduit',10,10);expect(eligibleShortCircuit(world)).toBe(true);
  battery.battery!.stored=0;expect(eligibleShortCircuit(world)).toBe(false);
  battery.battery!.half=true;expect(eligibleShortCircuit(world)).toBe(true);
  delete battery.battery!.half;world.structures=world.structures.filter(s=>s!==battery);
  const generator=building(world,'wood-generator',8,10);expect(eligibleShortCircuit(world)).toBe(true);
  generator.fuel!.ticks=0;expect(eligibleShortCircuit(world)).toBe(false);
  generator.fuel!.ticks=45000;generator.power!.on=false;expect(eligibleShortCircuit(world)).toBe(false);
  generator.power!.on=true;generator.power!.switchOn=false;expect(eligibleShortCircuit(world)).toBe(false);
  generator.power!.switchOn=true;generator.breakdown={brokenAt:world.tick};expect(eligibleShortCircuit(world)).toBe(false);
  delete generator.breakdown;world.structures=world.structures.filter(s=>s!==conduit);
  expect(eligibleShortCircuit(world)).toBe(false);
});

test('a solar building with actual zero output cannot authorize a short circuit',()=>{
  const world=camp(),solar=building(world,'solar-generator',8,10);
  building(world,'power-conduit',7,10);world.tick=0;
  world.roofing={constructed:footprintCells(solar).map(c=>c.z*world.width+c.x),build:[],remove:[],cursor:0};
  expect(eligibleShortCircuit(world)).toBe(false);
});

test('a roof and a masonry wall over a live conduit do not suppress its ticket',()=>{
  const world=camp(),{conduit}=storedNetwork(world,80);
  world.roofing={constructed:[conduit.z*world.width+conduit.x],build:[],remove:[],cursor:0};
  const wall:Structure={id:world.nextId++,kind:'wall',x:conduit.x,z:conduit.z,orientation:0,footprint:'standard',material:'granite-blocks'};
  world.structures.push(wall);expect(eligibleShortCircuit(world)).toBe(true);
  expect(resolveSelectedShortCircuit(world,1)).toBe(true);
  expect(world.miscIncidents!.shortCircuits!.last?.conduitId).toBe(conduit.id);
});

test('selection is uniform across eligible conduits rather than first choosing a network',()=>{
  const world=camp();storedNetwork(world,40,7,7);
  const other=storedNetwork(world,50,20,20);
  const third=building(world,'power-conduit',21,20),fourth=building(world,'power-conduit',22,20);
  const choices=[world.structures[0]!,other.conduit,third,fourth],seed=12345;
  const expected=choices[Math.floor(firstDraw(seed)*choices.length)]!.id,rng=world.rng;
  expect(resolveSelectedShortCircuit(world,seed)).toBe(true);
  expect(world.miscIncidents!.shortCircuits!.last?.conduitId).toBe(expected);expect(world.rng).toBe(rng);
});

test('a physically opened switch protects the other reserve and no blackout policy is fabricated',()=>{
  const world=camp(),{battery}=storedNetwork(world,40,10,10);
  const switcher=building(world,'power-switch',11,10),isolated=building(world,'battery',12,10,600);
  switcher.power!.switchOn=false;
  const lamp=building(world,'standing-lamp',10,9);lamp.power!.parentId=world.structures[0]!.id;lamp.power!.on=true;
  const policy=structuredClone(lamp.power),rng=world.rng;
  expect(resolveSelectedShortCircuit(world,1)).toBe(true);
  expect(batteryQuanta(battery.battery!)).toBe(0);expect(batteryWattDays(isolated.battery!)).toBe(600);
  expect(lamp.power).toEqual(policy);expect(switcher.power!.switchOn).toBe(false);expect(world.rng).toBe(rng);
  expect(world.miscIncidents!.shortCircuits!.last?.energyWd).toBe(40);
});

test('many batteries at exactly twenty watt-days still take the small-fire branch without draining',()=>{
  const world=camp(),{conduit,battery}=storedNetwork(world,20);
  const other=building(world,'battery',11,10,20),before=world.rng;
  expect(resolveSelectedShortCircuit(world,1)).toBe(true);
  const report=world.miscIncidents!.shortCircuits!.last!;
  expect(report).toMatchObject({outcome:'fire',energyWd:0,flameRadius:0,ignited:true,conduitId:conduit.id});
  expect(report.bombRadius).toBeUndefined();expect(world.bombWaves).toBeUndefined();
  expect(batteryWattDays(battery.battery!)).toBe(20);expect(batteryWattDays(other.battery!)).toBe(20);expect(world.rng).toBe(before);
  const fire=world.fires!.items.at(-1)!;
  expect((fire.x-conduit.x)**2+(fire.z-conduit.z)**2).toBeLessThanOrEqual(9);
  expect(fire.size).toBeGreaterThanOrEqual(.1);expect(fire.size).toBeLessThanOrEqual(1.75);
});

test('one half-quantum above twenty drains every battery on that network exactly once',()=>{
  const world=camp(),{battery}=storedNetwork(world,20);battery.battery!.half=true;
  const other=building(world,'battery',11,10,10);other.battery!.half=true;
  const quanta=batteryQuanta(battery.battery!)+batteryQuanta(other.battery!),rng=world.rng;
  expect(resolveSelectedShortCircuit(world,77)).toBe(true);
  expect(battery.battery).toEqual({stored:0});expect(other.battery).toEqual({stored:0});
  expect(world.miscIncidents!.shortCircuits!.last).toMatchObject({outcome:'discharge',energyWd:quanta/BATTERY_ENERGY_SCALE,flameRadius:1.5});
  expect(world.miscIncidents!.shortCircuits!.last?.ignited).toBeUndefined();
  expect(world.fires!.ledger.batteryEnergyLost).toBe(quanta);expect(world.rng).toBe(rng);
  const after=structuredClone(world);expect(resolveSelectedShortCircuit(world,77)).toBe(false);expect(world).toEqual(after);
});

test('a running generator needs no battery to start a real nearby fire',()=>{
  const world=camp();building(world,'wood-generator',8,10);const conduit=building(world,'power-conduit',10,10);
  expect(resolveSelectedShortCircuit(world,12345)).toBe(true);
  expect(world.miscIncidents!.shortCircuits!.last).toMatchObject({conduitId:conduit.id,outcome:'fire',ignited:true,energyWd:0});
  expect(world.fires!.items).toHaveLength(1);expect(world.bombWaves).toBeUndefined();
});

test('small-fire search respects LOS and can consume its ticket without creating a second fire',()=>{
  const world=camp(),{conduit}=storedNetwork(world,20);
  // Existing fires remove the network footprint from the ignition candidates.
  for(const s of world.structures)for(const cell of footprintCells(s))expect(startFire(world,cell,.1)).toBe(true);
  const wall:Structure={id:world.nextId++,kind:'wall',x:11,z:10,orientation:0,footprint:'standard',material:'granite-blocks'};
  world.structures.push(wall);world.resources=[{id:world.nextId++,kind:'tree',x:12,z:10,amount:12}];
  const fires=structuredClone(world.fires!.items);
  expect(resolveSelectedShortCircuit(world,1)).toBe(true);
  expect(world.miscIncidents!.shortCircuits!.last).toMatchObject({outcome:'fire',ignited:false,center:{x:conduit.x,z:conduit.z}});
  expect(world.fires!.items).toEqual(fires);expect(world.miscIncidents!.shortCircuits!.count).toBe(1);
});

test('the optional Bomb threshold is strictly above 4900 watt-days and the Flame radius is capped',()=>{
  for(const half of [false,true]) {
    const world=camp();building(world,'power-conduit',7,10);
    for(let i=0;i<9;i++)building(world,'battery',8+i,10,i===8?100:600);
    if(half)world.structures.at(-1)!.battery!.half=true;
    expect(resolveSelectedShortCircuit(world,1)).toBe(true);
    const report=world.miscIncidents!.shortCircuits!.last!;
    expect(report.energyWd).toBe(4900+(half?.5/BATTERY_ENERGY_SCALE:0));
    if(half){expect(report.flameRadius).toBeGreaterThan(3.5);expect(report.bombRadius).toBe(report.flameRadius*.3);}
    else {expect(report.flameRadius).toBe(3.5);expect(report.bombRadius).toBeUndefined();}
  }
  const world=camp();building(world,'power-conduit',7,8);
  for(let i=0;i<150;i++)building(world,'battery',8+i%15,8+Math.floor(i/15)*2,600);
  expect(resolveSelectedShortCircuit(world,1)).toBe(true);
  expect(world.miscIncidents!.shortCircuits!.last).toMatchObject({energyWd:90000,flameRadius:14.9,bombRadius:14.9*.3});
});

test('allocation refusal leaves reserve, counters, RNG and all wave state untouched',()=>{
  const world=camp();storedNetwork(world,80);world.nextId=Number.MAX_SAFE_INTEGER;
  const before=structuredClone(world);expect(resolveSelectedShortCircuit(world,1)).toBe(false);expect(world).toEqual(before);
  world.nextId=before.structures.at(-1)!.id+1;
  for(const seed of [-1,1.5,0x100000000,NaN]) {
    const valid=structuredClone(world);expect(resolveSelectedShortCircuit(world,seed)).toBe(false);expect(world).toEqual(valid);
  }
});

test('the eight-day cooldown has an inclusive boundary and independent copies choose the same outcome',()=>{
  const world=camp(),{battery}=storedNetwork(world,40),copy=structuredClone(world),opportunities=world.miscIncidents!.opportunities;
  expect(resolveSelectedShortCircuit(world,19)).toBe(true);expect(resolveSelectedShortCircuit(copy,19)).toBe(true);expect(copy).toEqual(world);
  expect(world.miscIncidents!.opportunities).toBe(opportunities);
  battery.battery!.stored=40*BATTERY_ENERGY_SCALE;world.tick+=SHORT_CIRCUIT_COOLDOWN-1;
  expect(eligibleShortCircuit(world)).toBe(false);world.tick++;expect(eligibleShortCircuit(world)).toBe(true);
  expect(resolveSelectedShortCircuit(world,19)).toBe(true);expect(world.miscIncidents!.shortCircuits!.count).toBe(2);
});
