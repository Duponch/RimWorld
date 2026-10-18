import {expect,test} from 'vitest';
import {readNaturalPlantSubstrate256,naturalPlantSubstrate256,terrainGroundFertility256} from '../src/sim/natural-terrain-runtime-256.ts';
import {NATURAL_TERRAIN_BINDINGS_256 as BINDINGS,NATURAL_TERRAIN_DEFINITIONS_256 as DEFS,isNaturalTerrain256} from '../src/sim/local-terrain-definitions-256.ts';
import {STONE_KINDS} from '../src/sim/geology.ts';
import {WILD_PLANT_GENERATION_FACTS_256 as FACTS} from '../src/sim/wild-plant-generation-data-256.ts';
import {plantSubstrateAllowed256} from '../src/sim/plant-substrate-256.ts';
import {validateMarshTransport,validMarshTile,marshSupportsFootprint,marshConstructionJob} from '../src/sim/marsh.ts';
import {isRoadFloor256} from '../src/sim/road-ground-256.ts';
import {terrainHasProspectiveRules256} from '../src/sim/natural-terrain-runtime-256.ts';
import {isWetTerrain} from '../src/sim/shallow-water.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {bridgeWorkshopV387} from './scenarios/bridge-v387.ts';
import type {Tile,World} from '../src/sim/types.ts';
// Independent complete BASE copies follow; do not implement the oracle through
// either new reader or the public helper under test. BASE hashes are in MANIFEST.
function oracleGroundFertility256(tile:Pick<Tile,'terrain'|'bridge'|'floor'>):number {if(tile.floor||tile.bridge)return 0;return isNaturalTerrain256(tile.terrain)?DEFS[tile.terrain].fertility:tile.terrain==='grass'?1:tile.terrain==='soil'?.7:0;}
const coreIds=new Map<string,string>(Object.entries(BINDINGS).map(([core,id])=>[id,core]));
const soilTags=new Set(['soil-natural','rich-soil','gravel','mossy-soil','marshy-soil','riverbank']);
/** Real Core tags/def identity for the existing narrow flora profile guard. */
function oracleNaturalPlantSubstrate256(tile:Pick<Tile,'terrain'|'bridge'|'floor'|'stone'>,scratch?:{fertility:number;terrainDefId:string;tags:string[]}):{fertility:number;terrainDefId:string;tags:readonly string[]} {
 const t=tile.terrain,tags=scratch?.tags??[];tags.length=0;
 if(soilTags.has(t))tags.push('Soil');else if(t==='mud')tags.push('Mud');else if(t==='marsh')tags.push('Water','WaterMarshy');else if(t==='ice')tags.push('Ice');else if(t==='river-shallow')tags.push('Water','River','WaterFreshShallow','WaterFreshShallowMoving');else if(t==='river-chest-deep')tags.push('Water','River');else if(t==='water-shallow')tags.push('Water','WaterFreshShallow','WaterFreshShallowStill');else if(t==='ocean-shallow'||t==='ocean-deep')tags.push('Water','Ocean');else if(t==='water-deep')tags.push('Water');
 const stone=tile.stone?tile.stone[0]!.toUpperCase()+tile.stone.slice(1)+'_Rough':undefined;
 const fertility=oracleGroundFertility256(tile),terrainDefId=t==='packed-dirt'?'PackedDirt':coreIds.get(t)??(t==='rough-stone'&&stone?stone:t);
 if(tile.bridge||tile.floor)tags.length=0;else if(t==='packed-dirt'){tags.length=0;tags.push('Road');}
 // Only a synchronous caller may reuse this DTO; public calls still own fresh values.
 if(scratch){scratch.fertility=fertility;scratch.terrainDefId=terrainDefId;return scratch;}
 return {fertility,terrainDefId,tags};
}

