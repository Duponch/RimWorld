import type { Cell } from './types.ts';

export interface JoinerQuest {
  relationship?:import('./relationship-state.ts').OfferedRelationship;
  background?:import('./colonist-backgrounds.ts').ColonistBackground; age?:import('./human-age.ts').HumanAge;
  id:number; offeredAt:number; expiresAt:number; name:string; profile:0|1|2;
  joinDelay:number; raidDelay:number;
  status:'offered'|'accepted'|'refused'|'expired'|'concluded';
  acceptedAt?:number; arrivedAt?:number; pawnId?:number; entry?:Cell;
  raidAt?:number; raidGroupId?:number; endedAt?:number;
}
export interface QuestCalendar {
  profile:'pursued-joiner-v1'; adoptedAt:number; rng:number; nextCheck:number; serial:number;
  entries:JoinerQuest[];
}
export type QuestCommand={type:'enable-quests'}|{type:'answer-quest';questId:number;accept:boolean};
export const QUEST_OFFER_TICKS=1800;
export const QUEST_RETRY_TICKS=100;
export const QUEST_HISTORY_LIMIT=32;
