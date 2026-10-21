/** Planet3 owns one finite stock per real foreign settlement. Read paths
 * never generate goods or substitute canonical/previously visited stocks. */
import {registeredCampaign,boundWorldGroup} from './world-map-context.ts';
import {worldSettlementTradeTarget256,draftWorldSettlementPost256} from './world-faction-access.ts';
import {localSurfaceMapSeed} from './world-site-geography.ts';
import type {World} from './types.ts';
import type {CampaignSummary} from './world-map-state.ts';
import type {AwayGroup} from './group-capture.ts';
import type {CivilianPost} from './commercial-state.ts';
export function groupGeographicTradeTarget256(w:World,g:AwayGroup){
 const root=registeredCampaign(w);if(root.planet?.revision!==3||!root.worldFactions)return;
 const metadata=w.campaignMap?.revision===2?w.campaignMap:'maps' in w?w as unknown as CampaignSummary:undefined;
 const row=metadata?.groups.find(r=>r.id===g.id),posts=root.worldGroups?.posts??(row?.post&&row.postId!==undefined?[{id:row.postId,state:row.post}]:[]);
 const settlement=root.worldFactions.settlements.find(s=>s.tile===g.tile);return settlement?worldSettlementTradeTarget256(root.worldFactions,settlement.id,g,posts,w.tick):undefined;
}
/** Called only on the driver's real arrival event; refusal changes no ID or
 * stock. The ordinary stock producer is reused with a stable settlement seed. */
export function arriveGeographicGroupPost256(w:World,g:AwayGroup):boolean {
 const root=registeredCampaign(w),groups=root.worldGroups,factions=root.worldFactions;if(root.planet?.revision!==3||!groups||!factions)return false;
 const record=boundWorldGroup(w);if(!record||record.state!==g)return false;const settlement=factions.settlements.find(s=>s.tile===g.tile);if(!settlement)return false;
 const draft=draftWorldSettlementPost256(factions,settlement.id,g,groups.posts,{seed:localSurfaceMapSeed(root.planet.generationSeed,settlement.tile),tick:w.tick,nextId:w.nextId,schemaVersion:w.schemaVersion},groups.nextPostId);if(!draft)return false;
 root.worldFactions=draft.registry;const index=groups.posts.findIndex(p=>p.id===draft.post.id);if(index<0)groups.posts.push(draft.post);else groups.posts[index]=draft.post;
 groups.nextPostId=draft.nextPostId;root.nextId=draft.nextThingId;record.postId=draft.post.id;return true;
}
/** The quote/confirmation has already captured and revalidated this exact
 * owner. All refusals happen before the transaction's closed adoption. */
export function commitGeographicGroupPost256(w:World,postId:number,post:CivilianPost):void {
 const root=registeredCampaign(w),record=root.worldGroups?.posts.find(p=>p.id===postId);if(!record)throw Error('Admitted geographic post disappeared');record.state=post;
}
