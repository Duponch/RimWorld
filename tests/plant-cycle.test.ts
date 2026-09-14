import { withoutPostV10Fields } from './scenarios/legacy-save';
import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld, applyCommand, stepWorld, serializeWorld, deserializeWorld, validateWorld } from '../src/sim/index';
import { plantGrowth, plantGrowthRate, berryYield, harvestable, harvestRoll } from '../src/sim/plants';
import { refreshStock, addGroundMaterial } from '../src/sim/materials';
import { ResourceLayer } from '../src/render/ResourceLayer';
import { queryArea } from '../src/sim/designation';
import { SnapshotEncoder, SnapshotDecoder } from '../src/bridge/snapshots';
import type { World } from '../src/sim/types';
import { legacyPlantGrowth } from '../src/sim/plants';
import { naturalLight } from '../src/sim/environment';
import { CropLayer } from '../src/render/CropLayer';

function fixture() {
  const world=createWorld(42,8,8);world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.pawns=world.pawns.slice(0,1);Object.assign(world.pawns[0]!,{x:2,z:2,hunger:100,rest:100});
  world.resources=[{id:world.nextId++,kind:'berries',x:3,z:2,amount:10}];world.piles=[];refreshStock(world);
  return world;
}
function finish(world:World,kind:'harvest'|'cut') {
  const plant=world.resources[0]!;
  expect(applyCommand(world,{type:'designate',kind,x:plant.x,z:plant.z}).ok).toBe(true);
  for(let i=0;i<500 && world.jobs.length;i++)stepWorld(world);
  expect(world.jobs).toEqual([]);expect(validateWorld(world)).toEqual([]);
}

test('growers clear mixed stacks without storage: reservations, physical trips, interruption, blocked exits and V8 continuation', () => {
  const world=createWorld(93,16,16);world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.resources=[];world.piles=[];
  world.pawns=world.pawns.slice(0,2);world.pawns.forEach((p,i)=>Object.assign(p,{x:3,z:4+i*2,hunger:100,rest:100,priorities:{grow:1,haul:0,gather:0,build:0, cook: 0 }}));
  addGroundMaterial(world,'wood',25,{x:5,z:5});addGroundMaterial(world,'food',12,{x:6,z:5},'rice');
  expect(applyCommand(world,{type:'area',action:'growing',from:{x:5,z:4},to:{x:7,z:6}}).ok).toBe(true);
  const phases=new Map<string,string>();let carried=false;
  for(let tick=0;tick<1600;tick++) {
    stepWorld(world);expect(validateWorld(world),`tick ${world.tick}`).toEqual([]);
    expect(world.stock).toEqual({wood:25,food:12});
    for(const p of world.pawns) if(p.haul?.destination.type==='aside') {
      phases.set(p.haul.phase,phases.get(p.haul.phase)??serializeWorld(world));
      expect(world.growingZones.some(z=>z.cells.includes(p.haul!.destination.type==='aside'?p.haul!.destination.z*16+p.haul!.destination.x:-1))).toBe(false);
      if(p.haul.phase==='deliver') {carried=true;expect(world.piles.find(pile=>pile.id===p.haul!.carryPileId)?.owner).toEqual({type:'pawn',pawnId:p.id});}
    }
    if(world.resources.length===9 && world.pawns.every(p=>!p.haul))break;
  }
  expect(carried).toBe(true);expect([...phases.keys()].sort()).toEqual(['deliver','pickup']);
  expect(world.resources.filter(r=>r.kind==='rice')).toHaveLength(9);
  expect(world.piles.every(p=>p.owner.type==='ground'&&!world.growingZones[0]!.cells.includes(p.owner.z*16+p.owner.x))).toBe(true);
  for(const saved of phases.values()) {
    const a=deserializeWorld(saved),b=deserializeWorld(saved);stepWorld(a,150);stepWorld(b,150);expect(serializeWorld(a)).toBe(serializeWorld(b));
  }
  const interrupted=deserializeWorld(phases.get('deliver')!),p=interrupted.pawns.find(p=>p.haul?.phase==='deliver')!;
  const destination=p.haul!.destination;expect(destination.type).toBe('aside');
  if(destination.type!=='aside')throw new Error('missing clearing destination');
  const before=serializeWorld(interrupted);
  expect(applyCommand(interrupted,{type:'designate',kind:'wall',x:destination.x,z:destination.z}).ok).toBe(false);
  expect(serializeWorld(interrupted)).toBe(before);
  expect(applyCommand(interrupted,{type:'priority',pawnId:p.id,work:'haul',value:0}).ok).toBe(true);expect(p.haul).not.toBeNull();
  expect(applyCommand(interrupted,{type:'priority',pawnId:p.id,work:'grow',value:0}).ok).toBe(true);expect(p.haul).toBeNull();
  expect(interrupted.stock).toEqual({wood:25,food:12});expect(validateWorld(interrupted)).toEqual([]);
  for(const mutate of [
    (w:World)=>{w.pawns.find(p=>p.haul?.destination.type==='aside')!.haul!.destination={type:'aside',x:-1,z:0};},
    (w:World)=>{w.pawns.find(p=>p.haul?.destination.type==='aside')!.haul!.destination={type:'aside',x:5,z:5};},
    (w:World)=>{w.pawns.find(p=>p.haul?.destination.type==='aside')!.priorities.grow=0;},
  ]) { const bad=JSON.parse(phases.get('deliver')!);mutate(bad);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(); }
  // No outside destination: never pick up an obstruction and strand the cargo.
  const sealed=createWorld(42,8,8);sealed.resources=[];sealed.piles=[];sealed.tiles=sealed.tiles.map(()=>({terrain:'grass'}));
  sealed.pawns=sealed.pawns.slice(0,1);Object.assign(sealed.pawns[0]!,{x:2,z:2,hunger:100,rest:100,priorities:{grow:1,haul:0,gather:0,build:0, cook: 0 }});
  addGroundMaterial(sealed,'wood',10,{x:3,z:2});applyCommand(sealed,{type:'area',action:'growing',from:{x:0,z:0},to:{x:7,z:7}});
  stepWorld(sealed,100);expect(sealed.pawns[0]!.haul).toBeNull();expect(sealed.piles[0]!.owner).toEqual({type:'ground',x:3,z:2});expect(validateWorld(sealed)).toEqual([]);
  const old=JSON.parse(serializeWorld(world));old.schemaVersion=8;withoutPostV10Fields(old);for(const p of old.pawns){delete p.cooking;delete p.priorities.cook;}
  const migrated=deserializeWorld(JSON.stringify(old));expect(migrated.schemaVersion).toBe(14);
  old.schemaVersion=10;for(const p of old.pawns){p.cooking=null;p.priorities.cook=2;}expect(migrated).toEqual(deserializeWorld(JSON.stringify(old)));
});

