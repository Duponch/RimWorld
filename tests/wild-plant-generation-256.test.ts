import {describe,it,expect} from 'vitest';
import {generateInitialWildPlants256,validatePlantMap256,type InitialWildPlantsInput256} from '../src/sim/wild-plant-generation-256.ts';
import {WILD_PLANT_GENERATION_FACTS_256} from '../src/sim/wild-plant-generation-data-256.ts';
import {createPlantGenerationRegions256,plantRegionsNear256,touchablePlantRegions256} from '../src/sim/wild-plant-regions-256.ts';
import {plantCellOrder256,chooseInitialPlant256} from '../src/sim/wild-plant-generation-math-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {LOCAL_BIOME_RULES_256} from '../src/sim/local-biome-rules-v256.ts';
import {effectivePlantAgeCore256,attachInitialPlantAge256,validInitialPlantAge256} from '../src/sim/initial-plant-age-256.ts';
import {createPlantLife} from '../src/sim/plant-life.ts';
import {resumeTreeLife} from '../src/sim/tree-transfer-atomic.ts';
import type {Resource} from '../src/sim/types.ts';
const input=(changes:Partial<InitialWildPlantsInput256>={}):InitialWildPlantsInput256=>{
 const n=24*24;
 return {schemaVersion:256,width:24,height:24,stepSeed:917,worldSeed:452,tileHash:71,rules:LOCAL_BIOME_RULES_256['temperate-forest'],densityFactor:1,tileMinTemperature:-10,tileMaxTemperature:35,
  fertility:new Float32Array(n).fill(1),naturalRoof:new Uint8Array(n),water:new Uint8Array(n),baseWater:new Uint8Array(n),terrainDefIds:Array(n).fill('Soil'),terrainTags:Array.from({length:n},()=>[]),regionTypes:new Uint8Array(n).fill(1),walkableNoDoor:new Uint8Array(n).fill(1),occupied:new Uint8Array(n),blocksPlanting:new Uint8Array(n),snowDepth:new Float32Array(n),sandDepth:new Float32Array(n),existing:[],hasDefinition:()=>true,...changes};
};
function run(value:InitialWildPlantsInput256){const iterator=generateInitialWildPlants256(value);let r=iterator.next();while(!r.done)r=iterator.next();return r.value;}
describe('initial real-map wild plants256',()=>{
 it('uses whole12x12 regions, inclusive rectangle boundary and real disconnected roots',()=>{
  const topology=createPlantGenerationRegions256(24,12,new Uint8Array(288).fill(1),new Float32Array(288).fill(1));
  expect(topology.regions.map(r=>r.cells.length)).toEqual([144,144]);
  expect(touchablePlantRegions256(topology,11,new Uint8Array(288).fill(1))).toEqual([0,1]);
  expect(plantRegionsNear256(topology,0,12).map(r=>r.id)).toEqual([0,1]);
  const types=new Uint8Array(288).fill(1);for(let z=0;z<12;z++)types[z*24+11]=0;
  const cut=createPlantGenerationRegions256(24,12,types,new Float32Array(288).fill(1));expect(plantRegionsNear256(cut,0,100)).toHaveLength(1);
 });
 it('separates cell shuffle from the step stream and preserves the NaN first-plant draws',()=>{
  const stream=new WorldGenerationRandom(91),before=stream.state;
  const cells=plantCellOrder256(576,452,71);expect(new Set(cells.cells).size).toBe(576);expect(cells.state.counter).toBe(575);expect(stream.state).toEqual(before);
  expect(chooseInitialPlant256([NaN,NaN,NaN],stream)).toBe(0);expect(stream.state.counter).toBe(3);
  expect(chooseInitialPlant256([2],stream)).toBe(0);expect(stream.state.counter).toBe(3);
 });
 it('computes fertility squared and the natural roof half without using sunlight to reject spawn',()=>{
  const none=new Uint8Array(576).fill(1),value=input({occupied:none,fertility:new Float32Array(576).fill(.5),naturalRoof:new Uint8Array(576).fill(1)});
  const result=run(value);expect(result.plants).toEqual([]);expect(result.desiredPlants).toBeCloseTo(576*.5*.5*.5*value.rules.scalars.plantDensity,3);expect(result.stepState.counter).toBe(576);
 });
 it('retains all required species contracts rather than renormalizing a missing definition',()=>{
  expect(()=>run(input({hasDefinition:def=>def!=='Glowstool'}))).toThrow('Missing concrete initial plant Glowstool');
  expect(()=>run(input({hasDefinition:def=>def!=='Plant_Grass'}))).toThrow('Missing concrete initial plant Plant_Grass');
 });
 it('uses world-tile climate eligibility and actual blockers without modifying its grids',()=>{
  const value=input({tileMinTemperature:80,tileMaxTemperature:90}),copy=Array.from(value.fertility);
  expect(run(value).plants).toEqual([]);expect(Array.from(value.fertility)).toEqual(copy);
  expect(run(input({blocksPlanting:new Uint8Array(576).fill(1)})).plants).toEqual([]);
 });
 it('can populate real natural-roof cells with cave IDs and real bounded initial age',()=>{
  const result=run(input({naturalRoof:new Uint8Array(576).fill(1)}));expect(result.plants.length).toBeGreaterThan(0);
  expect(result.plants.every(p=>['Glowstool','Agarilux','Bryolux'].includes(p.defId)&&p.growth>=.15&&p.growth<=1&&Number.isInteger(p.initialAgeCore)&&p.initialAgeCore>=0)).toBe(true);
 });
 it('rejects old generation and preserves production age including remainder through minification',()=>{
  expect(()=>run(input({schemaVersion:255}))).toThrow();
  const tree={id:44,x:2,z:2,kind:'tree',species:'pine',amount:27,growth:.7,growthTick:100} as Resource;
  tree.plantLife=createPlantLife({tick:100},tree);attachInitialPlantAge256(tree,256,12347,100);
  const initial=effectivePlantAgeCore256(tree.plantLife);resumeTreeLife(tree,100,200);
  expect(tree.plantLife.initialAgeCore).toBe(12347);expect(effectivePlantAgeCore256(tree.plantLife)).toBe(initial);expect(validInitialPlantAge256(tree,256)).toBe(true);expect(validInitialPlantAge256(tree,255)).toBe(false);
  const malformed={...tree,plantLife:{...tree.plantLife,initialAgeCore:undefined}};expect(validInitialPlantAge256(malformed,255)).toBe(false);expect(validInitialPlantAge256(malformed,256)).toBe(false);
 });
});

