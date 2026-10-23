import {isShelfKind} from '../sim/shelf-storage';
import {targetBuildingPlayerUse263} from '../sim/world-target-building-263';
import type {LinkedStorageCommand286,LinkedStorageGroup286} from '../sim/linked-storage-state-286';
import type {Structure,World} from '../sim/types';
import {knownBuilding256} from './exploration-readers-256';

export interface LinkedStorageContext286 {world:World;mapId:number;epoch:number;structureId:number;blocked?:boolean}
export interface LinkedStorageAnchor286 {mapId:number;epoch:number;structureId:number}
export interface LinkedStorageActions286 {
 current():LinkedStorageContext286|undefined;
 send(command:LinkedStorageCommand286,context:LinkedStorageAnchor286):Promise<unknown>;
 /** Discrete request changes, including an ACK after the last paused snapshot. */
 onPendingChange?(pending:boolean):void;
}
interface View {context:LinkedStorageContext286;shelf:Structure;group?:LinkedStorageGroup286}
interface Choice {key:string;label:string;representativeId:number;groupId?:number;stamp:string}
interface Draft {kind:'link'|'unlink'|'rename';anchorStamp:string;choices:Choice[]}
interface Request {anchor:LinkedStorageAnchor286;command:LinkedStorageCommand286;groupId?:number;confirmed:boolean;acknowledged:boolean;connected:boolean}
const identity=(context:LinkedStorageAnchor286)=>`${context.epoch}:${context.mapId}:${context.structureId}`;
const registry=(world:World)=>world.linkedStorage286;
const linkedId=(shelf:Structure)=>shelf.shelf?.linked286?.groupId;
const groupFor=(world:World,shelf:Structure)=>registry(world)?.groups.find(group=>group.id===linkedId(shelf));
const buildingLabel=(shelf:Structure)=>`${shelf.kind==='small-shelf'?'Petite étagère':'Étagère'} ${shelf.id} (${shelf.x}, ${shelf.z})`;
const groupLabel=(group:LinkedStorageGroup286)=>`« ${group.name} » (groupe ${group.id})`;
const groupStamp=(group:LinkedStorageGroup286|undefined)=>group?[group.id,group.originMapId,group.name,group.memberIds,group.settings]:null;
const shelfStamp=(shelf:Structure,group?:LinkedStorageGroup286)=>JSON.stringify([shelf.id,shelf.kind,shelf.x,shelf.z,shelf.orientation,linkedId(shelf)??null,shelf.shelf?.settings,groupStamp(group)]);
const usable=(world:World,shelf:Structure)=>isShelfKind(shelf.kind)&&!!shelf.shelf&&knownBuilding256(world,shelf)&&targetBuildingPlayerUse263(world,shelf);
const nameValue=(value:string):string|undefined=>{const trimmed=value.trim();return trimmed.length>0&&trimmed.length<=64&&!/[\u0000-\u001f\u007f]/.test(trimmed)?trimmed:undefined;};

/** Publication metadata names the scope; absent members remain references,
 * never fabricated local furniture or an aggregate physical capacity. */
export function linkedStoragePasteScope286(world:World,structureId:number):string {
 const shelf=world.structures.find(s=>s.id===structureId);
 if(!shelf||!usable(world,shelf))return 'Étagère installée indisponible.';
 if(linkedId(shelf)===undefined)return 'Coller les réglages dans cette étagère indépendante.';
 const group=groupFor(world,shelf);
 if(!group||!group.memberIds.includes(shelf.id))return 'Groupe lié indisponible ; collage impossible.';
 return `Coller les réglages dans ${groupLabel(group)} : ${group.memberIds.length} étagères liées au total, y compris les membres emballés ou absents de cette vue.`;
}

/** An inspector-local controller. Reads only the confirmed map projection;
 * opening, choosing, refreshing and cancelling never issue a command. */
