import { BODY_PARTS } from '../sim/body-definition';
import { BLOOD_UNIT,HP_UNIT,INJURY_RULES } from '../sim/injury-rules';
import { medicalBleed,medicalPain } from '../sim/injury-state';
import { pawnBody } from '../sim/health-rules';
import type { Pawn } from '../sim/types';

export function createHealthInspection(panel:HTMLElement):void {
  const details=document.createElement('details');details.id='health-inspection';details.open=true;
  const summary=document.createElement('summary');summary.textContent='Santé';details.append(summary);
  for(const name of ['status','capacities','injuries']) {const p=document.createElement('p');p.dataset.health=name;details.append(p);}
  panel.append(details);
}
/** Selected pawn only, at HUD cadence. Save strings never enter innerHTML. */
export function updateHealthInspection(panel:HTMLElement,pawn:Pawn):void {
  const details=panel.querySelector('#health-inspection');if(!details)return;
  const health=pawn.health,c=pawnBody(pawn).capacities;
  details.querySelector('[data-health="status"]')!.textContent=pawn.state==='dead'?'Décédé · dépouille sur place':!health?'Aucune lésion':`${pawn.state==='downed'?'À terre · ':''}Douleur ${Math.round(medicalPain(health)*100)} % · Sang perdu ${(health.bloodLoss/BLOOD_UNIT*100).toFixed(1)} % · Saignement ${(medicalBleed(health)*100).toFixed(0)} %/jour`;
  details.querySelector('[data-health="capacities"]')!.textContent=pawn.state==='dead'?'':`Conscience ${Math.round(c.consciousness*100)} % · Mobilité ${Math.round(c.moving*100)} % · Manipulation ${Math.round(c.manipulation*100)} % · Vue ${Math.round(c.sight*100)} %`;
  details.querySelector('[data-health="injuries"]')!.textContent=health?[...health.injuries.map(i=>`${BODY_PARTS[i.part].label} : ${i.scar?.pain!==undefined?'Cicatrice':INJURY_RULES[i.kind].label}, −${(i.severity/HP_UNIT).toFixed(2)} PV${i.tended!==undefined?' (soignée)':''}`),...health.missing.map(m=>`${BODY_PARTS[m.part].label} : partie perdue`)].join(' ; '):'';
}
