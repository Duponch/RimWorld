import type {Pawn,MaterialPile} from './types.ts';
import type {PackedFurniture} from './furniture-rules.ts';
import type {WorldFactionDef256,WorldFactionRelationKind256} from './world-faction-catalog.ts';
import type {CoreNoExpansionIdeo256,CoreNoExpansionIdeoIds256} from './world-faction-no-expansion-ideo-256.ts';
export const WORLD_FACTION_SCHEMA=256;
export interface WorldFactionInstance256 {lifecycle259?:{revision:1;defeated:boolean;temporary:boolean};id:number;def:WorldFactionDef256;hidden:boolean;name:string;randomKey:number;colorFromSpectrum:number;leaderOwnerId:number|null;noExpansionIdeo?:CoreNoExpansionIdeo256}
export interface WorldFactionRelation256 {aId:number;bId:number;goodwill:number;kind:WorldFactionRelationKind256}
/** Physical owner, not a name-only leader or a second copy of a local Pawn. */
export interface WorldFactionLeader256 {factionId:number;clock:number;pawn:Pawn;items:MaterialPile[];packed:PackedFurniture[]}
/** Generated foreign settlements. Player maps remain their existing worldMaps
 * owners and are combined for globe admission/presentation by the caller. */
export interface WorldFactionSettlement256 {id:number;factionId:number;tile:number;name:string;postId:number|null}
export interface WorldFactionRegistry256 {
 revision:1;contentModel:'original-faction-content-v1';generatedAt:number;playerFactionId:number;
 noExpansionIdeoIds?:CoreNoExpansionIdeoIds256;
 nextFactionId:number;nextSettlementId:number;factions:WorldFactionInstance256[];
 relations:WorldFactionRelation256[];settlements:WorldFactionSettlement256[];leaders:WorldFactionLeader256[];
}

/** Transient post-step500 draft: never a save/packet registry and no player yet. */
export type WorldForeignFactionDraft256=Omit<WorldFactionRegistry256,'playerFactionId'>&{playerFactionId?:never};
