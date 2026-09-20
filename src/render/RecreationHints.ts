import { windClearance,WindObstructionView } from '../sim/wind-rules';
import { coolerFaces } from '../sim/cooler';
import type { Orientation } from '../sim/types';
import { Group } from 'three/webgpu';
import { clearThrow, horseshoeCells, standableRecreationCell } from '../sim/recreation-space';
import type { Cell, World } from '../sim/types';
import type { BoxBatches } from './BoxBatches';

/** Presentation only: shows geometric throwing places, not an access guarantee. */
export class RecreationHints {
  readonly group = new Group();
  constructor(private readonly batches: BoxBatches) {}
  wind(world:World,turbine:Cell&{orientation:Orientation}):void {
    this.group.visible=true;const obstacles=new WindObstructionView(world);
    this.batches.set(this.group,'recreation-places',windClearance(turbine).filter(c=>c.x>=0&&c.z>=0&&c.x<world.width&&c.z<world.height).map(c=>({...c,y:.045,sx:.9,sy:.015,sz:.9,color:obstacles.blocked(c)?0xcc6750:0x85bca9})),'overlay',false);
  }
  cooler(cell:Cell,orientation:Orientation):void {
    this.group.visible=true;const {cold,hot}=coolerFaces({...cell,orientation});
    this.batches.set(this.group,'recreation-places',[{...cold,y:.045,sx:.8,sy:.02,sz:.8,color:0x55b6ec},{...hot,y:.045,sx:.8,sy:.02,sz:.8,color:0xed7050}],'overlay',false);
  }
  update(world: World | undefined | null, pin?: Cell): void {
    this.group.visible=!!world&&!!pin;
    if(!world||!pin)return;
    this.batches.set(this.group,'recreation-places',horseshoeCells(pin).filter(c=>c.x>=0&&c.z>=0&&c.x<world.width&&c.z<world.height).map(c=>({
      ...c,y:.045,sx:.8,sy:.02,sz:.8,color:standableRecreationCell(world,c)&&clearThrow(world,pin,c)?0xdfc581:0xa55445,
    })),'overlay',false);
  }
}
