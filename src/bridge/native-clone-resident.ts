import type {World} from '../sim/types';
import {isOwnedResidentFilthCopyInternal} from './resident-filth-section';
import {createFirefoamLaneValidatorsInternal290} from '../sim/firefoam-save-290';
import {ResidentVegetationAssembler} from './resident-vegetation-assembler';
import type {SnapshotAdoption,SnapshotMessage} from './snapshots';
import type {CampaignOnlyMessage} from './protocol';

/** Fixed native source only. No caller-supplied flag/token grants provenance. */
export interface NativeCloneResidentLane {
 readonly reader:ResidentVegetationAssembler;
 createWorker():Worker;
 withWorkerMessage(source:Worker,event:MessageEvent<unknown>,dispatch:()=>void):void;
 close():void;
 diagnostics():Readonly<{fastAdoptions:number;strictAdoptions:number;fastLaneReads:number}>;
}
type Packet=SnapshotMessage<true>;
/** Union of the two Firefoam scanner custody lanes; never terrain/anatomy. */
const cloneLanes=new Set(['world','summary','dynamic','campaign','map','worldMaps','sites','secondarySite','campaignMap',
 'structures','jobs','packed','building','items','bills','worldGroups','groups','group','state','pending261',
 'groupLosses','animalLosses','losses','legacyTravellers','abandonedPawns','abandonedContents','worldPawns','owners',
 'worldFactions','leaders','heldCaskets259','heldPlayerCaskets271','heldShipCaskets277','casket','cryptosleep','shipCryptosleep277','occupant',
 'visitors','podRescues','departed','startingArrival','pods','animalOwners','wildlife','raids','mechActive','extraMechActive261',
 'humans','members','people','animals','mechanoids','flyers','human','pawn','animal','mech','actor','pawns','piles','corpse','mechCorpse',
 'scout','commercialTrip','health','filthFeet','research','filth','carried','upserted']);

/** Captured native getters reject Proxy/wrapper receivers and synthetic events. */
function nativeEventReader(){
 try{
  if(typeof Event!=='function'||typeof MessageEvent!=='function')return;
  const current=Object.getOwnPropertyDescriptor(Event.prototype,'currentTarget')?.get;
  const data=Object.getOwnPropertyDescriptor(MessageEvent.prototype,'data')?.get;
  const sample=new MessageEvent('message');
  const trusted=Object.getOwnPropertyDescriptor(sample,'isTrusted')?.get
   ??Object.getOwnPropertyDescriptor(Event.prototype,'isTrusted')?.get;
  if(!current||!data||!trusted)return;
  return (event:MessageEvent<unknown>,source:Worker):{value:unknown}|undefined=>{
   try{return current.call(event)===source&&trusted.call(event)===true?{value:data.call(event)}:undefined;}
   catch{return;}
  };
 }catch{return;}
}

