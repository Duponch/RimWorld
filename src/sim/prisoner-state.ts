import { calendarTick } from './calendar.ts';
import { pawnBody } from './health-rules.ts';
import { moodTarget,moodThoughts } from './mood.ts';
import { opinionOf,socialRandom } from './social-state.ts';
import { TICKS_PER_DAY,type Cell,type Pawn,type World } from './types.ts';

export type PrisonerMode='maintain'|'reduce'|'recruit';
export interface PrisonerState {
  capturedAt:number;initialResistance:number;resistance:number;mode:PrisonerMode;
  lastChatTick?:number;chatDay:number;chatCount:number;rng:number;escape?:Cell;
}
export interface WardFoodTask {kind:'food';patientId:number;sourcePileId:number;carryPileId:number|null;quantity:number;spot:Cell;phase:'pickup'|'deliver'}
export interface WardChatTask {kind:'chat';patientId:number;spot:Cell;phase:'approach'|'rapport'|'closing';progress:number;rapports:number}
export type WardTask=WardFoodTask|WardChatTask;
export const PRISON_CHAT_INTERVAL=1000,PRISON_RAPPORT_TICKS=35,PRISON_RAPPORTS=5;
export const isPrisoner=(p:Pick<Pawn,'prisoner'>):boolean=>!!p.prisoner;
export const prisonDay=(world:World):number=>Math.floor(calendarTick(world)/TICKS_PER_DAY);

/** Limited Drifter reference profile, not a population-intent or pawn-kind generator. */
export function createPrisonerState(world:World,pawn:Pawn):PrisonerState {
  const state={rng:(Math.imul(world.seed^pawn.id,1664525)^Math.imul(world.tick+1,1013904223)^0x3c6ef372)>>>0||1};
  const resistance=7+5*socialRandom(state),floor=Math.floor(resistance);
  const initialResistance=floor+(socialRandom(state)<resistance-floor?1:0);
  return {capturedAt:world.tick,initialResistance,resistance:initialResistance,mode:'maintain',chatDay:prisonDay(world),chatCount:0,rng:state.rng};
}
export function prisonerChatReady(world:World,pawn:Pawn):boolean {
  const p=pawn.prisoner;if(!p||p.escape||p.mode==='maintain'||p.mode==='reduce'&&p.resistance<=0)return false;
  return (p.lastChatTick===undefined||world.tick-p.lastChatTick>PRISON_CHAT_INTERVAL)&&(p.chatDay!==prisonDay(world)||p.chatCount<2);
}
export function recordPrisonerChat(world:World,pawn:Pawn):void {
  const p=pawn.prisoner!;const day=prisonDay(world);
  if(p.chatDay!==day){p.chatDay=day;p.chatCount=0;}
  p.lastChatTick=world.tick;p.chatCount++;
}
export function prisonerNegotiation(pawn:Pawn):number {
  const c=pawnBody(pawn).capacities;
  return Math.max(.4,(.4+.075*(pawn.skills.social?.level??0))*(.1+.9*Math.min(1,c.talking/.95))*(.1+.9*Math.min(1,c.hearing/.8)));
}
/** Core uses the instantaneous thought target, not the smoothed mood gauge. */
export function prisonerResistanceReduction(world:World,warden:Pawn,patient:Pawn):number {
  const mood=moodTarget(moodThoughts(world,patient))/100;
  const moodFactor=mood<=.5?.2+1.6*mood:.5+mood;
  const opinionFactor=1+Math.max(-100,Math.min(100,opinionOf(patient,warden.id,world.tick)))/200;
  return prisonerNegotiation(warden)*moodFactor*opinionFactor;
}
