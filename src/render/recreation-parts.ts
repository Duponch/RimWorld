import type { World } from '../sim/types';
import type { Placement } from './primitives';
import { WORLD_SCALE } from '../world/scale';

/** A few instances inside the existing furniture batch, no per-pin mesh. */
export function recreationParts(world: World): Placement[] {
  const parts: Placement[]=[];
  for(const pin of world.structures)if(pin.kind==='horseshoes') {
    const {x,z}=pin;
    parts.push({x,z,y:.025,sx:.72,sy:.05,sz:.72,color:0x887252},
      {x,z,y:WORLD_SCALE.horseshoeHeight/2,sx:.09,sy:WORLD_SCALE.horseshoeHeight,sz:.09,color:0xc9a875});
    for(const [dx,dz,sx,sz] of [[-.19,.12,.045,.23],[-.01,.12,.045,.23],[-.1,.215,.22,.045]])
      parts.push({x:x+dx!,z:z+dz!,y:.07,sx:sx!,sy:.04,sz:sz!,color:0x727b7d});
  }
  return parts;
}
