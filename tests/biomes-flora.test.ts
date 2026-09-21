import { createHash } from 'node:crypto';
import { expect,test } from 'vitest';
import { applyCommand,deserializeWorld,serializeWorld,stepWorld } from '../src/sim/index';
import { createScenarioWorld } from '../src/sim/new-game';
import { generateSiteWorld } from '../src/sim/site-generation';
import { resolveSite } from '../src/sim/site';
import { BIOME_FLORA,FLORA_DEFINITIONS,PLANT_SPECIES,grazingResult,plantNutrition,type BiomeId,type PlantSpecies } from '../src/sim/biome-flora';
import { plantGrowth,choppable } from '../src/sim/plants';
import { damageResource } from '../src/sim/thing-damage';
import { resourceFlammability } from '../src/sim/thing-damage-rules';
import { advanceWildFlora,validateWildFlora } from '../src/sim/wild-flora';
import { siteClimateDefinition } from '../src/sim/site-climate';
import { refreshStock } from '../src/sim/materials';
import { applyPlantFrost,plantLeafless } from '../src/sim/plant-life';
import { updatePlantTemperatures } from '../src/sim/thermal-plants';
import type { Resource,World } from '../src/sim/types';

const biomes:BiomeId[]=['temperate-forest','boreal-forest','arid-shrubland'];

function biomeWorld(biome:BiomeId):World {
  return createScenarioWorld(42,32,'crashlanded',{hilliness:'small-hills',biome});
}

function prepareGathering(world:World,species:PlantSpecies):Resource {
  const resource=world.resources.find(item=>item.species===species);
  if(!resource)throw new Error(`Seed 42 has no ${species}.`);
  const pawn=world.pawns[0]!;
  world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.resources=[resource];
  Object.assign(resource,{x:4,z:3,growth:1,growthTick:world.tick});
  Object.assign(pawn,{x:3,z:3,hunger:100,rest:100,jobId:null,haul:null,need:null,state:'idle',path:[],planCooldown:0});
  for(const colonist of world.pawns){colonist.schedule.fill('work');for(const key in colonist.priorities)colonist.priorities[key as keyof typeof colonist.priorities]=0;}
  pawn.priorities.gather=1;
  if(world.wildlife)world.wildlife.animals=[];
  world.jobs=[];world.structures=[];world.piles=world.piles.filter(pile=>pile.owner.type!=='ground'||pile.owner.x!==4||pile.owner.z!==3);
  refreshStock(world);return resource;
}

function finishExactly(world:World,limit=600):World {
  const resumed=deserializeWorld(serializeWorld(world));
  for(let i=0;i<limit&&(world.jobs.length||resumed.jobs.length);i++){stepWorld(world);stepWorld(resumed);}
  expect(world.jobs).toEqual([]);expect(resumed.jobs).toEqual([]);
  expect(serializeWorld(resumed)).toBe(serializeWorld(world));return world;
}

test('omitting biome preserves the revision-1 site and its exact generated landscape',()=>{
  const site=resolveSite(42,{hilliness:'small-hills'}),world=generateSiteWorld(42,32,32,site);
  expect(site).toEqual({revision:1,biome:'temperate-forest',hilliness:'small-hills',river:'none',stones:['slate','limestone']});
  expect(world.flora).toBeUndefined();expect(world.resources.every(resource=>resource.species===undefined)).toBe(true);
  const bytes=JSON.stringify({site,tiles:world.tiles,resources:world.resources,piles:world.piles});
  expect(createHash('sha256').update(bytes).digest('hex')).toBe('ab8b8fce1bfbd8b693d92b45b3a8e53dfd77194747f6db9d6735656688e8b1d9');
});

