import {isPlayerCasket271,validCryptosleepField271,type PlayerCasket271} from './cryptosleep-state-271.ts';
import {validateCryptosleepOwners271,validCryptosleepBuilding271,validateRetainedCryptosleepOwner271} from './cryptosleep-owner-save-271.ts';
import {isAncientCasket256,ancientCasketHasContents256} from './ancient-casket-state-256.ts';
import {validGroupMapContext} from './world-map-context-save.ts';
import {geographicLongitudeOffsetCore256} from './site-climate.ts';
import {registeredMap} from './world-map-context.ts';
import {sealRemovalOriginal259,type MapRemovalWrite259} from './map-removal-writes-259.ts';
import type {World} from './types.ts';
import type {WorldPawnsState256} from './world-pawn-state-256.ts';
import type {HumanOwnerSlot} from './human-owners.ts';
import {captureHumanOwners} from './human-owners.ts';
import type {WorldPawnGCFacts256} from './world-pawn-gc-256.ts';
import type {CampaignState,WorldGroupRecord,CampaignMapPresentation,CampaignSummary} from './world-map-state.ts';
import type {NumericMembershipSink} from './numeric-membership.ts';

/** Conservative terminal adaptation: retain the same physical holder and its
 * frozen original. Native political/GC outcomes after map removal remain
 * unresolved; this is neither a Free row nor KeepForever nor a free opening. */
