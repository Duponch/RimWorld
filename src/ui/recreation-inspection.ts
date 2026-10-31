import {isCorePhysicalSchema297} from '../sim/physical-schema-297.ts';
import { RECREATION_KINDS, recreationMood } from '../sim/recreation-rules';
import { colonyExpectation } from '../sim/colony-economy';
import type { Pawn,World } from '../sim/types';
import { setTooltip } from './tooltip';
import { needGaugeMarkup, needThresholdRow, updateNeedGauge } from './need-gauge';
import {partyParticipation292} from './party-inspection-292';

const recreationLabels:Record<string,string> = {reading:'Lecture',chemical:'Consommation de boissons',solitary:'Détente solitaire',dexterity:'Dextérité',cerebral:'Jeux cérébraux',social:'Loisirs sociaux',television:'Télévision'};

export const recreationInspection = (): string => `<div class="needs"><div class="pawn-need" data-need="recreation" tabindex="0"><label for="recreation-meter">Plaisir <span id="selected-recreation"></span></label>${needGaugeMarkup('recreation')}</div></div><p id="party-participation" hidden></p><p id="recreation-tolerance" class="muted" hidden></p>`;
export function updateRecreationInspection(root: HTMLElement, pawn: Pawn, world:World): void {
  const joy=pawn.recreation, mood=recreationMood(joy.level), kinds=[...RECREATION_KINDS,...(Number(world.schemaVersion)===295||(Number(world.schemaVersion)===296||isCorePhysicalSchema297(Number(world.schemaVersion))))?['reading' as const]:[]];
  root.querySelector('#selected-recreation')!.textContent=pawn.state==='dead'?'—':`${Math.round(joy.level)} %`;
  const text=kinds.map(k=>`${recreationLabels[k]} : ${(joy.tolerance[k]??0).toFixed(0)} %${joy.bored[k]?' (lassé)':''}`).join(' · ');
  root.querySelector('#recreation-tolerance')!.textContent=`Lassitude — ${text}`;
  const participation=root.querySelector<HTMLElement>('#party-participation'),party=partyParticipation292(world,pawn);
  if(participation){participation.hidden=!party;participation.textContent=party??'';}
  const row=root.querySelector<HTMLElement>('[data-need="recreation"]')!;
  updateNeedGauge(row,joy.level,pawn.state==='dead');
  setTooltip(row,{title:`Plaisir : ${pawn.state==='dead'?'—':`${Math.round(joy.level)} %`}`,body:`Sous 30 % : manque de loisirs ; sous 15 % : manque important ; sous 1 % : privation. À partir de 70 et 85 % : loisirs satisfaisants. Varier les activités évite la lassitude. Une famille lassante redevient intéressante sous 30 %. La lassitude diminue de ${Math.round((colonyExpectation(world,pawn)?.joyToleranceDropPerDay??.18)*100)} points par jour éveillé.`,rows:[needThresholdRow('recreation'),{label:'Effet sur l’humeur',value:pawn.state==='dead'?'—':`${mood>=0?'+':''}${mood}`},...kinds.map(k=>({label:recreationLabels[k],value:`${(joy.tolerance[k]??0).toFixed(0)} %${joy.bored[k]?' · lassé':''}`}))]});
}
