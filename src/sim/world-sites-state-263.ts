import type {MaterialPile} from './types.ts';
import type {RetainedCaravan261} from './caravan-encounter-state-261.ts';
/** New actual world intents only. No load/bootstrap creates a target. */
export type WorldEntryTarget263=
 |{kind:'attack-settlement';settlementId:number;factionId:number;confirmed:true}
 |{kind:'visit-site';siteId:number};
export interface PendingWorldEntry263 {revision:1;requestedAtCore:number;target:WorldEntryTarget263}
/** Born only after an actual first foreign-base generation; absence in an
 * older settlement never pretends that inhabitants were already generated. */
export interface ForeignSettlementAdmission263 {revision:1;mapId:number|null;generatedAtCore:number;inhabitantIds:number[];cooldownUntilCore?:number}
export type LocalWorldTarget263=
 |{revision:1;kind:'foreign-settlement';settlementId:number;factionId:number;retained:RetainedCaravan261;destroyedSiteId?:number}
 |{revision:1;kind:'quest-site';siteId:number;retained:RetainedCaravan261};
interface WorldSiteHeader263 {id:number;tile:number;factionId:number|null;createdAtCore:number;mapId:number|null;enterCooldownUntilCore?:number}
/** The closed receipt has no Thing/actor owner; unvisited expiry consumes only
 * the actual held contents, never stocks belonging to a map or a caravan. */
export interface ClosedWorldSite263 {atCore:number;reason:'expired'|'map-removed';lost:{id:number;item:MaterialPile['item'];quantity:number}[]}
export type ItemStashThreat263={kind:'none'}
 |{kind:'ambush-edge'|'ambush-hidden';points:number}
 |{kind:'outpost'|'turrets';factionId:number;points:number}
 |{kind:'manhunters'|'sleeping-mechanoids';points:number};
export interface ItemStash263 extends WorldSiteHeader263 {
 kind:'item-stash';expiresAtCore:number|null;heldAtCore:number;items:MaterialPile[];
 threat:ItemStashThreat263;closed?:ClosedWorldSite263;
}
export interface DestroyedSettlement263 extends WorldSiteHeader263 {kind:'destroyed-settlement';factionId:number;sourceSettlementId:number}
export type WorldSite263=ItemStash263|DestroyedSettlement263;
/** One narrow non-Royalty Cassandra quest cycle; persisted future checks only.
 * Absent families keep their own tickets and never become another ItemStash. */
export interface WorldQuestCalendar263 {
 revision:1;adoptedAtCore:number;nextCheckCore:number;cycle:number;
 pendingCore:number|null;previousHitInterval:number;rng:number;
 opportunities:number;siteOffers:number;recent:string[];
 /** Prospective watcher: never reconstructed from a pre263 campaign history. */
 populationAdaptationDays:number;populationAtCore:number;knownColonistIds:number[];
}
export interface WorldSitesState263 {revision:1;nextId:number;entries:WorldSite263[];quest?:WorldQuestCalendar263}
