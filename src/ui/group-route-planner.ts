import type {GroupMassView} from '../sim/group-panel-state';
import type {GroupItineraryResult} from '../sim/group-travel-estimate';

export function appendGroupWaypoint(points:readonly number[],tile:number):number[]{
 if(!Number.isSafeInteger(tile)||tile<0)throw Error('Case de planification invalide.');
 if(points.length>=25)throw Error('Le plan accepte25points, origine comprise.');
 if(points.at(-1)===tile)throw Error('Cette case est déjà la dernière étape.');
 return [...points,tile];
}
export function removeGroupWaypoint(points:readonly number[],index:number,originFixed=true):number[]{
 if(!Number.isSafeInteger(index)||index<(originFixed?1:0)||index>=points.length)throw Error('L’origine du plan reste fixe.');
 return points.filter((_,i)=>i!==index).filter((tile,i,a)=>i===0||tile!==a[i-1]);
}
export type GroupPlannerContext={tick:number;key:string}&(
 |{mode?:'group';origin:number;mass:GroupMassView}
 |{mode:'generic';origin?:never;mass?:never});
export interface GroupRoutePlanner {readonly active:boolean;choose(tile:number):boolean;update():void;close():void;reset():void;dispose():void}
/** Small temporary panel, driven by explicit user gestures and a confirmed
 * pause. It never submits a group command or retains a plan after closing. */
export function createGroupRoutePlanner(host:HTMLElement,options:{
 current():GroupPlannerContext|undefined;pause?:()=>Promise<unknown>;blocked():string|undefined;
 query(points:readonly number[],mass:GroupMassView):GroupItineraryResult;
 queryGeneric?(points:readonly number[]):GroupItineraryResult;
 label(tile:number):string;accept(destination:number):void;overlay(route:readonly number[]):void;lock(active:boolean):void;
}):GroupRoutePlanner {
 const abort=new AbortController(),open=document.createElement('button'),box=document.createElement('section'),title=document.createElement('h3'),intro=document.createElement('p'),status=document.createElement('p'),list=document.createElement('ol'),accept=document.createElement('button'),cancel=document.createElement('button');
 open.type=accept.type=cancel.type='button';open.textContent='Planifier des étapes';open.dataset.groupPlannerOpen='';box.dataset.groupPlanner='';box.hidden=true;
 title.textContent='Planificateur de voyage';intro.textContent='Cliquez une case du globe pour ajouter une étape. Le plan sert à comparer les trajets : Accepter choisit seulement la première destination.';
 status.setAttribute('role','status');accept.textContent='Accepter la première destination';accept.dataset.groupPlannerAccept='';cancel.textContent='Annuler le plan';cancel.dataset.groupPlannerCancel='';box.append(title,intro,status,list,accept,cancel);host.append(open,box);
 let context:GroupPlannerContext|undefined,points:number[]=[],result:GroupItineraryResult|undefined,opening=false,token=0,disposed=false;
 const close=()=>{token++;context=undefined;points=[];result=undefined;opening=false;box.hidden=true;list.replaceChildren();status.textContent='';options.overlay([]);options.lock(false);};
 const query=(changed:readonly number[]):GroupItineraryResult=>!context?{ok:false,reason:'Contexte de planification absent.'}:context.mode==='generic'
  ?options.queryGeneric?.(changed)??{ok:false,reason:'Estimation générique indisponible.'}:options.query(changed,context.mass);
 function render(){
  const generic=context?.mode==='generic';
  title.textContent=generic?'Estimation sans caravane':'Planificateur de voyage';
  intro.textContent=generic?'Estimation sans caravane, fondée sur une vitesse moyenne. Choisissez l’origine puis les étapes sur le globe. Le terrain, les routes et le repos nocturne sont pris en compte. L’autonomie alimentaire exige une vraie sélection de voyageurs et de provisions.':'Cliquez une case du globe pour ajouter une étape. Le plan sert à comparer les trajets : Accepter choisit seulement la première destination.';
  accept.hidden=generic;cancel.textContent=generic?'Fermer l’estimation':'Annuler le plan';
  list.replaceChildren();
  for(const [index,tile]of points.entries()){
   const row=document.createElement('li'),label=document.createElement('span');label.textContent=`${index+1}. ${options.label(tile)}${result?.ok?` · ${(result.waypointCore[index]!/60000).toLocaleString('fr-FR',{maximumFractionDigits:2})} j`:''}`;row.append(label);
   if(index>0||generic){const remove=document.createElement('button');remove.type='button';remove.textContent='Retirer';remove.dataset.groupPlannerRemove=String(index);remove.addEventListener('click',()=>{if(!context||options.blocked())return;const changed=removeGroupWaypoint(points,index,context.mode!=='generic'),next=query(changed);if(!next.ok){status.textContent=next.reason;return;}points=changed;result=next;render();},{signal:abort.signal});row.append(remove);}
   list.append(row);
  }
  status.textContent=result?.ok?points.length<2?`${points.length}/25 points · choisissez ${points.length?'une destination':'une origine et une destination'}.`:`${points.length}/25 points · arrivée finale estimée ${(result.durationCore/60000).toLocaleString('fr-FR',{maximumFractionDigits:2})} j. Plan temporaire, aucune étape future enregistrée.`:result?.reason??'';
  accept.disabled=generic||!result?.ok||points.length<2;options.overlay(result?.ok?result.route:[]);
 }
 open.addEventListener('click',async()=>{
  if(disposed||opening||context||options.blocked())return;
  const current=options.current();if(!current||!options.pause){status.textContent='Vérifiez la formation ou la route et rendez la pause disponible.';box.hidden=false;return;}
  const request=++token;opening=true;options.lock(true);
  try{
   await options.pause();if(disposed||request!==token)return;
   const confirmed=options.current();if(!confirmed||confirmed.key!==current.key)throw Error('Le propriétaire a changé pendant la pause.');
   context=confirmed;points=confirmed.mode==='generic'?[]:[confirmed.origin];result=query(points);if(!result.ok)throw Error(result.reason);box.hidden=false;render();
  }catch(e){if(request===token){close();box.hidden=false;status.textContent=e instanceof Error?e.message:String(e);}}
  finally{if(request===token){opening=false;if(!context)options.lock(false);}}
 },{signal:abort.signal});
 accept.addEventListener('click',()=>{if(!context||context.mode==='generic'||options.blocked()||points.length<2||!result?.ok)return;const first=points[1]!;close();options.accept(first);},{signal:abort.signal});
 cancel.addEventListener('click',close,{signal:abort.signal});
 return {
  get active(){return !!context;},
  choose(tile){
   if(!context)return false;if(options.blocked())return true;
   try{const changed=appendGroupWaypoint(points,tile),next=query(changed);if(!next.ok)throw Error(next.reason);points=changed;result=next;render();}
   catch(e){status.textContent=e instanceof Error?e.message:String(e);}return true;
  },
  update(){if(context){const current=options.current();if(!current||current.key!==context.key||current.tick!==context.tick)close();}open.disabled=opening||!!context||!!options.blocked()||!options.current()||!options.pause;},
  close,reset:close,
  dispose(){if(disposed)return;disposed=true;close();abort.abort();open.remove();box.remove();},
 };
}
