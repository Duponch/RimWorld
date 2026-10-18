import {beforeAll,describe,it,expect} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {generateGeographicWorldDraft256,type GeographicWorldDraft256} from '../src/sim/world-geographic-draft.ts';
import {defaultWorldGenerationSettings} from '../src/sim/world-generation-settings.ts';
import {captureGeneratedGeography256} from '../src/sim/world-geography-owner-256.ts';
import {createGeographicPlanet256} from '../src/sim/planet-factory-256.ts';
import {geographicLocalSite256} from '../src/sim/site-geographic-256.ts';
import {planetFactionTargets256} from '../src/sim/planet-faction-targets-256.ts';
import {canPlaceWorldSettlement} from '../src/sim/world-settlement-placement.ts';
import {createWildFloraState256,advanceWildFlora256,validWildFloraState256,validateWildFlora256,plantRegrowthMtb256,rebaseWildFloraClock256} from '../src/sim/wild-plant-runtime-256.ts';
import {createWildPlantMapReader256} from '../src/sim/wild-plant-runtime-map-256.ts';
import {actualPlantPhysicalMasks256} from '../src/sim/actual-plant-physical-masks-256.ts';
import {PlantRegionCache256} from '../src/sim/wild-plant-spawner-256.ts';
import {healthRandom} from '../src/sim/health.ts';
import type {World} from '../src/sim/types.ts';
let draft:GeographicWorldDraft256,planet:ReturnType<typeof createGeographicPlanet256>;
// One genuine immutable surface shared by controller oracles. Prepared local
// soil/empty stocks below are declared unit fixtures, not generated gameplay
// or a claimed validateWorld/save/native acquisition. ROOT may reuse its real
// accepted draft fixture at this boundary instead of regenerating it.
beforeAll(()=>{
 const g=generateGeographicWorldDraft256({seed:'Elsewhere',settings:defaultWorldGenerationSettings(),tick:0,nextThingId:1,playerDef:'PlayerColony',playerName:'Colonie'});let n=g.next();while(!n.done)n=g.next();draft=n.value;
 const owner=captureGeneratedGeography256(draft),targets=planetFactionTargets256(draft.factions,owner.surface.tiles);if(!targets)throw Error('Missing real faction admission');
 const home=owner.surface.tiles.find(t=>t.biome==='temperate-forest'&&canPlaceWorldSettlement(owner.surface.tiles,t.id,{settlementTiles:targets.occupied}));if(!home)throw Error('No real temperate preparation tile');
 planet=createGeographicPlanet256({geography:owner,factions:draft.factions,homeTile:home.id,adoptedAt:0,nextGroupId:1});
},120000);
function prepare(){
 const w=deconstructionCamp(1,32);w.planet=planet;w.worldFactions=draft.factions;w.site=geographicLocalSite256(planet,planet.homeTile);w.seed=w.site.mapSeed>>>0;
 w.nextId=Math.max(w.nextId,draft.nextThingId);w.tiles=w.tiles.map(()=>({terrain:'soil-natural'}));w.resources=[];w.jobs=[];w.structures=[];w.piles=[];w.packed=[];w.growingZones=[];delete w.roofing;
 const reader=createWildPlantMapReader256(world=>{const size=world.width*world.height;return {normalWalkable:new Uint8Array(size).fill(1),door:new Uint8Array(size),fence:new Uint8Array(size),fullFill:new Uint8Array(size),coverOrEdifice:new Uint8Array(size),blocksPlanting:new Uint8Array(size),sandDepth:new Float32Array(size)};},()=>1);
 w.flora=createWildFloraState256(w,reader);return {w,reader};
}
function signature(w:World){return {tick:w.tick,rng:w.rng,nextId:w.nextId,flora:structuredClone(w.flora),resources:structuredClone(w.resources)};}
function next(w:World,reader:ReturnType<typeof createWildPlantMapReader256>){w.tick++;advanceWildFlora256(w,reader);}
function firstAttemptSeed(chance:number):number {
 for(let seed=1;seed<1000000;seed++){const stream={rng:seed};if(Math.fround(healthRandom(stream))<chance&&plantRegrowthMtb256(30,()=>Math.fround(healthRandom(stream))))return seed;}
 throw Error('No bounded deterministic event witness');
}
describe('Site3 actual-tick wild renewal256',()=>{
 it('keeps same tick inert, rejects skipped ticks and admits only the eight real scalars',()=>{
  const {w,reader}=prepare(),before=signature(w);advanceWildFlora256(w,reader);expect(signature(w)).toEqual(before);
  expect(validateWildFlora256(w,256)).toBe(true);expect(validateWildFlora256(w,255)).toBe(false);
  expect(validWildFloraState256({...w.flora,capacity:undefined},w,256)).toBe(false);expect(validWildFloraState256({...w.flora,hasCalculated:false},w,256)).toBe(false);
  w.tick+=2;const jumped=signature(w);expect(()=>advanceWildFlora256(w,reader)).toThrow('next actual local tick');expect(signature(w)).toEqual(jumped);
 });
 it('executes ten bounded Core substeps with actual cycle rollover and float sums',()=>{
  const {w,reader}=prepare();if(w.flora?.revision!==2)throw Error('Missing new state');const starting=w.flora.desired;
  // A32² map checks ceil(1024×.0001)=1 cell per Core substep, ten per local tick.
  next(w,reader);expect(w.flora.cycleIndex).toBe(10);expect(w.flora.lastTick).toBe(w.tick);expect(w.flora.desiredTmp).toBeGreaterThan(0);expect(w.flora.fertileTmp).toBe(10);expect(w.flora.desired).toBe(starting);
  for(let i=0;i<102;i++)next(w,reader);expect(w.flora.cycleIndex).toBe(6);expect(w.flora.fertile).toBe(1024);expect(w.flora.fertileTmp).toBe(6);expect(w.flora.desired).toBe(starting);
 });
 it('consumes the actual NaN Chance draw on a wholly infertile map without spawning or inventing density',()=>{
  const {w,reader}=prepare();w.tiles=w.tiles.map(()=>({terrain:'ice'}));w.flora=createWildFloraState256(w,reader);if(w.flora.revision!==2)throw Error('Missing state');
  expect(w.flora.desired).toBe(0);expect(w.flora.fertile).toBe(0);const expected={rng:w.rng};for(let i=0;i<10;i++)healthRandom(expected);
  next(w,reader);expect(w.rng).toBe(expected.rng);expect(w.resources).toEqual([]);
 });
 it('has identical continuation after persisted scalars/resources are reconstructed and private cache is cold',()=>{
  const {w,reader}=prepare();for(let i=0;i<4;i++)next(w,reader);
  const restored:World={...w,flora:JSON.parse(JSON.stringify(w.flora)),resources:structuredClone(w.resources)};
  for(let i=0;i<6;i++){next(w,reader);next(restored,reader);}expect(signature(restored)).toEqual(signature(w));
  if(restored.flora?.revision!==2)throw Error('Missing restored state');const state=restored.flora,before=structuredClone(state);rebaseWildFloraClock256(state,restored.tick,restored.tick+99);
  expect({...restored.flora,lastTick:before.lastTick}).toEqual(before);expect(()=>rebaseWildFloraClock256(state,restored.tick,restored.tick+100)).toThrow();
 });
 it('commits genuine seedlings with unique IDs, birth tick, age0 and no initial random-age offset',()=>{
  const {w,reader}=prepare();if(w.flora?.revision!==2)throw Error('Missing state');w.rng=firstAttemptSeed(w.flora.desired/w.flora.fertile);const first=w.nextId;
  for(let i=0;i<8&&!w.resources.length;i++)next(w,reader);
  expect(w.resources.length).toBeGreaterThan(0);expect(new Set(w.resources.map(r=>r.id)).size).toBe(w.resources.length);expect(w.resources[0]!.id).toBe(first);
  for(const r of w.resources){expect(r.growth).toBe(.15);expect(r.growthTick).toBe(r.plantLife!.bornAt);expect(r.plantLife!.age).toBe(0);expect(Object.hasOwn(r.plantLife!,'initialAgeCore')).toBe(false);}
  expect(w.nextId).toBe(first+w.resources.length);
 });
 it('rejects foreign resources and malformed physical masks atomically before RNG/ID/state commit',()=>{
  const {w,reader}=prepare();if(w.flora?.revision!==2)throw Error('Missing state');w.rng=firstAttemptSeed(w.flora.desired/w.flora.fertile);w.tick++;const before=signature(w);
  const foreign={...reader,capture:(world:World)=>({...reader.capture(world),existing:[{cell:0,defId:'Plant_Grass',nonStump:true}]})};
  expect(()=>advanceWildFlora256(w,foreign)).toThrow('actual resource owners');expect(signature(w)).toEqual(before);
 });
 it('detects in-place base/type edits without using mutable input arrays as cache witnesses',()=>{
  const cache=new PlantRegionCache256(),types=new Uint8Array(24*12).fill(1),base=new Float32Array(24*12).fill(1),a=cache.read(24,12,types,base);
  expect(cache.read(24,12,types,base)).toBe(a);base[0]=.5;const b=cache.read(24,12,types,base);expect(b).not.toBe(a);expect(b.regions[0]!.baseDesired).toBe(143.5);
  types[11]=0;expect(cache.read(24,12,types,base)).not.toBe(b);
 });
});

