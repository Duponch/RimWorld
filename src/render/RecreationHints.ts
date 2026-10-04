import { windClearance,WindObstructionView } from '../sim/wind-rules';
import { coolerFaces } from '../sim/cooler';
import type { Orientation } from '../sim/types';
import { Group } from 'three/webgpu';
import { clearThrow, horseshoeCells, standableRecreationCell } from '../sim/recreation-space';
import type { Cell, World } from '../sim/types';
import type { BoxBatches } from './BoxBatches';
import { LocalLightCache } from '../sim/local-light';
import { RoomTopologyCache } from '../sim/room-topology';
import { SUN_LAMP_RADIUS,SUN_LAMP_OVERLIGHT_RADIUS } from '../sim/sun-lamp';
import { televisionWatchCells } from '../sim/television-recreation';

/** Presentation only: shows geometric throwing places, not an access guarantee. */
export class RecreationHints {
  readonly group = new Group();
  private readonly topology = new RoomTopologyCache();
  private readonly horticultural = new LocalLightCache();
  constructor(private readonly batches: BoxBatches) {}
  /** Same prepared overlay; geometry alone promises neither seat nor access. */
  television(world:World,tv:Cell&{orientation:Orientation}):void {
    this.group.visible=true;
    this.batches.set(this.group,'recreation-places',televisionWatchCells(tv)
      .filter(c=>c.x>=0&&c.z>=0&&c.x<world.width&&c.z<world.height)
      .map(c=>({...c,y:.045,sx:.8,sy:.02,sz:.8,color:0x9cbfba})),'overlay',false);
  }
  /** Potential powered coverage, with the same obstacles and flood as gameplay.
   * A preview never grants power, soil, crops or a growing-zone designation. */
  sunLamp(world:World,cell:Cell):void {
    const field=this.horticultural.read(world,this.topology.read(world),[
      {cell:cell.z*world.width+cell.x,radius:SUN_LAMP_RADIUS,red:370,green:370,blue:370,overlightRadius:SUN_LAMP_OVERLIGHT_RADIUS},
    ]);
    const cells=[];
    for(let z=Math.max(0,cell.z-7);z<=Math.min(world.height-1,cell.z+7);z++)for(let x=Math.max(0,cell.x-7);x<=Math.min(world.width-1,cell.x+7);x++)
      if(field[z*world.width+x]===1)cells.push({x,z,y:.026,sx:1,sy:.014,sz:1,color:0xbca775});
    this.group.visible=true;
    this.batches.set(this.group,'recreation-places',cells,'storage',false);
  }
  wind(world:World,turbine:Cell&{orientation:Orientation}):void {
    this.group.visible=true;const obstacles=new WindObstructionView(world);
    this.batches.set(this.group,'recreation-places',windClearance(turbine).filter(c=>c.x>=0&&c.z>=0&&c.x<world.width&&c.z<world.height).map(c=>({...c,y:.026,sx:1,sy:.014,sz:1,color:obstacles.blocked(c)?0xb97c68:0x879f8c})),'storage',false);
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
