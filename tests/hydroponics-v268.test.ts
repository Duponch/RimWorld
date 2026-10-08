import { expect,test } from 'vitest';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { footprintCells } from '../src/sim/definitions.ts';
import { finishSowing,growingJobValid,scheduleGrowing,sowingJobAllowed } from '../src/sim/farming.ts';
import { groundCapacity,groundPile,nearbyGround } from '../src/sim/ground-placement.ts';
import { advanceHydroponics,HYDROPONIC_FERTILITY,HYDROPONIC_ROT_INTERVAL,hydroponicBasinAt,hydroponicCropAllowed,hydroponicSowingAllowed,initializeHydroponicBasin,readHydroponicCells,removeHydroponicPlants } from '../src/sim/hydroponics.ts';
import { LightEnvironmentCache } from '../src/sim/light-environment.ts';
import { refreshStock } from '../src/sim/materials.ts';
import { createPlantLife } from '../src/sim/plant-life.ts';
import { reconcilePlantLighting } from '../src/sim/plant-lighting.ts';
import { plantFertility,plantGrowth,PLANT_DEFINITIONS } from '../src/sim/plants.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { HYDROPONICS_RESEARCH_COST } from '../src/sim/research.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { damageStructure,resourceMaxHp } from '../src/sim/thing-damage.ts';
import type { GrowingZone,Job,Orientation,Resource,Structure,World } from '../src/sim/types.ts';
import { healrootCamp } from './helpers/healroot-domestic-v195.ts';
import { fixturePower } from './scenarios/power.ts';

function fixture(on=true,orientation:Orientation=0) {
  const w=healrootCamp(32),p=w.pawns[0]!;w.tick=2000;
  w.research??={points:0,project:null};w.research.project=null;
  w.research.hydroponics={points:HYDROPONICS_RESEARCH_COST,completedAt:w.tick};
  const source=fixturePower(w,'wood-generator',12,4);
  const basin:Structure={id:w.nextId++,kind:'hydroponics-basin',x:6,z:4,orientation,footprint:'standard',material:'steel',power:{...newPowerState('hydroponics-basin'),on,parentId:source.id}};
  w.structures.push(basin);initializeHydroponicBasin(w,basin);
  const zone=w.growingZones.find(z=>z.basinId===basin.id)!;
  return {w,p,source,basin,zone};
}
function crop(w:World,cell:{x:number;z:number},kind:GrowingZone['plant']='rice',growth=.2):Resource {
  const plant:Resource={id:w.nextId++,kind,x:cell.x,z:cell.z,amount:PLANT_DEFINITIONS[kind].yield,growth,growthTick:w.tick};
  if(w.climate)plant.plantLife=createPlantLife(w,plant,true);
  w.resources=[...w.resources,plant];return plant;
}
function job(w:World,zone:GrowingZone,kind:Job['kind']='sow',cell=zone.cells[0]!):Job {
  const j:Job={id:w.nextId++,kind,growingZoneId:zone.id,x:cell%w.width,z:Math.floor(cell/w.width),orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}};
  w.jobs.push(j);return j;
}
function phase(w:World,basin:Structure):void {w.tick+=(basin.id-w.tick%HYDROPONIC_ROT_INTERVAL+HYDROPONIC_ROT_INTERVAL)%HYDROPONIC_ROT_INTERVAL;}
function until(w:World,done:()=>boolean,limit=240):void {
  for(let n=0;n<limit&&!done();n++)stepWorld(w);
  expect(done(),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns.map(p=>({id:p.id,job:p.jobId,path:p.path}))})).toBe(true);
}

test('each rotated basin owns four ordered cells and a distinct, idempotent growing policy',()=>{
  for(const orientation of [0,1,2,3] as const) {
    const {w,basin,zone}=fixture(true,orientation),next=w.nextId;
    expect(zone.id).not.toBe(basin.id);expect(zone.cells).toEqual(footprintCells(basin).map(c=>c.z*w.width+c.x).sort((a,b)=>a-b));
    expect(new Set(zone.cells).size).toBe(4);expect(zone).toMatchObject({plant:'rice',allowSow:true,allowCut:true});
    initializeHydroponicBasin(w,basin);expect(w.growingZones).toHaveLength(1);expect(w.nextId).toBe(next);
  }
});

test('initialization requires a live basin and does not overlap or consume a drawn policy',()=>{
  const {w,basin,zone}=fixture(),next=w.nextId;
  w.growingZones=[{...zone,basinId:undefined,id:zone.id+10}];
  initializeHydroponicBasin(w,basin);expect(w.growingZones).toHaveLength(1);expect(w.nextId).toBe(next);
  w.growingZones=[];w.structures=w.structures.filter(s=>s!==basin);
  initializeHydroponicBasin(w,basin);expect(w.growingZones).toEqual([]);expect(w.nextId).toBe(next);
});

