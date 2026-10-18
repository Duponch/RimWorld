import {stepWorldPawnGC256} from './world-pawn-gc-256.ts';
import {actualWorldPawnGCReader259} from './world-pawn-mechanical-gc-259.ts';
import {advanceCaravanCaptivity261} from './caravan-captivity-261.ts';
import {isSchema256Or257} from './schema-compatibility-257.ts';
import type {CampaignState} from './world-map-state.ts';
import {prepareWorldPawnLife256} from './world-pawn-life-256.ts';
/** Called once from the actual campaign local-tick loop, after local/caravan
 * work. No second clock, background timer, fabricated map or historical catchup.
 * Schema259 uses the approved closed-model mechanical capture for actual GC.
 * Human/animal histories retain conservative Unknown facts.
 * MapRemoved and redress retain their own actual-owner guards. */
export function advanceActualWorldPawns256(root:CampaignState):void {
 const state=root.worldPawns;if(!state)return;
 if(!isSchema256Or257(root.schemaVersion)||root.planet?.revision!==3||!root.worldMaps||!root.worldGroups)throw Error('WorldPawns requires its actual geographic campaign');
 const atCore=root.tick*10;
 if(!Number.isSafeInteger(atCore)||state.atCore+10!==atCore)throw Error('WorldPawns actual campaign interval skipped or duplicated');
 const plan=prepareWorldPawnLife256(state,atCore,root,root.schemaVersion);if(!plan.ok)throw Error(plan.reason);
 plan.commit();
 advanceCaravanCaptivity261(root);
 // One local interval pays ten Core work units at this confirmed frontier;
 // no backdated discard or ten biological/calendar passes are fabricated.
 if((Number(root.schemaVersion)===259||Number(root.schemaVersion)===260||(Number(root.schemaVersion)===261||(Number(root.schemaVersion)===262||Number(root.schemaVersion)===263))))stepWorldPawnGC256(state,atCore,actualWorldPawnGCReader259(root),10);
 // Only a committed clinical notice becomes a campaign event. Refusal emits
 // nothing and leaves this registry's originals and RNG byte-identical.
 for(const message of plan.notices)root.worldGroups.events.push({tick:root.tick,type:'need',message});
 if(root.worldGroups.events.length>80)root.worldGroups.events.splice(0,root.worldGroups.events.length-80);
}
