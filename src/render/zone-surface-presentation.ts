import type { AreaAction } from '../sim/types';

export const ZONE_FILL_OPACITY=.2;
export const ZONE_SELECTION_COLOR=0xfff5d6;
export const ZONE_SELECTION_WIDTH=.07;
export const ZONE_TOOLS=new Set<string>(['stockpile','remove-stockpile','growing','remove-growing','home','remove-home','build-roof','remove-roof','ignore-roof']);
export function areaPreviewColor(action:AreaAction,eligible:number,skipped:number):number {
  if(!ZONE_TOOLS.has(action))return 0x8bcef0;
  return eligible===0?0xe46f58:skipped>0?0xe4bb68:0x9dd9ca;
}

/** Exact cell contour, including holes. Bits are west/east/north/south. */
export function zoneBoundaryEdges(width:number,cells:readonly number[]):Map<number,number> {
  const present=new Set(cells),out=new Map<number,number>();
  for(const i of present){
    const x=i%width;
    const mask=(x===0||!present.has(i-1)?1:0)|(x===width-1||!present.has(i+1)?2:0)
      |(!present.has(i-width)?4:0)|(!present.has(i+width)?8:0);
    if(mask)out.set(i,mask);
  }
  return out;
}
export function zoneBoundaryVertices(width:number,cells:readonly number[],y=.14):number[] {
  const vertices:number[]=[],t=ZONE_SELECTION_WIDTH;
  const rect=(x0:number,z0:number,x1:number,z1:number)=>vertices.push(x0,y,z0,x1,y,z0,x1,y,z1,x0,y,z0,x1,y,z1,x0,y,z1);
  for(const [i,mask]of zoneBoundaryEdges(width,cells)){
    const x=i%width,z=Math.floor(i/width),w=x-.5,e=x+.5,n=z-.5,s=z+.5;
    if(mask&1)rect(w,n,w+t,s);if(mask&2)rect(e-t,n,e,s);
    if(mask&4)rect(w,n,e,n+t);if(mask&8)rect(w,s-t,e,s);
  }
  return vertices;
}
