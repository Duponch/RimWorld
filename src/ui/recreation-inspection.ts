import { RECREATION_KINDS, recreationMood } from '../sim/recreation-rules';
import { colonyExpectation } from '../sim/colony-economy';
import type { Pawn,World } from '../sim/types';
import { setTooltip } from './tooltip';

const recreationLabels = {solitary:'Détente solitaire',dexterity:'Dextérité',cerebral:'Jeux cérébraux',social:'Loisirs sociaux'};

export const recreationInspection = (): string => `<div class="needs"><div class="pawn-need" data-need="recreation" tabindex="0"><label for="recreation-meter">Plaisir <span id="selected-recreation"></span></label><meter id="recreation-meter" min="0" max="100" low="30" optimum="100"></meter></div></div><p id="recreation-tolerance" class="muted" hidden></p>`;
export function updateRecreationInspection(root: HTMLElement, pawn: Pawn, world:World): void {
  const joy=pawn.recreation, mood=recreationMood(joy.level);
  root.querySelector('#selected-recreation')!.textContent=pawn.state==='dead'?'—':`${Math.round(joy.level)} %`;
  root.querySelector<HTMLMeterElement>('#recreation-meter')!.value=joy.level;
  const text=RECREATION_KINDS.map(k=>`${recreationLabels[k]} : ${joy.tolerance[k].toFixed(0)} %${joy.bored[k]?' (lassé)':''}`).join(' · ');
  root.querySelector('#recreation-tolerance')!.textContent=`Lassitude — ${text}`;
  const row=root.querySelector<HTMLElement>('[data-need="recreation"]')!;
  setTooltip(row,{title:`Plaisir : ${Math.round(joy.level)} %`,body:`Varier les activités évite la lassitude. Une famille lassante redevient intéressante sous 30 %. La lassitude diminue de ${Math.round((colonyExpectation(world,pawn)?.joyToleranceDropPerDay??.18)*100)} points par jour éveillé.`,rows:[{label:'Effet sur l’humeur',value:`${mood>=0?'+':''}${mood}`},...RECREATION_KINDS.map(k=>({label:recreationLabels[k],value:`${joy.tolerance[k].toFixed(0)} %${joy.bored[k]?' · lassé':''}`}))]});
}
