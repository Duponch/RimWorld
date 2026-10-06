import type {Resource,World} from '../sim/types';
import {readSnapshotChanges,sameSnapshotChangeDomain} from '../bridge/snapshot-changes';
import {WORLD_SCALE} from '../world/scale';
import {isClusterPlantSpecies,isResidentCrop} from './flora-presentation';
import type {NaturalPresentationChange} from './NaturalResourcePresentation';

declare const frameBrand:unique symbol;
export type SceneResourceFrame={readonly [frameBrand]:true};
export type RockCoverEdit=Readonly<{before:number|undefined;after:number|undefined}>;
export interface SceneResourceChunks {
  readonly emptiedKeys:readonly string[];
  readonly changedChunks:readonly Readonly<{key:string;resources:readonly Resource[]}>[];
}
export interface SceneResourceAccess {
  readonly rockCoverEdits:readonly RockCoverEdit[]|undefined;
  treeAt(cell:number):number|undefined;
  chunksFor(changes?:ReadonlyMap<number,NaturalPresentationChange>,additionalKeys?:ReadonlySet<string>):SceneResourceChunks|undefined;
}
type Capture={id:number;kind:Resource['kind'];species:Resource['species'];x:number;z:number;key:string|undefined;tree:number|undefined;rock:number|undefined};
type FrameRecord={owner:SceneResourceIndex;generation:number;world:World;from:World|undefined;
  resources:readonly Resource[];tick:number;seed:number;width:number;height:number;
  oldKeys:ReadonlyMap<number,string>;edits:readonly RockCoverEdit[]|undefined;active:boolean};
const frames=new WeakMap<SceneResourceFrame,FrameRecord>();
const records=new WeakSet<FrameRecord>();
const capture=(world:World,r:Resource):Capture=>{
  const built=!isResidentCrop(r)&&!isClusterPlantSpecies(r.species),cell=r.z*world.width+r.x;
  return {id:r.id,kind:r.kind,species:r.species,x:r.x,z:r.z,
    key:built?`${Math.floor(r.x/WORLD_SCALE.chunkSize)}:${Math.floor(r.z/WORLD_SCALE.chunkSize)}`:undefined,
    tree:built&&r.kind==='tree'?cell:undefined,rock:r.kind==='rock'?cell:undefined};
};
const same=(a:Capture,b:Resource):boolean=>a.id===b.id&&a.kind===b.kind&&a.species===b.species&&a.x===b.x&&a.z===b.z;
function insert(bucket:number[],source:number):void {
  if(!bucket.length||bucket[bucket.length-1]!<source){bucket.push(source);return;}
  let low=0,high=bucket.length;while(low<high){const middle=(low+high)>>>1;if(bucket[middle]!<source)low=middle+1;else high=middle;}
  if(bucket[low]!==source)bucket.splice(low,0,source);
}
function remove<K>(buckets:Map<K,number[]>,key:K|undefined,source:number):void {
  if(key===undefined)return;const bucket=buckets.get(key);if(!bucket)return;
  const at=bucket.indexOf(source);if(at>=0)bucket.splice(at,1);if(!bucket.length)buckets.delete(key);
}
function add<K>(buckets:Map<K,number[]>,key:K|undefined,source:number):void {
  if(key===undefined)return;let bucket=buckets.get(key);if(!bucket){bucket=[];buckets.set(key,bucket);}insert(bucket,source);
}

/** Renderer-owned structural projection. Resource values/curves remain in the
 * exact applied World; only private primitive memberships persist here. */
