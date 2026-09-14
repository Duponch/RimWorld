import { processCooking } from './cooking.ts';
import { applyBillCommand } from './cooking-commands.ts';
import { cookingCellReserved } from './cooking-bills.ts';
import { burnFuel, campfire, newCampfireFuel } from './fuel.ts';
import { processHaul } from './hauling.ts';
import { scheduleGrowing, cancelGrowingJobs, growingJobValid, finishSowing, jobDuration, growingZoneAt } from './farming.ts';
import { isPlant, harvestable, harvestRoll, AFTER_HARVEST_GROWTH } from './plants.ts';
import { PLAN_INTERVAL, search, yieldIdleBlocker, destinationValid, planWork, workType, type SearchBudget, type NavigationGrid } from './work-planner.ts';
import { planCommandDrops, commitDrop, releaseWork, type DropPlan } from './work-release.ts';
import { blocksBuildingDuringTravel } from './travel-validation.ts';
import { validDiningPlace } from './dining.ts';
import { startTravel } from './movement.ts';
import { haulingWork } from './haul-aside.ts';
import { groundPile, planGroundPlacement } from './ground-placement.ts';
import { generateWorld } from './generation.ts';
import { adjacent, canStep, blockedCells, cellIndex, inBounds, routeToJob, routeToCell, interactionGoals } from './pathfinding.ts';
import { CARRY_CAPACITY, footprintCells, JOB_WOOD_COST, MAX_STACK } from './definitions.ts';
import { addGroundMaterial, deliveredStock, refreshStock, reservedDestination } from './materials.ts';
import { queryArea, validStorageSettings } from './designation.ts';
import { processNeeds, updateNeeds } from './needs.ts';
export { HUNGER_PER_TICK, REST_PER_TICK } from './needs.ts';
import type { AreaCommand, Cell, Command, CommandResult, DesignateCommand, Job, JobDiagnostic, JobKind, Pawn, RefusalCode, World } from './types.ts';
export { JOB_DURATION, JOB_WOOD_COST } from './definitions.ts';

const PATH_SEARCHES_PER_TICK = 8;
const JOB_LABEL: Readonly<Record<JobKind, string>> = { chop: 'abattage', harvest: 'récolte', cut: 'coupe de plante', sow: 'semis de riz', campfire: 'construction de feu de camp', wall: 'construction de mur', bed: 'construction de lit', table: 'construction de table', stool: 'construction de tabouret' };
const sameCell = (a: Cell, b: Cell): boolean => a.x === b.x && a.z === b.z;
const refusal = (code: RefusalCode, reason: string): CommandResult => ({ ok: false, code, reason });
function event(world: World, type: 'job' | 'need' | 'command', message: string): void {
  world.events.push({ tick: world.tick, type, message });
  if (world.events.length > 80) world.events.splice(0, world.events.length - 80);
}
export function createWorld(seed = 42, width = 32, height = 32): World { return generateWorld(seed, width, height); }

function wakePlanners(world: World): void {
  for (const pawn of world.pawns) if (pawn.jobId === null && pawn.haul === null) pawn.planCooldown = 0;
}

/** One authoritative command, evaluated against the state at execution, without
 * per-cell worker messages or repeated scans of every resource for every cell.
 */
