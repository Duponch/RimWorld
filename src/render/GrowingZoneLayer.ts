import * as THREE from 'three/webgpu';
import { BoxBatches } from './BoxBatches';
import type { Placement } from './primitives';
import type { World } from '../sim/types';

export class GrowingZoneLayer {
  readonly group = new THREE.Group();
  private signature = '';
  constructor(private readonly boxes: BoxBatches) {}
  update(world: World, reset: boolean,showAll=false,selectedId?:number): boolean {
    const signature = `${showAll}:${selectedId??''}:`+world.growingZones.map(z => `${z.id}:${z.allowSow}:${z.cells.join(',')}`).join('|');
    if (!reset && signature === this.signature) return false;
    this.signature = signature;
    const surfaces: Placement[] = [];
    const palette=[0x79a46a,0xaaa36a,0x94aa69,0xaaa57c,0x7baa84];
    for (const zone of world.growingZones) {
      const color = zone.allowSow ? palette[(zone.id-1)%palette.length]! : 0x9a9170;
      for (const cell of zone.cells) {
        const x = cell % world.width, z = Math.floor(cell / world.width);
        surfaces.push({x,z,y:.021,sx:1,sy:.014,sz:1,color});
      }
    }
    this.boxes.set(this.group, 'growing-borders', surfaces, 'storage', false);
    return true;
  }
}
