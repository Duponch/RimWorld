import {isCorePhysicalSchema297} from './physical-schema-297.ts';
import {effectiveCore297} from './core-phase-297.ts';
import {removedMapCore297} from './retired-map-clock-297.ts';
import {isSchema263OrLater} from '../sim/schema-compatibility-257.ts';
import {isAncientCasket256,ancientCasketHasContents256,type AncientCasket256} from './ancient-casket-state-256.ts';
import {validAncientCasketBuilding256} from './ancient-casket-physical-256.ts';
import {validateAncientCasketRecord256,validateAncientCasketOwners256,ancientCasketThingOccurrences256} from './ancient-casket-save-256.ts';
import {validGroupMapContext} from './world-map-context-save.ts';
import {geographicLongitudeOffsetCore256} from './site-climate.ts';
import {registeredMap} from './world-map-context.ts';
import {sealRemovalOriginal259,type MapRemovalWrite259} from './map-removal-writes-259.ts';
import type {World} from './types.ts';
import type {WorldPawnsState256} from './world-pawn-state-256.ts';
import type {CampaignState,WorldGroupRecord,CampaignMapPresentation,CampaignSummary} from './world-map-state.ts';
import type {NumericMembershipSink} from './numeric-membership.ts';
export interface HeldWorldCasket259 {originMapId:number;registeredAtCore:number;enteredAtAbsCore:number;context:WorldGroupRecord['context'];casket:AncientCasket256}
const int=(n:unknown,min=0,max=Number.MAX_SAFE_INTEGER):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=min&&n<=max;
const exact=(o:unknown,keys:readonly string[]):o is Record<string,unknown>=>!!o&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype&&Reflect.ownKeys(o).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(o,k);return !!d&&d.enumerable===true&&Object.hasOwn(d,'value');});
const dense=(a:unknown,max:number):a is unknown[]=>Array.isArray(a)&&Object.getPrototypeOf(a)===Array.prototype&&a.length<=max&&Reflect.ownKeys(a).length===a.length+1&&Array.from({length:a.length},(_,i)=>Object.getOwnPropertyDescriptor(a,String(i))).every(d=>!!d&&d.enumerable&&Object.hasOwn(d,'value'));
/** Rare transaction seal of the holder's ORIGINAL links and scalar values.
 * Same-value replacement of a Pawn/item/clinical object is still stale. */
const originalHolderLinks=(value:object)=>{const seal=sealRemovalOriginal259(value,[],[]);return ()=>seal(0);};
/** Envelope caller already performed its complete data-only tree admission. */
export function validHeldCasketEnvelope259(state:WorldPawnsState256,version:number,nowCore:number,nextId:number):boolean{
 const d=Object.getOwnPropertyDescriptor(state,'heldCaskets259');if(!d)return !('heldCaskets259'in state);
 if((version!==259&&version!==260&&(version!==261&&(Number(version)!==262&&!isSchema263OrLater(Number(version)))))||!d.enumerable||!Object.hasOwn(d,'value')||!dense(d.value,nextId))return false;
 return d.value.every(r=>exact(r,['originMapId','registeredAtCore','enteredAtAbsCore','context','casket'])&&int(r.originMapId)&&int(r.registeredAtCore,0,nowCore)&&(isCorePhysicalSchema297(version)||r.registeredAtCore%10===0)&&int(r.enteredAtAbsCore)&&!!r.context&&typeof r.context==='object'&&validAncientCasketBuilding256(r.casket,version,{...(r.context as WorldGroupRecord['context']),nextId},Math.floor(r.registeredAtCore/10),isCorePhysicalSchema297(version)?r.registeredAtCore:undefined));
}
type ValidationRoot=Readonly<Pick<World,'schemaVersion'|'tick'|'nextId'|'planet'|'worldMaps'|'worldFactions'|'campaignMap'>>&Partial<Readonly<Pick<World,'phaseCore297'|'worldGroups'>>>;
const pending=new WeakMap<HeldWorldCasket259,()=>boolean>();
/** The only exceptional live-origin acceptance is an operation-local staged
 * transaction over the actual source. No RAW flag can acquire this brand. */
