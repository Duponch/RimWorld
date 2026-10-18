import {afterEach,expect,test,vi} from 'vitest';
import * as THREE from 'three/webgpu';
import * as environment from '../src/sim/environment';
import * as terrain from '../src/sim/natural-terrain-runtime-256';
import {createWorld} from '../src/sim';
import {createPlantGrowthReader,harvestable,plantGrowth} from '../src/sim/plants';
import {CLIMATE_DEFINITIONS} from '../src/sim/site-climate';
import {createPlantLife,plantLeafless} from '../src/sim/plant-life';
import {initializeHydroponicBasin} from '../src/sim/hydroponics';
import {NaturalAppearancePass} from '../src/render/natural-appearance-pass';
import {NaturalResourcePresentation} from '../src/render/NaturalResourcePresentation';
import {NaturalResourcePresentationV225 as Reference} from './scenarios/natural-presentation-baseline-v225';
import {NaturalDirtyContractOracle} from './scenarios/natural-dirty-contract-v233';
import {floraIdentity,floraSize,isClusterPlantSpecies,isResidentCrop} from '../src/render/flora-presentation';
import {ResourceLayer} from '../src/render/ResourceLayer';
import {OverviewLayer} from '../src/render/OverviewLayer';
import type {OverviewBatch} from '../src/render/OverviewBatch';
import type {ResourceRangeData} from '../src/render/StaticGeometry';
import type {Resource,Tile,World} from '../src/sim/types';

afterEach(()=>vi.restoreAllMocks());

// Small numerical/render query fixtures, not saved or simulated colonies.
// The actual public plantGrowth/harvestable readers remain the exact oracle;
// no inverse growth approximation or weakened projection assertion is used.
function fixture(revision:0|1|2|4=4):World {
  const world=createWorld(427,16,16);world.tick=1500;
  world.tiles=world.tiles.map(()=>({terrain:'soil-natural'}));world.resources=[];
  const rows:ReadonlyArray<readonly [Resource['kind'],Resource['species']]>=[
    ['tree','oak'],['tree','pine'],['berries','berry-bush'],['wild-plant','grass'],
    ['wild-plant','agave'],['wild-plant','glowstool'],['wild-plant','agarilux'],
    ['wild-plant','bryolux'],['healroot',undefined],['rice',undefined],['berries',undefined],['rock',undefined],
  ];
  for(const [i,[kind,species]]of rows.entries())world.resources.push({id:world.nextId++,kind,...(species?{species}:{}),
    x:1+i,z:2,amount:10,growth:i===1?1:i===2?.65:.2,growthTick:i%2?0:1200,growthThermalFactor:i%3?1:0});
  world.resources[3]!.growthLight='dark';world.resources[4]!.growthLight='artificial-full';
  world.resources[5]!.growthLight='dark';world.resources[6]!.growthLight='artificial-full';
  world.resources[8]!.blight={since:0,severity:.1,lastHarmTick:0,nextCheck:1600,rng:123};
  const leaves=world.resources[0]!;leaves.plantLife={...createPlantLife(world,leaves),leaflessAt:0};
  world.roofing={constructed:[2*world.width+2],build:[],remove:[],cursor:0,natural:{thin:[2*world.width+6],thick:[]}};
  const common={adoptedAt:0,calendarOrigin:1500};
  if(revision===0)delete world.climate;
  else world.climate=revision===1?{...common,revision,profile:'temperate-reference'}:
    revision===2?{...common,revision,definition:{...CLIMATE_DEFINITIONS['temperate-reference']}}:
      {...common,revision,tileId:0,irregular262:true,definition:{...CLIMATE_DEFINITIONS['temperate-reference']}};
  return world;
}
const observation=(world:World,r:Resource)=>({size:floraSize(world,r),ripe:r.kind==='berries'&&harvestable(world,r),leafless:plantLeafless(world,r)});
const visible=(world:World):World=>({...world,resources:world.resources.filter(r=>!isResidentCrop(r)&&!isClusterPlantSpecies(r.species))});

