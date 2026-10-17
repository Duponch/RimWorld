import {groupCaravanUnitMass256} from '../sim/group-caravan-mass-256';
import {BEDROLL_MASS_GRAMS_256} from '../sim/group-bedroll-capture-256';
import {groupFreightUnitMass258,groupPackedMassGrams258} from '../sim/group-freight-contract-258';
import {QUALITY_LABELS} from '../sim/equipment-rules';
import {buildingLabels} from './building-labels';
import {travelAnimalLabel256,travelAnimalNeeds256,travelActorLabel256,travelAnimals256,travelPacks256,travelRidingFactor256,travelCapacity256,travelGroupLabel256,type GroupAnimalChoice256,type GroupBedrollChoice256} from './group-travel-readers-256';
import type {WildAnimal} from '../sim/wildlife-state';
import type {PackedFurniture} from '../sim/furniture-rules';
import {createGroupReorganizationPanel256} from './group-reorganization-panel-256';
/** Group travel DOM: all state and eligibility come from confirmed authority projections.
 * All eligibility, route, capacity and price decisions belong to injected
 * projections of the same confirmed snapshot as the authority. */
import type {WorldMapCommand,CampaignMapPresentation,CampaignSummary,CampaignAnimalLoss256,MapAction} from '../sim/world-map-state.ts';
import {mapDisplayName,readPlanetObjects} from './map-registry-adapter';
import type {MaterialPile,Pawn,World} from '../sim/types.ts';
import {TICKS_PER_DAY} from '../sim/types.ts';
import {ITEM_DEFINITIONS} from '../sim/items.ts';
import {GROUP_FREIGHT_SCHEMA,freightGroup,groupItemMassGrams} from '../sim/group-freight.ts';
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

