import { comfortableTemperature,HEAT_UNIT,HEAT_LABELS,heatStage } from '../sim/heat-rules';
import { TemperatureView } from '../sim/temperature';
import { BODY_PARTS } from '../sim/body-definition';
import { BLOOD_UNIT,HP_UNIT,INJURY_RULES } from '../sim/injury-rules';
import { medicalBleed,medicalPain } from '../sim/injury-state';
import { pawnBody } from '../sim/health-rules';
import type { Pawn,Command,World } from '../sim/types';
import { MEDICAL_CARE,medicalCare,type MedicalCare } from '../sim/medicine-rules';

export function createHealthInspection(panel:HTMLElement,selected?:()=>Pawn|undefined,send?:(c:Command)=>void):void {
  const details=document.createElement('details');details.id='health-inspection';details.open=true;
  const summary=document.createElement('summary');summary.textContent='Santé';details.append(summary);
  for(const name of ['status','capacities','thermal','stagger','injuries']) {const p=document.createElement('p');p.dataset.health=name;details.append(p);}
  if(selected&&send){
    const label=document.createElement('label'),input=document.createElement('select');input.id='medical-policy';
    for(const [value,name] of Object.entries(MEDICAL_CARE)){const o=document.createElement('option');o.value=value;o.textContent=name;input.append(o);}
    input.onchange=()=>{const p=selected();if(p)send({type:'medical-care',pawnId:p.id,care:input.value as MedicalCare});};
    label.append('Soins autorisés ',input);details.append(label);
    const selfLabel=document.createElement('label'),selfInput=document.createElement('input');selfInput.type='checkbox';selfInput.id='self-tend-policy';
    selfInput.onchange=()=>{const p=selected();if(p)send({type:'self-tend-policy',pawnId:p.id,enabled:selfInput.checked});};
    selfLabel.append(selfInput,' Autoriser les auto-soins');selfLabel.title='Médecin doit être activé. Qualité de base ×70 %, avant variation ; pas de pénalité de vitesse propre aux auto-soins.';details.append(selfLabel);
    const hint=document.createElement('small');hint.dataset.health='self-tend-hint';details.append(hint);
  }
  panel.append(details);
}
/** Selected pawn only, at HUD cadence. Save strings never enter innerHTML. */
export function updateHealthInspection(panel:HTMLElement,pawn:Pawn,world?:World):void {
  const details=panel.querySelector('#health-inspection');if(!details)return;
  const health=pawn.health,c=pawnBody(pawn).capacities;
  const range=world&&comfortableTemperature(world,pawn),stage=heatStage(health?.heatstroke);
  details.querySelector('[data-health="thermal"]')!.textContent=(range?`Air ${new TemperatureView(world!).at(world!,pawn).toFixed(1)} °C · Confort ${range.min.toFixed(1)} à ${range.max.toFixed(1)} °C. `:'')+(stage?`Coup de chaleur ${HEAT_LABELS[stage]} : ${(100*health!.heatstroke!/HEAT_UNIT).toFixed(1)} %. `:'')+(heatStage(health?.hypothermia)?`Hypothermie ${HEAT_LABELS[heatStage(health?.hypothermia)]} : ${(100*health!.hypothermia!/HEAT_UNIT).toFixed(1)} %. `:'')+(pawn.heatRefuge?'Cherche ou attend dans un refuge thermique.':'');
  details.querySelector('[data-health="stagger"]')!.textContent=pawn.stagger?'Ralenti temporairement par un impact de balle.':'';
  const policy=details.querySelector<HTMLSelectElement>('#medical-policy');if(policy){policy.value=medicalCare(pawn);policy.disabled=pawn.state==='dead';}
  const self=details.querySelector<HTMLInputElement>('#self-tend-policy');if(self){self.checked=!!pawn.selfTend;self.disabled=pawn.state==='dead';}
  const hint=details.querySelector('[data-health="self-tend-hint"]');if(hint)hint.textContent=pawn.selfTend&&pawn.priorities.doctor===0?'Auto-soins autorisés, mais Médecin est désactivé dans Travail.':'';
  details.querySelector('[data-health="status"]')!.textContent=pawn.state==='dead'?'Décédé · dépouille sur place':!health?'Aucune lésion':`${pawn.state==='downed'?'À terre · ':''}Douleur ${Math.round(medicalPain(health)*100)} % · Sang perdu ${(health.bloodLoss/BLOOD_UNIT*100).toFixed(1)} % · Saignement ${(medicalBleed(health)*100).toFixed(0)} %/jour`;
  details.querySelector('[data-health="capacities"]')!.textContent=pawn.state==='dead'?'':`Conscience ${Math.round(c.consciousness*100)} % · Mobilité ${Math.round(c.moving*100)} % · Manipulation ${Math.round(c.manipulation*100)} % · Vue ${Math.round(c.sight*100)} %`;
  details.querySelector('[data-health="injuries"]')!.textContent=health?[...health.injuries.map(i=>`${BODY_PARTS[i.part].label} : ${i.scar?.pain!==undefined?'Cicatrice':INJURY_RULES[i.kind].label}, −${(i.severity/HP_UNIT).toFixed(2)} PV${i.tended!==undefined?` (traitée, qualité ${Math.round(i.tended/10)} %)`:''}`),...health.missing.map(m=>`${BODY_PARTS[m.part].label} : partie perdue${m.tended?' (plaie traitée)':''}`)].join(' ; '):'';
}
