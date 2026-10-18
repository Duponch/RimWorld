import {orderedWorldPawnRows256} from './world-pawn-native-order-256.ts';
import {registeredCampaign} from './world-map-context.ts';
import type {WildAnimal} from './wildlife-state.ts';
import {deadWorldPawn256,terminalWorldPawn256,type WorldPawnCampaign256,type WorldPawnOwner256} from './world-pawn-state-256.ts';
/** Only this owner's actual originals, never historical frozen archives. */
export function captureWorldPawnOwners256(input:WorldPawnCampaign256){
 const root=registeredCampaign(input) as WorldPawnCampaign256,state=root.worldPawns;
 const rows=state?orderedWorldPawnRows256(state):[],actors=new Set<object>(),ids=new Set<number>();
 for(const row of rows){if(actors.has(row.actor)||ids.has(row.actor.id))throw Error('Duplicate WorldPawn original');actors.add(row.actor);ids.add(row.actor.id);}
 return {root,state,rows:rows.slice(),actors:rows.map(r=>r.actor),items:rows.flatMap(r=>r.items),packed:rows.flatMap(r=>r.packed),
  animals:rows.filter((r):r is WorldPawnOwner256&{kind:'animal';actor:WildAnimal}=>r.kind==='animal'&&!terminalWorldPawn256(r)&&!r.startingPawnLeftBehind).map(r=>r.actor)};
}
/** Membership here is ownership. Caravan/holder/leader memberships remain with
 * their real containers and are not copied into this registry. */
export type ActualWorldPawnSituation256='Dead'|'StartingPawnLeftBehind'|'FactionLeader'|'Kidnapped'|'CaravanMember'|'ReservedByQuest'|'Borrowed'|'InTravelingTransportPod'|'ForSaleBySettlement'|'Teleporting'|'Free';
export function worldPawnSituation256(row:WorldPawnOwner256,version=256):'Dead'|'StartingPawnLeftBehind'|'Kidnapped'|'Free'|undefined {
 return terminalWorldPawn256(row)?'Dead':row.startingPawnLeftBehind?'StartingPawnLeftBehind':version>=261&&row.captivity261?'Kidnapped':row.free===true?'Free':undefined;
}
/** Unrepresented quest/borrowed/for-sale authorities do not become false. */
export type ActualWorldPawnSituationReader256=(row:WorldPawnOwner256)=>ActualWorldPawnSituation256|undefined;

/** Small projections are references to true human originals only. Animals are
 * never inserted into campaignPeople/RelationshipPeople. */
export function captureWorldPawnPeople256(input:WorldPawnCampaign256){
 return captureWorldPawnOwners256(input).rows.flatMap(row=>row.kind==='human'?[{row,pawn:row.actor,clock:row.clockCore/10,person:{id:row.actor.id,name:row.actor.name,status:deadWorldPawn256(row)?'dead' as const:'departed' as const,...row.actor.health?.death?{deathAt:row.actor.health.death.tick}:{}}}]:[]);
}

/** Sole affiliation authority while held by this registry. Undefined means
 * this actor is not a WorldPawn, not that its actual faction is neutral. */
export function actualWorldPawnFaction256(root:WorldPawnCampaign256,actor:object):number|null|undefined {
 return root.worldPawns?.owners.find(row=>row.actor===actor)?.factionId;
}
