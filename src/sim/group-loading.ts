/** Physical formation/loading and closed collective departure preflight. */
import type { GroupState, GroupSource, GroupLedger } from './group-state.ts';
import type { PlanetState } from './planet-state.ts';
import type { CommercialBuyLine } from './commercial-state.ts';
import type { Cell, MaterialPile, Pawn, World } from './types.ts';
import type { GroupCandidatesCapture, GroupDepartureCapture, GroupFormationAuthority, GroupMassCapture, PreparingGroup, AwayGroup } from './group-capture.ts';
import { captureGroupCandidates, captureGroupDeparture, groupDepartureCurrent, groupDestinationValid } from './group-capture.ts';
import { commercialItemMassGrams } from './commercial-mass.ts';
import { refreshStock } from './materials.ts';
import { commitInventoryPickup, inventoryPickupCurrent, planInventoryPickup, type InventoryPickupPlan } from './inventory-pickup.ts';
import { findPlanetRoute, planetCostContext, type PlanetSearchBudget } from './planet-navigation.ts';

export const GROUP_MAX_SOURCES=64,GROUP_MAX_MANIFEST=512;
export const emptyGroupLedger=():GroupLedger=>({foodLoaded:0,foodConsumed:0,medicineUsed:0,silverLoaded:0,silverPaid:0,silverEarned:0,
  cargoLoaded:{cloth:0,'muffalo-wool':0},sold:{cloth:0,'muffalo-wool':0},bought:{medicine:0,component:0}});
const loadItem=(item:MaterialPile['item']):item is GroupSource['item']=>
  item==='survival-meal'||item==='silver'||item==='cloth'||item==='muffalo-wool';
const fail=(reason:string)=>({kind:'refused' as const,reason});
const contact=(pawn:Pawn,cell:Cell)=>Math.abs(pawn.x-cell.x)+Math.abs(pawn.z-cell.z)<=1;
export type GroupLoadingPreview=
  | {kind:'ready';capture:GroupCandidatesCapture;manifest:GroupSource[];mass:GroupMassCapture;additionalPiles:number}
  | {kind:'refused';reason:string}
  | {kind:'deferred'};

/** Real owners/catalogue only; pure, no IDs/reservations/RNG consumed.
 * Explicit local greedy policy: least current grams thenID, fill that carrier
 * by a batch, then choose again. It is not per-unit load balancing. */
export function previewGroupLoading(world:World,memberIds:readonly number[],lines:readonly CommercialBuyLine[],authority:GroupFormationAuthority):GroupLoadingPreview {
  if(lines.length>GROUP_MAX_SOURCES||new Set(lines.map(l=>l.pileId)).size!==lines.length
    ||lines.some(l=>!Number.isSafeInteger(l.pileId)||l.pileId<1||!Number.isSafeInteger(l.quantity)||l.quantity<1))return fail('lines');
  const result=captureGroupCandidates(world,memberIds,authority);if(result.kind!=='ready')return result;
  const capture=result.capture,carriers=capture.mass.carriers.map(c=>({...c})),manifest:GroupSource[]=[],remainingBySource=new Map<number,number>();
  const access=new Map<string,'reachable'|'unreachable'|'deferred'>();let additionalPiles=0;
  for(const line of [...lines].sort((a,b)=>a.pileId-b.pileId)){
    const source=capture.sources.get(line.pileId);
    if(!source||source.owner.type!=='ground'||!loadItem(source.item)||source.foodPoison)return fail('source');
    const unit=commercialItemMassGrams(source.item),reserved=authority.reservedQuantity(world,source.id);
    if(unit===undefined||!Number.isSafeInteger(reserved)||reserved<0||source.quantity-reserved<line.quantity)return fail('source-reserved');
    remainingBySource.set(source.id,source.quantity);let remaining=line.quantity;
    while(remaining){
      const ranked=[...carriers].filter(c=>c.capacityGrams-c.grams>=unit).sort((a,b)=>a.grams-b.grams||a.pawnId-b.pawnId);
      let selected:typeof carriers[number]|undefined;
      for(const carrier of ranked){
        const pawn=capture.members.find(p=>p.id===carrier.pawnId)!;
        if(authority.sourceReason(world,source,pawn))continue;
        const key=`${source.id}:${pawn.id}`;let reach=access.get(key);
        if(reach===undefined){reach=authority.sourceAccess(world,pawn,source);access.set(key,reach);}
        if(reach==='deferred')return {kind:'deferred'};if(reach==='reachable'){selected=carrier;break;}
      }
      if(!selected)return fail('source-or-carrier-capacity');
      const quantity=Math.min(remaining,Math.floor((selected.capacityGrams-selected.grams)/unit));
      if(manifest.length>=GROUP_MAX_MANIFEST)return fail('manifest-cap');
      manifest.push({pileId:source.id,item:source.item,quantity,carrierId:selected.pawnId});
      const left=remainingBySource.get(source.id)!;if(quantity<left)additionalPiles++;
      remainingBySource.set(source.id,left-quantity);selected.grams+=quantity*unit;remaining-=quantity;
    }
  }
  const mass:GroupMassCapture=Object.freeze({grams:carriers.reduce((n,c)=>n+c.grams,0),capacityGrams:capture.mass.capacityGrams,
    carriers:Object.freeze(carriers.map(c=>Object.freeze(c)))});
  if(!Number.isSafeInteger(mass.grams)||world.piles.length+additionalPiles>32768||!Number.isSafeInteger(world.nextId+additionalPiles))return fail('pile-or-id-cap');
  const reason=authority.namespaceReason(world,{additionalPiles,members:capture.members,items:capture.items});if(reason)return fail(reason);
  return {kind:'ready',capture,manifest,mass,additionalPiles};
}

