import {validateTradeRequests284,type TradeRequestsValidationContext284} from './trade-request-save-284.ts';
import type {NumericMembershipSink} from './numeric-membership.ts';
import type {CampaignSummary} from './world-map-state.ts';
import type {World} from './types.ts';

/** Shared holder is transported once, outside the selected spatial map.
 * Public Decoder supplies its complete operation-local physical ID census. */
export function registerProjectedTradeRequests284(w:World,ids:NumericMembershipSink,summary?:CampaignSummary):string[] {
 const metadata=summary??(w.campaignMap?.revision===2?w.campaignMap:undefined);
 const context:TradeRequestsValidationContext284={schemaVersion:w.schemaVersion,tick:w.tick,nextId:w.nextId,planet:w.planet,worldFactions:w.worldFactions,worldSites263:w.worldSites263,
  ...metadata?{maps:metadata.maps}:w.worldMaps?{worldMaps:w.worldMaps}:{},
  ...Object.hasOwn(w,'tradeRequests284')?{tradeRequests284:w.tradeRequests284}:{}};
 return validateTradeRequests284(w.tradeRequests284,context,ids);
}
/** Resident MAIN consumes trusted SIM publications. Check the new closed
 * quest graph/owners without a second RAW campaign or map-grid admission.
 * The full cross-domain census remains at authoritative/public boundaries. */
export function validResidentTradeRequests284(w:World,summary?:CampaignSummary):boolean {
 return registerProjectedTradeRequests284(w,new Set<number>(),summary).length===0;
}
