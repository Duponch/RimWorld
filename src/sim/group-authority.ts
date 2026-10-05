import { quoteGroupTrade,draftGroupTrade,type GroupTradeEnvironment } from './group-trade.ts';
import { bestGroupNegotiator } from './trade-negotiator.ts';
import type { Cell, CommandResult, MaterialPile, Pawn, World } from './types.ts';
import type { CommercialBuyLine } from './commercial-state.ts';
import type { GroupCommand, GroupState } from './group-state.ts';
import { GROUP_MAX_LOSSES } from './group-state.ts';
import type { GroupFormationAuthority, GroupMassCapture, AwayGroup, PreparingGroup } from './group-capture.ts';
import { captureGroupMass, groupDestinationValid } from './group-capture.ts';
import { emptyGroupLedger, previewGroupLoading, groupReservedSources } from './group-loading.ts';
import { captureHumanOwners } from './human-owners.ts';
import { isColonist } from './affiliation.ts';
import { biologicalYears } from './human-age.ts';
import { scoutActiveTask, scoutPreparationReason, scoutUnstable } from './caravan-trip.ts';
import { reservedSource } from './materials.ts';
import { candidateAccess } from './candidate-access.ts';
import { blockedCells, inBounds, workNeighbours } from './pathfinding.ts';
import { captureStandability } from './furniture-travel.ts';
import { generatePlanet, planetHomeInput } from './planet-generation.ts';
import { findPlanetRoute, PLANET_QUERY_ARCS, PLANET_QUERY_NODES, planetCostContext } from './planet-navigation.ts';
import { prepareGroupRedirection } from './group-trip.ts';
import type { GroupFormationPreview, GroupMassView, GroupMemberChoice, GroupPermissionView, GroupRoutePreview, GroupSourceChoice, GroupTradePreview, GroupPanelAction, GroupActionPermission } from './group-panel-state.ts';

const fail=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;
const queryBudget=()=>({nodes:PLANET_QUERY_NODES,arcs:PLANET_QUERY_ARCS});
const away=(g:GroupState|undefined):g is AwayGroup=>!!g&&'members' in g;
export { groupOnMapMember } from './group-state.ts';
export function groupLog(w:World,message:string):void {w.events.push({tick:w.tick,type:'command',message});if(w.events.length>80)w.events.splice(0,w.events.length-80);}

/** Initial adult/healthy admission is deliberately narrower than Core's formation UI. */
export function groupMemberReason(w:World,p:Pawn,preparing=false):string|undefined {
  if(!w.pawns.includes(p)||!isColonist(p)||p.prisoner||p.visitor)return 'Choisissez un colon libre et présent.';
  if(w.scout||w.commercialTrip)return 'Terminez le voyage individuel en cours.';
  if(p.age&&biologicalYears(p.age)<18)return 'Le groupe accepte actuellement des adultes.';
  const reason=scoutPreparationReason(w,p);if(reason)return reason;
  if(scoutActiveTask(p))return 'Le colon doit terminer son activité avant de rejoindre le groupe.';
  if(!preparing&&(p.state!=='idle'||p.path.length||p.moveCooldown>0||(p.motion?.end??0)>w.tick))return 'Le colon doit avoir terminé son déplacement.';
  if(w.piles.some(i=>i.owner.type==='pawn'&&i.owner.pawnId===p.id)||w.packed.some(i=>'pawnId' in i.owner&&i.owner.pawnId===p.id))return 'Déposez la cargaison de travail avant de partir.';
  return undefined;
}

/** A shared connectivity capture per member answers all sources and meeting/exit cells.
 * It supplies no unweighted route: the ordinary engine still pays its weighted movement. */
