import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { createWorld, applyCommand, stepWorld, serializeWorld, deserializeWorld, validateWorld } from '../src/sim/index';
import { plantGrowth, plantGrowthRate, berryYield, harvestable, harvestRoll } from '../src/sim/plants';
import { refreshStock, addGroundMaterial } from '../src/sim/materials';
import { ResourceLayer } from '../src/render/ResourceLayer';
import { queryArea } from '../src/sim/designation';
import { SnapshotEncoder, SnapshotDecoder } from '../src/bridge/snapshots';
import type { World } from '../src/sim/types';

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
    world.tick=tick;if(tick%6000>=1500&&tick%6000<=4800)active++;
    if(tick%137===0)expect(plantGrowth(world,plant)).toBeCloseTo(.3+active/36000,12);
  }
  const beforeNight=plantGrowth(world,plant);world.tick=14500;
  expect(plantGrowth(world,plant)).toBeGreaterThan(beforeNight);
  world.tick=48000;expect(plantGrowth(world,plant)).toBe(1);
  finish(world,'harvest');expect(world.resources[0]).toMatchObject({id,growth:.3,growthTick:world.tick});
  expect(world.stock.food).toBe(10);expect(world.piles[0]!.owner.type).toBe('ground');
  expect(harvestable(world,plant)).toBe(false);
  const saved=serializeWorld(world),copy=deserializeWorld(saved);stepWorld(world,100);stepWorld(copy,100);
  expect(serializeWorld(copy)).toBe(serializeWorld(world));
  world.tick+=48000;expect(plantGrowth(world,plant)).toBe(1);
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

test('full floor, migration, snapshot immutability and resident fruit disappear/reappear without geometry rebuild',()=>{
  const full=fixture();Object.assign(full.resources[0]!,{growth:.81,growthTick:0});
  for(let z=0;z<8;z++)for(let x=0;x<8;x++)addGroundMaterial(full,'wood',75,{x,z});refreshStock(full);
  const rng=full.rng,checkpoint={...full.resources[0]!};
  expect(applyCommand(full,{type:'designate',kind:'harvest',x:3,z:2}).ok).toBe(true);stepWorld(full,100);
  expect(full.jobs).toHaveLength(1);expect(full.resources[0]).toEqual(checkpoint);expect(full.rng).toBe(rng);expect(full.stock.food).toBe(0);
  const old=fixture(),legacy=JSON.parse(serializeWorld(old));legacy.schemaVersion=6;legacy.resources[0].amount=14;
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
  ripe.tick=48000;layer.updateGrowth(ripe);expect(geometry.drawRange.count).toBe(count);
  expect(geometry.index).toBe(index);expect(geometry.getAttribute('position')).toBe(position);
  ripe.resources=[];layer.update(ripe,false);expect(geometry.drawRange.count).toBe(0);
  layer.clear();material.dispose();
});
