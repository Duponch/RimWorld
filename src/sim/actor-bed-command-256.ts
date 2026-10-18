import {targetBuildingPlayerUse263} from './world-target-building-263.ts';
/** Preflight the real global slot before a local bed command releases work.
 * The existing command commits aliases and this prepared ownership together. */
import type {Pawn,Structure,World} from './types.ts';
import {captureActorBeds256} from './actor-bed-local-256.ts';
import {registeredCampaign,registeredMapId} from './world-map-context.ts';
import {prepareActorBedClaim256,type ActorBedClaimPlan256} from './actor-map-bed-256.ts';
export function prepareConfirmedBedAssignment256(w:World,bed:Structure,owner:Pawn|null,slot?:0|1):ActorBedClaimPlan256|undefined {
 if(!targetBuildingPlayerUse263(w,bed))throw Error('Actual bed is not owned by the player');
 if(w.schemaVersion<256)return;
 const local=registeredMapId(w),capture=captureActorBeds256(registeredCampaign(w));
 const ref=capture.refs.find(r=>r.id===bed.id&&r.mapId===local);
 if(local===undefined||!ref||!w.structures.includes(bed)||owner&&capture.localMapFor(owner)!==local)throw Error('Bed command lacks actual local originals');
 return prepareActorBedClaim256(capture.actors,owner,ref,slot);
}
