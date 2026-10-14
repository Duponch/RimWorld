/** V349 physical contained-tree state and commands. */
import type { Cell, Job, MaterialOwner, MaterialPile, Resource } from './types.ts';
export const TREE_SCHEMA=235;
export const TREE_PACK_LIFETIME=42000;
export type TreePack={packedAt:number;expiresAt:number};
export type MinifiedTreePile=Omit<MaterialPile,'kind'|'item'> & {
  kind:'plant';item:'minified-tree';quantity:1;innerResource:Resource;plantPack:TreePack;
};
export type TreeDesignation={resourceId:number};
export type TreeTask=
  | {kind:'extract';resourceId:number}
  | {kind:'replant';sourcePileId:number;resourceId:number;phase:'pickup'|'carry'|'prepare';
     carryPileId:number|null;durationCore?:number;workCore:number};
export type TreeJob=Omit<Job,'kind'> & {kind:'extract-tree'|'replant-tree';tree:TreeTask};
export type TreeCommand=
  | {type:'extract-tree';resourceId:number}
  | {type:'replant-tree';pileId:number;x:number;z:number}
  | {type:'cancel-job';jobId:number}
  | {type:'cancel-resource';resourceId:number}
  | {type:'cancel-pile';pileId:number};
export interface TreeDefinition {label:string;workCore:number;massGrams:number;maxHP:number;minimumGrowth:number;roofBlocked:boolean}
export interface TreeOwnerOccurrence {
  pile:MaterialPile|MinifiedTreePile;
  /** Actual owner/container, not a receipt reference. */
  ownerKey:string;clock:number;active:boolean;
}
/** Captures held object location through its owner's real container. */
export interface TreeOutput {owner:MaterialOwner;quantity:number}
export const isMinifiedTree=(pile:MaterialPile|MinifiedTreePile):pile is MinifiedTreePile=>
  pile.item==='minified-tree'&&pile.kind==='plant';