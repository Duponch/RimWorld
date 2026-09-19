import { isColonist } from '../sim/affiliation';
import { FOOD_ITEMS, type FoodPolicyCommand, type FoodItemId } from '../sim/food-policy';
import { ITEM_DEFINITIONS } from '../sim/items';
import { queryPawnStatus } from '../sim/diagnostics';
import type { World,Command } from '../sim/types';

export function foodPolicyLayout(): string {
  return `<section id="assign-panel" class="management-panel assign-panel panel" aria-label="Affectations" hidden>
    <div class="panel-heading"><h2>Affectations</h2><button data-close-panel aria-label="Fermer Affectations">×</button></div>
    <p>Choisissez les aliments autorisés pour chaque colon. Les régimes sont partagés : modifier un régime affecte toutes les personnes qui l’utilisent.</p>
    <div class="work-table-wrap"><table><thead><tr><th>Colon</th><th>Régime alimentaire</th><th>Réaction hostile</th><th>État</th></tr></thead><tbody id="food-policy-rows"></tbody></table></div>
    <button id="manage-food-policies">Gérer les régimes alimentaires</button><p id="assign-feedback" role="status"></p>
    <p class="muted">Un régime ne change pas le transport ni les ingrédients de cuisine. Un repas déjà engagé peut se terminer. Vêtements, drogues, et réaction Attaquer restent à développer. Fuir est le défaut ; les ordres directs gardent la priorité. Les soins se règlent dans Santé.</p>
  </section>
  <dialog id="food-policy-dialog" class="food-policy-dialog">
    <div class="panel-heading"><h2>Régimes alimentaires</h2><button id="close-food-policies" aria-label="Fermer les régimes alimentaires">×</button></div>
    <label>Régime à modifier <select id="food-policy-choice"></select></label>
    <div class="policy-actions"><button id="new-food-policy">Nouveau régime</button><button id="copy-food-policy">Dupliquer</button><button id="delete-food-policy">Supprimer</button></div>
    <form id="food-policy-form"><label>Nom <input id="food-policy-name" maxlength="60" required></label>
      <fieldset><legend>Aliments autorisés</legend>${FOOD_ITEMS.map(id=>`<label><input type="checkbox" data-allowed-food="${id}"> ${ITEM_DEFINITIONS[id].label}</label>`).join('')}</fieldset>
      <div class="policy-actions"><button type="button" id="allow-all-food">Tout autoriser</button><button type="button" id="deny-all-food">Tout interdire</button><button id="apply-food-policy" type="submit">Appliquer le régime</button></div>
    </form>
    <p id="food-policy-users" class="muted"></p><p id="food-policy-feedback" role="status"></p>
    <p>Un colon respecte ce régime même s’il a faim. Interdire tous les aliments disponibles peut l’empêcher de manger.</p>
    <p class="muted">Filtres limités aux aliments présents dans cette version. Aucun inventaire personnel ni filtre sur la provenance des ingrédients n’est encore simulé.</p>
  </dialog>`;
}