test('derived support follows mutable zone/building changes and does not retain a negative or returned-map cache',()=>{
  const {w,basin,zone}=fixture(),cell={x:basin.x,z:basin.z},index=cell.z*w.width+cell.x;
  expect(hydroponicBasinAt(w,cell)).toBe(basin);
  const captured=readHydroponicCells(w) as Map<number,number>;captured.clear();
  expect(readHydroponicCells(w).get(index)).toBe(basin.id);
  zone.cells.splice(zone.cells.indexOf(index),1);expect(hydroponicBasinAt(w,cell)).toBeUndefined();
  zone.cells.push(index);zone.cells.sort((a,b)=>a-b);expect(hydroponicBasinAt(w,cell)).toBe(basin);
  basin.z++;expect(hydroponicBasinAt(w,cell)).toBeUndefined();basin.z--;
  w.structures.splice(w.structures.indexOf(basin),1);expect(hydroponicBasinAt(w,cell)).toBeUndefined();
  w.structures.push(basin);expect(hydroponicBasinAt(w,cell)).toBe(basin);
});

test('the linked basin admits sowing on sterile paved cells while drawn fields retain their ground rules',()=>{
  const {w,zone}=fixture();
  for(const i of zone.cells)w.tiles[i]={terrain:'rough-stone',floor:'steel-tile'};
  const outside=10*w.width+5;
  w.tiles[outside]={terrain:'rough-stone',floor:'steel-tile'};
  w.growingZones=[...w.growingZones,{id:w.nextId++,cells:[outside],plant:'rice',allowSow:true,allowCut:true}];
  scheduleGrowing(w);
  expect(w.jobs.filter(j=>j.growingZoneId===zone.id&&j.kind==='sow')).toHaveLength(4);
  expect(w.jobs.some(j=>j.x===5&&j.z===10)).toBe(false);
  for(const j of w.jobs)expect(growingJobValid(w,j)).toBe(true);
});

test('only the basin itself is exempt: another placed or planned building still blocks farming',()=>{
  const {w,zone}=fixture(),cell=zone.cells[1]!,x=cell%w.width,z=Math.floor(cell/w.width);
  const obstacle:Structure={id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard'};
  w.structures.push(obstacle);scheduleGrowing(w);
  expect(w.jobs.filter(j=>j.growingZoneId===zone.id)).toHaveLength(3);
  w.structures=w.structures.filter(s=>s!==obstacle);w.jobs=[];
  w.jobs.push({id:w.nextId++,kind:'wall',x,z,orientation:0,footprint:'standard',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}});
  scheduleGrowing(w);expect(w.jobs.filter(j=>j.growingZoneId===zone.id)).toHaveLength(3);
});

test('power loss rejects pending and accepted sowing, including its final commit, without creating a free plant',()=>{
  const {w,p,basin,zone}=fixture();scheduleGrowing(w);
  const accepted=w.jobs.find(j=>j.growingZoneId===zone.id)!;accepted.reservedBy=p.id;accepted.status='active';p.jobId=accepted.id;
  expect(growingJobValid(w,accepted)).toBe(true);basin.power!.on=false;
  expect(hydroponicSowingAllowed(w,zone)).toBe(false);expect(sowingJobAllowed(w,p,accepted)).toBe(false);expect(growingJobValid(w,accepted)).toBe(false);
  const next=w.nextId;finishSowing(w,accepted);expect(w.resources).toEqual([]);expect(w.nextId).toBe(next);
  scheduleGrowing(w);expect(w.jobs).toEqual([accepted]);
  basin.power!.on=true;expect(growingJobValid(w,accepted)).toBe(true);
  finishSowing(w,accepted);expect(w.resources).toHaveLength(1);expect(w.resources[0]).toMatchObject({kind:'rice',growth:.0001,growthTick:w.tick});
});

test('medical sowing keeps Plants8 and the basin policy excludes maize',()=>{
  const {w,p,zone}=fixture();zone.plant='healroot';scheduleGrowing(w);
  const sow=w.jobs.find(j=>j.growingZoneId===zone.id)!;p.skills.plants!.level=7;
  expect(sowingJobAllowed(w,p,sow)).toBe(false);p.skills.plants!.level=8;expect(sowingJobAllowed(w,p,sow)).toBe(true);
  sow.reservedBy=p.id;p.skills.plants!.level=7;expect(growingJobValid(w,sow)).toBe(true);
  for(const kind of ['rice','potato','cotton','healroot'])expect(hydroponicCropAllowed(kind)).toBe(true);
  expect(hydroponicCropAllowed('corn')).toBe(false);
  expect(applyCommand(w,{type:'growing-policy',zoneId:zone.id,plant:'corn',allowSow:true,allowCut:true}).ok).toBe(false);
  zone.plant='corn';w.jobs=[];scheduleGrowing(w);expect(w.jobs).toEqual([]);
});

