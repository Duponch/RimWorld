import { HARE_PARTS } from './hare-shape';
import type { Placement } from './primitives';

export type CorpseStage='fresh'|'rotting'|'desiccated';
const colors:Record<CorpseStage,number>={fresh:0xadaaa4,rotting:0x646b4f,desiccated:0xa89a81};

/** The same flattened pose as WildlifeLayer's dead rig, in existing box batches. */
export function corpseParts(x:number,z:number,stage:CorpseStage='fresh',yaw=0):Placement[] {
  const c=Math.cos(yaw),s=Math.sin(yaw);
  return HARE_PARTS.map(p=>({x:x+p.center[0]*c+p.center[2]*s,y:p.center[1]*.5,z:z+p.center[2]*c-p.center[0]*s,
    sx:p.size[0],sy:p.size[1]*.5,sz:p.size[2],ry:yaw,color:colors[stage]}));
}
