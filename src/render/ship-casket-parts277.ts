import {shipCasketCells277} from '../sim/ship-casket-geometry-277';
import type {Structure} from '../sim/types';
import type {Placement} from './primitives';

export const SHIP_CASKET_MODEL_BOUNDS_277=Object.freeze({width:.94,depth:1.94,height:1.29});
/** Original opaque frame and lid, in the existing furniture batch. Only actual
 * occupancy changes presentation; there is no per-image clinical reader. */
export function shipCasketParts277(s:Structure):Placement[]{
 if(s.kind!=='ship-cryptosleep-casket')return [];
 const cells=shipCasketCells277(s,s.orientation),x=(cells[0]!.x+cells[1]!.x)/2,z=(cells[0]!.z+cells[1]!.z)/2;
 const out:Placement[]=[],ry=s.orientation*Math.PI/2,c=Math.cos(ry),n=Math.sin(ry),closed=!!s.shipCryptosleep277?.occupant;
 const box=(dx:number,y:number,dz:number,sx:number,sy:number,sz:number,color:number)=>out.push({key:s.id,targetId:s.id,x:x+dx*c+dz*n,z:z+dz*c-dx*n,y,sx,sy,sz,ry,color});
 box(0,.11,0,.94,.22,1.94,0x3e5868);
 box(0,.30,0,.84,.16,1.84,0x8fa6aa);
 box(0,.40,0,.62,.05,1.48,0x4d7481);
 for(const side of [-1,1]){
  box(side*.39,.50,0,.14,.34,1.80,0xb1c0b9);
  for(const dz of [-.65,.65])box(side*.40,.37,dz,.14,.30,.18,0x607f90);
 }
 for(const dz of [-.86,.86])box(0,.51,dz,.80,.38,.16,0x8a9fa3);
 box(closed?0:.37,closed?.72:.84,0,closed?.65:.08,closed?.10:.90,1.50,closed?0x6698a0:0xaac0b8);
 box(0,.73,-.86,.30,.06,.10,0xd3b37b);
 box(-.21,.73,-.86,.08,.06,.10,closed?0x80baaa:0xd8b97c);
 return out;
}
