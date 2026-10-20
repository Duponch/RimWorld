import {isColonist} from '../sim/affiliation';
import {effectiveDrugPolicies265,drugPolicyFor265,type DrugPolicy265,type DrugPolicyCommand265} from '../sim/alcohol-policy-265';
import type {World} from '../sim/types';

export const drugPolicyLayout265=():string=>`<section id="drug-policy-section" hidden aria-label="Politiques de drogues">
 <h3>Drogues · bière</h3><p>Les politiques sont partagées. Leurs modifications concernent toutes les personnes affectées. Seule la bière est disponible dans ce catalogue.</p>
 <div class="work-table-wrap assignment-table-wrap"><table class="assignment-table"><thead><tr><th>Colon</th><th>Politique de drogues</th></tr></thead><tbody id="drug-policy-rows"></tbody></table></div>
 <div class="assignment-actions"><button id="manage-drug-policies">Gérer les politiques de drogues</button><p id="drug-assign-feedback" role="status"></p></div>
 <dialog id="drug-policy-dialog" class="food-policy-dialog"><div class="panel-heading"><h2>Politiques de drogues</h2><button id="close-drug-policies" aria-label="Fermer les politiques de drogues">×</button></div>
 <label>Politique à modifier <select id="drug-policy-choice"></select></label>
 <div class="policy-actions"><button id="new-drug-policy">Nouvelle politique</button><button id="copy-drug-policy">Dupliquer</button><button id="delete-drug-policy">Supprimer</button><button id="default-drug-policy">Politique par défaut</button></div>
 <form id="drug-policy-form"><label>Nom <input id="drug-policy-name" maxlength="60" required></label><fieldset><legend>Bière</legend>
 <label><input type="checkbox" id="drug-addiction"> Autorisée pour satisfaire une dépendance</label>
 <label><input type="checkbox" id="drug-joy"> Autorisée pour les loisirs</label>
 <label><input type="checkbox" id="drug-scheduled"> Prise programmée</label>
 <label>Intervalle de prise (jours) <input type="number" id="drug-frequency" min="0.1" max="25" step="0.1" required></label>
 <label>Prise programmée si humeur inférieure à (%) <input type="number" id="drug-mood" min="1" max="100" step="1" required></label>
 <label>Prise programmée si plaisir inférieur à (%) <input type="number" id="drug-recreation" min="1" max="100" step="1" required></label>
 <label>À garder dans l’inventaire <input type="number" id="drug-inventory" min="0" max="3" step="1" required></label>
 </fieldset><div class="policy-actions"><button id="apply-drug-policy" type="submit">Appliquer la politique</button></div></form>
 <p id="drug-policy-users" class="muted"></p><p id="drug-policy-feedback" role="status"></p>
 <p>Chaque prise consomme une bière physique après déplacement et contact. L’alcool entraîne ivresse, tolérance et risque de dépendance. Les prises programmées doivent satisfaire les deux seuils ; désactiver la programmation conserve les autres permissions.</p>
 </dialog></section>`;

