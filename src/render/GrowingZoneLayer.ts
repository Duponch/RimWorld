import * as THREE from 'three/webgpu';
import { BoxBatches } from './BoxBatches';
import type { Placement } from './primitives';
import type { World } from '../sim/types';
import {overlaySurfaceHeightAtCell,type GroundOverlaySurface} from './surface-height';
import {adjacentZoneColors} from './zone-surface-presentation';
import {GROUND_OVERLAY_RENDER_ORDER,setGroundOverlayRenderOrder} from './ground-overlay-surfaces';

export class GrowingZoneLayer {
  readonly group = new THREE.Group();
  surfaces:readonly Placement[]=[];
  private signature = '';
  constructor(private readonly boxes: BoxBatches) {}
  update(world: World, reset: boolean,showAll=false,selectedId?:number): boolean {
    return this.updateIntents(world,world.growingZones,reset,showAll,selectedId);
  }
  updateIntents(world:GroundOverlaySurface,zones:World['growingZones'],reset=false,showAll=false,selectedId?:number,known?:(cell:number)=>boolean):boolean {
    if(known)zones=zones.map(zone=>({...zone,cells:zone.cells.filter(known)}));
    const signature = `${world.width}:`+zones.map(z => `${z.id}:${z.allowSow}:${z.cells.map(i=>`${i}:${overlaySurfaceHeightAtCell(world,i%world.width,Math.floor(i/world.width))}`).join(',')}`).join('|');
    if (!reset && signature === this.signature) return false;
    this.signature = signature;
    const surfaces: Placement[] = [];
    const palette=[0x79a46a,0xaaa36a,0x94aa69,0xaaa57c,0x7baa84];
    const colors=adjacentZoneColors(world.width,zones.flatMap(zone=>zone.cells.map(cell=>({zoneId:zone.id,cell}))),palette);
    for (const zone of zones) {
      // Core keeps each zone's hue when sowing is disabled. Collapsing every
      // disabled field to one grey would make neighbouring fields merge again.
      const color = colors.get(zone.id)!;
      for (const cell of zone.cells) {
        const x = cell % world.width, z = Math.floor(cell / world.width);
        surfaces.push({x,z,y:(overlaySurfaceHeightAtCell(world,x,z)??0)+.021,sx:1,sy:.014,sz:1,color});
      }
    }
    this.surfaces=surfaces;
    this.boxes.set(this.group, 'growing-borders', surfaces, 'storage', false);
    setGroundOverlayRenderOrder(this.group,'growing-borders',GROUND_OVERLAY_RENDER_ORDER.growing);
    return true;
  }
}
