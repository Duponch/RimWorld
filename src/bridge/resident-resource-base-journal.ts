import type {World} from '../sim/types';
import type {ResourceStructureCandidate,SnapshotResourceStructureEdge} from './snapshots';

export interface ResidentResourceBaseChanges {readonly edges:readonly SnapshotResourceStructureEdge[]}
interface Stamp {journal:ResidentResourceBaseJournal;generation:number;epoch:number;revision:number}
interface Record {readonly parentRevision:number;readonly edge:SnapshotResourceStructureEdge|undefined;readonly values:number}
const stamps=new WeakMap<World,Stamp>();
const empty:ResidentResourceBaseChanges=Object.freeze({edges:Object.freeze([])});

/** Internal publication capability for the closed resident lane. BASE means
 * actual upserts/membership, a conservative superset of spatial/classification
 * edits; packed growth tuples alone do not affect this witness. Full public
 * resource journals and value/reference reconstruction remain independent.
 * Records retain numerical metadata only, never a packet, Resource or World. */
export class ResidentResourceBaseJournal {
 private generation=0;
 private epoch=0;
 private revision=0;
 private budget=1024;
 private values=0;
 private readonly records=new Map<number,Record>();
 reset(world:World,epoch:number,revision:number,count:number):void {
  this.records.clear();this.values=0;this.generation++;this.epoch=epoch;this.revision=revision;
  this.budget=Number.isSafeInteger(count)&&count>=0?Math.min(131072,Math.max(1024,count*4)):1024;
  stamps.set(world,{journal:this,generation:this.generation,epoch,revision});
 }
 append(parent:World,world:World,epoch:number,revision:number,candidate:ResourceStructureCandidate|undefined,count:number):void {
  const previous=stamps.get(parent);
  if(!previous||previous.journal!==this||previous.generation!==this.generation||previous.epoch!==epoch
   ||epoch!==this.epoch||previous.revision!==this.revision||revision<=previous.revision){this.reset(world,epoch,revision,count);return;}
  const cost=candidate===undefined?0:4+2*(candidate.removed.length+candidate.added.length+candidate.updated.length);
  let edge:SnapshotResourceStructureEdge|undefined;
  if(candidate!==undefined&&cost<=this.budget){
   const placements=(edits:ResourceStructureCandidate['added'])=>Object.freeze(edits.map(edit=>Object.freeze({id:edit.id,afterOrdinal:edit.afterOrdinal})).sort((a,b)=>a.afterOrdinal-b.afterOrdinal));
   edge=Object.freeze({parentRevision:previous.revision,revision,beforeCount:candidate.beforeCount,afterCount:candidate.afterCount,
    removed:Object.freeze(candidate.removed.map(edit=>Object.freeze({id:edit.id,beforeOrdinal:edit.beforeOrdinal})).sort((a,b)=>a.beforeOrdinal-b.beforeOrdinal)),
    added:placements(candidate.added),updated:placements(candidate.updated)});
  }
  const values=edge===undefined?0:cost;
  this.records.set(revision,Object.freeze({parentRevision:previous.revision,edge,values}));this.values+=values;
  while(this.records.size>64||this.values>this.budget){const oldest=this.records.keys().next().value!;this.values-=this.records.get(oldest)!.values;this.records.delete(oldest);}
  this.revision=revision;stamps.set(world,{journal:this,generation:this.generation,epoch,revision});
 }
 read(from:Stamp,to:Stamp):ResidentResourceBaseChanges|undefined {
  if(from.generation!==this.generation||to.generation!==this.generation||from.epoch!==this.epoch||to.epoch!==this.epoch||from.revision>to.revision)return;
  if(from.revision===to.revision)return empty;
  const edges:SnapshotResourceStructureEdge[]=[];let revision=to.revision;
  while(revision>from.revision){
   const record=this.records.get(revision);
   if(!record||!record.edge||record.parentRevision<from.revision||record.parentRevision>=revision)return;
   edges.push(record.edge);revision=record.parentRevision;
  }
  return revision===from.revision?Object.freeze({edges:Object.freeze(edges.reverse())}):undefined;
 }
}

/** Edge ordinals belong to each publication; compose membership before reading
 * values from the exact target World. Unknown copies/order, gaps and overflow
 * grant no witness and keep the historical exhaustive consumer path. */
export function readResidentResourceBaseChanges(from:World,to:World):ResidentResourceBaseChanges|undefined {
 const before=stamps.get(from),after=stamps.get(to);
 return before&&after&&before.journal===after.journal?before.journal.read(before,after):undefined;
}
