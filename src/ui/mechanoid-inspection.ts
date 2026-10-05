import { mechanoidView } from '../sim/mechanoid-presentation';
import type { Mechanoid } from '../sim/mechanoid-state';
import type { World } from '../sim/types';
import { openObjectInformation,type ObjectInformationRow } from './object-information';
import { setTooltip } from './tooltip';
import './mechanoid-inspection.css';

const CAPACITIES=[['consciousness','Traitement des données'],['moving','Mobilité'],['manipulation','Manipulation'],['sight','Capteurs visuels'],['hearing','Capteurs auditifs'],['bloodPumping','Production d’énergie'],['bloodFiltration','Filtration des fluides']] as const;
const percent=(v:number)=>`${Math.round(v*100)} %`;
export function createMechanoidInspector(root:HTMLElement,current:()=>{world:World;actor:Mechanoid}|undefined,onClose:()=>void):void {
  root.classList.add('mechanoid-inspector-host');
  root.innerHTML='<div class="panel-heading"><h2 data-mech-title></h2><button data-mech-information aria-label="Informations sur le Scyther">i</button><button id="inspect-close" aria-label="Fermer l’inspection">×</button></div><p data-mech-action></p><div class="mechanoid-facts"><p data-mech-target tabindex="0"></p><p data-mech-group tabindex="0"></p><p data-mech-mass tabindex="0"></p><p data-mech-authority tabindex="0">Machine hostile · aucune commande coloniale</p></div><div class="mechanoid-capacities"></div><details open class="mechanoid-anatomy"><summary>Dossier mécanique</summary><div class="mechanoid-anatomy-scroll"><table><thead><tr><th scope="col">Partie</th><th scope="col">État réel</th></tr></thead><tbody data-mech-parts></tbody></table></div></details>';
  root.querySelector<HTMLButtonElement>('#inspect-close')!.onclick=onClose;
  const caps=root.querySelector('.mechanoid-capacities')!;
  for(const [id,label] of CAPACITIES){const row=document.createElement('p');row.dataset.mechCapacity=id;row.tabIndex=0;const name=document.createElement('span'),value=document.createElement('strong');name.textContent=label;row.append(name,value);caps.append(row);}
  root.querySelector<HTMLButtonElement>('[data-mech-information]')!.onclick=()=>{
    const state=current();if(!state)return;const view=mechanoidView(state.world,state.actor),rows:ObjectInformationRow[]=[];
    for(const [id,label] of CAPACITIES)rows.push({category:'Capacités',label,value:percent(view.capacities[id]),description:'Capacité actuelle calculée depuis les parties mécaniques réellement présentes et endommagées.'});
    for(const [kind,label] of [['sharp','Tranchant'],['blunt','Contondant'],['heat','Chaleur']] as const)rows.push({category:'Protection',label,value:percent(view.armor[kind]),description:'Armure intrinsèque mécanique, distincte de vêtements et de points de vie globaux.'});
    rows.push({category:'Général',label:'Masse',value:`${view.mass.toFixed(3).replace('.',',')} kg`,description:'Masse naturelle restante : les amputations retirent leur couverture, les blessures seules ne retirent pas de matière.'});
    openObjectInformation({title:view.label,description:view.action,rows});
  };
  setTooltip(root.querySelector<HTMLElement>('[data-mech-information]')!,{title:'Informations mécaniques',body:'Afficher les capacités et protections réellement livrées.'});
  setTooltip(root.querySelector<HTMLElement>('[data-mech-authority]')!,{title:'Propriétaire mécanique',body:'Le Scyther hostile est inspectable et peut être ciblé par votre défense. Il ne peut pas être mobilisé, soigné, recruté, nourri, chassé ou dressé.'});
  updateMechanoidInspector(root,current());
}
export function updateMechanoidInspector(root:HTMLElement,state:{world:World;actor:Mechanoid}|undefined):void {
  if(!state||!root.querySelector('[data-mech-title]'))return;
  const view=mechanoidView(state.world,state.actor);root.dataset.mechanoidId=String(view.id);
  root.querySelector('[data-mech-title]')!.textContent=view.label;root.querySelector('[data-mech-action]')!.textContent=view.action;
  const target=root.querySelector<HTMLElement>('[data-mech-target]')!;
  target.textContent=view.target?`Cible : ${view.target.label}`:'Aucune cible engagée';
  setTooltip(target,{title:'Cible confirmée',body:view.target?`${view.target.label}${view.target.cell?` · case ${view.target.cell.x}, ${view.target.cell.z}`:' · propriétaire désormais absent'}. Le dernier coup peut conserver une cible historique pendant sa récupération.`:'Aucun ordre de mêlée ni coup en récupération ne désigne de cible.'});
  const group=root.querySelector<HTMLElement>('[data-mech-group]')!;group.textContent=view.group==='staging'?'Regroupement avant assaut':view.group==='assault'?'Assaut engagé':'Aucun groupe actif';
  setTooltip(group,{title:'Mandat réel',body:view.goal?`Objectif physique : case ${view.goal.x}, ${view.goal.z}. Le regroupement n’empêche pas une défense au contact.`:'Aucun objectif de déplacement enregistré.'});
  const mass=root.querySelector<HTMLElement>('[data-mech-mass]')!;mass.textContent=`Masse restante : ${view.mass.toFixed(3).replace('.',',')} kg`;
  setTooltip(mass,{title:'Masse mécanique',body:'Masse calculée depuis la couverture naturelle des parties encore présentes. Le dossier est distinct des PV d’une future carcasse.'});
  for(const [id,label] of CAPACITIES){const row=root.querySelector<HTMLElement>(`[data-mech-capacity="${id}"]`)!;row.querySelector('strong')!.textContent=percent(view.capacities[id]);setTooltip(row,{title:label,body:'Valeur actuelle du dossier mécanique ; aucune capacité biologique ou compétence humaine n’est inventée.'});}
  const body=root.querySelector('[data-mech-parts]')!;
  for(const part of view.parts){
    let row=body.querySelector<HTMLElement>(`[data-mech-part="${part.id}"]`);
    if(!row){row=document.createElement('tr');row.dataset.mechPart=part.id;row.tabIndex=0;const name=document.createElement('th'),value=document.createElement('td');name.setAttribute('scope','row');name.textContent=part.label;row.append(name,value);body.append(row);}
    row.querySelector('td')!.textContent=part.absent?'Absente':part.injuries.length?part.injuries.map(i=>`${i.label} ${i.severity.toFixed(3).replace('.',',')}`).join(' · '):'Intacte';
    row.classList.toggle('mechanoid-part-absent',part.absent);
    setTooltip(row,{title:part.label,body:part.absent?'Partie absente, avec les descendants de son sous-arbre.':`${part.health} / ${part.maximum} points de vie anatomiques.${part.injuries.length?' Dégâts enregistrés, sans douleur, saignement ni guérison biologique.':' Partie mécanique intacte.'}`});
  }
}
