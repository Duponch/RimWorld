import { generateWorld } from './generation.ts';
import { adjacent, blockedCells, cellIndex, inBounds, reachableCells, routeToJob, routeToCell } from './pathfinding.ts';
import type { Reachability } from './pathfinding.ts';
import { CARRY_CAPACITY, footprintCells, JOB_DURATION, JOB_WOOD_COST, MAX_STACK } from './definitions.ts';
import { addGroundMaterial, addMaterial, deliveredStock, groundQuantity, materialCanFit, refreshStock, reservedDestination, reservedSource } from './materials.ts';
import { queryArea, validStorageSettings } from './designation.ts';
import { processNeeds } from './needs.ts';
export { HUNGER_PER_TICK, REST_PER_TICK } from './needs.ts';
import type { AreaCommand, Cell, Command, CommandResult, DesignateCommand, HaulDestination, Job, JobDiagnostic, JobKind, MaterialKind, Pawn, RefusalCode, WorkType, World } from './types.ts';
export { JOB_DURATION, JOB_WOOD_COST } from './definitions.ts';

const PLAN_INTERVAL = 20;
const MOVE_INTERVAL = 3;
const PATH_SEARCHES_PER_TICK = 8;
const JOB_LABEL: Readonly<Record<JobKind, string>> = { chop: 'abattage', harvest: 'récolte', wall: 'construction de mur', bed: 'construction de lit' };
interface SearchBudget { remaining: number; pairs: number }
type NavigationGrid = () => Uint8Array;
const workType = (kind: JobKind): WorkType => kind === 'chop' || kind === 'harvest' ? 'gather' : 'build';
const sameCell = (a: Cell, b: Cell): boolean => a.x === b.x && a.z === b.z;
const nearby = (a: Cell, b: Cell): boolean => sameCell(a, b) || adjacent(a, b);
const refusal = (code: RefusalCode, reason: string): CommandResult => ({ ok: false, code, reason });
function event(world: World, type: 'job' | 'need' | 'command', message: string): void {
  world.events.push({ tick: world.tick, type, message });
  if (world.events.length > 80) world.events.splice(0, world.events.length - 80);
}
export function createWorld(seed = 42, width = 32, height = 32): World { return generateWorld(seed, width, height); }

/** A cancellation releases future intentions; carried or delivered matter stays where it is. */
function releaseWork(world: World, pawn: Pawn): void {
  const job = world.jobs.find(candidate => candidate.id === pawn.jobId);
  if (job?.reservedBy === pawn.id) { job.reservedBy = null; job.status = 'pending'; }
  const carry = world.piles.find(pile => pile.owner.type === 'pawn' && pile.owner.pawnId === pawn.id);
  // Changing owner retains identity and needs no spare pile/ID allocation.
  if (carry) carry.owner = { type: 'ground', x: pawn.x, z: pawn.z };
  pawn.jobId = null; pawn.haul = null; pawn.need = null; pawn.path = []; pawn.state = 'idle'; pawn.planCooldown = PLAN_INTERVAL; pawn.needCooldown = 20;
}
function wakePlanners(world: World): void {
  for (const pawn of world.pawns) if (pawn.jobId === null && pawn.haul === null) pawn.planCooldown = 0;
}

/** One authoritative command, evaluated against the state at execution, without
 * per-cell worker messages or repeated scans of every resource for every cell.
 */
