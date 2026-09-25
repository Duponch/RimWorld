import { isFoodWorkstation } from '../sim/food-workstations';
import { footprintCells } from '../sim/definitions';
import type { World } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';

export interface PileSurface { x:number;y:number;z:number;scale:number }
/** Presentation only. Built per snapshot, never per frame/pile; no extra mesh. */
export function pileSurfaces(world:World):ReadonlyMap<number,PileSurface> {
  const surfaces=new Map<number,PileSurface>();
  for(const s of world.structures) {
    const surface=(isFoodWorkstation(s.kind)||s.kind==='machining-table'||s.kind==='stonecutter'||s.kind==='research-bench'||s.kind==='tailor-bench')?{x:0,y:WORLD_SCALE.stonecutterHeight,z:0,scale:.65}:s.kind==='table'?{x:0,y:WORLD_SCALE.tableHeight,z:0,scale:.8}
      :s.kind==='stool'?{x:0,y:WORLD_SCALE.stoolHeight,z:0,scale:.5}
      :s.kind==='horseshoes'?{x:-.18,y:0,z:.15,scale:.6}:undefined;
    if(surface)for(const c of footprintCells(s))surfaces.set(c.z*world.width+c.x,surface);
  }
  return surfaces;
}
