/** Confirmed-owner Split/Merge dialogue. No private motion or CampaignState is reconstructed. */
import {SimulationRequestError} from '../bridge/protocol';
import {isColonist} from '../sim/affiliation';
import {ITEM_DEFINITIONS} from '../sim/items';
import {groupCaravanUnitMass256} from '../sim/group-caravan-mass-256';
import {freightGroup} from '../sim/group-freight';
import type {GroupReorganizationCommand} from '../sim/group-reorganization-state';
import type {GroupState} from '../sim/group-state';
import type {Pawn} from '../sim/types';
import type {GroupPanelSnapshot} from './group-panel';
import {travelAnimalLabel256,travelAnimalNeeds256,travelGroupLabel256,travelPackLabel256} from './group-travel-readers-256';
type Away=Extract<GroupState,{members:Pawn[]}>;
export const reorganizationAway256=(g:GroupState|undefined):g is Away=>!!g&&'members'in g;
const capable=(p:Pawn)=>isColonist(p)&&!p.prisoner&&!p.visitor&&p.state!=='dead'&&p.state!=='downed'&&!p.health?.death;
export interface GroupSplitSelection256 {people:ReadonlySet<number>;animals:ReadonlySet<number>;packs:ReadonlySet<number>;inventory:ReadonlyMap<number,string>}
/** Local form validation only. Authority still verifies each owner, allocation and command atomically. */
export function groupSplitCommand256(s:GroupPanelSnapshot,selection:GroupSplitSelection256):Extract<GroupReorganizationCommand,{type:'group-split'}>{
 const g=s.group;if(s.world.schemaVersion<256||!reorganizationAway256(g))throw Error('Cette caravane ne peut pas être séparée ici.');
 const people=g.members.filter(p=>selection.people.has(p.id)),remaining=g.members.filter(p=>!selection.people.has(p.id));
 if(people.length!==selection.people.size||!people.some(capable)||!remaining.some(capable))throw Error('Chaque caravane doit conserver un colon capable, libre et vivant.');
 const animals=g.animalOwners?.members??[];if([...selection.animals].some(id=>!animals.some(a=>a.id===id)))throw Error('Un animal choisi n’appartient plus à cette caravane.');
 if([...selection.packs].some(id=>!(g.packed??[]).some(p=>p.building.id===id)))throw Error('Un couchage choisi n’appartient plus à cette caravane.');
 const inventory:{pileId:number;quantity:number}[]=[];
 for(const [pileId,text]of selection.inventory){if(text.trim()==='')continue;const quantity=Number(text),p=g.items.find(p=>p.id===pileId&&p.owner.type==='inventory');if(!Number.isSafeInteger(quantity)||quantity<0||!p||quantity>p.quantity)throw Error('Une quantité ne correspond plus à son inventaire confirmé.');if(quantity)inventory.push({pileId,quantity});}
 return {type:'group-split',groupId:g.id,memberIds:people.map(p=>p.id),inventory,packedIds:[...selection.packs],animalIds:[...selection.animals]};
}
/** Keep click order. The worker alone tests real DrawPos proximity and chooses the survivor. */
export function groupMergeCommand256(s:GroupPanelSnapshot,orderedIds:readonly number[]):Extract<GroupReorganizationCommand,{type:'group-merge'}>{
 if(s.world.schemaVersion<256||orderedIds.length<2||new Set(orderedIds).size!==orderedIds.length||orderedIds.some(id=>!s.campaign?.groups.some(g=>g.id===id&&g.localMapId===null&&reorganizationAway256(g.state))))throw Error('Choisissez au moins deux caravanes réellement hors carte.');
 return {type:'group-merge',groupIds:[...orderedIds]};
}
export interface GroupReorganizationPanel256 {
 open(mode:'split'|'merge'):Promise<void>;update():void;reset():void;dispose():void;
}
export function createGroupReorganizationPanel256(host:HTMLElement,options:{
 current():GroupPanelSnapshot|undefined;pause?:()=>Promise<unknown>;blocked():string|undefined;
 send(command:GroupReorganizationCommand):Promise<boolean>;commandFailure?():string;onLock(locked:boolean):void;onPauseFailure(cause:unknown):void;
}):GroupReorganizationPanel256 {
 const controller=new AbortController(),dialog=document.createElement('dialog');dialog.className='group-reorganization';dialog.dataset.groupReorganization='';
 const title=document.createElement('h2'),note=document.createElement('p'),body=document.createElement('div'),message=document.createElement('p'),summary=document.createElement('p'),actions=document.createElement('div'),confirm=document.createElement('button'),cancel=document.createElement('button');
 title.id='group-reorganization-title';dialog.setAttribute('aria-labelledby',title.id);message.setAttribute('role','alert');actions.className='group-actions';confirm.type=cancel.type='button';confirm.textContent='Confirmer';cancel.textContent='Annuler';actions.append(confirm,cancel);dialog.append(title,note,body,summary,message,actions);host.append(dialog);
 let generation=0,opening=false,sending=false,mode:'split'|'merge'='split',sourceId:number|undefined,disposed=false,lastRefusal:string|undefined;
 const people=new Set<number>(),animals=new Set<number>(),packs=new Set<number>(),inventory=new Map<number,string>(),merge:number[]=[];
 const inputs:HTMLInputElement[]=[];
 function current(){const s=options.current();if(!s||s.group?.id!==sourceId)throw Error('La caravane confirmée a changé. Fermez puis recommencez.');return s;}
 function selection(){return {people,animals,packs,inventory};}
 function command(){const s=current();return mode==='split'?groupSplitCommand256(s,selection()):groupMergeCommand256(s,merge);}
 function paint(){
  if(!opening&&!dialog.open)return;let reason=options.blocked();
  try{if(!reason)command();}catch(cause){reason=cause instanceof Error?cause.message:String(cause);}
  confirm.disabled=opening||sending||!!reason;cancel.disabled=sending;for(const input of inputs)input.disabled=sending||!!options.blocked();
  message.textContent=reason??lastRefusal??'';
  if(mode==='split')summary.textContent=`Nouvelle caravane : ${people.size} personnes, ${animals.size} animaux, ${packs.size} couchages. Les inventaires seront répartis entre leurs porteurs. La charge ou les provisions peuvent arrêter la marche.`;
  else summary.textContent=`${merge.length} caravanes choisies. La proximité réelle et le groupe conservé seront vérifiés à la confirmation.`;
 }
 function close(){generation++;opening=false;if(dialog.open)dialog.close();options.onLock(false);}
 function heading(label:string){const h=document.createElement('h3');h.textContent=label;body.append(h);}
 function check(label:string,checked:boolean,change:(on:boolean)=>void){const row=document.createElement('label'),input=document.createElement('input'),text=document.createElement('span');row.className='group-reorganization-row';input.type='checkbox';input.checked=checked;text.textContent=label;input.addEventListener('change',()=>{lastRefusal=undefined;change(input.checked);paint();},{signal:controller.signal});row.append(input,text);body.append(row);inputs.push(input);return input;}
 function populate(s:GroupPanelSnapshot){
  body.replaceChildren();inputs.length=0;people.clear();animals.clear();packs.clear();inventory.clear();merge.length=0;
  if(mode==='merge'){
   title.textContent='Regrouper des caravanes';note.textContent='Le jeu est en pause. Sélectionnez les caravanes dans l’ordre voulu. Les membres et biens originaux seront regroupés, sans déplacement à distance. Annuler conserve la pause.';
   for(const entry of s.campaign?.groups??[])if(entry.localMapId===null&&reorganizationAway256(entry.state))check(`${travelGroupLabel256(entry.state)} · ${entry.state.members.length} personnes · ${entry.state.animalOwners?.members.length??0} animaux`,false,on=>{const at=merge.indexOf(entry.id);if(on&&at<0)merge.push(entry.id);else if(!on&&at>=0)merge.splice(at,1);}).dataset.mergeGroup=String(entry.id);
   return;
  }
  const g=s.group;if(!reorganizationAway256(g))throw Error('Cette caravane n’est plus hors carte.');
  title.textContent='Séparer la caravane';note.textContent='Le jeu est en pause. Cochez les membres et biens de la nouvelle caravane stationnée. Vêtements et équipement suivent leur personne ; la caravane d’origine conserve sa route et sa progression. Annuler conserve la pause.';
  heading('Personnes');for(const p of g.members)check(p.name,false,on=>on?people.add(p.id):people.delete(p.id)).dataset.splitMember=String(p.id);
  heading('Animaux');for(const a of g.animalOwners?.members??[])check(`${travelAnimalLabel256(a)} · ${travelAnimalNeeds256(a)}`,false,on=>on?animals.add(a.id):animals.delete(a.id)).dataset.splitAnimal=String(a.id);
  heading('Inventaires à partager');
  for(const p of g.items)if(p.owner.type==='inventory'){
   const row=document.createElement('label'),input=document.createElement('input'),text=document.createElement('span');row.className='group-reorganization-row';const unit=groupCaravanUnitMass256(p.item,freightGroup(g));text.textContent=`${ITEM_DEFINITIONS[p.item].label} · ${p.quantity} disponibles${unit===undefined?' · masse indisponible':` · ${(unit/1000).toLocaleString('fr-FR')} kg/unité`}`;input.type='number';input.min='0';input.max=String(p.quantity);input.step='1';input.value='0';input.setAttribute('aria-label',`Transférer ${ITEM_DEFINITIONS[p.item].label}`);input.dataset.splitPile=String(p.id);input.addEventListener('input',()=>{lastRefusal=undefined;inventory.set(p.id,input.value);paint();},{signal:controller.signal});row.append(input,text);body.append(row);inputs.push(input);
  }
  heading('Sacs de couchage');for(const pack of g.packed??[])check(`${travelPackLabel256(pack)} · 2,5 kg`,false,on=>on?packs.add(pack.building.id):packs.delete(pack.building.id)).dataset.splitPack=String(pack.building.id);
 }
 cancel.addEventListener('click',()=>{if(!sending)close();},{signal:controller.signal});
 dialog.addEventListener('cancel',event=>{event.preventDefault();if(!sending)close();},{signal:controller.signal});
 dialog.addEventListener('keydown',event=>event.stopPropagation(),{signal:controller.signal});
 confirm.addEventListener('click',async()=>{
  if(sending||confirm.disabled)return;let c:GroupReorganizationCommand;try{c=command();}catch(cause){message.textContent=cause instanceof Error?cause.message:String(cause);return;}
  const token=generation;sending=true;paint();const ok=await options.send(c);if(token!==generation||disposed)return;sending=false;if(ok)close();else{lastRefusal=options.commandFailure?.()??'La commande a été refusée. Le choix reste modifiable.';paint();}
 },{signal:controller.signal});
 return {
  async open(nextMode){if(disposed||opening||dialog.open||options.blocked()||!options.pause)return;const s=options.current();if(!s||s.world.schemaVersion<256||!reorganizationAway256(s.group))return;
   const token=++generation;opening=true;lastRefusal=undefined;sourceId=s.group.id;mode=nextMode;options.onLock(true);
   try{await options.pause();if(token!==generation||disposed)return;try{populate(current());opening=false;dialog.showModal();paint();}catch(cause){opening=false;options.onLock(false);options.onPauseFailure(new SimulationRequestError(cause instanceof Error?cause.message:String(cause),'refused'));}}
   catch(cause){if(token!==generation||disposed)return;opening=false;options.onLock(false);options.onPauseFailure(cause);}
  },update:paint,reset(){generation++;opening=sending=false;sourceId=undefined;if(dialog.open)dialog.close();options.onLock(false);},
  dispose(){disposed=true;generation++;controller.abort();if(dialog.open)dialog.close();dialog.remove();},
 };
}