function applyArea(world: World, command: AreaCommand): CommandResult {
  const selection = queryArea(world, command);
  if (!selection.ok) return selection;
  if (!selection.cells.length) return refusal('missing-target', 'Aucune case compatible dans ce rectangle.');
  const creates = command.action === 'chop' || command.action === 'harvest' || command.action === 'stockpile';
  if (creates && !Number.isSafeInteger(world.nextId + selection.cells.length)) return refusal('invalid-command', 'Limite des identités atteinte.');
  let affected = selection.cells.length;
  if (command.action === 'chop' || command.action === 'harvest') {
    for (const index of selection.cells) world.jobs.push({ id: world.nextId++, kind: command.action, x: index % world.width, z: Math.floor(index / world.width), orientation: 0, footprint: 'standard', status: 'pending', reservedBy: null, progress: 0, escrow: { wood: 0, food: 0 } });
  } else if (command.action === 'stockpile') {
    for (const index of selection.cells) world.stockpiles.push({ id: world.nextId++, x: index % world.width, z: Math.floor(index / world.width), filters: { ...(command.filters ?? { wood: true, food: true }) }, priority: command.priority ?? 2, capacity: command.capacity ?? MAX_STACK });
  } else {
    const cells = new Set(selection.cells);
    if (command.action === 'remove-stockpile') {
      const ids = new Set(world.stockpiles.filter(cell => cells.has(cellIndex(world, cell.x, cell.z))).map(cell => cell.id));
      const carriers = new Set(world.pawns.filter(pawn => pawn.haul?.destination.type === 'stockpile' && ids.has(pawn.haul.destination.stockpileId)).map(pawn => pawn.id));
      const returning = world.piles.filter(pile => pile.owner.type === 'pawn' && carriers.has(pile.owner.pawnId)).length;
      if (!Number.isSafeInteger(world.nextId + returning)) return refusal('invalid-command', 'Identités insuffisantes pour déposer les cargaisons.');
      world.stockpiles = world.stockpiles.filter(cell => !ids.has(cell.id));
      for (const pawn of world.pawns) if (pawn.haul?.destination.type === 'stockpile' && ids.has(pawn.haul.destination.stockpileId)) releaseWork(world, pawn);
    } else {
      const jobs = world.jobs.filter(job => footprintCells(job).some(cell => cells.has(cellIndex(world, cell.x, cell.z))));
      const ids = new Set(jobs.map(job => job.id)); affected = ids.size;
      const carriers = new Set(world.pawns.filter(pawn => pawn.haul?.destination.type === 'job' && ids.has(pawn.haul.destination.jobId)).map(pawn => pawn.id));
      const returning = world.piles.filter(pile => (pile.owner.type === 'job' && ids.has(pile.owner.jobId)) || (pile.owner.type === 'pawn' && carriers.has(pile.owner.pawnId))).length;
      // Reserve an upper bound before releasing any owner. Deposits may merge,
      // but exhausting IDs must never leave a partly removed construction/cargo.
      if (!Number.isSafeInteger(world.nextId + returning)) return refusal('invalid-command', 'Identités insuffisantes pour conserver les matériaux annulés.');
      for (const pawn of world.pawns) if ((pawn.jobId !== null && ids.has(pawn.jobId)) || (pawn.haul?.destination.type === 'job' && ids.has(pawn.haul.destination.jobId))) releaseWork(world, pawn);
      world.jobs = world.jobs.filter(job => !ids.has(job.id));
      const delivered = world.piles.filter(pile => pile.owner.type === 'job' && ids.has(pile.owner.jobId));
      world.piles = world.piles.filter(pile => !(pile.owner.type === 'job' && ids.has(pile.owner.jobId)));
      const byId = new Map(jobs.map(job => [job.id, job]));
      for (const pile of delivered) if (pile.owner.type === 'job') addGroundMaterial(world, pile.kind, pile.quantity, byId.get(pile.owner.jobId)!);
    }
  }
  wakePlanners(world); refreshStock(world);
  event(world, 'command', `Rectangle : ${affected} ${command.action === 'cancel' ? 'ordre(s) annulé(s)' : command.action === 'remove-stockpile' ? 'case(s) de réserve retirée(s)' : command.action === 'stockpile' ? 'case(s) de réserve créée(s)' : 'ordre(s) de collecte créé(s)'}.`);
  return { ok: true, affected, skipped: selection.skipped };
}

