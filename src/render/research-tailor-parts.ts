import type { World } from '../sim/types';
import type { Placement } from './primitives';
import { WORLD_SCALE } from '../world/scale';
/** Static parts join the resident furniture batch, including papers and tools. */
export function researchTailorParts(world:World):Placement[]{
  const parts:Placement[]=[],height=WORLD_SCALE.stonecutterHeight;
  for(const s of world.structures)if(s.kind==='research-bench'||s.kind==='tailor-bench'||s.kind==='electric-tailor-bench'){
    const research=s.kind==='research-bench',ry=s.orientation*Math.PI/2,cos=Math.cos(ry),sin=Math.sin(ry),depth=research?1.8:.85,center=research?.5:0;
    const color=s.material==='steel'?0x89999e:s.material==='wood'?0x927249:0x99958a;
    const add=(x:number,y:number,z:number,sx:number,sy:number,sz:number,tint=color)=>parts.push({x:s.x+x*cos+(z+center)*sin,y,z:s.z+(z+center)*cos-x*sin,sx,sy,sz,ry,color:tint});
    add(0,height-.06,0,2.8,.12,depth);
    for(const x of [-1.2,1.2])for(const z of [-depth/2+.15,depth/2-.15])add(x,(height-.12)/2,z,.15,height-.12,.15);
    if(research){add(-.55,height+.015,-.15,.9,.03,.65,0xe1d8ba);add(.7,height+.1,.1,.38,.2,.55,0x627c7b);add(.7,height+.02,-.4,.5,.04,.10,0x423b30);}
    else{add(-.6,height+.07,.03,.75,.14,.52,0xc4b794);add(.63,height+.12,.05,.22,.24,.22,0x867c63);add(.85,height+.025,-.16,.43,.05,.09,0xa4b4b0);if(s.kind==='electric-tailor-bench')add(0,height+.14,.28,1.3,.16,.24,0x60727a);}
  }return parts;
}
