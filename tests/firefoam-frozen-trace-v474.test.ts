// PRIVATE, NOT RUN. ROOT only, after native-leaf + frozen-trace patches.
import {expect,test,vi} from 'vitest';
import {ResidentFilthFrameOwner,isOwnedResidentFilthCopyInternal} from '../src/bridge/resident-filth-section';
import {createFirefoamLaneValidatorsInternal290,validFirefoamHistoricalTransport290,validFirefoamWorld290} from '../src/sim/firefoam-save-290';
import type {SnapshotMessage} from '../src/bridge/snapshots';
import type {World} from '../src/sim/types';
import type {FilthRecord} from '../src/sim/filth-rules';
import {deconstructionCamp} from './scenarios/deconstruction';

type Data=Record<string,unknown>;
const foam=(id=71,tick=20)=>({id,kind:'firefoam',x:2,z:3,thickness:1,grownCore:tick*10,expiresAfterCore:300000,nextCheckCore:tick*10+1});
/** Real private-copy construction. This transport query fixture does not claim
 * full SAVE admission, a played emission, or authoritative clock movement. */
function owned(row:Data):Data {
 const owner=new ResidentFilthFrameOwner();
 const packet={type:'snapshot',kind:'checkpoint',epoch:1,revision:1,stepMs:0,speed:0,
  world:{tick:20,nextId:Number.MAX_SAFE_INTEGER,width:16,height:16,filth:0}} as unknown as SnapshotMessage<true>;
 const raw={epoch:1,revision:1,tick:20,checkpoint:true,section:{mode:'literal',value:{items:[row]}}};
 const draft=owner.prepare(packet,raw);
 if(!draft||draft==='stale')throw Error('Missing genuine private copy fixture');
 const copy=draft.packet.world.filth!.items[0]! as unknown as Data;
 expect(isOwnedResidentFilthCopyInternal(copy)).toBe(true);expect(Object.isFrozen(copy)).toBe(true);
 return copy;
}
function validators(){
 const proof=vi.fn(isOwnedResidentFilthCopyInternal);
 const fast=createFirefoamLaneValidatorsInternal290(Object.getOwnPropertyDescriptor,undefined,proof);
 return {fast,proof};
}
const trace=(row:object)=>({filth:{items:[row]}});
function pair(raw:unknown,version:number,fast:ReturnType<typeof validators>['fast']):boolean {
 const expected=validFirefoamHistoricalTransport290(raw,version),actual=fast.historical(raw,version);
 expect(actual).toBe(expected);return actual;
}

test('only genuine copied identities acquire one reusable positive trace body',()=>{
 const {fast,proof}=validators(),row=owned({...foam(),kind:'dirt'}),before=structuredClone(row);
 for(let n=0;n<4;n++)expect(pair(trace(row),293,fast)).toBe(true);
 expect(proof).toHaveBeenCalledTimes(1);expect(proof).toHaveBeenCalledWith(row);expect(row).toStrictEqual(before);
 expect(isOwnedResidentFilthCopyInternal(structuredClone(row))).toBe(false);
 expect(isOwnedResidentFilthCopyInternal(new Proxy(row,{}))).toBe(false);
 expect(isOwnedResidentFilthCopyInternal(Object.freeze({...row}))).toBe(false);
});

test('positive versions are exact and a refused version never borrows another success',()=>{
 const {fast,proof}=validators(),row=owned(foam());
 expect(pair(trace(row),293,fast)).toBe(true);expect(proof).toHaveBeenCalledTimes(1);
 expect(pair(trace(row),289,fast)).toBe(false);expect(proof).toHaveBeenCalledTimes(1);
 expect(pair(trace(row),293,fast)).toBe(true);expect(proof).toHaveBeenCalledTimes(1);
 expect(pair(trace(row),290,fast)).toBe(true);expect(proof).toHaveBeenCalledTimes(2);
 expect(pair(trace(row),293,fast)).toBe(true);expect(proof).toHaveBeenCalledTimes(3);
});

test('trace success is never reused for thing, carried, health or local actor contexts',()=>{
 const {fast}=validators(),row=owned(foam());expect(pair(trace(row),293,fast)).toBe(true);
 for(const raw of [{items:[row]},{filthFeet:{carried:[row]}},{health:row},{pawns:[row]}])expect(pair(raw,293,fast)).toBe(false);
 expect(pair(trace(row),293,fast)).toBe(true);
});

test('mutable, externally frozen and wrapped objects retain the complete body',()=>{
 const {fast,proof}=validators(),row={...foam(),kind:'dirt'};
 expect(pair(trace(row),293,fast)).toBe(true);expect(pair(trace(row),293,fast)).toBe(true);
 expect(proof).toHaveBeenCalledTimes(2);row.kind='firefoam-popper';expect(pair(trace(row),293,fast)).toBe(false);
 const external=Object.freeze({...foam(),kind:'dirt'});expect(pair(trace(external),293,fast)).toBe(true);expect(pair(trace(external),293,fast)).toBe(true);
 expect(proof).toHaveBeenCalledTimes(4);
 const target={...foam(),kind:'dirt'},wrapper=new Proxy(target,{});
 expect(pair(trace(wrapper),293,fast)).toBe(true);target.kind='firefoam-popper';expect(pair(trace(wrapper),293,fast)).toBe(false);
 const hidden=new Proxy({...foam(),kind:'dirt',firefoam290:{}},{has:(value,key)=>key==='firefoam290'?false:Reflect.has(value,key)});
 expect(pair(trace(hidden),293,fast)).toBe(false);
});