/** Pure shared rule used by preview and command execution. */
export function canDesignate(world: World, command: DesignateCommand): CommandResult {
  if (!command || !['chop', 'harvest', 'wall', 'bed'].includes(command.kind)) return refusal('invalid-command', 'Type de travail inconnu.');
  if (command.orientation !== undefined && (!Number.isInteger(command.orientation) || command.orientation < 0 || command.orientation > 3)) return refusal('invalid-command', 'Orientation invalide.');
  const cells = footprintCells(command);
  if (cells.some(cell => !inBounds(world, cell.x, cell.z))) return refusal('out-of-bounds', 'Empreinte hors de la carte.');
  if (world.jobs.some(job => footprintCells(job).some(cell => cells.some(target => sameCell(cell, target))))) return refusal('occupied', 'Un ordre existe déjà dans cette empreinte.');
  const resource = world.resources.find(candidate => sameCell(candidate, command));
  if (command.kind === 'chop' || command.kind === 'harvest') {
    return resource?.kind === (command.kind === 'chop' ? 'tree' : 'berries') ? { ok: true } : refusal('incompatible-resource', 'Ressource incompatible.');
  }
  for (const cell of cells) {
    if (['water', 'rock'].includes(world.tiles[cellIndex(world, cell.x, cell.z)]!.terrain)
      || world.resources.some(item => sameCell(item, cell))
      || world.structures.some(item => footprintCells(item).some(target => sameCell(target, cell)))
      || world.pawns.some(item => sameCell(item, cell))
      || world.stockpiles.some(item => sameCell(item, cell))
      || world.piles.some(item => item.owner.type === 'ground' && sameCell(item.owner, cell))) {
      return refusal('occupied', 'Construction impossible : terrain, objet, zone de stockage ou colon dans l’empreinte.');
    }
  }
  return { ok: true };
}
export function applyCommand(world: World, command: Command): CommandResult {
  if (!command || typeof command !== 'object') return refusal('invalid-command', 'Commande invalide.');
  if (command.type === 'area') return applyArea(world, command);
  if (command.type === 'assign-bed') {
    const bed = world.structures.find(item => item.id === command.bedId && item.kind === 'bed');
    const owner = world.pawns.find(item => item.id === command.pawnId);
    if (!bed || (command.pawnId !== null && !owner)) return refusal('missing-target', 'Lit ou colon introuvable.');
    for (const pawn of world.pawns) if (pawn.bedId === bed.id || pawn === owner) {
      if (pawn.need?.kind === 'sleep') releaseWork(world, pawn);
      pawn.bedId = null; pawn.needCooldown = 0;
    }
    if (owner) owner.bedId = bed.id;
    return { ok: true };
  }
  if (command.type === 'priority') {
    if (!['gather', 'build', 'haul'].includes(command.work) || !Number.isInteger(command.value) || command.value < 0 || command.value > 4) return refusal('invalid-priority', 'La priorité doit être comprise entre 0 et 4.');
    const pawn = world.pawns.find(candidate => candidate.id === command.pawnId);
    if (!pawn) return refusal('missing-target', 'Colon introuvable.');
    pawn.priorities[command.work] = command.value;
    const job = world.jobs.find(candidate => candidate.id === pawn.jobId);
    if (command.value === 0 && ((job && workType(job.kind) === command.work) || (pawn.haul && command.work === 'haul'))) releaseWork(world, pawn);
    pawn.planCooldown = 0; refreshStock(world); return { ok: true };
  }
  if (!['designate', 'cancel', 'stockpile'].includes(command.type)) return refusal('invalid-command', 'Commande inconnue.');
  if (!inBounds(world, command.x, command.z)) return refusal('out-of-bounds', 'Cellule hors de la carte.');
  if (command.type === 'stockpile') {
    if (typeof command.enabled !== 'boolean' || !validStorageSettings(command)) return refusal('invalid-storage', 'Filtres, priorité (1–4) ou capacité (1–75) invalides.');
    const existing = world.stockpiles.find(zone => sameCell(zone, command));
    if (!command.enabled) {
      if (!existing) return refusal('missing-target', 'Aucune cellule de stockage ici.');
      world.stockpiles.splice(world.stockpiles.indexOf(existing), 1);
    } else {
      if (['water', 'rock'].includes(world.tiles[cellIndex(world, command.x, command.z)]!.terrain)
        || world.resources.some(item => sameCell(item, command))
        || [...world.structures, ...world.jobs].some(item => footprintCells(item).some(cell => sameCell(cell, command)))) return refusal('occupied', 'Stockage impossible sur cette cellule occupée ou infranchissable.');
      if (existing) {
        existing.filters = command.filters ? { ...command.filters } : existing.filters;
        existing.priority = command.priority ?? existing.priority;
        existing.capacity = command.capacity ?? existing.capacity;
      } else world.stockpiles.push({ id: world.nextId++, x: command.x, z: command.z, filters: { ...(command.filters ?? { wood: true, food: true }) }, priority: command.priority ?? 2, capacity: command.capacity ?? MAX_STACK });
    }
    // Re-evaluate pending capacity reservations atomically after the policy change.
    for (const pawn of world.pawns) if (pawn.haul?.destination.type === 'stockpile'
      && (!destinationValid(world, pawn) || pawn.haul.destination.stockpileId === existing?.id)) releaseWork(world, pawn);
    wakePlanners(world); refreshStock(world); return { ok: true };
  }
  if (command.type === 'cancel') {
    const existing = world.jobs.find(job => footprintCells(job).some(cell => sameCell(cell, command)));
    if (!existing) return refusal('missing-target', 'Aucun ordre à annuler ici.');
    for (const pawn of world.pawns) if (pawn.jobId === existing.id || (pawn.haul?.destination.type === 'job' && pawn.haul.destination.jobId === existing.id)) releaseWork(world, pawn);
    world.jobs.splice(world.jobs.indexOf(existing), 1);
    const delivered = world.piles.filter(pile => pile.owner.type === 'job' && pile.owner.jobId === existing.id);
    for (const pile of delivered) { world.piles.splice(world.piles.indexOf(pile), 1); addGroundMaterial(world, pile.kind, pile.quantity, existing); }
    event(world, 'command', 'Ordre annulé ; les matériaux restent sur place.');
    wakePlanners(world); refreshStock(world); return { ok: true };
  }
  const result = canDesignate(world, command);
  if (!result.ok) return result;
  world.jobs.push({ id: world.nextId++, kind: command.kind, x: command.x, z: command.z, orientation: command.orientation ?? 0, footprint: 'standard', status: 'pending', reservedBy: null, progress: 0, escrow: { wood: 0, food: 0 } });
  wakePlanners(world); event(world, 'command', `Nouvel ordre : ${JOB_LABEL[command.kind]} (${command.x}, ${command.z}).`); return { ok: true };
}