function applyArea(world: World, command: AreaCommand, drops:DropPlan): CommandResult {
  const selection = queryArea(world, command);
  if (!selection.ok) return selection;
  if (!selection.cells.length) return refusal('missing-target', 'Aucune case compatible dans ce rectangle.');
  const creates = command.action === 'chop' || command.action === 'harvest' || command.action === 'cut' || command.action === 'stockpile' || command.action === 'growing';
  if (creates && !Number.isSafeInteger(world.nextId + selection.cells.length)) return refusal('invalid-command', 'Limite des identités atteinte.');
  let affected = selection.cells.length;
  if (command.action === 'chop' || command.action === 'harvest' || command.action === 'cut') {
    for (const index of selection.cells) world.jobs.push({ id: world.nextId++, kind: command.action, x: index % world.width, z: Math.floor(index / world.width), orientation: 0, footprint: 'standard', status: 'pending', reservedBy: null, progress: 0, escrow: { wood: 0, food: 0 } });
  } else if (command.action === 'growing') {
    world.growingZones = [...world.growingZones, { id: world.nextId++, cells: selection.cells, plant: 'rice', allowSow: true, allowCut: true }];
  } else if (command.action === 'remove-growing') {
    const selected = new Set(selection.cells);
    const changed = new Set(world.growingZones.filter(zone => zone.cells.some(c => selected.has(c))).map(z => z.id));
    cancelGrowingJobs(world, changed);
    world.growingZones = world.growingZones.map(zone => ({...zone, cells: zone.cells.filter(c => !selected.has(c))})).filter(z => z.cells.length);
    world.growingCursor = 0;
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
      for(const pawn of world.pawns)if(pawn.cooking?.storageId&&ids.has(pawn.cooking.storageId)){pawn.cooking.storageId=null;pawn.path=[];pawn.planCooldown=0;}
      for (const pawn of world.pawns) if (pawn.haul?.destination.type === 'stockpile' && ids.has(pawn.haul.destination.stockpileId)) releaseWork(world, pawn,drops);
    } else {
      const jobs = world.jobs.filter(job => footprintCells(job).some(cell => cells.has(cellIndex(world, cell.x, cell.z))));
      const ids = new Set(jobs.map(job => job.id)); affected = ids.size;
      const carriers = new Set(world.pawns.filter(pawn => pawn.haul?.destination.type === 'job' && ids.has(pawn.haul.destination.jobId)).map(pawn => pawn.id));
      const returning = world.piles.filter(pile => (pile.owner.type === 'job' && ids.has(pile.owner.jobId)) || (pile.owner.type === 'pawn' && carriers.has(pile.owner.pawnId))).length;
      // Reserve an upper bound before releasing any owner. Deposits may merge,
      // but exhausting IDs must never leave a partly removed construction/cargo.
      if (!Number.isSafeInteger(world.nextId + returning)) return refusal('invalid-command', 'Identités insuffisantes pour conserver les matériaux annulés.');
      for (const pawn of world.pawns) if ((pawn.jobId !== null && ids.has(pawn.jobId)) || (pawn.haul?.destination.type === 'job' && ids.has(pawn.haul.destination.jobId))) releaseWork(world, pawn,drops);
      world.jobs = world.jobs.filter(job => !ids.has(job.id));
      const delivered = world.piles.filter(pile => pile.owner.type === 'job' && ids.has(pile.owner.jobId));
      const byId = new Map(jobs.map(job => [job.id, job]));
      for (const pile of delivered) if (pile.owner.type === 'job' && !commitDrop(world,pile,byId.get(pile.owner.jobId)!,drops)) throw new Error('Preflighted cancellation has no drop cell.');
    }
  }
  wakePlanners(world); refreshStock(world);
  event(world, 'command', `Rectangle : ${affected} ${command.action === 'cancel' ? 'ordre(s) annulé(s)' : command.action === 'remove-stockpile' ? 'case(s) de réserve retirée(s)' : command.action === 'stockpile' ? 'case(s) de réserve créée(s)' : 'ordre(s) de collecte créé(s)'}.`);
  return { ok: true, affected, skipped: selection.skipped };
}