test('fertility 2.8 retains each crop sensitivity and keeps its exact old growth interval during a power cut',()=>{
  const {w,basin}=fixture(),rice=crop(w,basin),potato=crop(w,{x:6,z:5},'potato'),ordinary=crop(w,{x:4,z:10});
  w.tick+=100;
  const normal=plantGrowth(w,ordinary)-.2;
  expect(normal).toBeGreaterThan(0);expect(plantFertility(w,rice)).toBe(HYDROPONIC_FERTILITY);
  expect(plantGrowth(w,rice)-.2).toBeCloseTo(normal*2.8,12);
  expect(plantGrowth(w,potato)-.2).toBeCloseTo(normal*(1-.4+2.8*.4)*3/5.8,12);
  const before=plantGrowth(w,rice);basin.power!.on=false;
  expect(plantFertility(w,rice)).toBe(2.8);expect(plantGrowth(w,rice)).toBe(before);
  w.tick+=25;expect(plantGrowth(w,rice)).toBeGreaterThan(before);
});

test('a basin needs the existing roof lighting and temperature rules even with maximum substrate fertility',()=>{
  const {w,source,basin}=fixture(),rice=crop(w,basin),light=new LightEnvironmentCache();
  const lamp:Structure={id:w.nextId++,kind:'sun-lamp',x:7,z:6,orientation:0,footprint:'standard',material:'steel',power:{on:false,parentId:source.id}};
  w.structures.push(lamp);w.roofing={constructed:footprintCells(basin).map(c=>c.z*w.width+c.x).sort((a,b)=>a-b),build:[],remove:[],cursor:0};
  reconcilePlantLighting(w,()=>light.read(w));expect(rice.growthLight).toBe('dark');w.tick+=50;expect(plantGrowth(w,rice)).toBe(.2);
  lamp.power!.on=true;reconcilePlantLighting(w,()=>light.read(w));expect(rice.growthLight).toBe('artificial-full');
  w.tick+=50;expect(plantGrowth(w,rice)).toBeGreaterThan(.2);
  rice.growth=plantGrowth(w,rice);rice.growthTick=w.tick;rice.growthThermalFactor=0;
  const cold=rice.growth;w.tick+=50;expect(plantGrowth(w,rice)).toBe(cold);
});

test('unpowered rare checks damage only the basin plants at their stable phase and consume no RNG',()=>{
  const {w,basin}=fixture(false),inside=crop(w,basin),other=crop(w,{x:6,z:5},'cotton'),outside=crop(w,{x:5,z:4}),rng=w.rng;
  const stone:Resource={id:w.nextId++,kind:'rock',x:6,z:6,amount:10};w.resources=[...w.resources,stone];
  phase(w,basin);advanceHydroponics(w);expect(inside.damage).toBe(1);expect(other.damage).toBe(1);
  expect(outside.damage).toBeUndefined();expect(stone.damage).toBeUndefined();
  for(let n=0;n<24;n++){w.tick++;advanceHydroponics(w);}expect(inside.damage).toBe(1);
  w.tick++;advanceHydroponics(w);expect(inside.damage).toBe(2);
  basin.power!.on=true;w.tick+=25;advanceHydroponics(w);expect(inside.damage).toBe(2);expect(w.rng).toBe(rng);
});

test('the last rotting hit cancels an owned harvest without yield, and restored power allows a fresh sowing',()=>{
  const {w,p,basin,zone}=fixture(false),rice=crop(w,basin,'rice',1),harvest=job(w,zone,'harvest');
  rice.damage=resourceMaxHp(rice)-1;harvest.reservedBy=p.id;harvest.status='active';p.jobId=harvest.id;
  expect(growingJobValid(w,harvest)).toBe(true);
  phase(w,basin);advanceHydroponics(w);
  expect(w.resources).not.toContain(rice);expect(w.jobs).not.toContain(harvest);expect(p.jobId).toBeNull();expect(w.piles).toEqual([]);
  basin.power!.on=true;w.tick+=10-w.tick%10;scheduleGrowing(w);
  expect(w.jobs.some(j=>j.kind==='sow'&&j.x===basin.x&&j.z===basin.z)).toBe(true);
});