export function queryJobStatus(world: World, job: Job): JobDiagnostic {
  const delivered = deliveredStock(world, job.id).wood; const required = JOB_WOOD_COST[job.kind];
  if (job.reservedBy !== null) return { code: 'working', reason: 'Travail attribué à un colon.', delivered, required };
  if (required > delivered) {
    const shipping = reservedDestination(world, { type: 'job', jobId: job.id });
    return { code: shipping ? 'delivering' : 'missing-materials', reason: shipping ? `Livraison en cours : ${delivered}/${required} bois reçus.` : `Attend ${required - delivered} bois livrés ; vérifier le transport et l’accès.`, delivered, required };
  }
  const enabled = world.pawns.some(pawn => pawn.priorities[workType(job.kind)] > 0);
  return { code: enabled ? 'ready' : 'waiting-worker', reason: enabled ? 'Prêt ; attend un colon disponible et un accès.' : 'Travail désactivé pour tous les colons.', delivered, required };
}
export function queryPawnStatus(world: World, pawn: Pawn): { code: string; reason: string } {
  if (pawn.need?.kind === 'eat') return { code: pawn.need.phase, reason: pawn.need.phase === 'pickup' ? 'Va chercher une portion réservée.' : `Mange la portion tenue en main (${Math.floor(pawn.need.progress / 50 * 100)} %).` };
  if (pawn.need?.kind === 'sleep') return { code: pawn.need.phase, reason: pawn.need.phase === 'travel' ? pawn.need.bedId === null ? 'Libère le lit et cherche une place au sol.' : 'Se rend à son lit réservé.' : pawn.need.bedId === null ? 'Dort au sol ; aucun lit utilisable ou épuisement.' : 'Dort dans son lit.' };
  if (pawn.haul) return { code: pawn.haul.phase, reason: pawn.haul.phase === 'pickup' ? `Va prélever ${pawn.haul.quantity} unités réservées.` : `Porte ${pawn.haul.quantity} unités vers ${pawn.haul.destination.type === 'job' ? 'un chantier' : 'le stockage'}.` };
  if (pawn.jobId !== null) return { code: 'working', reason: pawn.state === 'moving' ? 'Se rend à son travail.' : 'Travaille sur sa cible.' };
  if (pawn.state === 'sleeping') return { code: 'sleeping', reason: 'Se repose.' };
  if (pawn.state === 'hungry') return { code: 'hungry', reason: 'Faim critique ; attend de la nourriture ou une récolte accessible.' };
  return { code: world.jobs.length ? 'waiting' : 'idle', reason: world.jobs.length ? 'Aucun travail actuellement admissible : priorités, matériaux ou accès à vérifier.' : 'Aucun travail admissible actuellement.' };
}