/** Pure shared rule used by preview and command execution. */
export function canDesignate(world: World, command: DesignateCommand): CommandResult {
  if (!command || !['chop', 'harvest', 'cut', 'wall', 'bed', 'table', 'stool', 'campfire'].includes(command.kind)) return refusal('invalid-command', 'Type de travail inconnu.');
  if (command.orientation !== undefined && (!Number.isInteger(command.orientation) || command.orientation < 0 || command.orientation > 3)) return refusal('invalid-command', 'Orientation invalide.');
  const cells = footprintCells(command);
  if (cells.some(cell => !inBounds(world, cell.x, cell.z))) return refusal('out-of-bounds', 'Empreinte hors de la carte.');
  if (world.jobs.some(job => footprintCells(job).some(cell => cells.some(target => sameCell(cell, target))))) return refusal('occupied', 'Un ordre existe déjà dans cette empreinte.');
  const resource = world.resources.find(candidate => sameCell(candidate, command));
  if (command.kind === 'chop' || command.kind === 'harvest' || command.kind === 'cut') {
    return resource && (command.kind === 'chop' ? resource.kind === 'tree' : isPlant(resource)) && (command.kind !== 'harvest' || harvestable(world, resource)) ? { ok: true } : refusal('incompatible-resource', 'Ressource incompatible.');
  }
  for (const cell of cells) {
    if (['water', 'rock'].includes(world.tiles[cellIndex(world, cell.x, cell.z)]!.terrain)
      || world.resources.some(item => sameCell(item, cell))
      || world.structures.some(item => footprintCells(item).some(target => sameCell(target, cell)))
      || world.pawns.some(item => sameCell(item, cell) || blocksBuildingDuringTravel(item,cell,world.tick))
      || world.stockpiles.some(item => sameCell(item, cell))
      || world.pawns.some(p => p.haul?.destination.type === 'aside' && sameCell(p.haul.destination, cell))
      || cookingCellReserved(world,cell)
      || world.piles.some(item => item.owner.type === 'ground' && sameCell(item.owner, cell))) {
      return refusal('occupied', 'Construction impossible : terrain, objet, zone de stockage ou colon dans l’empreinte.');
    }
  }
  return { ok: true };
}
export function applyCommand(world: World, command: Command): CommandResult {
  if (!command || typeof command !== 'object') return refusal('invalid-command', 'Commande invalide.');
  const drops=planCommandDrops(world,command);
  if(!drops)return refusal('occupied','Pas de place à proximité pour les matériaux libérés.');
  if(command.type==='bill-add'||command.type==='bill-update'||command.type==='bill-remove'||command.type==='bill-move') {
    const result=applyBillCommand(world,command,drops);if(result.ok){wakePlanners(world);refreshStock(world);}return result;
  }
  if (command.type === 'area') return applyArea(world, command,drops);
  if (command.type === 'refuel-policy') {
    const fire=campfire(world,command.structureId);
    if (!fire || typeof command.enabled!=='boolean') return refusal('invalid-command','Feu ou réglage de ravitaillement invalide.');
    if(!command.enabled)for(const pawn of world.pawns)if(pawn.haul?.destination.type==='fuel'&&pawn.haul.destination.structureId===fire.id)releaseWork(world,pawn,drops);
    fire.fuel!.autoRefuel=command.enabled;wakePlanners(world);refreshStock(world);return {ok:true};
  }
  if (command.type === 'growing-policy') {
    const zone = world.growingZones.find(z => z.id === command.zoneId);
    if (!zone || typeof command.allowSow !== 'boolean' || typeof command.allowCut !== 'boolean') return refusal('invalid-command', 'Zone ou réglages de culture invalides.');
    cancelGrowingJobs(world, new Set([zone.id]));
    world.growingZones = world.growingZones.map(z => z === zone ? {...z, allowSow: command.allowSow, allowCut: command.allowCut} : z);
    wakePlanners(world); return {ok:true};
  }
  if (command.type === 'assign-bed') {
    const bed = world.structures.find(item => item.id === command.bedId && item.kind === 'bed');
    const owner = world.pawns.find(item => item.id === command.pawnId);
    if (!bed || (command.pawnId !== null && !owner)) return refusal('missing-target', 'Lit ou colon introuvable.');
    for (const pawn of world.pawns) if (pawn.bedId === bed.id || pawn === owner) {
      if (pawn.need?.kind === 'sleep') releaseWork(world, pawn,drops);
      pawn.bedId = null; pawn.needCooldown = 0;
    }
    if (owner) owner.bedId = bed.id;
    return { ok: true };
  }
  if (command.type === 'priority') {
    if (!['gather', 'build', 'haul', 'grow', 'cook'].includes(command.work) || !Number.isInteger(command.value) || command.value < 0 || command.value > 4) return refusal('invalid-priority', 'La priorité doit être comprise entre 0 et 4.');
    const pawn = world.pawns.find(candidate => candidate.id === command.pawnId);
    if (!pawn) return refusal('missing-target', 'Colon introuvable.');
    pawn.priorities[command.work] = command.value;
    const job = world.jobs.find(candidate => candidate.id === pawn.jobId);
    if (command.value === 0 && ((job && workType(job) === command.work) || (pawn.haul && command.work === haulingWork(pawn.haul.destination)) || (pawn.cooking && command.work === 'cook'))) releaseWork(world, pawn,drops);
    pawn.planCooldown = 0; refreshStock(world); return { ok: true };
  }
  if (!['designate', 'cancel', 'stockpile'].includes(command.type)) return refusal('invalid-command', 'Commande inconnue.');
  if (!inBounds(world, command.x, command.z)) return refusal('out-of-bounds', 'Cellule hors de la carte.');
  if (command.type === 'stockpile') {
    if(cookingCellReserved(world,command))return refusal('occupied','Case réservée par un cuisinier.');
    if (world.pawns.some(p => p.haul?.destination.type === 'aside' && sameCell(p.haul.destination, command))) return refusal('occupied', 'Case réservée pour le dégagement des cultures.');
    if (typeof command.enabled !== 'boolean' || !validStorageSettings(command)) return refusal('invalid-storage', 'Filtres, priorité (1–4) ou capacité (1–75) invalides.');
    const existing = world.stockpiles.find(zone => sameCell(zone, command));
    if (!command.enabled) {
      if (!existing) return refusal('missing-target', 'Aucune cellule de stockage ici.');
      world.stockpiles.splice(world.stockpiles.indexOf(existing), 1);
    } else {
      if (growingZoneAt(world, cellIndex(world, command.x, command.z)) || ['water', 'rock'].includes(world.tiles[cellIndex(world, command.x, command.z)]!.terrain)
        || world.resources.some(item => sameCell(item, command))
        || [...world.structures, ...world.jobs].some(item => footprintCells(item).some(cell => sameCell(cell, command)))) return refusal('occupied', 'Stockage impossible sur cette cellule occupée ou infranchissable.');
      if (existing) {
        existing.filters = command.filters ? { ...command.filters } : existing.filters;
        existing.priority = command.priority ?? existing.priority;
        existing.capacity = command.capacity ?? existing.capacity;
      } else world.stockpiles.push({ id: world.nextId++, x: command.x, z: command.z, filters: { ...(command.filters ?? { wood: true, food: true }) }, priority: command.priority ?? 2, capacity: command.capacity ?? MAX_STACK });
    }
    for(const pawn of world.pawns)if(pawn.cooking?.storageId===existing?.id&&pawn.cooking){pawn.cooking.storageId=null;pawn.path=[];pawn.planCooldown=0;}
    // Re-evaluate pending capacity reservations atomically after the policy change.
    for (const pawn of world.pawns) if (pawn.haul?.destination.type === 'stockpile'
      && (!destinationValid(world, pawn) || pawn.haul.destination.stockpileId === existing?.id)) releaseWork(world, pawn,drops);
    wakePlanners(world); refreshStock(world); return { ok: true };
  }
  if (command.type === 'cancel') {
    const existing = world.jobs.find(job => footprintCells(job).some(cell => sameCell(cell, command)));
    if (!existing) return refusal('missing-target', 'Aucun ordre à annuler ici.');
    for (const pawn of world.pawns) if (pawn.jobId === existing.id || (pawn.haul?.destination.type === 'job' && pawn.haul.destination.jobId === existing.id)) releaseWork(world, pawn,drops);
    world.jobs.splice(world.jobs.indexOf(existing), 1);
    const delivered = world.piles.filter(pile => pile.owner.type === 'job' && pile.owner.jobId === existing.id);
    for (const pile of delivered) if(!commitDrop(world,pile,existing,drops)) throw new Error('Preflighted cancellation has no drop cell.');
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
  const enabled = world.pawns.some(pawn => pawn.priorities[workType(job)] > 0);
  return { code: enabled ? 'ready' : 'waiting-worker', reason: enabled ? 'Prêt ; attend un colon disponible et un accès.' : 'Travail désactivé pour tous les colons.', delivered, required };
}
export function queryPawnStatus(world: World, pawn: Pawn): { code: string; reason: string } {
  if (pawn.need?.kind === 'eat') return { code: pawn.need.phase, reason: pawn.need.phase === 'pickup' ? 'Va chercher une portion réservée.' : pawn.need.phase === 'choose-spot' ? 'Cherche une place pour manger sa portion.' : pawn.need.phase === 'travel' ? 'Porte sa portion vers sa place réservée.' : `Mange la portion tenue en main (${Math.floor(pawn.need.progress / 50 * 100)} %).` };
  if (pawn.need?.kind === 'sleep') return { code: pawn.need.phase, reason: pawn.need.phase === 'travel' ? pawn.need.bedId === null ? 'Libère le lit et cherche une place au sol.' : 'Se rend à son lit réservé.' : pawn.need.bedId === null ? 'Dort au sol ; aucun lit utilisable ou épuisement.' : 'Dort dans son lit.' };
  if (pawn.haul) return { code: pawn.haul.phase, reason: pawn.haul.destination.type === 'aside' ? `Libère les cultures : ${pawn.haul.quantity} unités à déplacer hors des champs.` : pawn.haul.phase === 'pickup' ? `Va prélever ${pawn.haul.quantity} unités réservées.` : `Porte ${pawn.haul.quantity} unités vers ${pawn.haul.destination.type === 'job' ? 'un chantier' : 'le stockage'}.` };
  if (pawn.jobId !== null) return { code: 'working', reason: pawn.state === 'moving' ? 'Se rend à son travail.' : 'Travaille sur sa cible.' };
  if (pawn.state === 'sleeping') return { code: 'sleeping', reason: 'Se repose.' };
  if (pawn.state === 'hungry') return { code: 'hungry', reason: 'Faim critique ; attend de la nourriture ou une récolte accessible.' };
  return { code: world.jobs.length ? 'waiting' : 'idle', reason: world.jobs.length ? 'Aucun travail actuellement admissible : priorités, matériaux ou accès à vérifier.' : 'Aucun travail admissible actuellement.' };
}

function moveToward(world: World, pawn: Pawn, target: Cell, allowTarget: boolean, getBlocked: NavigationGrid, occupied: Set<number>, budget: SearchBudget, exact = false): void {
  pawn.state = 'moving'; if (pawn.moveCooldown > 0) return;
  const blocked = getBlocked();
  let next = pawn.path[0];
  if (!next || !canStep(world,pawn,next,blocked,occupied)) {
    if (pawn.planCooldown > 0) return;
    const cells = 'kind' in target ? footprintCells(target as Job) : [target];
    const goals = exact ? new Set([cellIndex(world, target.x, target.z)]) : interactionGoals(world, cells);
    if (!exact && !allowTarget) for (const cell of cells) goals.delete(cellIndex(world, cell.x, cell.z));
    const reachable = search(world, pawn, blocked, occupied, budget, goals); if (!reachable) return;
    const path = exact ? routeToCell(world, target, reachable) : routeToJob(world, target, reachable, allowTarget); pawn.planCooldown = PLAN_INTERVAL;
    if (path === null) {
      const staticReachable = search(world, pawn, blocked, new Set(), budget, goals);
      if (staticReachable) yieldIdleBlocker(world, pawn, target, blocked, occupied, staticReachable, allowTarget, exact);
      releaseWork(world, pawn); return;
    }
    pawn.path = path; next = path[0];
  }
  if (next) { startTravel(world, pawn, next); occupied.add(cellIndex(world, pawn.x, pawn.z)); pawn.path.shift(); }
}
function completeJob(world: World, pawn: Pawn, job: Job): void {
  if (job.kind === 'chop' || job.kind === 'harvest' || job.kind === 'cut') {
    const resource = world.resources.find(item => sameCell(item, job));
    if (!resource) { releaseWork(world, pawn); return; }
    if (job.kind === 'harvest' && !harvestable(world, resource)) { releaseWork(world, pawn); return; }
    const roll = job.kind !== 'chop' ? harvestRoll(world, resource) : {quantity: resource.amount, rng: world.rng};
    if (roll.quantity > 0) {
      const item = job.kind === 'chop' ? 'wood' : resource.kind === 'rice' ? 'rice' : world.foodRules === 'legacy' ? 'legacy-portion' : 'berries';
      const placements=planGroundPlacement(world,roll.quantity,job,item);
      if (!placements || world.piles.length + placements.length > 32768 || !Number.isSafeInteger(world.nextId + placements.length)) {
        job.progress = jobDuration(world, job) - 1; releaseWork(world, pawn); return;
      }
      addGroundMaterial(world,job.kind==='chop'?'wood':'food',roll.quantity,job,item);
    }
    world.rng = roll.rng;
    if (job.kind === 'harvest' && resource.kind === 'berries') {
      resource.growth = AFTER_HARVEST_GROWTH; resource.growthTick = world.tick;
    } else world.resources = world.resources.filter(r => r.id !== resource.id);
    if (job.kind !== 'chop' && roll.quantity > 0) event(world, 'job', `${pawn.name} a récolté ${roll.quantity} ${resource.kind === 'rice' ? 'riz' : 'baies'}.`);
  } else if (job.kind === 'sow') {
    finishSowing(world, job);
  } else {
    world.piles = world.piles.filter(pile => pile.owner.type !== 'job' || pile.owner.jobId !== job.id);
    world.structures.push({ ...(job.kind==='campfire'?{fuel:newCampfireFuel(),bills:[]}:{}), id: world.nextId++, kind: job.kind, x: job.x, z: job.z, orientation: job.orientation, footprint: job.footprint });
  }
  world.jobs.splice(world.jobs.indexOf(job), 1); pawn.jobId = null; pawn.path = []; pawn.state = 'idle'; pawn.planCooldown = 0;
  event(world, 'job', `${pawn.name} a terminé le travail : ${JOB_LABEL[job.kind]}.`); wakePlanners(world);
}
export function stepWorld(world: World, ticks = 1, diagnostics?:import('./work-planner.ts').SearchStats): void {
  if (!Number.isInteger(ticks) || ticks < 0 || ticks > 100000) throw new Error('Tick count must be an integer between 0 and 100000.');
  for (let step = 0; step < ticks; step++) {
    world.tick++;
    burnFuel(world);
    scheduleGrowing(world);
    // Build only if this tick actually plans or moves. No cross-tick cache can hide
    // a command, edited terrain, restored save, or a wall that changed between calls.
    let blocked: Uint8Array | undefined;
    const getBlocked: NavigationGrid = () => blocked ??= blockedCells(world);
    const occupied = new Set(world.pawns.flatMap(pawn => [cellIndex(world,pawn.x,pawn.z), ...(pawn.motion && pawn.motion.end > world.tick ? [cellIndex(world,pawn.motion.from.x,pawn.motion.from.z)] : [])]));
    const budget: SearchBudget = { remaining: PATH_SEARCHES_PER_TICK, pairs: 32768,stats:diagnostics };
    for (let offset = 0; offset < world.pawns.length; offset++) {
      const pawn = world.pawns[((world.tick - 1) + offset) % world.pawns.length]!;
      pawn.moveCooldown = Math.max(0, (pawn.motion?.end ?? world.tick) - world.tick); if (pawn.planCooldown > 0) pawn.planCooldown--;
      updateNeeds(world, pawn);
      if(pawn.need?.kind==='eat' && pawn.need.dining && !validDiningPlace(world,pawn.need.dining)) {pawn.need.phase='choose-spot';pawn.need.dining=null;pawn.need.progress=0;pawn.path=[];pawn.state='moving';}
      if (pawn.moveCooldown > 0) { pawn.state = pawn.jobId !== null || pawn.haul || pawn.need || pawn.cooking ? 'moving' : 'idle'; continue; }
      if (processNeeds(world, pawn, {
        search: (ignorePawns = false, goals) => search(world, pawn, getBlocked(), ignorePawns ? new Set() : occupied, budget, goals),
        move: (target, exact) => moveToward(world, pawn, target, true, getBlocked, occupied, budget, exact),
        release: () => releaseWork(world, pawn),
        event: message => event(world, 'need', message),
      })) continue;
      if (pawn.jobId === null && pawn.haul === null && !pawn.cooking && pawn.planCooldown === 0) planWork(world, pawn, getBlocked, occupied, budget);
      if (pawn.haul) { processHaul(world, pawn, (target, allow) => moveToward(world, pawn, target, allow, getBlocked, occupied, budget), () => wakePlanners(world)); continue; }
      if(pawn.cooking) {processCooking(world,pawn,{
        search:(ignorePawns=false,goals)=>search(world,pawn,getBlocked(),ignorePawns?new Set():occupied,budget,goals),
        move:(target,exact)=>moveToward(world,pawn,target,true,getBlocked,occupied,budget,exact),
        release:()=>releaseWork(world,pawn),event:message=>event(world,'job',message),
      });continue;}
      const job = world.jobs.find(candidate => candidate.id === pawn.jobId); if (!job) continue;
      if (job.growingZoneId !== undefined && !growingJobValid(world, job)) { releaseWork(world, pawn); world.jobs = world.jobs.filter(j => j.id !== job.id); continue; }
      if (job.kind === 'sow' && groundPile(world, job)) { releaseWork(world, pawn); continue; }
      const cells = footprintCells(job);
      if (cells.some(cell => adjacent(pawn, cell)) && !cells.some(cell => sameCell(pawn, cell))) {
        pawn.path = []; pawn.state = 'working'; job.progress++;
        if (job.progress >= jobDuration(world, job)) completeJob(world, pawn, job);
      } else moveToward(world, pawn, job, false, getBlocked, occupied, budget);
    }
    refreshStock(world);
  }
}
