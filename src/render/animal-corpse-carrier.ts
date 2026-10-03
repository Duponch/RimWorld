import type * as THREE from 'three/webgpu';
import type { CargoHandoff } from './cargo-handoff';

/** CPU view of resident pawn primitives. Species batches copy only on a
 * changed edge/pose/transfer, then evaluate the same clocks on the GPU. */
export interface AnimalCorpseCarrier {
  index:number;geometry:THREE.BufferGeometry;handoff:CargoHandoff|undefined;blend:number;
}