function oracleValidateMarshTransport(world:World,version:number=world.schemaVersion,changedTiles?:readonly number[]):string[] {
 const meta={schemaVersion:version,site:world.site},check=(i:number)=>!!world.tiles[i]&&validMarshTile(world.tiles[i]!,version,meta),bad=(s:string)=>[s];
 if(changedTiles?changedTiles.some(i=>!check(i)):world.tiles.some((_,i)=>!check(i)))return bad('Invalid or future natural terrain.');
 const support={tiles:world.tiles,width:world.width,...meta};
 if(world.structures.some(s=>!marshSupportsFootprint(support,footprintCells(s),s)))return bad('Building lacks actual terrain support.');
 for(const j of world.jobs){if(version<256&&isRoadFloor256(j.floor))return bad('Future road floor work.');if(marshConstructionJob(j)&&!marshSupportsFootprint(support,footprintCells(j),j.kind==='install'?{kind:j.furniture?.kind??'install',material:world.packed.find(p=>p.building.id===j.furniture?.structureId)?.building.material??world.structures.find(s=>s.id===j.furniture?.structureId)?.material}:j))return bad('Construction lacks actual terrain support.');if(j.kind==='sow'&&j.flowerPotId===undefined&&world.growingZones?.find(z=>z.id===j.growingZoneId)?.basinId===undefined){const t=world.tiles[j.z*world.width+j.x];if(!t||terrainGroundFertility256(t)<=0)return bad('Sowing lacks fertile unlayered terrain.');}}
 const substrate={fertility:0,terrainDefId:'',tags:[] as string[]};
 for(const r of world.resources){if(r.kind==='rock')continue;const tile=world.tiles[r.z*world.width+r.x];if(!tile)return bad('Plant outside terrain.');const prospective=version>=256&&plantSubstrateAllowed256(r.species,version,oracleNaturalPlantSubstrate256(tile,substrate));if(prospective!==undefined&&prospective!==false){if(tile.bridge||tile.floor)return bad('Plant beneath a built surface.');continue;}if(prospective===false&&version>=256&&r.species!==undefined&&terrainHasProspectiveRules256(tile.terrain,meta))return bad('Plant violates its actual substrate profile.');if(isWetTerrain(tile.terrain))return bad('Plant rooted in incompatible water.');}
 if((world.growingZones??[]).some(z=>z.basinId===undefined&&z.cells.some(i=>{const tile=world.tiles[i];return !tile||(terrainHasProspectiveRules256(tile.terrain,meta)?oracleNaturalPlantSubstrate256({...tile,bridge:undefined,floor:undefined},substrate).fertility<=0:isWetTerrain(tile.terrain));})))return bad('Growing zone on infertile terrain.');
 return [];
}


