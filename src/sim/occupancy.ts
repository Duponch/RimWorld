import { footprintContains } from './definitions.ts';
import type { Cell, JobKind, StructureKind, World } from './types.ts';

/** Core coexistence rules are distinct from our current planar transit rules.
 * Surface Eat admits existing items, but is not a storage-zone surface. */
export const OCCUPANCY = Object.freeze({
  'build-roof': Object.freeze({clearItems:false,items:true,zones:true,store:true}),
  'remove-roof': Object.freeze({clearItems:false,items:true,zones:true,store:true}),
  door: Object.freeze({clearItems:false,items:true,zones:true,store:true}),
  stonecutter: Object.freeze({clearItems:false,items:true,zones:false,store:false}),
  wall: Object.freeze({clearItems:true,items:false,zones:false,store:false}),
  bed: Object.freeze({clearItems:true,items:false,zones:false,store:false}),
  table: Object.freeze({clearItems:false,items:true,zones:false,store:false}),
  stool: Object.freeze({clearItems:false,items:true,zones:true,store:true}),
  campfire: Object.freeze({clearItems:true,items:false,zones:true,store:false}),
  horseshoes: Object.freeze({clearItems:false,items:true,zones:true,store:true}),
});
export const occupancyOf=(kind:JobKind)=>kind in OCCUPANCY?OCCUPANCY[kind as StructureKind]:undefined;
export const clearsGroundItems=(world:World,kind:JobKind)=>world.schemaVersion<21||occupancyOf(kind)?.clearItems!==false;
export const occupies=footprintContains;
/** Quantitative capacity and reservations are checked by ground-placement. */
export function groundOccupancyAllows(world:World,cell:Cell):boolean {
  if(!Number.isInteger(cell.x)||!Number.isInteger(cell.z)||cell.x<0||cell.z<0||cell.x>=world.width||cell.z>=world.height||['water','rock'].includes(world.tiles[cell.z*world.width+cell.x]!.terrain))return false;
  for(const s of world.structures)if((world.schemaVersion<21?s.kind==='wall':!OCCUPANCY[s.kind].items)&&occupies(s,cell))return false;
  if(world.schemaVersion<16)for(const j of world.jobs)if(j.kind==='wall'&&occupies(j,cell))return false;
  return true;
}
export function storageOccupancyAllows(world:World,cell:Cell):boolean {
  for(const s of world.structures)if(!OCCUPANCY[s.kind].store&&occupies(s,cell))return false;
  for(const j of world.jobs)if(occupancyOf(j.furniture?.kind??j.kind)?.store===false&&occupies(j,cell))return false;
  return true;
}
