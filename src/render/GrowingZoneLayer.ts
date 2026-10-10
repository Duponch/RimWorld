import * as THREE from 'three/webgpu';
import { BoxBatches } from './BoxBatches';
import type { Placement } from './primitives';
import type { World } from '../sim/types';
import {surfaceHeightAtCell} from './surface-height';
import {adjacentZoneColors} from './zone-surface-presentation';
import {GROUND_OVERLAY_RENDER_ORDER,setGroundOverlayRenderOrder} from './ground-overlay-surfaces';

export class GrowingZoneLayer {
  readonly group = new THREE.Group();
  surfaces:readonly Placement[]=[];
  private signature = '';
  constructor(private readonly boxes: BoxBatches) {}
  update(world: World, reset: boolean,showAll=false,selectedId?:number): boolean {
    const signature = `${world.width}:`+world.growingZones.map(z => `${z.id}:${z.allowSow}:${z.cells.map(i=>`${i}:${surfaceHeightAtCell(world,i%world.width,Math.floor(i/world.width))}`).join(',')}`).join('|');
    if (!reset && signature === this.signature) return false;
    this.signature = signature;
    const surfaces: Placement[] = [];
    const palette=[0x79a46a,0xaaa36a,0x94aa69,0xaaa57c,0x7baa84];
    const colors=adjacentZoneColors(world.width,world.growingZones.flatMap(zone=>zone.cells.map(cell=>({zoneId:zone.id,cell}))),palette);
    for (const zone of world.growingZones) {
      // Core keeps each zone's hue when sowing is disabled. Collapsing every
      // disabled field to one grey would make neighbouring fields merge again.
      const color = colors.get(zone.id)!;
      for (const cell of zone.cells) {
        const x = cell % world.width, z = Math.floor(cell / world.width);
        surfaces.push({x,z,y:(surfaceHeightAtCell(world,x,z)??0)+.021,sx:1,sy:.014,sz:1,color});
      }
    }
    this.surfaces=surfaces;
    this.boxes.set(this.group, 'growing-borders', surfaces, 'storage', false);
    setGroundOverlayRenderOrder(this.group,'growing-borders',GROUND_OVERLAY_RENDER_ORDER.growing);
    return true;
  }
}
