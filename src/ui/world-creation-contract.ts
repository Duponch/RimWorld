import type {CampaignGeography256} from '../sim/world-geography-owner-256';
import type {WorldGenerationSettings} from '../sim/world-generation-settings';
import type {StartingOriginalRequest256} from '../sim/starting-original-request-256';
/** A UI boundary, not a persisted shape or a replacement simulation protocol. */
export interface WorldCreationPlayer256 {scenario:string;playerDef:'PlayerColony'|'PlayerTribe';playerName:string}
export interface WorldCreationRequest256 {seed:string;settings:WorldGenerationSettings;player:WorldCreationPlayer256}
export interface WorldCreationProgress256 {phase:string;completed:number;total:number}
export interface WorldCreationFaction256 {id:number;name:string;def:string;hidden:boolean}
export interface WorldCreationSettlement256 {id:number;factionId:number;tile:number;name:string}
/** Main supplies this owner only after the real external geography boundary.
 * NPC summaries do not own leaders, people, items, local maps or random state. */
export interface WorldCreationPreview256 {generation:number;key:string;request:WorldCreationRequest256;geography:CampaignGeography256;factions:readonly WorldCreationFaction256[];settlements:readonly WorldCreationSettlement256[]}
export interface WorldCreationSiteRequest256 {generation:number;key:string;tile:number;size:250}
/** Opaque worker receipt, scoped to the exact draft/player/site confirmed. */
export interface WorldCreationTicket256 extends WorldCreationSiteRequest256 {ticket:string;player:WorldCreationPlayer256}
export interface WorldCreationCallbacks256 {
 generate(request:WorldCreationRequest256,context:{signal:AbortSignal;onProgress:(progress:WorldCreationProgress256)=>void}):Promise<WorldCreationPreview256>;
 confirmSite(request:WorldCreationSiteRequest256):Promise<WorldCreationTicket256>;
 /** Resolves after the actual new colony snapshot is accepted, not merely a command sent. */
 start(ticket:WorldCreationTicket256,startingParty:StartingOriginalRequest256,context:{signal:AbortSignal;onProgress:(progress:WorldCreationProgress256)=>void}):Promise<void>;
}
