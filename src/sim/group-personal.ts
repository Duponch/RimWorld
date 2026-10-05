import type { GroupState } from './group-state.ts';
import type { Pawn } from './types.ts';
import { advanceMedical } from './injury-evolution.ts';
import { createMedicalRecord,medicalStatus } from './injury-state.ts';
import { pawnBody } from './health-rules.ts';
import { malnutritionRate } from './malnutrition.ts';
import { advanceHumanAgeAt,humanAgeImmunityFactor } from './human-age.ts';
import { tickSkillsAt } from './skills.ts';
import { expireMealMemoriesAt,personalMoodThoughts,updateMoodFromThoughts,moodFrozen,type PersonalMoodContext } from './mood.ts';
import { updateRecreation } from './recreation-rules.ts';
import { expireSocialMemories } from './social-state.ts';
import { hasMentalBreak,expireMentalCatharsisAt } from './mental-state.ts';
import { depletedHumanHunger,groupRestAfterInterval } from './human-need-rates.ts';

type ActiveGroup=Extract<GroupState,{members:unknown}>;
export interface GroupPersonalContext {
  tick:number;schemaVersion:number;seed:number;
  legacyFood:boolean;legacyRest:boolean;
  /** Captured from the real group before this pass. No old map job/state/bed lookup. */
  resting:boolean;
  infectionChanceFactor:number;
  /** One actual owner/wealth capture for the phase, without a former map room. */
  mood:Pick<PersonalMoodContext,'people'|'expectation'|'difficultyMood'>;
  joyToleranceFall:number;
  random():number;
  notice(person:Pawn,message:string):void;
}
export interface GroupPersonalResult {deceased:Pawn[];incapableIds:number[]}
/** Called once AFTER the local people pass. Root initializes lastPersonalTick
 * at actual departure and reserves terminal storage before that departure.
 * Root's fatal-tick barrier preserves the last confirmed publication/save;
 * it does not roll back a failed in-progress World or its RNG mutations. */
export function advanceGroupPersonal(group:ActiveGroup,c:GroupPersonalContext):GroupPersonalResult|null {
  if(group.lastPersonalTick===c.tick)return null;
  if(group.lastPersonalTick!==c.tick-1||!Number.isSafeInteger(c.tick)||c.tick<1||!group.members.length||new Set(group.members.map(p=>p.id)).size!==group.members.length||group.members.some(p=>p.state==='dead'||p.health?.death))throw Error('Invalid group personal frontier');
  const deceased:Pawn[]=[],incapableIds:number[]=[];
  // Stored group order is persisted: a local deterministic adaptation, not a
  // claim about WorldPawns' individual order. No reordering during this pass.
  for(const p of group.members){
    const healthBefore=p.health;
    // Preserve the local personal ordering and its birthday draw sequence.
    // A birthday may create a dossier AT this tick; that dossier owes zero clinical ticks.
    advanceHumanAgeAt(p,{tick:c.tick,schemaVersion:c.schemaVersion,random:c.random,notice:message=>c.notice(p,message)});
    if(c.schemaVersion>=84&&p.hunger<=0)p.health??=createMedicalRecord(group.lastPersonalTick);
    if(p.health){
      if(p.health.body||p.health.tick!==group.lastPersonalTick&&!(healthBefore===undefined&&p.health.tick===c.tick))throw Error('Invalid human clinical frontier');
      const firstInfection=p.health.infections?.nextId??1;
      advanceMedical(p.health,c.tick-p.health.tick,{phase:p.id%60,posture:c.resting?'ground':'standing',starving:p.hunger<=0,
        malnutritionRate:malnutritionRate(p.id),infectionChanceFactor:c.infectionChanceFactor,hunger:p.hunger,rest:p.rest,
        restingBonus:c.resting&&p.state!=='downed',infectionSeed:(c.seed^Math.imul(p.id,0x9e3779b1))>>>0,
        ageImmunityFactor:humanAgeImmunityFactor(p.age)},c.random);
      for(const infection of p.health.infections?.cases??[])if(infection.id>=firstInfection)c.notice(p,`${p.name} souffre d’une infection.`);
      if(p.health.death){
        // Terminal validation uses the death tick, including expirations that
        // were still valid at the previous living frontier. No age or XP now.
        p.state='dead';expireMealMemoriesAt(p,c.tick);expireSocialMemories(p,c.tick);expireMentalCatharsisAt(p,c.tick);
        deceased.push(p);continue;
      }
    }
    // Exact extracted kernels. Positive/negative disabled XP and existing
    // historical birthdays/memories keep their rules and single World RNG.
    tickSkillsAt(p,c.tick);
    expireMealMemoriesAt(p,c.tick);
    expireSocialMemories(p,c.tick);
    expireMentalCatharsisAt(p,c.tick);
    const body=pawnBody(p),status=p.health?medicalStatus(p.health,body):'mobile';
    if(status==='dead'){p.state='dead';deceased.push(p);continue;}
    if(status==='downed'){p.state='downed';incapableIds.push(p.id);}
    else if(!hasMentalBreak(p))p.state=c.resting?'resting':'idle';
    // This bounded owner does not admit new spatial crisis jobs or accumulate
    // map exposure for replay on return. Existing personal thoughts still act.
    p.hunger=depletedHumanHunger(p,c.legacyFood);
    p.rest=groupRestAfterInterval(p,c.resting,c.legacyRest);
    if(p.mental?.cooldown&&!c.resting&&p.state!=='downed'&&!moodFrozen(p,body))p.mental.cooldown--;
    updateRecreation(p,body,c.joyToleranceFall);
    updateMoodFromThoughts(p,personalMoodThoughts(p,{...c.mood,tick:c.tick,items:group.items}),body);
  }
  // Death leaves immediately for Root's terminal owner at health.death.tick.
  // No terminal mutation, dose, route or ingestion can follow this result.
  group.lastPersonalTick=c.tick;
  return {deceased,incapableIds};
}
