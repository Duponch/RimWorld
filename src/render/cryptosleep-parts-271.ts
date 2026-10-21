import {cryptosleepCells271} from '../sim/cryptosleep-content-271';
import type {World} from '../sim/types';
import type {Placement} from './primitives';

/** Eight original low-poly parts in the existing resident furniture batch.
 * Only confirmed ownership changes the lid; no private timer or hidden actor. */
export function cryptosleepParts271(w:Pick<World,'structures'>):Placement[]{
 const out:Placement[]=[];
 for(const s of w.structures)if(s.kind==='cryptosleep-casket'){
  const cells=cryptosleepCells271(s,s.orientation),x=(cells[0]!.x+cells[1]!.x)/2,z=(cells[0]!.z+cells[1]!.z)/2;
  const angle=s.orientation*Math.PI/2,c=Math.cos(angle),n=Math.sin(angle),closed=!!s.cryptosleep?.human;
  const box=(dx:number,y:number,dz:number,sx:number,sy:number,sz:number,color:number)=>out.push({targetId:s.id,key:s.id,x:x+dx*c+dz*n,z:z+dz*c-dx*n,y,sx,sy,sz,ry:angle,color});
  box(0,.10,0,.88,.20,1.88,0x627977);
  box(0,.27,0,.78,.20,1.76,0xbbc9ba);
  box(0,.39,0,.61,.05,1.43,0x628487);
  box(-.37,.44,0,.12,.36,1.76,0xd2d0b9);box(.37,.44,0,.12,.36,1.76,0xd2d0b9);
  box(0,.48,-.78,.75,.42,.18,0xb0bdb1);
  box(closed?0:.40,closed?.65:.95,.02,closed?.64:.07,closed?.07:1.0,1.43,closed?0x7c9da0:0xa0b8b0);
  box(.20,.71,-.78,.13,.04,.08,closed?0x82c9b1:0xe1c181);
 }
 return out;
}
