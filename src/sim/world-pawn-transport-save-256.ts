import type {World} from './types.ts';
import type {CampaignSummary} from './world-map-state.ts';
import type {NumericMembershipSink} from './numeric-membership.ts';
import {validWorldPawnsEnvelope256,validateWorldPawnOwners256} from './world-pawn-save-256.ts';
/** Actual shared owners, once per candidate, after every transported local,
 * caravan, terminal and faction owner. No inactive local grid is fabricated. */
export function registerProjectedWorldPawns256(world:World,ids:NumericMembershipSink,summary?:CampaignSummary):string[] {
 if(!validWorldPawnsEnvelope256(world,world.schemaVersion,world.tick*10,world.nextId))return ['Invalid projected WorldPawns header'];
 const metadata=summary??(world.campaignMap?.revision===2?world.campaignMap:undefined);
 const state=world.worldPawns;if(!state)return metadata?.worldPawnOrigins?.length?['WorldPawn origin metadata has no actual WorldPawns owner']:[];
 if(!metadata||world.planet?.revision!==3)return ['WorldPawns projection lacks its actual geographic campaign header'];
 const humans=new Set(state.owners.filter(r=>r.kind==='human').map(r=>r.actor.id));
 if((world.campaignPeople??[]).some(p=>humans.has(p.id))||(summary?.people??[]).some(p=>humans.has(p.id)))return ['WorldPawn original duplicated as campaignPeople'];
 const known=new Set([...(world.pawns??[]).map(p=>p.id),...(world.campaignPeople??[]).map(p=>p.id),...(summary?.people??[]).map(p=>p.id),...metadata.groupLosses.map(l=>l.pawn.id)]);
 for(const group of metadata.groups)if('members'in group.state)for(const pawn of group.state.members)known.add(pawn.id);
 return validateWorldPawnOwners256(state,world,ids,metadata,known);
}
