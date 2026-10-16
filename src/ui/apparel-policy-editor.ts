import {APPAREL,APPAREL_MATERIALS,APPAREL_MATERIAL_DEFINITIONS,type ApparelItem,type ApparelMaterial} from '../sim/apparel-rules';
import {QUALITY_LABELS,WEAPON_QUALITIES,type WeaponQuality} from '../sim/equipment-rules';
import {validApparelPolicy,type ApparelPolicy} from '../sim/apparel-policy';
import {SCHEMA_VERSION,type Pawn,type World} from '../sim/types';
import {normalizeApparelPolicyName,type ApparelPolicyNameCommand} from '../sim/apparel-policy-edit';
import './apparel-policy-editor.css';

export type ApparelPolicyUpdate={type:'apparel-policy-update';policyId:number;allowedItems:ApparelItem[];allowedMaterials:ApparelMaterial[];
  minQuality:WeaponQuality;maxQuality:WeaponQuality;minHitPointsPercent:number;maxHitPointsPercent:number};
export type ApparelPolicyEditorCommand=ApparelPolicyUpdate|ApparelPolicyNameCommand;
const items=Object.keys(APPAREL) as ApparelItem[];
const qualityOptions=()=>WEAPON_QUALITIES.map(q=>`<option value="${q}">${QUALITY_LABELS[q]}</option>`).join('');
export function apparelPolicyEditorLayout():string {
  return `<dialog id="apparel-policy-dialog" class="apparel-policy-dialog" aria-labelledby="apparel-policy-heading">
    <div class="panel-heading"><h2 id="apparel-policy-heading">Politiques de tenue</h2><button type="button" id="close-apparel-policies" aria-label="Fermer les politiques de tenue">×</button></div>
    <p>Une politique est partagée par toutes les personnes qui l’utilisent. Modifier les filtres ne donne aucun ordre de port immédiat. Auto et le port forcé restent inchangés.</p>
    <label>Politique existante <select id="apparel-policy-choice"></select></label>
    <p id="apparel-policy-users" class="muted"></p><p id="apparel-policy-elsewhere" class="muted"></p>
    <div class="apparel-policy-name-actions"><button type="button" id="copy-apparel-policy">Copier</button><button type="button" id="rename-apparel-policy">Renommer</button></div>
    <div id="apparel-policy-name-editor" class="apparel-policy-name-editor" role="group" aria-labelledby="apparel-policy-name-heading" hidden>
      <h3 id="apparel-policy-name-heading"></h3><p id="apparel-policy-name-source" class="muted"></p>
      <label for="apparel-policy-name">Nom de la politique (60 caractères maximum)</label><input id="apparel-policy-name" type="text" maxlength="60" autocomplete="off" aria-describedby="apparel-policy-name-error">
      <p id="apparel-policy-name-error" role="status"></p><div class="policy-actions"><button type="button" id="confirm-apparel-policy-name">Confirmer</button><button type="button" id="cancel-apparel-policy-name">Annuler le nom</button></div>
    </div>
    <form id="apparel-policy-form">
      <fieldset class="apparel-item-filters"><legend>Vêtements autorisés</legend>${items.map(id=>`<label><input type="checkbox" data-apparel-allowed-item="${id}"> ${APPAREL[id].label}</label>`).join('')}</fieldset>
      <fieldset class="apparel-material-filters"><legend>Matières autorisées</legend>${APPAREL_MATERIALS.map(id=>`<label><input type="checkbox" data-apparel-allowed-material="${id}"> ${APPAREL_MATERIAL_DEFINITIONS[id].label}</label>`).join('')}</fieldset>
      <p class="muted">Les deux filtres s’appliquent ensemble. Les armures sans matière textile ne dépendent pas du filtre de matière.</p>
      <div class="apparel-policy-ranges"><label>Qualité minimale <select id="apparel-min-quality">${qualityOptions()}</select></label><label>Qualité maximale <select id="apparel-max-quality">${qualityOptions()}</select></label>
      <label>PV minimum (%) <input id="apparel-min-hp" type="number" min="0" max="100" step="any" required></label><label>PV maximum (%) <input id="apparel-max-hp" type="number" min="0" max="100" step="any" required></label></div>
      <p id="apparel-policy-draft-status" role="status"></p><p id="apparel-policy-feedback" role="status"></p>
      <div class="policy-actions"><button id="apply-apparel-policy" type="submit">Appliquer</button><button id="cancel-apparel-policy" type="button">Annuler</button></div>
    </form><p class="muted">Appliquer ou annuler le brouillon avant de choisir, copier ou renommer une politique. Copier reprend seulement les filtres confirmés, sans affecter personne. Les remplacements automatiques restent physiques, à la prochaine vérification lorsque le colon est libre ; ils respectent le stockage et l’accès ordinaires.</p>
  </dialog>`;
}
const fields=(p:ApparelPolicy):Omit<ApparelPolicyUpdate,'type'>=>({policyId:p.id,allowedItems:[...p.allowedItems],allowedMaterials:[...p.allowedMaterials],minQuality:p.minQuality,maxQuality:p.maxQuality,minHitPointsPercent:p.minHitPointsPercent,maxHitPointsPercent:p.maxHitPointsPercent});
const signature=(p:Omit<ApparelPolicyUpdate,'type'>)=>JSON.stringify([p.policyId,p.allowedItems,p.allowedMaterials,p.minQuality,p.maxQuality,p.minHitPointsPercent,p.maxHitPointsPercent]);

