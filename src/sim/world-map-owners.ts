import type {World} from './types.ts';
import {emptySpoilage} from './food-preservation.ts';
import type {CampaignState,WorldGroupRecord} from './world-map-state.ts';
import {registeredCampaign,sharedCampaignData,worldGroupContext,registeredMaps,registeredMapForValidation,registeredMapId,brandCampaignContext,boundWorldGroup,postFor,forwardCampaignFields,attachPost,brandLossProjection,projectionAllowsFilth} from './world-map-context.ts';
const keys=new WeakMap<object,string>();
export const campaignOwnerKey=(v:World):string|undefined=>keys.get(v)??(boundWorldGroup(v)?`group:${boundWorldGroup(v)!.state.id}`:undefined)??(registeredMapId(v)!==undefined?`map:${registeredMapId(v)}`:undefined);
/** Validation/ownership view only. There is never a selected or stepped fake map. */
export function emptyCampaignOwner(root:CampaignState,context?:WorldGroupRecord['context']):World {const m=root.worldMaps!;return {...sharedCampaignData(root),seed:m.campaignSeed,width:m.mapSize.width,height:m.mapSize.height,...context,tiles:[],pawns:[],resources:[],structures:[],jobs:[],piles:[],stockpiles:[],growingZones:[],packed:[],events:root.worldGroups!.events,groupLosses:[],growingCursor:0,logisticsCursor:0,environment:'temperate-equinox-v1',stock:{wood:0,food:0},spoiled:emptySpoilage(),deconstructed:{count:0,lostWood:0,fuelTicks:0}};}
export function globalOwnerContexts(input:CampaignState,validation=false):World[] {const root=registeredCampaign(input),r=root.worldGroups;if(!r)return [];const result:World[]=[];
 for(const g of r.groups)if('members' in g.state){const live=worldGroupContext(root,g.state.id,validation)!,view=validation?{...live}:live;if(projectionAllowsFilth(live))brandLossProjection(view,true);brandCampaignContext(view,root,g.originMapId,g);keys.set(view,`group:${g.state.id}`);result.push(view);}
 for(const context of r.lossContexts){if(r.groups.some(g=>g.state.id===context.groupId&&'members' in g.state))continue;const view=emptyCampaignOwner(root,context.context);view.groupLosses=r.losses.filter(l=>l.groupId===context.groupId);brandLossProjection(view,!!registeredMapForValidation(root,context.originMapId)?.filth||r.abandonedContents.find(a=>a.mapId===context.originMapId)?.filthPresent===true);brandCampaignContext(view,root);keys.set(view,`losses:${context.groupId}`);result.push(view);}
 for(const old of r.legacyTravellers){const view=emptyCampaignOwner(root,old.context);if(old.scout)view.scout=old.scout;if(old.commercialTrip)view.commercialTrip=old.commercialTrip;view.civilianPost=postFor(root,old);brandCampaignContext(view,root);keys.set(view,`legacy:${old.originMapId}`);result.push(view);}
 return result;
}
export function allCampaignOwnerContexts(input:CampaignState,validation=false):World[] {const root=registeredCampaign(input);return [...(validation?root.worldMaps!.sites.map(m=>registeredMapForValidation(root,m.id)!):registeredMaps(root)),...globalOwnerContexts(root,validation)];}

export function legacyTravellerContext(root:CampaignState,r:NonNullable<CampaignState['worldGroups']>['legacyTravellers'][number]):World {const view=emptyCampaignOwner(root,r.context);forwardCampaignFields(view,root);attachPost(view,root,r);if(r.scout)view.scout=r.scout;if(r.commercialTrip)view.commercialTrip=r.commercialTrip;keys.set(view,`legacy:${r.originMapId}`);return view;}
