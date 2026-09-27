import { ITEM_DEFINITIONS, type ItemId } from '../sim/items';
import type { Placement } from './primitives';
import { stonePileColor } from './stone-palette';
import { noise } from './StaticGeometry';

export const CHUNK_ITEMS = ['granite-chunk','limestone-chunk','marble-chunk','sandstone-chunk','slate-chunk','legacy-chunk'] as const;
export const chunkCargoKind=(item:ItemId):number=>5+CHUNK_ITEMS.indexOf(item as typeof CHUNK_ITEMS[number]);
/** One physical chunk, shown with the same faceted boulder silhouette as loose rock. */
export function chunkParts(x:number,z:number,item:ItemId):Placement[] {
  const color=ITEM_DEFINITIONS[item].color;
  const n=noise(x,z,77),turn=n*Math.PI*2;
  return [{x:x-.1,z,y:.3,sx:.46+n*.14,sy:.35+n*.15,sz:.43,ry:turn,color:stonePileColor(color,x,z,0),shape:'rounded-rock'},
    {x:x+.3,z:z+.2,y:.15,sx:.25,sy:.24,sz:.25,ry:-turn,color:stonePileColor(color,x,z,1),shape:'rounded-rock'}];
}
