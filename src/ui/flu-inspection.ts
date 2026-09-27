import { FLU_UNIT,fluStage } from '../sim/flu-rules';
import { fluNextTendCore,fluTendable } from '../sim/flu-state';
import type { MedicalRecord } from '../sim/injury-types';

const stageLabels={minor:'légère',major:'majeure',extreme:'extrême'} as const;
const hours=(core:number):string=>core<250?'< 0,1 h':`${(core/2500).toFixed(1)} h`;
/** A value just below complete immunity must never display as 100.0 %. */
const percent=(value:number):string=>`${(value>=FLU_UNIT?100:Math.min(99.9,value*100/FLU_UNIT)).toFixed(1)} %`;

/** Pure, selected-pawn presentation; no forecast from rounded bars. */
export function fluInspection(record:MedicalRecord|undefined):{stage:string;summary:string;care:string;guidance:string}|null {
  const flu=record?.flu;
  if(!flu)return null;
  const stage=fluStage(flu.severity);
  if(stage==='none')return {
    stage,
    summary:`Grippe résolue · immunité résiduelle ${percent(flu.immunity)}.`,
    care:'',
    guidance:'La protection résiduelle diminue avec le temps.',
  };
  const remaining=Math.max(0,(flu.tend?.expiresAtCore??0)-record!.tick*10);
  const care=remaining>0
    ?`Soin actif · qualité ${((flu.tend?.quality??0)/10).toFixed(1)} % · effet restant ${hours(remaining)}.`
    :'Aucun soin actif.';
  const guidance=record!.death?'Dossier arrêté au décès.'
    :flu.immunity>=FLU_UNIT?'Immunité acquise · convalescence en cours.'
    :fluTendable(record!)?'Nouveau soin possible maintenant.'
    :`Renouvellement dans ${hours(Math.max(1,fluNextTendCore(flu)-record!.tick*10))}.`;
  return {
    stage,
    summary:`Grippe ${stageLabels[stage]} · gravité ${percent(flu.severity)} · immunité ${percent(flu.immunity)}.`,
    care,
    guidance,
  };
}

export function createFluInspection(parent:HTMLElement):void {
  const section=document.createElement('div');section.dataset.health='flu';section.hidden=true;
  for(const field of ['summary','care','guidance'] as const){const p=document.createElement('p');p.dataset.flu=field;section.append(p);}
  parent.append(section);
}

export function updateFluInspection(parent:Element,record:MedicalRecord|undefined):void {
  const section=parent.querySelector<HTMLElement>('[data-health="flu"]');if(!section)return;
  const view=fluInspection(record);section.hidden=!view;
  if(!view)return;
  section.dataset.stage=view.stage;
  for(const field of ['summary','care','guidance'] as const)section.querySelector<HTMLElement>(`[data-flu="${field}"]`)!.textContent=view[field];
}