export function createNativeCloneResidentLane():NativeCloneResidentLane {
 let worker:Worker|undefined,closed=false,capture:((event:MessageEvent<unknown>)=>void)|undefined;
 const ordinary=new WeakSet<object>(),receipts=new WeakMap<object,Receipt>(),readNative=nativeEventReader();
 interface Receipt {readonly raw:unknown;readonly original:Packet;consumed:boolean}
 interface Scope {readonly frame:Receipt;prepared:Packet|undefined}
 let frame:Receipt|undefined,scope:Scope|undefined;
 const metrics={fastAdoptions:0,strictAdoptions:0,fastLaneReads:0};
 // Only our first, private native listener calls mark. An ordinary object cannot
 // turn into a Proxy later. Inserted/reused unknown objects remain strict.
 const mark=(root:unknown):void=>{
  const seen=new Set<object>(),pending:unknown[]=[root];
  while(pending.length){
   const value=pending.pop();if(!value||typeof value!=='object'||seen.has(value))continue;seen.add(value);
   if(Array.isArray(value)){
    if(Object.getPrototypeOf(value)!==Array.prototype)continue;
    for(const key of Object.keys(value))if(/^(0|[1-9]\d*)$/.test(key))pending.push(value[Number(key)]);
   }else if(Object.getPrototypeOf(value)===Object.prototype){
    ordinary.add(value);
    for(const key of Object.keys(value))if(cloneLanes.has(key))pending.push((value as Record<string,unknown>)[key]);
   }
  }
 };
 const guards=createFirefoamLaneValidatorsInternal290((value,key)=>{
  // Unknown child traps can replace an ancestor's prototype during a scan.
  // Recheck at the read: identity alone never certifies its current prototype.
  if(!ordinary.has(value)||Object.getPrototypeOf(value)!==Object.prototype)return Object.getOwnPropertyDescriptor(value,key);
  metrics.fastLaneReads++;
  return key in value?Object.getOwnPropertyDescriptor(value,key):null;
 },(value,laneKeys)=>{
  if(!ordinary.has(value)||Object.getPrototypeOf(value)!==Object.prototype)return false;
  // Reflect.ownKeys observes nonenumerable/accessor/undefined lanes without
  // reading their values. No Proxy or getter can run in this ordinary proof.
  for(const key of Reflect.ownKeys(value))if(typeof key==='string'&&laneKeys.has(key))return false;
  // Live, never cached: earlier unknown children may pollute this prototype.
  for(const key of Reflect.ownKeys(Object.prototype))if(typeof key==='string'&&laneKeys.has(key))return false;
  return true;
 },isOwnedResidentFilthCopyInternal);

 class NativeCloneAssembler extends ResidentVegetationAssembler {
  protected override preparedPublication(original:Packet,prepared:Packet):void {
   if(!scope||scope.frame!==frame||scope.frame.original!==original)return;
   scope.prepared=prepared;
  }
  protected override firefoamTransport(value:unknown,version:unknown):boolean {
   return scope&&scope.frame===frame&&value===scope.prepared
    ?guards.historical(value,version):super.firefoamTransport(value,version);
  }
  protected override firefoamWorld(value:World,packet:Packet):boolean {
   return scope&&scope.frame===frame&&packet===scope.prepared
    ?guards.world(value):super.firefoamWorld(value,packet);
  }
  override adopt(packet:Packet,acceptExtra?:(view:World)=>boolean):SnapshotAdoption {
   if(scope)return {status:'resync',reason:'Reentrant resident clone admission'};
   // No packet property reads before the ordinary admission guards. Provenance
   // is per object; the base reader alone owns revisions and reconstruction.
   const held=frame,eligible=!closed&&!!held&&!held.consumed&&packet===held.original;
   if(eligible){held.consumed=true;scope={frame:held,prepared:undefined};}
   try{
    const result=super.adopt(packet,acceptExtra);
    if(result.status==='applied'){
     if(eligible&&scope?.prepared)metrics.fastAdoptions++;
     else metrics.strictAdoptions++;
    }
    return result;
   }finally{scope=undefined;}
  }
  override adoptCampaignOnly(packet:CampaignOnlyMessage,acceptExtra?:(view:World)=>boolean):ReturnType<ResidentVegetationAssembler['adoptCampaignOnly']>{
   if(scope)return {status:'resync',reason:'Reentrant resident campaign admission'};
   return super.adoptCampaignOnly(packet,acceptExtra);
  }
 }
 const reader=new NativeCloneAssembler();
 return {
  reader,
  createWorker(){
   if(closed||worker)throw Error('Native clone lane already created or closed');
   worker=new Worker(new URL('./presentation.worker.ts',import.meta.url),{type:'module'});
   const source=worker;
   capture=event=>{
    if(closed||worker!==source)return;
    const native=readNative?.(event,source);if(!native)return;
    try{
     const raw=native.value as Record<string,unknown>|null;
     if(!raw||typeof raw!=='object'||raw.type!=='resident-publication')return;
     const packet=raw.publication as Packet;
     if(!packet||typeof packet!=='object'||packet.type!=='snapshot'||!packet.world||typeof packet.world!=='object')return;
     mark(packet);
     const receipt:Receipt={raw,original:packet,consumed:false};
     receipts.set(event,receipt);
    }catch{/* ordinary strict reader owns malformed publication refusal */}
   };
   // Registered before exposing the Worker to arbitrary client listeners.
   worker.addEventListener('message',capture);
   return worker;
  },
  withWorkerMessage(source,event,dispatch){
   if(closed||!worker||source!==worker||frame){dispatch();return;}
   // Native currentTarget becomes null outside dispatch; wrappers and synthetic
   // redispatch cannot redeem this exact-Event, weakly held one-use receipt.
   const receipt=receipts.get(event),native=readNative?.(event,source);
   if(!receipt||receipt.consumed||!native||native.value!==receipt.raw){dispatch();return;}
   receipts.delete(event);frame=receipt;
   try{dispatch();}finally{receipt.consumed=true;frame=undefined;scope=undefined;}
  },
  close(){closed=true;if(worker&&capture)worker.removeEventListener('message',capture);frame=undefined;scope=undefined;},
  diagnostics:()=>Object.freeze({...metrics}),
 };
}
