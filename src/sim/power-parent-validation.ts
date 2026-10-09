import { footprintCells } from './definitions.ts';
import { allowsWireConnection, transmitsPowerNow } from './power-grid.ts';
import type { PowerTopology } from './power-topology.ts';
import type { World } from './types.ts';

/** Only the two fields read by validPowerParent. The full cache is also a
 * structural implementation, so existing explicit callers remain compatible. */
export type PowerParentIndex=Pick<PowerTopology,'footprints'|'wireParents'>;
export interface PowerParentReader { read(world:World):PowerParentIndex }

/** Created once inside one SnapshotDecoder.adopt. Every guard still captures
 * and compares the historical transmitter key before reusing this index.
 * It owns neither power-network simulation nor an inter-adoption cache. */
export class PowerParentValidationCache implements PowerParentReader {
  private key='';
  private index?:PowerParentIndex;
  rebuilds=0;

  read(world:World):PowerParentIndex {
    const transmitters=world.structures.filter(transmitsPowerNow);
    const key=`${world.width}:${world.height}|`+transmitters.map(s=>`${s.id}:${s.kind}:${s.x}:${s.z}:${s.orientation}:${s.footprint}`).join('|');
    if(this.index&&key===this.key)return this.index;
    const footprints=new Map<number,{readonly minX:number;readonly maxX:number;readonly minZ:number;readonly maxZ:number}>(),wireParents=new Set<number>();
    for(const s of transmitters) {
      if(allowsWireConnection(s.kind))wireParents.add(s.id);
      const footprint=footprintCells(s);
      footprints.set(s.id,{minX:Math.min(...footprint.map(c=>c.x)),maxX:Math.max(...footprint.map(c=>c.x)),minZ:Math.min(...footprint.map(c=>c.z)),maxZ:Math.max(...footprint.map(c=>c.z))});
    }
    this.key=key;this.rebuilds++;return this.index={footprints,wireParents};
  }
}