/** Only owners actually present in this projection can name affected users. */
function knownPeople(world:World):{pawn:Pawn;place:string}[] {
  const result:{pawn:Pawn;place:string}[]=[],seen=new Set<number>();
  const add=(pawns:readonly Pawn[],place:string)=>{for(const pawn of pawns)if(!seen.has(pawn.id)){
    seen.add(pawn.id);result.push({pawn,place});
  }};
  const projection=world.campaignMap;
  add(world.pawns,projection?.revision===2?`carte ${projection.activeMapId}`:projection?.active==='secondary'?'second site':'foyer');
  if(world.secondarySite)add(world.secondarySite.map.pawns,'second site');
  if(world.group&&'members' in world.group)add(world.group.members,'voyage collectif');
  if(world.scout&&'pawn' in world.scout)add([world.scout.pawn],'reconnaissance');
  if(world.commercialTrip&&'pawn' in world.commercialTrip)add([world.commercialTrip.pawn],'voyage commercial');
  return result;
}
export function apparelPolicyKnownUsers(world:World,policyId:number):string[] {
  return knownPeople(world).filter(({pawn})=>pawn.state!=='dead'&&pawn.apparelPolicyId===policyId).map(({pawn,place})=>`${pawn.name} (${place}${pawn.apparelAutomation?' · Auto actif':' · Auto désactivé'})`);
}

