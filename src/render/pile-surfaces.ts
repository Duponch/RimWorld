import { footprintCells } from '../sim/definitions';
import type { World } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';

export interface PileSurface { x:number;y:number;z:number;scale:number }
/** Presentation only. Built per snapshot, never per frame/pile; no extra mesh. */
export function pileSurfaces(world:World):ReadonlyMap<number,PileSurface> {
  const surfaces=new Map<number,PileSurface>();
  for(const s of world.structures) {
    const surface=s.kind==='table'?{x:0,y:WORLD_SCALE.tableHeight,z:0,scale:.8}
      :s.kind==='stool'?{x:0,y:WORLD_SCALE.stoolHeight,z:0,scale:.5}
      :s.kind==='horseshoes'?{x:-.18,y:0,z:.15,scale:.6}:undefined;
    if(surface)for(const c of footprintCells(s))surfaces.set(c.z*world.width+c.x,surface);
  }
  return surfaces;
}
