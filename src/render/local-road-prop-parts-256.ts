import type {World} from '../sim/types';
import type {Placement} from './primitives';
/** Original chalk/concrete and corroded-metal silhouettes. All boxes enter the
 * existing resident furniture batch; no lamp emitter, actor update or texture. */
export function localRoadPropParts256(w:Pick<World,'structures'>):Placement[]{
 const out:Placement[]=[];
 for(const s of w.structures){
  if(s.kind!=='ancient-road-barrier'&&s.kind!=='ancient-road-lamp')continue;
  const a=s.orientation*Math.PI/2,c=Math.cos(a),n=Math.sin(a);
  const box=(dx:number,y:number,dz:number,sx:number,sy:number,sz:number,color:number)=>
   out.push({targetId:s.id,key:s.id,x:s.x+dx*c+dz*n,z:s.z+dz*c-dx*n,y,sx,sy,sz,ry:a,color});
  if(s.kind==='ancient-road-barrier'){
   box(0,.10,0,.94,.20,.66,0x918f85);
   box(0,.37,0,.88,.34,.38,0xb9b7a7);
   box(0,.61,0,.84,.14,.26,0xd0cab5);
   box(-.25,.40,-.198,.13,.22,.018,0xddd0a1);
   box(.25,.40,-.198,.13,.22,.018,0x737e7b);
  }else{
   box(0,.10,0,.34,.20,.34,0x8c9189);
   box(0,1.15,0,.10,2.10,.10,0x717e7a);
   box(.16,2.13,0,.38,.09,.10,0x87918a);
   box(.32,2.04,0,.30,.13,.23,0xaaa996);
   box(.32,1.965,0,.21,.025,.16,0x555f60);
  }
 }
 return out;
}
