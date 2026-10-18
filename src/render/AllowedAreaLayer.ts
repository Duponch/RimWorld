import * as THREE from 'three/webgpu';
import { BoxBatches } from './BoxBatches';
import { overlaySurfaceHeightAtCell,type GroundOverlaySurface } from './surface-height';
import { GROUND_OVERLAY_RENDER_ORDER,setGroundOverlayRenderOrder } from './ground-overlay-surfaces';
import type { Placement } from './primitives';
import type { World } from '../sim/types';

/** Only the area currently edited is displayed; overlapping permissions stay
 * independent and no presentation buffer is rebuilt for assigned colonists. */
export class AllowedAreaLayer {
  readonly group=new THREE.Group();
  surfaces:readonly Placement[]=[];
  private signature='';
  constructor(private readonly boxes:BoxBatches){}
  update(world:World,id:number|undefined,reset=false):boolean {
    return this.updateIntents(world,world.allowedAreas,id,reset);
  }
  updateIntents(world:GroundOverlaySurface,areas:World['allowedAreas'],id:number|undefined,reset=false,known?:(cell:number)=>boolean):boolean {
    let area=id===undefined?undefined:areas?.find(a=>a.id===id);
    if(area&&known)area={...area,cells:area.cells.filter(known)};
    const signature=area?`${world.width}:${area.id}:${area.color}:`+area.cells.map(i=>`${i}:${overlaySurfaceHeightAtCell(world,i%world.width,Math.floor(i/world.width))}`).join(','):'';
    if(!reset&&signature===this.signature)return false;this.signature=signature;
    const surfaces:Placement[]=(area?.cells??[]).map(i=>{const x=i%world.width,z=Math.floor(i/world.width);return {x,z,y:(overlaySurfaceHeightAtCell(world,x,z)??0)+.024,sx:1,sy:.014,sz:1,color:area!.color};});
    this.surfaces=surfaces;this.boxes.set(this.group,'allowed-area',surfaces,'storage',false);
    setGroundOverlayRenderOrder(this.group,'allowed-area',GROUND_OVERLAY_RENDER_ORDER.home-.25);return true;
  }
}
