import { rescueProposal,startRescue,wantsRescue } from './rescue.ts';
import { automaticallyHaulable } from './mining-rules.ts';
import { furnitureHaulValid } from './furniture-haul-rules.ts';
import { furnitureStorageCandidates, mayImproveFurnitureStorage } from './furniture-haul-planner.ts';
import { furnitureReady, packedAt } from './furniture-rules.ts';
import { deconstructionAvailable } from './deconstruction-rules.ts';
import { validSowingClearance } from './sowing-clearance.ts';
import { constructionCandidates } from './construction-planner.ts';
import { haulReservations } from './haul-reservations.ts';
import { asBuilder, constructionHaulPriority, constructionObstructions, constructionSiteFree, isConstruction } from './construction-rules.ts';
import { productionPriority, planCooking, type CookingPlan } from './cooking-planner.ts';
import { candidateAccess } from './candidate-access.ts';
import { fuelCapacity, wantsFuel } from './fuel.ts';
import { mayImproveStorage } from './idle-logistics.ts';
import { asideCapacity, findAsideDestination } from './haul-aside.ts';
import { storageCapacity } from './ground-placement.ts';
import { legacyItem, type ItemId } from './items.ts';
import { constructionCapacity, constructionRecipe } from './construction-materials.ts';
import { CARRY_CAPACITY, footprintCells, JOB_WOOD_COST } from './definitions.ts';
import { deliveredStock, groundQuantity, reservedDestination, reservedSource } from './materials.ts';
import { cellIndex, workNeighbours, inBounds, canStopAt, hasReachableCell, reachableCells, routeToJob, interactionGoals } from './pathfinding.ts';
import type { Reachability } from './pathfinding.ts';
import type { Cell, HaulDestination, Job, JobKind, MaterialKind, Pawn, WorkType, World } from './types.ts';
export const PLAN_INTERVAL=20;
export interface SearchStats { searches:{pawnId:number;mode:'all'|'nearest'|'full';visited:number;unreachedGroups:number;connectivityVisited?:number}[] }
export interface SearchBudget { remaining:number; pairs:number; stats?:SearchStats }
export type NavigationGrid=()=>Uint8Array;
export const workType=(job:Pick<Job,'kind'|'growingZoneId'|'installationWork'>):WorkType=>job.kind==='mine'?'mine':job.installationWork??(job.growingZoneId !== undefined || job.kind === 'sow' ? 'grow' : ['chop','harvest','cut'].includes(job.kind) ? 'gather' : 'build');
const sameCell=(a:Cell,b:Cell)=>a.x===b.x&&a.z===b.z;

export function search(world: World, pawn: Pawn, blocked: Uint8Array, occupied: ReadonlySet<number>, budget: SearchBudget, goals?: ReadonlySet<number>, allGroups?:readonly ReadonlySet<number>[]): Reachability | null {
  if (budget.remaining === 0) return null;
  budget.remaining--;
  const result=reachableCells(world,pawn,blocked,occupied,goals,allGroups);
  budget.stats?.searches.push({pawnId:pawn.id,mode:allGroups?'all':goals?'nearest':'full',visited:result.visited,unreachedGroups:result.unreachedGroups});
  return result;
}
/** A decision-wide connectivity check replaces speculative paths to every
 * candidate. Precise routes share one resumable weighted search. */
