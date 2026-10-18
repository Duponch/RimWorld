import {worldTargetRetreatAvailable263} from './world-target-access-263.ts';
import type {CampaignState,WorldMapRecord} from './world-map-state.ts';
import type {RetainedCaravan261} from './caravan-encounter-state-261.ts';
/** The returned parent is its actual mutable retained owner, not a facade or
 * copied Battlefield. Existing identity/write seals must retain this object. */
export function temporaryRetainedOwner263(root:CampaignState,site:Pick<WorldMapRecord,'id'|'kind'|'tile'|'target263'|'battlefield261'>):{retained:RetainedCaravan261}|undefined {
 const v=Number(root.schemaVersion);
 if((v===261||v===262||v===263)&&site.kind==='battlefield')return site.battlefield261;
 return worldTargetRetreatAvailable263(root,site)?site.target263:undefined;
}