test.each([0,1,2,4] as const)('one growth pass equals public RAW readers exactly on climate %s and actual ground/light cases',revision=>{
  const world=fixture(revision),grounds:Tile[]=[
    {terrain:'soil-natural'},{terrain:'rich-soil'},{terrain:'gravel'},{terrain:'mud'},{terrain:'marsh'},
    {terrain:'ice'},{terrain:'packed-dirt'},{terrain:'rough-stone',stone:'granite'},
    {terrain:'rough-stone',stone:'marble'},{terrain:'soil-natural',floor:'wood-planks'},
    {terrain:'soil-natural',bridge:true},
  ];
  for(const tile of grounds)for(const tick of [1499,1500,1501,4800,4801,5999,6000,6001]){
    world.tick=tick;world.tiles=world.tiles.map(()=>({...tile}));
    const before=structuredClone(world),expected=world.resources.map(r=>({growth:plantGrowth(world,r),observation:observation(world,r),fruit:harvestable(world,r)}));
    const growth=createPlantGrowthReader(world),pass=new NaturalAppearancePass(world,true);
    world.resources.forEach((r,i)=>{
      expect(Object.is(growth(r),expected[i]!.growth)).toBe(true);
      const value=pass.read(r);expect({size:value.size,ripe:value.ripe,leafless:value.leafless}).toStrictEqual(expected[i]!.observation);
      expect(pass.harvestable(r)).toBe(expected[i]!.fruit);expect(floraIdentity(world,r,value)).toBe(floraIdentity(world,r));
      expect(pass.read(r)).toBe(value);
    });
    expect(world).toStrictEqual(before);
  }
});

test('the pass shares repeated numerical inputs and a new pass observes same-tick ground/roof/light changes',()=>{
  const world=fixture(4),prototype=world.resources[2]!;
  world.resources=Array.from({length:20},(_,i)=>({...prototype,id:world.nextId++,x:i%10+1,z:Math.floor(i/10)+4,growth:.4,growthTick:i%2?0:1200}));
  const expected=world.resources.map(r=>plantGrowth(world,r));
  const substrate=vi.spyOn(terrain,'naturalPlantSubstrate256'),light=vi.spyOn(environment,'annualGrowingLightIntegral');
  const growth=createPlantGrowthReader(world);world.resources.forEach((r,i)=>expect(Object.is(growth(r),expected[i]!)).toBe(true));
  expect(substrate).toHaveBeenCalledTimes(1);expect(light).toHaveBeenCalledTimes(3); // Current tick and two shared anchors.
  substrate.mockRestore();light.mockRestore();
  const first=new NaturalAppearancePass(world,true);world.resources.forEach(r=>first.read(r));
  world.tiles[world.resources[0]!.z*world.width+world.resources[0]!.x]!.floor='wood-planks';
  world.roofing!.constructed=[world.resources[1]!.z*world.width+world.resources[1]!.x];
  world.resources[2]!.growthLight='artificial-full';world.resources[3]!.blight={since:0,severity:.1,lastHarmTick:0,nextCheck:1600,rng:123};
  const next=new NaturalAppearancePass(world,true);
  for(const r of world.resources){const value=next.read(r);expect({size:value.size,ripe:value.ripe,leafless:value.leafless}).toStrictEqual(observation(world,r));expect(next.harvestable(r)).toBe(harvestable(world,r));}
  // Basin fertility stays individual, even on a shared ground definition.
  world.structures=[{id:world.nextId++,kind:'hydroponics-basin',x:8,z:8,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:1}}];
  initializeHydroponicBasin(world,world.structures[0]!);
  const crop:Resource={id:world.nextId++,kind:'healroot',x:8,z:8,amount:1,growth:.2,growthTick:0,growthLight:'artificial-full'};
  delete crop.blight;world.resources.push(crop);const basin=createPlantGrowthReader(world);expect(basin(crop)).toBe(plantGrowth(world,crop));
});

