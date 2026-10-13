import { isColonist } from '../sim/affiliation';
import { breakThresholds } from '../sim/traits';
import type { Pawn,World } from '../sim/types';
import { actorNotificationTarget,type NotificationTarget } from './notification-focus';
import type { TooltipContent } from './tooltip';

export interface MoodRiskAlert {
  key:'mood-risk-minor'|'mood-risk-high';
  text:string;
  targets:NotificationTarget[];
  tab:'needs';
  tooltip:TooltipContent;
}

const count=(n:number)=>`${n} colon${n>1?'s':''}`;

/** A threshold warning, not a forecast of the random crisis decision. Only
 * actual local free colonists participate; sleeping and recovery keep warnings.
 * Reading never creates mental state, expires memories or draws randomness. */
export function readMoodRiskAlerts(world:World):MoodRiskAlert[] {
  const minor:Pawn[]=[],major:Pawn[]=[],extreme:Pawn[]=[];
  for(const pawn of world.pawns){
    if(!isColonist(pawn)||pawn.prisoner||pawn.visitor||pawn.state==='dead'||pawn.health?.death||pawn.state==='downed'||pawn.mental?.crisis)continue;
    const [minorThreshold,majorThreshold,extremeThreshold]=breakThresholds(pawn);
    if(pawn.mood<extremeThreshold)extreme.push(pawn);
    else if(pawn.mood<majorThreshold)major.push(pawn);
    else if(pawn.mood<minorThreshold)minor.push(pawn);
  }
  if(!minor.length&&!major.length&&!extreme.length)return [];
  for(const group of [minor,major,extreme])group.sort((a,b)=>a.id-b.id);
  const high=!!(extreme.length||major.length),severity=extreme.length?'extrême':major.length?'majeure':'mineure';
  const maximum=extreme.length?extreme:major.length?major:minor;
  const text=`Risque de crise ${severity} · ${count(maximum.length)}`;
  return [{key:high?'mood-risk-high':'mood-risk-minor',text,
    targets:(high?[...extreme,...major]:minor).map(p=>actorNotificationTarget(p.id)),tab:'needs',
    tooltip:{title:text,
      body:'Humeur sous le seuil personnel. Une crise reste aléatoire et certaines situations empêchent son entrée immédiate. Consulter Besoins pour examiner les causes.',
      rows:[{label:`Extrême · ${count(extreme.length)}`,value:extreme.map(p=>p.name).join(', ')||'Aucun'},
        {label:`Majeure · ${count(major.length)}`,value:major.map(p=>p.name).join(', ')||'Aucun'},
        {label:`Mineure · ${count(minor.length)}`,value:minor.map(p=>p.name).join(', ')||'Aucun'}]}}];
}
