import { ITEM_DEFINITIONS, type ItemId } from '../sim/items';
import type { Placement } from './primitives';
import { stonePileColor } from './stone-palette';

export const CHUNK_ITEMS = ['granite-chunk','limestone-chunk','marble-chunk','sandstone-chunk','slate-chunk','legacy-chunk'] as const;
export const chunkCargoKind=(item:ItemId):number=>5+CHUNK_ITEMS.indexOf(item as typeof CHUNK_ITEMS[number]);
/** Two intersecting low poly volumes, in the existing retained instance batch. */
export function chunkParts(x:number,z:number,item:ItemId):Placement[] {
  const color=ITEM_DEFINITIONS[item].color;
  return [{x,z,y:.24,sx:.7,sy:.48,sz:.57,ry:x*.7+z*.3,color:stonePileColor(color,x,z,0)},
    {x:x+.22,z:z-.13,y:.12,sx:.3,sy:.24,sz:.35,ry:z,color:stonePileColor(color,x,z,1)}];
}