test('renewable bush: conditions, strict threshold, physical yield, repeated harvest, cutting and exact saves',()=>{
  expect(plantGrowthRate(1,21,1)).toBe(1);
  expect(plantGrowthRate(1,21,.7)).toBe(.85);
  for(const temperature of [-20,0,58,90])expect(plantGrowthRate(1,temperature,1)).toBe(0);
  for(const temperature of [6,21,42])expect(plantGrowthRate(1,temperature,1)).toBe(1);
  expect(plantGrowthRate(1,3,1)).toBe(.5);expect(plantGrowthRate(1,50,1)).toBe(.5);
  expect(plantGrowthRate(.51,21,1)).toBe(0);expect(plantGrowthRate(1,21,.49)).toBe(0);expect(plantGrowthRate(1,21,1,true)).toBe(0);
  const world=fixture(),plant=world.resources[0]!,id=plant.id;
  plant.growth=.65;plant.growthTick=world.tick;
  expect(harvestable(world,plant)).toBe(false);
  expect(applyCommand(world,{type:'designate',kind:'harvest',x:3,z:2}).ok).toBe(false);
  expect(queryArea(world,{type:'area',action:'harvest',from:{x:3,z:2},to:{x:3,z:2}})).toMatchObject({cells:[]});
  world.tick=1499;expect(plantGrowth(world,plant)).toBe(.65);
  world.tick=1500;expect(harvestable(world,plant)).toBe(true);expect(berryYield(world,plant)).toBeGreaterThan(5);
  // Independent count of the actual growing ticks, over several complete days.
  plant.growth=.3;plant.growthTick=0;let active=0;
  for(let tick=1;tick<=14000;tick++) {
    world.tick=tick;if(tick%6000>=1500&&tick%6000<=4800) {
      const zenith = Math.acos(Math.cos((tick%6000/6000-.5)*2*Math.PI)/Math.sqrt(2));
      const glow = Math.max(0,Math.min(1,Math.cos(Math.max(0,zenith-23.25*Math.PI/180))/.7));
      active += Math.max(0,(glow-.51)/.49);
    }
    if(tick%137===0)expect(plantGrowth(world,plant)).toBeCloseTo(.3+active/36000,12);
  }
  const beforeNight=plantGrowth(world,plant);world.tick=14500;
  expect(plantGrowth(world,plant)).toBeGreaterThan(beforeNight);
  world.tick=66000;expect(plantGrowth(world,plant)).toBe(1);
  finish(world,'harvest');expect(world.resources[0]).toMatchObject({id,growth:.3,growthTick:world.tick});
  expect(world.stock.food).toBe(10);expect(world.piles[0]!.owner.type).toBe('ground');
  expect(harvestable(world,plant)).toBe(false);
  const saved=serializeWorld(world),copy=deserializeWorld(saved);stepWorld(world,100);stepWorld(copy,100);
  expect(serializeWorld(copy)).toBe(serializeWorld(world));
  world.tick+=66000;expect(plantGrowth(world,plant)).toBe(1);
  finish(world,'harvest');expect(world.stock.food).toBe(20);expect(world.resources[0]!.id).toBe(id);
  finish(world,'cut');expect(world.resources).toEqual([]);expect(world.stock.food).toBe(20);
  const mature=fixture();finish(mature,'cut');expect(mature.resources).toEqual([]);expect(mature.stock.food).toBe(10);
  const emptyYield=fixture();emptyYield.rng=8192;Object.assign(emptyYield.resources[0]!,{amount:1,growth:.6501,growthTick:0});
  expect(harvestRoll(emptyYield,emptyYield.resources[0]!).quantity).toBe(0);finish(emptyYield,'harvest');
  expect(emptyYield.stock.food).toBe(0);expect(emptyYield.rng).not.toBe(8192);
  const early=fixture();Object.assign(early.resources[0]!,{growth:.81,growthTick:0});
  expect(berryYield(early,early.resources[0]!)).toBeCloseTo(7.285714,5);
  const rolled=harvestRoll(early,early.resources[0]!);expect([7,8]).toContain(rolled.quantity);
  const earlyCopy=deserializeWorld(serializeWorld(early));finish(early,'harvest');finish(earlyCopy,'harvest');
  expect(early.stock.food).toBe(rolled.quantity);expect(serializeWorld(earlyCopy)).toBe(serializeWorld(early));
});