function search(world: World, pawn: Pawn, blocked: Uint8Array, occupied: Set<number>, budget: SearchBudget): Reachability | null {
  if (budget.remaining === 0) return null;
  budget.remaining--; return reachableCells(world, pawn, blocked, occupied);
}
/** Deterministic sidestep; active and sleeping agents are never teleported or overlapped. */
function yieldIdleBlocker(world: World, requester: Pawn, target: Cell, blocked: Uint8Array, occupied: Set<number>, reachable: Reachability, allowTarget = false): boolean {
  const route = routeToJob(world, target, reachable, allowTarget);
  if (route === null) return false;
  const routeIndices = new Map(route.map((cell, index) => [cellIndex(world, cell.x, cell.z), index]));
  for (let pathIndex = 0; pathIndex < route.length; pathIndex++) {
    const cell = route[pathIndex]!;
    const blocker = world.pawns.find(pawn => pawn.id !== requester.id && sameCell(pawn, cell));
    if (!blocker) continue;
    if (blocker.jobId !== null || blocker.haul !== null || blocker.need !== null || blocker.state === 'sleeping' || blocker.moveCooldown > 0) return false;
    const choices = [{ x: blocker.x, z: blocker.z - 1 }, { x: blocker.x + 1, z: blocker.z }, { x: blocker.x, z: blocker.z + 1 }, { x: blocker.x - 1, z: blocker.z }]
      .filter(next => { const index = cellIndex(world, next.x, next.z); const position = routeIndices.get(index); return inBounds(world, next.x, next.z) && !blocked[index] && !occupied.has(index) && (position === undefined || position > pathIndex); });
    choices.sort((a, b) => Number(routeIndices.has(cellIndex(world, a.x, a.z))) - Number(routeIndices.has(cellIndex(world, b.x, b.z))));
    const next = choices[0]; if (!next) return false;
    occupied.delete(cellIndex(world, blocker.x, blocker.z)); blocker.x = next.x; blocker.z = next.z; blocker.moveCooldown = MOVE_INTERVAL; occupied.add(cellIndex(world, blocker.x, blocker.z)); return true;
  }
  return false;
}
function destinationCell(world: World, destination: HaulDestination): (Cell & { kind?: JobKind }) | null {
  return destination.type === 'job' ? world.jobs.find(job => job.id === destination.jobId) ?? null : world.stockpiles.find(zone => zone.id === destination.stockpileId) ?? null;
}
function destinationCapacity(world: World, destination: HaulDestination, kind: MaterialKind, exceptPawn?: number): number {
  if (destination.type === 'job') {
    const job = world.jobs.find(item => item.id === destination.jobId);
    return job && kind === 'wood' ? Math.max(0, JOB_WOOD_COST[job.kind] - deliveredStock(world, job.id).wood - reservedDestination(world, destination, exceptPawn)) : 0;
  }
  const zone = world.stockpiles.find(item => item.id === destination.stockpileId);
  return zone?.filters[kind] ? Math.max(0, zone.capacity - groundQuantity(world, zone) - reservedDestination(world, destination, exceptPawn)) : 0;
}
function destinationValid(world: World, pawn: Pawn): boolean {
  const task = pawn.haul; if (!task) return false;
  const pile = world.piles.find(item => item.id === (task.phase === 'pickup' ? task.sourcePileId : task.carryPileId));
  return !!pile && destinationCapacity(world, task.destination, pile.kind, pawn.id) >= task.quantity;
}
interface Candidate { priority: number; rank: number; distance: number; id: number; job?: Job; sourceId?: number; quantity?: number; destination?: HaulDestination; target: Cell }
function compareCandidate(a: Candidate, b: Candidate): number { return a.priority - b.priority || a.rank - b.rank || a.distance - b.distance || a.id - b.id; }
function canReach(world: World, target: Cell & { kind?: JobKind }, reachable: Reachability, allowTarget: boolean): boolean {
  const cells = target.kind ? footprintCells(target as Job) : [target];
  if (allowTarget && reachable.parents[cellIndex(world, target.x, target.z)] !== -2) return true;
  for (const cell of cells) for (const next of [{ x: cell.x, z: cell.z - 1 }, { x: cell.x + 1, z: cell.z }, { x: cell.x, z: cell.z + 1 }, { x: cell.x - 1, z: cell.z }]) {
    if (inBounds(world, next.x, next.z) && !cells.some(own => sameCell(own, next)) && reachable.parents[cellIndex(world, next.x, next.z)] !== -2) return true;
  }
  return false;
}
function planWork(world: World, pawn: Pawn, getBlocked: NavigationGrid, occupied: Set<number>, budget: SearchBudget): void {
  // Never enumerate logistics after another colonist exhausted the shared search budget.
  if (budget.remaining === 0 || budget.pairs === 0) return;
  if (!world.jobs.length && (!world.stockpiles.length || !world.piles.length || pawn.priorities.haul === 0)) { pawn.planCooldown = PLAN_INTERVAL; return; }
  const blocked = getBlocked();
  const reachable = search(world, pawn, blocked, occupied, budget); if (!reachable) return;
  pawn.planCooldown = PLAN_INTERVAL;
  const delivered = new Map<number, number>(); const ground = new Map<number, number>();
  const sourceReserved = new Map<number, number>(); const jobReserved = new Map<number, number>(); const zoneReserved = new Map<number, number>();
  const outbound = new Map<number, number>(); const pileById = new Map(world.piles.map(pile => [pile.id, pile]));
  for (const pile of world.piles) {
    if (pile.owner.type === 'job' && pile.kind === 'wood') delivered.set(pile.owner.jobId, (delivered.get(pile.owner.jobId) ?? 0) + pile.quantity);
    if (pile.owner.type === 'ground') { const key = cellIndex(world, pile.owner.x, pile.owner.z); ground.set(key, (ground.get(key) ?? 0) + pile.quantity); }
  }
  for (const worker of world.pawns) if (worker.need?.kind === 'eat' && worker.need.phase === 'pickup') sourceReserved.set(worker.need.sourcePileId, (sourceReserved.get(worker.need.sourcePileId) ?? 0) + 1);
  for (const worker of world.pawns) if (worker.haul) {
    const task = worker.haul;
    if (task.phase === 'pickup') {
      sourceReserved.set(task.sourcePileId, (sourceReserved.get(task.sourcePileId) ?? 0) + task.quantity);
      const source = pileById.get(task.sourcePileId);
      if (source?.owner.type === 'ground') { const key = cellIndex(world, source.owner.x, source.owner.z); outbound.set(key, (outbound.get(key) ?? 0) + task.quantity); }
    }
    const map = task.destination.type === 'job' ? jobReserved : zoneReserved;
    const id = task.destination.type === 'job' ? task.destination.jobId : task.destination.stockpileId;
    map.set(id, (map.get(id) ?? 0) + task.quantity);
  }
  let best: Candidate | null = null;
  const blockedTargets: { target: Cell; allow: boolean }[] = [];
  for (const job of world.jobs) {
    const work = workType(job.kind);
    if (job.reservedBy !== null || pawn.priorities[work] === 0 || (delivered.get(job.id) ?? 0) < JOB_WOOD_COST[job.kind] || (pawn.hunger <= 20 && job.kind !== 'harvest')) continue;
    const candidate: Candidate = { priority: pawn.priorities[work], rank: work === 'gather' ? 0 : 1, distance: Math.abs(job.x - pawn.x) + Math.abs(job.z - pawn.z), id: job.id, job, target: job };
    if (canReach(world, job, reachable, false)) { if (!best || compareCandidate(candidate, best) < 0) best = candidate; }
    else if (blockedTargets.length < 16) blockedTargets.push({ target: job, allow: false });
  }
  if (pawn.priorities.haul > 0 && pawn.hunger > 20 && (!best || best.priority >= pawn.priorities.haul)) {
    const zonesByCell = new Map(world.stockpiles.map(zone => [cellIndex(world, zone.x, zone.z), zone]));
    const sources = world.piles.filter(pile => pile.owner.type === 'ground' && pile.quantity > (sourceReserved.get(pile.id) ?? 0));
    const destinations: { destination: HaulDestination; target: Cell & { kind?: JobKind }; priority: number; wood: number; food: number; reachable: boolean }[] = [];
    for (const job of world.jobs) {
      const capacity = JOB_WOOD_COST[job.kind] - (delivered.get(job.id) ?? 0) - (jobReserved.get(job.id) ?? 0);
      if (capacity > 0) destinations.push({ destination: { type: 'job', jobId: job.id }, target: job, priority: 5, wood: capacity, food: 0, reachable: canReach(world, job, reachable, false) });
    }
    for (const zone of world.stockpiles) {
      const capacity = zone.capacity - (ground.get(cellIndex(world, zone.x, zone.z)) ?? 0) - (zoneReserved.get(zone.id) ?? 0);
      if (capacity > 0 && (zone.filters.wood || zone.filters.food)) destinations.push({ destination: { type: 'stockpile', stockpileId: zone.id }, target: zone, priority: zone.priority, wood: zone.filters.wood ? capacity : 0, food: zone.filters.food ? capacity : 0, reachable: canReach(world, zone, reachable, true) });
    }
    const total = sources.length * destinations.length;
    const count = Math.min(total, budget.pairs);
    const start = total ? world.logisticsCursor % total : 0;
    const sourceReachable = new Map<number, boolean>();
    for (let offset = 0; offset < count; offset++) {
      const index = (start + offset) % total;
      const pile = sources[Math.floor(index / destinations.length)]!;
      if (pile.owner.type !== 'ground') continue;
      const destination = destinations[index % destinations.length]!;
      const capacity = destination[pile.kind]; if (capacity <= 0 || sameCell(pile.owner, destination.target)) continue;
      const sourceZone = zonesByCell.get(cellIndex(world, pile.owner.x, pile.owner.z));
      const excess = sourceZone ? Math.max(0, (ground.get(cellIndex(world, pile.owner.x, pile.owner.z)) ?? 0) - sourceZone.capacity) : 0;
      const currentPriority = sourceZone?.filters[pile.kind] && !excess ? sourceZone.priority : 0;
      if (destination.priority <= currentPriority) continue;
      let available = pile.quantity - (sourceReserved.get(pile.id) ?? 0);
      if (sourceZone?.filters[pile.kind] && excess > 0 && destination.destination.type === 'stockpile') available = Math.min(available, Math.max(0, excess - (outbound.get(cellIndex(world, pile.owner.x, pile.owner.z)) ?? 0)));
      if (available <= 0) continue;
      let sourceAccess = sourceReachable.get(pile.id);
      if (sourceAccess === undefined) { sourceAccess = canReach(world, pile.owner, reachable, true); sourceReachable.set(pile.id, sourceAccess); }
      if (!sourceAccess || !destination.reachable) {
        if (blockedTargets.length < 16) { if (!sourceAccess) blockedTargets.push({ target: pile.owner, allow: true }); else blockedTargets.push({ target: destination.target, allow: destination.destination.type === 'stockpile' }); }
        continue;
      }
      const candidate: Candidate = { priority: pawn.priorities.haul, rank: 2 + (5 - destination.priority) / 10, distance: Math.abs(pawn.x - pile.owner.x) + Math.abs(pawn.z - pile.owner.z) + Math.abs(destination.target.x - pile.owner.x) + Math.abs(destination.target.z - pile.owner.z), id: pile.id,
        sourceId: pile.id, quantity: Math.min(CARRY_CAPACITY, available, capacity), destination: destination.destination, target: pile.owner };
      if (!best || compareCandidate(candidate, best) < 0) best = candidate;
    }
    budget.pairs -= count;
    if (total) world.logisticsCursor = (start + count) % total;
  }
  if (best) {
    const path = routeToJob(world, best.target, reachable, !best.job)!;
    if (best.destination) pawn.haul = { sourcePileId: best.sourceId!, quantity: best.quantity!, phase: 'pickup', destination: best.destination, carryPileId: null };
    else { best.job!.reservedBy = pawn.id; best.job!.status = 'active'; pawn.jobId = best.job!.id; }
    pawn.path = path; pawn.state = path.length ? 'moving' : 'working'; return;
  }
  const staticReachable = blockedTargets.length ? search(world, pawn, blocked, new Set(), budget) : null;
  if (staticReachable) for (const candidate of blockedTargets) if (yieldIdleBlocker(world, pawn, candidate.target, blocked, occupied, staticReachable, candidate.allow)) return;
}

