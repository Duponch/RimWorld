import {SimulationRequestError} from '../bridge/protocol';
import {setTooltip} from './tooltip';
import './map-registry-panel.css';

/** DOM view models, not saved state or a second wire protocol. The adapter must
 * derive these facts from the same confirmed projection as the command owner. */
export interface MapActionAvailability {ok:boolean;reason?:string}
export interface MapRegistryRow {
 id:number;tile:number|null;name:string;kind:'settlement'|'camp'|'legacy-site'|'battlefield';active:boolean;
 people:number;createdAt:number;campPressure?:import('../sim/camp-pressure-state-260').CampPressure260;
 view:MapActionAvailability;settle:MapActionAvailability;abandon:MapActionAvailability;
 abandonedPeople:readonly {id:number;name:string}[];groundItems:number;structures:number;
}
export interface MapRegistryState {
 tick:number;selectedMapId:number|null;maxSettlements:number;settlements:number;
 maps:readonly MapRegistryRow[];
}
export interface MapRegistryActions {
 view:(mapId:number)=>Promise<unknown>;
 prepare:(mapId:number)=>Promise<unknown>;
 settle:(mapId:number)=>Promise<unknown>;
 abandon:(mapId:number)=>Promise<unknown>;
}
const kindLabel=(kind:MapRegistryRow['kind'])=>kind==='settlement'?'Colonie':kind==='camp'?'Camp temporaire':kind==='battlefield'?'Champ de bataille':'Site conservé';

export function createMapRegistryPanel(host:HTMLElement,actions:MapRegistryActions){
 const doc=host.ownerDocument,root=doc.createElement('section'),title=doc.createElement('h3'),summary=doc.createElement('p'),status=doc.createElement('p'),rows=doc.createElement('div');
 root.className='map-registry-panel';title.textContent='Cartes et colonies';status.setAttribute('role','status');status.hidden=true;
 root.append(title,summary,status,rows);host.append(root);
 let state:MapRegistryState|undefined,blocked:string|undefined,unknown:string|undefined,error:string|undefined,busy=false,generation=0,disposed=false,dialog:HTMLDialogElement|undefined;
 const records=new Map<number,{root:HTMLElement;name:HTMLElement;facts:HTMLElement;view:HTMLButtonElement;prepare:HTMLButtonElement;settle:HTMLButtonElement;abandon:HTMLButtonElement}>();
 const lock=()=>blocked??unknown??(busy?'Une commande est en cours.':undefined);
 const current=(id:number)=>state?.maps.find(map=>map.id===id);
 function availability(button:HTMLButtonElement,permission:MapActionAvailability){
  const reason=lock()??(!permission.ok?permission.reason??'Action indisponible.':undefined);button.disabled=!!reason;setTooltip(button,{body:reason??'Appliquer au monde confirmé.'});
 }
 function paint(){
  const message=lock()??error;status.hidden=!message;status.textContent=message??'';
  summary.textContent=state?`${state.settlements} colonie(s) · plafond ${state.maxSettlements} (Options) · ${state.maps.length} carte(s). Afficher une carte ne déplace personne.`:'Le registre des cartes attend le monde confirmé.';
  const ids=new Set(state?.maps.map(map=>map.id)??[]);for(const [id,record] of records)if(!ids.has(id)){record.root.remove();records.delete(id);}
  state?.maps.forEach((map,index)=>{
   let record=records.get(map.id);
   if(!record){
    const line=doc.createElement('article'),name=doc.createElement('strong'),facts=doc.createElement('p'),buttons=doc.createElement('div');line.className='map-registry-row';line.dataset.mapId=String(map.id);buttons.className='map-registry-actions';
    const button=(label:string,action:()=>void)=>{const b=doc.createElement('button');b.type='button';b.textContent=label;b.onclick=action;buttons.append(b);return b;};
    const view=button('Afficher',()=>void send(map.id,'view')),prepare=button('Préparer une caravane',()=>void send(map.id,'prepare')),settle=button('S’installer',()=>confirm(map.id,'settle')),abandon=button('Abandonner',()=>confirm(map.id,'abandon'));
    line.append(name,facts,buttons);record={root:line,name,facts,view,prepare,settle,abandon};records.set(map.id,record);
   }
   const before=rows.children[index];if(before!==record.root)rows.insertBefore(record.root,before??null);
   record.name.textContent=map.name;record.facts.textContent=`${kindLabel(map.kind)} · ${map.tile===null?'lieu historique':`case ${map.tile}`} · ${map.people} personne(s)${map.active?' · carte active':''}${map.campPressure?` · ${map.campPressure.alert?'Détecté':'Détection dans '+Math.max(0,((map.campPressure.notifyAtCore??0)-state!.tick*10)/2500).toFixed(1)+' h'} · tentative mécanique dans ${Math.max(0,(map.campPressure.raidAtCore-state!.tick*10)/2500).toFixed(1)} h · ${map.campPressure.raidsSent} attaque(s) créée(s)`:''}`;
   record.view.textContent=map.active?'Revenir à cette carte':'Afficher';availability(record.view,map.view);availability(record.prepare,map.view);record.prepare.textContent=(map.kind==='camp'||map.kind==='battlefield')?'Reformer une caravane':'Préparer une caravane';availability(record.settle,map.settle);availability(record.abandon,map.abandon);record.settle.hidden=map.kind==='settlement';
  });
 }
 function closeConfirmation(){if(dialog){dialog.close();dialog.remove();dialog=undefined;}}
 async function send(mapId:number,action:'view'|'prepare'|'settle'|'abandon'){
  const map=current(mapId);if(disposed||lock()||!map||!(action==='prepare'?map.view:map[action]).ok)return;
  const token=generation;busy=true;error=undefined;paint();
  try{await actions[action](mapId);}
  catch(cause){if(token!==generation||disposed)return;const message=cause instanceof Error?cause.message:String(cause);if(!(cause instanceof SimulationRequestError)||cause.outcome==='unknown')unknown=`Résultat inconnu : ${message}`;error=cause instanceof SimulationRequestError&&cause.outcome==='refused'?`Commande refusée : ${message}`:message;}
  finally{if(token===generation&&!disposed){busy=false;paint();}}
 }
 function confirm(mapId:number,action:'settle'|'abandon'){
  const map=current(mapId);if(disposed||dialog||lock()||!map||!map[action].ok)return;
  const confirmedKey=JSON.stringify([map.id,map.createdAt,map.tile,map.kind,map.abandonedPeople,map.groundItems,map.structures]);
  const previous=doc.activeElement,panel=doc.createElement('dialog'),heading=doc.createElement('h3'),text=doc.createElement('p'),cancel=doc.createElement('button'),accept=doc.createElement('button');dialog=panel;panel.className='map-registry-confirmation';panel.setAttribute('aria-label',action==='settle'?'S’installer sur cette carte':'Abandonner cette carte');
  heading.textContent=map.name;
  text.textContent=action==='settle'?'Transformer ce lieu en colonie en conservant son terrain, ses personnes et ses biens ?':`Abandonner cette carte ? La carte locale sera retirée. ${map.groundItems} unité(s) au sol et ${map.structures} construction(s) seront abandonnées ; ces biens ne seront pas rapatriés.${map.abandonedPeople.length?` Personnes laissées sur place : ${map.abandonedPeople.map(person=>person.name).join(', ')}. Elles seront bannies.`:''}`;
  const close=()=>{closeConfirmation();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});};
  cancel.type=accept.type='button';cancel.textContent='Annuler';accept.textContent=action==='settle'?'S’installer':'Abandonner';cancel.onclick=close;accept.onclick=()=>{const latest=current(mapId);close();if(!latest||JSON.stringify([latest.id,latest.createdAt,latest.tile,latest.kind,latest.abandonedPeople,latest.groundItems,latest.structures])!==confirmedKey){error='La situation de cette carte a changé. Vérifiez-la avant de confirmer de nouveau.';paint();return;}void send(mapId,action);};panel.append(heading,text,cancel,accept);
  panel.addEventListener('cancel',event=>{event.preventDefault();close();});panel.addEventListener('keydown',event=>event.stopPropagation());root.append(panel);panel.showModal();cancel.focus();
 }
 return {
  update(next:MapRegistryState){state=next;paint();},
  setBlocked(reason:string|undefined){blocked=reason;paint();},
  resetForReplacement(){generation++;closeConfirmation();state=undefined;unknown=undefined;error=undefined;busy=false;paint();},
  dispose(){disposed=true;generation++;closeConfirmation();root.remove();records.clear();},
 };
}

