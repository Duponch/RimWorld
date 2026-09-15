import { ITEM_DEFINITIONS, type ItemId } from '../sim/items';
import type { Placement } from './primitives';
export const BLOCK_ITEMS=['granite-blocks','limestone-blocks','marble-blocks','sandstone-blocks','slate-blocks'] as const;
export const blockCargoKind=(item:ItemId):number=>12+BLOCK_ITEMS.indexOf(item as typeof BLOCK_ITEMS[number]);
/** At most six boxes per ground pile, retained in the existing material batch. */
export function blockParts(x:number,z:number,item:ItemId,quantity:number):Placement[] {
  return Array.from({length:Math.min(6,Math.ceil(quantity/15))},(_,i)=>({x:x+(i%2? .17:-.17),z,y:.1+Math.floor(i/2)*.2,sx:.32,sy:.18,sz:.5,color:ITEM_DEFINITIONS[item].color}));
}
