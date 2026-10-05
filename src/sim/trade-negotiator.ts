import { isColonist } from './affiliation.ts';
import { backgroundSkillRefusal } from './colonist-backgrounds.ts';
import { medicalWorkRefusal,pawnBody } from './health-rules.ts';
import { biologicalYears } from './human-age.ts';
import { effectiveSkillLevel } from './work-types.ts';
import type { Pawn } from './types.ts';
export function negotiatorRefusal(p:Pawn):string|undefined {
  if(!isColonist(p)||p.prisoner)return 'Choisissez un colon libre.';
  const background=backgroundSkillRefusal(p,'social');if(background)return background;
  const medical=medicalWorkRefusal(p);if(medical)return medical;
  if(p.draft||p.melee?.strike||p.shooting?.stance||p.mental?.crisis||p.collapsePending||p.interruptedCargo||p.burning)return 'Le négociateur doit être disponible et démobilisé.';
  const c=pawnBody(p).capacities;
  if(c.talking<=0||c.hearing<=0)return 'Le négociateur doit pouvoir parler et entendre.';
}
export function tradeImprovement(p:Pawn):number {
  const c=pawnBody(p).capacities;
  return Math.min(.395,Math.max(0,.015*effectiveSkillLevel(p,'social',p.skills.social?.level??0)*(.1+.9*Math.min(1,c.talking/.95))*(.1+.9*Math.min(1,c.hearing/.8))));
}

/** V193 corpus: active adult owner, conscious, non-down/non-crisis, Social capable,
 * best TradePriceImprovement. Equal stats retain the local persisted owner order.
 * Civilian site permission is a separate real channel admission, not a fake Pawn. */
export function bestGroupNegotiator(members:readonly Pawn[]):Pawn|undefined {
  let best:Pawn|undefined,score=-1;
  for(const person of members){
    if(!isColonist(person)||person.prisoner||person.visitor||person.raid||person.podRescue||person.state==='dead'||person.state==='downed'||person.state==='sleeping'||person.health?.death||person.age&&biologicalYears(person.age)<18||!pawnBody(person).canBeAwake||negotiatorRefusal(person))continue;
    const value=tradeImprovement(person);
    if(value>score){best=person;score=value;}
  }
  return best;
}
