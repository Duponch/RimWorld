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
export interface BedOwnershipCommit256 {commit():void}
export function prepareBedOwnershipTransition256(w:World,bed:Structure,mode:'pack'|'install'|'destroy'):BedOwnershipCommit256|undefined {
 if(w.schemaVersion<256||!isBedKind(bed.kind)&&bed.kind!=='animal-sleeping-spot')return;
 const capture=captureActorBeds256(registeredCampaign(w)),mapId=registeredMapId(w),actual=capture.refs.find(r=>r.id===bed.id);
 if(mapId===undefined||!actual)throw Error('Bed transition has no actual original');
 const spawned=w.structures.includes(bed),packed=w.packed.some(p=>p.building===bed);
 if(mode==='pack'?!spawned:mode==='install'?!packed:!spawned&&!packed)throw Error('Bed transition source is not physically owned here');
 const target={...actual,mapId:mode==='pack'?null:mapId},removed=new Set([bed.id]);
 return {commit:()=>{if(mode==='destroy')forgetActorBedClaims256(capture.actors,removed);else relocateActorBedClaims256(capture.actors,target,capture.localMapFor);}};
}
export function prepareRemovedMapBeds256(root:CampaignState,map:World,mapId:number):BedOwnershipCommit256|undefined {
 if(root.schemaVersion<256)return;
 const capture=captureActorBeds256(root),held=new Set(captureDuckMapRemovedOwners256(map).map(row=>row.animal.id)),retained=new Set([...map.pawns.map(p=>p.id),...(map.wildlife?.animals.map(a=>a.id)??[]),...held]);
 const left=capture.actors.filter(actor=>capture.localMapFor(actor)===mapId||held.has(actor.id));
 // Compute losses after the real job cleanup has attempted its ordinary carry drops.
 return {commit:()=>{const lostPacks=map.packed.filter(p=>p.owner.type==='ground'||!retained.has(p.owner.pawnId)),lost=new Set(actualBedReferences256(mapId,map.structures,lostPacks).map(r=>r.id));forgetActorBedClaims256(capture.actors,lost);for(const actor of left)unclaimDetachedActorBed256(actor);}};
}
