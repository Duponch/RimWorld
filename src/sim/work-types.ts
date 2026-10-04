import { backgroundWorkRefusal, backgroundSkillRefusal, type BackgroundSkillId } from './colonist-backgrounds.ts';
import type { HaulDestination, Job, Pawn, WorkType } from './types.ts';

/** Provider identity is separate from assignment and from a temporary forced
 * priority. These queries do not reserve or change the saved work table. */
export const workType=(job:Pick<Job,'kind'|'growingZoneId'|'flowerPotId'|'installationWork'>):WorkType=>job.kind==='flick'?'basic':job.kind==='mine'?'mine':job.installationWork??(job.growingZoneId!==undefined||job.flowerPotId!==undefined||job.kind==='sow'?'grow':['chop','harvest','cut'].includes(job.kind)?'gather':'build');
export const workPriority=(pawn:Pick<Pawn,'priorities'|'background'>,work:WorkType):number=>backgroundWorkRefusal(pawn,work)?0:pawn.priorities[work];
/** Some non-work activities still consume a skill; keep its stored record. */
export const effectiveSkillLevel=(pawn:Pick<Pawn,'background'>,skill:BackgroundSkillId,storedLevel:number):number=>backgroundSkillRefusal(pawn,skill)?0:storedLevel;
/** Physical carrying belongs to its provider: builders/growers/cooks can carry
 * their own materials without being admitted to general hauling. */
export const haulingWork=(destination:HaulDestination):WorkType=>destination.type==='stockpile'&&destination.forHunting?'hunt':destination.type==='job'&&destination.forConstruction||destination.type==='aside'&&destination.forConstruction?'build':destination.type==='aside'?destination.constructionId===undefined?'grow':'haul':destination.type==='fuel'&&destination.forCooking?'cook':'haul';
