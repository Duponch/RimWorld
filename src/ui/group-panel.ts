/** Group travel DOM: all state and eligibility come from confirmed authority projections.
 * All eligibility, route, capacity and price decisions belong to injected
 * projections of the same confirmed snapshot as the authority. */
import type {MaterialPile,Pawn,World} from '../sim/types.ts';
import {TICKS_PER_DAY} from '../sim/types.ts';
import {ITEM_DEFINITIONS} from '../sim/items.ts';
import {biologicalYears} from '../sim/human-age.ts';
import type {CommercialBuyLine} from '../sim/commercial-state.ts';
import {SimulationRequestError,type SimulationRequestStatus} from '../bridge/protocol.ts';
import {setTooltip} from '../ui/tooltip.ts';
import {GROUP_MAX_MEMBERS,type GroupCommand,type GroupLoss,type GroupState,type GroupSource} from '../sim/group-state.ts';
import type {PlanetState} from '../sim/planet-state.ts';
import type {GroupPanelAction,GroupActionPermission,GroupMemberChoice,GroupSourceChoice,GroupMassView,
  GroupTradeChoice,GroupPermissionView,GroupFormationPreview,GroupRoutePreview,GroupTradePreview} from '../sim/group-panel-state.ts';
import {createPlanetView,planetTileLabel} from './planet-view.ts';
import './group-panel.css';

export interface GroupPanelSnapshot {world:World;planet?:PlanetState;group?:GroupState;losses:readonly GroupLoss[]}
export type GroupAction=GroupPanelAction;
export type Permission=GroupActionPermission;
export type MemberChoice=GroupMemberChoice;
export type SourceChoice=GroupSourceChoice;
export type MassView=GroupMassView;
export type TradeChoice=GroupTradeChoice;
/** Capture these once per snapshot; source rows retain the real pile object,
 * actual reservation total and availability. Unknown masses are errors. */