test('committed removal destroys every contained crop and its queued work while preserving other fields',()=>{
  const {w,p,basin,zone}=fixture(),contained=footprintCells(basin).map(c=>crop(w,c)),outside=crop(w,{x:5,z:10},'potato',1);
  const ordinary:GrowingZone={id:w.nextId++,cells:[outside.z*w.width+outside.x],plant:'potato',allowSow:true,allowCut:true};
  w.growingZones=[...w.growingZones,ordinary];const obsolete=job(w,zone,'harvest'),retained=job(w,ordinary,'harvest');
  p.orders.queue=[obsolete.id,retained.id];const rng=w.rng;
  w.structures=w.structures.filter(s=>s!==basin);removeHydroponicPlants(w,basin);
  expect(w.resources).toEqual([outside]);for(const plant of contained)expect(w.resources).not.toContain(plant);
  expect(w.growingZones).toEqual([ordinary]);expect(w.jobs).toEqual([retained]);expect(p.orders.queue).toEqual([retained.id]);
  expect(w.piles).toEqual([]);expect(w.rng).toBe(rng);removeHydroponicPlants(w,basin);expect(w.resources).toEqual([outside]);
});

test('basin loss interrupts a blocked clearance carrier without losing its physically held item',()=>{
  const {w,p,basin,zone}=fixture();
  // The carrier is beyond the nearby-drop radius of the removed basin, so its
  // newly freed cells do not turn the prepared full floor into spare capacity.
  p.x=19;p.z=4;
  const carried={id:w.nextId++,kind:'wood' as const,item:'wood' as const,quantity:1,owner:{type:'pawn' as const,pawnId:p.id}};w.piles.push(carried);
  p.haul={sourcePileId:carried.id,carryPileId:carried.id,quantity:1,phase:'deliver',destination:{type:'aside',growingZoneId:zone.id,sowCell:{x:basin.x,z:basin.z},x:18,z:4}};
  for(const c of nearbyGround(w,p))if(!groundPile(w,c)&&groundCapacity(w,c,'wood',p.id)>0)w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:1,owner:{type:'ground',...c}});
  const total=w.piles.reduce((n,p)=>n+p.quantity,0);
  w.structures=w.structures.filter(s=>s!==basin);removeHydroponicPlants(w,basin);
  expect(p.haul).toBeNull();expect(p.interruptedCargo).toBe(true);expect(carried.owner).toEqual({type:'pawn',pawnId:p.id});
  expect(w.piles.reduce((n,p)=>n+p.quantity,0)).toBe(total);expect(w.growingZones).toEqual([]);
});

test('a fatal building hit uses the committed removal path without producing a crop harvest',()=>{
  const {w,basin}=fixture(),rice=crop(w,basin,'rice',1);
  expect(damageStructure(w,basin,180,'bomb')).toBe(true);
  expect(w.structures).not.toContain(basin);expect(w.resources).not.toContain(rice);expect(w.growingZones.some(z=>z.basinId===basin.id)).toBe(false);
  expect(w.piles.some(p=>p.item==='rice')).toBe(false);expect(validateWorld(w)).toEqual([]);
});

test('real contact sowing, harvesting and a saved continuation reuse the ordinary growing pipeline',()=>{
  const {w,p,basin,zone}=fixture();p.priorities.gather=0;
  for(const i of zone.cells)w.tiles[i]={terrain:'rough-stone',floor:'steel-tile'};
  scheduleGrowing(w);const sow=w.jobs.find(j=>j.growingZoneId===zone.id)!;
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:sow.id,queue:false}).ok).toBe(true);
  until(w,()=>sow.progress>0);expect(w.resources).toEqual([]);
  const resumed=deserializeWorld(serializeWorld(w));
  until(w,()=>w.resources.length>0);stepWorld(resumed,w.tick-resumed.tick);expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  const born=w.resources[0]!;expect(born.growth).toBe(.0001);expect(born.growthTick).toBe(w.tick);expect(plantFertility(w,born)).toBe(2.8);
  w.growingZones=w.growingZones.map(z=>z.id===zone.id?{...z,allowSow:false}:z);born.growth=1;born.growthTick=w.tick;
  until(w,()=>w.piles.some(p=>p.item==='rice'));
  expect(w.resources.some(r=>r.id===born.id)).toBe(false);expect(w.structures).toContain(basin);expect(w.growingZones.find(z=>z.id===zone.id)?.basinId).toBe(basin.id);
  expect(validateWorld(w)).toEqual([]);
});

test('saving during a switched-off interval preserves partial damage and the next rare phase exactly',()=>{
  const {w,basin}=fixture(false);w.pawns=[];basin.power!.switchOn=false;
  const rice=crop(w,basin);phase(w,basin);advanceHydroponics(w);expect(rice.damage).toBe(1);refreshStock(w);
  expect(validateWorld(w)).toEqual([]);const resumed=deserializeWorld(serializeWorld(w));
  stepWorld(w,66);stepWorld(resumed,66);
  expect(serializeWorld(resumed)).toBe(serializeWorld(w));expect(w.resources[0]!.damage).toBe(3);
  expect(plantGrowth(w,w.resources[0]!)).toBeGreaterThan(.2);expect(validateWorld(w)).toEqual([]);
});
