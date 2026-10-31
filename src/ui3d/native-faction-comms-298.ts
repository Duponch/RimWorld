import type {NativeControl,NativePage,NativeRow,NativeUiState} from './native-contract';
import type {Cell,Command,Pawn,World} from '../sim/types';
import {registeredMapId} from '../sim/world-map-context';
import {isColonist} from '../sim/affiliation';
import {factionCommsTask298,type FactionCommsCommand298} from '../sim/faction-comms-state-298';
import {readAiCoreInformation298} from '../sim/ai-core-information-298';
import {settledConsoleContact298} from '../sim/console-service-298';

export interface NativeFactionCommsOptions298 {
 readState:()=>NativeUiState;command:(command:Command)=>Promise<unknown>;
 pause:()=>Promise<unknown>;resume:()=>Promise<unknown>;
 show:(page:NativePage)=>void;close:()=>void;isCurrent:()=>boolean;
 focusPawn:(id:number)=>void;focusCell?:(cell:Cell)=>void;
}
interface Scope298 {epoch:number|undefined;seed:number;mapId:number}
const prefix='native-faction-comms298-';
const mapScope=(world:World)=>world.campaignMap?.revision===2?world.campaignMap.activeMapId:registeredMapId(world);
const message=(cause:unknown)=>cause instanceof Error?cause.message:String(cause);
/** Native cards only. Fixed-price consent is cheap; coverage, threat points,
 * Site generation and payment remain authoritative execution work, never paint. */
