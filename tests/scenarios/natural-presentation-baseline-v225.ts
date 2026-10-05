import { plantGrowth,harvestable } from '../../src/sim/plants';
import type { Resource,World } from '../../src/sim/types';
import {readSnapshotChanges} from '../../src/bridge/snapshot-changes';

// Independent original V225 presentation body captured from c45f06a7.
// The independent benchmark manifest records the provenance of business primitives.
// Projection helpers are copied here so the candidate event scheduler is never consulted.
const isResidentCrop=(r:Pick<Resource,'kind'>):boolean=>['rice','potato','corn','cotton'].includes(r.kind);
const isMedicinalPlant=(r:Pick<Resource,'kind'|'species'>):boolean=>r.kind==='healroot'||r.species==='healroot-wild';
const floraSize=(world:World,r:Resource):number=>!r.species&&!isMedicinalPlant(r)?1:(r.growth??1)===1?1:.3+.7*Math.ceil(plantGrowth(world,r)*4)/4;
const plantLeafless=(world:World,plant:Resource):boolean=>plant.plantLife?.leaflessAt!==undefined&&world.tick-plant.plantLife.leaflessAt<6000;

type Shape=Pick<Resource,'id'|'kind'|'x'|'z'|'stone'|'species'>&{ripe:boolean;leafless:boolean;size:number};
export type NaturalPresentationChangeV225 = { resource: Resource | undefined; size: number };
function mergeSources(changed:readonly number[],timed:readonly (readonly [number,number])[]):number[]{
  const result:number[]=[];let a=0,b=0;
  while(a<changed.length||b<timed.length){
    const left=changed[a]??Infinity,right=timed[b]?.[0]??Infinity;
    result.push(Math.min(left,right));
    if(left<=right)a++;if(right<=left)b++;
  }
  return result;
}
/** Geometry follows visible shape, not the anchors of a growth integral.
 * Own scalar captures also detect edits in place and checkpoint restoration. */
export class NaturalResourcePresentationV225 {
  private shapes:Shape[]=[];
  private snapshotResources:readonly Resource[]|undefined;
  private snapshotTimeInvariant=false;
  private timedSlots:Array<readonly [sourceIndex:number,shapeIndex:number]>=[];
  private snapshotWorld:World|undefined;
  private sourceShapes:number[]=[];
  private naturalResources:Resource[]=[];
  private readonly timedSources=new Set<number>();
  readonly changes=new Map<number,NaturalPresentationChangeV225>();
  /** SnapshotDecoder replaces edited resources instead of mutating them. Only
   * callers with that guarantee may enable the reference shortcut. */
  read(world:World,reset=false,immutableSnapshot=false):World|undefined {
    this.changes.clear();
    const priorWorld=immutableSnapshot&&!reset?this.snapshotWorld:undefined;
    this.snapshotWorld=immutableSnapshot?world:undefined;
    const previous=immutableSnapshot&&!reset?this.snapshotResources:undefined;
    if(previous===world.resources&&this.snapshotTimeInvariant)return;
    this.snapshotResources=immutableSnapshot?world.resources:undefined;
    // Only the same immutable array can retain this partition. A new array
    // or mutable caller still captures every slot and its original order.
    const timed=previous===world.resources?this.timedSlots:undefined;
    const journal=!timed&&priorWorld?readSnapshotChanges(priorWorld,world):undefined;
    // A crop/natural classification edit changes our source-to-shape partition.
    // Retain the complete original traversal for that case.
    const partial=journal&&this.sourceShapes.length===world.resources.length&&journal.resourceIndices.every(i=>(this.sourceShapes[i]!==-1)===!isResidentCrop(world.resources[i]!))
      ?mergeSources(journal.resourceIndices,this.timedSlots):undefined;
    if(!timed&&!partial){this.timedSlots=[];this.timedSources.clear();this.sourceShapes=[];}
    const nextNatural=!timed&&!partial?[] as Resource[]:undefined;
    if(partial)for(const sourceIndex of journal!.resourceIndices){
      const shapeIndex=this.sourceShapes[sourceIndex]!;
      if(shapeIndex>=0)this.naturalResources[shapeIndex]=world.resources[sourceIndex]!;
    }
    let index=timed||partial?this.shapes.length:0,changed=reset,timeInvariant=true,timePartitionChanged=false;
    for(let entry=0;entry<(partial?.length??timed?.length??world.resources.length);entry++){
      const sourceIndex=partial?partial[entry]!:timed?timed[entry]![0]:entry;
      const r=world.resources[sourceIndex]!;
      if(partial?this.sourceShapes[sourceIndex]===-1:!timed&&isResidentCrop(r)){if(!partial)this.sourceShapes[sourceIndex]=-1;continue;}
      const shapeIndex=partial?this.sourceShapes[sourceIndex]!:timed?timed[entry]![1]:index++;
      if(nextNatural){this.sourceShapes[sourceIndex]=shapeIndex;nextNatural.push(r);}
      const stable=(r.growth??1)===1&&r.plantLife?.leaflessAt===undefined;
      if(!stable){
        timeInvariant=false;
        if(!timed&&immutableSnapshot){
          if(partial&&!this.timedSources.has(sourceIndex))timePartitionChanged=true;
          this.timedSources.add(sourceIndex);
          if(!partial)this.timedSlots.push([sourceIndex,shapeIndex]);
        }
      }else if(partial&&this.timedSources.delete(sourceIndex))timePartitionChanged=true;
      const old=this.shapes[shapeIndex];
      // Immature growth and temporary leaf loss can change with world.tick
      // even while the decoder keeps the same Resource object.
      if(previous?.[sourceIndex]===r&&old?.id===r.id&&stable)continue;
      const size=floraSize(world,r);
      const ripe=r.kind==='berries'&&harvestable(world,r),leafless=plantLeafless(world,r);
      if(reset||!old||old.size!==size||old.species!==r.species||old.id!==r.id||old.kind!==r.kind||old.x!==r.x||old.z!==r.z||old.stone!==r.stone||old.ripe!==ripe||old.leafless!==leafless){
        changed=true;this.changes.set(r.id,{resource:r,size});
        if(partial||timed)this.shapes[shapeIndex]={size,species:r.species,id:r.id,kind:r.kind,x:r.x,z:r.z,stone:r.stone,leafless,ripe};
      }
    }
    if(nextNatural)this.naturalResources=nextNatural;
    if(partial){
      if(timePartitionChanged)this.timedSlots=[...this.timedSources].sort((a,b)=>a-b).map(i=>[i,this.sourceShapes[i]!] as const);
      timeInvariant=this.timedSources.size===0;
    }
    this.snapshotTimeInvariant=immutableSnapshot&&timeInvariant;
    if(!changed&&index===this.shapes.length)return;
    // The private partition contains current Resource references even after a
    // silent patch. Never expose its mutable array to a previously drawn view.
    if(partial||timed)return {...world,resources:this.naturalResources.slice()};
    const natural=this.naturalResources;
    const present=new Set(natural.map(r=>r.id));
    for(const old of this.shapes)if(!present.has(old.id))this.changes.set(old.id,{resource:undefined,size:0});
    this.shapes=natural.map((r,i)=>{
      const old=this.shapes[i];
      if(old?.id===r.id&&!this.changes.has(r.id))return old;
      return {size:this.changes.get(r.id)?.size??floraSize(world,r),species:r.species,id:r.id,kind:r.kind,x:r.x,z:r.z,stone:r.stone,leafless:plantLeafless(world,r),ripe:r.kind==='berries'&&harvestable(world,r)};
    });
    return {...world,resources:natural.slice()};
  }
}