it('V421 rejects malformed numeric, strict-bit and tag tails before definitions or generation, without changing input',()=>{
 type NumericGrid='fertility'|'snowDepth'|'sandDepth'|'naturalRoof'|'water'|'baseWater'|'walkableNoDoor'|'occupied'|'blocksPlanting';
 const cases:readonly (readonly [NumericGrid,unknown])[]=[['fertility',NaN],['snowDepth',-1],['sandDepth',Infinity],
  ['naturalRoof',2],['water',false],['baseWater',undefined],['walkableNoDoor',true],['occupied','0'],['blocksPlanting',null]];
 for(const [field,bad] of cases){
  const ordinary=input(),grid:unknown[]=Array.from(ordinary[field]);grid[grid.length-1]=bad;let definitions=0;
  const value=input({[field]:grid,hasDefinition:()=>{definitions++;return true;}} as unknown as Partial<InitialWildPlantsInput256>);
  const {hasDefinition,...data}=value,before=structuredClone(data);
  expect(()=>validatePlantMap256(value)).toThrow('Invalid initial plant cell');
  expect(()=>run(value)).toThrow('Invalid initial plant cell');
  expect(definitions).toBe(0);expect(data).toEqual(before);
 }
 for(const bad of [undefined,'Soil',['Soil',7],['',false]]){
  const tags:unknown[]=Array.from({length:576},()=>[]);tags[575]=bad;let definitions=0;
  const value=input({terrainTags:tags as InitialWildPlantsInput256['terrainTags'],hasDefinition:()=>{definitions++;return true;}});
  const {hasDefinition,...data}=value,before=structuredClone(data);
  expect(()=>run(value)).toThrow('Invalid initial plant cell');expect(definitions).toBe(0);expect(data).toEqual(before);
 }
});

it('V421 preserves eager tail read groups, tag rereads, empty strings and sparse tag semantics',()=>{
 for(const refusal of ['number','bit','none'] as const){
  const ordinary=input(),tail=575,reads:string[]=[];
  const grid=(name:string,values:ArrayLike<number>,last:number)=>{
   const copy=Array.from(values);Object.defineProperty(copy,tail,{enumerable:true,configurable:true,get(){reads.push(name);return last;}});return copy;
  };
  const ids=[...ordinary.terrainDefIds];Object.defineProperty(ids,tail,{enumerable:true,get(){reads.push('def');return 'Soil';}});
  const tags=[...ordinary.terrainTags];Object.defineProperty(tags,tail,{enumerable:true,get(){reads.push('tags');return [''];}});
  const value=input({fertility:grid('fertility',ordinary.fertility,refusal==='number'?NaN:1),snowDepth:grid('snow',ordinary.snowDepth,0),sandDepth:grid('sand',ordinary.sandDepth,0),
   naturalRoof:grid('roof',ordinary.naturalRoof,refusal==='bit'?2:0),water:grid('water',ordinary.water,0),baseWater:grid('baseWater',ordinary.baseWater,0),
   walkableNoDoor:grid('walkable',ordinary.walkableNoDoor,1),occupied:grid('occupied',ordinary.occupied,0),blocksPlanting:grid('blocks',ordinary.blocksPlanting,0),terrainDefIds:ids,terrainTags:tags});
  if(refusal==='none')expect(validatePlantMap256(value)).toEqual(Object.keys(WILD_PLANT_GENERATION_FACTS_256));
  else expect(()=>validatePlantMap256(value)).toThrow('Invalid initial plant cell');
  const expected=['fertility','snow','sand'];
  if(refusal!=='number')expected.push('roof','water','baseWater','walkable','occupied','blocks');
  if(refusal==='none')expected.push('def','tags','tags');
  expect(reads).toEqual(expected);
 }
 // Array.every has always skipped absent tag slots. Keep its literal public
 // semantics rather than introducing a stricter tag census for this change.
 const tags=Array.from({length:576},()=>new Array<string>(2)),value=input({terrainTags:tags});
 expect(run(value)).toEqual(run(input()));expect(tags.every(row=>row.length===2&&!Object.hasOwn(row,0)&&!Object.hasOwn(row,1))).toBe(true);
});