export function groupFormationAuthority(w:World,preparing=false):GroupFormationAuthority & {reachable(p:Pawn,c:Cell):boolean;stand(c:Cell):boolean} {
  const blocked=blockedCells(w),stand=captureStandability(w),queries=new Map<number,ReturnType<typeof candidateAccess>>();
  let connectivityQuota=8*w.width*w.height;
  const reachable=(p:Pawn,c:Cell):boolean=>{
    if(!inBounds(w,c.x,c.z))return false;
    let q=queries.get(p.id);if(!q){q=candidateAccess(w,p,blocked,new Set(),true);queries.set(p.id,q);}
    const before=q.connectivityVisited,result=q.has(c.z*w.width+c.x);connectivityQuota-=q.connectivityVisited-before;
    if(connectivityQuota<0)throw Error('Group connectivity quota exceeded');
    return result;
  };
  return {
    reachable,stand:c=>inBounds(w,c.x,c.z)&&!blocked[c.z*w.width+c.x]&&stand(c),
    namespace:world=>({byId:new Map(captureHumanOwners(world).slots.map(s=>[s.id,{pawn:s.pawn,local:s.kind==='map'}]))}),
    memberReason:(world,p)=>groupMemberReason(world,p,preparing),
    residentCapable:(_world,p)=>isColonist(p)&&!p.prisoner&&!p.visitor&&!['dead','downed'].includes(p.state)&&!p.mental?.crisis,
    sourceReason:(_world,pile)=>pile.owner.type!=='ground'||pile.foodPoison?'Choisissez une provision saine au sol.':undefined,
    reservedQuantity:(world,id,exceptGroupId)=>{
      const own=world.group&&'manifest' in world.group&&world.group.id===exceptGroupId?groupReservedSources(world.group).get(id)??0:0;
      return reservedSource(world,id)-own;
    },
    sourceAccess:(_world,p,pile)=>pile.owner.type==='ground'&&[pile.owner,...workNeighbours(pile.owner)].some(c=>reachable(p,c))?'reachable':'unreachable',
    namespaceReason:(world,{additionalPiles,members,items})=>{
      try {captureHumanOwners(world);}catch {return 'Une identité humaine possède plusieurs propriétaires.';}
      if((world.groupLosses?.length??0)+members.length>GROUP_MAX_LOSSES)return 'Les dossiers de pertes conservés ne permettent plus ce départ.';
      if(world.piles.length+additionalPiles>32768||!Number.isSafeInteger(world.nextId+additionalPiles))return 'Le nombre de biens ou d’identités disponibles est dépassé.';
      if(members.some(p=>items.filter(i=>'pawnId' in i.owner&&i.owner.pawnId===p.id).length>256))return 'Un inventaire dépasse 256 piles.';
      return undefined;
    },
  };
}