/** Reservations include only future lines; multiple rows from one pile add. */
export function groupReservedSources(group:PreparingGroup):ReadonlyMap<number,number> {
  const result=new Map<number,number>();
  if(group.phase==='loading'||group.phase==='gathering')for(let i=group.cursor;i<group.manifest.length;i++){
    const line=group.manifest[i]!;result.set(line.pileId,(result.get(line.pileId)??0)+line.quantity);
  }
  return result;
}
export function groupCarrierTask(group:PreparingGroup,pawnId:number):'rendezvous'|'pickup'|'exit'|'wait' {
  if(!group.memberIds.includes(pawnId))return 'wait';
  if(group.phase==='gathering')return 'rendezvous';if(group.phase==='leaving')return 'exit';
  return group.manifest[group.cursor]?.carrierId===pawnId?'pickup':'wait';
}
/** Physical target only; root on-map driver uses common reservations/navigation
 * and preserves its engaged movement. No movement/departure is simulated here. */
export function groupCarrierTarget(world:World,group:PreparingGroup,pawnId:number):Cell|undefined {
  const task=groupCarrierTask(group,pawnId);
  if(task==='rendezvous'){const meeting=group.meeting.find(m=>m.pawnId===pawnId);return meeting?{...meeting.cell}:undefined;}
  if(task==='exit'){const exit=group.exits.find(e=>e.pawnId===pawnId)?.cell;return exit?{...exit}:undefined;}
  if(task==='pickup'){const line=group.manifest[group.cursor]!,source=world.piles.find(p=>p.id===line.pileId);
    return source?.owner.type==='ground'?{x:source.owner.x,z:source.owner.z}:undefined;}
  return undefined;
}

export interface GroupPickupPlan {
  group:PreparingGroup;
  expectedGroup:string;
  cursor:number;
  transfer:InventoryPickupPlan;
  nextLedger:GroupLedger;
  tick:number;
  carrier:Pawn;
  expectedCarrier:string;
  possessions:readonly MaterialPile[];
  possessionSignatures:readonly string[];
}
/** Actual contact plus exhaustive current carry mass, not preview mass. */
export function prepareGroupPickup(world:World,group:PreparingGroup,authority:GroupFormationAuthority):
  |{kind:'ready';plan:GroupPickupPlan}|{kind:'refused';reason:string} {
  if(group.phase!=='loading')return fail('phase');
  const line=group.manifest[group.cursor];if(!line)return fail('cursor');
  const result=captureGroupCandidates(world,group.memberIds,authority);if(result.kind!=='ready')return result;
  const capture=result.capture,pawn=capture.members.find(p=>p.id===line.carrierId),source=capture.sources.get(line.pileId);
  if(!pawn||!source||source.owner.type!=='ground'||source.item!==line.item||source.foodPoison||!contact(pawn,source.owner)
    ||pawn.motion&&pawn.motion.end>world.tick||pawn.moveCooldown>0)return fail('physical-contact');
  const policy=authority.sourceReason(world,source,pawn);if(policy)return fail(policy);
  const reserved=authority.reservedQuantity(world,source.id,group.id),future=groupReservedSources(group).get(source.id)??0;
  if(!Number.isSafeInteger(reserved)||reserved<0||future<line.quantity||source.quantity-reserved<future)return fail('reservation');
  const unit=commercialItemMassGrams(source.item),carrier=capture.mass.carriers.find(c=>c.pawnId===pawn.id)!;
  if(unit===undefined||carrier.grams+line.quantity*unit>carrier.capacityGrams)return fail('mass');
  const transfer=planInventoryPickup(world,source,pawn.id,line.quantity);if(!transfer)return fail('transfer');
  const namespace=authority.namespaceReason(world,{additionalPiles:Number(transfer.split),members:capture.members,items:capture.items});if(namespace)return fail(namespace);
  const nextLedger:GroupLedger={...group.ledger,cargoLoaded:{...group.ledger.cargoLoaded},sold:{...group.ledger.sold},bought:{...group.ledger.bought}};
  if(line.item==='survival-meal')nextLedger.foodLoaded+=line.quantity;
  else if(line.item==='silver')nextLedger.silverLoaded+=line.quantity;else nextLedger.cargoLoaded[line.item]+=line.quantity;
  if(![nextLedger.foodLoaded,nextLedger.silverLoaded,nextLedger.cargoLoaded.cloth,nextLedger.cargoLoaded['muffalo-wool']].every(Number.isSafeInteger))return fail('ledger');
  const possessions=capture.items.filter(p=>'pawnId' in p.owner&&p.owner.pawnId===pawn.id);
  return {kind:'ready',plan:{group,expectedGroup:JSON.stringify(group),cursor:group.cursor,transfer,nextLedger,tick:world.tick,
    carrier:pawn,expectedCarrier:JSON.stringify(pawn),possessions,possessionSignatures:possessions.map(p=>JSON.stringify(p))}};
}
/** Caller proves plan.group is still active; all preflight before first write.
 * No await; return false changes nothing. Stock refresh remains existing logic. */