export interface GroupPanelSnapshot {world:World;planet?:PlanetState;group?:GroupState;losses:readonly GroupLoss[];campaign?:CampaignMapPresentation|CampaignSummary;originMapId?:number;entryActions?:Readonly<Record<'visit'|'camp'|'settle',MapAction>>}
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
  animals?:readonly GroupAnimalChoice256[];bedrolls?:readonly GroupBedrollChoice256[];
}
export interface GroupDraft {memberIds:number[];destination?:number;sources:CommercialBuyLine[];packedIds?:number[];animalIds?:number[]}
export type PlanPreview=GroupFormationPreview;
export type RoutePreview=GroupRoutePreview;
export type TradePreview=GroupTradePreview;
export interface GroupPanelAdapters {
  capture(snapshot:GroupPanelSnapshot):GroupPanelFacts;
  previewPlan(snapshot:GroupPanelSnapshot,facts:GroupPanelFacts,draft:GroupDraft):PlanPreview;
  previewRoute(snapshot:GroupPanelSnapshot,facts:GroupPanelFacts,destination:number):RoutePreview;
  quoteTrade(snapshot:GroupPanelSnapshot,facts:GroupPanelFacts,direction:'buy'|'sell',lines:CommercialBuyLine[]):TradePreview;
  /** Resolution/rejection must follow the authoritative correlated ack. */
  send(command:GroupCommand|WorldMapCommand):Promise<unknown>;
  inspectPresentPawn?(pawnId:number):void;
  /** Real speed0 request, resolves only after authoritative ACK/adoption. */
  pauseForReorganization?():Promise<unknown>;
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
const packedLabel=(p:PackedFurniture):string=>`${buildingLabels[p.building.kind]}${p.building.material?` · ${ITEM_DEFINITIONS[p.building.material].label}`:''}${p.building.quality?` · ${QUALITY_LABELS[p.building.quality]}`:''}`;
const needs=(p:Pawn)=>`${p.age?`${Math.floor(biologicalYears(p.age))} ans · `:'Âge non renseigné · '}faim ${Math.round(p.hunger)} % · repos ${Math.round(p.rest)} %`;
const groupAway=(g:GroupState|undefined):g is Extract<GroupState,{members:Pawn[]}>=>!!g&&'members' in g;
function members(s:GroupPanelSnapshot):readonly Pawn[] {
  const g=s.group;if(!g)return [];
  if(groupAway(g))return g.members;
  return g.memberIds.map(id=>{const p=s.world.pawns.find(p=>p.id===id);if(!p)throw Error(`Le membre ${id} est absent de son propriétaire de carte.`);return p;});
}
function physical(s:GroupPanelSnapshot,chosenIds:ReadonlySet<number>=new Set(),animalIds:ReadonlySet<number>=new Set()):readonly (Pawn|WildAnimal)[]{return [...(s.group?members(s):s.world.pawns.filter(p=>chosenIds.has(p.id))),...travelAnimals256(s,animalIds)];}
function goods(s:GroupPanelSnapshot,chosenIds:ReadonlySet<number>=new Set(),animalIds:ReadonlySet<number>=new Set()):readonly MaterialPile[] {
  if(groupAway(s.group))return s.group.items;
  const ids=new Set(physical(s,chosenIds,animalIds).map(p=>p.id));
  return s.world.piles.filter(p=>'pawnId' in p.owner&&ids.has(p.owner.pawnId));
}
function stopLabel(s:GroupPanelSnapshot):string {
  const g=s.group;if(!groupAway(g)||!g.stop)return '';
  const stop=g.stop;
  switch(stop.kind){
    case 'paused':return 'Marche suspendue par le joueur. Les besoins continuent.';
    case 'night':return 'Repos nocturne à la case actuelle.';
    case 'stationary':return 'Caravane à l’arrêt. Choisissez une destination pour reprendre la marche.';
    case 'at-site':return s.planet&&g.tile===s.planet.civilianTile?'Au comptoir civil. Choisissez les échanges puis une route.':'Halte à la destination choisie. Les besoins continuent ; choisissez une nouvelle route.';
    case 'awaiting-entry':return 'Entrée de la carte indisponible. Les voyageurs restent hors carte et leurs besoins continuent.';
    case 'incapacity':return `Marche arrêtée : ${stop.pawnIds.map(id=>{const p=physical(s).find(p=>p.id===id);if(!p)throw Error('Membre arrêté absent.');return travelActorLabel256(p);}).join(', ')} ne peuvent pas poursuivre.`;
    case 'overload':return `Charge ${kg(stop.grams)} supérieure à la capacité ${kg(stop.capacityGrams)}.`;
    case 'unreachable':return `Destination inaccessible : ${s.planet?planetTileLabel(s.planet,stop.destination):'géographie absente'}.`;
  }
}
function phaseLabel(s:GroupPanelSnapshot):string {
  const g=s.group;if(!g)return 'Aucun groupe engagé. Choisissez les adultes, les sources au sol et la destination.';
  switch(g.phase){
    case 'gathering':return `Rassemblement à ${g.rendezvous.x}, ${g.rendezvous.z}. Les personnes sont encore sur leur carte de départ.`;
    case 'loading':return `Chargement au contact : ${g.cursor}/${g.manifest.length} prises terminées. Les personnes sont encore sur leur carte de départ.`;
    case 'leaving':return 'Sortie physique du groupe avec les biens réellement pris.';
    case 'travelling':return `Groupe à ${s.planet?planetTileLabel(s.planet,g.tile):'géographie absente'}.${g.segment?` Segment engagé : ${hours(g.segment.remainingCore)} restantes.`:''}`;
    case 'stationary':return 'Caravane à l’arrêt sur sa case actuelle ; ses besoins continuent.';
    case 'at-site':return s.planet&&g.tile===s.planet.civilianTile?'Groupe arrivé au comptoir civil. Le stock et les fonds du poste sont finis.':'Groupe arrivé à la case choisie. Une carte locale peut être ouverte pour cette expédition.';
    case 'awaiting-entry':return 'Groupe à destination, en attente de cellules d’entrée accessibles.';
    case 'unloading':return `Entrée sur la carte. ${g.pendingPileIds.length} piles et ${g.pendingPackedIds?.length??0} meubles minifiés attendent un dépôt physique.`;
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
  const stayLabel=document.createElement('label'),stay=document.createElement('input');stay.type='checkbox';stay.checked=true;stayLabel.hidden=true;stay.dataset.groupReformStationary='';stayLabel.append(stay,document.createTextNode('Sans destination : rester sur la case du camp'));actions.append(stayLabel);
  const adopt=button('Ouvrir le globe','adopt'),start=button('Former le groupe','start'),cancel=button('Annuler la formation','cancel'),pause=button('Suspendre la marche','pause'),change=button('Adopter cette route','route'),back=button('Revenir au foyer','return'),unload=button('Décharger les biens portés','unload');
  function section(label:string,parent:HTMLElement=details){const box=document.createElement('section'),title=document.createElement('h3');title.textContent=label;box.append(title);parent.append(box);return box;}
  const selectorLabel=document.createElement('label'),groupSelector=document.createElement('select');selectorLabel.textContent='Caravane ';groupSelector.setAttribute('aria-label','Choisir une caravane');selectorLabel.append(groupSelector);
  const siteActions=document.createElement('div'),elsewhere=document.createElement('p');siteActions.className='group-actions';
  const entryButtons=new Map<'visit'|'camp'|'settle',HTMLButtonElement>();
  for(const [mode,label] of [['visit','Entrer sur la carte'],['camp','Former un camp temporaire'],['settle','S’installer']] as const){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.siteAction=mode;siteActions.append(b);entryButtons.set(mode,b);}
  elsewhere.dataset.campaignElsewhere='';
  details.append(selectorLabel,origin,status,stop,mass,elsewhere,siteActions,routeText,previews,actions);
  const peopleBox=section('Personnes'),animalBox=section('Animaux domestiques'),bedrollBox=section('Meubles minifiés'),sourceBox=section('Sources au sol'),possessionsBox=section('Biens portés'),tradeBox=section('Commerce'),lossesBox=section('Décès hors carte');
  const chosen=document.createElement('p');chosen.dataset.groupChosen='';peopleBox.append(chosen);
  const removeUnavailable=document.createElement('button');removeUnavailable.type='button';removeUnavailable.textContent='Retirer les choix devenus indisponibles';removeUnavailable.dataset.groupDraftCleanup='';peopleBox.append(removeUnavailable);
  const selectionNotes=document.createElement('p');selectionNotes.className='group-refusal';sourceBox.append(selectionNotes);
  const manifest=document.createElement('section');manifest.dataset.groupManifest='';sourceBox.append(manifest);
  const lossesNote=document.createElement('p');lossesNote.textContent='Les identités et biens indiqués restent à leur case. Une dépouille récupérable et un camp ne sont pas ouverts par cette vue.';lossesBox.append(lossesNote);
  element.append(heading,intro,error,request,grid);host.append(element);
  let snapshot:GroupPanelSnapshot|undefined,facts:GroupPanelFacts|undefined,destination:number|null=null;
  let reorganizationLocked=false;
  let busy=false,unknown:string|undefined,stopped:string|undefined,hostBlocked:string|undefined,generation=0,disposed=false;
  let plan:PlanPreview|undefined,routePreview:RoutePreview|undefined,previewTick:number|undefined;
  const selectedAnimals=new Set<number>(),selectedPacks=new Set<number>();
  const selected=new Set<number>(),sources=new Map<number,string>(),buys=new Map<number,string>(),sells=new Map<number,string>(),waiting=new Map<number,string>();
  // Actual pile index is rebuilt only on confirmed snapshot adoption. Manifest
  // receipts resolve the real divided/whole pile; no metadata is invented.
  let pilesById:ReadonlyMap<number,MaterialPile>=new Map();
  function lineMass(pile:MaterialPile|undefined,quantity:number):string {
    if(!pile)return 'Masse indisponible';
    const item=pile.item;
    const version=snapshot?.world.schemaVersion??0,freight=snapshot?.group?freightGroup(snapshot.group):version>=GROUP_FREIGHT_SCHEMA;
    const unit=version>=258?groupFreightUnitMass258(pile,version):version>=256?groupCaravanUnitMass256(item,freight):groupItemMassGrams(item,freight,version);
    if(unit===undefined)return 'Masse indisponible';
    if(!Number.isSafeInteger(quantity)||quantity<0||!Number.isSafeInteger(unit*quantity))return 'Quantité à corriger';
    return kg(unit*quantity);
  }
  function packedMass(pack:PackedFurniture):string {
    const version=snapshot?.world.schemaVersion??0,mass=version>=258?groupPackedMassGrams258(pack,version):pack.building.kind==='bedroll'&&version>=256?BEDROLL_MASS_GRAMS_256:undefined;
    return mass===undefined?'Masse indisponible':kg(mass);
  }
  const buttons=new Map<GroupAction,HTMLButtonElement>([['adopt',adopt],['start',start],['cancel',cancel],['pause',pause],['route',change],['return',back],['unload',unload]]);
  const lockReason=(includeReorganization=true)=>stopped??unknown??hostBlocked??(includeReorganization&&reorganizationLocked?'Un partage de caravane est ouvert.':undefined)??(busy?'Une commande est en cours.':waiting.size?[...waiting.values()].join(' '):undefined);
  function invalidatePreview(){plan=routePreview=undefined;previewTick=undefined;}
  const globe=createPlanetView(globeHost,id=>{destination=id;stay.checked=false;invalidatePreview();renderDraft();});stay.addEventListener('change',()=>{invalidatePreview();renderDraft();},{signal:abort.signal});
  function permission(action:GroupAction):string|undefined {return lockReason()??((action==='start'||action==='unload')&&snapshot?.campaign?.activeMapId===null?'Affichez une carte locale pour préparer ce chargement.':undefined)??((action==='start'||action==='unload')&&!Number.isSafeInteger(snapshot?.originMapId)?'La carte de départ confirmée est indisponible.':undefined)??(!facts?'Les projections métier sont indisponibles.':facts.actions[action].ok?undefined:facts.actions[action].reason??'Action indisponible.');}
  function available(b:HTMLButtonElement,reason:string|undefined){b.setAttribute('aria-disabled',String(!!reason));setTooltip(b,{body:reason??'Appliquer la commande au monde confirmé.'});}
  function updateRequest(){const message=lockReason();request.hidden=!message;request.textContent=message??'';}
  async function send(action:GroupAction|null,command:GroupCommand|WorldMapCommand,fromReorganization=false):Promise<boolean>{
    if(action===null?lockReason(!fromReorganization):permission(action))return false;
    const token=generation;busy=true;updateLocks();
    try{await adapters.send(command);if(token!==generation||disposed)return false;error.hidden=true;return true;}
    catch(cause){
      if(token!==generation||disposed)return false;
      const message=cause instanceof Error?cause.message:String(cause);
      if(!(cause instanceof SimulationRequestError)||cause.outcome==='unknown')unknown=`Résultat de commande inconnu : ${message}`;
      error.hidden=false;error.textContent=cause instanceof SimulationRequestError&&cause.outcome==='refused'?`Commande refusée : ${message}`:message;return false;
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
  const peopleTable=paged<MemberChoice>(peopleBox,['Choix','Personne','Besoins / état','Charge','Portage en voyage'],x=>x.pawn.id,()=>{
    const {row,cells}=rowCells(5),check=document.createElement('input'),carry=document.createElement('input'),name=document.createElement('button');carry.type='checkbox';cells[4]!.append(carry);carry.addEventListener('change',()=>{const g=snapshot?.group;if(!groupAway(g)||lockReason()){carry.checked=current.pawn.caravanCarrySick!==false;return;}void send(null,{type:'group-carry-sick',groupId:g.id,pawnId:current.pawn.id,enabled:carry.checked});},{signal:abort.signal});check.type='checkbox';name.type='button';cells[0]!.append(check);cells[1]!.append(name);let current:MemberChoice;
    check.addEventListener('change',()=>{if(lockReason()||snapshot?.group||check.checked&&(!current.ok||!selected.has(current.pawn.id)&&selected.size>=(snapshot!.world.schemaVersion>=256?(facts?.candidates.length??0):GROUP_MAX_MEMBERS))){check.checked=selected.has(current.pawn.id);return;}if(check.checked)selected.add(current.pawn.id);else selected.delete(current.pawn.id);invalidatePreview();renderDraft();},{signal:abort.signal});
    name.addEventListener('click',()=>{if(snapshot?.world.pawns.includes(current.pawn))adapters.inspectPresentPawn?.(current.pawn.id);},{signal:abort.signal});
    return {row,paint(value:MemberChoice){current=value;const p=value.pawn,capReason=!selected.has(p.id)&&selected.size>=(snapshot!.world.schemaVersion>=256?(facts?.candidates.length??0):GROUP_MAX_MEMBERS)?snapshot!.world.schemaVersion>=256?'Toutes les personnes présentes sont déjà choisies.':`Le groupe accueille au plus ${GROUP_MAX_MEMBERS} personnes.`:undefined;row.dataset.groupMember=String(p.id);check.checked=selected.has(p.id);check.hidden=!!snapshot?.group;check.setAttribute('aria-label',`Choisir ${p.name}`);check.setAttribute('aria-disabled',String(!!lockReason()||!value.ok||!!capReason));setTooltip(check,{body:lockReason()??value.reason??capReason??'Choisir cette personne dans le groupe.'});
      carry.hidden=!groupAway(snapshot?.group)||snapshot!.world.schemaVersion<256;carry.checked=p.caravanCarrySick!==false;carry.disabled=!!lockReason()||!groupAway(snapshot?.group)||snapshot.group.travel?.revision!==1;carry.setAttribute('aria-label',`Porter ${p.name} si malade`);setTooltip(carry,{body:'Autoriser un porteur disponible à aider cette personne lorsqu’une maladie bénéficie du repos. Ce choix ne garantit pas un porteur.'});name.textContent=`${p.name}${p.prisoner?' · Prisonnier':p.state==='downed'?' · Passager à terre':''}`;name.setAttribute('aria-disabled',String(!snapshot?.world.pawns.includes(p)||!adapters.inspectPresentPawn));setTooltip(name,{body:snapshot?.world.pawns.includes(p)?'Ouvrir le dossier de cette personne présente.':'Personne hors carte : les besoins et possessions affichés proviennent de son propriétaire de voyage.'});const local=snapshot?.group&&'manifest'in snapshot.group?snapshot.group:undefined,passenger=local?.humanPreparation?.passengers.find(row=>row.pawnId===p.id),carrier=passenger?snapshot?.world.pawns.find(q=>q.id===passenger.carrierId):undefined;cells[2]!.textContent=`${needs(p)} · ${passenger?.phase==='carry'?`Porté vers la sortie${carrier?` par ${carrier.name}`:''}`:passenger?.phase==='waiting'?'À terre, arrivé à la sortie':p.state==='downed'?'À terre':p.state==='dead'?'Décédée':groupAway(snapshot?.group)?snapshot.group.stop?.kind==='night'?'Repos nocturne':'En voyage':value.reason??(local?.humanPreparation?.releaseIds.includes(p.id)?'Fin du déplacement / restitution du travail':'Disponible')}`;
      const load=facts?.mass?.byMember.find(m=>m.pawnId===p.id)??(plan?.ok?plan.mass.byMember.find(m=>m.pawnId===p.id):undefined);cells[3]!.textContent=load?`${kg(load.grams)} / ${kg(load.capacityGrams)}`:'Charge non calculée';}};
  });
  const animalTable=paged<GroupAnimalChoice256>(animalBox,['Choix','Animal / besoins','Situation','Charge','Portage si malade'],c=>c.animal.id,()=>{
    const {row,cells}=rowCells(5),check=document.createElement('input'),carry=document.createElement('input');check.type=carry.type='checkbox';cells[0]!.append(check);cells[4]!.append(carry);let current:GroupAnimalChoice256;
    check.addEventListener('change',()=>{if(lockReason()||snapshot?.group||check.checked&&!current.ok){check.checked=selectedAnimals.has(current.animal.id);return;}if(check.checked)selectedAnimals.add(current.animal.id);else selectedAnimals.delete(current.animal.id);invalidatePreview();renderDraft();},{signal:abort.signal});
    carry.addEventListener('change',()=>{const g=snapshot?.group;if(!groupAway(g)||lockReason()){carry.checked=current.animal.caravanCarrySick!==false;return;}void send(null,{type:'group-carry-sick',groupId:g.id,pawnId:current.animal.id,enabled:carry.checked});},{signal:abort.signal});
    return {row,paint(value){current=value;const a=value.animal;row.dataset.groupAnimal=String(a.id);check.checked=selectedAnimals.has(a.id);check.hidden=!!snapshot?.group;check.disabled=!!lockReason()||!value.ok;check.setAttribute('aria-label',`Choisir ${travelAnimalLabel256(a)}`);setTooltip(check,{body:lockReason()??value.reason??(facts?.reform?'Accès vérifié puis transfert direct Reform.':'Le rassemblement exige un conducteur ou un porteur accessible.')});cells[1]!.textContent=`${travelAnimalLabel256(a)} · ${travelAnimalNeeds256(a)}`;
      const g=snapshot?.group,line=g&&'manifest'in g?g.animalPreparation?.lines.find(l=>l.animalId===a.id):undefined,handler=line?snapshot!.world.pawns.find(p=>p.id===line.handlerId):undefined;
      cells[2]!.textContent=line?`${line.gathered?line.mode==='carry'?'Porté':'Conduit':'À rassembler'}${handler?` par ${handler.name}`:''}`:groupAway(g)?'Voyageur hors carte':value.reason??`Au sol : ${a.x}, ${a.z}`;
      const load=facts?.mass?.byMember.find(m=>m.pawnId===a.id)??(plan?.ok?plan.mass.byMember.find(m=>m.pawnId===a.id):undefined);cells[3]!.textContent=load?`${kg(load.grams)} / ${kg(load.capacityGrams)}`:`Capacité ${kg(travelCapacity256(a))}`;
      carry.hidden=!groupAway(g)||snapshot!.world.schemaVersion<256;carry.checked=a.caravanCarrySick!==false;carry.disabled=!!lockReason()||!groupAway(g)||g.travel?.revision!==1&&!g.animalOwners?.interval;carry.setAttribute('aria-label',`Porter ${travelAnimalLabel256(a)} si malade`);setTooltip(carry,{body:'Autoriser le portage si une maladie bénéficie du repos et qu’un porteur peut aider.'});
    }};
  });
  const bedrollTable=paged<GroupBedrollChoice256>(bedrollBox,['Choix','Meuble minifié réel','Propriétaire / chargement','Masse'],c=>c.pack.building.id,()=>{
    const {row,cells}=rowCells(4),check=document.createElement('input');check.type='checkbox';cells[0]!.append(check);let current:GroupBedrollChoice256;
    check.addEventListener('change',()=>{if(lockReason()||snapshot?.group||!facts?.reform&&current.pack.owner.type!=='ground'||check.checked&&!current.ok){check.checked=selectedPacks.has(current.pack.building.id);return;}if(check.checked)selectedPacks.add(current.pack.building.id);else selectedPacks.delete(current.pack.building.id);invalidatePreview();renderDraft();},{signal:abort.signal});
    return {row,paint(value){current=value;const p=value.pack;row.dataset.groupBedroll=String(p.building.id);row.dataset.groupPacked=String(p.building.id);check.checked=selectedPacks.has(p.building.id);check.hidden=!!snapshot?.group||!facts?.reform&&p.owner.type!=='ground';check.disabled=!!lockReason()||!value.ok;check.setAttribute('aria-label',`Charger ${packedLabel(p)}`);setTooltip(check,{body:lockReason()??value.reason??(facts?.reform?'Ce paquet original sera transféré directement après vérification.':'Ce paquet original sera ramassé au contact ; l’accès et la capacité sont vérifiés avec la formation.')});cells[1]!.textContent=packedLabel(p);cells[3]!.textContent=packedMass(p);
      const g=snapshot?.group,line=g&&'manifest'in g?g.bedrollLoading?.manifest.find(l=>l.structureId===p.building.id):undefined;
      if(p.owner.type==='ground')cells[2]!.textContent=`Au sol : ${p.owner.x}, ${p.owner.z}${line?' · prise en attente':''}${value.reason?` · ${value.reason}`:''}`;
      else{const id=p.owner.pawnId,actor=snapshot&&(facts?.reform?[...snapshot.world.pawns,...snapshot.world.wildlife?.animals??[]]:physical(snapshot,selected,selectedAnimals)).find(a=>a.id===id);if(!actor)throw Error('Le meuble minifié a perdu son propriétaire affiché.');cells[2]!.textContent=`${travelActorLabel256(actor)} · ${p.owner.type==='inventory'?'Inventaire':'Portage'}${line?.loaded?' · pris au contact':''}${line?.animalCarrierId!==undefined?line.deliveredToAnimal?' · remis au contact':line.handoffReadyCore!==undefined?' · attente de remise': ' · remise à l’animal prévue':''}`;}
    }};
  });
  function updateTravelRows(){
    if(!snapshot||!facts){animalTable.update([]);bedrollTable.update([]);return;}
    const g=snapshot.group;animalBox.hidden=bedrollBox.hidden=snapshot.world.schemaVersion<256;
    animalTable.update(g?travelAnimals256(snapshot).map(animal=>({animal,ok:true})):facts.animals??[]);
    const carried=travelPacks256(snapshot,new Set(physical(snapshot,selected,selectedAnimals).map(a=>a.id))),packs=new Map<number,GroupBedrollChoice256>();
    if(!g)for(const choice of facts.bedrolls??[])packs.set(choice.pack.building.id,choice);
    for(const pack of carried)packs.set(pack.building.id,{pack,ok:true});
    if(g&&'manifest'in g)for(const line of g.bedrollLoading?.manifest??[]){const pack=snapshot.world.packed.find(p=>p.building.id===line.structureId);if(!pack)throw Error('Un meuble minifié du chargement a disparu.');packs.set(pack.building.id,{pack,ok:true});}
    bedrollTable.update([...packs.values()]);
  }
  function quantityTable(box:HTMLElement,kind:'source'|'buy'|'sell',values:Map<number,string>){
    return paged<SourceChoice|TradeChoice>(box,['Pile réelle','Position / prix','Disponible','Quantité',...(kind==='source'?['Masse choisie']:[])],x=>x.pile.id,()=>{
      const {row,cells}=rowCells(kind==='source'?5:4),input=document.createElement('input'),remove=document.createElement('button');input.type='number';input.min='0';input.step='1';remove.type='button';remove.textContent='Retirer';remove.className='group-remove-line';cells[3]!.append(input,remove);let current:SourceChoice|TradeChoice;
      input.addEventListener('input',()=>{if(lockReason()||current.reason||kind==='source'&&snapshot?.group){input.value=values.get(current.pile.id)??'';return;}values.set(current.pile.id,input.value);if(kind==='source')invalidatePreview();renderDraft();},{signal:abort.signal});
      remove.addEventListener('click',()=>{if(lockReason()||kind==='source'&&snapshot?.group)return;values.delete(current.pile.id);input.value='';if(kind==='source')invalidatePreview();renderDraft();},{signal:abort.signal});
      return {row,paint(value){current=value;const pile=value.pile,heldId='owner'in pile&&'pawnId'in pile.owner?pile.owner.pawnId:undefined;row.dataset.groupPile=String(pile.id);cells[0]!.textContent=itemLabel(pile);
        cells[1]!.textContent='reserved' in value?('owner' in pile&&pile.owner.type==='ground'?`${pile.owner.x}, ${pile.owner.z} · ${value.reserved} réservés`:'owner'in pile&&'pawnId'in pile.owner?`Détenu par ${snapshot?.world.pawns.find(p=>p.id===heldId)?.name??'animal '+heldId} · ${value.reserved} réservés`:'Propriétaire absent'):`${value.unitPrice} argent / unité`;
        cells[2]!.textContent=String(value.available);if(kind==='source')cells[4]!.textContent=`Unité : ${lineMass('owner'in pile?pile:undefined,1)} · Choisi : ${lineMass('owner'in pile?pile:undefined,Number(values.get(pile.id)??'0'))}`;if(document.activeElement!==input)input.value=values.get(pile.id)??'';input.max=String(value.available);input.readOnly=!!lockReason()||!!value.reason||kind==='source'&&!!snapshot?.group;input.setAttribute('aria-label',`${kind==='buy'?'Acheter':kind==='sell'?'Vendre':'Charger'} ${itemLabel(pile)} ${'owner'in pile&&pile.owner.type==='ground'?`au sol en ${pile.owner.x}, ${pile.owner.z}`:''}`);setTooltip(input,{body:lockReason()??value.reason??(kind==='source'?(facts?.reform?'Transfert direct Reform après vérification d’accès et de propriétaire.':'La quantité sera prise au contact dans cette pile.'):'Le devis courant sera vérifié avant l’échange.')});remove.hidden=!values.has(pile.id);remove.setAttribute('aria-label',`Retirer la quantité choisie ${'owner'in pile&&pile.owner.type==='ground'?`au sol en ${pile.owner.x}, ${pile.owner.z}`:''}`);available(remove,lockReason()??(kind==='source'&&snapshot?.group?'Le chargement engagé est confirmé.':undefined));}};
    },20);
  }
  const sourceTable=quantityTable(sourceBox,'source',sources);
  const manifestTable=paged<{index:number;line:GroupSource}>(manifest,['Source confirmée','Porteur','Prise réelle','Masse'],m=>m.index,()=>{
    const {row,cells}=rowCells(4);return {row,paint({line:m}){
      const carrier=members(snapshot!).find(p=>p.id===m.carrierId);if(!carrier)throw Error('Porteur du manifeste absent.');
      cells[0]!.textContent=`${m.quantity} ${ITEM_DEFINITIONS[m.item].label}`;
      cells[1]!.textContent=carrier.name;cells[2]!.textContent=m.carriedPileId!==undefined?m.animalCarrierId!==undefined?m.deliveredToAnimal?'Transmis à l’animal':'Pris · remise à l’animal en attente':'Pris au contact':'Prise en attente';const pile=pilesById.get(m.carriedPileId??m.pileId)??pilesById.get(m.pileId);cells[3]!.textContent=lineMass(pile?.item===m.item?pile:undefined,m.quantity);
    }};
  },20);
  const goodsTable=paged<MaterialPile>(possessionsBox,['Bien réel','Quantité','Propriétaire','Masse'],p=>p.id,()=>{const {row,cells}=rowCells(4);return {row,paint(p){row.dataset.groupGoods=String(p.id);cells[0]!.textContent=itemLabel(p);cells[1]!.textContent=String(p.quantity);cells[3]!.textContent=lineMass(p,p.quantity);if(!('pawnId' in p.owner))throw Error('Un bien porté a perdu son propriétaire.');const ownerId=p.owner.pawnId,owner=physical(snapshot!,selected,selectedAnimals).find(m=>m.id===ownerId);if(!owner)throw Error('Propriétaire de possession absent des personnes affichées.');cells[2]!.textContent=`${travelActorLabel256(owner)} · ${p.owner.type==='inventory'?'Inventaire':p.owner.type==='equipment'?'Équipement':p.owner.type==='apparel'?'Vêtement':'Portage'}`;}};},20);
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
    try{const lines=quantityLines(direction==='buy'?buys:sells),quote=adapters.quoteTrade(snapshot,facts,direction,lines),shown=direction==='buy'?shownBuy:shownSell;if(!quote.ok)throw Error(quote.reason);if(!shown||shown!==quote.signature)throw Error('Le devis a changé. Vérifiez le panier actualisé avant de confirmer.');await send(direction,{type:direction==='buy'?'group-buy':'group-sell',groupId:snapshot.group!.id,lines:lines.map(l=>({...l})),quote:shown});}
    catch(cause){error.hidden=false;error.textContent=cause instanceof Error?cause.message:String(cause);renderDraft();}
  }
  buyButton.addEventListener('click',()=>void confirmTrade('buy'),{signal:abort.signal});sellButton.addEventListener('click',()=>void confirmTrade('sell'),{signal:abort.signal});
  const split=document.createElement('button'),merge=document.createElement('button');split.type=merge.type='button';split.textContent='Séparer la caravane';merge.textContent='Regrouper des caravanes';split.dataset.groupReorganizationAction='split';merge.dataset.groupReorganizationAction='merge';actions.append(split,merge);
  const reorganization=createGroupReorganizationPanel256(element,{
    current:()=>snapshot,pause:adapters.pauseForReorganization,blocked:()=>lockReason(false),
    send:command=>send(null,command,true),commandFailure:()=>error.textContent??'Commande refusée.',onLock:locked=>{reorganizationLocked=locked;updateLocks();},
    onPauseFailure(cause){const message=cause instanceof Error?cause.message:String(cause);if(!(cause instanceof SimulationRequestError)||cause.outcome==='unknown')unknown=`Résultat de pause inconnu : ${message}`;error.hidden=false;error.textContent=message;updateLocks();},
  });
  split.addEventListener('click',()=>{if(split.getAttribute('aria-disabled')!=='true')void reorganization.open('split');},{signal:abort.signal});
  merge.addEventListener('click',()=>{if(merge.getAttribute('aria-disabled')!=='true')void reorganization.open('merge');},{signal:abort.signal});
  const lossesTable=paged<GroupLoss>(lossesBox,['Personne','Lieu / décès confirmé','Biens retenus'],x=>x.pawn.id,()=>{const {row,cells}=rowCells(3);return {row,paint(loss){cells[0]!.textContent=loss.pawn.name;cells[1]!.textContent=`${planetTileLabel(snapshot!.planet!,loss.tile)} · J${(loss.tick/TICKS_PER_DAY).toLocaleString('fr-FR',{maximumFractionDigits:2})}`;cells[2]!.textContent=loss.items.slice(0,8).map(p=>`${p.quantity} ${itemLabel(p)}`).join(', ')+(loss.items.length>8?` · ${loss.items.length-8} autres piles retenues`:'');if(!loss.items.length)cells[2]!.textContent='Aucun bien retenu';}};},8);

  const animalLossesTable=paged<CampaignAnimalLoss256>(lossesBox,['Animal','Lieu / issue confirmée','Biens retenus'],x=>x.animal.id,()=>{const {row,cells}=rowCells(3);return {row,paint(loss){cells[0]!.textContent=travelAnimalLabel256(loss.animal);cells[1]!.textContent=`${planetTileLabel(snapshot!.planet!,loss.tile)} · ${loss.reason==='death'?'Décès confirmé':'Caravane perdue'} · J${(loss.tick/TICKS_PER_DAY).toLocaleString('fr-FR',{maximumFractionDigits:2})}`;cells[2]!.textContent=[...loss.items.slice(0,8).map(p=>`${p.quantity} ${itemLabel(p)}`),...(loss.packed??[]).slice(0,4).map(packedLabel)].join(', ')||'Aucun bien retenu';}};},8);


  function updateLocks(){
    updateRequest();
    const g=snapshot?.group,away=groupAway(g),atDestination=away&&(g.phase==='at-site'||g.phase==='awaiting-entry'||snapshot!.world.schemaVersion>=256&&g.phase==='stationary');
    groupSelector.value=snapshot?.group?String(snapshot.group.id):'';groupSelector.disabled=!!lockReason();
    split.hidden=merge.hidden=!away||snapshot!.world.schemaVersion<256;
    const splitReason=!adapters.pauseForReorganization?'La pause confirmée est indisponible.':!away||g.members.length<2?'Deux personnes au moins sont nécessaires.':undefined;
    available(split,lockReason()??splitReason);available(merge,lockReason()??(!adapters.pauseForReorganization?'La pause confirmée est indisponible.':(snapshot?.campaign?.groups.filter(x=>x.localMapId===null&&'members'in x.state).length??0)<2?'Une autre caravane hors carte est nécessaire.':undefined));
    for(const [mode,button] of entryButtons){const action=snapshot?.entryActions?.[mode];button.hidden=!atDestination;available(button,lockReason()??(!action?.ok?action?.reason??'Cette entrée n’est pas disponible.':undefined));}
    for(const [action,b] of buttons){const previewReason=action==='start'&&!plan?.ok?'Le plan doit être admissible.':action==='route'&&!routePreview?.ok?'La route doit être admissible.':action==='buy'&&!shownBuy||action==='sell'&&!shownSell?'Le panier doit disposer d’un devis courant.':undefined;available(b,permission(action)??previewReason);}
    available(removeUnavailable,lockReason()??(snapshot?.group?'Le groupe est déjà engagé.':undefined));peopleTable.refresh();animalTable.refresh();bedrollTable.refresh();sourceTable.refresh();buyTable.refresh();sellTable.refresh();
    const original=snapshot?.campaign?.maps.find(map=>map.id===snapshot?.originMapId);
    if(snapshot?.campaign&&groupAway(g))available(back,lockReason()??(!original||original.tile===null?'La carte de départ n’est plus disponible.':permission('return')));
    available(checkFormation,permission('start')??(destination===null&&!facts?.reform?'Choisissez une destination.':undefined));
    available(checkRoute,permission('route')??(destination===null?'Choisissez une destination.':undefined));
  }
  function renderDraft(){
    if(!snapshot||!facts){updateLocks();return;}
    selectionNotes.textContent='';
    try{
      if(destination===null&&snapshot.planet&&!facts.reform)destination=snapshot.planet.civilianTile;
      const projected=facts.mass??(plan?.ok?plan.mass:null);mass.textContent=projected?`Charge ${kg(projected.grams)} / ${kg(projected.capacityGrams)} · ${projected.rations} repas de survie · ${projected.pemmicanUnits} unités de pemmican · nutrition disponible ${(projected.provisionNutrition/100).toLocaleString('fr-FR',{maximumFractionDigits:2})}${facts.mass?' possédée.':' prévue au départ (estimation à vérifier au lancement).'}${facts.reform&&projected.grams>projected.capacityGrams?' · SURCHARGE : sortie autorisée, marche bloquée avant tout segment.':''}`:'Charge non calculée : vérifiez la formation choisie.';
      if(plan&&!plan.ok)selectionNotes.textContent=plan.reason;
      const stamp=previewTick!==undefined?` Estimation au J${(previewTick/TICKS_PER_DAY).toLocaleString('fr-FR',{maximumFractionDigits:2})}, revalidée à la commande.`:'';
      routeText.textContent=routePreview?.ok?`Route proposée : ${routePreview.route.length} cases · ${hours(routePreview.durationCore)}.${stamp} Le segment engagé reste conservé.`:routePreview&&!routePreview.ok?routePreview.reason:plan?.ok?`Route proposée : ${plan.route.length} cases.${stamp}`:snapshot.group?'Choisissez une destination puis calculez l’itinéraire.':'Vérifiez la formation pour examiner la route et la charge.';
      const missing=[...selected].filter(id=>!facts!.candidates.some(c=>c.pawn.id===id));const stale=[...sources.keys()].filter(id=>!facts!.sources.some(c=>c.pile.id===id));
      chosen.textContent=snapshot.group?`${members(snapshot).length} personnes engagées.`:`${selected.size}${snapshot.world.schemaVersion>=256?'':`/${GROUP_MAX_MEMBERS}`} personnes choisies.${missing.length?` ${missing.length} personne(s) ne sont plus disponibles. Le choix est conservé jusqu'à votre correction.`:''}`;
      if(stale.length)selectionNotes.textContent+=` ${stale.length} source(s) ne sont plus disponibles au sol. Le brouillon est conservé.`;
      goodsTable.update(goods(snapshot,selected,selectedAnimals));updateTravelRows();
      const animalSelection=snapshot.group?travelAnimals256(snapshot):travelAnimals256(snapshot,new Set([...selectedAnimals].filter(id=>facts!.animals?.some(c=>c.animal.id===id))));
      const humans=snapshot.group?members(snapshot).length:selected.size,ride=travelRidingFactor256(humans,animalSelection);
      mass.textContent+=` · ${animalSelection.length} animaux · monte moyenne ×${ride.toLocaleString('fr-FR',{maximumFractionDigits:2})}${snapshot.group?'':` · ${selectedPacks.size} meubles minifiés au sol choisis`}.`;
      const unavailableAnimals=[...selectedAnimals].filter(id=>!facts!.animals?.some(c=>c.animal.id===id&&c.ok)),unavailablePacks=[...selectedPacks].filter(id=>!facts!.bedrolls?.some(c=>c.pack.building.id===id&&c.ok));
      if(!snapshot.group&&(unavailableAnimals.length||unavailablePacks.length))selectionNotes.textContent+=` ${unavailableAnimals.length} choix d’animaux et ${unavailablePacks.length} meubles minifiés demandent une correction.`;
      unload.hidden=snapshot.group?snapshot.group.phase!=='unloading':!selected.size;
      globe.setOverlay({selected:destination,route:facts.confirmedRoute,previewRoute:plan?.ok?plan.route:routePreview?.ok?routePreview.route:[],...(groupAway(snapshot.group)?{groupTile:snapshot.group.tile}:{}),...readPlanetObjects(snapshot.campaign??snapshot.world)});
    }catch(cause){selectionNotes.textContent=cause instanceof Error?cause.message:String(cause);plan=undefined;routePreview=undefined;}
    updateLocks();available(start,permission('start')??(plan?.ok?undefined:selectionNotes.textContent||'Le plan doit être admissible.'));available(change,permission('route')??(routePreview?.ok?undefined:routeText.textContent));
    tradeDraft('buy');tradeDraft('sell');
  }
  removeUnavailable.addEventListener('click',()=>{
    if(lockReason()||snapshot?.group||!facts)return;
    for(const id of selected)if(!facts.candidates.some(c=>c.pawn.id===id&&c.ok))selected.delete(id);
    for(const id of sources.keys())if(!facts.sources.some(c=>c.pile.id===id&&!c.reason&&c.available>0))sources.delete(id);
    for(const id of selectedAnimals)if(!facts.animals?.some(c=>c.animal.id===id&&c.ok))selectedAnimals.delete(id);
    for(const id of selectedPacks)if(!facts.bedrolls?.some(c=>c.pack.building.id===id&&c.ok))selectedPacks.delete(id);
    invalidatePreview();renderDraft();
  },{signal:abort.signal});
  checkFormation.addEventListener('click',()=>{
    if(permission('start')||!snapshot||!facts||destination===null&&!facts.reform)return;
    try{const lines=quantityLines(sources);if(lines.length>facts.maximumSources)throw Error(`Le manifeste accepte au plus ${facts.maximumSources} sources.`);plan=adapters.previewPlan(snapshot,facts,{memberIds:[...selected],sources:lines,...!facts.reform||!stay.checked?{destination:destination??undefined}:{},...snapshot.world.schemaVersion>=256?{animalIds:[...selectedAnimals],packedIds:[...selectedPacks]}:{}});routePreview=undefined;previewTick=snapshot.world.tick;renderDraft();}
    catch(cause){invalidatePreview();error.hidden=false;error.textContent=cause instanceof Error?cause.message:String(cause);renderDraft();}
  },{signal:abort.signal});
  checkRoute.addEventListener('click',()=>{
    if(permission('route')||!snapshot||!facts||destination===null)return;
    try{routePreview=adapters.previewRoute(snapshot,facts,destination);plan=undefined;previewTick=snapshot.world.tick;renderDraft();}
    catch(cause){invalidatePreview();error.hidden=false;error.textContent=cause instanceof Error?cause.message:String(cause);renderDraft();}
  },{signal:abort.signal});
  groupSelector.addEventListener('change',()=>{if(lockReason())return;const id=groupSelector.value===''?null:Number(groupSelector.value);if(id!==null&&!Number.isSafeInteger(id))return;void send(null,{type:'group-select',groupId:id});},{signal:abort.signal});
  for(const [mode,button] of entryButtons)button.addEventListener('click',()=>{const group=snapshot?.group;if(group&&button.getAttribute('aria-disabled')!=='true')void send(null,{type:'group-enter',groupId:group.id,mode});},{signal:abort.signal});
  adopt.addEventListener('click',()=>void send('adopt',{type:'planet-adopt'}),{signal:abort.signal});
  start.addEventListener('click',()=>{if(permission('start')||!plan?.ok||!snapshot||!facts||destination===null&&!facts.reform)return;try{const lines=quantityLines(sources),draft={memberIds:[...selected],sources:lines,...!facts.reform||!stay.checked?{destination:destination??undefined}:{},...snapshot.world.schemaVersion>=256?{animalIds:[...selectedAnimals],packedIds:[...selectedPacks]}:{}};const check=adapters.previewPlan(snapshot,facts,draft);if(!check.ok)throw Error(check.reason);if(facts.reform){if(!plan.quote||check.quote!==plan.quote)throw Error('Le manifeste, les détenteurs ou l’accès ont changé. Vérifiez de nouveau la réforme.');void send('start',{type:'group-reform',originMapId:snapshot.originMapId!,...draft,quote:plan.quote});}else if(draft.destination!==undefined)void send('start',{type:'group-start',originMapId:snapshot.originMapId!,...draft,destination:draft.destination});}catch(cause){invalidatePreview();error.hidden=false;error.textContent=cause instanceof Error?cause.message:String(cause);renderDraft();}},{signal:abort.signal});
  cancel.addEventListener('click',()=>{if(snapshot?.group)void send('cancel',{type:'group-cancel',groupId:snapshot.group.id});},{signal:abort.signal});
  pause.addEventListener('click',()=>{const g=snapshot?.group;if(groupAway(g))void send('pause',{type:'group-pause',groupId:g.id,paused:!g.paused});},{signal:abort.signal});
  change.addEventListener('click',()=>{if(!snapshot||!facts||destination===null||!routePreview?.ok||permission('route'))return;try{const check=adapters.previewRoute(snapshot,facts,destination);if(!check.ok)throw Error(check.reason);void send('route',{type:'group-route',groupId:snapshot.group!.id,destination});}catch(cause){invalidatePreview();error.hidden=false;error.textContent=cause instanceof Error?cause.message:String(cause);renderDraft();}},{signal:abort.signal});
  back.addEventListener('click',()=>{const origin=snapshot?.campaign?.maps.find(map=>map.id===snapshot?.originMapId);if(snapshot?.group&&origin?.tile!==null&&origin?.tile!==undefined)void send('return',{type:'group-route',groupId:snapshot.group.id,destination:origin.tile});},{signal:abort.signal});
  unload.addEventListener('click',()=>{if(snapshot)void send('unload',{type:'group-unload',originMapId:snapshot.originMapId!,...(snapshot.group?{groupId:snapshot.group.id}:{}),memberIds:snapshot.group?members(snapshot).map(p=>p.id):[...selected],...snapshot.world.schemaVersion>=256?{animalIds:travelAnimals256(snapshot,selectedAnimals).map(a=>a.id)}:{}});},{signal:abort.signal});
  return {
    update(next){
      if(snapshot?.group?.id!==next.group?.id||snapshot?.group?.phase!==next.group?.phase)invalidatePreview();
      snapshot=next;facts=undefined;pilesById=new Map(next.world.piles.map(p=>[p.id,p]));
      try{
        const captured=adapters.capture(next);for(const key of ['adopt','start','cancel','pause','route','return','buy','sell','unload'] as const)if(!captured.actions[key])throw Error(`Projection d'action manquante : ${key}.`);
        if(!Number.isSafeInteger(captured.maximumSources)||captured.maximumSources<0)throw Error('La borne métier de manifeste est absente.');
        for(const source of captured.sources)if((!captured.reform&&source.pile.owner.type!=='ground')||pilesById.get(source.pile.id)!==source.pile)throw Error('La source proposée ne référence pas sa vraie pile au sol.');
        for(const c of captured.candidates)if(!next.world.pawns.includes(c.pawn))throw Error('Un candidat ne référence pas une vraie personne présente.');
        if(next.group&&!captured.mass)throw Error('La projection de masse du groupe est manquante.');
        for(const c of captured.animals??[])if(!next.world.wildlife?.animals.includes(c.animal))throw Error('Un animal proposé n’est pas présent sur cette carte.');
        for(const c of captured.bedrolls??[])if(!next.world.packed.includes(c.pack)||!captured.reform&&c.pack.owner.type!=='ground')throw Error('Un meuble minifié proposé doit être au sol.');
        facts=captured;globe.setPlanet(next.planet);origin.textContent=next.planet?`Origine : ${captured.originLabel} · ${planetTileLabel(next.planet,captured.originTile)}`:'La géographie persistée doit être adoptée pour préparer un voyage.';
        const elsewherePeople=next.world.campaignPeople?.filter(p=>p.status==='away')??[];
        intro.textContent='Choisissez les personnes et les biens réels. Rassemblement, chargement et sortie se déroulent sur leur carte. Les autres cartes continuent à évoluer.';
        start.textContent=captured.reform?'Reformer la caravane':'Former la caravane';stayLabel.hidden=!captured.reform;sourceBox.querySelector('h3')!.textContent=captured.reform?'Biens au sol et inventaires réels':'Sources au sol';
        if(captured.reform)intro.textContent='Réforme immédiate : les originaux choisis sont transférés ensemble, sans rassemblement ni marche au bord. L’accès au sol est vérifié. Les inventaires non retenus restent déposés dans ce Camp. Aucune provision n’est ajoutée. Sans destination, la caravane reste à l’arrêt.';
        const entries=next.campaign?.groups??[],knownPeople=[...next.world.pawns,...next.world.campaignPeople??[]],labels=new Map(entries.map(group=>[group.id,travelGroupLabel256(group.state,knownPeople)]));const selectorKey=JSON.stringify([next.campaign?.selectedGroupId,entries.map(group=>[group.id,group.phase,labels.get(group.id)]),next.campaign?.activeMapId]);
        if(groupSelector.dataset.key!==selectorKey){groupSelector.dataset.key=selectorKey;groupSelector.replaceChildren();const fresh=document.createElement('option');fresh.value='';fresh.textContent='Nouvelle caravane depuis cette carte';fresh.disabled=next.campaign?.activeMapId===null;groupSelector.append(fresh);for(const group of entries){const option=document.createElement('option');option.value=String(group.id);option.textContent=labels.get(group.id)!;groupSelector.append(option);}groupSelector.value=next.group?String(next.group.id):'';}
        const returnMap=next.campaign?.maps.find(map=>map.id===next.originMapId);back.textContent=returnMap?`Revenir : ${mapDisplayName(returnMap)}`:'Revenir à la carte de départ';
        elsewhere.textContent=elsewherePeople.length?'Sur les autres cartes, indisponibles ici : '+elsewherePeople.map(p=>p.name).join(', ')+'.':'';
        status.textContent=!next.group&&next.campaign?.activeMapId===null?'Aucune caravane engagée. Affichez une carte locale pour préparer un départ.':phaseLabel(next);stop.textContent=stopLabel(next);stop.hidden=!stop.textContent;
        adopt.hidden=!!next.planet;start.hidden=!!next.group||!next.planet||next.campaign?.activeMapId===null;cancel.hidden=!next.group;pause.hidden=!groupAway(next.group);change.hidden=!groupAway(next.group);back.hidden=!groupAway(next.group);unload.hidden=next.group?next.group.phase!=='unloading':!selected.size;
        checkFormation.hidden=!!next.group||!next.planet||next.campaign?.activeMapId===null;checkRoute.hidden=!groupAway(next.group);
        pause.textContent=groupAway(next.group)&&next.group.paused?'Reprendre la marche':'Suspendre la marche';
        peopleTable.update(next.group?members(next).map(pawn=>({pawn,ok:true})):captured.candidates);sourceBox.hidden=!!next.group&&next.group.phase==='unloading';sourceTable.update(next.group?[]:captured.sources);
        manifest.hidden=!next.group||!('manifest' in next.group);manifestTable.update(next.group&&'manifest' in next.group?next.group.manifest.map((line,index)=>({line,index})):[]);
        goodsTable.update(goods(next,selected,selectedAnimals));tradeBox.hidden=!captured.trade;
        if(captured.trade){if(next.group?.phase!=='at-site')throw Error('Un devis commercial a été exposé hors du comptoir réel.');const trade=captured.trade;tradeStatus.textContent=trade.negotiator?`Négociateur : ${trade.negotiator.name} · argent du groupe ${trade.groupSilver} · fonds du comptoir ${trade.postSilver}.`:trade.refusal??'Aucun négociateur admissible.';buyTable.update(trade.buys);sellTable.update(trade.sells);}else{buyTable.update([]);sellTable.update([]);}
        const animalLosses=next.campaign?.animalLosses??[];lossesBox.hidden=!next.losses.length&&!animalLosses.length;if((next.losses.length||animalLosses.length)&&!next.planet)throw Error('Un propriétaire terminal exige sa vraie case géographique.');lossesTable.update(next.losses);animalLossesTable.update(animalLosses);
        if(!unknown&&!stopped)error.hidden=true;renderDraft();reorganization.update();
      }catch(cause){facts=undefined;invalidatePreview();globe.setPlanet(undefined);peopleTable.update([]);animalTable.update([]);bedrollTable.update([]);sourceTable.update([]);manifestTable.update([]);goodsTable.update([]);buyTable.update([]);sellTable.update([]);lossesTable.update([]);animalLossesTable.update([]);tradeBox.hidden=lossesBox.hidden=true;tradeStatus.textContent=buyTotal.textContent=sellTotal.textContent=selectionNotes.textContent=chosen.textContent='';origin.textContent=status.textContent=mass.textContent=stop.textContent=routeText.textContent='';error.hidden=false;error.textContent=`Données de présentation indisponibles : ${cause instanceof Error?cause.message:String(cause)}`;updateLocks();}
    },
    setVisible(visible){element.hidden=!visible;globe.setVisible(visible);},
    setRequestStatus(event){if(event.state==='waiting')waiting.set(event.id,event.message??'Attente du résultat autoritatif.');else waiting.delete(event.id);updateLocks();reorganization.update();},
    setHostBlocked(reason){hostBlocked=reason;updateLocks();reorganization.update();},
    setSimulationStopped(message){stopped=message;updateLocks();reorganization.update();},
    resetForReplacement(){reorganization.reset();generation++;delete groupSelector.dataset.key;groupSelector.replaceChildren();groupSelector.value='';busy=false;unknown=stopped=undefined;waiting.clear();selected.clear();selectedAnimals.clear();selectedPacks.clear();sources.clear();buys.clear();sells.clear();destination=null;stay.checked=true;shownBuy=shownSell=undefined;snapshot=facts=undefined;pilesById=new Map();invalidatePreview();peopleTable.update([]);animalTable.update([]);bedrollTable.update([]);sourceTable.update([]);manifestTable.update([]);goodsTable.update([]);buyTable.update([]);sellTable.update([]);lossesTable.update([]);animalLossesTable.update([]);globe.setPlanet(undefined);origin.textContent=status.textContent=mass.textContent=stop.textContent=routeText.textContent='';error.hidden=true;updateLocks();},
    dispose(){disposed=true;generation++;abort.abort();reorganization.dispose();globe.dispose();element.remove();},
  };
}