test('rice field: eight real days, clearing, sowing, physical mature yield, hauling and a second sowing', () => {
  const world = fixture();
  world.resources.push({id:world.nextId++,kind:'tree',x:5,z:4,amount:7});
  addGroundMaterial(world,'food',18,{x:1,z:1},'survival-meal'); refreshStock(world);
  for (const z of [5,6,7]) expect(applyCommand(world,{type:'stockpile',x:6,z,enabled:true,filters:{wood:false,food:true}}).ok).toBe(true);
  expect(applyCommand(world,{type:'area',action:'growing',from:{x:3,z:2},to:{x:5,z:3}})).toMatchObject({ok:true,affected:6});
  const planted = new Set<number>(); let yielded=0, firstYield=Infinity, replanted=false, storedRice=false;
  for(let tick=0;tick<48000;tick++) {
    stepWorld(world);
    for(const event of world.events) if(event.tick===world.tick) {
      const match=event.message.match(/a récolté (\d+) riz/);
      if(match) { yielded+=Number(match[1]); firstYield=Math.min(firstYield,world.tick); }
    }
    for(const plant of world.resources) if(plant.kind==='rice') {
      if(yielded && !planted.has(plant.id)) replanted=true;
      planted.add(plant.id);
    }
    storedRice ||= world.piles.some(p=>p.item==='rice'&&p.owner.type==='ground'&&p.owner.x===6&&p.owner.z>=5);
    if(tick%500===0) expect(validateWorld(world),`tick ${world.tick}`).toEqual([]);
    if(tick===1000) {
      const resumed=deserializeWorld(serializeWorld(world));
      const original=deserializeWorld(serializeWorld(world));
      stepWorld(resumed,200); stepWorld(original,200);
      expect(serializeWorld(resumed)).toBe(serializeWorld(original));
    }
  }
  expect(firstYield).toBeGreaterThan(39000); expect(firstYield).toBeLessThan(46000);
  expect(yielded).toBe(36); expect(replanted).toBe(true);
  expect(world.resources.some(r=>r.kind==='tree'||r.kind==='berries')).toBe(false);
  expect(world.stock.wood).toBe(7); expect(world.resources.filter(r=>r.kind==='rice')).toHaveLength(6);
  expect(storedRice).toBe(true);
  expect(world.pawns[0]!.hunger).toBeGreaterThan(0);
});