export function commitGroupPickup(world:World,activeGroup:GroupState,plan:GroupPickupPlan):boolean {
  if(activeGroup!==plan.group||world.tick!==plan.tick||JSON.stringify(activeGroup)!==plan.expectedGroup
    ||!world.pawns.includes(plan.carrier)||JSON.stringify(plan.carrier)!==plan.expectedCarrier||!inventoryPickupCurrent(world,plan.transfer))return false;
  const actual=world.piles.filter(p=>'pawnId' in p.owner&&p.owner.pawnId===plan.carrier.id);
  if(actual.length!==plan.possessions.length||!plan.possessions.every((p,i)=>actual.includes(p)&&JSON.stringify(p)===plan.possessionSignatures[i]))return false;
  if(!commitInventoryPickup(world,plan.transfer))return false;
  plan.group.manifest[plan.cursor]!.carriedPileId=plan.transfer.carried.id;
  plan.group.ledger=plan.nextLedger;plan.group.cursor++;refreshStock(world);
  // Gathering/loading/leaving transition is root-owned after real roster contacts.
  return true;
}

export interface GroupDeparturePlan {
  group:PreparingGroup;
  expectedGroup:string;
  capture:GroupDepartureCapture;
  /** Original members/items, not cloned humans or inventory projections. */
  next:AwayGroup;
}
export interface DepartureAuthority extends GroupFormationAuthority {
  /** Supplied by root scheduler, not inferred from sparse health/Pawn fields. */
  personalPassTick(world:World,members:readonly Pawn[]):number;
  /** Validates prospective ownership/route/caps WITHOUT constructing fakeWorld. */
  departureReason(world:World,plan:GroupDeparturePlan):string|undefined;
  /** Synchronous all-or-none removal/install, original refs and version guard.
   * Root revalidates complete namespaces and updates actual World fields here. */
  adoptDeparture(world:World,plan:GroupDeparturePlan):boolean;
}
export function prepareGroupDeparture(world:World,planet:PlanetState,group:PreparingGroup,authority:DepartureAuthority,budget:PlanetSearchBudget):
  |{kind:'ready';plan:GroupDeparturePlan}|{kind:'deferred'}|{kind:'refused';reason:string} {
  if(!groupDestinationValid(planet,group.destination))return fail('destination');
  const result=captureGroupDeparture(world,group,authority);if(result.kind!=='ready')return result;
  const capture=result.capture;
  if(authority.personalPassTick(world,capture.members)!==world.tick)return fail('personal-pass');
  const route=findPlanetRoute(planet,planet.homeTile,group.destination,planetCostContext(world,capture.mass),budget);
  if(route.kind==='deferred')return {kind:'deferred'};if(route.kind!=='found')return fail('unreachable');
  const next:AwayGroup={id:group.id,startedAt:group.startedAt,destination:group.destination,ledger:group.ledger,phase:'travelling',
    members:[...capture.members],items:[...capture.items],departedAt:world.tick,lastPersonalTick:world.tick,baseline:capture.baseline,
    entry:{...capture.exitCells[0]!.cell},tile:planet.homeTile,route:route.tiles,segment:null,paused:false,stop:null};
  const plan:GroupDeparturePlan={group,expectedGroup:JSON.stringify(group),capture,next};
  const reason=authority.departureReason(world,plan);return reason?fail(reason):{kind:'ready',plan};
}
/** Prefer this closed synchronous operation: no exposed draft reused after await.
 * Root adoptDeparture still performs exact ref/owner/quantity/version preflight. */
export function departGroup(world:World,planet:PlanetState,group:PreparingGroup,authority:DepartureAuthority,budget:PlanetSearchBudget):
  |{kind:'departed'}|{kind:'deferred'}|{kind:'refused';reason:string} {
  const prepared=prepareGroupDeparture(world,planet,group,authority,budget);if(prepared.kind!=='ready')return prepared;
  if(JSON.stringify(group)!==prepared.plan.expectedGroup||!groupDepartureCurrent(world,prepared.plan.capture))return fail('departure-changed');
  return authority.adoptDeparture(world,prepared.plan)?{kind:'departed'}:fail('departure-changed');
}

// Cancel releases only future manifest reservations. Already carried IDs remain
// map possessions and unload physically. No receipt refunds or synthetic stock.
