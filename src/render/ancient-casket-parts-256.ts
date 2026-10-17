import {ancientCasketCells256} from '../sim/ancient-casket-physical-256';
import type {World} from '../sim/types';
import type {Placement} from './primitives';
/** Original fixed housing and dark inspection pane. The shape does not reveal
 * hidden occupants or pretend an opening animation. Six resident boxes per
 * actual edifice, at adoption only; no texture or per-frame business reader. */
export function ancientCasketParts256(w:Pick<World,'structures'>):Placement[]{
 const out:Placement[]=[];
 for(const s of w.structures)if(s.kind==='ancient-cryptosleep-casket'){
  const cells=ancientCasketCells256(s,s.orientation),x=(cells[0]!.x+cells[1]!.x)/2,z=(cells[0]!.z+cells[1]!.z)/2;
  const angle=s.orientation*Math.PI/2,c=Math.cos(angle),n=Math.sin(angle);
  const box=(dx:number,y:number,dz:number,sx:number,sy:number,sz:number,color:number)=>out.push({targetId:s.id,key:s.id,x:x+dx*c+dz*n,z:z+dz*c-dx*n,y,sx,sy,sz,ry:angle,color});
  box(0,.11,0,.88,.22,1.88,0x687b78);
  box(0,.43,0,.78,.46,1.76,0xafbbae);
  box(-.38,.67,0,.12,.12,1.72,0xd0cbbb);box(.38,.67,0,.12,.12,1.72,0xd0cbbb);
  box(0,.68,.08,.59,.055,1.22,0x506d70);
  box(0,.71,-.70,.42,.08,.25,0x9eac9e);
 }
 return out;
}
