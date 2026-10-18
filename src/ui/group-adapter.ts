import {groupPanelLocalOrigin} from './group-confirmed-labels';
import {worldTargetRetreatAvailable263} from '../sim/world-target-access-263';
import {actualCampReform260,reformMemberReason260,reformSourceChoices260,previewGroupReform260} from '../sim/group-reform-260';
import {validGroupFreightPack258} from '../sim/group-freight-contract-258';
import {groupAnimalChoices256} from '../sim/group-animal-formation-256';
import {groupBedrollChoices256} from '../sim/group-bedroll-loading-256';
import {previewPlayerRetreat261} from '../sim/caravan-player-retreat-261';
import {groupMemberChoices,groupSourceChoices,previewGroupFormation,groupRoutePreview,groupPermission,groupTradeQuote} from '../sim/group-authority.ts';
import {groupWorld,groupEntryActions} from '../sim/world-map-authority.ts';
import {SimulationRequestError} from '../bridge/protocol.ts';
import type {GroupPanelAdapters,GroupPanelSnapshot} from './group-panel.ts';
import {campaignUIFacts,type CampaignUIState} from './map-registry-adapter';
import {previewGroupItinerary,previewGenericItinerary261} from '../sim/group-travel-estimate';

export function readGroupPanelSnapshot(input:CampaignUIState):GroupPanelSnapshot|undefined {
 const campaign=campaignUIFacts(input),groupId=campaign?.selectedGroupId;
 const world=groupId!==undefined&&groupId!==null?groupWorld(input,groupId):'activeMapId' in input?groupWorld(input,null):input;
 if(!world)return;
 const group=campaign?.groups.find(group=>group.id===groupId);
 return {world,planet:input.planet,group:world.group,losses:world.groupLosses??[],campaign,
  originMapId:group?.localMapId??group?.originMapId??campaign?.activeMapId??world.worldMaps?.selectedMapId??0,
  ...(groupId!==undefined&&groupId!==null?{entryActions:groupEntryActions(input,groupId)}:{}),
 };
}
/** All previews and possessions read the exact selected group's confirmed
 * authority context. No inactive map is manufactured or sent to the renderer. */
export function createGroupAdapters(options:{
 blocked:()=>string|undefined;
 send:GroupPanelAdapters['send'];
 inspectPresentPawn?:GroupPanelAdapters['inspectPresentPawn'];
 pauseForReorganization?:GroupPanelAdapters['pauseForReorganization'];
}):GroupPanelAdapters {
 return {
  capture(snapshot,mode){const {world}=snapshot;const canRetreat=[261,262,263].includes(Number(world.schemaVersion))&&!world.group&&(world.worldMaps?.sites??(world.campaignMap?.revision===2?world.campaignMap.maps:[])).some(s=>s.id===(world.campaignMap?.revision===2?world.campaignMap.activeMapId:world.worldMaps?.selectedMapId)&&(s.kind==='battlefield'||worldTargetRetreatAvailable263(world,s))),retreat=canRetreat&&mode==='retreat',reform=actualCampReform260(world)&&!world.group&&!retreat;return {...groupPermission(world),...groupPanelLocalOrigin(snapshot),reform,retreat,canRetreat,maximumSources:world.piles.length,...canRetreat?{retreatTile:(world.worldMaps?.sites??(world.campaignMap?.revision===2?world.campaignMap.maps:[])).find(s=>s.id===(world.campaignMap?.revision===2?world.campaignMap.activeMapId:world.worldMaps?.selectedMapId))!.tile!}:{},candidates:reform?world.pawns.filter(p=>p.state!=='dead').map(pawn=>{const reason=reformMemberReason260(world,pawn);return {pawn,ok:!reason,...reason?{reason}:{}};}):groupMemberChoices(world),sources:reform?reformSourceChoices260(world):groupSourceChoices(world),animals:groupAnimalChoices256(world),bedrolls:reform?world.packed.filter(p=>p.owner.type==='ground'||p.owner.type==='inventory').map(pack=>{const ok=validGroupFreightPack258(pack,world,world.schemaVersion);return {pack,ok,...!ok?{reason:'Miniature ou composants inadmissibles.'}:{}};}):groupBedrollChoices256(world)};},
  previewPlan({world,originMapId},facts,{memberIds,sources,destination,packedIds,animalIds}){if(facts.retreat)return destination===undefined?{ok:false,reason:'Choisissez la direction de fuite.'}:previewPlayerRetreat261(world,{type:'group-start',retreat261:true,originMapId,memberIds,sources,destination,packedIds,animalIds});return facts.reform?previewGroupReform260(world,{originMapId:originMapId!,memberIds,sources,...destination!==undefined?{destination}:{},packedIds,animalIds}):destination===undefined?{ok:false,reason:'Choisissez une destination.'}:previewGroupFormation(world,memberIds,sources,destination,packedIds,animalIds);},
  previewRoute({world},_facts,destination){return groupRoutePreview(world,destination);},
  previewWaypoints({world},points,mass){return previewGroupItinerary(world,points,mass);},
  previewGenericWaypoints({world},points){return previewGenericItinerary261(world,points);},
  quoteTrade({world},_facts,direction,lines){return groupTradeQuote(world,direction,lines);},
  send(command){const blocked=options.blocked();if(blocked)return Promise.reject(new SimulationRequestError(blocked,'refused'));return options.send(command);},
  inspectPresentPawn:options.inspectPresentPawn,
  pauseForReorganization:options.pauseForReorganization,
 };
}
