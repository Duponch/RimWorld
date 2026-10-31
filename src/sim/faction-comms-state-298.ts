import type {Cell,Pawn} from './types.ts';

/** New prospective information/contact domain. Physical phaseCore297 is not renamed. */
export const FACTION_COMMS_SCHEMA_298=298 as const;
export interface FactionCommsTask298 {
 mapId:number;factionId:number;consoleId:number;spot:Cell;phase:'approach'|'ready';
 startedAt:number;startedAtCore:number;
}
export type FactionCommsPawn298=Pawn&{factionComms298?:FactionCommsTask298};
export const factionCommsTask298=(pawn:Pawn):FactionCommsTask298|undefined=>(pawn as FactionCommsPawn298).factionComms298;
export type FactionCommsCommand298=
 |{type:'order-faction-comms';pawnId:number;factionId:number;consoleId:number}
 |{type:'cancel-faction-comms';pawnId:number}
 |{type:'request-ai-core-information';pawnId:number;factionId:number;consoleId:number;quote:string};
/** Scalar history only. The actual Site/map/actor/job remains the sole Thing owner. */
export interface AiCoreInformationReceipt298 {
 revision:1;atCore:number;mapId:number;pawnId:number;factionId:number;consoleId:number;
 cost:1500;silver:{pileId:number;quantity:number}[];coreId:number;
}
/** Internal prepared intent, never a wire-authority payload. */
export interface AiCoreSiteRequest298 {
 kind:'ai-core-information';homeMapId:number;atCore:number;pawnId:number;factionId:number;consoleId:number;
 silver:readonly {pileId:number;quantity:number}[];
}