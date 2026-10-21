import {shipReactorCells275} from '../sim/ship-reactor-content-275';
import type {Structure} from '../sim/types';
import type {Placement} from './primitives';

/** Original low-poly machinery, prepared in the ordinary opaque furniture
 * batch. Only a confirmed phase changes it; no per-frame mesh, light or timer. */
export function shipReactorParts275(s:Structure):Placement[] {
  if(s.kind!=='ship-reactor')return [];
  const cells=shipReactorCells275(s,s.orientation),out:Placement[]=[],ry=s.orientation*Math.PI/2;
  const x=cells.reduce((n,c)=>n+c.x,0)/cells.length,z=cells.reduce((n,c)=>n+c.z,0)/cells.length;
  const cos=Math.cos(ry),sin=Math.sin(ry),phase=s.shipReactor275?.state;
  const signal=phase==='running'?0x9bd8b9:phase==='starting'?0xe6b56e:0x7d9694;
  const box=(dx:number,y:number,dz:number,sx:number,sy:number,sz:number,color:number)=>out.push({key:s.id,targetId:s.id,x:x+dx*cos+dz*sin,y,z:z+dz*cos-dx*sin,sx,sy,sz,ry,color});
  box(0,.11,0,5.86,.22,6.86,0x505f64);
  box(0,.3,0,5.55,.16,6.54,0x8d9c9b);
  box(0,.82,0,3.25,.92,4.5,0x6a838b);
  box(0,1.38,0,3.6,.2,4.8,0xb5c3bd);
  box(0,1.95,0,2.66,.94,3.5,0x6c858e);
  box(0,2.48,0,2.94,.16,3.8,0xa8b9b6);
  box(0,2.77,0,1.86,.42,2.42,0x465e6b);
  box(0,3.02,0,2.1,.1,2.64,0xc0ccc0);
  box(0,3.085,0,1.25,.03,1.8,signal);
  for(const side of [-1,1]){
    box(side*2.25,.87,0,.72,1.02,5.42,0x73888e);
    box(side*2.25,1.43,0,.88,.1,5.64,0xa6b7ad);
    for(const dz of [-2,-1,0,1,2])box(side*2.25,1.52,dz,.65,.08,.18,0x354c56);
    box(side*1.4,1.94,0,.13,.9,3.16,0xc0cbc0);
    box(0,.8,side*2.89,3.86,.68,.55,0x6a7b85);
    for(const dx of [-1.35,0,1.35])box(dx,1.18,side*2.89,.32,.08,.57,signal);
  }
  box(0,1.04,2.38,1.12,.4,.14,0x334c58);
  box(0,1.07,2.46,.74,.13,.025,signal);
  return out;
}