export interface GroupPanelFacts extends GroupPermissionView {
  candidates:readonly MemberChoice[];sources:readonly SourceChoice[];
}
export interface GroupDraft {memberIds:number[];destination:number;sources:CommercialBuyLine[]}
export type PlanPreview=GroupFormationPreview;
export type RoutePreview=GroupRoutePreview;
export type TradePreview=GroupTradePreview;
export interface GroupPanelAdapters {
  capture(snapshot:GroupPanelSnapshot):GroupPanelFacts;
  previewPlan(snapshot:GroupPanelSnapshot,facts:GroupPanelFacts,draft:GroupDraft):PlanPreview;
  previewRoute(snapshot:GroupPanelSnapshot,facts:GroupPanelFacts,destination:number):RoutePreview;
  quoteTrade(snapshot:GroupPanelSnapshot,facts:GroupPanelFacts,direction:'buy'|'sell',lines:CommercialBuyLine[]):TradePreview;
  /** Resolution/rejection must follow the authoritative correlated ack. */
  send(command:GroupCommand):Promise<unknown>;
  inspectPresentPawn?(pawnId:number):void;
}
export interface GroupPanel {
  update(snapshot:GroupPanelSnapshot):void;
  setVisible(visible:boolean):void;
  setRequestStatus(status:SimulationRequestStatus):void;
  setHostBlocked(reason:string|undefined):void;
  setSimulationStopped(message:string):void;
  /** Only the accepted replacement callback may release an unknown outcome. */
  resetForReplacement():void;
  dispose():void;
}
const kg=(g:number)=>`${(g/1000).toLocaleString('fr-FR',{maximumFractionDigits:3})} kg`;
const hours=(core:number)=>`${(core/10*24/TICKS_PER_DAY).toLocaleString('fr-FR',{maximumFractionDigits:1})} h de jeu`;
const itemLabel=(p:Pick<MaterialPile,'item'>)=>ITEM_DEFINITIONS[p.item].label;
const needs=(p:Pawn)=>`${p.age?`${Math.floor(biologicalYears(p.age))} ans · `:'Âge non renseigné · '}faim ${Math.round(p.hunger)} % · repos ${Math.round(p.rest)} %`;
const groupAway=(g:GroupState|undefined):g is Extract<GroupState,{members:Pawn[]}>=>!!g&&'members' in g;
function members(s:GroupPanelSnapshot):readonly Pawn[] {
  const g=s.group;if(!g)return [];
  if(groupAway(g))return g.members;
  return g.memberIds.map(id=>{const p=s.world.pawns.find(p=>p.id===id);if(!p)throw Error(`Le membre ${id} est absent de son propriétaire de carte.`);return p;});
}
function goods(s:GroupPanelSnapshot,chosenIds:ReadonlySet<number>=new Set()):readonly MaterialPile[] {
  if(groupAway(s.group))return s.group.items;
  const ids=s.group?new Set(members(s).map(p=>p.id)):chosenIds;
  return s.world.piles.filter(p=>'pawnId' in p.owner&&ids.has(p.owner.pawnId));
}
function stopLabel(s:GroupPanelSnapshot):string {
  const g=s.group;if(!groupAway(g)||!g.stop)return '';
  const stop=g.stop;
  switch(stop.kind){
    case 'paused':return 'Marche suspendue par le joueur. Les besoins continuent.';
    case 'night':return 'Repos nocturne à la case actuelle.';
    case 'at-site':return s.planet&&g.tile===s.planet.civilianTile?'Au comptoir civil. Choisissez les échanges puis une route.':'Halte à la destination choisie. Les besoins continuent ; choisissez une nouvelle route.';
    case 'awaiting-entry':return 'Entrée du foyer indisponible. Les voyageurs restent hors carte et leurs besoins continuent.';
    case 'incapacity':return `Marche arrêtée : ${stop.pawnIds.map(id=>{const p=g.members.find(p=>p.id===id);if(!p)throw Error('Membre arrêté absent.');return p.name;}).join(', ')} ne peuvent pas poursuivre.`;
    case 'overload':return `Charge ${kg(stop.grams)} supérieure à la capacité ${kg(stop.capacityGrams)}.`;
    case 'unreachable':return `Destination inaccessible : ${s.planet?planetTileLabel(s.planet,stop.destination):'géographie absente'}.`;
  }
}
function phaseLabel(s:GroupPanelSnapshot):string {
  const g=s.group;if(!g)return 'Aucun groupe engagé. Choisissez les adultes, les sources au sol et la destination.';
  switch(g.phase){
    case 'gathering':return `Rassemblement à ${g.rendezvous.x}, ${g.rendezvous.z}. Les personnes sont encore dans la colonie.`;
    case 'loading':return `Chargement au contact : ${g.cursor}/${g.manifest.length} prises terminées. Les personnes sont encore dans la colonie.`;
    case 'leaving':return 'Sortie physique du groupe avec les biens réellement pris.';
    case 'travelling':return `Groupe à ${s.planet?planetTileLabel(s.planet,g.tile):'géographie absente'}.${g.segment?` Segment engagé : ${hours(g.segment.remainingCore)} restantes.`:''}`;
    case 'at-site':return s.planet&&g.tile===s.planet.civilianTile?'Groupe arrivé au comptoir civil. Le stock et les fonds du poste sont finis.':'Groupe arrivé à la case choisie. Aucun camp ni comptoir n’est créé à cette halte.';
    case 'awaiting-entry':return 'Groupe au foyer, en attente de cellules de rentrée accessibles.';
    case 'unloading':return `Retour accompli. ${g.pendingPileIds.length} piles attendent un dépôt physique.`;
  }
}
function quantityLines(values:ReadonlyMap<number,string>):CommercialBuyLine[] {
  const lines:CommercialBuyLine[]=[];
  for(const [pileId,text] of values){const quantity=Number(text);if(text.trim()==='')continue;if(!Number.isSafeInteger(quantity)||quantity<0)throw Error('Les quantités doivent être des entiers positifs ou nuls.');if(quantity)lines.push({pileId,quantity});}
  return lines.sort((a,b)=>a.pileId-b.pileId);
}

