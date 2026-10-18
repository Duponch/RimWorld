import {createPlantGrowthReader,harvestable} from '../sim/plants';
import {plantLeafless} from '../sim/plant-life';
import {hydroponicBasinAt} from '../sim/hydroponics';
import type {Resource,World} from '../sim/types';
import type {SnapshotMessage} from './snapshots';
import {floraSize,isResidentCrop,type NaturalVisualDelta,type NaturalVisualUpsert} from './natural-appearance-values';

type Capture=Pick<Resource,'kind'|'x'|'z'|'stone'|'species'>&{
  size:number;ripe:boolean;leafless:boolean;harvestable:boolean;blighted:boolean;support:boolean;seen:number;
};
function same(before:Capture,r:Resource,size:number,ripe:boolean,leafless:boolean,ready:boolean,support:boolean):boolean {
  return before.kind===r.kind&&before.x===r.x&&before.z===r.z&&before.stone===r.stone&&before.species===r.species
    &&Object.is(before.size,size)&&before.ripe===ripe&&before.leafless===leafless&&before.harvestable===ready
    &&before.blighted===!!r.blight&&before.support===support;
}

/** A fixed-Worker publication observer, never an authoritative World field.
 * Exactly one current-value pass; no prediction, agenda, wall clock or PRNG.
 * The packet is the same publication encoded from world immediately before
 * this synchronous call. Public/mutable SnapshotEncoder remains unchanged. */
export class WorkerNaturalAppearance {
  private captures=new Map<number,Capture>();
  private epoch=0;
  private revision=0;
  private tick=-1;
  private visit=0;
  clear():void {this.captures.clear();this.epoch=0;this.revision=0;this.tick=-1;this.visit=0;}
  capture(world:World,publication:SnapshotMessage<true>):NaturalVisualDelta {
    const checkpoint=publication.kind==='checkpoint';
    if(!Number.isSafeInteger(publication.epoch)||publication.epoch<1||!Number.isSafeInteger(publication.revision)||publication.revision<1
      ||publication.world.tick!==world.tick||publication.world.seed!==world.seed||publication.world.width!==world.width
      ||publication.world.height!==world.height||publication.world.schemaVersion!==world.schemaVersion
      ||this.revision>0&&(publication.epoch<this.epoch||publication.epoch===this.epoch&&publication.revision<=this.revision))throw Error('Mismatched natural visual publication');
    if(!checkpoint&&(publication.epoch!==this.epoch||publication.baseRevision!==this.revision
      ||publication.revision!==this.revision+1||world.tick<this.tick))throw Error('Missing natural visual predecessor');
    const staged=new Map<number,Capture>(),removed=new Set<number>(),upsert:NaturalVisualUpsert[]=[],visit=++this.visit,
      physicalRemoved=!checkpoint&&publication.resources?.removed.length?new Set(publication.resources.removed):undefined;
    for(const id of physicalRemoved??[])if(this.captures.has(id))removed.add(id);
    const growth=createPlantGrowthReader(world);
    let current:Resource,value:number|undefined;
    // floraSize/harvestable consume this callback immediately. It is selected
    // once per resource; no per-resource closure or result Map is allocated.
    const readGrowth=():number=>value??(value=growth(current));
    for(let ordinal=0;ordinal<world.resources.length;ordinal++){
      const r=world.resources[ordinal]!,id=r.id;
      if(!Number.isSafeInteger(id)||id<=0||id>=world.nextId)throw Error('Invalid natural visual resource ID');
      if(physicalRemoved?.has(id))throw Error('Natural visual resource is both present and removed');
      const before=staged.get(id)??(!checkpoint?this.captures.get(id):undefined);
      if(before?.seen===visit)throw Error('Duplicate natural visual resource ID');
      if(before)before.seen=visit;
      if(isResidentCrop(r)){if(before)removed.add(id);continue;}
      current=r;value=undefined;
      const size=floraSize(world,r,readGrowth),ready=harvestable(world,r,readGrowth),ripe=r.kind==='berries'&&ready,
        leafless=plantLeafless(world,r),support=r.kind==='healroot'&&hydroponicBasinAt(world,r)!==undefined;
      if(!Number.isFinite(size)||size<=0||size>1)throw Error('Invalid natural visual size');
      if(before&&same(before,r,size,ripe,leafless,ready,support))continue;
      staged.set(id,{kind:r.kind,x:r.x,z:r.z,stone:r.stone,species:r.species,size,ripe,leafless,harvestable:ready,blighted:!!r.blight,support,seen:visit});
      upsert.push({id,ordinal,size,ripe,leafless,harvestable:ready});
    }
    // Only private visit stamps changed while preparing. A thrown numerical
    // query never changes published captures or the committed predecessor.
    if(checkpoint)this.captures=staged;
    else {for(const id of removed)this.captures.delete(id);for(const [id,capture]of staged)this.captures.set(id,capture);}
    this.epoch=publication.epoch;this.revision=publication.revision;this.tick=world.tick;
    return {epoch:publication.epoch,revision:publication.revision,...checkpoint?{}:{baseRevision:publication.baseRevision},tick:world.tick,
      checkpoint,upsert,removed:checkpoint?[]:[...removed]};
  }
}