function geometry(group:THREE.Group):unknown[] {
  return group.children.map(chunk=>({name:chunk.name,meshes:chunk.children.map(object=>{
    const mesh=object as THREE.Mesh,g=mesh.geometry,data=mesh.userData.resourceRanges as ResourceRangeData;
    return {name:mesh.name,visible:mesh.visible,castShadow:mesh.castShadow,receiveShadow:mesh.receiveShadow,drawRange:{...g.drawRange},
      ranges:data.ranges.map(r=>({...r})),originalIndex:Array.from(data.original),originalPositions:Array.from(data.originalPositions),
      index:Array.from(g.index!.array),attributes:Object.fromEntries(Object.entries(g.attributes).map(([name,a])=>[name,Array.from(a.array)])),
      sphere:g.boundingSphere?{center:g.boundingSphere.center.toArray(),radius:g.boundingSphere.radius}:undefined,
      updates:Object.fromEntries(Object.entries(g.attributes).map(([name,a])=>[name,'updateRanges' in a?a.updateRanges:undefined]))};
  })}));
}
const overview=(layer:OverviewLayer)=>(layer.group.children[1] as THREE.Group).children.map(object=>{
  const batch=object as OverviewBatch;return {name:batch.name,count:batch.activeCount,matrix:Array.from(batch.instanceMatrix.array),color:Array.from(batch.colorBuffer.array),
    drawRange:{...batch.geometry.drawRange},sphere:{center:batch.boundingSphere.center.toArray(),radius:batch.boundingSphere.radius}};
});

test('shared natural appearance preserves public views and exact resident geometry through eclipse, edits and restoration',()=>{
  const source=fixture(4),natural=new NaturalResourcePresentation(),reference=new Reference(),dirty=new NaturalDirtyContractOracle();
  const material=new THREE.MeshStandardNodeMaterial();material.userData.rendererOwned=true;
  const raw=new ResourceLayer(new THREE.Group(),material),shared=new ResourceLayer(new THREE.Group(),material),rawOverview=new OverviewLayer(),sharedOverview=new OverviewLayer();
  const held:Array<{world:World;copy:World}>=[];
  const check=(reset=false)=>{
    const world=structuredClone(source),before=structuredClone(world),expected=reference.read(world,reset,true),actual=natural.read(world,reset,true);
    expect(actual).toStrictEqual(expected);dirty.assert(world,reset,true,natural.changes,reference.changes);
    for(const r of world.resources){const value=natural.appearance!.read(r);expect({size:value.size,ripe:value.ripe,leafless:value.leafless}).toStrictEqual(observation(world,r));expect(natural.appearance!.harvestable(r)).toBe(harvestable(world,r));}
    if(actual&&expected){
      raw.update(visible(expected),reset,reference.changes);shared.update(visible(actual),reset,natural.changes,undefined,natural.appearance);
      rawOverview.update(visible(expected),reset,reference.changes);sharedOverview.update(visible(actual),reset,natural.changes,natural.appearance);
    }
    expect(geometry(shared.group)).toStrictEqual(geometry(raw.group));expect(overview(sharedOverview)).toStrictEqual(overview(rawOverview));
    expect(world).toStrictEqual(before);held.push({world,copy:before});for(const old of held)expect(old.world).toStrictEqual(old.copy);
  };
  try {
    check(true);source.tick=6000;check();source.tick=6001;check();
    source.resources[2]!.growth=.8;source.resources[2]!.growthTick=source.tick;check();
    source.miscIncidents={profile:'cassandra-misc-v1',adoptedAt:0,rng:123,nextCheck:6100,introDone:true,checks:1,opportunities:1,heatwaves:0,
      weather:{adoptedAt:source.tick,coldSnaps:0,eclipses:1,lastEclipseStart:source.tick,eclipse:{start:source.tick,end:source.tick+4500}}};
    source.tick+=20;check();source.miscIncidents.weather!.eclipse!.end++;check();delete source.miscIncidents.weather!.eclipse;check();
    const removed=source.resources.splice(0,1)[0]!;check();source.resources.unshift(removed);check();
    source.resources[0]!.growth=.1;source.resources[0]!.growthTick=source.tick;check();source.resources[0]!.x=14;check();
    source.tiles[source.resources[0]!.z*source.width+14]!.floor='wood-planks';check();
    // V225 predates color-only blight dirtiness: this edit also crosses an
    // independently visible growth stage, so its complete view oracle applies.
    delete source.resources[8]!.blight;source.resources[8]!.growth=.9;source.resources[8]!.growthTick=source.tick;check();
    source.climate={revision:1,profile:'temperate-reference',adoptedAt:0,calendarOrigin:1500};check();
    source.climate=fixture(4).climate;check(true);
  } finally {raw.dispose();shared.dispose();rawOverview.dispose();sharedOverview.dispose();material.dispose();}
});