export function searchCandidates(world:World,pawn:Pawn,blocked:Uint8Array,occupied:ReadonlySet<number>,budget:SearchBudget):Reachability|null {
  if(!budget.remaining)return null;budget.remaining--;
  const result=candidateAccess(world,pawn,blocked,occupied);
  budget.stats?.searches.push({pawnId:pawn.id,mode:'all',get visited(){return result.visited;},unreachedGroups:0,get connectivityVisited(){return result.connectivityVisited;}});
  return result;
}
export function destinationCell(world: World, destination: HaulDestination): (Cell & { kind?: JobKind }) | null {
  if (destination.type === 'aside') return destination;
  if (destination.type === 'fuel') return world.structures.find(s=>s.id===destination.structureId) ?? null;
  return destination.type === 'job' ? world.jobs.find(job => job.id === destination.jobId) ?? null : world.stockpiles.find(zone => zone.id === destination.stockpileId) ?? null;
}
export function destinationCapacity(world: World, destination: HaulDestination, kind: MaterialKind, exceptPawn?: number, item: ItemId = legacyItem(kind)): number {
  if (destination.type === 'fuel') return kind==='wood' ? fuelCapacity(world,destination.structureId,exceptPawn,destination.forced) : 0;
  if (destination.type === 'aside'&&!validSowingClearance(world,destination))return 0;
  if (destination.type === 'aside') return asideCapacity(world, destination, item, exceptPawn);
  if (destination.type === 'job') {
    const job = world.jobs.find(item => item.id === destination.jobId);
    return job ? constructionCapacity(world,job,item,exceptPawn) : 0;
  }
  const zone = world.stockpiles.find(item => item.id === destination.stockpileId);
  return zone ? storageCapacity(world, zone, item, exceptPawn) : 0;
}
export function destinationValid(world: World, pawn: Pawn): boolean {
  const task = pawn.haul; if (!task) return false;
  if(task.whole)return furnitureHaulValid(world,task,pawn.id);
  const pile = world.piles.find(item => item.id === (task.phase === 'pickup' ? task.sourcePileId : task.carryPileId));
  const destination=task.destination;
  if(destination.type==='aside'&&destination.constructionId!==undefined&&!world.jobs.some(j=>j.id===destination.constructionId))return false;
  return !!pile && destinationCapacity(world, task.destination, pile.kind, pawn.id, pile.item) >= task.quantity;
}
interface Candidate { rescue?:{patientId:number;bedId:number;path:Cell[]}; whole?:true; clearance?:{resourceId:number;progress:number}; cooking?: CookingPlan; priority: number; rank: number; distance: number; id: number; job?: Job; sourceId?: number; quantity?: number; destination?: HaulDestination; target: Cell }
function compareCandidate(a: Candidate, b: Candidate): number { return a.priority - b.priority || a.rank - b.rank || a.distance - b.distance || a.id - b.id; }
export function canReach(world: World, target: Cell & { kind?: JobKind }, reachable: Reachability, allowTarget: boolean): boolean {
  const cells = target.kind ? footprintCells(target as Job) : [target];
  if (allowTarget && canStopAt(world,target,reachable) && hasReachableCell(reachable,cellIndex(world, target.x, target.z))) return true;
  for (const cell of cells) for (const next of workNeighbours(cell,target.kind)) {
    if (canStopAt(world,next,reachable) && !cells.some(own => sameCell(own, next)) && hasReachableCell(reachable,cellIndex(world, next.x, next.z))) return true;
  }
  return false;
}
export function planWork(world: World, pawn: Pawn, getBlocked: NavigationGrid, occupied: ReadonlySet<number>, budget: SearchBudget): void {
  if(medicalWorkRefusal(pawn)){pawn.planCooldown=20;return;}
  // Never enumerate logistics after another colonist exhausted the shared search budget.
  if (budget.remaining === 0 || budget.pairs === 0) return;
  const productionRank=productionPriority(world,pawn),cooking=productionRank<5;
  const patients=pawn.priorities.doctor>0?world.pawns.filter(wantsRescue):[];
  const fires=world.structures.filter(s=>wantsFuel(world,s));
  if (!patients.length && !cooking && !fires.length && !world.jobs.length && (!world.stockpiles.length || !world.piles.length && !world.packed.length || pawn.priorities.haul === 0)) { pawn.planCooldown = PLAN_INTERVAL; return; }
  if (!patients.length && !cooking && !fires.length && !world.jobs.length && !mayImproveFurnitureStorage(world) && !mayImproveStorage(world)) {pawn.planCooldown=PLAN_INTERVAL;return;}
  const blocked = getBlocked();
  const clearingCells=new Set(world.jobs.filter(j=>j.clearance).map(j=>cellIndex(world,j.x,j.z)));
  // Rankings do not depend on flood order. Try the top ready job directly;
  // a failed targeted search has explored the full component and is reusable.
  // Logistics with a higher priority still uses the ordinary complete planner.
  const ready = world.jobs.filter(job => !isConstruction(job) && job.reservedBy === null && !clearingCells.has(cellIndex(world,job.x,job.z)) && pawn.priorities[workType(job)] > 0
    && (job.kind!=='sow'||!packedAt(world,job)) && job.escrow.wood >= JOB_WOOD_COST[job.kind] && (pawn.hunger > 20 || job.kind === 'harvest') && (job.kind!=='deconstruct'||deconstructionAvailable(world,job,pawn.id)) && (!job.furniture||furnitureReady(world,job,pawn)))
    .map(job => ({ job, target: job, id: job.id, priority: pawn.priorities[workType(job)], rank: job.kind==='uninstall' ? -2 : job.kind==='deconstruct' ? 3 : workType(job) === 'gather' ? 0 : 1, distance: Math.abs(job.x-pawn.x)+Math.abs(job.z-pawn.z) }))
    .sort(compareCandidate);
  let reachable: Reachability | null = null;
  const first = ready[0];
  if (first && (!patients.length||pawn.priorities.doctor>first.priority) && (!cooking || productionRank>first.priority) && (pawn.priorities.haul === 0 || first.priority <= pawn.priorities.haul)
    && (first.priority<constructionHaulPriority(pawn)||!world.jobs.some(isConstruction))) {
    const source = first.job.kind === 'sow' ? world.piles.find(p => p.owner.type === 'ground' && sameCell(p.owner, first.job)) : undefined;
    if (!source || reservedSource(world, source.id) === 0) {
      const goals=interactionGoals(world,footprintCells(first.job));
      if (!source) for (const cell of footprintCells(first.job)) goals.delete(cellIndex(world,cell.x,cell.z));
      reachable=search(world,pawn,blocked,occupied,budget,goals);
      if (!reachable) return;
      const path=routeToJob(world,first.job,reachable,!!source);
      if (path) {
        const quantity=source?Math.min(CARRY_CAPACITY,source.quantity):0;
        const destination=source?findAsideDestination(world,first.job,source.item,quantity,blocked,budget):null;
        if (!source || destination) {
          if (source && destination) pawn.haul={sourcePileId:source.id,quantity,phase:'pickup',destination,carryPileId:null};
          else {first.job.reservedBy=pawn.id;first.job.status='active';pawn.jobId=first.job.id;}
          pawn.path=path;pawn.state=path.length?'moving':'working';pawn.planCooldown=PLAN_INTERVAL;return;
        }
        reachable=null; // Partial result cannot rank the remaining jobs.
      }
    }
  }
  reachable ??= searchCandidates(world, pawn, blocked, occupied, budget); if (!reachable) return;
  pawn.planCooldown = PLAN_INTERVAL;
  const delivered = new Map<string, number>(); const ground = new Map<number, number>();
  const sourceReserved = new Map<number, number>(); const jobReserved = new Map<string, number>(); const zoneReserved = new Map<number, number>();
  const outbound = new Map<number, number>(); const pileById = new Map(world.piles.map(pile => [pile.id, pile]));
  for (const pile of world.piles) {
    if (pile.owner.type === 'job') {const key=`${pile.owner.jobId}:${pile.item}`;delivered.set(key, (delivered.get(key) ?? 0) + pile.quantity);}
    if (pile.owner.type === 'ground') { const key = cellIndex(world, pile.owner.x, pile.owner.z); ground.set(key, (ground.get(key) ?? 0) + pile.quantity); }
  }
  for (const worker of world.pawns) if (worker.need?.kind === 'eat' && worker.need.phase === 'pickup') sourceReserved.set(worker.need.sourcePileId, (sourceReserved.get(worker.need.sourcePileId) ?? 0) + worker.need.quantity);
  for(const worker of world.pawns)for(const i of worker.cooking?.ingredients??[])if(i.stage!=='held')sourceReserved.set(i.pileId,(sourceReserved.get(i.pileId)??0)+i.quantity);
  for (const task of haulReservations(world)) {
    if (task.phase === 'pickup') {
      sourceReserved.set(task.sourcePileId, (sourceReserved.get(task.sourcePileId) ?? 0) + task.quantity);
      const source = pileById.get(task.sourcePileId);
      if (source?.owner.type === 'ground') { const key = cellIndex(world, source.owner.x, source.owner.z); outbound.set(key, (outbound.get(key) ?? 0) + task.quantity); }
    }
    if (task.destination.type === 'aside' || task.destination.type === 'fuel') continue;
    if(task.destination.type==='job') {
      const pile=pileById.get(task.phase==='pickup'?task.sourcePileId:task.carryPileId!);
      if(pile){const key=`${task.destination.jobId}:${pile.item}`;jobReserved.set(key,(jobReserved.get(key)??0)+task.quantity);}
    } else zoneReserved.set(task.destination.stockpileId,(zoneReserved.get(task.destination.stockpileId)??0)+task.quantity);
  }
  let best: Candidate | null = null;
  for(const patient of patients) {
    const candidate:Candidate={priority:pawn.priorities.doctor,rank:-3,distance:Math.abs(patient.x-pawn.x)+Math.abs(patient.z-pawn.z),id:patient.id,target:patient};
    if(best&&compareCandidate(candidate,best)>=0)continue;
    const proposal=rescueProposal(world,pawn,patient,reachable);
    if(!proposal)continue;
    best={...candidate,rescue:proposal};
  }
  for (const job of world.jobs) {
    if(isConstruction(job))continue;
    const work = workType(job);
    if (job.reservedBy !== null || clearingCells.has(cellIndex(world,job.x,job.z)) || pawn.priorities[work] === 0 || (delivered.get(`${job.id}:wood`) ?? 0) < JOB_WOOD_COST[job.kind] || (pawn.hunger <= 20 && job.kind !== 'harvest')) continue;
    if(job.kind==='sow'&&packedAt(world,job))continue;
    if(job.furniture&&!furnitureReady(world,job,pawn))continue;
    if(job.kind==='deconstruct'&&!deconstructionAvailable(world,job,pawn.id))continue;
    const candidate: Candidate = { priority: pawn.priorities[work], rank: job.kind==='uninstall' ? -2 : job.kind==='deconstruct' ? 3 : work === 'gather' ? 0 : 1, distance: Math.abs(job.x - pawn.x) + Math.abs(job.z - pawn.z), id: job.id, job, target: job };
    if (job.kind === 'sow' && ground.has(cellIndex(world, job.x, job.z))) {
      if (best && compareCandidate(candidate, best) >= 0) continue;
      const source = world.piles.find(p => p.owner.type === 'ground' && sameCell(p.owner, job));
      // Clear one stack at a time. Do not compete with another eater or hauler
      // for an obstruction already being removed.
      if (!source || sourceReserved.has(source.id) || !canReach(world, job, reachable, true)) continue;
      const quantity = Math.min(CARRY_CAPACITY, source.quantity);
      const destination = findAsideDestination(world, job, source.item, quantity, blocked, budget);
      if (destination) best = { ...candidate, job: undefined, sourceId: source.id, quantity, destination };
      continue;
    }
    if ((!best || compareCandidate(candidate,best)<0) && canReach(world,job,reachable,false)) best=candidate;
  }
  for(const candidate of furnitureStorageCandidates(world,pawn,blocked,reachable,budget))if(!best||compareCandidate(candidate,best)<0)best=candidate;
  const constructionObstacles=constructionObstructions(world);
  for(const candidate of constructionCandidates(world,pawn,blocked,reachable,budget,constructionObstacles))if(!best||compareCandidate(candidate,best)<0)best=candidate;
  if(cooking && (!best || productionRank<=best.priority)) {
    const proposal=planCooking(world,pawn,reachable,budget);
    if(proposal&&(!best||proposal.priority<best.priority||proposal.priority===best.priority&&best.rank>=-1))best={cooking:proposal,priority:proposal.priority,rank:-1,distance:Math.abs(pawn.x-proposal.station.x)+Math.abs(pawn.z-proposal.station.z),id:proposal.station.id,target:proposal.target};
  }
  if (Number.isFinite(constructionHaulPriority(pawn)) && pawn.hunger > 20 && (!best || best.priority >= constructionHaulPriority(pawn))) {
    const zonesByCell = new Map(world.stockpiles.map(zone => [cellIndex(world, zone.x, zone.z), zone]));
    const sources = world.piles.filter(pile => automaticallyHaulable(pile) && pile.owner.type === 'ground' && pile.quantity > (sourceReserved.get(pile.id) ?? 0));
    const destinations: { destination: HaulDestination; target: Cell & { kind?: JobKind }; priority: number; workPriority:number; wood: number; food: number; chunk?:number; steel?:number; component?:number; blocks?:number; items?:ReadonlyMap<ItemId,number>; reachable?: boolean }[] = [];
    for (const job of world.jobs) {
      const items=new Map<ItemId,number>();
      for(const cost of constructionRecipe(job).ingredients){const key=`${job.id}:${cost.item}`,capacity=cost.quantity-(delivered.get(key)??0)-(jobReserved.get(key)??0);if(capacity>0)items.set(cost.item,capacity);}
      if (items.size && constructionSiteFree(world,job,pawn.id,constructionObstacles.get(job.id))) destinations.push({ destination: { type: 'job', jobId: job.id, forConstruction:asBuilder(pawn) }, target: job, priority: 5, workPriority:constructionHaulPriority(pawn), wood: 0, food: 0,items });
    }
    if(pawn.priorities.haul>0)for (const fire of fires) destinations.push({destination:{type:'fuel',structureId:fire.id},target:fire,priority:5,workPriority:pawn.priorities.haul,wood:fuelCapacity(world,fire.id),food:0});
    if(pawn.priorities.haul>0)for (const zone of world.stockpiles) {
      const capacity = zone.capacity - (ground.get(cellIndex(world, zone.x, zone.z)) ?? 0) - (zoneReserved.get(zone.id) ?? 0);
      if (capacity > 0 && (zone.filters.wood || zone.filters.food || zone.filters.chunk || zone.filters.component || zone.filters.steel || zone.filters.blocks)) destinations.push({ destination: { type: 'stockpile', stockpileId: zone.id }, target: zone, priority: zone.priority, workPriority:pawn.priorities.haul, wood: zone.filters.wood ? capacity : 0, food: zone.filters.food ? capacity : 0, chunk: zone.filters.chunk ? 1 : 0, component: zone.filters.component ? capacity : 0, steel: zone.filters.steel ? capacity : 0, blocks:zone.filters.blocks ? capacity : 0 });
    }
    const total = sources.length * destinations.length;
    const count = Math.min(total, budget.pairs);
    const start = total ? world.logisticsCursor % total : 0;
    const sourceReachable = new Map<number, boolean>();
    // Planning does not mutate piles/reservations until a candidate is committed.
    // A destination/item capacity is therefore stable for this one invocation.
    const storageCapacities = new Map<string,number>();
    for (let offset = 0; offset < count; offset++) {
      const index = (start + offset) % total;
      const pile = sources[Math.floor(index / destinations.length)]!;
      if (pile.owner.type !== 'ground') continue;
      const destination = destinations[index % destinations.length]!;
      let capacity=destination.items?.get(pile.item)??destination[pile.kind]??0;
      if (sameCell(pile.owner, destination.target)) continue;
      const sourceZone = zonesByCell.get(cellIndex(world, pile.owner.x, pile.owner.z));
      const excess = sourceZone ? Math.max(0, (ground.get(cellIndex(world, pile.owner.x, pile.owner.z)) ?? 0) - sourceZone.capacity) : 0;
      const currentPriority = sourceZone?.filters[pile.kind] && !excess ? sourceZone.priority : 0;
      if (destination.priority <= currentPriority) continue;
      let available = pile.quantity - (sourceReserved.get(pile.id) ?? 0);
      if (sourceZone?.filters[pile.kind] && excess > 0 && destination.destination.type === 'stockpile') available = Math.min(available, Math.max(0, excess - (outbound.get(cellIndex(world, pile.owner.x, pile.owner.z)) ?? 0)));
      if (available <= 0) continue;
      // Ranking is independent of capacity/access. A candidate that cannot beat
      // the winner cannot affect this decision; retain pair order/cursor/budget.
      const candidate:Candidate={priority:destination.workPriority,rank:2+(5-destination.priority)/10,
        distance:Math.abs(pawn.x-pile.owner.x)+Math.abs(pawn.z-pile.owner.z)+Math.abs(destination.target.x-pile.owner.x)+Math.abs(destination.target.z-pile.owner.z),id:pile.id,
        sourceId:pile.id,quantity:0,destination:destination.destination,target:pile.owner};
      if(best&&compareCandidate(candidate,best)>=0)continue;
      // Same-priority storage pairs cannot win; avoid their pure capacity scan.
      if(destination.destination.type==='stockpile') {
        const key=`${destination.destination.stockpileId}:${pile.item}`;
        let cached=storageCapacities.get(key);
        if(cached===undefined){cached=storageCapacity(world,zonesByCell.get(cellIndex(world,destination.target.x,destination.target.z))!,pile.item);storageCapacities.set(key,cached);}
        capacity=cached;
      }
      if (capacity <= 0) continue;
      let sourceAccess = sourceReachable.get(pile.id);
      if (sourceAccess === undefined) { sourceAccess = canReach(world, pile.owner, reachable, true); sourceReachable.set(pile.id, sourceAccess); }
      if(!sourceAccess)continue;
      destination.reachable??=canReach(world,destination.target,reachable,destination.destination.type!=='job');
      if(!destination.reachable)continue;
      candidate.quantity=Math.min(CARRY_CAPACITY,available,capacity);best=candidate;
    }
    budget.pairs -= count;
    if (total) world.logisticsCursor = (start + count) % total;
  }
  if(best?.rescue){startRescue(world,pawn,best.rescue);return;}
  if (best?.cooking) {
    const proposal=best.cooking;
    pawn.cooking=proposal.task??null;pawn.haul=proposal.refuel??null;pawn.path=proposal.path;pawn.state=proposal.path.length?'moving':'working';pawn.planCooldown=0;return;
  }
  if (best) {
    const path = routeToJob(world, best.target, reachable, !best.job)!;
    if (best.destination) pawn.haul = { ...(best.whole?{whole:true as const}:{}), sourcePileId: best.sourceId!, quantity: best.quantity!, phase: 'pickup', destination: best.destination, carryPileId: null };
    else { if(best.job!.kind==='install')best.job!.installationWork=asBuilder(pawn)?'build':'haul';if(best.clearance)best.job!.clearance=best.clearance;best.job!.reservedBy = pawn.id; best.job!.status = 'active'; pawn.jobId = best.job!.id; }
    pawn.path = path; pawn.state = path.length ? 'moving' : 'working'; return;
  }
}
import { medicalWorkRefusal } from './health-rules.ts';
