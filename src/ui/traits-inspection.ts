import { TRAITS,breakThresholds,globalLearningFactor,type TraitBearer } from '../sim/traits';

export function traitSummary(pawn:TraitBearer):string {
  return pawn.traits?.map(id=>TRAITS[id].label).join(' · ')??'Aucun trait attribué';
}
export function createTraitsInspection(parent:HTMLElement):void {
  const heading=document.createElement('h3');heading.textContent='Traits';
  const list=document.createElement('ul');list.dataset.traits='';
  const stats=document.createElement('details');stats.className='trait-stat-entry';
  const statsSummary=document.createElement('summary');statsSummary.textContent='Effets du profil';
  const statsText=document.createElement('p');statsText.dataset.traitStats='';statsText.className='muted';stats.append(statsSummary,statsText);
  parent.append(heading,list,stats);
}
export function updateTraitsInspection(panel:HTMLElement,pawn:TraitBearer):void {
  const list=panel.querySelector<HTMLElement>('[data-traits]');if(!list)return;
  const signature=JSON.stringify(pawn.traits??[]);
  if(list.dataset.signature!==signature){
    list.dataset.signature=signature;
    list.replaceChildren(...(pawn.traits?.map(id=>{const li=document.createElement('li');li.dataset.trait=id;const details=document.createElement('details');details.className='trait-entry';const summary=document.createElement('summary');summary.textContent=TRAITS[id].label;const description=document.createElement('p');description.textContent=TRAITS[id].description;details.append(summary,description);li.append(details);return li;})??[Object.assign(document.createElement('li'),{textContent:'Aucun trait attribué. Les personnes des anciennes sauvegardes conservent leur profil neutre.'})]));
  }
  panel.querySelector('[data-trait-stats]')!.textContent=`Apprentissage général ${Math.round(globalLearningFactor(pawn)*100)} %. Risque de crise sous ${breakThresholds(pawn).map(n=>Number(n.toFixed(2))).join(' / ')} % d’humeur (mineur / majeur / extrême). Le risque ne déclenche pas une crise immédiatement ; seule l’errance triste est disponible.`;
}
