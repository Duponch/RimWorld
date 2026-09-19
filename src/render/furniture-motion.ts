import { footprintCells } from '../sim/definitions';
import type { World } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';

/** Presentation map rebuilt per snapshot. No simulation height or extra mesh. */
export function furnitureSurfaces(world:World):ReadonlyMap<number,number> {
  const result=new Map<number,number>();
  for(const s of world.structures) {
    const y=(s.kind==='stonecutter'||s.kind==='research-bench'||s.kind==='tailor-bench')?WORLD_SCALE.stonecutterHeight:s.kind==='table'?WORLD_SCALE.tableHeight:s.kind==='bed'?WORLD_SCALE.bedSurfaceHeight:s.kind==='stool'?WORLD_SCALE.stoolHeight:0;
    if(y)for(const c of footprintCells(s))result.set(c.z*world.width+c.x,y);
  }
  return result;
}
/** Match GPU rise before entering the footprint, descent after leaving it. */
export function travelHeight(from:number,to:number,alpha:number):number {
  const t=Math.max(0,Math.min(1,from<to?alpha*3:from>to?alpha*3-2:alpha));
  return from+(to-from)*t;
}
