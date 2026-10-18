import type {World} from '../sim/types';
import type {SnapshotMessage} from './snapshots';
import {isResidentCrop,type NaturalVisualDelta,type NaturalVisualUpsert} from './natural-appearance-values';

const PAGE=256,PRESENT=8;
const safe=(value:unknown,minimum=0):value is number=>Number.isSafeInteger(value)&&(value as number)>=minimum;
function record(value:unknown):value is Record<string,unknown> {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return false;
 return Reflect.ownKeys(value).every(key=>typeof key==='string'&&Object.getOwnPropertyDescriptor(value,key)?.enumerable===true&&Object.hasOwn(Object.getOwnPropertyDescriptor(value,key)!,'value'));
}
function array(value:unknown,maximum:number):value is unknown[] {
 if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>maximum)return false;
 const keys=Reflect.ownKeys(value);if(keys.length!==value.length+1)return false;
 for(let i=0;i<value.length;i++){const field=Object.getOwnPropertyDescriptor(value,String(i));if(!field||!field.enumerable||!Object.hasOwn(field,'value'))return false;}
 return keys.every(key=>key==='length'||typeof key==='string'&&/^(0|[1-9]\d*)$/.test(key)&&Number(key)<value.length);
}
const exactKeys=(value:Record<string,unknown>,keys:readonly string[])=>Object.keys(value).length===keys.length&&Object.keys(value).every(key=>keys.includes(key));
const emptyChanges:readonly number[]=Object.freeze([]);

export interface PreparedNaturalObservation {
 readonly size:number;readonly ripe:boolean;readonly leafless:boolean;readonly harvestable:boolean;
}
export interface PreparedNaturalFrame {
 readonly epoch:number;readonly revision:number;readonly tick:number;readonly naturalCount:number;
 lookup(id:number):PreparedNaturalObservation|undefined;
}
interface Page {readonly sizes:Float64Array;readonly flags:Uint8Array;readonly versions:Float64Array;count:number}
interface State {
 readonly owner:object;readonly domain:object;readonly epoch:number;readonly revision:number;readonly tick:number;
 readonly naturalCount:number;readonly orderRevision:number;readonly pages:ReadonlyMap<number,Page>;
 readonly frame:PreparedNaturalFrame;
}
const frames=new WeakMap<World,PreparedNaturalFrame>();
const states=new WeakMap<PreparedNaturalFrame,State>();
export function readPreparedNaturalFrame(world:World):PreparedNaturalFrame|undefined {return frames.get(world);}
function present(pages:ReadonlyMap<number,Page>,id:number):boolean {
 return !!((pages.get(Math.floor(id/PAGE))?.flags[id%PAGE]??0)&PRESENT);
}
/** Endpoint pages retain the exact target, even after newer adoption. No
 * intermediate World/frame chain is retained. Undefined asks for a complete
 * NUMERIC read, never for a growth forecast or weaker admission. */
export function collectPreparedNaturalChanges(previous:PreparedNaturalFrame,next:PreparedNaturalFrame):readonly number[]|undefined {
 const from=states.get(previous),to=states.get(next);
 if(!from||!to||from.owner!==to.owner||from.domain!==to.domain||from.epoch!==to.epoch||from.revision>to.revision||from.orderRevision!==to.orderRevision)return;
 if(from.pages===to.pages)return emptyChanges;
 const changed:number[]=[],keys=new Set([...from.pages.keys(),...to.pages.keys()]);
 for(const key of keys){
  const a=from.pages.get(key),b=to.pages.get(key);if(a===b)continue;
  for(let slot=0;slot<PAGE;slot++){
   const before=a?.flags[slot]??0,after=b?.flags[slot]??0;
   if(!(before&PRESENT)&&!(after&PRESENT))continue;
   if(before!==after||a?.versions[slot]!==b?.versions[slot])changed.push(key*PAGE+slot);
  }
 }
 return Object.freeze(changed.sort((a,b)=>a-b));
}
export interface PreparedNaturalDraft {readonly state:State;readonly previous:State|undefined}

/** @internal Only the fixed resident assembler owns this writer. Numeric pages
 * hold no World, Resource, packet, callback or mutable public array. */