export function createFoodPolicyControls(root: HTMLElement, send: (command: FoodPolicyCommand|Extract<Command,{type:'hostility-response'}>) => Promise<string | null>) {
  root.addEventListener('keydown', event => { if (event.key === 'Tab' || event.key === ' ') event.stopPropagation(); });
  const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
  const dialog=el<HTMLDialogElement>('food-policy-dialog'),choice=el<HTMLSelectElement>('food-policy-choice'),name=el<HTMLInputElement>('food-policy-name');
  const checks=[...dialog.querySelectorAll<HTMLInputElement>('[data-allowed-food]')];
  let world:World|undefined,identity='',policiesSignature='',formSignature='',selectedId=1,pending=false;
  const rows=new Map<number,{select:HTMLSelectElement;response:HTMLSelectElement;status:HTMLElement}>();
  function options(select:HTMLSelectElement) {
    select.replaceChildren(...world!.foodPolicies.map(p=>{const option=document.createElement('option');option.value=String(p.id);option.textContent=p.name;return option;}));
  }
  function renderForm() {
    if(!world)return;
    let p=world.foodPolicies.find(p=>p.id===selectedId);if(!p){p=world.foodPolicies[0]!;selectedId=p.id;}
    choice.value=String(selectedId);
    const signature=JSON.stringify(p);
    if(signature!==formSignature) {
      formSignature=signature;name.value=p.name;
      for(const check of checks)check.checked=p.allowed.includes(check.dataset.allowedFood as FoodItemId);
    }
    const users=world.pawns.filter(p=>isColonist(p)&&p.foodPolicyId===selectedId).map(p=>p.name);
    el('food-policy-users').textContent=users.length?`Utilisé par : ${users.join(', ')}`:'Aucun colon affecté à ce régime.';
  }
  async function commit(command:FoodPolicyCommand|Extract<Command,{type:'hostility-response'}>,selectCreated=false) {
    if(pending)return;pending=true;
    root.setAttribute('aria-busy','true');dialog.setAttribute('aria-busy','true');
    const newId=world?.nextFoodPolicyId;
    try {
      const error=await send(command);
      el('assign-feedback').textContent=error??'';el('food-policy-feedback').textContent=error??'Régime appliqué.';
      if(!error&&selectCreated&&newId)selectedId=newId;
      if(!error){formSignature='';if(world)update(world);renderForm();}
    } finally {pending=false;root.removeAttribute('aria-busy');dialog.removeAttribute('aria-busy');}
  }
  el('manage-food-policies').onclick=()=>{if(world){options(choice);renderForm();el('food-policy-feedback').textContent='';dialog.showModal();}};
  el('close-food-policies').onclick=()=>dialog.close();
  choice.onchange=()=>{selectedId=Number(choice.value);renderForm();el('food-policy-feedback').textContent='';};
  el('food-policy-form').onsubmit=event=>{event.preventDefault();void commit({type:'food-policy-update',policyId:selectedId,name:name.value,allowed:checks.filter(c=>c.checked).map(c=>c.dataset.allowedFood as FoodItemId)});};
  el('new-food-policy').onclick=()=>{if(world)void commit({type:'food-policy-create',name:`Régime ${world.nextFoodPolicyId}`},true);};
  el('copy-food-policy').onclick=()=>{const p=world?.foodPolicies.find(p=>p.id===selectedId);if(p)void commit({type:'food-policy-create',copyFromId:p.id,name:`${p.name.slice(0,50)} (copie)`},true);};
  el('delete-food-policy').onclick=()=>{void commit({type:'food-policy-delete',policyId:selectedId});};
  el('allow-all-food').onclick=()=>checks.forEach(c=>c.checked=true);
  el('deny-all-food').onclick=()=>checks.forEach(c=>c.checked=false);
  function update(next:World) {
    world=next;if(root.hidden&&!dialog.open)return;
    const nextIdentity=JSON.stringify(next.pawns.filter(isColonist).map(p=>[p.id,p.name]));
    if(identity!==nextIdentity) {
      identity=nextIdentity;rows.clear();policiesSignature='';
      el('food-policy-rows').replaceChildren(...next.pawns.filter(isColonist).map(p=>{
        const row=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=p.name;row.append(th);
        const td=document.createElement('td'),select=document.createElement('select');select.dataset.foodPolicyPawn=String(p.id);select.setAttribute('aria-label',`Régime alimentaire de ${p.name}`);
        select.onchange=()=>{void commit({type:'food-policy-assign',pawnId:p.id,policyId:Number(select.value)});};td.append(select);row.append(td);
        const reactionCell=document.createElement('td'),response=document.createElement('select');response.setAttribute('aria-label',`Réaction hostile de ${p.name}`);response.innerHTML='<option value="flee">Fuir</option><option value="attack">Attaquer</option><option value="ignore">Ignorer</option>';response.onchange=()=>void commit({type:'hostility-response',pawnId:p.id,response:response.value as 'flee'|'ignore'|'attack'});reactionCell.append(response);row.append(reactionCell);
        const status=document.createElement('td');status.className='policy-status';row.append(status);rows.set(p.id,{select,response,status});return row;
      }));
    }
    const signature=JSON.stringify(next.foodPolicies.map(p=>[p.id,p.name]));
    if(signature!==policiesSignature){policiesSignature=signature;options(choice);for(const row of rows.values())options(row.select);}
    for(const p of next.pawns.filter(isColonist)){const row=rows.get(p.id)!;row.response.value=p.hostilityResponse??'flee';row.select.value=String(p.foodPolicyId);row.status.textContent=queryPawnStatus(next,p).reason;}
    if(dialog.open)renderForm();
  }
  return {update};
}
