import type { Cell,MaterialPile } from './types.ts';

export interface RaiderState { group:number; exiting:boolean; goal:Cell|null }
export interface RaidDeparture { group:number; pawnId:number; name:string; cell:Cell; tick:number; items:MaterialPile[] }
export interface RaidGroup { id:number; startedAt:number; deadline:number; lossPermille:number; members:number[]; lost:number[]; phase:'assault'|'withdraw'; reason?:'losses'|'timeout'|'colony-down' }
export interface RaidResult { id:number; tick:number; reason:'defended'|'withdrawn'|'colony-down'; killed:number; downed:number; escaped:number;captured?:number }
export interface RaidCalendar { profile:'camp-raids-v1'|'cassandra-raids-v1'; rng:number; nextCheck:number|null; serial:number; completed:number; active?:RaidGroup; last?:RaidResult; departed:RaidDeparture[];cassandra?:import('./cassandra-raids.ts').CassandraRaidAgenda }
export function raidRandom(s:Pick<RaidCalendar,'rng'>):number {let x=s.rng;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;}