export class SceneResourceIndex {
  #generation=0;
  #world:World|undefined;
  #map:Readonly<{seed:number;width:number;height:number}>|undefined;
  #captures:Capture[]=[];
  #byId=new Map<number,number>();
  #chunks=new Map<string,number[]>();
  #trees=new Map<number,number[]>();
  clear():void {this.#generation++;this.#world=undefined;this.#map=undefined;this.#captures=[];this.#byId.clear();this.#chunks.clear();this.#trees.clear();}
  adopt(world:World,reset=false):SceneResourceFrame {
    const from=this.#world,generation=++this.#generation;
    const sameMap=!!from&&!!this.#map&&this.#map.seed===world.seed&&this.#map.width===world.width&&this.#map.height===world.height
      &&from.seed===this.#map.seed&&from.width===this.#map.width&&from.height===this.#map.height;
    // Same-object reuse is a fresh decision, never a self-witness shortcut.
    const journal=!reset&&from&&from!==world&&sameMap
      ?readSnapshotChanges(from,world):undefined;
    let sparse=!!journal&&this.#captures.length===world.resources.length;
    if(sparse)for(const source of journal!.resourceIndices){
      const old=this.#captures[source],next=world.resources[source];
      if(!old||!next||old.id!==next.id||(old.key!==undefined)!==(!isResidentCrop(next)&&!isClusterPlantSpecies(next.species))){sparse=false;break;}
    }
    // This full diff owns both complete primitive sets; it does not manufacture
    // a sparse journal. Self reads and the common active domain gate restrict
    // which consumer may use the balance; neither replaces exhaustive reads.
    const fullCover=!sparse&&!reset&&from&&from!==world&&sameMap
      &&readSnapshotChanges(from,from)!==undefined&&readSnapshotChanges(world,world)!==undefined
      &&sameSnapshotChangeDomain(from,world);
    const balance=fullCover?new Map<number,number>():undefined;
    const oldKeys=new Map<number,string>(),edits:RockCoverEdit[]=[];
    let valid=Number.isSafeInteger(world.width)&&world.width>0&&Number.isSafeInteger(world.height)&&world.height>0;
    const validResource=(r:Resource)=>Number.isSafeInteger(r.id)&&r.id>0&&Number.isSafeInteger(r.x)&&Number.isSafeInteger(r.z)
      &&r.x>=0&&r.z>=0&&r.x<world.width&&r.z<world.height;
    if(sparse){
      for(const source of journal!.resourceIndices){
        const r=world.resources[source]!,old=this.#captures[source]!;
        if(!validResource(r)){valid=false;break;}
        if(same(old,r))continue;
        const next=capture(world,r);
        if(old.key!==undefined)oldKeys.set(old.id,old.key);
        remove(this.#chunks,old.key,source);remove(this.#trees,old.tree,source);
        add(this.#chunks,next.key,source);add(this.#trees,next.tree,source);this.#captures[source]=next;
        if(old.rock!==next.rock)edits.push(Object.freeze({before:old.rock,after:next.rock}));
      }
    }else if(!reset&&sameMap){
      // An absent sparse suffix still scans EVERY current primitive and ID.
      // Only structural allocations are reused, never previous validation.
      const seen=new Set<number>(),length=this.#captures.length;
      for(let source=0;source<world.resources.length;source++){
        const r=world.resources[source]!;
        if(!validResource(r)||seen.has(r.id)){valid=false;break;}
        seen.add(r.id);
        const old=this.#captures[source];
        if(old&&same(old,r))continue;
        const next=capture(world,r);
        if(old){
          if(old.key!==undefined)oldKeys.set(old.id,old.key);
          remove(this.#chunks,old.key,source);remove(this.#trees,old.tree,source);
          // A moved ID may already have acquired its new ordinal. Deleting it
          // unconditionally would erase a completed earlier slot in an ID cycle.
          if(this.#byId.get(old.id)===source)this.#byId.delete(old.id);
          if(balance&&old.rock!==undefined)balance.set(old.rock,(balance.get(old.rock)??0)-1);
        }
        this.#captures[source]=next;this.#byId.set(next.id,source);
        add(this.#chunks,next.key,source);add(this.#trees,next.tree,source);
        if(balance&&next.rock!==undefined)balance.set(next.rock,(balance.get(next.rock)??0)+1);
      }
      if(valid){
        for(let source=world.resources.length;source<length;source++){
          const old=this.#captures[source]!;
          if(old.key!==undefined)oldKeys.set(old.id,old.key);
          remove(this.#chunks,old.key,source);remove(this.#trees,old.tree,source);
          if(this.#byId.get(old.id)===source)this.#byId.delete(old.id);
          if(balance&&old.rock!==undefined)balance.set(old.rock,(balance.get(old.rock)??0)-1);
        }
        this.#captures.length=world.resources.length;
      }
    }else{
      for(const old of this.#captures){
        if(old.key!==undefined)oldKeys.set(old.id,old.key);
        if(balance&&old.rock!==undefined)balance.set(old.rock,(balance.get(old.rock)??0)-1);
      }
      this.#captures=[];this.#byId.clear();this.#chunks.clear();this.#trees.clear();
      for(let source=0;source<world.resources.length;source++){
        const r=world.resources[source]!;
        if(!validResource(r)||this.#byId.has(r.id)){valid=false;break;}
        const next=capture(world,r);this.#captures.push(next);this.#byId.set(next.id,source);
        add(this.#chunks,next.key,source);add(this.#trees,next.tree,source);
        if(balance&&next.rock!==undefined)balance.set(next.rock,(balance.get(next.rock)??0)+1);
      }
    }
    if(!valid){this.clear();const invalid=Object.freeze({}) as SceneResourceFrame;return invalid;}
    if(balance){
      // No partial result escapes an invalid capture. Net removals precede
      // additions, preserving overlap counts without transient underflow.
      for(const [cell,delta]of balance)for(let n=delta;n<0;n++)edits.push(Object.freeze({before:cell,after:undefined}));
      for(const [cell,delta]of balance)for(let n=0;n<delta;n++)edits.push(Object.freeze({before:undefined,after:cell}));
    }
    this.#world=world;
    if(!this.#map||this.#map.seed!==world.seed||this.#map.width!==world.width||this.#map.height!==world.height)
      this.#map=Object.freeze({seed:world.seed,width:world.width,height:world.height});
    const frame=Object.freeze({}) as SceneResourceFrame;
    const record:FrameRecord={owner:this,generation,world,from,resources:world.resources,tick:world.tick,seed:world.seed,width:world.width,height:world.height,
      oldKeys,edits:sparse||balance?Object.freeze(edits):undefined,active:true};
    frames.set(frame,record);records.add(record);
    // No retained asynchronous authority. Arrays materialized below stay fixed.
    queueMicrotask(()=>{record.active=false;frames.delete(frame);});return frame;
  }
  /** These methods accept only the module-private record, never a public flag. */
  accepts(record:FrameRecord):boolean {return records.has(record)&&record.owner===this&&record.active&&record.generation===this.#generation&&record.world===this.#world
    &&record.resources===record.world.resources&&record.tick===record.world.tick&&record.seed===record.world.seed&&record.width===record.world.width&&record.height===record.world.height;}
  treeAt(record:FrameRecord,cell:number):number|undefined {
    if(!this.accepts(record))return;const bucket=this.#trees.get(cell),source=bucket?.at(-1);
    return source===undefined?undefined:record.resources[source]?.id;
  }
  chunksFor(record:FrameRecord,changes?:ReadonlyMap<number,NaturalPresentationChange>,additionalKeys?:ReadonlySet<string>):SceneResourceChunks|undefined {
    if(!this.accepts(record))return;
    const affected=new Set(additionalKeys);
    if(changes)for(const [id]of changes){
      const old=record.oldKeys.get(id),source=this.#byId.get(id),key=source===undefined?undefined:this.#captures[source]?.key;
      if(old!==undefined)affected.add(old);if(key!==undefined)affected.add(key);
    }else{for(const key of this.#chunks.keys())affected.add(key);for(const key of record.oldKeys.values())affected.add(key);}
    const emptiedKeys:string[]=[],active:Array<readonly [string,number[]]>=[];
    for(const key of affected){const members=this.#chunks.get(key);if(members?.length)active.push([key,members]);else emptiedKeys.push(key);}
    active.sort((a,b)=>a[1][0]!-b[1][0]!);
    return Object.freeze({emptiedKeys:Object.freeze(emptiedKeys),changedChunks:Object.freeze(active.map(([key,members])=>Object.freeze({key,
      resources:Object.freeze(members.map(source=>record.resources[source]!))}))) });
  }
}

/** from, when supplied, must be this projection's exact predecessor. A handle
 * cannot apply index B→C contributions to a consumer still holding A. */
export function readSceneResourceFrame(frame:SceneResourceFrame|undefined,world:World,from?:World):SceneResourceAccess|undefined {
  if(!frame)return;const record=frames.get(frame);
  if(!record||!record.owner.accepts(record)||record.world!==world||record.resources!==world.resources
    ||record.tick!==world.tick||record.seed!==world.seed||record.width!==world.width||record.height!==world.height
    ||from!==undefined&&record.from!==from)return;
  return Object.freeze({rockCoverEdits:from===undefined?undefined:record.edits,
    treeAt:(cell:number)=>record.owner.treeAt(record,cell),
    chunksFor:(changes?:ReadonlyMap<number,NaturalPresentationChange>,additionalKeys?:ReadonlySet<string>)=>record.owner.chunksFor(record,changes,additionalKeys)});
}