it('V421 refuses every malformed physical-mask tail before committing an actual renewal attempt',()=>{
 const {w}=prepare();if(w.flora?.revision!==2)throw Error('Missing actual unit renewal state');
 w.rng=firstAttemptSeed(w.flora.desired/w.flora.fertile);w.tick++;
 const before=signature(w),tiles=structuredClone(w.tiles),tail=w.width*w.height-1;
 for(const key of ['normalWalkable','door','fence','fullFill','coverOrEdifice','blocksPlanting'] as const){
  let captures=0;
  const reader=createWildPlantMapReader256(world=>{
   captures++;const masks=actualPlantPhysicalMasks256(world);(masks[key] as Uint8Array)[tail]=2;return masks;
  },()=>1);
  expect(()=>reader.capture(w)).toThrow('Invalid physical plant classification');
  expect(()=>advanceWildFlora256(w,reader)).toThrow('Invalid physical plant classification');expect(captures).toBe(2);
  expect(signature(w)).toEqual(before);expect(w.tiles).toEqual(tiles);
 }
});

it('V421 retains a malformed substrate tail refusal before the physical-mask refusal without changing World',()=>{
 const {w}=prepare();if(w.flora?.revision!==2)throw Error('Missing actual unit renewal state');
 w.rng=firstAttemptSeed(w.flora.desired/w.flora.fertile);w.tick++;
 const tail=w.width*w.height-1;w.tiles[tail]={terrain:'soil-natural',stone:1 as never};
 const before=signature(w),tiles=structuredClone(w.tiles);
 const reader=createWildPlantMapReader256(world=>{
  // A declared malformed unit mask at the same final cell must not hide the
  // original naturalPlantSubstrate/DTO failure that occurs first.
  const n=world.width*world.height,normal=new Uint8Array(n).fill(1);normal[tail]=2;
  return {normalWalkable:normal,door:new Uint8Array(n),fence:new Uint8Array(n),fullFill:new Uint8Array(n),coverOrEdifice:new Uint8Array(n),blocksPlanting:new Uint8Array(n),sandDepth:new Float32Array(n)};
 },()=>1);
 expect(()=>reader.capture(w)).toThrow(TypeError);expect(()=>advanceWildFlora256(w,reader)).toThrow(TypeError);
 expect(signature(w)).toEqual(before);expect(w.tiles).toEqual(tiles);
});
