import { ITEM_DEFINITIONS, type ItemId } from '../sim/items';
import type { Placement } from './primitives';
import { stonePileColor } from './stone-palette';
import { noise } from './StaticGeometry';

export const CHUNK_ITEMS = ['granite-chunk','limestone-chunk','marble-chunk','sandstone-chunk','slate-chunk','legacy-chunk'] as const;
export const chunkCargoKind=(item:ItemId):number=>5+CHUNK_ITEMS.indexOf(item as typeof CHUNK_ITEMS[number]);
/** Two resident boulders, with independently varied proportions and assembly.
 * Variation is baked into the existing instance matrices at pile adoption. */
export function chunkParts(x:number,z:number,item:ItemId):Placement[] {
  const color=ITEM_DEFINITIONS[item].color;
  const salt=77+Math.max(0,CHUNK_ITEMS.indexOf(item as typeof CHUNK_ITEMS[number]))*19;
  const n=(i:number)=>noise(x,z,salt+i),turn=n(0)*Math.PI*2;
  const h=.35+n(2)*.15,smallH=.19+n(6)*.1;
  return [{x:x-.1,z,y:h*.935,sx:.43+n(1)*.18,sy:h,sz:.35+n(3)*.2,ry:turn,color:stonePileColor(color,x,z,0),shape:'rounded-rock'},
    {x:x+.24+n(4)*.1,z:z+(n(5)-.5)*.3,y:smallH*.935,
      sx:.20+n(7)*.10,sy:smallH,sz:.18+n(8)*.12,ry:n(9)*Math.PI*2,color:stonePileColor(color,x,z,1),shape:'rounded-rock'}];
}