/** Edits only publish commands. Saved policy names always enter textContent. */
export function createDrugPolicyControls265(root:HTMLElement,send:(c:DrugPolicyCommand265)=>Promise<string|null>){
 const el=<T extends HTMLElement=HTMLElement>(id:string)=>root.querySelector<T>(`#${id}`)!;
 const section=el('drug-policy-section'),dialog=el<HTMLDialogElement>('drug-policy-dialog'),choice=el<HTMLSelectElement>('drug-policy-choice'),name=el<HTMLInputElement>('drug-policy-name');
 const input=(id:string)=>el<HTMLInputElement>(`drug-${id}`);
 let world:World|undefined,selectedId=1,identity='',policiesSignature='',formSignature='',pending=false;
 const rows=new Map<number,HTMLSelectElement>();
 const policies=():readonly DrugPolicy265[]=>world?effectiveDrugPolicies265(world):[];
 function options(select:HTMLSelectElement){select.replaceChildren(...policies().map((p,index)=>{const option=document.createElement('option');option.value=String(p.id);option.textContent=`${p.name}${index===0?' (par défaut)':''}`;return option;}));}
 function form(){
  if(!world)return;const all=policies(),policy=all.find(p=>p.id===selectedId)??all[0];if(!policy)return;selectedId=policy.id;choice.value=String(selectedId);
  const signature=JSON.stringify(policy);if(signature!==formSignature){formSignature=signature;name.value=policy.name;input('addiction').checked=policy.beer.allowedForAddiction;input('joy').checked=policy.beer.allowedForJoy;input('scheduled').checked=policy.beer.allowScheduled;input('frequency').value=String(policy.beer.daysFrequency);input('mood').value=String(Math.round(policy.beer.onlyIfMoodBelow*100));input('recreation').value=String(Math.round(policy.beer.onlyIfJoyBelow*100));input('inventory').value=String(policy.beer.takeToInventory);}
  const implicit=world.drugPolicies===undefined;
  name.disabled=implicit;for(const field of dialog.querySelectorAll<HTMLInputElement>('fieldset input'))field.disabled=implicit;
  el<HTMLButtonElement>('apply-drug-policy').disabled=implicit;el<HTMLButtonElement>('delete-drug-policy').disabled=implicit||all.length<=1;el<HTMLButtonElement>('default-drug-policy').disabled=implicit||all[0]?.id===selectedId;
  const users=world.pawns.filter(p=>isColonist(p)&&drugPolicyFor265(world!,p).id===selectedId).map(p=>p.name);el('drug-policy-users').textContent=(implicit?'Règle sociale implicite conservée de cette partie. Créez ou dupliquez une politique pour l’éditer. ':'')+(users.length?`Utilisée par : ${users.join(', ')}`:'Aucune personne affectée à cette politique.');
 }
 async function commit(command:DrugPolicyCommand265,created=false){
  if(pending)return;pending=true;section.setAttribute('aria-busy','true');const newId=world?.nextDrugPolicyId??2;
  try{const error=await send(command);el('drug-policy-feedback').textContent=error??'Politique appliquée.';el('drug-assign-feedback').textContent=error??'';if(!error){if(created)selectedId=newId;formSignature='';if(world)update(world);}}finally{pending=false;section.removeAttribute('aria-busy');}
 }
 el('manage-drug-policies').onclick=()=>{if(world){options(choice);form();el('drug-policy-feedback').textContent='';dialog.showModal();}};
 el('close-drug-policies').onclick=()=>dialog.close();choice.onchange=()=>{selectedId=Number(choice.value);form();el('drug-policy-feedback').textContent='';};
 el('drug-policy-form').onsubmit=event=>{event.preventDefault();void commit({type:'drug-policy-update',policyId:selectedId,name:name.value,beer:{allowedForAddiction:input('addiction').checked,allowedForJoy:input('joy').checked,allowScheduled:input('scheduled').checked,daysFrequency:Number(input('frequency').value),onlyIfMoodBelow:Number(input('mood').value)/100,onlyIfJoyBelow:Number(input('recreation').value)/100,takeToInventory:Number(input('inventory').value)}});};
 el('new-drug-policy').onclick=()=>void commit({type:'drug-policy-create',name:`Politique ${world?.nextDrugPolicyId??5}`},true);
 el('copy-drug-policy').onclick=()=>{const p=policies().find(p=>p.id===selectedId);if(p)void commit({type:'drug-policy-create',copyFromId:p.id,name:`${p.name.slice(0,50)} (copie)`},true);};
 el('delete-drug-policy').onclick=()=>void commit({type:'drug-policy-delete',policyId:selectedId});el('default-drug-policy').onclick=()=>void commit({type:'drug-policy-default',policyId:selectedId});
 function update(next:World){
  world=next;section.hidden=next.schemaVersion<265;if(section.hidden||root.hidden&&!dialog.open)return;
  const colonists=next.pawns.filter(isColonist),nextIdentity=JSON.stringify(colonists.map(p=>[p.id,p.name]));
  if(identity!==nextIdentity){identity=nextIdentity;rows.clear();policiesSignature='';el('drug-policy-rows').replaceChildren(...colonists.map(p=>{const row=document.createElement('tr'),label=document.createElement('th'),cell=document.createElement('td'),select=document.createElement('select');label.scope='row';label.textContent=p.name;select.setAttribute('aria-label',`Politique de drogues de ${p.name}`);select.dataset.drugPolicyPawn=String(p.id);select.onchange=()=>void commit({type:'drug-policy-assign',pawnId:p.id,policyId:Number(select.value)});cell.append(select);row.append(label,cell);rows.set(p.id,select);return row;}));}
  const signature=JSON.stringify(policies().map(p=>[p.id,p.name]));if(signature!==policiesSignature){policiesSignature=signature;options(choice);for(const select of rows.values())options(select);}
  for(const pawn of colonists)rows.get(pawn.id)!.value=String(drugPolicyFor265(next,pawn).id);
  if(dialog.open)form();
 }
 return {update};
}
