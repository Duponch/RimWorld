import type {MaterialPile} from './types.ts';
import type {WeaponQuality} from './equipment-rules.ts';
import type {WorldFactionRelationKind256} from './world-faction-catalog.ts';
/** Historical receipts are facts, never additional Thing or person owners. */
export const PEACE_TALKS_OUTCOMES_293=['disaster','backfire','flounder','success','triumph'] as const;
export type PeaceTalksOutcome293=typeof PEACE_TALKS_OUTCOMES_293[number];
export interface PeaceTalksDelivered293 {id:number;item:MaterialPile['item'];quantity:number;carrierId:number;quality?:WeaponQuality}
export interface PeaceTalksResult293 {
 groupId:number;negotiatorId:number;outcome:PeaceTalksOutcome293;negotiationAbility:number;
 goodwill:{before:number;kindBefore:WorldFactionRelationKind256;requested:number;adjusted:number;after:number;kindAfter:WorldFactionRelationKind256};
 /** Human XP actually added after passion and cap; not local milliXP. */
 socialXp:{direct:true;requested:6000;credited:number};
 reward?:{budget:number;marketValue:number;massGrams:number;delivered:PeaceTalksDelivered293[]};
 attack?:{phase:'pending';groupId:number;points:number;enemyIds:number[]}|{phase:'entered';mapId:number;atCore:number;points:number;enemyIds:number[]};
}
export interface PeaceTalksSite293 {
 kind:'peace-talks';id:number;tile:number;factionId:number;createdAtCore:number;expiresAtCore:number;mapId:null;questTag:string;
 closed?:{atCore:number;reason:'expired'}|{atCore:number;reason:'resolved';result:PeaceTalksResult293};
}
export type PeaceTalksArrival293={kind:'peace-talks';siteId:number};
