import {isSchema256Or257} from './schema-compatibility-257.ts';
import {nativeWorldPawnOrderCurrent256,commitNativeWorldPawnOrder256} from './world-pawn-native-order-256.ts';
import {CORE_STARTING_ARRIVAL_PROFILE_256,finishCoreStartingArrival256,type CoreStartingPod256} from './starting-pod-state-256.ts';
import {validateCoreStartingArrivalContents256} from './starting-pod-save-256.ts';
import {registeredCampaign,registeredMap,registeredMapId} from './world-map-context.ts';
import {actualCampRemovalAbsCore256} from './world-pawn-map-removed-256.ts';
import {preparePassedToWorld256} from './world-pawn-transition-256.ts';
import {validateWorldPawnOwners256} from './world-pawn-save-256.ts';
import {mutableWorldPawnOriginal256,type WorldPawnOwner256,type WorldPawnsState256} from './world-pawn-state-256.ts';
import {cancelWorldPawnGC256} from './world-pawn-gc-256.ts';
import {captureActorBeds256} from './actor-bed-local-256.ts';
import {unclaimDetachedActorBed256} from './actor-map-bed-256.ts';
import {captureStartingPlacePhysics256} from './starting-place-physics-256.ts';
import {findStartingPlaceNear256,planStartingPlaceDirect256,type StartingPlaceThing256} from './starting-place-near-256.ts';
import {neutralLossPlan} from './destruction-losses.ts';
import {refreshStock} from './materials.ts';
import {ITEM_DEFINITIONS,type ItemId} from './items.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {World,MaterialPile,Pawn} from './types.ts';

export const STARTING_POD_MAX_HP_256=500;
export function landedStartingPods256(w:Pick<World,'schemaVersion'|'startingArrival'>):readonly CoreStartingPod256[] {
 const a=w.startingArrival;return isSchema256Or257(w.schemaVersion)&&a?.profile===CORE_STARTING_ARRIVAL_PROFILE_256&&a.phase!=='opened'?a.pods.filter(p=>p.phase==='landed'):[];
}
export type StartingPodDamagePreparation256={ok:false;reason:string}|{ok:true;current():boolean;commit():void};
const ownMutable=(o:object)=>mutableWorldPawnOriginal256(o);
/** Only the actual slots written below. A sealed dense array still has a
 * writable length; splice must also be allowed to shift and delete its tail. */
function writableSlot(o:object,key:PropertyKey):boolean {
 const d=Object.getOwnPropertyDescriptor(o,key);return d?Object.hasOwn(d,'value')&&d.writable===true:Object.isExtensible(o)&&!(key in o);
}
function appendable(a:readonly unknown[]):boolean {
 return Array.isArray(a)&&Object.isExtensible(a)&&Object.getOwnPropertyDescriptor(a,'length')?.writable===true;
}
function removableAt(a:readonly unknown[],index:number):boolean {
 if(!Array.isArray(a)||index<0||index>=a.length||Object.getOwnPropertyDescriptor(a,'length')?.writable!==true)return false;
 for(let i=index;i<a.length-1;i++){const d=Object.getOwnPropertyDescriptor(a,String(i));if(!d||!Object.hasOwn(d,'value')||d.writable!==true)return false;}
 return Object.getOwnPropertyDescriptor(a,String(a.length-1))?.configurable===true;
}
function adopt<T extends object>(original:T,next:T):void {for(const k of Object.keys(original))delete (original as Record<string,unknown>)[k];Object.assign(original,next);}

/** Actual ActiveTransporter destruction. Its three selected originals have
 * never spawned: clock0 remains clock0. Destroy(Vanish) of a contained Pawn
 * is NOT Kill(), does not produce a corpse and does not run death thoughts.
 * Only touched records/placement columns are staged, never another World.
 * Unrepresented held jobs/possessions refuse before the first original edit. */
