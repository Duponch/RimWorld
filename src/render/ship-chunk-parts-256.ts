import type {World} from '../sim/types';
import type {Placement} from './primitives';
/** Original folded salvage plates, baked into the existing furniture boxes.
 * No proprietary mesh/texture, allocation or business scan per image. */
export function shipChunkParts256(w:Pick<World,'structures'>):Placement[]{
 const out:Placement[]=[];
 for(const s of w.structures)if(s.kind==='ship-chunk'){
  const box=(dx:number,y:number,dz:number,sx:number,sy:number,sz:number,color:number,ry=0)=>out.push({targetId:s.id,key:s.id,x:s.x+.5+dx,z:s.z+.5+dz,y,sx,sy,sz,color,ry});
  box(0,.12,0,1.70,.24,1.62,0x798987,.11);
  box(-.28,.48,.14,.82,.64,1.36,0xaab4a9,-.18);
  box(.48,.30,-.32,.65,.36,.90,0x8c9c96,.42);
  box(-.12,.84,.34,.92,.10,.52,0xc3c6b3,-.18);
  box(.34,.39,.56,.22,.22,.18,0x4d6769,.12);
  box(-.71,.23,-.43,.19,.36,.54,0x9f947f,-.3);
 }
 return out;
}
export function slagSteelChunkParts256(x:number,z:number):Placement[]{
 return [{x:x-.09,y:.18,z:z+.02,sx:.61,sy:.36,sz:.42,color:0x718582,ry:.22},
  {x:x+.18,y:.33,z:z-.07,sx:.32,sy:.30,sz:.24,color:0x9caa9a,ry:-.4},
  {x:x-.21,y:.40,z:z+.04,sx:.19,sy:.12,sz:.35,color:0xaba58f,ry:.22}];
}