export function createNativeFactionComms298(options:NativeFactionCommsOptions298) {
 let active=false,disposed=false,pending=false,generation=0,scope:Scope298|undefined;
 let pawnId:number|undefined,factionId:number|undefined,consoleId:number|undefined;
 let error='',notice='',readyKey='',pauseAttempt='',confirmation:string|undefined;
 const ownsPage=(id:string|undefined)=>!!id?.startsWith(prefix);
 const sameScope=(state:NativeUiState)=>!!scope&&!!state.world&&state.epoch===scope.epoch&&state.world.seed===scope.seed&&mapScope(state.world)===scope.mapId;
 function worldFrom(state:NativeUiState):World {if(!sameScope(state))throw Error('La carte ou la colonie a changé. Rouvrez les communications.');return state.world!;}
 const selectedPawn=(world:World)=>world.pawns.find(pawn=>pawn.id===pawnId);
 function factions(world:World){const registry=world.worldFactions;return (registry?.factions??[]).filter(f=>f.id!==registry?.playerFactionId&&!f.hidden&&!f.lifecycle259?.temporary&&!f.lifecycle259?.defeated);}
 function resetConsent(){confirmation=undefined;notice='';readyKey='';}
 function sync(world:World):void {
  const people=world.pawns.filter(p=>isColonist(p)&&p.state!=='dead'&&!p.health?.death),peers=factions(world);
  const before=`${pawnId}:${factionId}:${consoleId}`;
  if(!people.some(p=>p.id===pawnId))pawnId=people.find(p=>!!factionCommsTask298(p))?.id??people[0]?.id;
  const task=selectedPawn(world)&&factionCommsTask298(selectedPawn(world)!);
  if(task){factionId=task.factionId;consoleId=task.consoleId;}
  else {if(!peers.some(f=>f.id===factionId))factionId=peers[0]?.id;if(!world.structures.some(s=>s.id===consoleId&&s.kind==='comms-console'))consoleId=world.structures.find(s=>s.kind==='comms-console')?.id;}
  if(before!==`${pawnId}:${factionId}:${consoleId}`)resetConsent();
 }
 function contact(world:World,pawn:Pawn|undefined):boolean {const task=pawn&&factionCommsTask298(pawn);return !!pawn&&!!task&&task.mapId===mapScope(world)&&task.factionId===factionId&&task.consoleId===consoleId&&settledConsoleContact298(world,pawn,task);}
 function taskKey(world:World):string {const p=selectedPawn(world),task=p&&factionCommsTask298(p);return p&&task?`${p.id}:${task.mapId}:${task.startedAtCore}:${task.factionId}:${task.consoleId}`:'';}
 async function send(command:FactionCommsCommand298):Promise<void>{const result=await options.command(command);if(result&&typeof result==='object'&&'ok'in result&&result.ok===false)throw Error('reason'in result?String(result.reason):'La communication a été refusée.');}
 async function run(action:(world:World,state:NativeUiState)=>unknown|Promise<unknown>,token=generation,providedState?:NativeUiState):Promise<boolean>{
  const state=providedState??options.readState();
  if(disposed||!active||pending||token!==generation||!options.isCurrent()||state.busy||state.fault)return false;
  let world:World;try{world=worldFrom(state);}catch(cause){error=message(cause);paint();return false;}
  pending=true;error='';paint();let success=false;
  try{await action(world,state);success=true;}catch(cause){if(token===generation)error=message(cause);}
  finally{if(token===generation){pending=false;if(active&&options.isCurrent()){paint();pauseAtContact();}}}
  return success;
 }
 function button(id:string,label:string,action:(world:World,state:NativeUiState)=>unknown|Promise<unknown>,blocked:boolean,disabled=false,hint?:string):NativeControl {
  const token=generation;return {id:prefix+id,label,hint,disabled:blocked||disabled,onActivate:()=>run(action,token)};
 }
 function choose(id:string,label:string,value:number|undefined,entries:{id:number;label:string}[],set:(id:number)=>void,blocked:boolean):NativeRow {
  const token=generation;return {id:prefix+id,label,controls:[{id:prefix+id+'-choice',label:entries.find(e=>e.id===value)?.label??'Aucun choix disponible',disabled:blocked||!entries.length,
   select:{value:String(value??''),options:entries.map(e=>({value:String(e.id),label:e.label})),onChange:value=>run(()=>{const id=Number(value);if(!entries.some(e=>e.id===id))throw Error('Ce choix n’est plus disponible.');set(id);resetConsent();},token)},onActivate:()=>{}}]};
 }
 async function approach(world:World):Promise<void>{const token=generation;
  const pawn=selectedPawn(world),console=world.structures.find(s=>s.id===consoleId&&s.kind==='comms-console');
  if(!pawn||factionId===undefined||!console)throw Error('Choisissez un négociateur, une faction et une console.');
  if(factionCommsTask298(pawn))throw Error('Une communication est déjà engagée.');
  options.focusCell?.(console);await send({type:'order-faction-comms',pawnId:pawn.id,factionId,consoleId:console.id});
  // Resume is the existing Main guard, so a newer explicit pause/load/fault wins.
  if(token===generation&&active&&options.isCurrent())await options.resume();
 }
 async function cancel(world:World):Promise<void>{const token=generation,p=selectedPawn(world);if(p&&factionCommsTask298(p))await send({type:'cancel-faction-comms',pawnId:p.id});if(token!==generation||!active)return;confirmation=undefined;readyKey='';}
 async function finishClose():Promise<void>{
  const token=generation,state=options.readState(),current=options.isCurrent();if(!active||pending||disposed)return;
  if(current&&sameScope(state)&&!state.fault&&!state.busy){const ok=await run(cancel,token,state);if(!ok)return;}
  else if(current&&state.busy)return;
  if(token!==generation)return;active=false;generation++;confirmation=undefined;pauseAttempt='';
  // Closing never changes speed. It cannot revive a stale menu/HUD lock.
  if(current&&options.isCurrent())options.close();
 }
 function confirm(world:World):void {const p=selectedPawn(world);if(!p||factionId===undefined||consoleId===undefined||!contact(world,p))throw Error('Le négociateur doit d’abord rejoindre la console.');const offer=readAiCoreInformation298(world,p.id,factionId,consoleId);if(!offer.quote)throw Error(offer.reason??'Le contact doit être vérifié de nouveau.');confirmation=offer.quote;}
 async function execute(world:World):Promise<void>{const token=generation,p=selectedPawn(world),consent=confirmation;if(!p||!consent||factionId===undefined||consoleId===undefined)throw Error('Confirmez de nouveau le coût de l’information.');const current=readAiCoreInformation298(world,p.id,factionId,consoleId);if(current.quote!==consent)throw Error(current.reason??'Le contact a changé. Vérifiez de nouveau votre demande.');await send({type:'request-ai-core-information',pawnId:p.id,factionId,consoleId,quote:consent});if(token!==generation||!active||!options.isCurrent())return;confirmation=undefined;notice='Information payée. La cache est indiquée dans Quêtes et Monde : il faut encore l’atteindre puis rapporter le cœur physique.';}
 function paint():void{
  if(!active||disposed||!options.isCurrent())return;const state=options.readState();if(!sameScope(state)){active=false;pending=false;generation++;confirmation=undefined;readyKey=pauseAttempt='';options.close();return;}
  const world=worldFrom(state);sync(world);const p=selectedPawn(world),task=p&&factionCommsTask298(p),at=contact(world,p),blocked=pending||state.busy||!!state.fault;
  const registry=world.worldFactions,peer=factions(world).find(f=>f.id===factionId),goodwill=peer&&registry?.relations.find(r=>r.aId===Math.min(peer.id,registry.playerFactionId)&&r.bId===Math.max(peer.id,registry.playerFactionId))?.goodwill;
  const rows:NativeRow[]=[];if(error||state.fault)rows.push({id:prefix+'error',label:'Communication interrompue',value:error||state.fault});
  if(notice)rows.push({id:prefix+'success',label:'Cache signalée',detail:notice,presentation:'record'});
  if(confirmation){
   const live=p&&factionId!==undefined&&consoleId!==undefined?readAiCoreInformation298(world,p.id,factionId,consoleId):undefined,stale=live?.quote!==confirmation;
   rows.push({id:prefix+'payment',label:'Information sur un cœur d’IA',value:'1 500 argent',detail:'Le paiement révèle une cache à visiter. Il ne livre aucun objet. Seul l’argent libre au sol couvert par des balises alimentées est utilisable.'});
   if(stale)rows.push({id:prefix+'stale',label:'Le contact a changé.',detail:live?.reason??'Revenez à la communication et vérifiez les nouvelles valeurs.'});
   options.show({id:prefix+'confirm',title:'Payer l’information',modal:true,closable:!pending,width:6.8,rows,actions:[button('back','Retour',()=>{confirmation=undefined;},blocked),button('pay','Payer 1 500 argent',execute,blocked,stale)],onClose:()=>{if(!pending){confirmation=undefined;paint();}}});return;
  }
  rows.push(choose('negotiator','Négociateur',pawnId,world.pawns.filter(p=>isColonist(p)&&p.state!=='dead'&&!p.health?.death).map(p=>({id:p.id,label:p.name})),id=>{pawnId=id;},blocked||!!task));
  rows.push(choose('faction','Faction',factionId,factions(world).map(f=>({id:f.id,label:f.name})),id=>{factionId=id;},blocked||!!task));
  rows.push(choose('console','Console',consoleId,world.structures.filter(s=>s.kind==='comms-console').map(s=>({id:s.id,label:`Console ${s.id} · ${s.x}, ${s.z}`})),id=>{consoleId=id;},blocked||!!task));
  rows.push({id:prefix+'relationship',label:'Relations',value:goodwill===undefined?'Inconnues':String(goodwill),detail:'Une recherche spatiale terminée et des relations d’au moins 40 permettent de demander l’information.'});
  rows.push({id:prefix+'contact',label:'Contact réel',value:at?'Au contact de la console':task?'Le négociateur rejoint la console':'Aucun appel engagé',detail:'Rejoindre reprend le temps si nécessaire. La partie se met en pause une seule fois au contact.',controls:[
   button('approach','Rejoindre la console',approach,blocked,!!task||!p||!peer||consoleId===undefined),
   ...task?[button('cancel','Annuler l’appel',cancel,blocked)]:[],...p?[button('focus','Repérer',()=>options.focusPawn(p.id),blocked)]:[],
  ]});
  const offer=at&&p&&factionId!==undefined&&consoleId!==undefined?readAiCoreInformation298(world,p.id,factionId,consoleId):undefined;
  rows.push({id:prefix+'information',label:'Emplacement d’un cœur d’IA',value:'1 500 argent',detail:'La demande vérifie le contact, les relations, la recherche et l’argent libre couvert. Un refus conserve votre argent. La cache garde son délai et ses dangers réels.',controls:[button('request','Demander l’information…',confirm,blocked,!at||!offer?.quote||goodwill===undefined||goodwill<40||world.research?.shipBasics?.completedAt===undefined,offer?.reason)]});
  options.show({id:prefix+'contact-page',title:'Communications de faction',modal:false,closable:!pending,width:6.8,rows,actions:[{id:prefix+'close',label:'Fermer',disabled:pending||state.busy,onActivate:finishClose}],onClose:()=>{void finishClose();}});
 }
 function pauseAtContact():void{
  if(!active||disposed||pending||!options.isCurrent())return;const state=options.readState();if(state.busy||state.fault||!sameScope(state))return;
  const world=worldFrom(state),key=taskKey(world);if(!key||!contact(world,selectedPawn(world))||key===readyKey||key===pauseAttempt)return;
  pauseAttempt=key;const token=generation;void run(()=>options.pause(),token,state).then(ok=>{if(token!==generation)return;if(ok)readyKey=key;pauseAttempt='';});
 }
 async function open(preferredConsole?:number):Promise<void>{
  if(disposed||pending)return;if(active&&options.isCurrent()){await finishClose();if(active)return;}
  const state=options.readState(),world=state.world;if(!world)throw Error('Affichez une carte foyer pour communiquer.');if(state.busy||state.fault)throw Error(state.fault??'Une opération est en cours.');
  const mapId=mapScope(world);if(mapId===undefined||mapId===null)throw Error('Aucune carte réelle à utiliser.');
  active=true;generation++;scope={epoch:state.epoch,seed:world.seed,mapId};pawnId=state.selectedPawnIds.find(id=>world.pawns.some(p=>p.id===id&&isColonist(p)));factionId=undefined;consoleId=preferredConsole;error=notice=readyKey=pauseAttempt='';confirmation=undefined;sync(world);
  options.show({id:prefix+'contact-page',title:'Communications de faction',modal:false,rows:[]});paint();pauseAtContact();
 }
 return {open,ownsPage,update(){if(!active||disposed||!options.isCurrent())return;paint();pauseAtContact();},dispose(){disposed=true;active=false;pending=false;generation++;confirmation=undefined;pauseAttempt='';}};
}
