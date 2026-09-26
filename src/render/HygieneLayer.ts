import * as THREE from 'three/webgpu';
import type { World } from '../sim/types';
import type { FloorKind } from '../sim/flooring';
import { FilthLayer } from './FilthLayer';
import type { BoxBatches } from './BoxBatches';
import type { Placement } from './primitives';

const floorColors:Record<FloorKind,number>={'wood-planks':0x98714a,'burned-wood':0x302c28,'granite-tile':0x918c85,'limestone-tile':0xb5aa85,'marble-tile':0xc4c0b5,'sandstone-tile':0xb18a64,'slate-tile':0x626970,'steel-tile':0x83989a};

/** Floors reuse box batches, traces share one transparent instanced mesh. Changes do not rebuild the
 * natural terrain, compile materials, or retain mutable simulation objects. */
export class HygieneLayer {
  readonly group=new THREE.Group();
  private floors=new Map<number,FloorKind>();
  private tiles:World['tiles']|undefined;
  readonly filth:FilthLayer;
  constructor(configure?:(m:THREE.MeshStandardNodeMaterial)=>void){this.filth=new FilthLayer(configure);this.group.add(this.filth.mesh);}
  update(world:World,batches:BoxBatches,reset=false):void {
    let changed=reset;
    if(reset)this.floors.clear();
    // Bridge snapshots retain unchanged tile arrays. A new array triggers a
    // value comparison; no simulation revision or mutable cache is assumed.
    if(reset||this.tiles!==world.tiles)for(let i=0;i<world.tiles.length;i++){
      const floor=world.tiles[i]!.floor,old=this.floors.get(i);
      if(floor!==old){changed=true;if(floor)this.floors.set(i,floor);else this.floors.delete(i);}
    }
    this.tiles=world.tiles;
    if(changed){const parts:Placement[]=[];
      for(const [i,floor] of this.floors){const x=i%world.width,z=Math.floor(i/world.width),color=floorColors[floor];
        if(floor==='wood-planks'||floor==='burned-wood')for(let plank=0;plank<3;plank++)parts.push({x:x+(plank-1)/3,z,y:.043,sx:.319,sy:.038,sz:.99,color});
        else parts.push({x,z,y:.043,sx:.975,sy:.038,sz:.975,color});
      }
      batches.set(this.group,'hygiene-floors',parts,'solid',false);
    }
    this.filth.update(world.filth?.items??[],reset);
  }
  dispose():void {this.filth.dispose();}
}