export interface JumpToEntry {kind:'map'|'group'|'quest';id:number;label:string;active?:boolean}
/** Compact, shared navigation. A target is a confirmed ID, never text parsed
 * into an actor, a map or a command. Routing is owned by MAIN. */
export function createMapJumpTo(host:HTMLElement,goto:(target:JumpToEntry)=>Promise<unknown>){
 const doc=host.ownerDocument,root=doc.createElement('nav'),label=doc.createElement('label'),select=doc.createElement('select'),go=doc.createElement('button'),status=doc.createElement('span');
 for(const type of ['pointerdown','pointerup','click','dblclick','keydown','keyup'] as const)root.addEventListener(type,event=>event.stopPropagation());
 root.className='map-jump-to';root.setAttribute('aria-label','Aller à une carte ou un voyage');label.textContent='Aller à ';select.setAttribute('aria-label','Destination de navigation');go.type='button';go.textContent='Afficher';status.setAttribute('role','status');label.append(select);root.append(label,go,status);host.append(root);
 let entries:readonly JumpToEntry[]=[],blocked:string|undefined,busy=false,generation=0,disposed=false,signature='';
 const key=(entry:JumpToEntry)=>`${entry.kind}:${entry.id}`;
 function paint(){go.disabled=busy||!!blocked||!entries.length;select.disabled=busy||!!blocked||!entries.length;setTooltip(go,{body:blocked??'Afficher le lieu ou le voyage choisi, sans déplacer les personnes.'});}
 go.onclick=()=>{const target=entries.find(entry=>key(entry)===select.value);if(disposed||busy||blocked||!target)return;const token=generation;busy=true;status.textContent='';paint();void goto(target).catch(cause=>{if(token===generation&&!disposed)status.textContent=cause instanceof Error?cause.message:String(cause);}).finally(()=>{if(token===generation&&!disposed){busy=false;paint();}});};
 return {
  update(next:readonly JumpToEntry[]){entries=next;const nextSignature=JSON.stringify(next.map(entry=>[key(entry),entry.label,!!entry.active]));if(signature!==nextSignature){signature=nextSignature;const previous=select.value;select.replaceChildren(...next.map(entry=>{const option=doc.createElement('option');option.value=key(entry);option.textContent=entry.label;return option;}));const chosen=next.find(entry=>key(entry)===previous)??next.find(entry=>entry.active)??next[0];if(chosen)select.value=key(chosen);}paint();},
  setBlocked(reason:string|undefined){blocked=reason;paint();},
  resetForReplacement(){generation++;entries=[];signature='';busy=false;select.replaceChildren();status.textContent='';paint();},
  dispose(){disposed=true;generation++;root.remove();},
 };
}