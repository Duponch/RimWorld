import { Group } from 'three/webgpu';
import { clearThrow, horseshoeCells, standableRecreationCell } from '../sim/recreation-space';
import type { Cell, World } from '../sim/types';
import type { BoxBatches } from './BoxBatches';

/** Presentation only: shows geometric throwing places, not an access guarantee. */
export class RecreationHints {
  readonly group = new Group();
  constructor(private readonly batches: BoxBatches) {}
  update(world: World | undefined | null, pin?: Cell): void {
    this.group.visible=!!world&&!!pin;
    if(!world||!pin)return;
    this.batches.set(this.group,'recreation-places',horseshoeCells(pin).filter(c=>c.x>=0&&c.z>=0&&c.x<world.width&&c.z<world.height).map(c=>({
      ...c,y:.045,sx:.8,sy:.02,sz:.8,color:standableRecreationCell(world,c)&&clearThrow(world,pin,c)?0xdfc581:0xa55445,
    })),'overlay',false);
  }
}