export function validateHeldWorldCaskets259(state:WorldPawnsState256,root:ValidationRoot,ids:NumericMembershipSink,projection?:CampaignMapPresentation|CampaignSummary):string[]{
 const errors:string[]=[],humanIds=new Set<number>();
 for(const e of state.heldCaskets259??[]){
  if(Number(root.schemaVersion)!==259&&Number(root.schemaVersion)!==260&&(Number(root.schemaVersion)!==261&&(Number(root.schemaVersion)!==262&&!isSchema263OrLater(Number(root.schemaVersion))))){errors.push('Future retained casket holder');continue;}
  const retired=root.worldMaps?.retired.find(m=>m.id===e.originMapId),proof=projection?.worldPawnOrigins?.find(m=>m.mapId===e.originMapId);
  const removedAt=retired?.removedAt??proof?.removedAt;
  if(removedAt===undefined?!pending.get(e)?.():removedMapCore297(retired??proof!,root.schemaVersion)!==e.registeredAtCore)errors.push('Retained casket lacks its actual map-removal receipt');
  const context=e.context,c=context.climate,site=context.site,tile=retired?.tile??proof?.tile;
  if(!validGroupMapContext(context,Math.floor(e.registeredAtCore/10),root.schemaVersion,root)||c?.revision!==4||site?.revision!==3||tile!==undefined&&(site.tileId!==tile||c.tileId!==tile))errors.push('Retained casket actual origin context refused');
  if(c?.revision!==4||e.enteredAtAbsCore!==(c.calendarOrigin+Math.floor(e.registeredAtCore/10)-c.adoptedAt)*10-geographicLongitudeOffsetCore256(c.definition.longitude)+(isCorePhysicalSchema297(Number(root.schemaVersion))?e.registeredAtCore%10:0))errors.push('Retained casket absolute removal clock refused');
  const archive=root.worldGroups?.abandonedContents.find(a=>a.mapId===e.originMapId);
  if(archive&&JSON.stringify(archive.context)!==JSON.stringify(context))errors.push('Retained casket differs from its actual removed-map context');
  if(!validAncientCasketBuilding256(e.casket,root.schemaVersion,{...context,nextId:root.nextId},Math.floor(e.registeredAtCore/10),isCorePhysicalSchema297(Number(root.schemaVersion))?e.registeredAtCore:undefined)||!ancientCasketHasContents256(e.casket.casket))errors.push('Invalid retained physical casket header');
  const allocator=root.worldMaps?.nextAncientCasketGroupId??projection?.nextAncientCasketGroupId;
  if(allocator!==undefined&&e.casket.casket.groupId!==-1&&e.casket.casket.groupId>=allocator)errors.push('Retained casket exceeds real group allocator');
  errors.push(...validateAncientCasketRecord256(e.casket,{...context,nextId:root.nextId,schemaVersion:root.schemaVersion,tick:Math.floor(e.registeredAtCore/10),...isCorePhysicalSchema297(Number(root.schemaVersion))?{phaseCore297:e.registeredAtCore%10}:{},worldFactions:root.worldFactions}));
  for(const id of ancientCasketThingOccurrences256(e.casket)){if(ids.has(id))errors.push('Retained casket Thing has another actual owner');ids.add(id);}
  for(const p of e.casket.casket.humans){if(humanIds.has(p.id))errors.push('Retained casket human duplicated');humanIds.add(p.id);}
 }
 return errors;
}
/** Private permit tied to a complete current transaction, never serialized. */
export interface MapRemovalCommitPhase259 {readonly drops260?:ReadonlyMap<number,import('./types.ts').Cell>;departed260?():void;releaseCouples285?():void;areas():void;beds():void}
const removalPermits=new WeakMap<object,{map:World;current:()=>boolean;begin?:()=>MapRemovalCommitPhase259;prepared?:()=>boolean}>();
export function brandHeldCasketRemoval259<T extends object>(plan:T,map:World,current:()=>boolean,begin?:()=>MapRemovalCommitPhase259,prepared?:()=>boolean):T{removalPermits.set(plan,{map,current,begin,prepared});return plan;}
export function heldCasketRemovalPermitted259(map:World,plan:object|undefined):boolean{const permit=plan&&removalPermits.get(plan);return !!permit&&permit.map===map&&permit.current();}
export function heldCasketRemovalPrepared259(map:World,plan:object):boolean{const permit=removalPermits.get(plan);return !!permit&&permit.map===map&&permit.prepared?.()===true;}
export function beginHeldCasketRemoval259(map:World,plan:object):MapRemovalCommitPhase259|undefined{const permit=removalPermits.get(plan);return permit?.map===map?permit.begin?.():undefined;}
/** Pure prepare over true source records. No callback, RNG or clock write. */
export function prepareHeldCasketRemoval259(root:CampaignState,map:World,mapId:number,absolute:number,areaWrites:readonly MapRemovalWrite259[]=[],bedWrites:readonly MapRemovalWrite259[]=[]){
 const sourceErrors=validateAncientCasketOwners256(map);if(sourceErrors.length)throw Error(sourceErrors[0]);
 let phase:0|1|2=0;
 const capture=(v:object)=>{const seal=sealRemovalOriginal259(v,areaWrites,bedWrites);return (stage:0|1|2=phase)=>seal(stage);};
 const originals=map.structures.filter(isAncientCasket256).filter(c=>ancientCasketHasContents256(c.casket)),links=originals.map(capture),structures=map.structures,all=[...structures],state=root.worldPawns!;
 const prior=state.heldCaskets259,old=prior?[...prior]:[],priorCurrent:(stage:0|1|2)=>boolean=prior?capture(prior):()=>true,tick=root.tick;
 const context:WorldGroupRecord['context']={seed:map.seed,width:map.width,height:map.height,...map.climate?{climate:map.climate}:{},...map.site?{site:map.site}:{},...map.scenario?{scenario:map.scenario}:{}};
 const contextCurrent=originalHolderLinks(context);
 const records:HeldWorldCasket259[]=originals.map(casket=>({originMapId:mapId,registeredAtCore:isCorePhysicalSchema297(Number(root.schemaVersion))?effectiveCore297(root):tick*10,enteredAtAbsCore:absolute,context:structuredClone(context),casket}));
 const receiptLinks=records.map(capture);
 const recipientsMutable=()=>{if(!records.length)return true;const local=Object.getOwnPropertyDescriptor(map,'structures'),held=Object.getOwnPropertyDescriptor(state,'heldCaskets259');return !!local&&Object.hasOwn(local,'value')&&local.writable===true&&(held?Object.hasOwn(held,'value')&&held.writable===true:Object.isExtensible(state));};
 const core=isCorePhysicalSchema297(Number(root.schemaVersion))?effectiveCore297(root):tick*10;
 const current=(stage:0|1|2=phase)=>recipientsMutable()&&root.tick===tick&&map.tick===tick&&(!isCorePhysicalSchema297(Number(root.schemaVersion))||effectiveCore297(root)===core&&effectiveCore297(map)===core)&&root.worldPawns===state&&state.heldCaskets259===prior&&priorCurrent(stage)&&map.seed===context.seed&&map.width===context.width&&map.height===context.height&&map.climate===context.climate&&map.site===context.site&&map.scenario===context.scenario&&contextCurrent()&&receiptLinks.every(check=>check(stage))&&map.structures===structures&&structures.length===all.length&&structures.every((s,i)=>s===all[i])&&links.every(check=>check(stage))&&registeredMap(root,mapId)===map;
 if(!recipientsMutable())throw Error('Retained casket recipients are not mutable');
 for(const e of records)pending.set(e,()=>current());
 const validation={...state,...records.length?{heldCaskets259:[...old,...records]}:{}};
 const errors=validateHeldWorldCaskets259(validation,root,new Set());if(errors.length)throw Error(errors[0]);
 let used=false;return {records,current:()=>!used&&current(),confirmAreas(){if(used||phase!==0||!current(1))throw Error('Unexpected retained casket area writes');phase=1;},confirmBeds(){if(used||phase!==1||!current(2))throw Error('Unexpected retained casket bed writes');phase=2;},commit(){if(used||!current())throw Error('Stale retained casket removal');used=true;if(records.length){state.heldCaskets259=[...old,...records];const moved=new Set(originals);map.structures=map.structures.filter(c=>!moved.has(c as AncientCasket256));for(const e of records)pending.delete(e);}}};
}
