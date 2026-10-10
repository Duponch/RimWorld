import {isPowerActive} from '../sim/power-rules';
import type {World} from '../sim/types';
import type {Placement} from './primitives';

/** Original rigid model in the shared resident batch. The display faces local
 * -Z, using the same front convention as the research desk and television. */
export function vitalsMonitorParts(world:World):Placement[]{
  const parts:Placement[]=[];
  for(const s of world.structures){
    if(s.kind!=='vitals-monitor')continue;
    const ry=s.orientation*Math.PI/2,c=Math.cos(ry),n=Math.sin(ry);
    const add=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number)=>parts.push({targetId:s.id,key:s.id,x:s.x+x*c+z*n,y,z:s.z+z*c-x*n,sx,sy,sz,ry,color});
    add(0,.08,0,.68,.13,.60,0x627b7a);
    add(0,.48,.12,.12,.77,.12,0x7c9690);
    add(0,.90,0,.72,.48,.35,0xc4cebe);
    add(-.055,.94,-.185,.51,.31,.025,0x253d39);
    add(.28,.97,-.19,.045,.045,.03,0x738a7d);
    add(.28,.86,-.19,.045,.045,.03,0x738a7d);
    const ink=isPowerActive(s)?0x8bcbb3:0x43574d;
    for(const [x,y,sx,sy] of [[-.22,.92,.13,.018],[-.145,.95,.018,.08],[-.11,.92,.018,.13],[-.075,.92,.018,.06],[.025,.92,.17,.018]] as const)add(x,y,-.205,sx,sy,.01,ink);
  }
  return parts;
}
