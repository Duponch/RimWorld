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
  root.innerHTML='<div class="panel-heading"><h2 data-mech-title></h2><button data-mech-information aria-label="Informations mécaniques">i</button><button id="inspect-close" aria-label="Fermer l’inspection">×</button></div><p data-mech-action></p><div class="mechanoid-facts"><p data-mech-target tabindex="0"></p><p data-mech-group tabindex="0"></p><p data-mech-mass tabindex="0"></p><p data-mech-authority tabindex="0">Machine hostile · aucune commande coloniale</p></div><div data-mech-ranged class="mechanoid-ranged" hidden><p data-mech-cannon tabindex="0"></p><p data-mech-phase tabindex="0"></p><p data-mech-focus tabindex="0"></p></div><div class="mechanoid-capacities"></div><details open class="mechanoid-anatomy"><summary>Dossier mécanique</summary><div class="mechanoid-anatomy-scroll"><table><thead><tr><th scope="col">Partie</th><th scope="col">État réel</th></tr></thead><tbody data-mech-parts></tbody></table></div></details>';
  root.querySelector<HTMLButtonElement>('#inspect-close')!.onclick=onClose;
  const caps=root.querySelector('.mechanoid-capacities')!;
  for(const [id,label] of CAPACITIES){const row=document.createElement('p');row.dataset.mechCapacity=id;row.tabIndex=0;const name=document.createElement('span'),value=document.createElement('strong');name.textContent=label;row.append(name,value);caps.append(row);}
  root.querySelector<HTMLButtonElement>('[data-mech-information]')!.onclick=()=>{
    const state=current();if(!state)return;const view=mechanoidView(state.world,state.actor),rows:ObjectInformationRow[]=[];
    for(const [id,label] of CAPACITIES)rows.push({category:'Capacités',label,value:percent(view.capacities[id]),description:'Capacité actuelle calculée depuis les parties mécaniques réellement présentes et endommagées.'});
    for(const [kind,label] of [['sharp','Tranchant'],['blunt','Contondant'],['heat','Chaleur']] as const)rows.push({category:'Protection',label,value:percent(view.armor[kind]),description:'Armure intrinsèque mécanique, distincte de vêtements et de points de vie globaux.'});
    rows.push({category:'Général',label:'Masse',value:`${view.mass.toFixed(3).replace('.',',')} kg`,description:'Masse naturelle restante : les amputations retirent leur couverture, les blessures seules ne retirent pas de matière.'});
    if(view.ranged)rows.push({category:'Combat',label:'Portée du canon',value:`${view.ranged.range.toFixed(1).replace('.',',')} cases`,description:'Canon intrinsèque, soumis à la ligne de tir, aux capacités réelles et à sa préparation. Aucune arme inventoriable n’est récupérée au décès.'});
    openObjectInformation({title:view.label,description:view.action,rows});
  };
  setTooltip(root.querySelector<HTMLElement>('[data-mech-information]')!,{title:'Informations mécaniques',body:'Afficher les capacités et protections réellement livrées.'});
  setTooltip(root.querySelector<HTMLElement>('[data-mech-authority]')!,{title:'Propriétaire mécanique',body:'Cette machine hostile est inspectable et peut être ciblée par votre défense. Elle ne peut pas être mobilisée, soignée, recrutée, nourrie, chassée ou dressée.'});
  updateMechanoidInspector(root,current());
}
export function updateMechanoidInspector(root:HTMLElement,state:{world:World;actor:Mechanoid}|undefined):void {
  if(!state||!root.querySelector('[data-mech-title]'))return;
  const view=mechanoidView(state.world,state.actor);root.dataset.mechanoidId=String(view.id);
  root.dataset.mechanoidKind=state.actor.mechKind;
  root.querySelector('[data-mech-information]')!.setAttribute('aria-label',`Informations sur ${view.label}`);
  root.querySelector('[data-mech-title]')!.textContent=view.label;root.querySelector('[data-mech-action]')!.textContent=view.action;
  const target=root.querySelector<HTMLElement>('[data-mech-target]')!;
  target.textContent=view.target?`Cible : ${view.target.label}`:'Aucune cible engagée';
  setTooltip(target,{title:'Cible confirmée',body:view.target?`${view.target.label}${view.target.cell?` · case ${view.target.cell.x}, ${view.target.cell.z}`:' · propriétaire désormais absent'}. L’ordre actuel et une récupération peuvent désigner des cibles différentes.`:'Aucun ordre ni récupération ne désigne de cible.'});
  const ranged=root.querySelector<HTMLElement>('[data-mech-ranged]')!;ranged.hidden=!view.ranged;
  if(view.ranged){
    const cannon=root.querySelector<HTMLElement>('[data-mech-cannon]')!,phase=root.querySelector<HTMLElement>('[data-mech-phase]')!,focus=root.querySelector<HTMLElement>('[data-mech-focus]')!;
    cannon.textContent=`Canon intrinsèque · portée ${view.ranged.range.toFixed(1).replace('.',',')} cases`;
    setTooltip(cannon,{title:'Canon mécanique',body:'La portée ne garantit pas une ligne de tir ni une cible admissible. Ce canon n’est pas un objet transportable.'});
    phase.textContent=view.ranged.phase?`${view.ranged.phase==='warmup'?'Préparation du tir':'Récupération du canon'} · ${((view.ranged.remainingCore??0)/60).toFixed(2).replace('.',',')} s restantes${view.ranged.suspended?' · suspendue':''}`:'Canon disponible';
    setTooltip(phase,{title:'Phase confirmée',body:view.ranged.suspended?'L’immobilisation suspend le temps restant. Aucune date de fin future n’est garantie.':'Le temps restant suit la préparation ou la récupération réellement engagée. Une récupération peut suivre un essai sans projectile émis.'});
    focus.hidden=!view.ranged.target;
    focus.textContent=view.ranged.target?`${view.ranged.phase==='cooldown'?'Dernier essai':'Visée'} : ${view.ranged.target.label}`:'';
    setTooltip(focus,{title:view.ranged.phase==='cooldown'?'Cible du dernier essai':'Cible de la visée',body:view.ranged.target?.cell?`Case ${view.ranged.target.cell.x}, ${view.ranged.target.cell.z}.`:'Référence historique : cette cible n’est plus présente.'});
  }
  const group=root.querySelector<HTMLElement>('[data-mech-group]')!;group.textContent=view.group==='staging'?'Regroupement avant assaut':view.group==='assault'?'Assaut engagé':'Aucun groupe actif';
  setTooltip(group,{title:'Mandat réel',body:view.goal?`Objectif physique : case ${view.goal.x}, ${view.goal.z}. Le regroupement n’empêche pas une défense au contact.`:'Aucun objectif de déplacement enregistré.'});
  const mass=root.querySelector<HTMLElement>('[data-mech-mass]')!;mass.textContent=`Masse restante : ${view.mass.toFixed(3).replace('.',',')} kg`;
  setTooltip(mass,{title:'Masse mécanique',body:'Masse calculée depuis la couverture naturelle des parties encore présentes. Le dossier est distinct des PV d’une future carcasse.'});
  let emp=root.querySelector<HTMLElement>('[data-mech-emp]');
  if(!emp){emp=document.createElement('p');emp.dataset.mechEmp='';emp.tabIndex=0;root.querySelector('.mechanoid-facts')!.append(emp);}
  const effect=state.actor.emp,core=state.world.tick*10;emp.hidden=!effect;
  if(effect){const stun=Math.max(0,effect.stunUntilCore-core),adaptation=Math.max(0,effect.adaptedUntilCore-core);
    emp.textContent=`EMP : ${stun?`neutralisé encore ${(stun/60).toFixed(1).replace('.',',')} s`:'mobilité et attaques rétablies'}${adaptation?` · adapté encore ${(adaptation/60).toFixed(1).replace('.',',')} s`:''}`;
    setTooltip(emp,{title:'Neutralisation et adaptation EMP',body:'L’EMP suspend déplacement et attaques sans blesser. Pendant l’adaptation, un nouvel impact ne prolonge ni l’arrêt ni cette protection.'});
  }
  for(const [id,label] of CAPACITIES){const row=root.querySelector<HTMLElement>(`[data-mech-capacity="${id}"]`)!;row.querySelector('strong')!.textContent=percent(view.capacities[id]);setTooltip(row,{title:label,body:'Valeur actuelle du dossier mécanique ; aucune capacité biologique ou compétence humaine n’est inventée.'});}
  const body=root.querySelector('[data-mech-parts]')!;
  const ids=new Set<string>(view.parts.map(p=>p.id));
  for(const row of body.querySelectorAll<HTMLElement>('[data-mech-part]'))if(!ids.has(row.dataset.mechPart!))row.remove();
  for(const part of view.parts){
    let row=body.querySelector<HTMLElement>(`[data-mech-part="${part.id}"]`);
    if(!row){row=document.createElement('tr');row.dataset.mechPart=part.id;row.tabIndex=0;const name=document.createElement('th'),value=document.createElement('td');name.setAttribute('scope','row');name.textContent=part.label;row.append(name,value);body.append(row);}
    row.querySelector('td')!.textContent=part.absent?'Absente':part.injuries.length?part.injuries.map(i=>`${i.label} ${i.severity.toFixed(3).replace('.',',')}`).join(' · '):'Intacte';
    row.classList.toggle('mechanoid-part-absent',part.absent);
    setTooltip(row,{title:part.label,body:part.absent?'Partie absente, avec les descendants de son sous-arbre.':`${part.health} / ${part.maximum} points de vie anatomiques.${part.injuries.length?' Dégâts enregistrés, sans douleur, saignement ni guérison biologique.':' Partie mécanique intacte.'}`});
  }
}
