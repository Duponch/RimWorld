import { violentWorkRefusal } from './colonist-backgrounds.ts';
import { pawnBody } from './health-rules.ts';
import { effectiveSkillLevel } from './work-types.ts';
import type { Pawn } from './types.ts';

/** Core ArrestSuccessChance for the adult, ordinary player PawnKinds delivered
 * here (acceptArrestChanceFactor=1). The DLC child curve is outside this scope. */
export function arrestSuccessChance(actor:Pawn):number {
  const social=effectiveSkillLevel(actor,'social',actor.skills.social?.level??0);
  const manipulation=Math.max(0,Math.min(1,pawnBody(actor).capacities.manipulation/.95));
  return Math.max(.6,Math.min(1,(.6+.075*social)*(.1+.9*manipulation)));
}
export const arrestAcceptChance=(actor:Pawn,patient:Pawn):number=>patient.state==='downed'||violentWorkRefusal(patient)?1:arrestSuccessChance(actor);
export const arrestAcceptedAutomatically=(patient:Pawn):boolean=>patient.state==='downed'||!!violentWorkRefusal(patient);
