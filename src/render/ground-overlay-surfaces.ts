import * as THREE from 'three/webgpu';
import type {Placement} from './primitives';

/** An authored horizontal coloured surface, in world coordinates. RGB is
 * linear and already rounded like the owning mesh's instance colour. */
export interface GroundOverlayRect {
  minX:number;minZ:number;maxX:number;maxZ:number;
  red:number;green:number;blue:number;opacity:number;
}
export const EMPTY_GROUND_OVERLAYS:readonly GroundOverlayRect[]=Object.freeze([]);
/** The same ordered transparent leaves as GroundSurfaceTint's composition.
 * Do not set Group.renderOrder: its groupOrder would override child ordering. */
export const GROUND_OVERLAY_RENDER_ORDER=Object.freeze({storage:1,growing:2,home:3,roof:4,hints:4.5,hover:5,area:6,deep:7,ghost:8,selection:20});
export function setGroundOverlayRenderOrder(group:THREE.Group,key:string,order:number):void {
  for(const child of group.children)if(child.name===key&&(child as THREE.Mesh).isMesh)child.renderOrder=order;
}

const colour=new THREE.Color();
export function groundOverlayRect(minX:number,minZ:number,maxX:number,maxZ:number,
  rgb:Pick<THREE.Color,'r'|'g'|'b'>,opacity:number):GroundOverlayRect {
  return {minX:Math.fround(minX),minZ:Math.fround(minZ),maxX:Math.fround(maxX),maxZ:Math.fround(maxZ),
    red:Math.fround(rgb.r),green:Math.fround(rgb.g),blue:Math.fround(rgb.b),opacity:Math.fround(opacity)};
}

/** Box-instance top faces: the same F32 translation/scale and authored width,
 * without projecting a model's elevated sides onto neighbouring grass. */
export function groundOverlayPlacements(parts:readonly Placement[],opacity:number):GroundOverlayRect[] {
  return parts.map(p=>{
    const x=Math.fround(p.x),z=Math.fround(p.z),sx=Math.fround(p.sx??1),sz=Math.fround(p.sz??1);
    colour.setHex(p.color??0xffffff);
    return groundOverlayRect(x-sx/2,z-sz/2,x+sx/2,z+sz/2,colour,opacity);
  });
}

export interface GroundOverlayAtlas {
  bounds:{minX:number;minZ:number;maxX:number;maxZ:number};
  index:Float32Array;width:number;height:number;
  records:Float32Array;recordsWidth:number;recordsHeight:number;
}

/** Sparse exact rectangles. Each occupied logical cell has two ordered ranges:
 * before pointer preview and after it. No coverage raster or blade census. */
export function groundOverlayAtlas(width:number,height:number,before:readonly GroundOverlayRect[],after:readonly GroundOverlayRect[]):GroundOverlayAtlas {
  const buckets=new Map<number,[GroundOverlayRect[],GroundOverlayRect[]]>();
  let minX=width,minZ=height,maxX=-1,maxZ=-1;
  for(const [phase,surfaces]of [before,after].entries()){
    const opaque=new Set<string>();
    for(const surface of surfaces){
      if(surface.opacity<=0||surface.maxX<surface.minX||surface.maxZ<surface.minZ)continue;
      // Repeated white corners from overlapping selections are idempotent.
      // Translucent surfaces always retain their original order and repetitions.
      if(surface.opacity===1){const key=JSON.stringify(surface);if(opaque.has(key))continue;opaque.add(key);}
      const west=Math.max(0,Math.floor(surface.minX+.5)),east=Math.min(width-1,Math.floor(surface.maxX+.5));
      const north=Math.max(0,Math.floor(surface.minZ+.5)),south=Math.min(height-1,Math.floor(surface.maxZ+.5));
      for(let z=north;z<=south;z++)for(let x=west;x<=east;x++){
        const index=z*width+x;let lists=buckets.get(index);if(!lists){lists=[[],[]];buckets.set(index,lists);}
        lists[phase]!.push(surface);minX=Math.min(minX,x);minZ=Math.min(minZ,z);maxX=Math.max(maxX,x);maxZ=Math.max(maxZ,z);
      }
    }
  }
  if(!buckets.size)return {bounds:{minX:0,minZ:0,maxX:-1,maxZ:-1},index:new Float32Array(4),width:1,height:1,records:new Float32Array(4),recordsWidth:1,recordsHeight:1};
  const w=maxX-minX+1,h=maxZ-minZ+1,index=new Float32Array(w*h*4),values:number[]=[];
  for(const [cell,phases]of buckets){
    const offset=((Math.floor(cell/width)-minZ)*w+cell%width-minX)*4;
    for(let phase=0;phase<2;phase++){
      const list=phases[phase]!;index[offset+phase*2]=values.length/8;index[offset+phase*2+1]=list.length;
      for(const r of list)values.push(r.minX,r.minZ,r.maxX,r.maxZ,r.red,r.green,r.blue,r.opacity);
    }
  }
  // Two adjacent texels per record, even row width. Both textures remain well
  // below native size limits for the supported 250×250 map and 200 selections.
  const recordsWidth=Math.min(1024,Math.max(2,values.length/4)),recordsHeight=Math.ceil(values.length/4/recordsWidth);
  const records=new Float32Array(recordsWidth*recordsHeight*4);records.set(values);
  return {bounds:{minX,minZ,maxX,maxZ},index,width:w,height:h,records,recordsWidth,recordsHeight};
}