export interface HeldPlayerCasket271 {
 originMapId:number;registeredAtCore:number;enteredAtAbsCore:number;
 context:WorldGroupRecord['context'];casket:PlayerCasket271;
}
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const exact=(v:unknown,keys:readonly string[]):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(v,k);return d?.enumerable===true&&Object.hasOwn(d,'value');});
const dense=(v:unknown,max:number):v is unknown[]=>Array.isArray(v)&&Object.getPrototypeOf(v)===Array.prototype&&v.length<=max&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>Object.getOwnPropertyDescriptor(v,String(i))).every(d=>d?.enumerable===true&&Object.hasOwn(d,'value'));
/** The enclosing WorldPawns envelope has already admitted a data-only tree. */
export function validHeldPlayerCasketEnvelope271(state:WorldPawnsState256,version:number,nowCore:number,nextId:number):boolean {
 const d=Object.getOwnPropertyDescriptor(state,'heldPlayerCaskets271');if(!d)return !('heldPlayerCaskets271'in state);
 if(version!==271||!d.enumerable||!Object.hasOwn(d,'value')||!dense(d.value,nextId))return false;
 return d.value.every(e=>exact(e,['originMapId','registeredAtCore','enteredAtAbsCore','context','casket'])&&int(e.originMapId)&&int(e.registeredAtCore,0,nowCore)&&e.registeredAtCore%10===0&&int(e.enteredAtAbsCore)&&!!e.context&&typeof e.context==='object'&&isPlayerCasket271(e.casket)&&int(e.casket.id,1,nextId-1)&&validCryptosleepField271(e.casket,version,e.registeredAtCore/10));
}
type Root271=Readonly<Pick<World,'schemaVersion'|'tick'|'nextId'|'planet'|'worldMaps'|'worldFactions'|'campaignMap'>>&Partial<Readonly<Pick<World,'worldGroups'|'foodPolicies'|'apparelPolicies'|'research'>>>;
const pending=new WeakMap<HeldPlayerCasket271,()=>boolean>();
export function* heldPlayerCasketThingIds271(c:PlayerCasket271):Generator<number> {
 yield c.id;const h=c.cryptosleep;if(h.human)yield h.human.id;
 // These originals are owned here after actual MapRemoved. The common local
 // tree registrar sees only local human slots, not retained WorldPawn cargo.
 for(const p of h.items){yield p.id;if(p.innerResource)yield p.innerResource.id;}
 for(const p of h.packed){yield p.building.id;for(const b of p.building.bills??[])yield b.id;for(const id of p.building.shelf?.cells??[])yield id;}
}
export function validateHeldPlayerCaskets271(state:WorldPawnsState256,root:Root271,ids:NumericMembershipSink,projection?:CampaignMapPresentation|CampaignSummary,knownHumanIds:ReadonlySet<number>=new Set()):string[] {
 const errors:string[]=[],humans=new Set(knownHumanIds);
 for(const e of state.heldPlayerCaskets271??[])if(e.casket.cryptosleep.human)humans.add(e.casket.cryptosleep.human.id);
 for(const e of state.heldPlayerCaskets271??[]){
  const staged=pending.get(e)?.()===true,retired=root.worldMaps?.retired.find(m=>m.id===e.originMapId),proof=projection?.worldPawnOrigins?.find(m=>m.mapId===e.originMapId),removedAt=retired?.removedAt??proof?.removedAt;
  if(root.schemaVersion!==271||(removedAt===undefined?!staged:removedAt*10!==e.registeredAtCore))errors.push('Player casket lacks its actual map-removal receipt.');
  const context=e.context,c=context.climate,tile=retired?.tile??proof?.tile;
  if(!validGroupMapContext(context,e.registeredAtCore/10,root.schemaVersion,root)||c?.revision!==4||context.site?.revision!==3||tile!==undefined&&(context.site.tileId!==tile||c.tileId!==tile))errors.push('Retained player casket actual origin context refused.');
  if(c?.revision!==4||e.enteredAtAbsCore!==(c.calendarOrigin+e.registeredAtCore/10-c.adoptedAt)*10-geographicLongitudeOffsetCore256(c.definition.longitude))errors.push('Retained player casket absolute removal clock refused.');
  const archive=root.worldGroups?.abandonedContents.find(a=>a.mapId===e.originMapId);
  if(archive&&JSON.stringify(archive.context)!==JSON.stringify(context))errors.push('Retained player casket differs from its actual removed-map context.');
  if(!validCryptosleepBuilding271(e.casket,root.schemaVersion,{...context,nextId:root.nextId,worldFactions:root.worldFactions},e.registeredAtCore/10)||!e.casket.cryptosleep.human)errors.push('Invalid retained physical player casket.');
  // A pending operation owns the exact source already validated on its real
  // map, before the declared area/bed writes. RAW cannot acquire this brand.
  if(!staged)errors.push(...validateRetainedCryptosleepOwner271(e.casket,{...context,schemaVersion:root.schemaVersion,tick:root.tick,nextId:root.nextId,worldFactions:root.worldFactions,foodPolicies:root.foodPolicies,apparelPolicies:root.apparelPolicies,research:root.research},humans,e.registeredAtCore/10));
  for(const id of heldPlayerCasketThingIds271(e.casket)){if(!int(id,1,root.nextId-1)||ids.has(id))errors.push('Retained player-casket Thing has another actual owner.');ids.add(id);}
 }
 return errors;
}
export function heldPlayerCasketHumanSlots271(state:WorldPawnsState256|undefined):HumanOwnerSlot[] {
 return (state?.heldPlayerCaskets271??[]).flatMap(e=>{const h=e.casket.cryptosleep,p=h.human;return p?[{id:p.id,name:p.name,kind:'player-casket' as const,simulation:'frozen' as const,place:{kind:'player-casket' as const,casketId:e.casket.id},status:p.state==='dead'||p.health?.death?'dead' as const:'away' as const,validationTick:h.heldAt,pawn:p,items:h.items,packed:h.packed,...p.health?.death?{deathAt:p.health.death.tick}:{}}]:[];});
}
export function heldPlayerCasketLivingIds271(state:WorldPawnsState256|undefined):number[] {
 return heldPlayerCasketHumanSlots271(state).filter(s=>s.status!=='dead').map(s=>s.id);
}
export function heldPlayerCasketGCUnknown271(state:WorldPawnsState256):readonly (readonly [number,WorldPawnGCFacts256])[] {
 return heldPlayerCasketLivingIds271(state).map(id=>[id,{keep:[],unknown:['actual-player-cryptosleep-holder-terminal-uncomposed'],relatedIds:[],memoryIds:[]}] as const);
}
/** A phase seal allows only the removal's declared area/bed writes. Original
 * objects and all possessions remain identical, including same-value changes. */
