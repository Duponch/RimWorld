import { ensureCommercialPost } from './commercial-post.ts';
import type { Cell, MaterialPile, Pawn, World } from './types.ts';
import type { NeedContext } from './needs.ts';
import type { AwayGroup } from './group-capture.ts';
import { captureGroupTravel } from './group-capture.ts';
import { cancelGroupPreparation, groupFormationAuthority, groupLog, groupMemberReason } from './group-authority.ts';
import { commitGroupPickup, departGroup, prepareGroupPickup, type DepartureAuthority } from './group-loading.ts';
import { planetCostContext, PLANET_QUERY_ARCS, PLANET_QUERY_NODES } from './planet-navigation.ts';
import { advanceGroupRoute } from './group-trip.ts';
import { advanceGroupPersonal } from './group-personal.ts';
import { advanceGroupIngestion } from './group-ingestion.ts';
import { advanceGroupCare, applyConsumedGroupMass } from './group-care.ts';
import { advanceGroupJoy } from './group-joy.ts';
import { captureHumanOwners } from './human-owners.ts';
import { healthRandom } from './health.ts';
import { colonistMoodOffset } from './game-profile.ts';
import { colonyExpectation } from './colony-economy.ts';
import { pawnBody } from './health-rules.ts';
import { hasMentalBreak } from './mental-state.ts';
import { notifyPawnDeath } from './bereavement.ts';
import { captureCivilianReturnFinder } from './civilian-return.ts';
import { candidateAccess } from './candidate-access.ts';
import { blockedCells, inBounds, workNeighbours } from './pathfinding.ts';
import { captureStandability } from './furniture-travel.ts';
import { groundCapacity, nearbyGround } from './ground-placement.ts';
import { refreshStock, transferPile } from './materials.ts';
import { dropIncapacitatedEquipment } from './equipment-state.ts';

const same=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;
const contact=(a:Cell,b:Cell)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z)<=1;
/** The ordinary engine owns every movement edge and its global search budget. */
export function processGroupOnMap(w:World,p:Pawn,ctx:NeedContext):boolean {
  const g=w.group;if(!g||!('memberIds' in g)||!g.memberIds.includes(p.id))return false;
  if(g.phase==='unloading'){
    if(['dead','downed'].includes(p.state)||hasMentalBreak(p)||p.flee||p.melee||p.shooting){cancelGroupPreparation(w);return false;}
    g.pendingPileIds=g.pendingPileIds.filter(id=>w.piles.some(i=>i.id===id&&i.owner.type==='inventory'&&g.memberIds.includes(i.owner.pawnId)));
    if(!g.pendingPileIds.length){cancelGroupPreparation(w);return false;}
    const pile=w.piles.find(i=>g.pendingPileIds.includes(i.id)&&i.owner.type==='inventory'&&i.owner.pawnId===p.id);
    if(!pile){p.path=[];p.state='idle';return true;}
    const access=candidateAccess(w,p,blockedCells(w),new Set(),true),stand=captureStandability(w);
    // This is admission only. Ordinary ctx.move owns the weighted route and
    // global PATH quota; even quota0 must not hide a second weighted search.
    const cell=nearbyGround(w,p).find(c=>groundCapacity(w,c,pile.item,p.id)>=pile.quantity
      &&[c,...workNeighbours(c)].some(stop=>inBounds(w,stop.x,stop.z)&&stand(stop)&&access.has(stop.z*w.width+stop.x)));
    if(!cell){p.path=[];p.state='idle';return true;}
    if(contact(p,cell)){
      if(!transferPile(w,pile,{type:'ground',...cell}))throw Error('Preflighted group unload failed');
      g.pendingPileIds=g.pendingPileIds.filter(id=>id!==pile.id);p.path=[];p.state='idle';
      if(!g.pendingPileIds.length)cancelGroupPreparation(w);
    }else ctx.move(cell,false);
    return true;
  }
  const reason=groupMemberReason(w,p,true);if(reason){groupLog(w,`Préparation annulée : ${reason}`);cancelGroupPreparation(w);return false;}
  if(g.phase==='gathering'){
    const spot=g.meeting.find(e=>e.pawnId===p.id)!.cell;
    if(!same(p,spot)){ctx.move(spot,true);return true;}
    p.path=[];p.state='idle';
    if(g.meeting.every(e=>{const q=w.pawns.find(q=>q.id===e.pawnId);return !!q&&same(q,e.cell)&&q.moveCooldown===0&&(q.motion?.end??0)<=w.tick;}))g.phase=g.manifest.length?'loading':'leaving';
    return true;
  }
  if(g.phase==='loading'){
    const line=g.manifest[g.cursor];if(!line){g.phase='leaving';return true;}
    if(line.carrierId!==p.id){p.path=[];p.state='idle';return true;}
    const source=w.piles.find(i=>i.id===line.pileId);
    if(!source||source.owner.type!=='ground'||source.item!==line.item||source.foodPoison){cancelGroupPreparation(w);return false;}
    if(!contact(p,source.owner)){ctx.move(source.owner,false);return true;}
    const plan=prepareGroupPickup(w,g,groupFormationAuthority(w,true));
    if(plan.kind!=='ready'){groupLog(w,'Le chargement ne peut plus être confirmé ; les biens déjà portés sont conservés.');cancelGroupPreparation(w);return false;}
    if(!commitGroupPickup(w,g,plan.plan))throw Error('Synchronous group pickup changed');
    p.path=[];p.state='idle';if(g.cursor===g.manifest.length)g.phase='leaving';return true;
  }
  const exit=g.exits.find(e=>e.pawnId===p.id)?.cell;
  if(!exit){cancelGroupPreparation(w);return false;}
  if(same(p,exit)){p.path=[];p.state='idle';}else ctx.move(exit,true);
  return true;
}