test('three explicit biomes generate deterministic, distinct and fully identified flora and climate',()=>{
  const observed=new Set<PlantSpecies>();
  const expectedProfiles={
    'temperate-forest':{profile:'temperate-reference',meanTemperature:16.2,rainfall:900,latitude:22.21,longitude:-18.23},
    'boreal-forest':{profile:'boreal-reference',meanTemperature:5.3,rainfall:655,latitude:39.71,longitude:13.47},
    'arid-shrubland':{profile:'arid-reference',meanTemperature:25.4,rainfall:690,latitude:4.01,longitude:27.74},
  } as const;
  const signatures:string[]=[];
  for(const biome of biomes){
    const world=biomeWorld(biome),copy=biomeWorld(biome),plants=world.resources.filter(resource=>resource.species!==undefined);
    expect(world.site).toMatchObject({revision:2,biome});expect(world.flora).toMatchObject({revision:1,biome,capacity:plants.length});
    expect(validateWildFlora(world,91)).toBe(true);expect(copy.resources).toEqual(world.resources);
    const allowed=new Set(Object.keys(BIOME_FLORA[biome].weights));
    expect(plants.length).toBeGreaterThan(0);expect(plants.every(plant=>allowed.has(plant.species!))).toBe(true);
    for(const plant of plants)observed.add(plant.species!);
    const climate=siteClimateDefinition(world),{profile,...expected}=expectedProfiles[biome];
    expect(world.climate?.profile).toBe(profile);expect(climate).toMatchObject(expected);
    signatures.push([...new Set(plants.map(plant=>plant.species))].sort().join(','));
  }
  expect(new Set(signatures).size).toBe(3);expect([...observed].sort()).toEqual([...PLANT_SPECIES].sort());
});

test('low vegetation grows, feeds grazers, burns and is cleared by real construction work',()=>{
  const world=biomeWorld('arid-shrubland'),grass=prepareGathering(world,'grass');
  grass.growth=.2;grass.growthTick=0;world.tick=6000;
  expect(plantGrowth(world,grass)).toBeGreaterThan(.2);
  expect(plantNutrition(grass,.6)).toBeCloseTo(.3);
  expect(grazingResult(grass,.6,.12)).toMatchObject({nutrition:.12,growthConsumed:.24,removes:false});
  expect(resourceFlammability(grass)).toBe(1.3);
  expect(damageResource(world,grass,FLORA_DEFINITIONS.grass.hitPoints,'fire')).toBe(true);
  expect(world.resources).not.toContain(grass);expect(world.fires?.ledger.resources['wild-plant']).toBe(1);

  const construction=biomeWorld('temperate-forest'),plant=prepareGathering(construction,'grass'),pawn=construction.pawns[0]!;
  pawn.priorities.gather=0;pawn.priorities.build=1;
  expect(applyCommand(construction,{type:'designate',kind:'wall',material:'wood',x:plant.x,z:plant.z}).ok).toBe(true);
  for(let i=0;i<1500&&!construction.structures.some(structure=>structure.kind==='wall'&&structure.x===plant.x&&structure.z===plant.z);i++)stepWorld(construction);
  expect(construction.resources).not.toContain(plant);
  expect(construction.structures).toContainEqual(expect.objectContaining({kind:'wall',x:plant.x,z:plant.z}));
});

test('cold response follows species graphics and neutral thermal changes preserve checkpoints',()=>{
  const world=biomeWorld('boreal-forest'),pine=world.resources.find(resource=>resource.species==='pine')!,birch=world.resources.find(resource=>resource.species==='birch')!;
  expect(applyPlantFrost(world,pine,true,-100)).toBe(false);expect(plantLeafless(world,pine)).toBe(false);
  expect(applyPlantFrost(world,birch,true,-100)).toBe(false);expect(plantLeafless(world,birch)).toBe(true);
  const factors=world.resources.map(resource=>[resource.id,resource.growthTick,resource.growthThermalFactor]);
  const layout={rooms:[],doors:[],indices:new Int32Array(world.width*world.height).fill(-1)};
  updatePlantTemperatures(world,layout);world.tick+=6;updatePlantTemperatures(world,layout);
  expect(world.resources.map(resource=>[resource.id,resource.growthTick,resource.growthThermalFactor])).toEqual(factors);
});

