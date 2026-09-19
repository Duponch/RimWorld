import { globalLearningFactor } from './traits.ts';
import { TICKS_PER_DAY, type Job, type Pawn, type World } from './types.ts';
import { isConstruction } from './construction-rules.ts';
import { constructionRecipe } from './construction-materials.ts';

/** Millipoints, not a rounded percentage. Core 200 ticks = 20 local ticks. */
export const XP_SCALE = 1000;
export interface SkillRecord { level:number; xp:number; dailyXp:number; passion:0|1|2 }
/** Add a skill only when its producer and consumer are implemented. */
export interface PawnSkills { construction:SkillRecord; medicine:SkillRecord; shooting:SkillRecord; melee:SkillRecord; lastResetTick:number }
export const xpRequired = (level:number):number => (level <= 9 ? 1000*(level+1) : 10000+2000*(Math.min(level,19)-9))*XP_SCALE;
export const learningFactor = (skill:SkillRecord,pawn?:Pick<Pawn,'traits'>):number => (pawn?globalLearningFactor(pawn):1)* [0.35,1,1.5][skill.passion]!*(skill.dailyXp>4000*XP_SCALE ? .2 : 1);
export const constructionSpeed = (pawn:Pawn):number => (3000+875*pawn.skills.construction.level)/10000;
const decay = [100,200,400,600,1000,1800,2800,4000,6000,8000,12000];

export function initialSkills(level=8,passion:0|1|2=0,lastResetTick=-1):PawnSkills {
  return {melee:{level:8,xp:0,dailyXp:0,passion:0},shooting:{level:8,xp:0,dailyXp:0,passion:0},construction:{level,xp:0,dailyXp:0,passion},medicine:{level:8,xp:0,dailyXp:0,passion:0},lastResetTick};
}
/** Scenario choices, not a random biography generator or Core distribution. */
export function startingSkills(index:number):PawnSkills {
  const skills=initialSkills([8,10,4][index%3]!,([1,2,0] as const)[index%3]!);
  skills.medicine.level=[6,3,8][index%3]!;skills.medicine.passion=([1,0,2] as const)[index%3]!;skills.shooting.level=[8,5,3][index%3]!;skills.shooting.passion=([1,0,0] as const)[index%3]!;return skills;
}
export function learnSkill(skill:SkillRecord,baseUnits:number,pawn?:Pick<Pawn,'traits'>):void {
  const units=baseUnits>0 ? Math.round(baseUnits*learningFactor(skill,pawn)) : baseUnits;
  if(units<0&&skill.level===0)return;
  skill.xp+=units;skill.dailyXp+=units;
  while(skill.level<20&&skill.xp>=xpRequired(skill.level)) {skill.xp-=xpRequired(skill.level);skill.level++;}
  if(skill.level===20)skill.xp=Math.min(skill.xp,xpRequired(20)-XP_SCALE);
  // Core permits a debt below zero before losing a level, down to -1000 XP.
  while(skill.xp<=-1000*XP_SCALE&&skill.level>0) {
    skill.level--;skill.xp+=xpRequired(skill.level);
    if(skill.level===0)skill.xp=0;
  }
}
/** Staggered cadence derived from saved tick/id; no clock/cache per actor. */
export function tickSkills(world:World,pawn:Pawn):void {
  if((world.tick%20+pawn.id%20)%20!==0)return;
  const skills=pawn.skills;
  if(world.tick%TICKS_PER_DAY<TICKS_PER_DAY/24&&(skills.lastResetTick<0||world.tick-skills.lastResetTick>=TICKS_PER_DAY/2)) {
    skills.lastResetTick=world.tick;skills.construction.dailyXp=0;skills.medicine.dailyXp=0;skills.shooting.dailyXp=0;skills.melee.dailyXp=0;
  }
  for(const skill of [skills.construction,skills.medicine,skills.shooting,skills.melee]){const loss=decay[skill.level-10];if(loss)learnSkill(skill,-loss);}
}
export function usesConstructionSkill(job:Job):boolean {
  return !job.clearance&&(isConstruction(job)||job.kind==='deconstruct'||job.kind==='uninstall'||job.kind==='install'||job.kind==='build-roof'||job.kind==='remove-roof');
}
/** Called only at the physically reached, executable work phase. */
export function constructionWorkRate(pawn:Pawn,job:Job,light:number,body?:import('./body-capacities.ts').BodyAssessment):number {
  if(!usesConstructionSkill(job))return light*physicalWorkFactor(pawn,'plant',body);
  // Learning precedes the stat query, as in ConstructFinishFrame.
  if(job.kind==='deconstruct'||isConstruction(job)&&!job.furniture) {
    const recipe=job.kind==='deconstruct'&&job.deconstruction ? constructionRecipe(job.deconstruction) : constructionRecipe(job);
    if(recipe.ingredients.length>0)learnSkill(pawn.skills.construction,2500,pawn);
  }
  return light*constructionSpeed(pawn)*physicalWorkFactor(pawn,'build',body);
}
import { physicalWorkFactor } from './health-rules.ts';
