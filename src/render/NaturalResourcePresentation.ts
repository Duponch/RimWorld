import { floraSize,isResidentCrop } from './flora-presentation';
import { plantLeafless } from '../sim/plant-life';
import { harvestable } from '../sim/plants';
import type { Resource,World } from '../sim/types';
import {readSnapshotChanges} from '../bridge/snapshot-changes';
import {NaturalPresentationEvents,NaturalIdPresentationEvents,composeFinalResourceStructure,type NaturalObservation,type NaturalIdSource} from './natural-presentation-events';

type Shape=Pick<Resource,'id'|'kind'|'x'|'z'|'stone'|'species'>&{ripe:boolean;leafless:boolean;size:number};
export type NaturalPresentationChange = { resource: Resource | undefined; size: number };
type IdSource=NaturalIdSource&{readonly shape:Shape|undefined;readonly timed:boolean;readonly eligible:boolean};
const timeDependent=(r:Resource):boolean=>(r.growth??1)!==1||r.plantLife?.leaflessAt!==undefined;
function shapeAt(world:World,r:Resource,observation?:NaturalObservation):Shape {
  return {id:r.id,kind:r.kind,x:r.x,z:r.z,stone:r.stone,species:r.species,
    size:observation?.size??floraSize(world,r),ripe:observation?.ripe??(r.kind==='berries'&&harvestable(world,r)),leafless:observation?.leafless??plantLeafless(world,r)};
}
function equalShape(a:Shape|undefined,b:Shape):boolean {
  return !!a&&a.id===b.id&&a.kind===b.kind&&a.x===b.x&&a.z===b.z&&a.stone===b.stone&&a.species===b.species
    &&a.size===b.size&&a.ripe===b.ripe&&a.leafless===b.leafless;
}
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
export class NaturalResourcePresentation {
  private shapes:Shape[]=[];
  private snapshotResources:readonly Resource[]|undefined;
  private snapshotTimeInvariant=false;
  private timedSlots:Array<readonly [sourceIndex:number,shapeIndex:number]>=[];
  private snapshotWorld:World|undefined;
  private sourceShapes:number[]=[];
  private naturalResources:Resource[]=[];
  private readonly timedSources=new Set<number>();
  private readonly events=new NaturalPresentationEvents();
  private idWorld:World|undefined;
  private readonly idSources=new Map<number,IdSource>();
  private readonly idTimed=new Set<number>();
  private idEligible=0;
  private nextOrder=0;
  private readonly idEvents=new NaturalIdPresentationEvents();
  private idAgenda=false;
  readonly changes=new Map<number,NaturalPresentationChange>();
  private clearIds():void {
    this.idWorld=undefined;this.idSources.clear();this.idTimed.clear();this.idEligible=0;this.nextOrder=0;this.idAgenda=false;this.idEvents.clear();
  }
  private releaseOrdinalCapture():void {
    this.shapes=[];this.snapshotResources=undefined;this.snapshotWorld=undefined;this.snapshotTimeInvariant=false;
    this.timedSlots=[];this.timedSources.clear();this.sourceShapes=[];this.naturalResources=[];this.events.clear();
  }
  /** Restore the last actually presented capture before the unchanged mutable/
   * unknown/checkpoint traversal. A fast-lane birth must not become a ghost. */
  private restoreOrdinalCapture():void {
    const natural=[...this.idSources.values()].filter(source=>source.natural).sort((a,b)=>a.order-b.order);
    this.releaseOrdinalCapture();this.shapes=natural.map(source=>source.shape!);this.naturalResources=natural.map(source=>source.resource);
  }
  private seedIds(world:World):void {
    this.clearIds();if(!readSnapshotChanges(world,world))return;
    let naturalOrdinal=0;
    for(let ordinal=0;ordinal<world.resources.length;ordinal++){
      const resource=world.resources[ordinal]!,id=resource.id,natural=!isResidentCrop(resource);
      if(!Number.isSafeInteger(id)||id<=0||this.idSources.has(id)){this.clearIds();return;}
      const timed=natural&&timeDependent(resource),eligible=timed&&(resource.species!==undefined||resource.kind==='healroot');
      const shape=natural?this.shapes[naturalOrdinal++]:undefined;
      if(natural&&(!shape||shape.id!==id)){this.clearIds();return;}
      this.idSources.set(id,{resource,order:ordinal,natural,shape,timed,eligible});
      if(timed)this.idTimed.add(id);if(eligible)this.idEligible++;
    }
    this.nextOrder=world.resources.length;this.idAgenda=this.idEligible>0;
    // The historical full capture just made its primitive predictions. Reuse
    // only after another fresh input/clock capture, never by reference alone.
    if(this.idAgenda&&!this.idEvents.initialize(world,this.idSources,this.events)){this.clearIds();return;}
    this.idWorld=world;this.releaseOrdinalCapture();
  }
  /** This changes only redundant dirtiness: final shapes, source order, slots,
   * buffers, bounds and necessary uploads remain the comparison contract. */
  private readIds(world:World):{view:World|undefined}|undefined {
    const from=this.idWorld;if(!from||from===world)return;
    const structure=composeFinalResourceStructure(from,world);
    if(!structure||structure.beforeCount!==this.idSources.size||this.nextOrder>Number.MAX_SAFE_INTEGER-structure.added.size)return;
    const undo=new Map<number,IdSource|undefined>(),oldTimed=new Map<number,boolean>(),eligible=this.idEligible,order=this.nextOrder;
    const remember=(id:number):void=>{if(!undo.has(id)){undo.set(id,this.idSources.get(id));oldTimed.set(id,this.idTimed.has(id));}};
    const replace=(id:number,next:IdSource|undefined):void=>{
      remember(id);const old=this.idSources.get(id);if(old?.eligible)this.idEligible--;
      this.idTimed.delete(id);if(next){this.idSources.set(id,next);if(next.timed)this.idTimed.add(id);if(next.eligible)this.idEligible++;}else this.idSources.delete(id);
    };
    const rollback=():void=>{
      for(const [id,old]of undo){if(old)this.idSources.set(id,old);else this.idSources.delete(id);if(oldTimed.get(id))this.idTimed.add(id);else this.idTimed.delete(id);}
      this.idEligible=eligible;this.nextOrder=order;this.idEvents.clear();
    };
    try {
      for(const id of structure.removed)replace(id,undefined);
      const present=[...structure.present].sort((a,b)=>a[1]-b[1]);
      for(const [id,ordinal]of present){
        const resource=world.resources[ordinal]!,old=this.idSources.get(id),natural=!isResidentCrop(resource);
        if(!old&&!structure.added.has(id)){rollback();return;}
        const timed=natural&&timeDependent(resource),eligible=timed&&(resource.species!==undefined||resource.kind==='healroot');
        replace(id,{resource,order:old?.order??this.nextOrder++,natural,shape:old?.shape,timed,eligible});
      }
      if(this.idSources.size!==structure.afterCount){rollback();return;}
      let affected=new Set(structure.present.keys()),observations:ReadonlyMap<number,NaturalObservation>|undefined;
      const agenda=this.idEligible>0;
      if(agenda!==this.idAgenda){
        this.idEvents.clear();
        if(agenda){observations=this.idEvents.initialize(world,this.idSources);if(!observations){rollback();return;}}
        for(const id of this.idTimed)affected.add(id);
      }else if(agenda){
        const result=this.idEvents.read(from,world,this.idSources,structure);if(!result){rollback();return;}
        affected=new Set(result.affected);observations=result.observations;
      }else for(const id of this.idTimed)affected.add(id);
      const changes=new Map<number,NaturalPresentationChange>();
      let changed=false;
      for(const id of [...affected].filter(id=>this.idSources.has(id)).sort((a,b)=>this.idSources.get(a)!.order-this.idSources.get(b)!.order)){
        const source=this.idSources.get(id)!,old=undo.has(id)?undo.get(id):source;
        if(!source.natural){if(old?.natural)changed=true;continue;}
        const shape=shapeAt(world,source.resource,observations?.get(id));
        if(!old?.natural||structure.added.has(id)||!equalShape(old.shape,shape)){
          changed=true;changes.set(id,{resource:source.resource,size:shape.size});
        }
        replace(id,{...source,shape});
      }
      // A remove/rebirth may be present, or may finish as a crop. Only the
      // final C decides removals; invisible intermediate plants are not drawn.
      const absent=[...undo].filter(([id,old])=>old?.natural&&!this.idSources.get(id)?.natural).sort((a,b)=>a[1]!.order-b[1]!.order);
      for(const [id]of absent){changed=true;changes.set(id,{resource:undefined,size:0});}
      this.idWorld=world;this.idAgenda=agenda;this.changes.clear();for(const [id,value]of changes)this.changes.set(id,value);
      if(!changed)return {view:undefined};
      // Successful ledger updates keep survivor Map insertion order and append
      // births in final ordinal order. Only the rollback fallback needs a sort.
      const natural=[...this.idSources.values()].filter(source=>source.natural).map(source=>source.resource);
      return {view:{...world,resources:natural}};
    }catch{rollback();return;}
  }
  /** Public mutable callers keep the original complete capture. A boolean is
   * never enough to certify an edge; the private decoder journal is required. */
  read(world:World,reset=false,immutableSnapshot=false):World|undefined {
    if(this.idWorld){
      if(immutableSnapshot&&!reset){const result=this.readIds(world);if(result)return result.view;}
      this.restoreOrdinalCapture();this.clearIds();
    }
    const view=this.readHistorical(world,reset,immutableSnapshot);
    if(immutableSnapshot)this.seedIds(world);return view;
  }
  private initializeEvents(world:World,immutableSnapshot:boolean):void {
    // Legacy trees have a constant size and their few berry curves are cheap
    // in the original timed traversal. Do not rebuild an agenda for those maps.
    if(this.timedSlots.some(([source])=>world.resources[source]!.species!==undefined||world.resources[source]!.kind==='healroot'))
      this.events.initialize(world,this.sourceShapes,immutableSnapshot);
    else this.events.clear();
  }
  /** SnapshotDecoder replaces edited resources instead of mutating them. Only
   * callers with that guarantee may enable the reference shortcut. */
  private readHistorical(world:World,reset=false,immutableSnapshot=false):World|undefined {
    this.changes.clear();
    if(reset||!immutableSnapshot)this.events.clear();
    const priorWorld=immutableSnapshot&&!reset?this.snapshotWorld:undefined;
    this.snapshotWorld=immutableSnapshot?world:undefined;
    const previous=immutableSnapshot&&!reset?this.snapshotResources:undefined;
    const eventRead=priorWorld?this.events.read(priorWorld,world):undefined;
    // Without an event witness the historical traversal below remains intact.
    // Its later initialize recaptures all current inputs before reusing any
    // primitive forecast; no saved forecast can replace that traversal.
    if(!eventRead&&previous===world.resources&&this.snapshotTimeInvariant){
      this.initializeEvents(world,immutableSnapshot);return;
    }
    this.snapshotResources=immutableSnapshot?world.resources:undefined;
    // Only the same immutable array can retain this partition. A new array
    // or mutable caller still captures every slot and its original order.
    const timed=!eventRead&&previous===world.resources?this.timedSlots:undefined;
    const journal=eventRead?.changes??(!timed&&priorWorld?readSnapshotChanges(priorWorld,world):undefined);
    // A crop/natural classification edit changes our source-to-shape partition.
    // Retain the complete original traversal for that case.
    const partial=eventRead?.indices??(journal&&this.sourceShapes.length===world.resources.length&&journal.resourceIndices.every(i=>(this.sourceShapes[i]!==-1)===!isResidentCrop(world.resources[i]!))
      ?mergeSources(journal.resourceIndices,this.timedSlots):undefined);
    if(!timed&&!partial){this.timedSlots=[];this.timedSources.clear();this.sourceShapes=[];}
    const nextNatural=!timed&&!partial?[] as Resource[]:undefined;
    let fullEventsInitialized=false,fullObservations:ReadonlyMap<number,NaturalObservation>|undefined;
    if(nextNatural&&immutableSnapshot){
      // Capture the current partition before forecasting; the complete shape
      // traversal below still compares each original ordinal and current ref.
      let shape=0,eligible=false;
      this.sourceShapes=world.resources.map(r=>{
        if(isResidentCrop(r))return -1;
        if(((r.growth??1)!==1||r.plantLife?.leaflessAt!==undefined)&&(r.species!==undefined||r.kind==='healroot'))eligible=true;
        return shape++;
      });
      if(eligible)fullObservations=this.events.initialize(world,this.sourceShapes,true);
      else this.events.clear();
      fullEventsInitialized=true;
    }
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
      const observation=eventRead?.observations.get(r.id)??fullObservations?.get(r.id);
      const size=observation?.size??floraSize(world,r);
      const ripe=observation?.ripe??(r.kind==='berries'&&harvestable(world,r)),leafless=observation?.leafless??plantLeafless(world,r);
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
    if(!changed&&index===this.shapes.length){
      if(!eventRead&&!fullEventsInitialized)this.initializeEvents(world,immutableSnapshot);return;
    }
    // The private partition contains current Resource references even after a
    // silent patch. Never expose its mutable array to a previously drawn view.
    if(partial||timed){
      if(!eventRead&&!fullEventsInitialized)this.initializeEvents(world,immutableSnapshot);
      return {...world,resources:this.naturalResources.slice()};
    }
    const natural=this.naturalResources;
    const present=new Set(natural.map(r=>r.id));
    for(const old of this.shapes)if(!present.has(old.id))this.changes.set(old.id,{resource:undefined,size:0});
    this.shapes=natural.map((r,i)=>{
      const old=this.shapes[i];
      if(old?.id===r.id&&!this.changes.has(r.id))return old;
      const observation=fullObservations?.get(r.id);
      return {size:this.changes.get(r.id)?.size??observation?.size??floraSize(world,r),species:r.species,id:r.id,kind:r.kind,x:r.x,z:r.z,stone:r.stone,leafless:observation?.leafless??plantLeafless(world,r),ripe:observation?.ripe??(r.kind==='berries'&&harvestable(world,r))};
    });
    if(!eventRead&&!fullEventsInitialized)this.initializeEvents(world,immutableSnapshot);
    return {...world,resources:natural.slice()};
  }
}
