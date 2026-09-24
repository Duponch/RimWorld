import { floraSize } from './flora-presentation';
import { plantLeafless } from '../sim/plant-life';
import { harvestable,isCrop } from '../sim/plants';
import type { Resource,World } from '../sim/types';

type Shape=Pick<Resource,'id'|'kind'|'x'|'z'|'stone'|'species'>&{ripe:boolean;leafless:boolean;size:number};
export type NaturalPresentationChange = { resource: Resource | undefined; size: number };
/** Geometry follows visible shape, not the anchors of a growth integral.
 * Own scalar captures also detect edits in place and checkpoint restoration. */
export class NaturalResourcePresentation {
  private shapes:Shape[]=[];
  readonly changes=new Map<number,NaturalPresentationChange>();
  read(world:World,reset=false):World|undefined {
    this.changes.clear();
    let index=0,changed=reset;
    for(const r of world.resources)if(!isCrop(r)){
      const old=this.shapes[index++];
      const size=floraSize(world,r);
      if(reset||!old||old.size!==size||old.species!==r.species||old.id!==r.id||old.kind!==r.kind||old.x!==r.x||old.z!==r.z||old.stone!==r.stone||old.ripe!==(r.kind==='berries'&&harvestable(world,r))||old.leafless!==plantLeafless(world,r)){
        changed=true;this.changes.set(r.id,{resource:r,size});
      }
    }
    if(!changed&&index===this.shapes.length)return;
    const natural=world.resources.filter(r=>!isCrop(r));
    const present=new Set(natural.map(r=>r.id));
    for(const old of this.shapes)if(!present.has(old.id))this.changes.set(old.id,{resource:undefined,size:0});
    this.shapes=natural.map((r,i)=>{
      const old=this.shapes[i];
      if(old?.id===r.id&&!this.changes.has(r.id))return old;
      return {size:this.changes.get(r.id)?.size??floraSize(world,r),species:r.species,id:r.id,kind:r.kind,x:r.x,z:r.z,stone:r.stone,leafless:plantLeafless(world,r),ripe:r.kind==='berries'&&harvestable(world,r)};
    });
    return {...world,resources:natural};
  }
}