export function groupMemberChoices(w:World):readonly GroupMemberChoice[] {
  return w.pawns.filter(p=>isColonist(p)&&!p.prisoner&&!p.visitor).map(p=>{
    const reason=w.group?'Un groupe est déjà engagé.':groupMemberReason(w,p);return {pawn:p,ok:!reason,...reason?{reason}:{}};
  });
}
export function groupSourceChoices(w:World):readonly GroupSourceChoice[] {
  return w.piles.filter(p=>p.owner.type==='ground'&&['survival-meal','silver','cloth','muffalo-wool'].includes(p.item)).map(p=>{
    const reserved=reservedSource(w,p.id);return {pile:p,reserved,available:Math.max(0,p.quantity-reserved),...p.foodPoison?{reason:'Provision contaminée.'}:{}};
  });
}
function viewMass(mass:GroupMassCapture,items:readonly MaterialPile[]):GroupMassView {
  return {grams:mass.grams,capacityGrams:mass.capacityGrams,byMember:mass.carriers,rations:items.filter(p=>p.item==='survival-meal'&&p.owner.type==='inventory').reduce((n,p)=>n+p.quantity,0)};
}
function previewFormation(w:World,ids:readonly number[],sources:readonly CommercialBuyLine[],destination:number) {
  if(!w.planet||!groupDestinationValid(w.planet,destination)||destination===w.planet.homeTile)return {kind:'refused' as const,reason:'Choisissez une destination terrestre hors du foyer.'};
  if(w.group||w.scout||w.commercialTrip)return {kind:'refused' as const,reason:'Un groupe ou voyage est déjà engagé.'};
  if(!Number.isSafeInteger(w.planet.nextGroupId+1))return {kind:'refused' as const,reason:'Le registre des groupes est plein.'};
  const authority=groupFormationAuthority(w),loading=previewGroupLoading(w,ids,sources,authority);
  if(loading.kind!=='ready')return loading;
  if(loading.capture.members.some(p=>loading.capture.items.filter(i=>'pawnId' in i.owner&&i.owner.pawnId===p.id).length+loading.manifest.filter(l=>l.carrierId===p.id).length>256))return {kind:'refused' as const,reason:'Un inventaire dépasserait 256 piles.'};
  const food=loading.capture.items.filter(p=>p.owner.type==='inventory'&&p.item==='survival-meal'&&!p.foodPoison).reduce((n,p)=>n+p.quantity,0)+loading.manifest.filter(l=>l.item==='survival-meal').reduce((n,l)=>n+l.quantity,0);
  if(food<loading.capture.members.length)return {kind:'refused' as const,reason:'Chargez au moins une ration saine par membre.'};
  const route=findPlanetRoute(w.planet,w.planet.homeTile,destination,planetCostContext(w,loading.mass),queryBudget());
  if(route.kind!=='found')return {kind:'refused' as const,reason:route.kind==='deferred'?'Le calcul de route attend une nouvelle tentative.':'Cette destination est inaccessible.'};
  const rendezvous={x:loading.capture.members[0]!.x,z:loading.capture.members[0]!.z},used=new Set<number>();
  const others=new Set(w.pawns.filter(p=>!ids.includes(p.id)).map(p=>p.z*w.width+p.x));
  const spots:Cell[]=[];for(let z=rendezvous.z-2;z<=rendezvous.z+2;z++)for(let x=rendezvous.x-2;x<=rendezvous.x+2;x++)spots.push({x,z});
  spots.sort((a,b)=>((a.x-rendezvous.x)**2+(a.z-rendezvous.z)**2)-((b.x-rendezvous.x)**2+(b.z-rendezvous.z)**2)||a.z-b.z||a.x-b.x);
  const meeting:{pawnId:number;cell:Cell}[]=[];
  for(const p of loading.capture.members){const cell=spots.find(c=>authority.stand(c)&&!used.has(c.z*w.width+c.x)&&!others.has(c.z*w.width+c.x)&&authority.reachable(p,c));
    if(!cell)return {kind:'refused' as const,reason:'Le groupe ne dispose pas de places de rassemblement accessibles.'};
    used.add(cell.z*w.width+cell.x);meeting.push({pawnId:p.id,cell:{...cell}});
  }
  const exits:{pawnId:number;cell:Cell}[]=[],edgeUsed=new Set<number>(),edges:Cell[]=[];
  for(let x=0;x<w.width;x++){edges.push({x,z:0},{x,z:w.height-1});}for(let z=1;z<w.height-1;z++)edges.push({x:0,z},{x:w.width-1,z});
  for(const p of loading.capture.members){const ranked=[...edges].sort((a,b)=>((a.x-p.x)**2+(a.z-p.z)**2)-((b.x-p.x)**2+(b.z-p.z)**2)||a.z-b.z||a.x-b.x);
    const cell=ranked.find(c=>!edgeUsed.has(c.z*w.width+c.x)&&authority.stand(c)&&authority.reachable(p,c));
    if(!cell)return {kind:'refused' as const,reason:'Tous les membres doivent disposer d’une sortie accessible.'};
    edgeUsed.add(cell.z*w.width+cell.x);exits.push({pawnId:p.id,cell:{...cell}});
  }
  return {kind:'ready' as const,loading,route,rendezvous,meeting,exits};
}
export function previewGroupFormation(w:World,ids:readonly number[],sources:readonly CommercialBuyLine[],destination:number):GroupFormationPreview {
  const p=previewFormation(w,ids,sources,destination);if(p.kind!=='ready')return {ok:false,reason:p.kind==='deferred'?'La préparation attend une nouvelle tentative.':p.reason};
  const mass=viewMass(p.loading.mass,p.loading.capture.items);mass.rations+=p.loading.manifest.filter(l=>l.item==='survival-meal').reduce((n,l)=>n+l.quantity,0);
  return {ok:true,route:p.route.tiles,mass,carriers:p.loading.manifest.map(l=>({pileId:l.pileId,pawnId:l.carrierId,quantity:l.quantity}))};
}
export function groupRoutePreview(w:World,destination:number):GroupRoutePreview {
  const g=w.group;if(!w.planet||!away(g))return {ok:false,reason:'Aucun groupe hors carte.'};
  const mass=captureGroupMass(g.members,g.items);if(!mass)return {ok:false,reason:'Inventaire du groupe invalide.'};
  const context=planetCostContext(w,mass),from=g.segment?.to??g.tile,route=findPlanetRoute(w.planet,from,destination,context,queryBudget());
  return route.kind==='found'?{ok:true,route:route.tiles,durationCore:route.estimatedCore+(g.segment?.remainingCore??0)}:{ok:false,reason:'Cette destination est inaccessible.'};
}
function tradeEnvironment(w:World,mass:GroupMassCapture):GroupTradeEnvironment {
  return {tick:w.tick,nextId:w.nextId,version:w.schemaVersion,siteTile:w.planet!.civilianTile,siteOpen:true,post:w.civilianPost,mass,pileCountElsewhere:w.piles.length+(w.scout&&'items' in w.scout?w.scout.items.length:0)+(w.commercialTrip&&'items' in w.commercialTrip?w.commercialTrip.items.length:0)};
}
export function groupTradeQuote(w:World,direction:'buy'|'sell',lines:readonly CommercialBuyLine[]):GroupTradePreview {
  const g=w.group;if(!w.planet||!away(g))return {ok:false,reason:'Le groupe doit rejoindre le comptoir civil.'};
  const mass=captureGroupMass(g.members,g.items);if(!mass)return {ok:false,reason:'Inventaire du groupe invalide.'};
  const env=tradeEnvironment(w,mass),q=quoteGroupTrade(g,env,direction,lines);if(!q.ok)return q;
  // A private draft gives an exact reviewable distribution; no World ID or
  // stock is adopted by a preview and the command rebuilds the entire draft.
  const draft=lines.length?draftGroupTrade(g,env,direction,lines,q.signature):null;
  if(lines.length&&!draft)return {ok:false,reason:'Ce panier ne peut pas être réparti dans les inventaires disponibles.'};
  const final=draft?captureGroupMass(draft.group.members,draft.group.items):mass;if(!final)return {ok:false,reason:'La charge du panier est invalide.'};
  return {ok:true,signature:q.signature,totalSilver:q.totalSilver,mass:viewMass(final,draft?.group.items??g.items)};
}
export function groupPermission(w:World):GroupPermissionView {
  const g=w.group,ids=g&&!away(g)?new Set(g.memberIds):undefined;
  const members=away(g)?g.members:ids?w.pawns.filter(p=>ids.has(p.id)):[],items=away(g)?g.items:ids?w.piles.filter(p=>'pawnId' in p.owner&&ids.has(p.owner.pawnId)):[];
  const mass=g?captureGroupMass(members,items):undefined;
  const actions:Record<GroupPanelAction,GroupActionPermission>={adopt:{ok:!w.planet},start:{ok:!!w.planet&&!g&&!w.scout&&!w.commercialTrip},cancel:{ok:!!g&&!away(g)},pause:{ok:away(g)},route:{ok:away(g)},return:{ok:away(g)},buy:{ok:false},sell:{ok:false},unload:{ok:!!w.planet&&(!g||g.phase==='unloading')}};
  let trade:GroupPermissionView['trade']=null;
  if(w.planet&&away(g)&&g.phase==='at-site'&&g.tile===w.planet.civilianTile&&mass){
    const env=tradeEnvironment(w,mass),buy=quoteGroupTrade(g,env,'buy',[]),sell=quoteGroupTrade(g,env,'sell',[]),negotiator=bestGroupNegotiator(g.members)??null;
    const goods=(q:typeof buy,direction:'buy'|'sell')=>q.ok?q.goods.map(good=>({pile:(direction==='buy'?w.civilianPost!.stock:g.items).find(p=>p.id===good.pileId)!,available:good.available,unitPrice:good.unitPrice})):[];
    trade={negotiator,...!buy.ok?{refusal:buy.reason}:{},groupSilver:g.items.filter(p=>p.owner.type==='inventory'&&p.item==='silver').reduce((n,p)=>n+p.quantity,0),postSilver:w.civilianPost?.stock.filter(p=>p.item==='silver').reduce((n,p)=>n+p.quantity,0)??0,buys:goods(buy,'buy'),sells:goods(sell,'sell')};
    actions.buy={ok:buy.ok,...!buy.ok?{reason:buy.reason}:{}};actions.sell={ok:sell.ok,...!sell.ok?{reason:sell.reason}:{}};
  }
  return {originTile:away(g)?g.tile:w.planet?.homeTile??0,originLabel:away(g)?'Groupe': 'Foyer',maximumSources:64,mass:mass?viewMass(mass,items):null,confirmedRoute:away(g)?g.route:[],actions,trade};
}
export function cancelGroupPreparation(w:World):void {
  const g=w.group;if(!g||away(g))return;
  for(const p of w.pawns)if(g.memberIds.includes(p.id)){
    // A danger owner may already have replaced the formation path this tick.
    // Its route, captured edge, strike and recovery belong to that activity.
    if(p.flee||p.melee||p.shooting||p.burning||p.bombRefuge||p.heatRefuge)continue;
    p.path=[];p.planCooldown=0;if(!['dead','downed'].includes(p.state))p.state='idle';
  }
  delete w.group;
}
export function applyGroupCommand(w:World,c:GroupCommand):CommandResult {
  if(c.type==='planet-adopt'){if(!w.planet){w.planet=generatePlanet(w.seed,planetHomeInput(w),w.tick);groupLog(w,'La planète et ses destinations sont maintenant accessibles.');}return {ok:true};}
  if(c.type==='group-start'){
    const p=previewFormation(w,c.memberIds,c.sources,c.destination);if(p.kind!=='ready')return fail(p.kind==='deferred'?'La préparation attend une nouvelle tentative.':p.reason);
    const id=w.planet!.nextGroupId;
    w.group={id,startedAt:w.tick,destination:c.destination,ledger:emptyGroupLedger(),phase:'gathering',memberIds:p.loading.capture.members.map(p=>p.id),rendezvous:p.rendezvous,meeting:p.meeting,manifest:p.loading.manifest,cursor:0,exits:p.exits};
    w.planet!.nextGroupId++;groupLog(w,'Le groupe se rassemble avant le chargement des provisions.');return {ok:true};
  }
  if(c.type==='group-cancel'){if(!w.group||away(w.group))return fail('Aucune préparation ou décharge à annuler.');cancelGroupPreparation(w);return {ok:true};}
  if(c.type==='group-pause'){if(!away(w.group))return fail('Aucun groupe hors carte.');w.group.paused=c.paused;return {ok:true};}
  if(c.type==='group-route'){
    const g=w.group;if(!w.planet||!away(g))return fail('Aucun groupe hors carte.');
    const mass=captureGroupMass(g.members,g.items);if(!mass)return fail('Inventaire du groupe invalide.');
    const p=prepareGroupRedirection(w.planet,g,c.destination,planetCostContext(w,mass),queryBudget());
    if(p.kind!=='ready')return fail(p.kind==='deferred'?'Le calcul de route attend une nouvelle tentative.':p.reason);
    w.group=p.state;return {ok:true};
  }
  if(c.type==='group-unload'){
    const current=w.group;
    if(current?.phase==='unloading')return c.memberIds.length===current.memberIds.length&&c.memberIds.every(id=>current.memberIds.includes(id))?{ok:true}:fail('Ce déchargement appartient à un autre groupe.');
    if(!w.planet||w.group||w.scout||w.commercialTrip||!Array.isArray(c.memberIds)||!c.memberIds.length||c.memberIds.length>8||new Set(c.memberIds).size!==c.memberIds.length)return fail('Choisissez un à huit colons présents pour décharger.');
    const members=c.memberIds.map(id=>w.pawns.find(p=>p.id===id));
    if(members.some(p=>!p||!isColonist(p)||p.prisoner||p.visitor||scoutUnstable(p,w)||scoutActiveTask(p)||p.state!=='idle'))return fail('Les porteurs doivent être libres et présents.');
    const ids=new Set(c.memberIds),items=w.piles.filter(p=>p.owner.type==='inventory'&&ids.has(p.owner.pawnId));
    if(!items.length||items.some(p=>!['survival-meal','silver','cloth','muffalo-wool','medicine','component'].includes(p.item)))return fail('Aucune provision admissible à décharger.');
    if(!Number.isSafeInteger(w.planet.nextGroupId+1))return fail('Le registre des groupes est plein.');
    w.group={id:w.planet.nextGroupId++,startedAt:w.tick,destination:w.planet.homeTile,ledger:emptyGroupLedger(),phase:'unloading',memberIds:[...c.memberIds].sort((a,b)=>a-b),pendingPileIds:items.map(p=>p.id)};return {ok:true};
  }
  if(c.type==='group-buy'||c.type==='group-sell'){
    const g=w.group;if(!w.planet||!away(g))return fail('Le commerce exige un groupe présent au comptoir civil.');
    const mass=captureGroupMass(g.members,g.items);if(!mass)return fail('Inventaire du groupe invalide.');
    const env=tradeEnvironment(w,mass),direction=c.type==='group-buy'?'buy':'sell',draft=draftGroupTrade(g,env,direction,c.lines,c.quote);
    if(!draft)return fail('Le devis, le stock, les fonds ou la charge du groupe ont changé.');
    // Pure transfer draft is complete before this closed adoption. Original
    // Pawn owners never change, and all goods/currency/counters adopt together.
    w.group=draft.group;w.civilianPost=draft.post;w.nextId=draft.nextId;
    groupLog(w,direction==='buy'?'Le groupe a acheté les marchandises au comptoir.':'Le groupe a vendu son fret au comptoir.');return {ok:true};
  }
  return fail('Commande de groupe inconnue.');
}
