import type {ReformDeparture260} from './group-reform-departure-260.ts';
/** Prepare while the true bed original is still owned. Commit only with its
 * physical pack/install/destruction transaction. No speculative clone escapes
 * its own registered campaign authority. */
import type {Structure,World} from './types.ts';
import type {CampaignState} from './world-map-state.ts';
import {captureActorBeds256} from './actor-bed-local-256.ts';
import {captureDuckMapRemovedOwners256} from './duck-owner-capture-256.ts';
import {actualBedReferences256,relocateActorBedClaims256,forgetActorBedClaims256,unclaimDetachedActorBed256} from './actor-map-bed-256.ts';
import {registeredCampaign,registeredMapId} from './world-map-context.ts';
import {isBedKind} from './bed-kinds.ts';
import {removalWritesMutable259,sealRemovalOriginal259,type MapRemovalWrite259} from './map-removal-writes-259.ts';
export interface BedOwnershipCommit256 {commit():void;removalWrites259?:readonly MapRemovalWrite259[];current?():boolean}
export function prepareBedOwnershipTransition256(w:World,bed:Structure,mode:'pack'|'install'|'destroy'):BedOwnershipCommit256|undefined {
 if(w.schemaVersion<256||!isBedKind(bed.kind)&&bed.kind!=='animal-sleeping-spot')return;
 const capture=captureActorBeds256(registeredCampaign(w)),mapId=registeredMapId(w),actual=capture.refs.find(r=>r.id===bed.id);
 if(mapId===undefined||!actual)throw Error('Bed transition has no actual original');
 const spawned=w.structures.includes(bed),packed=w.packed.some(p=>p.building===bed);
 if(mode==='pack'?!spawned:mode==='install'?!packed:!spawned&&!packed)throw Error('Bed transition source is not physically owned here');
 const target={...actual,mapId:mode==='pack'?null:mapId},removed=new Set([bed.id]);
 return {commit:()=>{if(mode==='destroy')forgetActorBedClaims256(capture.actors,removed);else relocateActorBedClaims256(capture.actors,target,capture.localMapFor);}};
}
export function prepareRemovedMapBeds256(root:CampaignState,map:World,mapId:number,plannedDrops259?:ReadonlySet<number>,departure260?:ReformDeparture260):BedOwnershipCommit256|undefined {
 if(root.schemaVersion<256)return;
 const capture=captureActorBeds256(root),held=new Set(captureDuckMapRemovedOwners256(map).map(row=>row.animal.id)),retained=new Set([...map.pawns.map(p=>p.id),...(map.wildlife?.animals.map(a=>a.id)??[]),...held]);
 const left=capture.actors.filter(actor=>!departure260?.ids.has(actor.id)&&(capture.localMapFor(actor)===mapId||held.has(actor.id)));
 const afterOwner=(p:World['packed'][number])=>departure260?departure260.valueAfter(p,'owner') as typeof p.owner:p.owner;
 const kept=(id:number)=>retained.has(id)&&!departure260?.ids.has(id);
 if(plannedDrops259){
  const lostPacks=map.packed.filter(p=>{if(departure260?.packedIds.has(p.building.id))return false;const o=afterOwner(p);return o.type==='ground'||!kept(o.pawnId)||plannedDrops259.has(p.building.id);}),lostIds=actualBedReferences256(mapId,map.structures,lostPacks).map(r=>r.id),lost=new Set(lostIds);
  const affected=capture.actors.filter(a=>{const claim=departure260?departure260.valueAfter(a,'mapBed') as typeof a.mapBed:a.mapBed;return left.includes(a)||!!claim&&lost.has(claim.bedId);}),writes:MapRemovalWrite259[]=[];
  // These are precisely forgetActorBedClaims/unclaimDetachedActorBed writes.
  for(const a of affected){writes.push({object:a,key:'mapBed',present:false});if('species'in a){if(a.domestic)writes.push({object:a.domestic,key:'bedId',present:false});}else writes.push({object:a,key:'bedId',present:true,value:null},{object:a,key:'bedSlot',present:false});}
  const stamps=writes.map(w=>Object.getOwnPropertyDescriptor(w.object,w.key)),packs=map.packed.slice(),packOwners=map.packed.map(p=>p.owner),structures=map.structures.slice();
  const nested=stamps.flatMap(d=>d?.value&&typeof d.value==='object'?[sealRemovalOriginal259(d.value,[],[])]:[]),packSeals=packs.map(p=>sealRemovalOriginal259(p,[],[])),bedSeals=structures.filter(s=>isBedKind(s.kind)||s.kind==='animal-sleeping-spot').map(s=>sealRemovalOriginal259(s,[],[]));
  const mutable=()=>removalWritesMutable259(writes),current=()=>mutable()&&nested.every(check=>check(0))&&packSeals.every(check=>check(0))&&bedSeals.every(check=>check(0))&&writes.every((w,i)=>{const d=Object.getOwnPropertyDescriptor(w.object,w.key),before=stamps[i];return !!d===!!before&&(!d||Object.hasOwn(d,'value')&&Object.is(d.value,before!.value));})&&map.packed.length===packs.length&&map.packed.every((p,i)=>p===packs[i]&&p.owner===packOwners[i])&&map.structures.length===structures.length&&map.structures.every((s,i)=>s===structures[i]);
  if(!current())throw Error('Actual removed-map bed recipients are not mutable');
  return {removalWrites259:writes,current,commit(){if(!mutable())throw Error('Removed-map bed recipients became immutable');const actual=actualBedReferences256(mapId,map.structures,map.packed.filter(p=>p.owner.type==='ground'||!kept(p.owner.pawnId))).map(r=>r.id);if(actual.length!==lostIds.length||actual.some((id,i)=>id!==lostIds[i]))throw Error('Removed-map bed losses differ from preflight');forgetActorBedClaims256(capture.actors,lost);for(const actor of left)unclaimDetachedActorBed256(actor);}};
 }
 // Compute losses after the real job cleanup has attempted its ordinary carry drops.
 return {commit:()=>{const lostPacks=map.packed.filter(p=>p.owner.type==='ground'||!retained.has(p.owner.pawnId)),lost=new Set(actualBedReferences256(mapId,map.structures,lostPacks).map(r=>r.id));forgetActorBedClaims256(capture.actors,lost);for(const actor of left)unclaimDetachedActorBed256(actor);}};
}
