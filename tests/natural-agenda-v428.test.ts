import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {SnapshotEncoder} from '../src/bridge/snapshots';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler';
import {NaturalPresentationEvents,supportsNaturalPresentationClock} from '../src/render/natural-presentation-events';
import {NaturalResourcePresentation} from '../src/render/NaturalResourcePresentation';
import {NaturalResourcePresentationV225 as Reference} from './scenarios/natural-presentation-baseline-v225';
import {NaturalDirtyContractOracle} from './scenarios/natural-dirty-contract-v233';
import {createWorld,stepWorld} from '../src/sim/index';
import {deserializeCampaign,serializeCampaign} from '../src/sim/serialization';
import {decodeStoredSave} from '../src/ui/save-storage-codec';
import {campaignPresentation} from '../src/sim/secondary-site-presentation';
import {geographicSurfaceTileClimateDefinition256,TICKS_PER_YEAR,validClimateDefinition} from '../src/sim/site-climate';
import {plantGrowth,plantFertility} from '../src/sim/plants';
import {createPlantLife} from '../src/sim/plant-life';
import type {World,Resource} from '../src/sim/types';
import type {WorldSurfaceTile} from '../src/sim/world-surface-geography';

/** Small numerical projection/query fixtures. Their climate definition uses the
 * real surface-coordinate/amplitude function, but this is not a generated globe
 * or a RAW-save admission fixture. The actual published save is tested below. */
const tile:WorldSurfaceTile={id:0,center:[70,50,-50],corners:[],neighbours:[],biome:'temperate-forest',hilliness:'flat',
 elevation:100,meanTemperature:12,rainfall:800,swampiness:0,rivers:[],riverDistance:0};
function fixture():World {
 const world=createWorld(428,16,16);world.tiles=world.tiles.map(()=>({terrain:'soil-natural'}));world.resources=[];
 world.tick=1500;world.climate={revision:4,tileId:0,irregular262:true,adoptedAt:0,calendarOrigin:0,definition:geographicSurfaceTileClimateDefinition256(tile)};
 return world;
}
function add(world:World,resource:Omit<Resource,'id'>):Resource {const value={...resource,id:world.nextId++};world.resources.push(value);return value;}
function harness(world:World) {
 const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new ResidentPresentationAssembler(),candidate=new NaturalResourcePresentation(),reference=new Reference(),dirty=new NaturalDirtyContractOracle();
 const held:{world:World;copy:World}[]=[];
 const send=(checkpoint=false)=>{const packet=structuredClone(encoder.encode(world,0,1,checkpoint)),expected=structuredClone(campaignPresentation(world)),result=decoder.adopt(packet);
  expect(result.status).toBe('applied');if(result.status!=='applied')throw Error(JSON.stringify(result));expect(result.world).toStrictEqual(expected);return result.world;};
 const read=(next:World,reset=false)=>{const before=structuredClone(next),expected=reference.read(next,reset,true),actual=candidate.read(next,reset,true);
  expect(actual).toStrictEqual(expected);dirty.assert(next,reset,true,candidate.changes,reference.changes);expect(next).toStrictEqual(before);
  for(const old of held)expect(old.world).toStrictEqual(old.copy);held.push({world:next,copy:before});
  return {world:next,actual,changes:[...candidate.changes]};};
 return {send,read,candidate};
}

test('geographic float32 climate values are captured literally, with exact context invalidation',()=>{
 const world=fixture();add(world,{kind:'tree',species:'oak',x:2,z:2,amount:10,growth:.25,growthTick:1500,growthLight:'artificial-full'});
 expect(validClimateDefinition(world.climate!.revision===4?world.climate!.definition:undefined)).toBe(false);
 const h=harness(world),a=h.send(),events=new NaturalPresentationEvents();expect(supportsNaturalPresentationClock(a)).toBe(true);
 expect(events.initialize(a,[0],true)).toBeDefined();h.read(a,true);
 for(const mutate of [
  ()=>{world.climate!.calendarOrigin++;},
  ()=>{if(world.climate!.revision===4)world.climate!.tileId++;},
  ()=>{if(world.climate!.revision===4)delete world.climate!.irregular262;},
  ()=>{if(world.climate!.revision===4)world.climate!.definition={...world.climate!.definition,latitude:world.climate!.definition.latitude+.125};},
  ()=>{if(world.climate!.revision===4)world.climate!.definition={...world.climate!.definition,amplitude:world.climate!.definition.amplitude+.125};},
 ]){mutate();const b=h.send();expect(events.copyIdForecasts(b)).toBeUndefined();expect(events.read(a,b)).toBeUndefined();expect(events.initialize(b,[0],true)).toBeDefined();h.read(b);}
 world.tick++;h.read(h.send());
});

