import {groupAnimalChoices256} from '../sim/group-animal-formation-256';
import {groupBedrollChoices256} from '../sim/group-bedroll-loading-256';
import {groupMemberChoices,groupSourceChoices,previewGroupFormation,groupRoutePreview,groupPermission,groupTradeQuote} from '../sim/group-authority.ts';
import {groupWorld,groupEntryActions} from '../sim/world-map-authority.ts';
import {SimulationRequestError} from '../bridge/protocol.ts';
import type {GroupPanelAdapters,GroupPanelSnapshot} from './group-panel.ts';
import {campaignUIFacts,type CampaignUIState} from './map-registry-adapter';

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
  capture({world}){return {...groupPermission(world),candidates:groupMemberChoices(world),sources:groupSourceChoices(world),animals:groupAnimalChoices256(world),bedrolls:groupBedrollChoices256(world)};},
  previewPlan({world},_facts,{memberIds,sources,destination,packedIds,animalIds}){return previewGroupFormation(world,memberIds,sources,destination,packedIds,animalIds);},
  previewRoute({world},_facts,destination){return groupRoutePreview(world,destination);},
  quoteTrade({world},_facts,direction,lines){return groupTradeQuote(world,direction,lines);},
  send(command){const blocked=options.blocked();if(blocked)return Promise.reject(new SimulationRequestError(blocked,'refused'));return options.send(command);},
  inspectPresentPawn:options.inspectPresentPawn,
  pauseForReorganization:options.pauseForReorganization,
 };
}