export function createLinkedStorageControls286(actions:LinkedStorageActions286){
 const element=document.createElement('section');element.dataset.linkedStorageControls='';
 element.setAttribute('aria-label','Réglages liés des étagères');
 const summary=document.createElement('p');summary.dataset.linkedStorageSummary='';
 const scope=document.createElement('p');scope.className='muted';scope.dataset.linkedStorageScope='';
 const buttons=document.createElement('div');buttons.className='zone-actions';
 const button=(label:string,key:string)=>{const node=document.createElement('button');node.type='button';node.textContent=label;node.dataset.linkedStorageAction=key;return node;};
 const open=button('Lier les réglages…','open'),unlink=button('Délier cette étagère…','unlink'),rename=button('Renommer le groupe…','rename');buttons.append(open,unlink,rename);
 const editor=document.createElement('div');editor.dataset.linkedStorageEditor='';editor.hidden=true;
 const heading=document.createElement('p');heading.dataset.linkedStorageHeading='';
 const choiceLabel=document.createElement('label'),choice=document.createElement('select');choice.dataset.linkedStorageChoice='';choiceLabel.append('Étagère ou groupe destination',choice);
 const nameLabel=document.createElement('label'),name=document.createElement('input');name.type='text';name.maxLength=64;name.autocomplete='off';name.dataset.linkedStorageName='';nameLabel.append('Nom du groupe (64 caractères maximum)',name);
 const preview=document.createElement('p');preview.dataset.linkedStoragePreview='';
 const editorButtons=document.createElement('div');editorButtons.className='zone-actions';
 const confirm=button('Confirmer','confirm'),cancel=button('Annuler','cancel'),refresh=button('Actualiser les choix','refresh');editorButtons.append(confirm,cancel,refresh);
 editor.append(heading,choiceLabel,nameLabel,preview,editorButtons);
 const status=document.createElement('p');status.dataset.linkedStorageStatus='';status.setAttribute('role','status');
 const help=document.createElement('small');help.textContent='Les filtres et la priorité sont communs au groupe. Copier garde une photographie indépendante des réglages. Chaque étagère conserve sa capacité et son contenu.';
 element.append(summary,scope,buttons,editor,status,help);
 let disposed=false,binding='',draft:Draft|undefined,request:Request|undefined,feedback='',publishedPending=false;
 function publishPending(){const pending=!!request;if(pending!==publishedPending){publishedPending=pending;actions.onPendingChange?.(pending);}}

 function view():View|undefined {
  if(disposed)return;
  const context=actions.current();if(!context||context.world.schemaVersion!==286||!Number.isSafeInteger(context.epoch)||context.epoch<0||!Number.isSafeInteger(context.mapId)||context.mapId<0)return;
  const {world}=context,projectedMap=world.campaignMap?.revision===2?world.campaignMap.activeMapId:undefined;
  if(projectedMap!==undefined&&projectedMap!==context.mapId)return;
  const shelf=world.structures.find(s=>s.id===context.structureId);if(!shelf||!usable(world,shelf))return;
  const group=groupFor(world,shelf);
  if(linkedId(shelf)!==undefined&&(!group||group.originMapId!==context.mapId||!group.memberIds.includes(shelf.id)))return;
  return {context,shelf,group};
 }
 function currentChoice(v:View,item:Choice):boolean {
  const target=v.context.world.structures.find(s=>s.id===item.representativeId);
  if(!target||target.id===v.shelf.id||!usable(v.context.world,target))return false;
  const group=groupFor(v.context.world,target);
  return item.groupId===undefined?linkedId(target)===undefined&&shelfStamp(target)===item.stamp:
   !!group&&group.id===item.groupId&&group.originMapId===v.context.mapId&&group.memberIds.includes(target.id)&&group.id!==v.group?.id&&shelfStamp(target,group)===item.stamp;
 }
 function choices(v:View):Choice[]{
  const independent:Choice[]=[],groups=new Map<number,{group:LinkedStorageGroup286;shelf:Structure}>();
  for(const shelf of v.context.world.structures){
   if(shelf.id===v.shelf.id||!usable(v.context.world,shelf))continue;
   if(linkedId(shelf)===undefined){independent.push({key:`s:${shelf.id}`,label:`${buildingLabel(shelf)} · indépendante`,representativeId:shelf.id,stamp:shelfStamp(shelf)});continue;}
   const group=groupFor(v.context.world,shelf);if(!group||group.id===v.group?.id||group.originMapId!==v.context.mapId||!group.memberIds.includes(shelf.id))continue;
   const previous=groups.get(group.id);if(!previous||shelf.id<previous.shelf.id)groups.set(group.id,{group,shelf});
  }
  independent.sort((a,b)=>a.representativeId-b.representativeId);
  return [...independent,...[...groups.values()].sort((a,b)=>a.group.id-b.group.id).map(({group,shelf})=>({key:`g:${group.id}`,label:`${groupLabel(group)} · ${group.memberIds.length} membres · ${buildingLabel(shelf)}`,representativeId:shelf.id,groupId:group.id,stamp:shelfStamp(shelf,group)}))];
 }
 function fillChoices(v:View,selected=''){
  const items=choices(v);draft={kind:'link',anchorStamp:shelfStamp(v.shelf,v.group),choices:items};
  const empty=document.createElement('option');empty.value='';empty.textContent='Choisir une étagère ou un groupe';
  choice.replaceChildren(empty,...items.map(item=>{const node=document.createElement('option');node.value=item.key;node.textContent=item.label;return node;}));
  choice.value=items.some(item=>item.key===selected)?selected:'';
 }
 function matches(v:View,r:Request):boolean {
  if(r.command.type==='shelf-group-rename')return !!v.group&&v.group.id===r.groupId&&v.group.name===r.command.name;
  if(r.command.type==='shelf-unlink')return linkedId(v.shelf)===undefined;
  const [sourceId,otherId]=r.command.structureIds,source=v.context.world.structures.find(s=>s.id===sourceId),other=v.context.world.structures.find(s=>s.id===otherId);
  const group=source&&groupFor(v.context.world,source);
  return !!source&&!!other&&!!group&&(r.groupId===undefined||group.id===r.groupId)&&linkedId(other)===group.id&&group.memberIds.includes(source.id)&&group.memberIds.includes(other.id);
 }
 function synchronize():View|undefined {
  if(disposed)return;
  const v=view(),key=v?identity(v.context):'';
  if(key!==binding){binding=key;draft=undefined;request=undefined;feedback='';choice.value='';name.value='';}
  if(v&&request&&matches(v,request)){
   request.confirmed=true;draft=undefined;feedback='Modification confirmée.';
   if(request.acknowledged)request=undefined;
  }
  return v;
 }
 function selectedChoice(){return draft?.choices.find(item=>item.key===choice.value);}
 function stale(v:View){return !!draft&&draft.anchorStamp!==shelfStamp(v.shelf,v.group);}
 function render(){
  const v=synchronize();element.hidden=!v;publishPending();
  if(!v)return;
  const locked=!!v.context.blocked||!!request;
  const summaryText=v.group?`Réglages liés : ${groupLabel(v.group)} · ${v.group.memberIds.length} membres au total.`:'Réglages indépendants.';
  if(summary.textContent!==summaryText)summary.textContent=summaryText;
  const scopeText=linkedStoragePasteScope286(v.context.world,v.shelf.id);if(scope.textContent!==scopeText)scope.textContent=scopeText;
  unlink.hidden=rename.hidden=!v.group;open.disabled=unlink.disabled=rename.disabled=locked||!!draft;
  editor.hidden=!draft;choiceLabel.hidden=draft?.kind!=='link';nameLabel.hidden=draft?.kind!=='rename';refresh.hidden=draft?.kind!=='link';
  choice.disabled=name.disabled=locked;cancel.disabled=locked;refresh.disabled=locked;
  const changed=stale(v),item=selectedChoice();let valid=false;
  if(draft?.kind==='link'){
   heading.textContent='Choisir les réglages à lier';
   valid=!changed&&!!item&&currentChoice(v,item);
   if(!item)preview.textContent=draft.choices.length?'Aucune liaison n’est envoyée avant confirmation.':'Aucune autre étagère indépendante ou groupe compatible installé et connu sur cette carte.';
   else if(item.groupId!==undefined)preview.textContent=`${buildingLabel(v.shelf)} rejoindra ${item.label}. Les réglages de destination gagnent ; les autres membres de son ancien groupe ne sont pas transférés.`;
   else preview.textContent=v.group?`Ajouter ${item.label} à ${groupLabel(v.group)}. Les réglages actuels du groupe de ${buildingLabel(v.shelf)} gagnent.`:
    `Créer un groupe pour ${buildingLabel(v.shelf)} et ${item.label}. Source : ${buildingLabel(v.shelf)} ; ses réglages actuels gagnent.`;
   confirm.textContent=item?.groupId!==undefined?'Rejoindre ce groupe':v.group?'Ajouter cette étagère':'Lier ces deux étagères';
  }else if(draft?.kind==='unlink'){
   heading.textContent='Délier cette étagère';valid=!changed&&!!v.group;confirm.textContent='Délier cette étagère';
   preview.textContent=`Cette étagère conservera les réglages effectifs actuels.${v.group?.memberIds.length===2?' Le groupe de deux sera dissous ; l’autre étagère conservera aussi ces réglages.':' Les autres membres resteront liés.'}`;
  }else if(draft?.kind==='rename'){
   heading.textContent='Renommer le groupe';valid=!changed&&!!v.group&&nameValue(name.value)!==undefined&&nameValue(name.value)!==v.group.name;confirm.textContent='Renommer le groupe';
   preview.textContent='Le nom est un libellé, pas une identité. Plusieurs groupes peuvent porter le même nom ; réglages, membres et objets restent inchangés.';
  }
  confirm.disabled=locked||!valid;
  status.textContent=request?'Commande transmise ; attente de l’état confirmé.':changed?'Les réglages ou l’appartenance ont changé. Actualisez les choix ou annulez avant de confirmer.':draft?.kind==='link'&&item&&!currentChoice(v,item)?'La destination choisie a changé ou n’est plus disponible. Actualisez ; aucune autre étagère ne sera choisie automatiquement.':
   draft?.kind==='rename'&&nameValue(name.value)===undefined?'Saisissez un nom de 1 à 64 caractères après retrait des espaces aux extrémités, sans caractère de contrôle.':feedback||(draft?'Brouillon non appliqué.':'État confirmé.');
  element.setAttribute('aria-busy',String(!!request));
 }
 function begin(kind:Draft['kind']){
  render();const v=view();if(!v||v.context.blocked||request||draft||kind!=='link'&&!v.group)return;
  feedback='';if(kind==='link')fillChoices(v);else{draft={kind,anchorStamp:shelfStamp(v.shelf,v.group),choices:[]};if(kind==='rename')name.value=v.group!.name;}
  render();if(kind==='link')choice.focus();else if(kind==='rename')name.focus();else confirm.focus();
 }
 open.onclick=()=>begin('link');unlink.onclick=()=>begin('unlink');rename.onclick=()=>begin('rename');
 choice.onchange=()=>{feedback='';render();};name.oninput=()=>{feedback='';render();};
 refresh.onclick=()=>{render();const v=view();if(!v||v.context.blocked||request||draft?.kind!=='link')return;fillChoices(v,choice.value);feedback='Choix actualisés ; vérifiez la source et la destination avant de confirmer.';render();};
 cancel.onclick=()=>{if(disposed||request)return;draft=undefined;feedback='Brouillon annulé. Aucune commande envoyée.';render();open.focus();};
 confirm.onclick=()=>{
  render();const v=view();if(!v||v.context.blocked||request||!draft||confirm.disabled||stale(v))return;
  let command:LinkedStorageCommand286;
  if(draft.kind==='link'){
   const item=selectedChoice();if(!item||!currentChoice(v,item))return;
   command={type:'shelf-link',structureIds:item.groupId===undefined?[v.shelf.id,item.representativeId]:[item.representativeId,v.shelf.id]};
  }else if(draft.kind==='unlink')command={type:'shelf-unlink',structureId:v.shelf.id};
  else{const value=nameValue(name.value);if(value===undefined)return;command={type:'shelf-group-rename',structureId:v.shelf.id,name:value};}
  const groupId=command.type==='shelf-link'?(selectedChoice()?.groupId??v.group?.id):v.group?.id;
  const sent:Request={anchor:{mapId:v.context.mapId,epoch:v.context.epoch,structureId:v.shelf.id},command,...groupId===undefined?{}:{groupId},confirmed:false,acknowledged:false,connected:element.isConnected};request=sent;feedback='';render();
  const active=()=>!disposed&&request===sent&&(!sent.connected||element.isConnected)&&identity(actions.current()??{mapId:-1,epoch:-1,structureId:-1})===identity(sent.anchor);
  try{
   void Promise.resolve(actions.send(command,{...sent.anchor})).then(result=>{
    if(!active())return;
    if(result&&typeof result==='object'&&'ok'in result&&result.ok===false)throw Error('reason'in result&&typeof result.reason==='string'?result.reason:'La modification du stockage a été refusée.');
    sent.acknowledged=true;if(sent.confirmed)request=undefined;render();
   }).catch(error=>{if(!active())return;request=undefined;feedback=error instanceof Error?error.message:String(error);render();});
  }catch(error){if(active()){request=undefined;feedback=error instanceof Error?error.message:String(error);render();}}
 };
 element.addEventListener('keydown',event=>{if(event.key!=='Escape')event.stopPropagation();});
 render();
 return {element,update:render,get pending():boolean{return !!request;},dispose(){disposed=true;binding='';draft=undefined;request=undefined;publishPending();element.remove();}};
}
