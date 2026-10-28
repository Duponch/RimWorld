import {effectiveCore297} from './core-phase-297.ts';
import {removedMapCore297} from './retired-map-clock-297.ts';
import {isSchema277OrLater} from './schema-compatibility-257.ts';
import {isPlayerCasket271} from './cryptosleep-state-271.ts';
import {isShipCasket277,validShipCasketField277,shipCasketActor277,type ShipCasket277} from './ship-casket-state-277.ts';
import {validateShipCasketOwners277,validShipCasketBuilding277,validateRetainedShipCasketOwner277,shipCasketThingIds277} from './ship-casket-owner-save-277.ts';
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
export interface HeldShipCasket277 {
 originMapId:number;registeredAtCore:number;enteredAtAbsCore:number;
 context:WorldGroupRecord['context'];casket:ShipCasket277;
}
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const exact=(v:unknown,keys:readonly string[]):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).length===keys.length&&keys.every(k=>{const d=Object.getOwnPropertyDescriptor(v,k);return d?.enumerable===true&&Object.hasOwn(d,'value');});
const dense=(v:unknown,max:number):v is unknown[]=>Array.isArray(v)&&Object.getPrototypeOf(v)===Array.prototype&&v.length<=max&&Reflect.ownKeys(v).length===v.length+1&&Array.from({length:v.length},(_,i)=>Object.getOwnPropertyDescriptor(v,String(i))).every(d=>d?.enumerable===true&&Object.hasOwn(d,'value'));
/** The enclosing WorldPawns envelope has already admitted a data-only tree. */
export function validHeldShipCasketEnvelope277(state:WorldPawnsState256,version:number,nowCore:number,nextId:number):boolean {
 const d=Object.getOwnPropertyDescriptor(state,'heldShipCaskets277');if(!d)return !('heldShipCaskets277'in state);
 if(!isSchema277OrLater(version)||!d.enumerable||!Object.hasOwn(d,'value')||!dense(d.value,nextId))return false;
 return d.value.every(e=>exact(e,['originMapId','registeredAtCore','enteredAtAbsCore','context','casket'])&&int(e.originMapId)&&int(e.registeredAtCore,0,nowCore)&&(version===297||e.registeredAtCore%10===0)&&int(e.enteredAtAbsCore)&&!!e.context&&typeof e.context==='object'&&isShipCasket277(e.casket)&&int(e.casket.id,1,nextId-1)&&validShipCasketField277(e.casket,version,Math.floor(e.registeredAtCore/10),version===297?e.registeredAtCore:undefined));
}
type Root277=Readonly<Pick<World,'schemaVersion'|'tick'|'nextId'|'planet'|'worldMaps'|'worldFactions'|'campaignMap'>>&Partial<Readonly<Pick<World,'phaseCore297'|'worldGroups'|'foodPolicies'|'apparelPolicies'|'research'>>>;
const pending=new WeakMap<HeldShipCasket277,()=>boolean>();
export function* heldShipCasketThingIds277(c:ShipCasket277):Generator<number> {yield c.id;yield*shipCasketThingIds277(c,true);}
export function validateHeldShipCaskets277(state:WorldPawnsState256,root:Root277,ids:NumericMembershipSink,projection?:CampaignMapPresentation|CampaignSummary,knownHumanIds:ReadonlySet<number>=new Set()):string[] {
 const errors:string[]=[],humans=new Set(knownHumanIds);
 for(const e of state.heldShipCaskets277??[])if(e.casket.shipCryptosleep277.occupant?.kind==='human')humans.add(e.casket.shipCryptosleep277.occupant.pawn.id);
 for(const e of state.heldShipCaskets277??[]){
  const staged=pending.get(e)?.()===true,retired=root.worldMaps?.retired.find(m=>m.id===e.originMapId),proof=projection?.worldPawnOrigins?.find(m=>m.mapId===e.originMapId),removedAt=retired?.removedAt??proof?.removedAt;
  if(!isSchema277OrLater(root.schemaVersion)||(removedAt===undefined?!staged:removedMapCore297(retired??proof!,root.schemaVersion)!==e.registeredAtCore))errors.push('Spatial casket lacks its actual map-removal receipt.');
  const context=e.context,c=context.climate,tile=retired?.tile??proof?.tile;
  if(!validGroupMapContext(context,Math.floor(e.registeredAtCore/10),root.schemaVersion,root)||c?.revision!==4||context.site?.revision!==3||tile!==undefined&&(context.site.tileId!==tile||c.tileId!==tile))errors.push('Retained spatial casket actual origin context refused.');
  if(c?.revision!==4||e.enteredAtAbsCore!==(c.calendarOrigin+Math.floor(e.registeredAtCore/10)-c.adoptedAt)*10-geographicLongitudeOffsetCore256(c.definition.longitude)+(Number(root.schemaVersion)===297?e.registeredAtCore%10:0))errors.push('Retained spatial casket absolute removal clock refused.');
  const archive=root.worldGroups?.abandonedContents.find(a=>a.mapId===e.originMapId);
  if(archive&&JSON.stringify(archive.context)!==JSON.stringify(context))errors.push('Retained spatial casket differs from its actual removed-map context.');
  if(!validShipCasketBuilding277(e.casket,root.schemaVersion,{...context,nextId:root.nextId,worldFactions:root.worldFactions},Math.floor(e.registeredAtCore/10),Number(root.schemaVersion)===297?e.registeredAtCore:undefined)||!e.casket.shipCryptosleep277.occupant)errors.push('Invalid retained physical spatial casket.');
  // A pending operation owns the exact source already validated on its real
  // map, before the declared area/bed writes. RAW cannot acquire this brand.
  if(!staged)errors.push(...validateRetainedShipCasketOwner277(e.casket,{...context,schemaVersion:root.schemaVersion,tick:root.tick,nextId:root.nextId,worldFactions:root.worldFactions,foodPolicies:root.foodPolicies,apparelPolicies:root.apparelPolicies,research:root.research},humans,Math.floor(e.registeredAtCore/10),Number(root.schemaVersion)===297?e.registeredAtCore:undefined));
  for(const id of heldShipCasketThingIds277(e.casket)){if(!int(id,1,root.nextId-1)||ids.has(id))errors.push('Retained ship-casket Thing has another actual owner.');ids.add(id);}
 }
 return errors;
}
export function heldShipCasketHumanSlots277(state:WorldPawnsState256|undefined):HumanOwnerSlot[] {
 return (state?.heldShipCaskets277??[]).flatMap(e=>{const h=e.casket.shipCryptosleep277,p=h.occupant?.kind==='human'?h.occupant.pawn:undefined;return p?[{id:p.id,name:p.name,kind:'ship-casket' as const,simulation:'frozen' as const,place:{kind:'ship-casket' as const,casketId:e.casket.id},status:p.state==='dead'||p.health?.death?'dead' as const:'away' as const,validationTick:h.heldAt,pawn:p,items:h.items,packed:h.packed,...p.health?.death?{deathAt:p.health.death.tick}:{}}]:[];});
}
export function heldShipCasketLivingIds277(state:WorldPawnsState256|undefined):number[] {
 return (state?.heldShipCaskets277??[]).flatMap(e=>{const a=shipCasketActor277(e.casket.shipCryptosleep277);return a&&a.state!=='dead'&&!a.health?.death?[a.id]:[];});
}
export function heldShipCasketGCUnknown277(state:WorldPawnsState256):readonly (readonly [number,WorldPawnGCFacts256])[] {
 return heldShipCasketLivingIds277(state).map(id=>[id,{keep:[],unknown:['actual-spatial-cryptosleep-holder-terminal-uncomposed'],relatedIds:[],memoryIds:[]}] as const);
}
/** A phase seal allows only the removal's declared area/bed writes. Original
 * objects and all possessions remain identical, including same-value changes. */
