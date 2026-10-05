import { floraSize,isResidentCrop } from './flora-presentation';
import { plantLeafless } from '../sim/plant-life';
import { harvestable } from '../sim/plants';
import type { Resource,World } from '../sim/types';

type Shape=Pick<Resource,'id'|'kind'|'x'|'z'|'stone'|'species'>&{ripe:boolean;leafless:boolean;size:number};
export type NaturalPresentationChange = { resource: Resource | undefined; size: number };
/** Geometry follows visible shape, not the anchors of a growth integral.
 * Own scalar captures also detect edits in place and checkpoint restoration. */
export class NaturalResourcePresentation {
  private shapes:Shape[]=[];
  private snapshotResources:readonly Resource[]|undefined;
  private snapshotTimeInvariant=false;
  private timedSlots:Array<readonly [sourceIndex:number,shapeIndex:number]>=[];
  readonly changes=new Map<number,NaturalPresentationChange>();
  /** SnapshotDecoder replaces edited resources instead of mutating them. Only
   * callers with that guarantee may enable the reference shortcut. */
  read(world:World,reset=false,immutableSnapshot=false):World|undefined {
    this.changes.clear();
    const previous=immutableSnapshot&&!reset?this.snapshotResources:undefined;
    if(previous===world.resources&&this.snapshotTimeInvariant)return;
    this.snapshotResources=immutableSnapshot?world.resources:undefined;
    // Only the same immutable array can retain this partition. A new array
    // or mutable caller still captures every slot and its original order.
    const timed=previous===world.resources?this.timedSlots:undefined;
    if(!timed)this.timedSlots=[];
    let index=timed?this.shapes.length:0,changed=reset,timeInvariant=true;
    for(let entry=0;entry<(timed?.length??world.resources.length);entry++){
      const sourceIndex=timed?timed[entry]![0]:entry;
      const r=world.resources[sourceIndex]!;
      if(!timed&&isResidentCrop(r))continue;
      const shapeIndex=timed?timed[entry]![1]:index++;
      const stable=(r.growth??1)===1&&r.plantLife?.leaflessAt===undefined;
      if(!stable){
        timeInvariant=false;
        if(!timed&&immutableSnapshot)this.timedSlots.push([sourceIndex,shapeIndex]);
      }
      const old=this.shapes[shapeIndex];
      // Immature growth and temporary leaf loss can change with world.tick
      // even while the decoder keeps the same Resource object.
      if(previous?.[sourceIndex]===r&&old?.id===r.id&&stable)continue;
      const size=floraSize(world,r);
      if(reset||!old||old.size!==size||old.species!==r.species||old.id!==r.id||old.kind!==r.kind||old.x!==r.x||old.z!==r.z||old.stone!==r.stone||old.ripe!==(r.kind==='berries'&&harvestable(world,r))||old.leafless!==plantLeafless(world,r)){
        changed=true;this.changes.set(r.id,{resource:r,size});
      }
    }
    this.snapshotTimeInvariant=immutableSnapshot&&timeInvariant;
    if(!changed&&index===this.shapes.length)return;
    const natural=world.resources.filter(r=>!isResidentCrop(r));
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