/** At most512 manifest rows/64 source identities. Only future promises are
 * reconciled: contact receipts and actual inventories remain historical. */
export function reconcileGroupPreparation(w:World):void {
  const g=w.group;if(!g||!('manifest' in g))return;
  const future=new Map<number,{item:MaterialPile['item'];quantity:number}>();
  for(let i=g.cursor;i<g.manifest.length;i++){
    const line=g.manifest[i]!,old=future.get(line.pileId);
    if(old&&old.item!==line.item){groupLog(w,'Préparation annulée : une source promise a changé.');cancelGroupPreparation(w);return;}
    future.set(line.pileId,{item:line.item,quantity:(old?.quantity??0)+line.quantity});
  }
  if(!future.size)return;
  const piles=new Map(w.piles.map(p=>[p.id,p]));
  for(const [id,promised] of future){
    const source=piles.get(id);
    if(!source||source.owner.type!=='ground'||source.item!==promised.item||source.foodPoison||source.quantity<promised.quantity){
      groupLog(w,'Préparation annulée : une provision promise n’est plus disponible ; les biens déjà portés sont conservés.');
      cancelGroupPreparation(w);return;
    }
  }
}

/** Called after all on-map personal passes. All originals transfer together. */
export function tryGroupDeparture(w:World):void {
  const g=w.group;if(!w.planet||!g||!('manifest' in g)||g.phase!=='leaving')return;
  if(!g.exits.every(e=>{const p=w.pawns.find(p=>p.id===e.pawnId);return !!p&&!!e.cell&&same(p,e.cell)&&p.moveCooldown===0&&!p.path.length&&(p.motion?.end??0)<=w.tick;}))return;
  const base=groupFormationAuthority(w,true);
  const authority:DepartureAuthority={...base,personalPassTick:()=>w.tick,departureReason:(_world,plan)=>{
    if(plan.next.baseline.food<plan.next.members.length)return 'Chargez au moins une ration saine par membre avant le départ.';
    return undefined;
  },adoptDeparture:(world,plan)=>{
    if(world.group!==g)return false;
    const people=new Set(plan.capture.members.map(p=>p.id)),items=new Set(plan.capture.items.map(p=>p.id));
    for(const p of plan.capture.members){p.bedId=null;p.path=[];p.moveCooldown=0;p.planCooldown=0;p.state='idle';if(p.mental)p.mental.below=[0,0,0];delete p.motion;delete p.shooting;delete p.stagger;delete p.stun;}
    world.pawns=world.pawns.filter(p=>!people.has(p.id));world.piles=world.piles.filter(p=>!items.has(p.id));world.group=plan.next;refreshStock(world);
    groupLog(world,`${people.size} membre${people.size>1?'s':''} quitte${people.size>1?'nt':''} la carte avec ses provisions.`);return true;
  }};
  const result=departGroup(w,w.planet,g,authority,{nodes:PLANET_QUERY_NODES,arcs:PLANET_QUERY_ARCS});
  if(result.kind==='refused'){groupLog(w,`Départ annulé : ${result.reason}`);cancelGroupPreparation(w);}
}
function returnGroup(w:World,g:AwayGroup):boolean {
  if(g.phase!=='awaiting-entry'||w.pawns.length+g.members.length>w.width*w.height||w.piles.length+g.items.length>32768)return false;
  const find=captureCivilianReturnFinder(w),used=new Set<number>(),placements:{pawn:Pawn;cell:Cell}[]=[];
  for(const pawn of g.members){const cell=find(g.entry,c=>!used.has(c.z*w.width+c.x));if(!cell)return false;used.add(cell.z*w.width+cell.x);placements.push({pawn,cell});}
  captureHumanOwners(w);
  for(const {pawn,cell} of placements){pawn.x=cell.x;pawn.z=cell.z;pawn.path=[];pawn.moveCooldown=0;pawn.planCooldown=0;delete pawn.motion;if(pawn.state!=='downed')pawn.state='idle';}
  w.pawns.push(...g.members);w.piles.push(...g.items);
  const pending=g.items.filter(i=>i.owner.type==='inventory').map(i=>i.id);
  if(pending.length)w.group={id:g.id,startedAt:g.startedAt,destination:g.destination,ledger:g.ledger,phase:'unloading',memberIds:g.members.map(p=>p.id),pendingPileIds:pending};else delete w.group;
  // Reinsert the real owners together before the local physical drop. A full
  // floor keeps the same disabled weapon with equipmentDropPending for retry.
  for(const {pawn} of placements)dropIncapacitatedEquipment(w,pawn);
  refreshStock(w);groupLog(w,pending.length?'Le groupe est rentré ; ses provisions sont à décharger physiquement.':'Le groupe est rentré.');return true;
}

