import type { World } from '../sim/types';
import type { Placement } from './primitives';

/** Both machines join the resident furniture batch; power changes no geometry. */
export function orbitalParts(world:World):Placement[]{
  const parts:Placement[]=[];
  for(const s of world.structures){
    if(s.kind!=='orbital-beacon'&&s.kind!=='comms-console')continue;
    const ry=s.orientation*Math.PI/2,c=Math.cos(ry),sn=Math.sin(ry);
    const add=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number)=>
      parts.push({x:s.x+x*c+z*sn,y,z:s.z+z*c-x*sn,sx,sy,sz,ry,color});
    if(s.kind==='orbital-beacon'){
      add(0,.09,0,.80,.18,.80,0x536d72);add(0,.42,0,.23,.70,.23,0x8dafa7);
      add(0,.81,0,.70,.12,.70,0xb7c5b5);add(0,.93,0,.27,.12,.27,0xc7a96d);
      for(const x of [-.24,.24])add(x,.68,0,.08,.30,.08,0x688a83);
    }else{
      // Standard footprint local x=-1..1, z=0..1; controls face z=2.
      add(0,.53,.5,2.72,1.06,1.72,0x567277);add(0,1.10,.5,2.86,.12,1.80,0xa5b5a5);
      for(const x of [-.78,0,.78]){
        add(x,1.47,.18,.67,.64,.18,0x374e56);add(x,1.48,.29,.52,.45,.05,0x87baac);
        add(x,1.18,1.02,.62,.07,.38,0x3e5b61);
      }
      add(1.14,1.23,.97,.13,.13,.13,0xd1b470);add(-1.14,1.23,.97,.13,.13,.13,0x80a598);
      for(const x of [-1.10,1.10])add(x,.13,.5,.22,.26,1.44,0x465b60);
    }
  }
  return parts;
}
