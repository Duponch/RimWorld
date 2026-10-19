import { isFoodWorkstation } from '../sim/food-workstations';
import { footprintCells } from '../sim/definitions';
import type { World } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';
import {isShelfKind} from '../sim/shelf-storage';
import {SHELF_ITEM_SCALE,SHELF_LEVELS} from './shelf-presentation';

export interface PileSurface { x:number;y:number;z:number;scale:number;scaleHeight?:boolean;shelfId?:number;level?:number }
type SurfaceReads={cells?:ReadonlyMap<number,PileSurface>;identities?:ReadonlyMap<number,PileSurface>};
let application:WeakMap<World,SurfaceReads>|undefined;
/** One synchronous scene application owns these read-only derivations. Nothing
 * survives the boundary: external mutable Worlds still get fresh reads. Old and
 * current cargo snapshots have separate entries; nested renders restore scope. */
export function withPileSurfaceReads<T>(read:()=>T):T {
  const previous=application;application=new WeakMap();
  try{return read();}finally{application=previous;}
}
function entry(world:World):SurfaceReads|undefined {
  if(!application)return;
  let value=application.get(world);if(!value){value={};application.set(world,value);}return value;
}
/** Presentation only. Built per snapshot, never per frame/pile; no extra mesh. */
export function pileSurfaces(world:World):ReadonlyMap<number,PileSurface> {
  const cached=entry(world);if(cached?.cells)return cached.cells;
  const surfaces=new Map<number,PileSurface>();
  for(const s of world.structures) {
    if(s.kind==='electric-crematorium'){
      for(const cell of footprintCells(s))surfaces.set(cell.z*world.width+cell.x,{x:0,y:1.405,z:0,scale:.65});
      continue;
    }
    if(s.kind==='electric-smelter'){
      const angle=s.orientation*Math.PI/2,c=Math.cos(angle),n=Math.sin(angle);
      for(const cell of footprintCells(s)){
        const along=(cell.x-s.x)*c-(cell.z-s.z)*n;
        surfaces.set(cell.z*world.width+cell.x,Math.abs(along)<.5
          ?{x:.64*c,y:.87,z:-.64*n,scale:.65}
          :{x:0,y:along<0?1.33:.87,z:0,scale:.65});
      }
      continue;
    }
    const surface=(isFoodWorkstation(s.kind)||s.kind==='machining-table'||s.kind==='hi-tech-research-bench'||s.kind==='fabrication-bench'||s.kind==='multi-analyzer'||s.kind==='stonecutter'||s.kind==='drug-lab'||s.kind==='art-bench'||s.kind==='research-bench'||s.kind==='tailor-bench')?{x:0,y:WORLD_SCALE.stonecutterHeight,z:0,scale:.65}:s.kind==='table'?{x:0,y:WORLD_SCALE.tableHeight,z:0,scale:.8}
      :s.kind==='stool'?{x:0,y:WORLD_SCALE.stoolHeight,z:0,scale:.5}
      :s.kind==='hopper'?{x:0,y:.14,z:0,scale:.72}:s.kind==='horseshoes'?{x:-.18,y:0,z:.15,scale:.6}:undefined;
    if(surface)for(const c of footprintCells(s))surfaces.set(c.z*world.width+c.x,surface);
  }
  if(cached)cached.cells=surfaces;return surfaces;
}

/** Keyed by actual pile identity, so three stacks on one shelf cell never
 * collapse into one presentation bundle. No world state is changed. */
export function pileIdentitySurfaces(world:World):ReadonlyMap<number,PileSurface>{
  const cached=entry(world);if(cached?.identities)return cached.identities;
  const result=new Map<number,PileSurface>(),cells=new Map<number,{id:number;orientation:number}>(),byCell=new Map<number,number[]>();
  for(const s of world.structures)if(isShelfKind(s.kind))for(const cell of footprintCells(s))cells.set(cell.z*world.width+cell.x,s);
  if(!cells.size){if(cached)cached.identities=result;return result;}
  for(const pile of world.piles)if(pile.owner.type==='ground'){
    const key=pile.owner.z*world.width+pile.owner.x;
    if(cells.has(key)){const ids=byCell.get(key)??[];ids.push(pile.id);byCell.set(key,ids);}
  }
  for(const [cell,ids] of byCell){
    const shelf=cells.get(cell)!,angle=shelf.orientation*Math.PI/2,c=Math.cos(angle),s=Math.sin(angle);
    ids.sort((a,b)=>a-b);
    for(let level=0;level<ids.length;level++){
      const dx=(level-1)*.13,dz=.16-level*.12;
      result.set(ids[level]!,{x:dx*c+dz*s,y:SHELF_LEVELS[Math.min(level,2)]!,z:dz*c-dx*s,scale:SHELF_ITEM_SCALE,scaleHeight:true,shelfId:shelf.id,level});
    }
  }
  if(cached)cached.identities=result;return result;
}
