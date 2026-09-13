import * as THREE from 'three/webgpu';
import { BoxBatches } from './BoxBatches';
import type { Placement } from './primitives';
import type { World } from '../sim/types';

export class GrowingZoneLayer {
  readonly group = new THREE.Group();
  private signature = '';
  constructor(private readonly boxes: BoxBatches) {}
  update(world: World, reset: boolean): void {
    const signature = world.growingZones.map(z => `${z.id}:${z.allowSow}:${z.cells.join(',')}`).join('|');
    if (!reset && signature === this.signature) return;
    this.signature = signature;
    const edges: Placement[] = [];
    for (const zone of world.growingZones) {
      const cells = new Set(zone.cells), color = zone.allowSow ? 0x98b869 : 0xa6976f;
      for (const cell of cells) {
        const x = cell % world.width, z = Math.floor(cell / world.width);
        for (const dx of [-1, 1]) if (x + dx < 0 || x + dx >= world.width || !cells.has(cell + dx)) edges.push({x:x+dx*.48,z,y:.035,sx:.035,sy:.02,sz:1,color});
        for (const dz of [-1, 1]) if (!cells.has(cell + dz * world.width)) edges.push({x,z:z+dz*.48,y:.035,sx:1,sy:.02,sz:.035,color});
      }
    }
    this.boxes.set(this.group, 'growing-borders', edges, 'overlay', false);
  }
}
