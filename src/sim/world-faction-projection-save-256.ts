/** Confirm the actual mutable faction authority in MAIN. Inactive trading
 * stocks are deliberately absent from snapshots: their positive unique post
 * references are checked here, while full RAW checks every real post owner. */
import {validateWorldFactionRegistry256} from './world-faction-save.ts';
import {planetTileCount} from './planet-geography-256.ts';
import {createGiftReceiptProvenance274} from './diplomatic-gift-provenance-274.ts';
import type {NumericMembershipSink} from './numeric-membership.ts';
import type {CampaignSummary} from './world-map-state.ts';
import type {World} from './types.ts';

export function registerProjectedFactionOwners256(world:World,ids:NumericMembershipSink,summary?:CampaignSummary):string[] {
 const projection=summary??(world.campaignMap?.revision===2?world.campaignMap:undefined);
 const giftProvenance=createGiftReceiptProvenance274(world.worldFactions,world.schemaVersion);
 const validGifts=()=>giftProvenance(world.civilianPost)&&(projection?.groups??[]).every(row=>row.post===undefined||row.postId!==undefined&&giftProvenance(row.post,row.postId));
 const present=Object.hasOwn(world,'worldFactions');
 if(!present)return !validGifts()?['Invalid projected diplomatic gift recipient provenance.']:world.planet?.revision===3?['Geographic projection lacks its faction authority.']:[];
 if(world.schemaVersion<256||world.planet?.revision!==3)return ['Future faction authority in a historical projection.'];
 if(!projection)return ['Geographic faction authority lacks its actual campaign metadata.'];
 const posts=new Set<number>();for(const row of projection.groups)if(row.postId!==undefined)posts.add(row.postId);
 const known=new Set<number>([...world.pawns.map(p=>p.id),...(world.campaignPeople??[]).map(p=>p.id),...(summary?.people??[]).map(p=>p.id),...(world.worldPawns?.owners??[]).filter(r=>r.kind==='human').map(r=>r.actor.id)]);
 const errors=validateWorldFactionRegistry256(world.worldFactions,world.schemaVersion,{
  present,tick:world.tick,width:projection.mapSize.width,height:projection.mapSize.height,nextId:world.nextId,
  tileCount:planetTileCount(world.planet),postIds:posts,allowUnobservedPostReferences:true,
  knownHumanIds:known,occupiedThingIds:ids,
 });
 if(errors.length)return errors;
 if(!validGifts())return ['Invalid projected diplomatic gift recipient provenance.'];
 const registry=world.worldFactions!;
 for(const post of posts)if(!registry.settlements.some(s=>s.postId===post))return ['Projected trading post lacks its real faction settlement.'];
 // References to remote people are knowledge, while a leader remains exactly
 // one real detached owner. A local/away collision was refused above.
 for(const owner of registry.leaders)ids.add(owner.pawn.id);
 return [];
}
