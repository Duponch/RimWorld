// Frozen historical oracle: src/render/filth-presentation-pieces.ts SHA-256
// f4115c2a7fae3bfa89a67567209d17865872f3164b3c90867d73358bc58f2819
// Only imports/class name adapted. Never imported by product code.
import type {FilthRecord} from '../../src/sim/filth-rules';
import {filthDecal} from '../../src/render/filth-appearance';
import {FLOOR_SURFACE_Y,filthDecalBounds,filthSurfacePatches,surfaceHeightAtCell,type FilthSurface,type SurfacePatch} from '../../src/render/surface-height';

export interface FilthPresentationPiece {readonly decal:ReturnType<typeof filthDecal>;readonly patch:SurfacePatch}
type Capture=Pick<FilthRecord,'id'|'x'|'z'|'kind'|'thickness'>;
interface Entry {
 readonly source:Capture;readonly width:number|undefined;readonly height:number|undefined;
 readonly heights:ReadonlyMap<number,number|undefined>;readonly pieces:readonly FilthPresentationPiece[];readonly offset:number;
}
export interface FilthPresentationBlock {readonly offset:number;readonly pieces:readonly FilthPresentationPiece[];readonly changed:boolean}

/** Preserve transparent draw order. Unchanged identities borrow their exact
 * pieces; insertions/removals only rewrite shifted blocks, never re-derive
 * their decals or surface partition. Value copies retain mutable RAW support. */
export class FilthPresentationPiecesReferenceH475 {
 private entries=new Map<number,Entry>();
 private ordered:Entry[]=[];
 private blocks:readonly FilthPresentationBlock[]=[];
 private count=0;
 private same(entry:Entry,item:FilthRecord,surface:FilthSurface|undefined,heights:Map<number,number|undefined>):boolean {
  const p=entry.source;
  if(p.x!==item.x||p.z!==item.z||p.kind!==item.kind||p.thickness!==item.thickness||entry.width!==surface?.width||entry.height!==surface?.height)return false;
  if(surface)for(const [index,height]of entry.heights){
   let current:number|undefined;
   if(heights.has(index))current=heights.get(index);
   else {current=surfaceHeightAtCell(surface,index%surface.width,Math.floor(index/surface.width));heights.set(index,current);}
   if(current!==height)return false;
  }
  return true;
 }
 read(items:readonly FilthRecord[],reset=false,surface?:FilthSurface):{blocks:readonly FilthPresentationBlock[];count:number;changed:boolean} {
  const heights=new Map<number,number|undefined>();
  if(!reset&&items.length===this.ordered.length&&items.every((item,i)=>{
   const old=this.ordered[i]!;return old.source.id===item.id&&this.same(old,item,surface,heights);
  }))return {blocks:this.blocks,count:this.count,changed:false};
  const next=new Map<number,Entry>(),ordered:Entry[]=[],blocks:FilthPresentationBlock[]=[];
  let count=0,changed=reset;
  for(const item of items){
   const old=!reset?this.entries.get(item.id):undefined;
   let entry:Entry;
   if(old&&this.same(old,item,surface,heights))entry=old;
   else {
    const pieces:FilthPresentationPiece[]=[],observed=new Map<number,number|undefined>();
    for(let layer=0;layer<item.thickness;layer++){
     const decal=filthDecal(item,layer),bounds=filthDecalBounds(decal);
     if(surface){
      const minX=Math.max(0,Math.floor(bounds.minX+.5)),maxX=Math.min(surface.width-1,Math.floor(bounds.maxX+.5));
      const minZ=Math.max(0,Math.floor(bounds.minZ+.5)),maxZ=Math.min(surface.height-1,Math.floor(bounds.maxZ+.5));
      for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++){
       const index=z*surface.width+x;
       if(!heights.has(index))heights.set(index,surfaceHeightAtCell(surface,x,z));
       observed.set(index,heights.get(index));
      }
     }
     for(const patch of surface?filthSurfacePatches(surface,bounds):[{...bounds,height:FLOOR_SURFACE_Y}])pieces.push({decal,patch});
    }
    entry={source:{id:item.id,x:item.x,z:item.z,kind:item.kind,thickness:item.thickness},width:surface?.width,height:surface?.height,heights:observed,pieces,offset:count};
   }
   const dirty=entry!==old||entry.offset!==count;
   blocks.push({offset:count,pieces:entry.pieces,changed:dirty});changed=changed||dirty;
   const retained=entry.offset===count?entry:{...entry,offset:count};
   next.set(item.id,retained);ordered.push(retained);count+=entry.pieces.length;
  }
  changed=changed||count!==this.count;this.count=count;this.entries=next;this.ordered=ordered;this.blocks=blocks;
  return {blocks,count,changed};
 }
}