export function createApparelPolicyEditor(root:HTMLElement,send:(command:ApparelPolicyEditorCommand)=>Promise<string|null>,blocked:()=>boolean=()=>false){
  const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T|null;
  const openNode=el<HTMLButtonElement>('manage-apparel-policies'),dialogNode=el<HTMLDialogElement>('apparel-policy-dialog');
  // Layout-only adapters and historical DOM doubles may omit the optional editor.
  if(!openNode||!dialogNode)return {update(_next:World){}};
  const open=openNode,dialog=dialogNode;
  const choice=el<HTMLSelectElement>('apparel-policy-choice')!,form=el<HTMLFormElement>('apparel-policy-form')!,feedback=el('apparel-policy-feedback')!,status=el('apparel-policy-draft-status')!;
  const apply=el<HTMLButtonElement>('apply-apparel-policy')!,cancel=el<HTMLButtonElement>('cancel-apparel-policy')!,close=el<HTMLButtonElement>('close-apparel-policies')!;
  const minQuality=el<HTMLSelectElement>('apparel-min-quality')!,maxQuality=el<HTMLSelectElement>('apparel-max-quality')!,minHP=el<HTMLInputElement>('apparel-min-hp')!,maxHP=el<HTMLInputElement>('apparel-max-hp')!;
  const copy=el<HTMLButtonElement>('copy-apparel-policy'),rename=el<HTMLButtonElement>('rename-apparel-policy'),nameBox=el('apparel-policy-name-editor'),nameInput=el<HTMLInputElement>('apparel-policy-name'),nameHeading=el('apparel-policy-name-heading'),nameSource=el('apparel-policy-name-source'),nameError=el('apparel-policy-name-error'),nameConfirm=el<HTMLButtonElement>('confirm-apparel-policy-name'),nameCancel=el<HTMLButtonElement>('cancel-apparel-policy-name');
  const names=copy&&rename&&nameBox&&nameInput&&nameHeading&&nameSource&&nameError&&nameConfirm&&nameCancel?{copy,rename,box:nameBox,input:nameInput,heading:nameHeading,source:nameSource,error:nameError,confirm:nameConfirm,cancel:nameCancel}:undefined;
  const itemChecks=[...dialog.querySelectorAll<HTMLInputElement>('[data-apparel-allowed-item]')],materialChecks=[...dialog.querySelectorAll<HTMLInputElement>('[data-apparel-allowed-material]')];
  let world:World|undefined,selectedId:number|undefined,draft:Omit<ApparelPolicyUpdate,'type'>|undefined,baseline='',dirty=false,pending=false,awaiting:ApparelPolicyUpdate|undefined,optionsSignature='';
  let naming:'copy'|'rename'|undefined,nameSourceId:number|undefined;
  let awaitingName:{command:ApparelPolicyNameCommand;targetId:number;confirmedFields:string}|undefined;
  const policy=()=>world?.apparelPolicies?.find(p=>p.id===selectedId);
  const locked=()=>pending||!!awaiting||!!awaitingName||blocked()||!!world&&world.schemaVersion!==SCHEMA_VERSION;
  function controls(){
    const lock=locked(),editing=!!naming;choice.disabled=lock||dirty||editing;apply.disabled=lock||!draft||editing;cancel.disabled=close.disabled=pending||!!awaiting||!!awaitingName;
    for(const control of [...itemChecks,...materialChecks,minQuality,maxQuality,minHP,maxHP])control.disabled=lock||editing;
    open.disabled=lock||!world?.apparelPolicies?.length;
    if(names){names.copy.disabled=names.rename.disabled=lock||dirty||editing||!policy();names.input.disabled=names.confirm.disabled=lock;names.cancel.disabled=pending||!!awaitingName;}
  }
  function clearName(){naming=undefined;nameSourceId=undefined;if(names){names.box.hidden=true;names.input.value='';names.error.textContent='';}}
  function loadConfirmed(){
    const p=policy();draft=p?fields(p):undefined;baseline=draft?signature(draft):'';dirty=false;
    if(!draft){controls();return;}
    choice.value=String(draft.policyId);for(const check of itemChecks)check.checked=draft.allowedItems.includes(check.dataset.apparelAllowedItem as ApparelItem);
    for(const check of materialChecks)check.checked=draft.allowedMaterials.includes(check.dataset.apparelAllowedMaterial as ApparelMaterial);
    minQuality.value=draft.minQuality;maxQuality.value=draft.maxQuality;minHP.value=String(draft.minHitPointsPercent*100);maxHP.value=String(draft.maxHitPointsPercent*100);status.textContent='Valeurs confirmées. Aucun ordre de port envoyé.';controls();
  }
  function changed(){if(!draft)return;dirty=true;status.textContent='Brouillon non appliqué. Les filtres confirmés restent en vigueur. Appliquez ou annulez ce brouillon avant de copier ou renommer.';feedback.textContent='';controls();}
  for(const check of itemChecks)check.onchange=()=>{if(locked()||naming||!draft)return;draft.allowedItems=itemChecks.filter(c=>c.checked).map(c=>c.dataset.apparelAllowedItem as ApparelItem);changed();};
  for(const check of materialChecks)check.onchange=()=>{if(locked()||naming||!draft)return;draft.allowedMaterials=materialChecks.filter(c=>c.checked).map(c=>c.dataset.apparelAllowedMaterial as ApparelMaterial);changed();};
  minQuality.onchange=()=>{if(!locked()&&!naming&&draft){draft.minQuality=minQuality.value as WeaponQuality;changed();}};
  maxQuality.onchange=()=>{if(!locked()&&!naming&&draft){draft.maxQuality=maxQuality.value as WeaponQuality;changed();}};
  const percent=(input:HTMLInputElement)=>input.value.trim()===''?NaN:Number(input.value)/100;
  minHP.oninput=()=>{if(!locked()&&!naming&&draft){draft.minHitPointsPercent=percent(minHP);changed();}};
  maxHP.oninput=()=>{if(!locked()&&!naming&&draft){draft.maxHitPointsPercent=percent(maxHP);changed();}};
  function discard(){if(pending||awaiting||awaitingName)return;clearName();draft=undefined;dirty=false;feedback.textContent='';dialog.close();controls();}
  cancel.onclick=close.onclick=discard;dialog.addEventListener('cancel',event=>{event.preventDefault();discard();});
  // Typing a name must not reach the game's time shortcuts.
  dialog.addEventListener('keydown',event=>{if(event.key!=='Escape')event.stopPropagation();});
  open.onclick=()=>{if(locked()||!world?.apparelPolicies?.length)return;clearName();selectedId=world.apparelPolicies.some(p=>p.id===selectedId)?selectedId:world.apparelPolicies[0]!.id;loadConfirmed();feedback.textContent='';dialog.showModal();update(world);};
  choice.onchange=()=>{if(locked()||dirty||naming)return;selectedId=Number(choice.value);loadConfirmed();if(world)update(world);};
  form.onsubmit=event=>{event.preventDefault();void commit();};
  async function commit(){
    if(locked()||naming||!draft)return;const confirmed=policy();
    if(!confirmed||!validApparelPolicy({...confirmed,...draft})){feedback.textContent='Vérifiez les qualités et les PV : minimum ≤ maximum, PV compris entre 0 et 100 %.';return;}
    const command:ApparelPolicyUpdate={type:'apparel-policy-update',...draft,allowedItems:[...draft.allowedItems],allowedMaterials:[...draft.allowedMaterials]};
    pending=true;root.setAttribute('aria-busy','true');controls();
    try{const error=await send(command);feedback.textContent=error??'Commande acceptée ; attente des filtres confirmés.';if(!error)awaiting=command;}
    catch(error){feedback.textContent=error instanceof Error?error.message:String(error);}
    finally{pending=false;root.removeAttribute('aria-busy');if(world)update(world);else controls();}
  }
  function beginName(kind:'copy'|'rename'){
    if(!names||locked()||dirty||naming)return;const current=policy();if(!current)return;naming=kind;nameSourceId=current.id;
    names.heading.textContent=kind==='copy'?'Copier une politique':'Renommer la politique';names.source.textContent=(kind==='copy'?'Filtres confirmés de : ':'Politique : ')+current.label;
    names.input.value=kind==='copy'?'':current.label;names.error.textContent='';names.box.hidden=false;feedback.textContent='';controls();names.input.focus();
  }
  async function commitName(){
    if(!names||locked()||dirty||!naming||!world)return;const current=policy();if(!current||current.id!==nameSourceId){names.error.textContent='La politique source n’est plus disponible.';return;}
    const label=normalizeApparelPolicyName(names.input.value);if(label===null){names.error.textContent='Saisissez un nom de 1 à 60 caractères, sans caractère de contrôle.';return;}
    const command:ApparelPolicyNameCommand=naming==='copy'?{type:'apparel-policy-copy',policyId:current.id,label}:{type:'apparel-policy-rename',policyId:current.id,label};
    const targetId=naming==='copy'?world.nextApparelPolicyId!:current.id,confirmedFields=signature({...fields(current),policyId:targetId});
    pending=true;names.error.textContent='';root.setAttribute('aria-busy','true');controls();
    try{const error=await send(command);names.error.textContent=error??'Commande acceptée ; attente du registre confirmé.';if(!error)awaitingName={command,targetId,confirmedFields};}
    catch(error){names.error.textContent=error instanceof Error?error.message:String(error);}
    finally{pending=false;root.removeAttribute('aria-busy');if(world)update(world);else controls();}
  }
  if(names){names.copy.onclick=()=>beginName('copy');names.rename.onclick=()=>beginName('rename');names.confirm.onclick=()=>void commitName();names.cancel.onclick=()=>{if(pending||awaitingName)return;clearName();feedback.textContent='Aucune copie ni modification de nom envoyée.';controls();};names.input.oninput=()=>{names.error.textContent='';};names.input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();void commitName();}});}
  function update(next:World){
    world=next;const policies=next.apparelPolicies??[],signatureNow=JSON.stringify(policies.map(p=>[p.id,p.label]));
    if(signatureNow!==optionsSignature){optionsSignature=signatureNow;choice.replaceChildren(...policies.map(p=>{const option=document.createElement('option');option.value=String(p.id);option.textContent=p.label;return option;}));if(selectedId!==undefined)choice.value=String(selectedId);}
    const current=policy();if(awaiting&&current&&signature(fields(current))===signature(awaiting)){awaiting=undefined;loadConfirmed();feedback.textContent='Politique appliquée aux utilisateurs indiqués. Les gestes restent physiques.';}
    if(awaitingName){const target=policies.find(p=>p.id===awaitingName!.targetId),a=awaitingName;
      if(target&&target.label===a.command.label&&(a.command.type==='apparel-policy-rename'||next.nextApparelPolicyId===a.targetId+1&&signature(fields(target))===a.confirmedFields)){
        const copied=a.command.type==='apparel-policy-copy';selectedId=target.id;awaitingName=undefined;clearName();loadConfirmed();feedback.textContent=copied?'Copie confirmée. Aucune personne affectée ; Auto et les vêtements sont inchangés.':'Nom confirmé. Filtres, affectations et vêtements sont inchangés.';
      }
    }
    if(dialog.open){
      const users=selectedId===undefined?[]:apparelPolicyKnownUsers(next,selectedId);el('apparel-policy-users')!.textContent=users.length?'Utilisée par : '+users.join(', '):'Aucune personne affectée visible dans cette projection.';
      const exposed=new Set(knownPeople(next).map(({pawn})=>pawn.id));
      el('apparel-policy-elsewhere')!.textContent=next.campaignPeople?.some(p=>p.status==='away'&&!exposed.has(p.id))?'Politique partagée aussi avec les personnes des autres cartes ; affectations non visibles ici.':'';
      if(dirty&&current&&signature(fields(current))!==baseline)status.textContent='Les valeurs confirmées ont changé ; votre brouillon est conservé. Appliquer remplacera les filtres de cette politique partagée.';
      if(draft&&!policy())status.textContent='Politique indisponible dans le monde confirmé. Le brouillon est conservé.';
    }
    controls();
  }
  return {update};
}