export function prepareHeldPlayerCasketRemoval271(root:CampaignState,map:World,mapId:number,absolute:number,areaWrites:readonly MapRemovalWrite259[]=[],bedWrites:readonly MapRemovalWrite259[]=[]) {
 const sourceErrors=validateCryptosleepOwners271(map);if(sourceErrors.length)throw Error(sourceErrors[0]);
 let phase:0|1|2=0,used=false;
 const capture=(v:object)=>sealRemovalOriginal259(v,areaWrites,bedWrites);
 const originals=map.structures.filter(isPlayerCasket271).filter(c=>!!c.cryptosleep.human),structures=map.structures,all=[...structures],state=root.worldPawns!,tick=root.tick;
 const afterAncient=all.filter(c=>!isAncientCasket256(c)||!ancientCasketHasContents256(c.casket));
 const prior=state.heldPlayerCaskets271,old=prior?[...prior]:[],priorSeal=prior?capture(prior):()=>true;
 const context:WorldGroupRecord['context']={seed:map.seed,width:map.width,height:map.height,...map.climate?{climate:map.climate}:{},...map.site?{site:map.site}:{},...map.scenario?{scenario:map.scenario}:{}};
 const contextSeal=capture(context),records:HeldPlayerCasket271[]=originals.map(casket=>({originMapId:mapId,registeredAtCore:tick*10,enteredAtAbsCore:absolute,context:structuredClone(context),casket})),seals=records.map(capture);
 const mutable=()=>{if(!records.length)return true;const local=Object.getOwnPropertyDescriptor(map,'structures'),held=Object.getOwnPropertyDescriptor(state,'heldPlayerCaskets271');return !!local&&Object.hasOwn(local,'value')&&local.writable===true&&(held?Object.hasOwn(held,'value')&&held.writable===true:Object.isExtensible(state));};
 const header=(stage:0|1|2)=>!used&&mutable()&&root.tick===tick&&map.tick===tick&&root.worldPawns===state&&state.heldPlayerCaskets271===prior&&priorSeal(stage)&&map.seed===context.seed&&map.width===context.width&&map.height===context.height&&map.climate===context.climate&&map.site===context.site&&map.scenario===context.scenario&&contextSeal(stage)&&seals.every(check=>check(stage))&&registeredMap(root,mapId)===map;
 const current=(stage:0|1|2=phase)=>header(stage)&&map.structures===structures&&structures.length===all.length&&structures.every((s,i)=>s===all[i]);
 if(!mutable())throw Error('Retained player-casket recipients are not mutable.');
 for(const e of records)pending.set(e,()=>current());
 const validation={...state,...records.length?{heldPlayerCaskets271:[...old,...records]}:{}};
 const errors=validateHeldPlayerCaskets271(validation,root,new Set(),undefined,new Set(captureHumanOwners(map).people.keys()));if(errors.length)throw Error(errors[0]);
 return {records,current:()=>current(),confirmAreas(){if(phase!==0||!current(1))throw Error('Unexpected retained player-casket area writes.');phase=1;},confirmBeds(){if(phase!==1||!current(2))throw Error('Unexpected retained player-casket bed writes.');phase=2;},commitAfterAncient271(){
  // The preceding ancient-holder commit may replace this array only by its
  // exact admitted subtraction. Nothing else may appear or disappear here.
  if(phase!==2||!header(2)||map.structures.length!==afterAncient.length||map.structures.some((s,i)=>s!==afterAncient[i]))throw Error('Stale retained player-casket removal.');
  used=true;if(records.length){state.heldPlayerCaskets271=[...old,...records];const moved=new Set(originals);map.structures=map.structures.filter(c=>!moved.has(c as PlayerCasket271));for(const e of records)pending.delete(e);}
 }};
}
