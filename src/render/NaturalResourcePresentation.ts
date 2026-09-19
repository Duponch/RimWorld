import { harvestable,isCrop } from '../sim/plants';
import type { Resource,World } from '../sim/types';

type Shape=Pick<Resource,'id'|'kind'|'x'|'z'|'stone'>&{ripe:boolean};
/** Geometry follows visible shape, not the anchors of a growth integral.
 * Own scalar captures also detect edits in place and checkpoint restoration. */
export class NaturalResourcePresentation {
  private shapes:Shape[]=[];
  read(world:World,reset=false):World|undefined {
    let index=0,changed=reset;
    for(const r of world.resources)if(!isCrop(r)){
      const old=this.shapes[index++];
      if(!old||old.id!==r.id||old.kind!==r.kind||old.x!==r.x||old.z!==r.z||old.stone!==r.stone||old.ripe!==(r.kind==='berries'&&harvestable(world,r)))changed=true;
    }
    if(!changed&&index===this.shapes.length)return;
    const natural=world.resources.filter(r=>!isCrop(r));
    this.shapes=natural.map(r=>({id:r.id,kind:r.kind,x:r.x,z:r.z,stone:r.stone,ripe:r.kind==='berries'&&harvestable(world,r)}));
    return {...world,resources:natural};
  }
}
