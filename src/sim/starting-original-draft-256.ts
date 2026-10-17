import {constructDeliveredStartingOriginalRoster256,type StartingOriginalRoster256} from './starting-original-roster-256.ts';
import type {StartingOriginalRequest256} from './starting-original-request-256.ts';
import {isCampaignGeography256,type CampaignGeography256} from './world-geography-owner-256.ts';
import {describeWorldSite} from './world-site-geography.ts';
import type {GeographicWorldDraft256} from './world-geographic-draft.ts';
import type {RelationshipPerson} from './relationship-state.ts';
/** No local World or map generation here. The actual completed world draft is
 * the sole owner of these leaders, faction instances and nextThingId frontier.
 * Current creation protocol generates this draft at tick0; other clocks refuse.
 * Absolute entry time is a REQUIRED captured input, not inferred from tick0.
 * No global random cursor or arbitrary number of constructor draws is invented. */
export function prepareStartingOriginalDraft256(draft:GeographicWorldDraft256,geography:CampaignGeography256,tile:number,request:StartingOriginalRequest256,absoluteCore:number):StartingOriginalRoster256 {
 if(!isCampaignGeography256(geography)||geography.surface!==draft.surface||draft.factions.generatedAt!==0||!Number.isSafeInteger(tile)||tile<0||tile>=geography.surface.tiles.length)throw Error('Missing actual new-world roster frontier');
 const site=describeWorldSite(geography.surface,geography.roads,tile),knownThingIds=new Set<number>(),knownPeople=new Map<number,RelationshipPerson>();
 for(const leader of draft.factions.leaders){
  for(const id of [leader.pawn.id,...leader.items.map(p=>p.id),...leader.packed.map(p=>p.building.id)]){if(knownThingIds.has(id)||id>=draft.nextThingId)throw Error('Actual world draft identity frontier is inconsistent');knownThingIds.add(id);}
  knownPeople.set(leader.pawn.id,{id:leader.pawn.id,name:leader.pawn.name,status:'away'});
 }
 return constructDeliveredStartingOriginalRoster256(request,{nextId:draft.nextThingId,factions:draft.factions,knownPeople,knownThingIds,context:{seed:site.mapSeed>>>0,width:250,height:250},absoluteCore});
}
