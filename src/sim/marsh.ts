import {isCaveHiveKind256} from './cave-hive-state-256.ts';
import {validCollapsedRock256,excavatedCollapsedRock256,admittedRoofTerrain256} from './collapsed-rocks-256.ts';
import {isWetTerrain} from './shallow-water.ts';
import {isRoadFloor256} from './road-ground-256.ts';
import {buildingSupportNeed256} from './bridge-rules.ts';
import {terrainAvailable256,terrainHoldsSnow256,terrainSupportsAffordance256,terrainSupportsFloor256,terrainGroundFertility256,terrainHasProspectiveRules256,naturalPlantSubstrate256,type TerrainRuntimeMetadata256} from './natural-terrain-runtime-256.ts';
import {plantSubstrateAllowed256} from './plant-substrate-256.ts';
import {footprintCells,STRUCTURE_DEFINITIONS} from './definitions.ts';
import type {Cell,Job,Tile,World} from './types.ts';
export const MARSH_SCHEMA_VERSION=246;
export const MARSH_PATH_COST_CORE=30;
export const MARSH_PERCEIVED_CORE={ordinary:180,drafted:18} as const;
export const marshAt=(world:Pick<World,'tiles'|'width'>,cell:Cell):boolean=>isWetTerrain(world.tiles[cell.z*world.width+cell.x]?.terrain);
/** Existing callers retain one support authority for structures, plans,
 * frames and installations, with exact Stuff resolved by BUILDING_SUPPORT. */
export function marshSupportsFootprint(world:Pick<World,'tiles'|'width'>&TerrainRuntimeMetadata256,cells:readonly Cell[],building?:{kind:string;material?:unknown}):boolean {
 const need=building&&buildingSupportNeed256(building);
 return cells.every(c=>{const tile=world.tiles[c.z*world.width+c.x];if(!tile)return false;if(building?.kind==='lay-floor')return terrainSupportsFloor256(tile,world);if(building&&isCaveHiveKind256(building.kind))return (world.schemaVersion??255)>=256&&terrainAvailable256(tile.terrain,world.schemaVersion??255);if(need)return terrainSupportsAffordance256(tile,need,world);return !terrainHasProspectiveRules256(tile.terrain,world)&&!isWetTerrain(tile.terrain);});
}
export function validMarshTile(tile:Pick<Tile,'terrain'|'floor'|'snowDepth'|'bridge'|'collapsedRock'>,version:number,metadata:TerrainRuntimeMetadata256={}):boolean {
 if(!validCollapsedRock256(tile,version,Number.MAX_SAFE_INTEGER,v=>admittedRoofTerrain256(v,version)))return false;
 if(tile.collapsedRock)tile=excavatedCollapsedRock256(tile as Tile);
 return terrainAvailable256(tile.terrain,version)&&(!isRoadFloor256(tile.floor)||version>=256)&&(tile.floor===undefined||terrainSupportsFloor256(tile,{...metadata,schemaVersion:version}))&&(tile.snowDepth===undefined||terrainHoldsSnow256(tile.terrain,!!tile.bridge));
}
export const marshConstructionJob=(job:Pick<Job,'kind'>):boolean=>job.kind==='install'||job.kind==='lay-floor'||Object.hasOwn(STRUCTURE_DEFINITIONS,job.kind);
/** Changed tile identities are incremental; object support remains checked
 * even when a same-tick packet leaves the grid unchanged. No new runtime scan. */
export function validateMarshTransport(world:World,version:number=world.schemaVersion,changedTiles?:readonly number[]):string[] {
 const meta={schemaVersion:version,site:world.site},check=(i:number)=>!!world.tiles[i]&&validMarshTile(world.tiles[i]!,version,meta),bad=(s:string)=>[s];
 if(changedTiles?changedTiles.some(i=>!check(i)):world.tiles.some((_,i)=>!check(i)))return bad('Invalid or future natural terrain.');
 const support={tiles:world.tiles,width:world.width,...meta};
 if(world.structures.some(s=>!marshSupportsFootprint(support,footprintCells(s),s)))return bad('Building lacks actual terrain support.');
 for(const j of world.jobs){if(version<256&&isRoadFloor256(j.floor))return bad('Future road floor work.');if(marshConstructionJob(j)&&!marshSupportsFootprint(support,footprintCells(j),j.kind==='install'?{kind:j.furniture?.kind??'install',material:world.packed.find(p=>p.building.id===j.furniture?.structureId)?.building.material??world.structures.find(s=>s.id===j.furniture?.structureId)?.material}:j))return bad('Construction lacks actual terrain support.');if(j.kind==='sow'&&j.flowerPotId===undefined&&world.growingZones?.find(z=>z.id===j.growingZoneId)?.basinId===undefined){const t=world.tiles[j.z*world.width+j.x];if(!t||terrainGroundFertility256(t)<=0)return bad('Sowing lacks fertile unlayered terrain.');}}
 for(const r of world.resources){if(r.kind==='rock')continue;const tile=world.tiles[r.z*world.width+r.x];if(!tile)return bad('Plant outside terrain.');const prospective=version>=256&&plantSubstrateAllowed256(r.species,version,naturalPlantSubstrate256(tile));if(prospective!==undefined&&prospective!==false){if(tile.bridge||tile.floor)return bad('Plant beneath a built surface.');continue;}if(prospective===false&&version>=256&&r.species!==undefined&&terrainHasProspectiveRules256(tile.terrain,meta))return bad('Plant violates its actual substrate profile.');if(isWetTerrain(tile.terrain))return bad('Plant rooted in incompatible water.');}
 if((world.growingZones??[]).some(z=>z.basinId===undefined&&z.cells.some(i=>{const tile=world.tiles[i];return !tile||(terrainHasProspectiveRules256(tile.terrain,meta)?naturalPlantSubstrate256({...tile,bridge:undefined,floor:undefined}).fertility<=0:isWetTerrain(tile.terrain));})))return bad('Growing zone on infertile terrain.');
 return [];
}