const terrains=[...Object.values(BINDINGS),'rough-stone','packed-dirt','grass','soil','water','rock','unknown-terrain','Soil','__proto__'] as Tile['terrain'][];
const floors=[undefined,'wood-planks','ancient-tile','broken-asphalt'] as const;
const species=[...Object.values(FACTS).map(d=>d.species),undefined,'unknown-species'];
function* tiles(){for(const terrain of terrains)for(const stone of [undefined,...STONE_KINDS,'other-stone'] as Tile['stone'][])for(const bridge of [undefined,true] as const)for(const floor of floors)yield {terrain,stone,bridge,floor};}
test('readonly definition DTOs equal the independent full BASE for terrains, stones, surfaces and every profile/schema',()=>{
 for(const tile of tiles()){
  const before=structuredClone(tile),expected=oracleNaturalPlantSubstrate256(tile),actual=readNaturalPlantSubstrate256(tile);
  expect(actual).toEqual(expected);expect(tile).toEqual(before);
  for(const version of [255,256,263])for(const s of species){
   const a=plantSubstrateAllowed256(s,version,actual),b=plantSubstrateAllowed256(s,version,expected);
   if(a!==b)throw Error(`Substrate mismatch ${JSON.stringify({tile,version,s,a,b})}`);
  }
 }
});
test('readonly definition reuse never exposes public fresh/scratch values and unknown fallbacks stay fresh',()=>{
 const tile={terrain:'river-shallow'} as const,a=readNaturalPlantSubstrate256(tile),b=readNaturalPlantSubstrate256({...tile});
 expect(a).toBe(b);expect(Object.isFrozen(a)).toBe(true);expect(Object.isFrozen(a.tags)).toBe(true);
 const publicA=naturalPlantSubstrate256(tile),publicB=naturalPlantSubstrate256(tile),scratch={fertility:-1,terrainDefId:'old',tags:['old']};
 expect(publicA).not.toBe(publicB);expect(publicA.tags).not.toBe(publicB.tags);expect(publicA.tags).not.toBe(a.tags);
 naturalPlantSubstrate256(tile,scratch);expect(scratch).toEqual(a);expect(scratch.tags).not.toBe(a.tags);
 (publicA.tags as string[]).push('private');scratch.tags.push('private');expect(a).toEqual(oracleNaturalPlantSubstrate256(tile));
 for(const t of [{terrain:'unknown-terrain'},{terrain:'rough-stone',stone:'other-stone'}] as unknown as Tile[]){
  const x=readNaturalPlantSubstrate256(t),y=readNaturalPlantSubstrate256(t);expect(x).toEqual(oracleNaturalPlantSubstrate256(t));expect(x).not.toBe(y);expect(x.tags).not.toBe(y.tags);
 }
});
test('readonly reader retains complete BASE tile getter traces and malformed stone failure before floor/bridge',()=>{
 for(const stone of [undefined,...STONE_KINDS,'other-stone',123,[],{}])for(const terrain of ['grass','rough-stone','soil-natural','unknown-terrain']){
  const run=(read:(tile:Tile)=>unknown)=>{const reads:string[]=[];const tile=Object.defineProperties({},Object.fromEntries(['terrain','stone','floor','bridge'].map(key=>[key,{enumerable:true,get(){reads.push(key);return key==='terrain'?terrain:key==='stone'?stone:undefined;}}]))) as Tile;try{return {reads,value:read(tile),error:undefined};}catch(error){return {reads,value:undefined,error:(error as Error).constructor};}};
  const expected=run(oracleNaturalPlantSubstrate256),actual=run(readNaturalPlantSubstrate256);expect(actual).toEqual(expected);
  if(typeof stone==='number'||Array.isArray(stone)||stone&&typeof stone==='object')expect(actual.reads).toEqual(['terrain','stone','stone']);
 }
});
test('Marsh preserves the independent complete BASE refusal order and historical schema behavior',()=>{
 const {world:w}=bridgeWorkshopV387(16);w.structures=[];w.jobs=[];w.growingZones=[];w.tiles=w.tiles.map(()=>({terrain:'soil-natural'}));
 const resource={id:w.nextId++,kind:'tree' as const,species:'cypress' as const,x:0,z:0,amount:1};
 for(const tile of [...tiles()].filter(tile=>tile.stone==='granite'))for(const version of [255,256,263]){
  w.tiles[0]=tile;w.resources=[resource];const before=structuredClone(w),a=validateMarshTransport(w,version,[]),b=oracleValidateMarshTransport(w,version,[]);
  if(JSON.stringify(a)!==JSON.stringify(b))throw Error(`Marsh mismatch ${JSON.stringify({tile,version,a,b})}`);
  expect(w).toEqual(before);
 }
 for(const stone of [123,[],{}]){
  w.tiles[0]={terrain:'grass',stone:stone as never};w.resources=[{...resource,species:undefined}];
  expect(()=>oracleValidateMarshTransport(w,263,[])).toThrow(TypeError);expect(()=>validateMarshTransport(w,263,[])).toThrow(TypeError);
  w.structures=[{id:w.nextId++,kind:'wall',material:'wood',x:0,z:0,orientation:0,footprint:'standard'}];w.tiles[0]!.terrain='mud';
  expect(validateMarshTransport(w,263,[])).toEqual(oracleValidateMarshTransport(w,263,[]));expect(validateMarshTransport(w,263,[])).toEqual(['Building lacks actual terrain support.']);w.structures=[];
 }
});
