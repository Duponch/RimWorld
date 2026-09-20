import { BODY_PARTS } from '../sim/body-definition';
import { INFECTION_UNIT, infectionStage } from '../sim/infection-rules';
import { infectionNextTendCore, infectionTendable } from '../sim/infection-state';
import type { MedicalRecord } from '../sim/injury-types';

const labels={minor:'Mineure',major:'Majeure',extreme:'Extrême',critical:'Extrême · critique'} as const;
/** Do not turn a rounded percentage into a false claim that immunity is won. */
export function infectionPercent(value:number):string {
  return `${(value>=INFECTION_UNIT?100:Math.min(99.9,value*100/INFECTION_UNIT)).toFixed(1)} %`;
}
const hours=(core:number):string=>core<250?'< 0,1 h':`${(core/2500).toFixed(1)} h`;

export function createInfectionInspection(parent:HTMLElement):void {
  const section=document.createElement('div');section.dataset.health='infections';section.hidden=true;
  const immunity=document.createElement('p');immunity.dataset.health='immunity';section.append(immunity);
  const rows=document.createElement('div');rows.dataset.health='infection-cases';section.append(rows);
  const hint=document.createElement('small');hint.dataset.health='infection-hint';section.append(hint);
  parent.append(section);
}

/** Selected person only, using authoritative medical time. No prognosis is
 * inferred by comparing rounded bars, and old infections are not recreated. */
export function updateInfectionInspection(parent:Element,record:MedicalRecord|undefined):void {
  const section=parent.querySelector<HTMLElement>('[data-health="infections"]');if(!section)return;
  const state=record?.infections;section.hidden=!state||(state.cases.length===0&&state.immunity===0);
  const rows=section.querySelector<HTMLElement>('[data-health="infection-cases"]')!;
  if(section.hidden){rows.replaceChildren();return;}
  const immune=state!.immunity>=INFECTION_UNIT;
  section.querySelector('[data-health="immunity"]')!.textContent=state!.cases.length
    ?`Immunité commune : ${infectionPercent(state!.immunity)}${immune&&!record!.death?' · acquise, convalescence en cours':''}.`
    :`Infection résolue · immunité résiduelle ${infectionPercent(state!.immunity)}.`;
  const active=new Set(state!.cases.map(c=>String(c.id)));
  for(const row of rows.querySelectorAll<HTMLElement>('[data-infection]'))if(!active.has(row.dataset.infection!))row.remove();
  for(const infection of state!.cases) {
    let row=rows.querySelector<HTMLElement>(`[data-infection="${infection.id}"]`);
    if(!row){row=document.createElement('p');row.dataset.infection=String(infection.id);rows.append(row);}
    const remaining=Math.max(0,(infection.tend?.expiresAtCore??0)-record!.tick*10),stage=infectionStage(infection.severity);
    const treatment=remaining>0?`Soin actif ${((infection.tend?.quality??0)/10).toFixed(1)} %, effet restant ${hours(remaining)}.`:'Aucun soin actif.';
    const next=record!.death?'Dossier arrêté au décès.':immune?'Aucun nouveau soin nécessaire après immunité.':infectionTendable(record!,infection)?'Nouveau soin possible maintenant.':`Renouvellement dans ${hours(Math.max(1,infectionNextTendCore(infection)-record!.tick*10))}.`;
    row.textContent=`${BODY_PARTS[infection.part].label} : infection ${labels[stage].toLocaleLowerCase('fr-FR')} · gravité ${infectionPercent(infection.severity)}. ${treatment} ${next}`;
    row.dataset.severity=String(infection.severity);row.dataset.stage=stage;
  }
  section.querySelector('[data-health="infection-hint"]')!.textContent=record!.death?'':state!.cases.length
    ?'Les soins ralentissent l’infection ; repos, alimentation et état du corps influencent l’immunité. Immunisé ne veut pas dire déjà rétabli.'
    :'L’immunité restante diminue après la disparition de la maladie.';
}
