import {groupMemberChoices,groupSourceChoices,previewGroupFormation,groupRoutePreview,groupPermission,groupTradeQuote} from '../sim/group-authority.ts';
import {SimulationRequestError} from '../bridge/protocol.ts';
import type {World} from '../sim/types.ts';
import type {GroupPanelAdapters,GroupPanelSnapshot} from './group-panel.ts';

export const readGroupPanelSnapshot=(world:World):GroupPanelSnapshot=>({world,planet:world.planet,group:world.group,losses:world.groupLosses??[]});

/** The DOM delegates business facts and all mutation to their true owners. */
export function createGroupAdapters(options:{
  blocked:()=>string|undefined;
  send:GroupPanelAdapters['send'];
  inspectPresentPawn?:GroupPanelAdapters['inspectPresentPawn'];
}):GroupPanelAdapters {
  return {
    capture({world}){
      return {...groupPermission(world),candidates:groupMemberChoices(world),sources:groupSourceChoices(world)};
    },
    previewPlan({world},_facts,{memberIds,sources,destination}){return previewGroupFormation(world,memberIds,sources,destination);},
    previewRoute({world},_facts,destination){return groupRoutePreview(world,destination);},
    quoteTrade({world},_facts,direction,lines){return groupTradeQuote(world,direction,lines);},
    send(command){
      const blocked=options.blocked();
      if(blocked)return Promise.reject(new SimulationRequestError(blocked,'refused'));
      return options.send(command);
    },
    inspectPresentPawn:options.inspectPresentPawn,
  };
}