test('agave harvest and mature tree cutting create their physical products across an exact resume',()=>{
  const arid=biomeWorld('arid-shrubland'),agave=prepareGathering(arid,'agave');
  expect(applyCommand(arid,{type:'designate',kind:'harvest',x:agave.x,z:agave.z}).ok).toBe(true);
  stepWorld(arid,8);finishExactly(arid);
  expect(arid.resources).not.toContain(agave);
  expect(arid.piles.filter(pile=>pile.item==='agave-fruit').reduce((sum,pile)=>sum+pile.quantity,0)).toBe(10);

  const temperate=biomeWorld('temperate-forest'),oak=prepareGathering(temperate,'oak');
  const woodBefore=temperate.piles.filter(pile=>pile.item==='wood').reduce((sum,pile)=>sum+pile.quantity,0);
  oak.growth=.39;expect(choppable(temperate,oak)).toBe(false);
  expect(applyCommand(temperate,{type:'designate',kind:'chop',x:oak.x,z:oak.z}).ok).toBe(false);
  oak.growth=1;expect(choppable(temperate,oak)).toBe(true);
  expect(applyCommand(temperate,{type:'designate',kind:'chop',x:oak.x,z:oak.z}).ok).toBe(true);
  stepWorld(temperate,8);finishExactly(temperate);
  expect(temperate.resources).not.toContain(oak);
  expect(temperate.piles.filter(pile=>pile.item==='wood').reduce((sum,pile)=>sum+pile.quantity,0)).toBe(woodBefore+46);
});

test('renewal is prospective, bounded, excludes occupied habitat and invalidates resource indexes',()=>{
  const world=biomeWorld('arid-shrubland'),state=world.flora!;
  world.resources=[];world.structures=[];world.jobs=[];world.piles=[];world.packed=[];world.tiles=world.tiles.map(()=>({terrain:'grass'}));
  world.growingZones=[{id:world.nextId++,cells:world.tiles.map((_,index)=>index),plant:'rice',allowSow:true,allowCut:true}];
  state.rng=1;
  world.tick=state.nextCheck;const blockedReference=world.resources;advanceWildFlora(world);
  expect(world.resources).toBe(blockedReference);expect(world.resources).toEqual([]);
  world.growingZones=[];state.rng=1;world.tick=state.nextCheck;const oldReference=world.resources;advanceWildFlora(world);
  expect(world.resources).not.toBe(oldReference);expect(world.resources).toHaveLength(1);expect(validateWildFlora(world,91)).toBe(true);
  state.capacity=1;world.tick=state.nextCheck;const saturatedReference=world.resources,rng=state.rng;advanceWildFlora(world);
  expect(world.resources).toBe(saturatedReference);expect(state.rng).toBe(rng);expect(validateWildFlora(world,91)).toBe(true);
  world.resources=[];world.nextId=Number.MAX_SAFE_INTEGER;state.rng=1;world.tick=state.nextCheck;advanceWildFlora(world);
  expect(world.resources).toEqual([]);expect(world.nextId).toBe(Number.MAX_SAFE_INTEGER);
  world.width=250;world.height=250;world.tiles=Array.from({length:62500},()=>({terrain:'grass' as const}));
  state.capacity=62500;state.rng=1;world.nextId=Number.MAX_SAFE_INTEGER-1;world.tick=state.nextCheck;advanceWildFlora(world);
  expect(world.resources).toHaveLength(1);expect(world.nextId).toBe(Number.MAX_SAFE_INTEGER);
  const invalid={...state,capacity:world.width*world.height+1};world.flora=invalid;expect(validateWildFlora(world,91)).toBe(false);
});

test('flora state and its private stream resume exactly without retroactive legacy adoption',()=>{
  const world=biomeWorld('boreal-forest'),removed=world.resources.find(resource=>resource.species)!;
  world.resources=world.resources.filter(resource=>resource!==removed);
  const resumed=deserializeWorld(serializeWorld(world));
  world.tick=world.flora!.nextCheck;resumed.tick=resumed.flora!.nextCheck;
  advanceWildFlora(world);advanceWildFlora(resumed);
  expect(resumed.resources).toEqual(world.resources);expect(resumed.flora).toEqual(world.flora);
  expect(validateWildFlora(world,91)).toBe(true);
  const legacy=generateSiteWorld(42,32,32,resolveSite(42,{hilliness:'small-hills'}));
  expect(validateWildFlora(legacy,90)).toBe(true);expect(legacy.flora).toBeUndefined();
});