export function prepareHeldShipCasketRemoval277(root:CampaignState,map:World,mapId:number,absolute:number,areaWrites:readonly MapRemovalWrite259[]=[],bedWrites:readonly MapRemovalWrite259[]=[]) {
 const sourceErrors=validateShipCasketOwners277(map);if(sourceErrors.length)throw Error(sourceErrors[0]);
 let phase:0|1|2=0,used=false;
 const capture=(v:object)=>sealRemovalOriginal259(v,areaWrites,bedWrites);
 const originals=map.structures.filter(isShipCasket277).filter(c=>!!c.shipCryptosleep277.occupant),structures=map.structures,all=[...structures],state=root.worldPawns!,tick=root.tick;
 const afterPrevious=all.filter(c=>(!isAncientCasket256(c)||!ancientCasketHasContents256(c.casket))&&(!isPlayerCasket271(c)||!c.cryptosleep.human));
 const prior=state.heldShipCaskets277,old=prior?[...prior]:[],priorSeal=prior?capture(prior):()=>true;
 const context:WorldGroupRecord['context']={seed:map.seed,width:map.width,height:map.height,...map.climate?{climate:map.climate}:{},...map.site?{site:map.site}:{},...map.scenario?{scenario:map.scenario}:{}};
 const contextSeal=capture(context),records:HeldShipCasket277[]=originals.map(casket=>({originMapId:mapId,registeredAtCore:Number(root.schemaVersion)===297?effectiveCore297(root):tick*10,enteredAtAbsCore:absolute,context:structuredClone(context),casket})),seals=records.map(capture);
 const core=Number(root.schemaVersion)===297?effectiveCore297(root):tick*10;
 const mutable=()=>{if(!records.length)return true;const local=Object.getOwnPropertyDescriptor(map,'structures'),held=Object.getOwnPropertyDescriptor(state,'heldShipCaskets277');return !!local&&Object.hasOwn(local,'value')&&local.writable===true&&(held?Object.hasOwn(held,'value')&&held.writable===true:Object.isExtensible(state));};
 const header=(stage:0|1|2)=>!used&&mutable()&&root.tick===tick&&map.tick===tick&&(Number(root.schemaVersion)!==297||effectiveCore297(root)===core&&effectiveCore297(map)===core)&&root.worldPawns===state&&state.heldShipCaskets277===prior&&priorSeal(stage)&&map.seed===context.seed&&map.width===context.width&&map.height===context.height&&map.climate===context.climate&&map.site===context.site&&map.scenario===context.scenario&&contextSeal(stage)&&seals.every(check=>check(stage))&&registeredMap(root,mapId)===map;
 const current=(stage:0|1|2=phase)=>header(stage)&&map.structures===structures&&structures.length===all.length&&structures.every((s,i)=>s===all[i]);
 if(!mutable())throw Error('Retained ship-casket recipients are not mutable.');
 for(const e of records)pending.set(e,()=>current());
 const validation={...state,...records.length?{heldShipCaskets277:[...old,...records]}:{}};
 const errors=validateHeldShipCaskets277(validation,root,new Set(),undefined,new Set(captureHumanOwners(map).people.keys()));if(errors.length)throw Error(errors[0]);
 return {records,current:()=>current(),confirmAreas(){if(phase!==0||!current(1))throw Error('Unexpected retained ship-casket area writes.');phase=1;},confirmBeds(){if(phase!==1||!current(2))throw Error('Unexpected retained ship-casket bed writes.');phase=2;},commitAfterAncientAndPlayer277(){
  // The preceding ancient-holder commit may replace this array only by its
  // exact admitted subtraction. Nothing else may appear or disappear here.
  if(phase!==2||!header(2)||map.structures.length!==afterPrevious.length||map.structures.some((s,i)=>s!==afterPrevious[i]))throw Error('Stale retained ship-casket removal.');
  used=true;if(records.length){state.heldShipCaskets277=[...old,...records];const moved=new Set(originals);map.structures=map.structures.filter(c=>!moved.has(c as ShipCasket277));for(const e of records)pending.delete(e);}
 }};
}
