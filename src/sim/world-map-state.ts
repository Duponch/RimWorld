import type {World,Cell,Pawn,MaterialPile} from './types.ts';
import type {CampaignField,SecondaryMap} from './secondary-site-state.ts';
import type {GroupState,GroupLoss} from './group-state.ts';
import type {PackedFurniture} from './furniture-rules.ts';
export const WORLD_MAP_SCHEMA=255;
export type SettlementLimit=1|2|3|4|5;
export type WorldMapKind='settlement'|'camp'|'legacy-site';
export type LocalMapState=Omit<SecondaryMap,'group'|'groupLosses'|'worldMaps'|'worldGroups'|'civilianPost'>;
export interface WorldMapRecord {
 id:number;tile:number|null;kind:WorldMapKind;createdAt:number;
 /** Exactly the rootMapId record omits map: its originals live on the loaded root. */
 map?:LocalMapState;
 /** Historical reference roster only, never another owner. New formations do not require it. */
 postId?:number;
 visit:null|{groupId:number;memberIds:number[];homeEntry:Cell};
}
export interface RetiredWorldMap {id:number;tile:number|null;kind:WorldMapKind;createdAt:number;removedAt:number;reason:'abandon'|'camp-empty';markerUntilCore?:number}
export interface WorldMapRegistry {
 revision:1;rootMapId:number|null;selectedMapId:number|null;nextMapId:number;
 campaignSeed:number;calendarOrigin:number;mapSize:{width:number;height:number};sites:WorldMapRecord[];retired:RetiredWorldMap[];
}
/** State is the existing literal contract, including absent old freight/provisions. */
export interface WorldGroupRecord {postId?:number;originMapId:number;localMapId:number|null;context:Pick<World,'seed'|'width'|'height'|'climate'|'site'|'scenario'>;state:GroupState}
/** The original holder remains explicit after local DeSpawn. No local map is retained. */
export interface AbandonedWorldPawn {id:number;name:string;kind:import('./human-owners.ts').HumanOwnerKind;clock:number;pawn?:Pawn;items:MaterialPile[];packed:PackedFurniture[];carriedById?:number;podId?:number;guest?:Pick<Pawn,'prisoner'|'visitor'|'podRescue'|'raid'>}
export interface AbandonedMapContents {mapId:number;tile:number;removedAt:number;context:WorldGroupRecord['context'];filthPresent:boolean;humans:AbandonedWorldPawn[];animals:{animal:import('./wildlife-state.ts').WildAnimal;carriedById?:number}[];pods:{id:number;pawnId:number;items:MaterialPile[]}[];lost:{items:import('./thing-damage-rules.ts').FireItemLoss;structures:number;resources:number;packed:number}}
export interface LegacyWorldTraveller {originMapId:number;postId?:number;context:WorldGroupRecord['context'];scout?:World['scout'];commercialTrip?:World['commercialTrip']}
export interface WorldGroupRegistry {revision:1;lostMemories:import('./world-map-lost.ts').LostCampaignMemory[];events:import('./types.ts').WorldEvent[];posts:{id:number;state:NonNullable<World['civilianPost']>}[];nextPostId:number;canonicalPostId:number|null;legacyTravellers:LegacyWorldTraveller[];selectedGroupId:number|null;groups:WorldGroupRecord[];losses:GroupLoss[];lossContexts:{groupId:number;context:WorldGroupRecord['context'];originMapId:number}[];abandonedPawns:AbandonedWorldPawn[];abandonedContents:AbandonedMapContents[]}
export type SharedCampaignState=Pick<World,CampaignField>;
/** No tiles, pawns, structures, local seed or fake local World when the last map is gone. */
export type MaplessCampaign=SharedCampaignState&{worldMaps:WorldMapRegistry;worldGroups:WorldGroupRegistry};
export type CampaignState=World|MaplessCampaign;
export interface MapAction {ok:boolean;reason?:string}
export interface CampaignMapSummary {id:number;tile:number|null;kind:WorldMapKind;createdAt:number;pawnCount:number;selected:boolean;actions:{view:MapAction;settle:MapAction;abandon:MapAction};abandonConsequences:{pawns:{id:number;name:string}[];groundItems:number;structures:number}}
export interface CampaignGroupSummary {id:number;originMapId:number;localMapId:number|null;phase:GroupState['phase'];originTile:number|null;tile:number|null;memberIds:number[];mass:{grams:number;capacityGrams:number}|null;filthPresent:boolean;postId?:number;post?:World['civilianPost'];context:WorldGroupRecord['context'];entryActions:Record<'visit'|'camp'|'settle',MapAction>;state:GroupState}
export interface MapIncident {mapId:number;kind:'raid'|'mechanoid'|'visitor'|'manhunter'|'downed';count:number;actorId:number}
export type CampaignLossContext=WorldGroupRegistry['lossContexts'][number]&{filthPresent:boolean};
export interface CampaignMapPresentation {revision:2;campaignSeed:number;mapSize:{width:number;height:number};groupLosses:GroupLoss[];activeMapId:number;rootMapId:number;maxSettlements:SettlementLimit;selectedGroupId:number|null;maps:CampaignMapSummary[];groups:CampaignGroupSummary[];lossContexts:CampaignLossContext[];lostMemories:WorldGroupRegistry['lostMemories'];incidents:MapIncident[]}
export type CampaignSummary=SharedCampaignState&{worldMaps?:never;worldGroups?:never;tick:number;civilTick:number;campaignSeed:number;mapSize:{width:number;height:number};events:import('./types.ts').WorldEvent[];people:import('./relationship-state.ts').RelationshipPerson[];groupLosses:GroupLoss[];activeMapId:number|null;rootMapId:number|null;maxSettlements:SettlementLimit;selectedGroupId:number|null;maps:CampaignMapSummary[];groups:CampaignGroupSummary[];lossContexts:CampaignLossContext[];lostMemories:WorldGroupRegistry['lostMemories'];incidents:MapIncident[]};
export type WorldMapCommand=
 |{type:'map-view';mapId:number|null}
 |{type:'map-settle';mapId:number}
 |{type:'map-abandon';mapId:number;confirm:boolean}
 |{type:'group-select';groupId:number|null}
 |{type:'group-enter';groupId:number;mode:'visit'|'camp'|'settle'};

const dataRecord=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&Object.hasOwn(Object.getOwnPropertyDescriptor(v,k)!,'value'));
/** Pure envelope attestation; the complete worker save guard remains authoritative. */
export function isMaplessCampaign(value:unknown):value is MaplessCampaign {
 if(!dataRecord(value)||!Number.isSafeInteger(value.schemaVersion)||Number(value.schemaVersion)<255||!dataRecord(value.worldMaps)||!dataRecord(value.worldGroups))return false;
 const allowed=['schemaVersion','tick','rng','nextId','planet','research','relationships','foodPolicies','nextFoodPolicyId','apparelPolicies','nextApparelPolicyId','foodRules','restRules','gameProfile','worldIncidents','worldMaps','worldGroups'];
 if(Reflect.ownKeys(value).some(k=>typeof k!=='string'||!allowed.includes(k)))return false;
 const m=value.worldMaps,g=value.worldGroups;return m.revision===1&&m.rootMapId===null&&m.selectedMapId===null&&Array.isArray(m.sites)&&m.sites.length===0&&Reflect.ownKeys(m.sites).length===1&&g.revision===1&&Array.isArray(g.groups)&&Array.isArray(g.losses)&&Array.isArray(g.abandonedPawns)&&Array.isArray(g.abandonedContents)&&Array.isArray(g.legacyTravellers)&&Array.isArray(g.events);
}
