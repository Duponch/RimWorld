import { footprintContains } from './definitions.ts';
import type { Cell, JobKind, StructureKind, World } from './types.ts';

/** Core coexistence rules are distinct from our current planar transit rules.
 * Surface Eat admits existing items, but is not a storage-zone surface. */
export const OCCUPANCY = Object.freeze({
  'power-conduit':Object.freeze({clearItems:false,items:true,zones:true,store:true}),
  'power-switch':Object.freeze({clearItems:false,items:true,zones:false,store:false}),
  battery:Object.freeze({clearItems:true,items:false,zones:false,store:false}),
  'solar-generator':Object.freeze({clearItems:true,items:false,zones:false,store:false}),
  'fueled-stove':Object.freeze({clearItems:false,items:true,zones:false,store:false}),
  'electric-stove':Object.freeze({clearItems:false,items:true,zones:false,store:false}),
  'butcher-table':Object.freeze({clearItems:false,items:true,zones:false,store:false}),
  'butcher-spot':Object.freeze({clearItems:false,items:true,zones:false,store:false}),
  cooler:Object.freeze({clearItems:true,items:false,zones:false,store:false}),
  'research-bench':Object.freeze({clearItems:false,items:true,zones:false,store:false}),
  'tailor-bench':Object.freeze({clearItems:false,items:true,zones:false,store:false}),
  'crafting-spot':Object.freeze({clearItems:false,items:true,zones:false,store:false}),
  'build-roof': Object.freeze({clearItems:false,items:true,zones:true,store:true}),
  'remove-roof': Object.freeze({clearItems:false,items:true,zones:true,store:true}),
  'wood-generator':Object.freeze({clearItems:true,items:false,zones:false,store:false}),
  'standing-lamp':Object.freeze({clearItems:false,items:true,zones:true,store:true}),
  'passive-cooler': Object.freeze({clearItems:true,items:false,zones:true,store:false}),
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
  for(const s of world.structures)if(occupies(s,cell)&&(world.schemaVersion<21?s.kind==='wall':!OCCUPANCY[s.kind].items))return false;
  if(world.schemaVersion<16)for(const j of world.jobs)if(j.kind==='wall'&&occupies(j,cell))return false;
  return true;
}
export function storageOccupancyAllows(world:World,cell:Cell):boolean {
  for(const s of world.structures)if(occupies(s,cell)&&!OCCUPANCY[s.kind].store)return false;
  for(const j of world.jobs)if(occupies(j,cell)&&occupancyOf(j.furniture?.kind??j.kind)?.store===false)return false;
  return true;
}
