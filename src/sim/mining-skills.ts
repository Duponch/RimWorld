import { HEALTHY_BODY, type BodyAssessment } from './body-capacities.ts';
import { pawnBody, physicalWorkFactor } from './health-rules.ts';
import { learnSkill, type SkillRecord } from './skills.ts';
import type { Pawn } from './types.ts';

/** Historical absence is neutral, without inventing a saved biography. */
const NEUTRAL_MINING:Readonly<SkillRecord> = Object.freeze({level:8,xp:0,dailyXp:0,passion:0});
const MINING_YIELD_BY_LEVEL = Object.freeze([
  .60,.70,.80,.85,.90,.925,.95,.975,1,1.01,1.02,
  1.03,1.04,1.05,1.06,1.07,1.08,1.09,1.10,1.12,1.13,
]);

export const miningSkill=(pawn:Pawn):Readonly<SkillRecord>=>pawn.skills.mining??NEUTRAL_MINING;

/** The optional light factor precedes Core's final stat minimum. The ordinary
 * inspection reads the same stat before light by leaving that factor at one. */
export function miningWorkSpeed(pawn:Pawn,body?:BodyAssessment,light=1):number {
  const physical=physicalWorkFactor(pawn,'mine',body);
  if(physical<=0)return 0;
  return Math.max(.1,(.04+.12*miningSkill(pawn).level)*physical*light);
}

/** MiningYield affects resource ores; natural-rock chunks are non-wasteable. */
export function miningYield(pawn:Pawn,body?:BodyAssessment):number {
  const capacities=pawn.health?(body??pawnBody(pawn)).capacities:HEALTHY_BODY.capacities;
  const manipulation=.7+.3*Math.min(1,capacities.manipulation);
  const sight=.8+.2*Math.min(1,capacities.sight);
  return Math.max(0,Math.min(1.25,MINING_YIELD_BY_LEVEL[miningSkill(pawn).level]!*manipulation*sight));
}

/** Call only at executable contact, after the first stroke's capture. */
export function learnMining(pawn:Pawn):void {
  const skill=pawn.skills.mining??={level:8,xp:0,dailyXp:0,passion:0};
  learnSkill(skill,700,pawn);
}