export class PreparedNaturalFrameOwner {
 private readonly identity={};
 private current:State|undefined;
 clear():void {this.current=undefined;}
 prepare(world:World,publication:SnapshotMessage<true>,raw:unknown):PreparedNaturalDraft|undefined {
  const old=this.current,checkpoint=publication.kind==='checkpoint';
  if(!record(raw)||!exactKeys(raw,checkpoint?['epoch','revision','tick','checkpoint','upsert','removed']:['epoch','revision','tick','checkpoint','baseRevision','upsert','removed'])
   ||raw.epoch!==publication.epoch||raw.revision!==publication.revision||raw.tick!==world.tick||raw.checkpoint!==checkpoint
   ||!array(raw.upsert,world.resources.length)||!array(raw.removed,checkpoint?0:old?.naturalCount??0))return;
  if(!checkpoint&&(!old||old.epoch!==publication.epoch||raw.baseRevision!==publication.baseRevision||raw.baseRevision!==old.revision||publication.revision!==old.revision+1||world.tick<old.tick))return;
  const natural=raw as unknown as NaturalVisualDelta,ids=new Set<number>(),rows:NaturalVisualUpsert[]=[];
  for(const value of natural.upsert){
   if(!record(value)||!exactKeys(value,['id','ordinal','size','ripe','leafless','harvestable'])||!safe(value.id,1)||value.id>=world.nextId
    ||!safe(value.ordinal)||value.ordinal>=world.resources.length||ids.has(value.id)||typeof value.size!=='number'||!Number.isFinite(value.size)||value.size<=0||value.size>1
    ||typeof value.ripe!=='boolean'||typeof value.leafless!=='boolean'||typeof value.harvestable!=='boolean')return;
   const resource=world.resources[value.ordinal];
   if(!resource||resource.id!==value.id||isResidentCrop(resource)||value.ripe!==(resource.kind==='berries'&&value.harvestable))return;
   ids.add(value.id);rows.push(value as unknown as NaturalVisualUpsert);
  }
  const removed=new Set<number>();
  for(const id of natural.removed){if(!safe(id,1)||removed.has(id)||ids.has(id)||!old||!present(old.pages,id))return;removed.add(id);}
  let count=old?.naturalCount??0;
  if(checkpoint){
   count=0;
   for(const resource of world.resources)if(!isResidentCrop(resource)){count++;if(!ids.has(resource.id))return;}
   if(count!==rows.length||removed.size)return;
  }else{
   const required=new Set<number>(),born=new Set<number>();
   if(publication.resources){
    for(const id of publication.resources.removed)if(present(old!.pages,id))required.add(id);
    for(const resource of publication.resources.upserted){
     if(isResidentCrop(resource)){if(present(old!.pages,resource.id))required.add(resource.id);}
     else if(!present(old!.pages,resource.id))born.add(resource.id);
    }
   }
   if(required.size!==removed.size||[...required].some(id=>!removed.has(id))||[...born].some(id=>!ids.has(id)))return;
   for(const row of rows)if(!present(old!.pages,row.id)&&!born.has(row.id))return;
   count=count-removed.size+born.size;
  }
  let pages:ReadonlyMap<number,Page>=checkpoint?new Map():old!.pages;
  if(checkpoint||removed.size||rows.length){
   const next=new Map(pages),copies=new Map<number,Page>();
   const writable=(id:number):Page=>{
    const key=Math.floor(id/PAGE),held=copies.get(key);if(held)return held;
    const prior=next.get(key),page:Page=prior?{sizes:prior.sizes.slice(),flags:prior.flags.slice(),versions:prior.versions.slice(),count:prior.count}
     :{sizes:new Float64Array(PAGE),flags:new Uint8Array(PAGE),versions:new Float64Array(PAGE),count:0};
    copies.set(key,page);next.set(key,page);return page;
   };
   for(const id of removed){const page=writable(id),slot=id%PAGE;page.flags[slot]=0;page.sizes[slot]=0;page.versions[slot]=publication.revision;page.count--;}
   for(const row of rows){
    const page=writable(row.id),slot=row.id%PAGE;if(!(page.flags[slot]!&PRESENT))page.count++;
    page.sizes[slot]=row.size;page.flags[slot]=PRESENT|(row.ripe?1:0)|(row.leafless?2:0)|(row.harvestable?4:0);page.versions[slot]=publication.revision;
   }
   for(const [key,page]of copies)if(page.count===0)next.delete(key);
   pages=next;
  }
  const orderRevision=checkpoint?publication.revision:publication.resources&&Object.hasOwn(publication.resources,'order')?publication.revision:old!.orderRevision;
  const frame:PreparedNaturalFrame=Object.freeze({epoch:publication.epoch,revision:publication.revision,tick:world.tick,naturalCount:count,
   lookup:(id:number):PreparedNaturalObservation|undefined=>{
    if(!safe(id,1))return;const page=pages.get(Math.floor(id/PAGE)),slot=id%PAGE,flags=page?.flags[slot]??0;if(!(flags&PRESENT))return;
    return Object.freeze({size:page!.sizes[slot]!,ripe:!!(flags&1),leafless:!!(flags&2),harvestable:!!(flags&4)});
   }});
  const state:State={owner:this.identity,domain:checkpoint?{}:old!.domain,epoch:publication.epoch,revision:publication.revision,tick:world.tick,naturalCount:count,orderRevision,pages,frame};
  return {state,previous:old};
 }
 commit(world:World,draft:PreparedNaturalDraft):void {
  if(draft.state.owner!==this.identity||draft.previous!==this.current)throw Error('Lost natural frame preparation');
  this.current=draft.state;states.set(draft.state.frame,draft.state);frames.set(world,draft.state.frame);
 }
}