function moveToward(world: World, pawn: Pawn, target: Cell, allowTarget: boolean, getBlocked: NavigationGrid, occupied: Set<number>, budget: SearchBudget, exact = false): void {
  pawn.state = 'moving'; if (pawn.moveCooldown > 0) return;
  const blocked = getBlocked();
  let next = pawn.path[0];
  if (!next || blocked[cellIndex(world, next.x, next.z)] || occupied.has(cellIndex(world, next.x, next.z))) {
    if (pawn.planCooldown > 0) return;
    const reachable = search(world, pawn, blocked, occupied, budget); if (!reachable) return;
    const path = exact ? routeToCell(world, target, reachable) : routeToJob(world, target, reachable, allowTarget); pawn.planCooldown = PLAN_INTERVAL;
    if (path === null) {
      const staticReachable = search(world, pawn, blocked, new Set(), budget);
      if (staticReachable) yieldIdleBlocker(world, pawn, target, blocked, occupied, staticReachable, allowTarget);
      releaseWork(world, pawn); return;
    }
    pawn.path = path; next = path[0];
  }
  if (next) { occupied.delete(cellIndex(world, pawn.x, pawn.z)); pawn.x = next.x; pawn.z = next.z; occupied.add(cellIndex(world, pawn.x, pawn.z)); pawn.path.shift(); pawn.moveCooldown = MOVE_INTERVAL; }
}
function processHaul(world: World, pawn: Pawn, getBlocked: NavigationGrid, occupied: Set<number>, budget: SearchBudget): void {
  const task = pawn.haul!;
  if (!destinationValid(world, pawn)) { releaseWork(world, pawn); return; }
  if (task.phase === 'pickup') {
    const source = world.piles.find(item => item.id === task.sourcePileId);
    if (!source || source.owner.type !== 'ground' || source.quantity < task.quantity) { releaseWork(world, pawn); return; }
    if (!nearby(pawn, source.owner)) { moveToward(world, pawn, source.owner, true, getBlocked, occupied, budget); return; }
    if (source.quantity > task.quantity && world.piles.length >= 32768) { releaseWork(world, pawn); return; }
    source.quantity -= task.quantity;
    if (!source.quantity) world.piles.splice(world.piles.indexOf(source), 1);
    const carryId = world.nextId++;
    world.piles.push({ id: carryId, kind: source.kind, quantity: task.quantity, owner: { type: 'pawn', pawnId: pawn.id } });
    task.carryPileId = carryId; task.phase = 'deliver'; pawn.path = []; pawn.planCooldown = 0; pawn.state = 'working'; return;
  }
  const target = destinationCell(world, task.destination);
  const carry = world.piles.find(item => item.id === task.carryPileId);
  if (!target || !carry) { releaseWork(world, pawn); return; }
  const atTarget = task.destination.type === 'job' ? footprintCells(target as Job).some(cell => adjacent(pawn, cell)) && !footprintCells(target as Job).some(cell => sameCell(pawn, cell)) : nearby(pawn, target);
  if (!atTarget) { moveToward(world, pawn, target, task.destination.type === 'stockpile', getBlocked, occupied, budget); return; }
  world.piles.splice(world.piles.indexOf(carry), 1);
  addMaterial(world, carry.kind, carry.quantity, task.destination.type === 'job' ? { type: 'job', jobId: task.destination.jobId } : { type: 'ground', x: target.x, z: target.z });
  pawn.haul = null; pawn.path = []; pawn.state = 'idle'; pawn.planCooldown = 0; wakePlanners(world);
}
function completeJob(world: World, pawn: Pawn, job: Job): void {
  if (job.kind === 'chop' || job.kind === 'harvest') {
    const resource = world.resources.find(item => sameCell(item, job));
    if (!resource) { releaseWork(world, pawn); return; }
    if (!materialCanFit(world, job.kind === 'chop' ? 'wood' : 'food', resource.amount, { type: 'ground', x: job.x, z: job.z })) {
      job.progress = JOB_DURATION[job.kind] - 1; releaseWork(world, pawn); return;
    }
    world.resources.splice(world.resources.indexOf(resource), 1); addGroundMaterial(world, job.kind === 'chop' ? 'wood' : 'food', resource.amount, job);
  } else {
    world.piles = world.piles.filter(pile => pile.owner.type !== 'job' || pile.owner.jobId !== job.id);
    world.structures.push({ id: world.nextId++, kind: job.kind, x: job.x, z: job.z, orientation: job.orientation, footprint: job.footprint });
  }
  world.jobs.splice(world.jobs.indexOf(job), 1); pawn.jobId = null; pawn.path = []; pawn.state = 'idle'; pawn.planCooldown = 0;
  event(world, 'job', `${pawn.name} a terminé le travail : ${JOB_LABEL[job.kind]}.`); wakePlanners(world);
}
export function stepWorld(world: World, ticks = 1): void {
  if (!Number.isInteger(ticks) || ticks < 0 || ticks > 100000) throw new Error('Tick count must be an integer between 0 and 100000.');
  for (let step = 0; step < ticks; step++) {
    world.tick++;
    // Build only if this tick actually plans or moves. No cross-tick cache can hide
    // a command, edited terrain, restored save, or a wall that changed between calls.
    let blocked: Uint8Array | undefined;
    const getBlocked: NavigationGrid = () => blocked ??= blockedCells(world);
    const occupied = new Set(world.pawns.map(pawn => cellIndex(world, pawn.x, pawn.z)));
    const budget: SearchBudget = { remaining: PATH_SEARCHES_PER_TICK, pairs: 32768 };
    for (let offset = 0; offset < world.pawns.length; offset++) {
      const pawn = world.pawns[((world.tick - 1) + offset) % world.pawns.length]!;
      if (pawn.moveCooldown > 0) pawn.moveCooldown--; if (pawn.planCooldown > 0) pawn.planCooldown--;
      if (processNeeds(world, pawn, {
        search: (ignorePawns = false) => search(world, pawn, getBlocked(), ignorePawns ? new Set() : occupied, budget),
        move: (target, exact) => moveToward(world, pawn, target, true, getBlocked, occupied, budget, exact),
        release: () => releaseWork(world, pawn),
        event: message => event(world, 'need', message),
      })) continue;
      if (pawn.jobId === null && pawn.haul === null && pawn.planCooldown === 0) planWork(world, pawn, getBlocked, occupied, budget);
      if (pawn.haul) { processHaul(world, pawn, getBlocked, occupied, budget); continue; }
      const job = world.jobs.find(candidate => candidate.id === pawn.jobId); if (!job) continue;
      const cells = footprintCells(job);
      if (cells.some(cell => adjacent(pawn, cell)) && !cells.some(cell => sameCell(pawn, cell))) {
        pawn.path = []; pawn.state = 'working'; job.progress++;
        if (job.progress >= JOB_DURATION[job.kind]) completeJob(world, pawn, job);
      } else moveToward(world, pawn, job, false, getBlocked, occupied, budget);
    }
    refreshStock(world);
  }
}