test.each(['kind','firefoam290','firefoamTask290','coveredInFirefoam290'] as const)('cached trace still checks live inherited %s after its ancestors were visited',key=>{
 const {fast,proof}=validators(),source:Data={...foam(),kind:'dirt'};if(key==='kind')delete source.kind;
 const row=owned(source);expect(pair(trace(row),293,fast)).toBe(true);expect(proof).toHaveBeenCalledTimes(1);
 const previous=Object.getOwnPropertyDescriptor(Object.prototype,key);
 const polluted=()=>{
  let set=false;
  // Parent records are already checked before dense(array) reads length.
  // This therefore exercises the row's own live reserved fence on a hit.
  const items=new Proxy([row],{get(target,name,receiver){
   if(name==='length'&&!set){set=true;Object.defineProperty(Object.prototype,key,{value:key==='kind'?'firefoam-popper':{},enumerable:false,configurable:true});}
   return Reflect.get(target,name,receiver);
  }});
  return {filth:{items}};
 };
 try{
  expect(validFirefoamHistoricalTransport290(polluted(),293)).toBe(false);
 }finally{if(previous)Object.defineProperty(Object.prototype,key,previous);else Reflect.deleteProperty(Object.prototype,key);}
 try{
  expect(fast.historical(polluted(),293)).toBe(false);
 }finally{if(previous)Object.defineProperty(Object.prototype,key,previous);else Reflect.deleteProperty(Object.prototype,key);}
 expect(proof).toHaveBeenCalledTimes(1);expect(pair(trace(row),293,fast)).toBe(true);
});

test.each([
 {firefoam290:undefined},{firefoamTask290:undefined},{coveredInFirefoam290:undefined},
 {firefoamTask290:{structureId:1,phase:'approach',progressCore:0,lastWorkedAt:0}},
 {coveredInFirefoam290:{remainingCore:1}},
])('even genuine copies with forbidden own trace fields never become positive: %j',extra=>{
 const {fast,proof}=validators(),row=owned({...foam(),kind:'dirt',...extra});
 expect(pair(trace(row),293,fast)).toBe(false);expect(pair(trace(row),293,fast)).toBe(false);expect(proof).not.toHaveBeenCalled();
});

function local(){
 const w=deconstructionCamp(1,16),id=w.nextId++,row=owned(foam(id,w.tick)) as unknown as FilthRecord;
 w.filth={rng:123,cleaned:0,items:[row]};return {w,row};
}
function worldPair(w:World,fast:ReturnType<typeof validators>['fast']):boolean {
 const expected=validFirefoamWorld290(w),actual=fast.world(w);expect(actual).toBe(expected);return actual;
}

test('a positive body from a late rejected World is reusable while the clock is revalidated on retry',()=>{
 const {fast,proof}=validators(),{w}=local(),tick=w.tick;
 expect(validFirefoamWorld290(w)).toBe(true);
 w.tick=tick+1;expect(worldPair(w,fast)).toBe(false);expect(proof).toHaveBeenCalledTimes(1);
 w.tick=tick;expect(worldPair(w,fast)).toBe(true);expect(proof).toHaveBeenCalledTimes(1);
 w.tick=tick+1;expect(worldPair(w,fast)).toBe(false);expect(proof).toHaveBeenCalledTimes(1);
});

test('cache hits preserve nextId and local cell bounds independently of the immutable row',()=>{
 const {fast,proof}=validators(),{w,row}=local(),nextId=w.nextId,width=w.width;
 expect(worldPair(w,fast)).toBe(true);expect(proof).toHaveBeenCalledTimes(1);
 w.nextId=row.id;expect(worldPair(w,fast)).toBe(false);w.nextId=nextId;
 w.width=row.x;expect(worldPair(w,fast)).toBe(false);w.width=width;
 expect(worldPair(w,fast)).toBe(true);expect(proof).toHaveBeenCalledTimes(1);
});

test('cache hits still collect trace identities for the real wave source ownership fence',()=>{
 const {fast,proof}=validators(),{w,row}=local();expect(worldPair(w,fast)).toBe(true);
 const center={x:row.x,z:row.z};
 w.firefoam290={rng:1,waves:[{id:w.nextId++,sourceId:row.id,center,startedAtCore:w.tick*10,advancedAtCore:w.tick*10,
  cells:[center.z*w.width+center.x],damageOnlyCells:[],nextCell:1,affectedActorKeys:[]}]};
 expect(worldPair(w,fast)).toBe(false);expect(proof).toHaveBeenCalledTimes(1);
 w.filth!.items=[];expect(worldPair(w,fast)).toBe(true);
 w.filth!.items=[row];expect(worldPair(w,fast)).toBe(false);expect(proof).toHaveBeenCalledTimes(1);
});

test('outer cycles are still rejected despite an already positive trace leaf',()=>{
 const {fast}=validators(),row=owned(foam());expect(pair(trace(row),293,fast)).toBe(true);
 const root:Data={filth:{items:[row]}};root.world=root;
 expect(pair(root,293,fast)).toBe(false);
});
