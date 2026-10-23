import {isSchema287OrLater} from '../sim/schema-compatibility-257.ts';
import {supportsAnimalAreas287,currentAnimalAreaChoice287} from '../sim/animal-area-policy-287';
import {sameAnimalAreaChoice287,type AnimalAreaChoice287,type AnimalAreaCommand287} from '../sim/animal-area-state-287';
import {actualAnimalName256} from '../sim/starting-pet-state-256';
import {animalSpecies} from '../sim/animal-species';
import {registeredMapId} from '../sim/world-map-context';
import type {World} from '../sim/types';

export interface AnimalAreaContext287 {world:World;mapId:number;epoch:number;blocked?:boolean}
export interface AnimalAreaAnchor287 {mapId:number;epoch:number;animalId:number}
export interface AnimalAreaActions287 {
 current(animalId:number):AnimalAreaContext287|undefined;
 send(command:AnimalAreaCommand287,anchor:AnimalAreaAnchor287):Promise<unknown>;
 onManage?():void;
 onPendingChange?(animalId:number,pending:boolean):void;
}
const key=(choice:AnimalAreaChoice287|null)=>choice===null?'unrestricted':choice.kind==='home'?'home':`allowed:${choice.areaId}`;
const identity=(anchor:AnimalAreaAnchor287)=>`${anchor.epoch}:${anchor.mapId}:${anchor.animalId}`;
interface Request287 {anchor:AnimalAreaAnchor287;choice:AnimalAreaChoice287|null;acknowledged:boolean;confirmed:boolean;connected:boolean}

