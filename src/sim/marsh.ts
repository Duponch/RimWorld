import {isWetTerrain,SHALLOW_WATER_SCHEMA_VERSION} from './shallow-water.ts';
import {bridgeSupportsBuilding} from './bridge-rules.ts';
import {footprintCells,STRUCTURE_DEFINITIONS} from './definitions.ts';
import type {Cell,Job,Tile,World} from './types.ts';
export const MARSH_SCHEMA_VERSION=246;
export const MARSH_PATH_COST_CORE=30;
export const MARSH_PERCEIVED_CORE={ordinary:180,drafted:18} as const;
export const marshAt=(world:Pick<World,'tiles'|'width'>,cell:Cell):boolean=>isWetTerrain(world.tiles[cell.z*world.width+cell.x]?.terrain);
/** All delivered edifices/emplacements need Light or better (or Diggable).
 * Marsh and shallow water have only Walkable/ShallowWater/Bridgeable/WaterproofConduitable.
 * Ordinary conduit needs Light: only the finished V247 bridge provides it; bare marsh does not. */
export const marshSupportsFootprint=(world:Pick<World,'tiles'|'width'>,cells:readonly Cell[],building?:{kind:string;material?:unknown}):boolean=>!cells.some(c=>marshAt(world,c)&&!(world.tiles[c.z*world.width+c.x]?.bridge&&building&&bridgeSupportsBuilding(building)));
export const validMarshTile=(tile:Pick<Tile,'terrain'|'floor'|'snowDepth'|'bridge'>,version:number):boolean=>!isWetTerrain(tile.terrain)||version>=(tile.terrain==='water-shallow'?SHALLOW_WATER_SCHEMA_VERSION:MARSH_SCHEMA_VERSION)&&tile.floor===undefined&&(tile.bridge===true||tile.snowDepth===undefined);
export const marshConstructionJob=(job:Pick<Job,'kind'>):boolean=>job.kind==='install'||job.kind==='lay-floor'||Object.hasOwn(STRUCTURE_DEFINITIONS,job.kind);
/** Tile patch checks are incremental in Decoder. Footprints/plant owners are
 * always checked so an unchanged marsh tile cannot acquire an invalid object. */
export function validateMarshTransport(world:World,version:number=world.schemaVersion,changedTiles?:readonly number[]):string[] {
  const bad=(s:string)=>[s];
  const check=(i:number)=>{const t=world.tiles[i];return !!t&&validMarshTile(t,version);};
  if(changedTiles?changedTiles.some(i=>!check(i)):world.tiles.some((_,i)=>!check(i)))return bad('Invalid or future marsh terrain.');
  if(world.structures.some(s=>!marshSupportsFootprint(world,footprintCells(s),s)))return bad('Building lacks support on marsh.');
  if(world.jobs.some(j=>(marshConstructionJob(j)||j.kind==='sow'&&j.flowerPotId===undefined)&&!marshSupportsFootprint(world,footprintCells(j),j.kind==='install'?{kind:j.furniture?.kind??'install',material:world.packed.find(p=>p.building.id===j.furniture?.structureId)?.building.material??world.structures.find(s=>s.id===j.furniture?.structureId)?.material}:j)))return bad('Construction or sowing lacks support on marsh.');
  if(world.resources.some(r=>r.kind!=='rock'&&marshAt(world,r)))return bad('Plant rooted in infertile marsh.');
  if((world.growingZones??[]).some(z=>z.basinId===undefined&&z.cells.some(i=>isWetTerrain(world.tiles[i]?.terrain))))return bad('Growing zone on infertile marsh.');
  return [];
}
