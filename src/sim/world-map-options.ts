import type {CampaignState,SettlementLimit} from './world-map-state.ts';
import {registeredCampaign} from './world-map-context.ts';
const limits=new WeakMap<object,SettlementLimit>();
export const validSettlementLimit=(v:unknown):v is SettlementLimit=>typeof v==='number'&&[1,2,3,4,5].includes(v);
export const settlementLimit=(w:CampaignState):SettlementLimit=>limits.get(registeredCampaign(w))??1;
/** Runtime preference, never saved. Lowering it cannot remove an existing colony. */
export function configureSettlementLimit(w:CampaignState,value:SettlementLimit):void {if(!validSettlementLimit(value))throw Error('Invalid settlement limit');limits.set(registeredCampaign(w),value);}