export function prepareStartingPodDamage256(w:World,pod:CoreStartingPod256,amount:number,mode:'kill'|'vanish'='kill',atCore=w.tick*10):StartingPodDamagePreparation256 {
 const no=(reason:string):StartingPodDamagePreparation256=>({ok:false,reason}),a=w.startingArrival;
 if(!isSchema256Or257(w.schemaVersion)||a?.profile!==CORE_STARTING_ARRIVAL_PROFILE_256||a.phase==='opened'||!a.pods.includes(pod)||pod.phase!=='landed'||!Number.isSafeInteger(amount)||amount<=0||!['kill','vanish'].includes(mode)||!Number.isSafeInteger(atCore)||atCore<Math.max(0,(w.tick-1)*10)||atCore>w.tick*10||atCore<pod.fallCore)return no('No actual landed active transporter damage target');
 const damage=(pod.damage??0)+amount;
 if(!Number.isSafeInteger(damage)||!ownMutable(pod))return no('Active transporter damage owner is not mutable');
 const beforePod=JSON.stringify(pod),tick=w.tick;
 if(damage<STARTING_POD_MAX_HP_256&&mode==='kill'){
  if(!writableSlot(pod,'damage'))return no('Active transporter damage slot is not writable');
  let used=false;const current=()=>!used&&writableSlot(pod,'damage')&&w.tick===tick&&w.startingArrival===a&&a.pods.includes(pod)&&JSON.stringify(pod)===beforePod;
  return {ok:true,current,commit(){if(!current())throw Error('Stale active transporter damage');used=true;pod.damage=damage;}};
 }
 const root=registeredCampaign(w),mapId=registeredMapId(w),state=root.worldPawns,factions=root.worldFactions;
 if(!state||!factions||mapId===undefined||!root.worldMaps||registeredMap(root,mapId)!==w||root.tick!==tick)return no('Active transporter destruction requires its actual born campaign and map owners');
 // No constructor/default registry at destruction. Root may be in its final
 // local substep before WorldPawns itself reaches this confirmed boundary.
 if(state.atCore!==tick*10&&state.atCore!==(tick-1)*10)return no('Active transporter lost its actual WorldPawns frontier');
 // nextId belongs to this actual campaign authority; local views may forward
 // it through accessors. Commit writes the proven root data slot directly.
 const terminalRecipientsMutable=()=>appendable(state.owners)&&writableSlot(state,'currentRate')&&removableAt(a.pods,a.pods.indexOf(pod))&&writableSlot(a,'phase')
  &&(a.destroyedPods===undefined?writableSlot(a,'destroyedPods'):appendable(a.destroyedPods))
  &&(a.pods.length!==1||writableSlot(w,'startingArrival'))&&writableSlot(w,'destroyed')&&writableSlot(root,'nextId')
  &&(mode!=='kill'||writableSlot(w,'piles'))&&writableSlot(w,'stock')&&w.jobs.every(job=>writableSlot(job,'escrow'));
 if(!terminalRecipientsMutable())return no('Actual terminal recipient slot/array is not mutable');
 const admitted=validateCoreStartingArrivalContents256(w,a);if(admitted.length)return no(admitted[0]!);
 let enteredAtAbsCore:number;try{enteredAtAbsCore=actualCampRemovalAbsCore256(root,w)-(w.tick*10-atCore);}catch(e){return no(e instanceof Error?e.message:String(e));}
 const actors=new Set<Pawn|WildAnimal>([pod.pawn,...pod.animals]),context={seed:w.seed,width:w.width,height:w.height,...w.climate?{climate:w.climate}:{},...w.site?{site:w.site}:{},...w.scenario?{scenario:w.scenario}:{}};
 const nativeBefore=state.nativeOrder;if(!nativeWorldPawnOrderCurrent256(state,nativeBefore))return no('Actual native pod terminal order is not mutable/admitted');
 const staged:WorldPawnsState256={...state,owners:state.owners.slice()},outcomes:{original:Pawn|WildAnimal;row:WorldPawnOwner256}[]=[];
 const losses:Partial<Record<ItemId,number>>={};for(const item of pod.items){const sum=(losses[item.item]??0)+item.quantity;if(!Number.isSafeInteger(sum))return no('Held loss quantity overflow');losses[item.item]=sum;}
 const ledger=neutralLossPlan(w,{items:losses});if(!ledger)return no('Actual held-item loss ledger refused');
 // ClearAndDestroyContents traverses ThingOwner in reverse. Items disappear;
 // every Pawn original survives only as a Destroyed WorldPawn, with NO gear.
 try{for(let i=pod.order.length-1;i>=0;i--){const ref=pod.order[i]!;if(ref.kind==='item')continue;
  const original=ref.kind==='human'?pod.pawn:pod.animals.find(p=>p.id===ref.id);if(!original||original.id!==ref.id||!actors.has(original)||!ownMutable(original))return no('Lost actual mutable contained Pawn');
  if(original.state!=='idle'||original.path.length||original.motion||original.health?.death||original.health&&original.health.tick!==0)return no('Only the actual frozen newborn holder frontier is represented');
  const actor=structuredClone(original);unclaimDetachedActorBed256(actor);
  if('species'in actor){
   if(!actor.growthTracker||!actor.wander||actor.confusion||actor.manhunter||actor.meal||actor.strike||actor.predation||actor.animalRest||actor.flight||actor.exitFlight||actor.eggLay||actor.mating||actor.hive||actor.hiveJob)return no('Unrepresented contained animal action at Destroy(Vanish)');
   delete actor.wander.job;actor.wander.nextMoveOrderIsWait=true;
  }else {
   if(actor.mental?.crisis||!actor.mental?.wander||actor.jobId!==null||actor.orders.active||actor.orders.queue.length||actor.need||actor.haul||actor.cooking||actor.rescue||actor.animalRescue||actor.medicalSleep||actor.bedId!==null)return no('Unrepresented contained human ClearMind/possession frontier');
   actor.mental.wander.nextMoveOrderIsWait=true;
  }
  const common={factionId:factions.playerFactionId,originMapId:mapId,context,clockCore:0,enteredAtAbsCore,mode:'dead' as const,destroyed:true as const,items:[],packed:[]};
  const row:WorldPawnOwner256='species'in actor?{...common,kind:'animal',actor}:{...common,kind:'human',actor};
  const pass=preparePassedToWorld256(staged,row,factions,{float(){throw Error('Destroyed Pawn must not draw a faction/redress choice');}});if(!pass.ok)return no(pass.reason);pass.commit();outcomes.push({original,row:pass.row});
 }}catch(e){return no(e instanceof Error?e.message:String(e));}
 let capture:ReturnType<typeof captureActorBeds256>;try{capture=captureActorBeds256(root);}catch(e){return no(e instanceof Error?e.message:String(e));}
 const frozen=new Set<WildAnimal>();for(const p of root.worldPawns?.owners??[])if(p.kind==='animal'&&p.destroyed)frozen.add(p.actor);
 for(const archive of root.worldGroups?.abandonedContents??[])for(const p of archive.animals)frozen.add(p.animal);
 for(const p of root.worldGroups?.animalLosses??[])frozen.add(p.animal);
 const masterChanges:{animal:WildAnimal;next:NonNullable<WildAnimal['startingPet']>;before:string}[]=[];
 for(const p of capture.actors)if('species'in p&&!actors.has(p)&&!frozen.has(p)&&p.state!=='dead'&&!p.health?.death&&p.startingPet?.masterId===pod.pawn.id){
  if(!ownMutable(p))return no('Actual living pet master owner is not mutable');const next={...p.startingPet};delete next.masterId;masterChanges.push({animal:p,next,before:JSON.stringify(p)});
 }
 const validation=validateWorldPawnOwners256(staged,root,new Set());if(validation.length)return no(validation[0]!);
 // Base.Destroy precedes KillFinalize. Exclude this exact pod from the sparse
 // item-count reader; other real pods remain. Slag has stackLimit1 and cannot
 // be absorbed. Vanish has no KillFinalize product.
 let slag:MaterialPile|undefined,nextId=w.nextId,placementCurrent=()=>true;
 if(mode==='kill'){
  if(!Number.isSafeInteger(nextId+1)||w.piles.length>=32768||ITEM_DEFINITIONS['slag-steel-chunk'].stackLimit!==1)return no('Actual slag Thing namespace/capacity refused');
  const ground=new Map<number,MaterialPile[]>();for(const p of w.piles)if(p.owner.type==='ground'){const k=p.owner.z*w.width+p.owner.x,list=ground.get(k)??[];list.push(p);ground.set(k,list);}
  const thing:StartingPlaceThing256={id:nextId,category:'item',quantity:1,stackLimit:1,downed:false,saveCompressible:false};
  try{const reader=captureStartingPlacePhysics256(w,{...a,pods:a.pods.filter(p=>p!==pod)},pod.cell,ground,[]),cell=findStartingPlaceNear256(pod.cell,thing,c=>reader(c,thing));if(!cell)return no('Actual killed-pod GenPlace.Near has no admissible cell');
   const plan=planStartingPlaceDirect256(thing,reader(cell,thing),[],nextId+1);if(!plan.complete||plan.operations.length!==1||plan.operations[0]?.kind!=='spawn'||plan.operations[0].id!==nextId)return no('Actual killed-pod slag placement did not preserve its original');
   slag={id:nextId++,kind:'chunk',item:'slag-steel-chunk',quantity:1,owner:{type:'ground',...cell}};
   const facts=JSON.stringify(reader(cell,thing));
   placementCurrent=()=>{
    const currentGround=new Map<number,MaterialPile[]>();for(const p of w.piles)if(p.owner.type==='ground'){const k=p.owner.z*w.width+p.owner.x,list=currentGround.get(k)??[];list.push(p);currentGround.set(k,list);}
    return JSON.stringify(captureStartingPlacePhysics256(w,{...a,pods:a.pods.filter(p=>p!==pod)},pod.cell,currentGround,[])(cell,thing))===facts;
   };
  }catch(e){return no(e instanceof Error?e.message:String(e));}
 }
 const members=a.pods.slice(),rows=state.owners.slice(),at=state.atCore,piles=w.piles,pileMembers=piles.slice(),nextBefore=w.nextId,rng=root.rng,arrivalBefore=JSON.stringify(a),lossBefore=JSON.stringify(w.destroyed),originals=outcomes.map(p=>JSON.stringify(p.original));let used=false;
 const current=()=>!used&&nativeWorldPawnOrderCurrent256(state,nativeBefore)&&terminalRecipientsMutable()&&w.tick===tick&&root.tick===tick&&w.startingArrival===a&&JSON.stringify(a)===arrivalBefore&&a.pods.length===members.length&&a.pods.every((p,i)=>p===members[i])&&root.worldPawns===state&&state.atCore===at&&state.owners.length===rows.length&&state.owners.every((p,i)=>p===rows[i])&&root.rng===rng&&w.nextId===nextBefore&&w.piles===piles&&piles.length===pileMembers.length&&piles.every((p,i)=>p===pileMembers[i])&&JSON.stringify(w.destroyed)===lossBefore&&outcomes.every((p,i)=>ownMutable(p.original)&&JSON.stringify(p.original)===originals[i])&&masterChanges.every(p=>writableSlot(p.animal,'startingPet')&&JSON.stringify(p.animal)===p.before)&&placementCurrent();
 return {ok:true,current,commit(){if(!current())throw Error('Stale active transporter terminal transaction');used=true;cancelWorldPawnGC256(state);
  for(const {original,row}of outcomes){adopt(original,row.actor);if(row.kind==='human'&&!('species'in original))row.actor=original;else if(row.kind==='animal'&&'species'in original)row.actor=original;state.owners.push(row);}
  commitNativeWorldPawnOrder256(state,nativeBefore,staged.nativeOrder);
  for(const p of masterChanges)p.animal.startingPet=p.next;
  w.destroyed=ledger;if(slag)w.piles=[...piles,slag];root.nextId=nextId;
  a.pods.splice(a.pods.indexOf(pod),1);(a.destroyedPods??=[]).push({id:pod.id,cell:{...pod.cell},atTick:tick,humanId:pod.pawn.id,animalIds:pod.animals.map(p=>p.id)});
  a.phase=a.pods.some(p=>p.phase==='incoming')?'incoming':'landed';finishCoreStartingArrival256(w,a);refreshStock(w);
 }};
}
export function damageStartingPod256(w:World,pod:CoreStartingPod256,amount:number,atCore=w.tick*10):boolean {
 const plan=prepareStartingPodDamage256(w,pod,amount,'kill',atCore);if(!plan.ok)return false;plan.commit();return true;
}
