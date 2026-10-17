import type {CampaignState} from './world-map-state.ts';
import {prepareWorldPawnLife256} from './world-pawn-life-256.ts';
/** Called once from the actual campaign local-tick loop, after local/caravan
 * work. No second clock, background timer, fabricated map or historical catchup.
 * GC is not scheduled: missing bond/tale/log authorities remain unresolved.
 * Conditional MapRemoved and redress use their own actual-owner guards. */
export function advanceActualWorldPawns256(root:CampaignState):void {
 const state=root.worldPawns;if(!state)return;
 if(root.schemaVersion!==256||root.planet?.revision!==3||!root.worldMaps||!root.worldGroups)throw Error('WorldPawns requires its actual geographic campaign');
 const atCore=root.tick*10;
 if(!Number.isSafeInteger(atCore)||state.atCore+10!==atCore)throw Error('WorldPawns actual campaign interval skipped or duplicated');
 const plan=prepareWorldPawnLife256(state,atCore,root);if(!plan.ok)throw Error(plan.reason);
 plan.commit();
 // Only a committed clinical notice becomes a campaign event. Refusal emits
 // nothing and leaves this registry's originals and RNG byte-identical.
 for(const message of plan.notices)root.worldGroups.events.push({tick:root.tick,type:'need',message});
 if(root.worldGroups.events.length>80)root.worldGroups.events.splice(0,root.worldGroups.events.length-80);
}