/** A persistent DOM control over confirmed publications, never a SIM owner. */
export function createAnimalAreaControls287(animalId:number,actions:AnimalAreaActions287,options:{compact?:boolean}={}) {
 const element=document.createElement('div');element.dataset.animalAreaControls=String(animalId);
 const label=document.createElement('label');
 const title=document.createElement('span');title.textContent='Zone autorisée';if(!options.compact)label.append(title);
 const select=document.createElement('select');select.dataset.animalAreaChoice=String(animalId);label.append(select);
 const manage=document.createElement('button');manage.type='button';manage.textContent='Gérer les zones';manage.dataset.animalAreaManage=String(animalId);manage.hidden=!actions.onManage;
 const status=document.createElement('small');status.dataset.animalAreaStatus=String(animalId);status.setAttribute('role','status');
 element.append(label,manage,status);
 let disposed=false,wasConnected=false,binding='',optionsStamp='',request:Request287|undefined,feedback='',publishedPending=false;
 const publishPending=()=>{const pending=!!request;if(pending!==publishedPending){publishedPending=pending;actions.onPendingChange?.(animalId,pending);}};
 function view(){
  if(element.isConnected)wasConnected=true;
  if(disposed||wasConnected&&!element.isConnected)return;
  const context=actions.current(animalId);if(!context||!isSchema287OrLater(context.world.schemaVersion)||!Number.isSafeInteger(context.mapId)||context.mapId<0||!Number.isSafeInteger(context.epoch)||context.epoch<0)return;
  if(registeredMapId(context.world)!==context.mapId)return;
  const projected=context.world.campaignMap;if(projected?.revision===2&&projected.activeMapId!==context.mapId)return;
  const animal=context.world.wildlife?.animals.find(a=>a.id===animalId);
  if(!animal?.domestic||animal.state==='dead'||animal.health?.death||animal.shipCryptosleepHeldAt277!==undefined||!supportsAnimalAreas287(animal.species))return;
  return {context,animal,choice:currentAnimalAreaChoice287(context.world,animal)};
 }
 function render(){
  const v=view(),nextBinding=v?identity({...v.context,animalId}):'';
  if(nextBinding!==binding){binding=nextBinding;request=undefined;feedback='';optionsStamp='';}
  element.hidden=!v;
  if(v){
   if(request){
    const matches=sameAnimalAreaChoice287(v.choice,request.choice);if(matches)request.confirmed=true;
    if(request.acknowledged&&request.confirmed){request=undefined;feedback=matches?'Zone confirmée.':'Zone actualisée.';}
   }
   const areas=v.context.world.allowedAreas??[],areaId=v.choice?.kind==='allowed'?v.choice.areaId:undefined,missing=areaId!==undefined&&!areas.some(a=>a.id===areaId);
   const entries=[{value:'unrestricted',label:'Sans restriction'},{value:'home',label:'Zone de foyer'},...areas.map(a=>({value:`allowed:${a.id}`,label:a.label}))];
   if(missing)entries.push({value:key(v.choice),label:'Zone indisponible'});
   const stamp=JSON.stringify(entries);
   if(stamp!==optionsStamp){optionsStamp=stamp;select.replaceChildren(...entries.map(entry=>{const option=document.createElement('option');option.value=entry.value;option.textContent=entry.label;if(missing&&entry.value===key(v.choice))option.disabled=true;return option;}));}
   select.value=key(v.choice);
   select.setAttribute('aria-label',`Zone autorisée de ${actualAnimalName256(v.animal)??`${animalSpecies(v.animal.species).label} ${animalId}`}`);
   select.disabled=!!v.context.blocked||!!request;manage.disabled=select.disabled;
   const empty=v.choice?.kind==='home'?!(v.context.world.home?.length):areaId!==undefined?!areas.find(a=>a.id===areaId)?.cells.length:false;
   status.textContent=request?'Modification envoyée ; attente de confirmation.':feedback||
    (missing?'La zone choisie n’est plus disponible.':empty?'Zone vide : aucune restriction.':v.choice===null?'Sans restriction.':'');
   if(!options.compact&&!request&&!feedback&&!missing&&!empty&&v.choice!==null)status.textContent='Les activités visent cette zone ; les trajets peuvent passer à l’extérieur.';
  }
  element.setAttribute('aria-busy',String(!!request));publishPending();
 }
 select.onchange=()=>{
  const requested=select.value,priorBinding=binding;render();const v=view();if(!v||v.context.blocked||request||!binding||binding!==priorBinding)return;
  let choice:AnimalAreaChoice287|null;
  if(requested==='unrestricted')choice=null;
  else if(requested==='home')choice={kind:'home'};
  else{const match=/^allowed:([1-9]\d*)$/.exec(requested),areaId=Number(match?.[1]);if(!Number.isSafeInteger(areaId)||!v.context.world.allowedAreas?.some(a=>a.id===areaId)){feedback='Cette zone n’est plus disponible.';render();return;}choice={kind:'allowed',areaId};}
  if(sameAnimalAreaChoice287(v.choice,choice))return;
  const sent:Request287={anchor:{mapId:v.context.mapId,epoch:v.context.epoch,animalId},choice,acknowledged:false,confirmed:false,connected:element.isConnected};request=sent;feedback='';render();
  const active=()=>{const current=view();return !disposed&&request===sent&&(!sent.connected||element.isConnected)&&!!current&&identity({...current.context,animalId})===identity(sent.anchor);};
  try{void Promise.resolve(actions.send({type:'animal-area-assign',animalId,choice:choice===null?null:{...choice}},{...sent.anchor})).then(result=>{
   if(!active())return;
   if(result&&typeof result==='object'&&'ok'in result&&result.ok===false)throw Error('reason'in result&&typeof result.reason==='string'?result.reason:'La zone n’a pas pu être modifiée.');
   sent.acknowledged=true;render();
  }).catch(error=>{if(!active())return;request=undefined;feedback=error instanceof Error?error.message:String(error);render();});}
  catch(error){if(active()){request=undefined;feedback=error instanceof Error?error.message:String(error);render();}}
 };
 manage.onclick=()=>{render();const v=view();if(v&&!v.context.blocked&&!request)actions.onManage?.();};
 element.addEventListener('keydown',event=>{if(event.key!=='Escape')event.stopPropagation();});
 render();
 return {element,update:render,get pending(){return !!request;},dispose(){disposed=true;request=undefined;publishPending();element.remove();}};
}