/** Personal evolution, actual consumption and ten Core route steps per local tick. */
export function advanceGroup(w:World):void {
  let g=w.group;if(!w.planet||!g||!('members' in g)||g.lastPersonalTick===w.tick)return;
  for(const p of g.members)if(p.droppedWeaponId!==undefined&&(g.items.some(i=>i.owner.type==='equipment'&&i.owner.pawnId===p.id)||!w.piles.some(i=>i.id===p.droppedWeaponId&&i.kind==='weapon'&&i.owner.type==='ground')))delete p.droppedWeaponId;
  // Reused Core V182 Caravan_NeedsTracker.AnyPawnsNeedRest tests whether
  // Rest exists. Every admitted human has it, including one at rest100.
  let travel=captureGroupTravel(g,p=>({incapable:p.state==='downed'||hasMentalBreak(p)||pawnBody(p).capacities.moving<=0,restNeed:true}));
  if(!travel)throw Error('Invalid group owner mass');
  const prospective=advanceGroupRoute(w.planet,g,planetCostContext(w,travel.mass),travel).state;
  const stationary=g.phase!=='travelling'||'members' in prospective&&!!prospective.stop,people=captureHumanOwners(w).people,expectation=colonyExpectation(w,g.members[0]!);
  const random=()=>healthRandom(w),notice=(_person:Pawn,message:string)=>groupLog(w,message);
  const result=advanceGroupPersonal(g,{tick:w.tick,schemaVersion:w.schemaVersion,seed:w.seed,legacyFood:w.foodRules==='legacy',legacyRest:w.restRules==='legacy',resting:stationary,
    infectionChanceFactor:w.gameProfile?.difficulty==='adventure-story'?.75:1,mood:{people,expectation,difficultyMood:colonistMoodOffset(w,g.members[0]!)},joyToleranceFall:(expectation?.joyToleranceDropPerDay??.18)*100/6000,random,notice});
  if(!result)return;
  if(result.deceased.length){
    const dead=new Set(result.deceased.map(p=>p.id));
    const actualAway=g;
    const losses=result.deceased.map(p=>({groupId:actualAway.id,tile:actualAway.tile,tick:p.health!.death!.tick,pawn:p,items:actualAway.items.filter(i=>'pawnId' in i.owner&&i.owner.pawnId===p.id)}));
    w.groupLosses??=[];w.groupLosses.push(...losses);g.members=g.members.filter(p=>!dead.has(p.id));g.items=g.items.filter(i=>!('pawnId' in i.owner)||!dead.has(i.owner.pawnId));
    if(!g.members.length)delete w.group;
    for(const loss of losses){notifyPawnDeath(w,loss.pawn);groupLog(w,`${loss.pawn.name} est décédé pendant le voyage ; son dossier et ses biens sont conservés à cette destination.`);}
    if(!g.members.length)return;
    travel=captureGroupTravel(g,p=>({incapable:p.state==='downed'||hasMentalBreak(p)||pawnBody(p).capacities.moving<=0,restNeed:true}));if(!travel)throw Error('Invalid surviving group');
  }
  const ingestion=advanceGroupIngestion(g,{tick:w.tick,schemaVersion:w.schemaVersion,foodPolicies:w.foodPolicies,foodPoisonFactor:w.gameProfile?.difficulty==='adventure-story'?.75:1,random,notice});
  const care=advanceGroupCare(g,{tick:w.tick,random});
  const mass=applyConsumedGroupMass(travel.mass,[ingestion,care]);
  travel={mass,incapableIds:g.members.filter(p=>p.state==='downed'||hasMentalBreak(p)||pawnBody(p).capacities.moving<=0).map(p=>p.id),anyRestNeed:g.members.length>0};
  advanceGroupJoy(g,{tick:w.tick,stationary,random});
  for(let core=0;core<10;core++){
    const context=planetCostContext(w,mass);context.homeCivilCore+=core;
    const next=advanceGroupRoute(w.planet,g,context,travel);if(!('members' in next.state))throw Error('Route returned wrong owner phase');g=next.state;w.group=g;
    if(next.event==='arrived'){
      if(g.tile===w.planet.civilianTile)ensureCommercialPost(w);
      groupLog(w,g.tile===w.planet.homeTile?'Le groupe attend une entrée accessible au foyer.':'Le groupe est arrivé à sa destination.');
    }
  }
  returnGroup(w,g);
}