test('cave plants grow under natural roofs and dark markers through the exact first size crossing',()=>{
 const world=fixture(),cave=add(world,{kind:'wild-plant',species:'glowstool',x:2,z:2,amount:10,growth:.25,growthTick:1500,growthLight:'dark'}),cell=cave.z*world.width+cave.x;
 world.roofing={constructed:[],build:[],remove:[],cursor:0,natural:{thin:[cell],thick:[]}};
 const h=harness(world);h.read(h.send(),true);const growth=plantGrowth(world,cave);world.tick++;
 expect(plantGrowth(world,cave)).toBeGreaterThan(growth);expect(h.read(h.send()).changes.map(([id])=>id)).toContain(cave.id);
 world.roofing.natural={thin:[],thick:[cell]};h.read(h.send());world.tick++;h.read(h.send());
});

test('cypress ignores fertility but equal-fertility substrate tag changes still invalidate the curve',()=>{
 const world=fixture(),plant=add(world,{kind:'tree',species:'cypress',x:2,z:2,amount:10,growth:.25,growthTick:1500,growthLight:'artificial-full'}),cell=plant.z*world.width+plant.x;
 world.tiles[cell]={terrain:'ice'};const h=harness(world);h.read(h.send(),true);
 expect(plantFertility(world,plant)).toBe(0);world.tick++;expect(plantGrowth(world,plant)).toBe(.25);h.read(h.send());
 world.tiles[cell]={terrain:'mud'};expect(plantFertility(world,plant)).toBe(0);expect(plantGrowth(world,plant)).toBeGreaterThan(.25);
 expect(h.read(h.send()).changes.map(([id])=>id)).toContain(plant.id);
 world.tiles[cell]={terrain:'ice'};expect(h.read(h.send()).changes.map(([id])=>id)).toContain(plant.id);
 world.tick++;h.read(h.send());
});

test('natural thin/thick roof changes reach an unchanged plant without tile or resource edits',()=>{
 const world=fixture(),plant=add(world,{kind:'tree',species:'oak',x:2,z:2,amount:10,growth:.25,growthTick:1500}),cell=plant.z*world.width+plant.x;
 world.roofing={constructed:[],build:[],remove:[],cursor:0,natural:{thin:[],thick:[cell]}};
 const h=harness(world);h.read(h.send(),true);world.tick++;
 world.roofing.natural!.thick=[];expect(h.read(h.send()).changes.map(([id])=>id)).toContain(plant.id);
 world.roofing.natural!.thin=[cell];expect(h.read(h.send()).changes.map(([id])=>id)).toContain(plant.id);
 world.roofing.natural!.thin=[];expect(h.read(h.send()).changes.map(([id])=>id)).toContain(plant.id);
});

test('geographic day/year, leaf expiration, thermal rebases and checkpoint restoration preserve public observations',()=>{
 const world=fixture(),plant=add(world,{kind:'tree',species:'oak',x:2,z:2,amount:10,growth:.25,growthTick:1500,growthLight:'artificial-full'});
 plant.plantLife={...createPlantLife(world,plant),leaflessAt:1500};
 const h=harness(world);h.read(h.send(),true);
 for(const tick of [1501,1531,1532,1533,1563,1564,4799,4800,4801,5999,6000,6001,7499,7500,7501,TICKS_PER_YEAR-1,TICKS_PER_YEAR,TICKS_PER_YEAR+1]){
  world.tick=tick;h.read(h.send());
  if(tick%6===0){plant.growth=plantGrowth(world,plant);plant.growthTick=tick;plant.growthThermalFactor=.75;h.read(h.send());}
 }
 h.read(h.send(true),true);world.tick++;h.read(h.send());
});

test('the existing geographic campaign save resumes exactly after natural observation',async()=>{
 const input=await decodeStoredSave(readFileSync('public/test-saves/v419/les-eclaircies.json','utf8'));
 const root=deserializeCampaign(input);if(!('tiles'in root))throw Error('Existing Eclaircies must have a local map');
 expect(root.climate?.revision).toBe(4);const canonical=serializeCampaign(root),restored=deserializeCampaign(canonical);
 if(!('tiles'in restored))throw Error('Restored Eclaircies must have the same local map');
 expect(serializeCampaign(restored)).toBe(canonical);
 const h=harness(root);h.read(h.send(),true);expect(serializeCampaign(root)).toBe(canonical);
 stepWorld(root);stepWorld(restored);expect(serializeCampaign(restored)).toBe(serializeCampaign(root));
 h.read(h.send());expect(serializeCampaign(restored)).toBe(serializeCampaign(root));
},90_000);