/** DOM work surface within Monde; opening/updating does not send commands. */
export function createGroupPanel(host:HTMLElement,adapters:GroupPanelAdapters):GroupPanel {
  const abort=new AbortController(),element=document.createElement('section');element.className='group-panel';element.dataset.groupPanel='';
  const heading=document.createElement('h2');heading.textContent='Monde · voyage de groupe';
  const intro=document.createElement('p');intro.textContent='Choisissez les personnes et les biens réels. Le rassemblement, les prises, la sortie et le retour se déroulent dans la colonie.';
  const error=document.createElement('p');error.className='group-error';error.setAttribute('role','alert');error.hidden=true;
  const request=document.createElement('p');request.className='group-request';request.setAttribute('role','status');request.hidden=true;
  const grid=document.createElement('div');grid.className='group-grid';const globeHost=document.createElement('div'),details=document.createElement('div');details.className='group-details';grid.append(globeHost,details);
  const origin=document.createElement('p'),status=document.createElement('p'),stop=document.createElement('p'),mass=document.createElement('p');
  status.className='group-phase';status.dataset.groupStatus='';stop.className='group-stop';stop.dataset.groupStop='';mass.dataset.groupMass='';
  const routeText=document.createElement('p');routeText.dataset.groupRoute='';
  const previews=document.createElement('div');previews.className='group-actions';
  const checkFormation=document.createElement('button'),checkRoute=document.createElement('button');
  checkFormation.type=checkRoute.type='button';checkFormation.textContent='Vérifier la formation';checkRoute.textContent='Calculer l’itinéraire';
  checkFormation.dataset.groupPreview='formation';checkRoute.dataset.groupPreview='route';previews.append(checkFormation,checkRoute);
  const actions=document.createElement('div');actions.className='group-actions';
  function button(label:string,action:GroupAction){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.groupAction=action;actions.append(b);return b;}
  const adopt=button('Ouvrir le globe','adopt'),start=button('Former le groupe','start'),cancel=button('Annuler la formation','cancel'),pause=button('Suspendre la marche','pause'),change=button('Adopter cette route','route'),back=button('Revenir au foyer','return'),unload=button('Décharger les biens portés','unload');
  function section(label:string,parent:HTMLElement=details){const box=document.createElement('section'),title=document.createElement('h3');title.textContent=label;box.append(title);parent.append(box);return box;}
  details.append(origin,status,stop,mass,routeText,previews,actions);
  const peopleBox=section('Personnes'),sourceBox=section('Sources au sol'),possessionsBox=section('Biens portés'),tradeBox=section('Commerce'),lossesBox=section('Décès hors carte');
  const chosen=document.createElement('p');chosen.dataset.groupChosen='';peopleBox.append(chosen);
  const removeUnavailable=document.createElement('button');removeUnavailable.type='button';removeUnavailable.textContent='Retirer les choix devenus indisponibles';removeUnavailable.dataset.groupDraftCleanup='';peopleBox.append(removeUnavailable);
  const selectionNotes=document.createElement('p');selectionNotes.className='group-refusal';sourceBox.append(selectionNotes);
  const manifest=document.createElement('section');manifest.dataset.groupManifest='';sourceBox.append(manifest);
  const lossesNote=document.createElement('p');lossesNote.textContent='Les identités et biens indiqués restent à leur case. Une dépouille récupérable et un camp ne sont pas ouverts par cette vue.';lossesBox.append(lossesNote);
  element.append(heading,intro,error,request,grid);host.append(element);
  let snapshot:GroupPanelSnapshot|undefined,facts:GroupPanelFacts|undefined,destination:number|null=null;
  let busy=false,unknown:string|undefined,stopped:string|undefined,hostBlocked:string|undefined,generation=0,disposed=false;
  let plan:PlanPreview|undefined,routePreview:RoutePreview|undefined,previewTick:number|undefined;
  const selected=new Set<number>(),sources=new Map<number,string>(),buys=new Map<number,string>(),sells=new Map<number,string>(),waiting=new Map<number,string>();
  const buttons=new Map<GroupAction,HTMLButtonElement>([['adopt',adopt],['start',start],['cancel',cancel],['pause',pause],['route',change],['return',back],['unload',unload]]);
  const lockReason=()=>stopped??unknown??hostBlocked??(busy?'Une commande est en cours.':waiting.size?[...waiting.values()].join(' '):undefined);
  function invalidatePreview(){plan=routePreview=undefined;previewTick=undefined;}
  const globe=createPlanetView(globeHost,id=>{destination=id;invalidatePreview();renderDraft();});
  function permission(action:GroupAction):string|undefined {return lockReason()??(!facts?'Les projections métier sont indisponibles.':facts.actions[action].ok?undefined:facts.actions[action].reason??'Action indisponible.');}
  function available(b:HTMLButtonElement,reason:string|undefined){b.setAttribute('aria-disabled',String(!!reason));setTooltip(b,{body:reason??'Appliquer la commande au monde confirmé.'});}
  function updateRequest(){const message=lockReason();request.hidden=!message;request.textContent=message??'';}
  async function send(action:GroupAction,command:GroupCommand){
    if(permission(action))return;
    const token=generation;busy=true;updateLocks();
    try{await adapters.send(command);if(token!==generation||disposed)return;error.hidden=true;}
    catch(cause){
      if(token!==generation||disposed)return;
      const message=cause instanceof Error?cause.message:String(cause);
      if(!(cause instanceof SimulationRequestError)||cause.outcome==='unknown')unknown=`Résultat de commande inconnu : ${message}`;
      error.hidden=false;error.textContent=cause instanceof SimulationRequestError&&cause.outcome==='refused'?`Commande refusée : ${message}`:message;
    }finally{if(token===generation&&!disposed){busy=false;renderDraft();}}
  }
  /** Stable rows on the current page; snapshot refresh never replaces a focused
   * input when its real ID remains visible. Paging is the explicit replacement. */
  function paged<T>(box:HTMLElement,headers:readonly string[],id:(value:T)=>number,create:()=>{row:HTMLTableRowElement;paint(value:T):void},pageSize=16){
    const wrap=document.createElement('div');wrap.className='group-table-wrap';const table=document.createElement('table'),thead=document.createElement('thead'),head=document.createElement('tr'),body=document.createElement('tbody');
    for(const label of headers){const th=document.createElement('th');th.scope='col';th.textContent=label;head.append(th);}thead.append(head);table.append(thead,body);wrap.append(table);
    const pages=document.createElement('div');pages.className='group-pages';const previous=document.createElement('button'),next=document.createElement('button'),count=document.createElement('span');
    previous.type=next.type='button';previous.textContent='Précédents';next.textContent='Suivants';pages.append(previous,count,next);box.append(wrap,pages);
    let data:readonly T[]=[],page=0;const rows=new Map<number,ReturnType<typeof create>>();
    function paint(){
      page=Math.min(page,Math.max(0,Math.ceil(data.length/pageSize)-1));const values=data.slice(page*pageSize,(page+1)*pageSize),ids=new Set(values.map(id));
      for(const [key,row] of rows)if(!ids.has(key)){row.row.remove();rows.delete(key);}
      values.forEach((value,index)=>{const key=id(value);let row=rows.get(key);if(!row){row=create();rows.set(key,row);}const at=body.children[index];if(at!==row.row)body.insertBefore(row.row,at??null);row.paint(value);});
      count.textContent=data.length?`${page*pageSize+1}–${Math.min(data.length,(page+1)*pageSize)} / ${data.length}`:'Aucune ligne';previous.disabled=page===0;next.disabled=(page+1)*pageSize>=data.length;pages.hidden=data.length<=pageSize;
    }
    previous.addEventListener('click',()=>{page--;paint();},{signal:abort.signal});next.addEventListener('click',()=>{page++;paint();},{signal:abort.signal});
    return {update(values:readonly T[]){data=values;paint();},refresh:paint};
  }
  function rowCells(count:number){const row=document.createElement('tr'),cells=Array.from({length:count},()=>document.createElement('td'));row.append(...cells);return {row,cells};}
  const peopleTable=paged<MemberChoice>(peopleBox,['Choix','Personne','Besoins / état','Charge'],x=>x.pawn.id,()=>{
    const {row,cells}=rowCells(4),check=document.createElement('input'),name=document.createElement('button');check.type='checkbox';name.type='button';cells[0]!.append(check);cells[1]!.append(name);let current:MemberChoice;
    check.addEventListener('change',()=>{if(lockReason()||snapshot?.group||check.checked&&(!current.ok||!selected.has(current.pawn.id)&&selected.size>=GROUP_MAX_MEMBERS)){check.checked=selected.has(current.pawn.id);return;}if(check.checked)selected.add(current.pawn.id);else selected.delete(current.pawn.id);invalidatePreview();renderDraft();},{signal:abort.signal});
    name.addEventListener('click',()=>{if(snapshot?.world.pawns.includes(current.pawn))adapters.inspectPresentPawn?.(current.pawn.id);},{signal:abort.signal});
    return {row,paint(value:MemberChoice){current=value;const p=value.pawn,capReason=!selected.has(p.id)&&selected.size>=GROUP_MAX_MEMBERS?`Le groupe accueille au plus ${GROUP_MAX_MEMBERS} personnes.`:undefined;row.dataset.groupMember=String(p.id);check.checked=selected.has(p.id);check.hidden=!!snapshot?.group;check.setAttribute('aria-label',`Choisir ${p.name}`);check.setAttribute('aria-disabled',String(!!lockReason()||!value.ok||!!capReason));setTooltip(check,{body:lockReason()??value.reason??capReason??'Choisir cette personne dans le groupe.'});
      name.textContent=p.name;name.setAttribute('aria-disabled',String(!snapshot?.world.pawns.includes(p)||!adapters.inspectPresentPawn));setTooltip(name,{body:snapshot?.world.pawns.includes(p)?'Ouvrir le dossier de cette personne présente.':'Personne hors carte : les besoins et possessions affichés proviennent de son propriétaire de voyage.'});cells[2]!.textContent=`${needs(p)} · ${p.state==='downed'?'À terre':p.state==='dead'?'Décédée':groupAway(snapshot?.group)?snapshot.group.stop?.kind==='night'?'Repos nocturne':'En voyage':value.reason??'Disponible'}`;
      const load=facts?.mass?.byMember.find(m=>m.pawnId===p.id)??(plan?.ok?plan.mass.byMember.find(m=>m.pawnId===p.id):undefined);cells[3]!.textContent=load?`${kg(load.grams)} / ${kg(load.capacityGrams)}`:'Charge non calculée';}};
  });
  function quantityTable(box:HTMLElement,kind:'source'|'buy'|'sell',values:Map<number,string>){
    return paged<SourceChoice|TradeChoice>(box,['Pile réelle','Position / prix','Disponible','Quantité'],x=>x.pile.id,()=>{
      const {row,cells}=rowCells(4),input=document.createElement('input'),remove=document.createElement('button');input.type='number';input.min='0';input.step='1';remove.type='button';remove.textContent='Retirer';remove.className='group-remove-line';cells[3]!.append(input,remove);let current:SourceChoice|TradeChoice;
      input.addEventListener('input',()=>{if(lockReason()||current.reason||kind==='source'&&snapshot?.group){input.value=values.get(current.pile.id)??'';return;}values.set(current.pile.id,input.value);if(kind==='source')invalidatePreview();renderDraft();},{signal:abort.signal});
      remove.addEventListener('click',()=>{if(lockReason()||kind==='source'&&snapshot?.group)return;values.delete(current.pile.id);input.value='';if(kind==='source')invalidatePreview();renderDraft();},{signal:abort.signal});
      return {row,paint(value){current=value;const pile=value.pile;row.dataset.groupPile=String(pile.id);cells[0]!.textContent=`${itemLabel(pile)} · #${pile.id}`;
        cells[1]!.textContent='reserved' in value?('owner' in pile&&pile.owner.type==='ground'?`${pile.owner.x}, ${pile.owner.z} · ${value.reserved} réservés`:'Propriétaire de sol absent'):`${value.unitPrice} argent / unité`;
        cells[2]!.textContent=String(value.available);if(document.activeElement!==input)input.value=values.get(pile.id)??'';input.max=String(value.available);input.readOnly=!!lockReason()||!!value.reason||kind==='source'&&!!snapshot?.group;input.setAttribute('aria-label',`${kind==='buy'?'Acheter':kind==='sell'?'Vendre':'Charger'} ${itemLabel(pile)} de la pile ${pile.id}`);setTooltip(input,{body:lockReason()??value.reason??(kind==='source'?'La quantité sera prise au contact dans cette pile.':'Le devis courant sera vérifié avant l’échange.')});remove.hidden=!values.has(pile.id);remove.setAttribute('aria-label',`Retirer la quantité choisie de la pile ${pile.id}`);available(remove,lockReason()??(kind==='source'&&snapshot?.group?'Le chargement engagé est confirmé.':undefined));}};
    },20);
  }
  const sourceTable=quantityTable(sourceBox,'source',sources);
  const manifestTable=paged<{index:number;line:GroupSource}>(manifest,['Source confirmée','Porteur','Prise réelle'],m=>m.index,()=>{
    const {row,cells}=rowCells(3);return {row,paint({line:m}){
      const carrier=members(snapshot!).find(p=>p.id===m.carrierId);if(!carrier)throw Error('Porteur du manifeste absent.');
      cells[0]!.textContent=`${m.quantity} ${ITEM_DEFINITIONS[m.item].label} · #${m.pileId}`;
      cells[1]!.textContent=carrier.name;cells[2]!.textContent=m.carriedPileId!==undefined?`Pile prise #${m.carriedPileId}`:'Prise en attente';
    }};
  },20);
  const goodsTable=paged<MaterialPile>(possessionsBox,['Bien réel','Quantité','Propriétaire'],p=>p.id,()=>{const {row,cells}=rowCells(3);return {row,paint(p){cells[0]!.textContent=`${itemLabel(p)} · #${p.id}`;cells[1]!.textContent=String(p.quantity);if(!('pawnId' in p.owner))throw Error('Un bien porté a perdu son propriétaire.');const ownerId=p.owner.pawnId,owner=(snapshot!.group?members(snapshot!):snapshot!.world.pawns.filter(m=>selected.has(m.id))).find(m=>m.id===ownerId);if(!owner)throw Error('Propriétaire de possession absent des personnes affichées.');cells[2]!.textContent=`${owner.name} · ${p.owner.type==='inventory'?'Inventaire':p.owner.type==='equipment'?'Équipement':p.owner.type==='apparel'?'Vêtement':'Portage'}`;}};},20);
  const tradeStatus=document.createElement('p');tradeBox.append(tradeStatus);const purchaseBox=section('Acheter',tradeBox),saleBox=section('Vendre',tradeBox),buyTable=quantityTable(purchaseBox,'buy',buys),sellTable=quantityTable(saleBox,'sell',sells);
  const buyTotal=document.createElement('p'),sellTotal=document.createElement('p'),buyButton=document.createElement('button'),sellButton=document.createElement('button');buyButton.type=sellButton.type='button';buyButton.textContent='Confirmer les achats';sellButton.textContent='Confirmer les ventes';buyButton.dataset.groupAction='buy';sellButton.dataset.groupAction='sell';purchaseBox.append(buyTotal,buyButton);saleBox.append(sellTotal,sellButton);buttons.set('buy',buyButton);buttons.set('sell',sellButton);
  let shownBuy:string|undefined,shownSell:string|undefined;
  function tradeDraft(direction:'buy'|'sell'){
    const button=direction==='buy'?buyButton:sellButton,total=direction==='buy'?buyTotal:sellTotal,values=direction==='buy'?buys:sells;
    try{if(!snapshot||!facts)throw Error('Projection commerciale indisponible.');const lines=quantityLines(values);if(!lines.length)throw Error('Choisissez au moins une quantité.');const quote=adapters.quoteTrade(snapshot,facts,direction,lines);if(!quote.ok)throw Error(quote.reason);total.textContent=`${direction==='buy'?'À payer':'À recevoir'} : ${quote.totalSilver} argent · charge après échange ${kg(quote.mass.grams)} / ${kg(quote.mass.capacityGrams)}.`;if(direction==='buy')shownBuy=quote.signature;else shownSell=quote.signature;available(button,permission(direction));}
    catch(cause){total.textContent=cause instanceof Error?cause.message:String(cause);if(direction==='buy')shownBuy=undefined;else shownSell=undefined;available(button,permission(direction)??total.textContent);}
  }
  async function confirmTrade(direction:'buy'|'sell'){
    if(permission(direction)||!snapshot||!facts)return;
    try{const lines=quantityLines(direction==='buy'?buys:sells),quote=adapters.quoteTrade(snapshot,facts,direction,lines),shown=direction==='buy'?shownBuy:shownSell;if(!quote.ok)throw Error(quote.reason);if(!shown||shown!==quote.signature)throw Error('Le devis a changé. Vérifiez le panier actualisé avant de confirmer.');await send(direction,{type:direction==='buy'?'group-buy':'group-sell',lines:lines.map(l=>({...l})),quote:shown});}
    catch(cause){error.hidden=false;error.textContent=cause instanceof Error?cause.message:String(cause);renderDraft();}
  }
  buyButton.addEventListener('click',()=>void confirmTrade('buy'),{signal:abort.signal});sellButton.addEventListener('click',()=>void confirmTrade('sell'),{signal:abort.signal});
  const lossesTable=paged<GroupLoss>(lossesBox,['Personne','Lieu / décès confirmé','Biens retenus'],x=>x.pawn.id,()=>{const {row,cells}=rowCells(3);return {row,paint(loss){cells[0]!.textContent=loss.pawn.name;cells[1]!.textContent=`${planetTileLabel(snapshot!.planet!,loss.tile)} · J${(loss.tick/TICKS_PER_DAY).toLocaleString('fr-FR',{maximumFractionDigits:2})}`;cells[2]!.textContent=loss.items.slice(0,8).map(p=>`${p.quantity} ${itemLabel(p)} (#${p.id})`).join(', ')+(loss.items.length>8?` · ${loss.items.length-8} autres piles retenues`:'');if(!loss.items.length)cells[2]!.textContent='Aucun bien retenu';}};},8);

  function updateLocks(){
    updateRequest();for(const [action,b] of buttons){const previewReason=action==='start'&&!plan?.ok?'Le plan doit être admissible.':action==='route'&&!routePreview?.ok?'La route doit être admissible.':action==='buy'&&!shownBuy||action==='sell'&&!shownSell?'Le panier doit disposer d’un devis courant.':undefined;available(b,permission(action)??previewReason);}
    available(removeUnavailable,lockReason()??(snapshot?.group?'Le groupe est déjà engagé.':undefined));peopleTable.refresh();sourceTable.refresh();buyTable.refresh();sellTable.refresh();
    available(checkFormation,permission('start')??(destination===null?'Choisissez une destination.':undefined));
    available(checkRoute,permission('route')??(destination===null?'Choisissez une destination.':undefined));
  }
  function renderDraft(){
    if(!snapshot||!facts){updateLocks();return;}
    selectionNotes.textContent='';
    try{
      if(destination===null&&snapshot.planet)destination=snapshot.planet.civilianTile;
      const projected=facts.mass??(plan?.ok?plan.mass:null);mass.textContent=projected?`Charge ${kg(projected.grams)} / ${kg(projected.capacityGrams)} · ${projected.rations} rations${facts.mass?' possédées.':' prévues au départ (estimation à vérifier au lancement).'}`:'Charge non calculée : vérifiez la formation choisie.';
      if(plan&&!plan.ok)selectionNotes.textContent=plan.reason;
      const stamp=previewTick!==undefined?` Estimation au J${(previewTick/TICKS_PER_DAY).toLocaleString('fr-FR',{maximumFractionDigits:2})}, revalidée à la commande.`:'';
      routeText.textContent=routePreview?.ok?`Route proposée : ${routePreview.route.length} cases · ${hours(routePreview.durationCore)}.${stamp} Le segment engagé reste conservé.`:routePreview&&!routePreview.ok?routePreview.reason:plan?.ok?`Route proposée : ${plan.route.length} cases.${stamp}`:snapshot.group?'Choisissez une destination puis calculez l’itinéraire.':'Vérifiez la formation pour examiner la route et la charge.';
      const missing=[...selected].filter(id=>!facts!.candidates.some(c=>c.pawn.id===id));const stale=[...sources.keys()].filter(id=>!facts!.sources.some(c=>c.pile.id===id));
      chosen.textContent=snapshot.group?`${members(snapshot).length} personnes engagées.`:`${selected.size}/${GROUP_MAX_MEMBERS} personnes choisies.${missing.length?` Identités devenues indisponibles : ${missing.join(', ')}. Le choix est conservé jusqu'à votre correction.`:''}`;
      if(stale.length)selectionNotes.textContent+=` Sources disparues ou hors sol : ${stale.join(', ')}. Le brouillon est conservé.`;
      goodsTable.update(goods(snapshot,selected));
      unload.hidden=!!snapshot.group||!selected.size;
      globe.setOverlay({selected:destination,route:facts.confirmedRoute,previewRoute:plan?.ok?plan.route:routePreview?.ok?routePreview.route:[],...(groupAway(snapshot.group)?{groupTile:snapshot.group.tile}:{})});
    }catch(cause){selectionNotes.textContent=cause instanceof Error?cause.message:String(cause);plan=undefined;routePreview=undefined;}
    updateLocks();available(start,permission('start')??(plan?.ok?undefined:selectionNotes.textContent||'Le plan doit être admissible.'));available(change,permission('route')??(routePreview?.ok?undefined:routeText.textContent));
    tradeDraft('buy');tradeDraft('sell');
  }
  removeUnavailable.addEventListener('click',()=>{
    if(lockReason()||snapshot?.group||!facts)return;
    for(const id of selected)if(!facts.candidates.some(c=>c.pawn.id===id&&c.ok))selected.delete(id);
    for(const id of sources.keys())if(!facts.sources.some(c=>c.pile.id===id&&!c.reason&&c.available>0))sources.delete(id);
    invalidatePreview();renderDraft();
  },{signal:abort.signal});
  checkFormation.addEventListener('click',()=>{
    if(permission('start')||!snapshot||!facts||destination===null)return;
    try{const lines=quantityLines(sources);if(lines.length>facts.maximumSources)throw Error(`Le manifeste accepte au plus ${facts.maximumSources} sources.`);plan=adapters.previewPlan(snapshot,facts,{memberIds:[...selected],sources:lines,destination});routePreview=undefined;previewTick=snapshot.world.tick;renderDraft();}
    catch(cause){invalidatePreview();error.hidden=false;error.textContent=cause instanceof Error?cause.message:String(cause);renderDraft();}
  },{signal:abort.signal});
  checkRoute.addEventListener('click',()=>{
    if(permission('route')||!snapshot||!facts||destination===null)return;
    try{routePreview=adapters.previewRoute(snapshot,facts,destination);plan=undefined;previewTick=snapshot.world.tick;renderDraft();}
    catch(cause){invalidatePreview();error.hidden=false;error.textContent=cause instanceof Error?cause.message:String(cause);renderDraft();}
  },{signal:abort.signal});
  adopt.addEventListener('click',()=>void send('adopt',{type:'planet-adopt'}),{signal:abort.signal});
  start.addEventListener('click',()=>{if(permission('start')||!plan?.ok||!snapshot||!facts||destination===null)return;try{const lines=quantityLines(sources),draft={memberIds:[...selected],destination,sources:lines};const check=adapters.previewPlan(snapshot,facts,draft);if(!check.ok)throw Error(check.reason);void send('start',{type:'group-start',...draft});}catch(cause){invalidatePreview();error.hidden=false;error.textContent=cause instanceof Error?cause.message:String(cause);renderDraft();}},{signal:abort.signal});
  cancel.addEventListener('click',()=>void send('cancel',{type:'group-cancel'}),{signal:abort.signal});
  pause.addEventListener('click',()=>{const g=snapshot?.group;if(groupAway(g))void send('pause',{type:'group-pause',paused:!g.paused});},{signal:abort.signal});
  change.addEventListener('click',()=>{if(!snapshot||!facts||destination===null||!routePreview?.ok||permission('route'))return;try{const check=adapters.previewRoute(snapshot,facts,destination);if(!check.ok)throw Error(check.reason);void send('route',{type:'group-route',destination});}catch(cause){invalidatePreview();error.hidden=false;error.textContent=cause instanceof Error?cause.message:String(cause);renderDraft();}},{signal:abort.signal});
  back.addEventListener('click',()=>{if(snapshot?.planet)void send('return',{type:'group-route',destination:snapshot.planet.homeTile});},{signal:abort.signal});
  unload.addEventListener('click',()=>{if(snapshot)void send('unload',{type:'group-unload',memberIds:snapshot.group?members(snapshot).map(p=>p.id):[...selected]});},{signal:abort.signal});
  return {
    update(next){
      if(snapshot?.group?.id!==next.group?.id||snapshot?.group?.phase!==next.group?.phase)invalidatePreview();
      snapshot=next;facts=undefined;
      try{
        const captured=adapters.capture(next);for(const key of ['adopt','start','cancel','pause','route','return','buy','sell','unload'] as const)if(!captured.actions[key])throw Error(`Projection d'action manquante : ${key}.`);
        if(!Number.isSafeInteger(captured.maximumSources)||captured.maximumSources<1)throw Error('La borne métier de manifeste est absente.');
        for(const source of captured.sources)if(source.pile.owner.type!=='ground'||!next.world.piles.includes(source.pile))throw Error('La source proposée ne référence pas sa vraie pile au sol.');
        for(const c of captured.candidates)if(!next.world.pawns.includes(c.pawn))throw Error('Un candidat ne référence pas une vraie personne présente.');
        if(next.group&&!captured.mass)throw Error('La projection de masse du groupe est manquante.');
        facts=captured;globe.setPlanet(next.planet);origin.textContent=next.planet?`Origine : ${captured.originLabel} · ${planetTileLabel(next.planet,captured.originTile)}`:'La géographie persistée doit être adoptée pour préparer un voyage.';
        status.textContent=phaseLabel(next);stop.textContent=stopLabel(next);stop.hidden=!stop.textContent;
        adopt.hidden=!!next.planet;start.hidden=!!next.group||!next.planet;cancel.hidden=!next.group;pause.hidden=!groupAway(next.group);change.hidden=!groupAway(next.group);back.hidden=!groupAway(next.group);unload.hidden=!!next.group||!selected.size;
        checkFormation.hidden=!!next.group||!next.planet;checkRoute.hidden=!groupAway(next.group);
        pause.textContent=groupAway(next.group)&&next.group.paused?'Reprendre la marche':'Suspendre la marche';
        peopleTable.update(next.group?members(next).map(pawn=>({pawn,ok:true})):captured.candidates);sourceBox.hidden=!!next.group&&next.group.phase==='unloading';sourceTable.update(next.group?[]:captured.sources);
        manifest.hidden=!next.group||!('manifest' in next.group);manifestTable.update(next.group&&'manifest' in next.group?next.group.manifest.map((line,index)=>({line,index})):[]);
        goodsTable.update(goods(next,selected));tradeBox.hidden=!captured.trade;
        if(captured.trade){if(next.group?.phase!=='at-site')throw Error('Un devis commercial a été exposé hors du comptoir réel.');const trade=captured.trade;tradeStatus.textContent=trade.negotiator?`Négociateur : ${trade.negotiator.name} · argent du groupe ${trade.groupSilver} · fonds du comptoir ${trade.postSilver}.`:trade.refusal??'Aucun négociateur admissible.';buyTable.update(trade.buys);sellTable.update(trade.sells);}else{buyTable.update([]);sellTable.update([]);}
        lossesBox.hidden=!next.losses.length;if(next.losses.length&&!next.planet)throw Error('Un propriétaire terminal exige sa vraie case géographique.');lossesTable.update(next.losses);
        if(!unknown&&!stopped)error.hidden=true;renderDraft();
      }catch(cause){facts=undefined;invalidatePreview();globe.setPlanet(undefined);peopleTable.update([]);sourceTable.update([]);manifestTable.update([]);goodsTable.update([]);buyTable.update([]);sellTable.update([]);lossesTable.update([]);tradeBox.hidden=lossesBox.hidden=true;tradeStatus.textContent=buyTotal.textContent=sellTotal.textContent=selectionNotes.textContent=chosen.textContent='';origin.textContent=status.textContent=mass.textContent=stop.textContent=routeText.textContent='';error.hidden=false;error.textContent=`Données de présentation indisponibles : ${cause instanceof Error?cause.message:String(cause)}`;updateLocks();}
    },
    setVisible(visible){element.hidden=!visible;globe.setVisible(visible);},
    setRequestStatus(event){if(event.state==='waiting')waiting.set(event.id,event.message??'Attente du résultat autoritatif.');else waiting.delete(event.id);updateLocks();},
    setHostBlocked(reason){hostBlocked=reason;updateLocks();},
    setSimulationStopped(message){stopped=message;updateLocks();},
    resetForReplacement(){generation++;busy=false;unknown=stopped=undefined;waiting.clear();selected.clear();sources.clear();buys.clear();sells.clear();destination=null;shownBuy=shownSell=undefined;snapshot=facts=undefined;invalidatePreview();peopleTable.update([]);sourceTable.update([]);manifestTable.update([]);goodsTable.update([]);buyTable.update([]);sellTable.update([]);lossesTable.update([]);globe.setPlanet(undefined);origin.textContent=status.textContent=mass.textContent=stop.textContent=routeText.textContent='';error.hidden=true;updateLocks();},
    dispose(){disposed=true;generation++;abort.abort();globe.dispose();element.remove();},
  };
}
