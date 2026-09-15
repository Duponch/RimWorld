import * as THREE from 'three/webgpu';
import type { World } from '../sim/types';
import type { BoxBatches } from './BoxBatches';
import { WORLD_SCALE } from '../world/scale';

/** Roof and area instances share the existing stable box/shadow pipelines. */
export class RoofLayer {
  readonly surface = new THREE.Group();
  readonly areas = new THREE.Group();
  private key = '';
  constructor(){this.surface.visible=false;this.areas.visible=false;}
  update(world:World,batches:BoxBatches,reset=false):void {
    const state=world.roofing,key=`${world.width}|${state?.constructed.join(',')}|${state?.build.join(',')}|${state?.remove.join(',')}`;
    if(!reset&&this.key===key)return;this.key=key;
    batches.set(this.surface,'constructed-roofs',(state?.constructed??[]).map(i=>({x:i%world.width,z:Math.floor(i/world.width),y:WORLD_SCALE.wallHeight+WORLD_SCALE.roofThickness/2,sx:1,sz:1,sy:WORLD_SCALE.roofThickness,color:0x9a9c85})));
    batches.set(this.areas,'roof-areas',[...(state?.build??[]).map(i=>({i,color:0x7abca0})),...(state?.remove??[]).map(i=>({i,color:0xd49d79}))].map(({i,color})=>({x:i%world.width,z:Math.floor(i/world.width),y:.054,sx:.98,sz:.98,sy:.012,color})),'overlay',false);
  }
  prepare():()=>void {
    const surface=this.surface.visible,areas=this.areas.visible;this.surface.visible=this.areas.visible=true;
    return ()=>{this.surface.visible=surface;this.areas.visible=areas;};
  }
}
