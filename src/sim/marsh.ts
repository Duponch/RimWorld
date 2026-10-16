import {footprintCells,STRUCTURE_DEFINITIONS} from './definitions.ts';
import type {Cell,Job,Tile,World} from './types.ts';
export const MARSH_SCHEMA_VERSION=246;
export const MARSH_PATH_COST_CORE=30;
export const MARSH_PERCEIVED_CORE={ordinary:180,drafted:18} as const;
export const marshAt=(world:Pick<World,'tiles'|'width'>,cell:Cell):boolean=>world.tiles[cell.z*world.width+cell.x]?.terrain==='marsh';
/** All delivered edifices/emplacements need Light or better (or Diggable).
 * Marsh has only Walkable/ShallowWater/Bridgeable/WaterproofConduitable.
 * Ordinary conduit is Light; no waterproof conduit or bridge is added here. */
export const marshSupportsFootprint=(world:Pick<World,'tiles'|'width'>,cells:readonly Cell[]):boolean=>!cells.some(c=>marshAt(world,c));
export const validMarshTile=(tile:Pick<Tile,'terrain'|'floor'|'snowDepth'>,version:number):boolean=>tile.terrain!=='marsh'||version>=MARSH_SCHEMA_VERSION&&tile.floor===undefined&&tile.snowDepth===undefined;
export const marshConstructionJob=(job:Pick<Job,'kind'>):boolean=>job.kind==='install'||job.kind==='lay-floor'||Object.hasOwn(STRUCTURE_DEFINITIONS,job.kind);
/** Tile patch checks are incremental in Decoder. Footprints/plant owners are
 * always checked so an unchanged marsh tile cannot acquire an invalid object. */
export function validateMarshTransport(world:World,version:number=world.schemaVersion,changedTiles?:readonly number[]):string[] {
  const bad=(s:string)=>[s];
  const check=(i:number)=>{const t=world.tiles[i];return !!t&&validMarshTile(t,version);};
  if(changedTiles?changedTiles.some(i=>!check(i)):world.tiles.some((_,i)=>!check(i)))return bad('Invalid or future marsh terrain.');
  if(world.structures.some(s=>!marshSupportsFootprint(world,footprintCells(s))))return bad('Building lacks support on marsh.');
  if(world.jobs.some(j=>(marshConstructionJob(j)||j.kind==='sow')&&!marshSupportsFootprint(world,footprintCells(j))))return bad('Construction or sowing lacks support on marsh.');
  if(world.resources.some(r=>r.kind!=='rock'&&marshAt(world,r)))return bad('Plant rooted in infertile marsh.');
  if((world.growingZones??[]).some(z=>z.basinId===undefined&&z.cells.some(i=>world.tiles[i]?.terrain==='marsh')))return bad('Growing zone on infertile marsh.');
  return [];
}
