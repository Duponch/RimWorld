import {isShipAddedKind276,type ShipAddedKind276} from '../sim/ship-part-content-276';
import {shipPartRect276} from '../sim/ship-part-geometry-276';
import type {Structure} from '../sim/types';
import type {Placement} from './primitives';

/** Original presentation dimensions inside the occupied rectangles. The same
 * bounds own the construction plan; they are not native physics or drawSize. */
export const SHIP_HULL_MODEL_BOUNDS_276:Readonly<Record<ShipAddedKind276,{readonly width:number;readonly depth:number;readonly height:number}>>=Object.freeze({
 'ship-beam':Object.freeze({width:1.86,depth:5.86,height:1.36}),
 'ship-engine':Object.freeze({width:2.86,depth:3.86,height:2.34}),
});

/** Authored opaque boxes in the existing furniture batch. Passive transmitters
 * have no visual startup phase, per-frame animation, lamp or flame. */
export function shipHullParts276(s:Structure):Placement[] {
 if(!isShipAddedKind276(s.kind))return [];
 const r=shipPartRect276({...s,kind:s.kind}),x=r.x+(r.width-1)/2,z=r.z+(r.depth-1)/2;
 const out:Placement[]=[],ry=s.orientation*Math.PI/2,cos=Math.cos(ry),sin=Math.sin(ry);
 const box=(dx:number,y:number,dz:number,sx:number,sy:number,sz:number,color:number)=>out.push({key:s.id,targetId:s.id,x:x+dx*cos+dz*sin,y,z:z+dz*cos-dx*sin,sx,sy,sz,ry,color});
 if(s.kind==='ship-beam'){
  box(0,.10,0,1.86,.20,5.86,0x526871);
  box(0,.24,0,1.70,.08,5.65,0xaab9b3);
  box(0,.75,0,.52,1.02,5.55,0x657d89);
  box(0,1.30,0,.64,.08,5.67,0xb0c5bc);
  for(const side of [-1,1]){
   box(side*.72,.48,0,.25,.40,5.58,0x7b939a);
   box(side*.43,.65,0,.10,.16,5.70,0xb49d6d);
  }
  for(const dz of [-2.25,-.75,.75,2.25]){
   box(0,.90,dz,1.70,.18,.20,0x98afac);
   box(0,1.35,dz,.70,.02,.10,0x3b5666);
  }
  for(const dz of [-2.7,2.7])box(0,.71,dz,1.74,1.10,.18,0x879ea4);
 }else{
  box(0,.11,0,2.86,.22,3.86,0x526871);
  box(0,.29,0,2.68,.14,3.65,0x9eb5ad);
  box(0,.89,0,2.42,1.06,2.64,0x6f8995);
  box(0,1.50,0,2.60,.16,2.82,0xb1c4b9);
  box(0,1.91,0,1.16,.66,2.60,0x516f82);
  box(0,2.29,0,1.34,.10,2.76,0xadc3ba);
  for(const side of [-1,1]){
   box(side*1.18,.95,0,.22,1.04,3.25,0x95aeb2);
   box(side*.83,1.82,0,.33,.44,2.55,0x8fa8b0);
   box(side*.84,.58,1.60,.72,.56,.43,0xb8a97e);
   box(side*.84,.60,-1.60,.72,.60,.43,0x718d98);
  }
  for(const dz of [-.90,-.30,.30,.90]){
   box(0,2.31,dz,.90,.04,.12,0x3d596d);
   box(-1.32,.71,dz,.10,.12,.28,0xb3c9c1);
   box(1.32,.71,dz,.10,.12,.28,0xb3c9c1);
  }
 }
 return out;
}
