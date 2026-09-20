import * as THREE from 'three/webgpu';
import type { World } from '../sim/types';
import type { FloorKind } from '../sim/flooring';
import type { FilthKind } from '../sim/filth';
import type { BoxBatches } from './BoxBatches';
import type { Placement } from './primitives';

const floorColors:Record<FloorKind,number>={'wood-planks':0x98714a,'burned-wood':0x302c28,'granite-tile':0x918c85,'limestone-tile':0xb5aa85,'marble-tile':0xc4c0b5,'sandstone-tile':0xb18a64,'slate-tile':0x626970,'steel-tile':0x83989a};
const filthColors:Record<FilthKind,number>={dirt:0x665038,trash:0xa09368,blood:0x7b2924,ash:0x484643,vomit:0x7c8439,'corpse-bile':0x535d2f};

/** Floors and traces reuse prepared box batches. Changes do not rebuild the
 * natural terrain, compile materials, or retain mutable simulation objects. */
export class HygieneLayer {
  readonly group=new THREE.Group();
  private floors=new Map<number,FloorKind>();
  private tiles:World['tiles']|undefined;
  private filthKey='';
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
    const filth=world.filth?.items??[],key=filth.map(f=>`${f.id}:${f.x}:${f.z}:${f.kind}:${f.thickness}`).join('|');
    if(reset||key!==this.filthKey){this.filthKey=key;const parts:Placement[]=[];
      for(const f of filth){const phase=f.id*.754877666,size=.23+.045*f.thickness;
        for(let n=0;n<3;n++){const angle=phase+n*2.1,r=.08+n*.055;parts.push({x:f.x+Math.cos(angle)*r,z:f.z+Math.sin(angle)*r,y:.071+n*.002,sx:size*(1+n*.12),sz:size*(.7+n*.13),sy:.006,ry:angle,color:filthColors[f.kind]});}
      }
      batches.set(this.group,'hygiene-filth',parts,'solid',false);
    }
  }
}