test('growing policies, interrupted sowing, migration and resident crop slots preserve their contracts', () => {
  const world=fixture(); world.resources=[];
  expect(applyCommand(world,{type:'area',action:'growing',from:{x:3,z:2},to:{x:3,z:2}}).ok).toBe(true);
  const zone=world.growingZones[0]!;
  stepWorld(world,15); expect(world.jobs[0]).toMatchObject({kind:'sow',status:'active'});
  expect(world.jobs[0]!.progress).toBeGreaterThan(0); expect(world.resources).toEqual([]);
  const checkpoint=serializeWorld(world), resumed=deserializeWorld(checkpoint);
  stepWorld(world,30); stepWorld(resumed,30); expect(serializeWorld(resumed)).toBe(serializeWorld(world));
  const interrupted=deserializeWorld(checkpoint);
  expect(applyCommand(interrupted,{type:'priority',pawnId:interrupted.pawns[0]!.id,work:'grow',value:0}).ok).toBe(true);
  expect(interrupted.jobs[0]!.progress).toBe(0); stepWorld(interrupted,100); expect(interrupted.resources).toEqual([]);
  expect(applyCommand(interrupted,{type:'growing-policy',zoneId:zone.id,allowSow:false,allowCut:false}).ok).toBe(true);
  expect(interrupted.jobs).toEqual([]);
  const crop=world.resources[0]!; crop.growth=1; crop.growthTick=world.tick;
  expect(applyCommand(world,{type:'growing-policy',zoneId:zone.id,allowSow:false,allowCut:false}).ok).toBe(true);
  stepWorld(world,100); expect(world.resources).toEqual([]); expect(world.stock.food).toBe(6);
  expect(world.jobs).toEqual([]); expect(validateWorld(world)).toEqual([]);
  const invalid=JSON.parse(serializeWorld(world));invalid.growingZones[0].cells.push(invalid.growingZones[0].cells[0]);
  expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow(/growing cell/);
  expect(applyCommand(world,{type:'area',action:'remove-growing',from:{x:3,z:2},to:{x:3,z:2}}).ok).toBe(true);
  expect(world.growingZones).toEqual([]);
  // More inaccessible cells than the queue limit cannot starve another field.
  const split=createWorld(42,32,32);split.tiles=split.tiles.map(()=>({terrain:'grass'}));split.resources=[];split.pawns=split.pawns.slice(0,1);
  Object.assign(split.pawns[0]!,{x:20,z:20,hunger:100,rest:100});
  for(let z=0;z<32;z++)split.tiles[z*32+12]={terrain:'water'};
  expect(applyCommand(split,{type:'area',action:'growing',from:{x:0,z:0},to:{x:9,z:12}}).ok).toBe(true);
  expect(applyCommand(split,{type:'area',action:'growing',from:{x:22,z:20},to:{x:23,z:21}}).ok).toBe(true);
  stepWorld(split,500);
  expect(split.resources.filter(r=>r.kind==='rice')).toHaveLength(4);expect(split.jobs.length).toBeLessThanOrEqual(128);expect(validateWorld(split)).toEqual([]);

  const old=fixture();old.tick=14000;Object.assign(old.resources[0]!,{growth:.3,growthTick:0});
  const acquired=legacyPlantGrowth(old,old.resources[0]!);
  const oldSave=JSON.parse(JSON.stringify(old));oldSave.schemaVersion=7;withoutPostV10Fields(oldSave);delete oldSave.growingZones;delete oldSave.growingCursor;delete oldSave.environment;
  for(const pawn of oldSave.pawns){delete pawn.priorities.grow;delete pawn.priorities.cook;delete pawn.cooking;}
  const migrated=deserializeWorld(JSON.stringify(oldSave));
  expect(plantGrowth(migrated,migrated.resources[0]!)).toBe(acquired);expect(migrated.growingZones).toEqual([]);
  expect(naturalLight(0)).toBe(0);expect(naturalLight(3000)).toBe(1);expect(naturalLight(1500)).toBeCloseTo(naturalLight(4500),12);

  const material=new THREE.MeshStandardNodeMaterial({vertexColors:true}),layer=new CropLayer(material);
  layer.update(world,true);const mesh=layer.group.children[0] as THREE.InstancedMesh,geometry=mesh.geometry,buffer=mesh.instanceMatrix;
  world.resources=[crop];layer.update(world,false);expect(mesh.count).toBe(1);
  world.resources=[];layer.update(world,false);expect(mesh.count).toBe(0);
  const restore=layer.prepareForCompile();expect(mesh.count).toBe(1);restore();expect(mesh.count).toBe(0);
  world.resources=[{...crop,id:world.nextId++}];layer.update(world,false);
  expect(layer.group.children[0]).toBe(mesh);expect(mesh.geometry).toBe(geometry);expect(mesh.instanceMatrix).toBe(buffer);expect(mesh.count).toBe(1);
  layer.dispose();material.dispose();
});

