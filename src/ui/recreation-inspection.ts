import { RECREATION_KINDS, recreationMood } from '../sim/recreation-rules';
import type { Pawn } from '../sim/types';

export const recreationInspection = (): string => `<div class="needs"><label>Loisirs <span id="selected-recreation"></span></label><meter id="recreation-meter" min="0" max="100" low="30" optimum="100"></meter></div><p id="recreation-tolerance" class="muted"></p>`;
export function updateRecreationInspection(root: HTMLElement, pawn: Pawn): void {
  const joy=pawn.recreation, mood=recreationMood(joy.level);
  root.querySelector('#selected-recreation')!.textContent=`${Math.round(joy.level)} % · humeur ${mood>=0?'+':''}${mood}`;
  root.querySelector<HTMLMeterElement>('#recreation-meter')!.value=joy.level;
  const text=RECREATION_KINDS.map(k=>`${k==='solitary'?'Détente solitaire':'Dextérité'} : ${joy.tolerance[k].toFixed(0)} %${joy.bored[k]?' (lassé)':''}`).join(' · ');
  root.querySelector('#recreation-tolerance')!.textContent=`Lassitude — ${text}`;
  root.querySelector('#recreation-meter')!.setAttribute('title',`${text}. Une famille lassante redevient intéressante sous 30 %. Le profil actuel de camp réduit la lassitude de 18 points par jour éveillé ; les attentes liées à la richesse restent à développer.`);
}
