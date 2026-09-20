import { isFoodWorkstation } from '../sim/food-workstations';
import type { World } from '../sim/types';
import type { Placement } from './primitives';
import { WORLD_SCALE } from '../world/scale';

/** Static cookware shares the existing resident furniture batch. */
export function foodWorkstationParts(world:World):Placement[] {
  const parts:Placement[]=[],height=WORLD_SCALE.stonecutterHeight;
  for(const s of world.structures)if(isFoodWorkstation(s.kind)) {
    const ry=s.orientation*Math.PI/2,cos=Math.cos(ry),sin=Math.sin(ry);
    const add=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number)=>parts.push({x:s.x+x*cos+z*sin,y,z:s.z+z*cos-x*sin,sx,sy,sz,ry,color});
    if(s.kind==='butcher-table') {
      add(0,height-.09,0,2.8,.18,.85,0x9b7850);
      for(const x of [-1.2,1.2])for(const z of [-.3,.3])add(x,(height-.18)/2,z,.17,height-.18,.17,0x70543b);
      add(.55,height+.025,0,.9,.05,.62,0xc9ac79);
      add(-.65,height+.06,.13,.5,.025,.16,0xbfc8c8);
      add(-.98,height+.06,.13,.22,.055,.07,0x46392a);
    } else {
      add(0,height/2,0,2.8,height,.85,0x6d7878);
      add(0,height+.025,0,2.85,.05,.89,0xb6bcb9);
      add(0,height+.14,.37,2.8,.23,.12,0x899694);
      for(const x of [-.8,.1])add(x,height+.08,0,.49,.055,.5,0x303938);
      add(.87,height+.045,0,.64,.035,.63,0xb8a783);
      if(s.kind==='fueled-stove') {
        add(-.73,height*.42,-.44,.93,height*.61,.045,0x303536);
        add(-.73,height*.57,-.48,.43,.04,.06,0x99a39e);
        add(.57,height*.24,-.44,.9,.14,.055,0x755738);
      } else {
        add(-.46,height*.42,-.44,1.5,height*.60,.045,0x303b40);
        add(-.46,height*.68,-.48,.78,.04,.06,0xbbc7c7);
        for(const x of [.56,.91])add(x,height*.77,-.47,.12,.12,.07,0x3b515a);
      }
    }
  }
  return parts;
}
