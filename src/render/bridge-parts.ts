import type {Placement} from './primitives';
import {FLOOR_SURFACE_Y} from './surface-height';

/** Original chalk/pastel timber deck; one cell, no model/texture or RNG state.
 * Its four full-width planks meet exactly, preserving a continuous surface. */
export function bridgePartsForCell(x:number,z:number):Placement[]{
  const boards=Array.from({length:4},(_,i)=>({x:x+(i-1.5)/4,z,y:FLOOR_SURFACE_Y-.038/2,
    sx:.25,sy:.038,sz:1,color:[0xb6a17f,0xad9674,0xbeaa89,0xb29c7c][i]!}));
  const supports=[-.4,.4].map(dz=>({x,z:z+dz,y:.016,sx:1,sy:.022,sz:.08,color:0x81715c}));
  return [...boards,...supports];
}
