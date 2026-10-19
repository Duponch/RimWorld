import { footprintCells } from './definitions.ts';
import { isPassageDoor,isRoomDoor } from './door-rules.ts';
import type { Cell,Structure,World } from './types.ts';

export interface StructureNavigationFootprint {
  readonly structure:Structure;
  readonly cells:readonly number[];
}
/** Geometry membership only. Door, trap and other mutable facts remain on the
 * original objects and are read by each decision, never frozen into this index.
 * The owner discards this capture after a footprint or membership commit,
 * before a later decision can read the changed geometry. */
export interface StructureNavigationGeometry {
  readonly entries:readonly StructureNavigationFootprint[];
  readonly corners:ReadonlySet<number>;
  readonly roomDoors:readonly Structure[];
  at(cell:Cell):readonly Structure[];
}
const EMPTY_STRUCTURES:readonly Structure[]=Object.freeze([]);

export function captureStructureNavigation(world:World):StructureNavigationGeometry {
  const width=world.width,height=world.height,byCell=new Map<number,Structure[]>(),corners=new Set<number>(),roomDoors:Structure[]=[];
  const entries:StructureNavigationFootprint[]=[];
  for(const structure of world.structures){
    const cells=footprintCells(structure).map(cell=>cell.z*width+cell.x);
    entries.push({structure,cells});
    // Preserve source order: physical travel selects the last non-conduit
    // object on the destination, while repeat suppression sees every source.
    for(const index of cells){const list=byCell.get(index);if(list)list.push(structure);else byCell.set(index,[structure]);}
    if(isPassageDoor(structure.kind))corners.add(structure.z*width+structure.x);
    if(isRoomDoor(structure.kind))roomDoors.push(structure);
  }
  return {entries,corners,roomDoors,at:cell=>Number.isInteger(cell.x)&&Number.isInteger(cell.z)&&cell.x>=0&&cell.z>=0&&cell.x<width&&cell.z<height
    ?byCell.get(cell.z*width+cell.x)??EMPTY_STRUCTURES:EMPTY_STRUCTURES};
}

/** Engine-owned lifetime, reset at the existing structural commit boundaries.
 * Append/replacement checks are additional guards, not a general mutable-World
 * cache contract. No reader survives this decision phase or escapes to a save. */
export function structureNavigationReader(world:World):{read:()=>StructureNavigationGeometry;invalidate:()=>void} {
  let geometry:StructureNavigationGeometry|undefined,source:Structure[]|undefined,count=0;
  return {
    read(){if(!geometry||source!==world.structures||count!==world.structures.length){source=world.structures;count=source.length;geometry=captureStructureNavigation(world);}return geometry;},
    invalidate(){geometry=undefined;source=undefined;count=0;},
  };
}