test('full floor, migration, snapshot immutability and resident fruit disappear/reappear without geometry rebuild',()=>{
  const full=fixture();Object.assign(full.resources[0]!,{growth:.81,growthTick:0});
  for(let z=0;z<8;z++)for(let x=0;x<8;x++)addGroundMaterial(full,'wood',75,{x,z});refreshStock(full);
  const rng=full.rng,checkpoint={...full.resources[0]!};
  expect(applyCommand(full,{type:'designate',kind:'harvest',x:3,z:2}).ok).toBe(true);stepWorld(full,100);
  expect(full.jobs).toHaveLength(1);expect(full.resources[0]).toEqual(checkpoint);expect(full.rng).toBe(rng);expect(full.stock.food).toBe(0);
  const old=fixture(),legacy=JSON.parse(serializeWorld(old));legacy.schemaVersion=6;withoutPostV10Fields(legacy);for(const p of legacy.pawns){delete p.cooking;delete p.priorities.cook;}legacy.resources[0].amount=14;
  const migrated=deserializeWorld(JSON.stringify(legacy));expect(migrated.resources[0]).toMatchObject({id:legacy.resources[0].id,amount:14,growth:1,growthTick:0});
  for(const patch of [{growth:NaN,growthTick:0},{growth:.3},{growth:.3,growthTick:1},{growth:1.1,growthTick:0}]) {
    const invalid=JSON.parse(serializeWorld(old));Object.assign(invalid.resources[0],patch);
    expect(()=>deserializeWorld(JSON.stringify(invalid))).toThrow(/growth/);
  }
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const initial=decoder.adopt(structuredClone(encoder.encode(old,.1,1,true)));expect(initial.status).toBe('applied');
  finish(old,'harvest');const after=decoder.adopt(structuredClone(encoder.encode(old,.1,1)));
  expect(after.status).toBe('applied');if(after.status==='applied')expect(after.world).toEqual(old);
  if(initial.status==='applied')expect(initial.world.resources[0]!.growth).toBeUndefined();
  const material=new THREE.MeshStandardNodeMaterial({vertexColors:true}),group=new THREE.Group(),layer=new ResourceLayer(group,material);
  const ripe=fixture();layer.update(ripe,true);
  const mesh=(group.children[0] as THREE.Group).children[0] as THREE.Mesh,geometry=mesh.geometry,position=geometry.getAttribute('position'),index=geometry.index,count=geometry.drawRange.count;
  Object.assign(ripe.resources[0]!,{growth:.3,growthTick:0});layer.update(ripe,false);
  expect(mesh.geometry).toBe(geometry);expect(geometry.drawRange.count).toBeLessThan(count);
  ripe.tick=66000;layer.updateGrowth(ripe);expect(geometry.drawRange.count).toBe(count);
  expect(geometry.index).toBe(index);expect(geometry.getAttribute('position')).toBe(position);
  ripe.resources=[];layer.update(ripe,false);expect(geometry.drawRange.count).toBe(0);
  layer.clear();material.dispose();
});
