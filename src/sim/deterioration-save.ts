import {DETERIORATION_INTERVAL} from './deterioration-content.ts';
import type {World} from './types.ts';
import type {OwnedGeometryReuseWitness} from './owned-validation-geometry.ts';

const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const ownData=(v:object,key:string)=>{
 const d=Object.getOwnPropertyDescriptor(v,key);
 if(d){if(!Object.hasOwn(d,'value')||!d.enumerable)throw Error('Expected ordinary data.');return {present:true,value:d.value as unknown};}
 if(key in v)throw Error('Inherited domain.');
 return {present:false,value:undefined};
};
// Only these finite physical/archived owner domains can contain a forbidden
// local calendar. Never traverse grids, resource populations or planet topology.
const DOMAINS=['pawns','structures','jobs','packed','piles','wildlife','startingArrival','group','groupLosses',
 'scout','commercialTrip','civilianPost','visitors','podRescues','raids','prisonDepartures','arrivals','quests','orbital'] as const;
const SKIP=new Set(['tiles','resources','planet']);
function noOwnedClock(value:unknown,active=new WeakSet<object>()):boolean {
 if(!value||typeof value!=='object')return true;
 if(active.has(value))return false;
 active.add(value);
 try{
  if('deterioration' in value)return false;
  for(const key of Reflect.ownKeys(value)){
   if(typeof key!=='string')return false;
   if(SKIP.has(key))continue;
   const d=Object.getOwnPropertyDescriptor(value,key)!;
   if(!Object.hasOwn(d,'value'))return false;
   if(!noOwnedClock(d.value,active))return false;
  }
  return true;
 }finally{active.delete(value);}
}
function domainsClear(w:Record<string,unknown>,structures?:(value:unknown)=>boolean):boolean {
 return DOMAINS.every(key=>{
  const value=ownData(w,key).value;
  return key==='structures'&&structures?structures(value):noOwnedClock(value);
 });
}
function worldRecord(value:unknown):Record<string,unknown>|undefined {
 if(!record(value))return undefined;
 // A RAW world takes precedence over a misleading extra `world` field.
 // Packet envelopes carry schemaVersion only inside their genuine world.
 if(ownData(value,'schemaVersion').present)return value;
 const field=ownData(value,'world');
 return field.present?(record(field.value)?field.value:undefined):value;
}
/** Runs before any migration/reconstruction can discard a future local field.
 * Explicit undefined, inherited fields and getter domains are not absence. */
export function validDeteriorationHistoricalTransport(value:unknown,version:number):boolean {
 try{
  if(version>=252)return true;
  const w=worldRecord(value);if(!w)return false;
  if(ownData(w,'deterioration').present||!domainsClear(w))return false;
  const secondary=ownData(w,'secondarySite');
  if(secondary.present){
   if(!record(secondary.value))return false;
   const map=ownData(secondary.value,'map');
   if(!record(map.value)||ownData(map.value,'deterioration').present||!domainsClear(map.value))return false;
  }
  // Sparse records are outside packet.world until Decoder reconstruction.
  return w===value||record(value)&&['structures','piles'].every(key=>noOwnedClock(ownData(value,key).value));
 }catch{return false;}
}

/** A post-tick clock belongs to this map alone. No identity or terrain scan.
 * RAW campaign validation calls this once for each genuine map context. */
function validTransport(value:unknown,version:number,structures?:(value:unknown)=>boolean):boolean {
 try{
  if(version<252)return validDeteriorationHistoricalTransport(value,version);
  if(!record(value)||!integer(value.tick))return false;
  const field=ownData(value,'deterioration'),state=field.value;
  if(!field.present||!record(state)||Object.getPrototypeOf(state)!==Object.prototype
   ||Reflect.ownKeys(state).length!==3||!['revision','rng','lastTick'].every(key=>ownData(state,key).present)
   ||state.revision!==1||!integer(state.rng,1,0xffffffff)||!integer(state.lastTick,0,value.tick)
   ||value.tick-state.lastTick>=DETERIORATION_INTERVAL)return false;
  return domainsClear(value,structures);
 }catch{return false;}
}

/** Public/RAW callers always traverse every physical domain. No certificate
 * argument is admitted by this boundary, including historical/full callers. */
export function validDeteriorationTransport(value:unknown,version:number):boolean {
 return validTransport(value,version);
}

export interface OwnedDeteriorationOwner {
 validate(world:World,reuse?:OwnedGeometryReuseWitness):boolean;
 commit(world:World):void;
 discard():void;
}

/** One narrowly scoped fact for the closed native MAIN, with the same no-writer
 * ownership precondition as its resource/geometry owners. Constructing this
 * helper does not establish authority for an arbitrary mutable World.
 *
 * Only an empty, contiguous structural reconstruction that returns the EXACT
 * predecessor array can reuse its deep no-clock fact. Every upsert (including
 * same-tick same-ID), membership/order change, checkpoint or absent witness
 * takes the complete original walker. Other domains and the local clock are
 * always read at their historical frontier. No index/copy or per-item cache. */
export function createOwnedDeteriorationOwner():OwnedDeteriorationOwner {
 type Certificate={world:World;structures:World['structures']};
 let confirmed:Certificate|undefined,pending:Certificate|undefined;
 return {
  validate(world,reuse){
   pending=undefined;
   let clean:World['structures']|undefined;
   const valid=validTransport(world,world.schemaVersion,value=>{
    const base=confirmed;
    const unchanged=!!base&&!!reuse&&reuse.kind==='sparse'&&reuse.previous===base.world
      &&reuse.updatedOrdinals.length===0&&value===base.structures
      &&value===reuse.previous.structures&&world.schemaVersion===base.world.schemaVersion
      &&world.width===base.world.width&&world.height===base.world.height&&world.seed===base.world.seed;
    const clear=unchanged||noOwnedClock(value);
    if(clear&&Array.isArray(value))clean=value;
    return clear;
   });
   if(valid&&clean)pending={world,structures:clean};
   return valid;
  },
  // A clean domain in an otherwise refused candidate is never confirmed.
  commit(world){
   confirmed=pending?.world===world?pending:undefined;
   pending=undefined;
  },
  discard(){pending=undefined;},
 };
}
