import { autoRoofRooms, designateRoofArea, scheduleRoofs, reconcileRoofJobs, reconcileRoofSupport, finishRoofJob } from './roofing.ts';
import { isRoofArea, isRoofJob, roofJobWanted, RoofContext } from './roof-rules.ts';
import { applyDoorCommand, updateDoors } from './doors.ts';
import { builtDoorState } from './door-rules.ts';
import { taskWork } from './production-recipes.ts';
import { advanceMining } from './mining.ts';
import { advanceFurniture } from './furniture-transfer.ts';
import { minifiable, furnitureIntentAt, furnitureSourceCells, packedAt } from './furniture-rules.ts';
import { designateUninstall, installCommand } from './furniture-commands.ts';
import { deconstructionAt, deconstructionAvailable, designateDeconstruction } from './deconstruction-rules.ts';
import { finishDeconstruction } from './deconstruction.ts';
import { advancePriorityWork } from './priority-work.ts';
import { leaveTransitCell } from './transit-exit.ts';
import { removeZonesForPlan } from './construction-zones.ts';
import { occupancyOf, occupies } from './occupancy.ts';
import { constructionHaulId, constructionSiteFree, constructionWorkTarget, isConstruction } from './construction-rules.ts';
import { advanceOrders, applyOrderCommand, reconcileOrders } from './player-orders.ts';
import { gatherResource, clearingDuration } from './gathering.ts';
import { processRecreation } from './recreation.ts';
import { applyScheduleCommand } from './schedule.ts';
import { applyFoodPolicyCommand } from './food-policy.ts';
import { expireFood } from './food-expiration.ts';
export { queryJobStatus, queryPawnStatus } from './diagnostics.ts';
import { processCooking } from './cooking.ts';
import { WorkEnvironmentCache, type WorkEnvironment } from './work-environment.ts';
import { applyBillCommand } from './cooking-commands.ts';
import { cookingCellReserved } from './cooking-bills.ts';
import { burnFuel, campfire, newCampfireFuel } from './fuel.ts';
import { processHaul } from './hauling.ts';
import { scheduleGrowing, cancelGrowingJobs, growingJobValid, finishSowing, jobDuration, growingZoneAt } from './farming.ts';
import { isPlant, harvestable } from './plants.ts';
import { search, searchCandidates, destinationValid, planWork, workType, type SearchBudget, type NavigationGrid } from './work-planner.ts';
import { planCommandDrops, commitDrop, releaseWork, type DropPlan } from './work-release.ts';
import { validDiningPlace } from './dining.ts';
import { CIVIL_TRANSIT_BLOCKERS, moveToward } from './travel.ts';
import { haulingWork } from './haul-aside.ts';
import { groundPile } from './ground-placement.ts';
import { generateWorld } from './generation.ts';
import { adjacent, blockedCells, cellIndex, inBounds } from './pathfinding.ts';
import { CARRY_CAPACITY, footprintCells, MAX_STACK } from './definitions.ts';
import { constructionSupplied, validConstructionMaterial } from './construction-materials.ts';
import { refreshStock } from './materials.ts';
import { queryArea, validStorageSettings } from './designation.ts';
import { processNeeds, updateNeeds } from './needs.ts';
export { HUNGER_PER_TICK, REST_PER_TICK } from './needs.ts';
import type { AreaCommand, Cell, Command, CommandResult, DesignateCommand, Job, JobKind, Pawn, RefusalCode, World } from './types.ts';
export { JOB_DURATION, JOB_WOOD_COST } from './definitions.ts';

const PATH_SEARCHES_PER_TICK = 8;
const JOB_LABEL: Readonly<Record<JobKind, string>> = { 'build-roof':'pose de toit', 'remove-roof':'retrait de toit', door:'construction de porte', stonecutter:'construction de table de taille de pierre', mine:'minage', uninstall:'désinstallation', install:'réinstallation', deconstruct: 'déconstruction', chop: 'abattage', harvest: 'récolte', cut: 'coupe de plante', sow: 'semis de riz', horseshoes: 'construction de piquet de fers à cheval', campfire: 'construction de feu de camp', wall: 'construction de mur', bed: 'construction de lit', table: 'construction de table', stool: 'construction de tabouret' };
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
  const creates = command.action === 'mine' || command.action === 'deconstruct' || command.action === 'chop' || command.action === 'harvest' || command.action === 'cut' || command.action === 'stockpile' || command.action === 'growing';
  if (creates && !Number.isSafeInteger(world.nextId + selection.cells.length)) return refusal('invalid-command', 'Limite des identités atteinte.');
  let affected = selection.cells.length;
  if (isRoofArea(command.action)) { designateRoofArea(world, selection.cells, command.action); } else if (command.action === 'deconstruct') {
    const selected = new Set(selection.cells);
    const targets = world.structures.filter(s => footprintCells(s).some(c => selected.has(cellIndex(world,c.x,c.z))));
    for (const target of targets) designateDeconstruction(world,target);
    affected = targets.length;
  } else if(command.action==='haul-chunks') {
    const selected=new Set(selection.cells);for(const p of world.piles)if(p.kind==='chunk'&&p.owner.type==='ground'&&selected.has(cellIndex(world,p.owner.x,p.owner.z)))p.haulRequested=true;
  } else if (command.action === 'mine' || command.action === 'chop' || command.action === 'harvest' || command.action === 'cut') {
    for (const index of selection.cells) world.jobs.push({ id: world.nextId++, kind: command.action, x: index % world.width, z: Math.floor(index / world.width), orientation: 0, footprint: 'standard', status: 'pending', reservedBy: null, progress: 0, escrow: { wood: 0, food: 0 } });
  } else if (command.action === 'growing') {
    world.growingZones = [...world.growingZones, { id: world.nextId++, cells: selection.cells, plant: 'rice', allowSow: true, allowCut: true }];
  } else if (command.action === 'remove-growing') {
    const selected = new Set(selection.cells);
    const changed = new Set(world.growingZones.filter(zone => zone.cells.some(c => selected.has(c))).map(z => z.id));
    cancelGrowingJobs(world, changed,drops);
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
      for(const pawn of world.pawns)if(pawn.cooking?.storageId&&ids.has(pawn.cooking.storageId)){pawn.cooking.storageId=null;delete pawn.cooking.storageQuantity;pawn.path=[];pawn.planCooldown=0;}
      for (const pawn of world.pawns) if (pawn.haul?.destination.type === 'stockpile' && ids.has(pawn.haul.destination.stockpileId)) releaseWork(world, pawn,drops);
    } else {
      const jobs = world.jobs.filter(job => [...footprintCells(job),...furnitureSourceCells(world,job)].some(cell => cells.has(cellIndex(world, cell.x, cell.z))));
      const ids = new Set(jobs.map(job => job.id)); affected = ids.size;
      const carriers = new Set(world.pawns.filter(pawn => pawn.haul && ids.has(constructionHaulId(pawn.haul.destination) ?? -1)).map(pawn => pawn.id));
      const returning = world.piles.filter(pile => (pile.owner.type === 'job' && ids.has(pile.owner.jobId)) || (pile.owner.type === 'pawn' && carriers.has(pile.owner.pawnId))).length;
      // Reserve an upper bound before releasing any owner. Deposits may merge,
      // but exhausting IDs must never leave a partly removed construction/cargo.
      if (!Number.isSafeInteger(world.nextId + returning)) return refusal('invalid-command', 'Identités insuffisantes pour conserver les matériaux annulés.');
      for (const pawn of world.pawns) if ((pawn.jobId !== null && ids.has(pawn.jobId)) || (pawn.haul && ids.has(constructionHaulId(pawn.haul.destination) ?? -1))) releaseWork(world, pawn,drops);
      world.jobs = world.jobs.filter(job => !ids.has(job.id));
      const delivered = world.piles.filter(pile => pile.owner.type === 'job' && ids.has(pile.owner.jobId));
      const byId = new Map(jobs.map(job => [job.id, job]));
      for (const pile of delivered) if (pile.owner.type === 'job' && !commitDrop(world,pile,byId.get(pile.owner.jobId)!,drops)) throw new Error('Preflighted cancellation has no drop cell.');
    }
  }
  wakePlanners(world); refreshStock(world);
  event(world, 'command', `Rectangle : ${affected} ${command.action === 'cancel' ? 'ordre(s) annulé(s)' : command.action === 'remove-stockpile' ? 'case(s) de réserve retirée(s)' : command.action === 'stockpile' ? 'case(s) de réserve créée(s)' : command.action==='deconstruct' ? 'ordre(s) de déconstruction créé(s)' : isRoofArea(command.action) ? 'case(s) de toiture désignée(s)' : 'ordre(s) de collecte créé(s)'}.`);
  return { ok: true, affected, skipped: selection.skipped };
}

/** Pure shared rule used by preview and command execution. */
export function canDesignate(world: World, command: DesignateCommand): CommandResult {
  if (!command || !['door','stonecutter', 'mine', 'uninstall', 'deconstruct', 'chop', 'harvest', 'cut', 'wall', 'bed', 'table', 'stool', 'campfire', 'horseshoes'].includes(command.kind)) return refusal('invalid-command', 'Type de travail inconnu.');
  if(command.kind==='door'&&command.orientation!==undefined&&command.orientation!==0)return refusal('invalid-command','La porte s’oriente automatiquement.');
  if (command.orientation !== undefined && (!Number.isInteger(command.orientation) || command.orientation < 0 || command.orientation > 3)) return refusal('invalid-command', 'Orientation invalide.');
  if(!validConstructionMaterial(command.kind,command.material))return refusal('invalid-command','Matériau incompatible avec cette construction.');
  const target = (command.kind==='deconstruct'||command.kind==='uninstall')?deconstructionAt(world,command):undefined;
  if((command.kind==='deconstruct'||command.kind==='uninstall')&&!target)return refusal('missing-target','Aucun bâtiment à déconstruire ici.');
  if(target&&world.jobs.some(j=>j.furniture?.structureId===target.id))return refusal('occupied','Ce meuble a déjà un ordre de déplacement.');
  if(command.kind==='uninstall'&&!minifiable(target!.kind))return refusal('incompatible-resource','Ce bâtiment ne peut pas être désinstallé.');
  const cells = footprintCells(target??command);
  if (cells.some(cell => !inBounds(world, cell.x, cell.z))) return refusal('out-of-bounds', 'Empreinte hors de la carte.');
  if (world.jobs.some(job => !isRoofJob(job) && footprintCells(job).some(cell => cells.some(target => sameCell(cell, target))))) return refusal('occupied', 'Un ordre existe déjà dans cette empreinte.');
  if(command.kind==='deconstruct'||command.kind==='uninstall')return {ok:true};
  if(command.kind==='mine')return world.tiles[cellIndex(world,command.x,command.z)]!.terrain==='rock'?{ok:true}:refusal('incompatible-resource','Désigner un massif rocheux à miner.');
  const resource = world.resources.find(candidate => sameCell(candidate, command));
  if (command.kind === 'chop' || command.kind === 'harvest' || command.kind === 'cut') {
    return resource && (command.kind === 'chop' ? resource.kind === 'tree' : isPlant(resource)) && (command.kind !== 'harvest' || harvestable(world, resource)) ? { ok: true } : refusal('incompatible-resource', 'Ressource incompatible.');
  }
  for (const cell of cells) {
    if (['water', 'rock'].includes(world.tiles[cellIndex(world, cell.x, cell.z)]!.terrain)
      || world.resources.some(item => item.kind==='rock'&&sameCell(item, cell))
      || world.structures.some(item => footprintCells(item).some(target => sameCell(target, cell)))
      || world.pawns.some(p => p.haul?.destination.type === 'aside' && sameCell(p.haul.destination, cell))
      || cookingCellReserved(world,cell)) {
      return refusal('occupied', 'Construction impossible : terrain, ouvrage ou réservation incompatible dans l’empreinte.');
    }
  }
  return { ok: true };
}
export function applyCommand(world: World, command: Command): CommandResult {
  const result=applyCommandInternal(world,command);
  if(result.ok)reconcileOrders(world);
  return result;
}
function applyCommandInternal(world: World, command: Command): CommandResult {
  if (!command || typeof command !== 'object') return refusal('invalid-command', 'Commande invalide.');
  if(command.type==='order-job'||command.type==='order-cook'||command.type==='order-haul'||command.type==='clear-orders')return applyOrderCommand(world,command);
  if (command.type === 'schedule-paint' || command.type === 'schedule-replace') return applyScheduleCommand(world, command);
  if (command.type === 'food-policy-create' || command.type === 'food-policy-update' || command.type === 'food-policy-delete' || command.type === 'food-policy-assign') return applyFoodPolicyCommand(world, command);
  if(command.type==='door-policy')return applyDoorCommand(world,command);
  if(command.type==='install')return installCommand(world,command);
  const drops=planCommandDrops(world,command);
  if(!drops)return refusal('occupied','Pas de place à proximité pour les matériaux libérés.');
  if(command.type==='bill-add'||command.type==='bill-update'||command.type==='bill-remove'||command.type==='bill-move') {
    const result=applyBillCommand(world,command,drops);if(result.ok){wakePlanners(world);refreshStock(world);}return result;
  }
  if (command.type === 'area') return applyArea(world, command,drops);
  if (command.type === 'refuel-policy') {
    const fire=campfire(world,command.structureId);
    if (!fire || typeof command.enabled!=='boolean') return refusal('invalid-command','Feu ou réglage de ravitaillement invalide.');
    if(!command.enabled)for(const pawn of world.pawns)if(pawn.haul?.destination.type==='fuel'&&!pawn.haul.destination.forced&&pawn.haul.destination.structureId===fire.id)releaseWork(world,pawn,drops);
    fire.fuel!.autoRefuel=command.enabled;wakePlanners(world);refreshStock(world);return {ok:true};
  }
  if (command.type === 'growing-policy') {
    const zone = world.growingZones.find(z => z.id === command.zoneId);
    if (!zone || typeof command.allowSow !== 'boolean' || typeof command.allowCut !== 'boolean') return refusal('invalid-command', 'Zone ou réglages de culture invalides.');
    cancelGrowingJobs(world, new Set([zone.id]),drops);
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
    if (!['mine', 'gather', 'build', 'haul', 'grow', 'cook', 'craft'].includes(command.work) || !Number.isInteger(command.value) || command.value < 0 || command.value > 4) return refusal('invalid-priority', 'La priorité doit être comprise entre 0 et 4.');
    const pawn = world.pawns.find(candidate => candidate.id === command.pawnId);
    if (!pawn) return refusal('missing-target', 'Colon introuvable.');
    pawn.priorities[command.work] = command.value;
    const job = world.jobs.find(candidate => candidate.id === pawn.jobId);
    if (command.value === 0 && ((job && workType(job) === command.work && pawn.orders.active===null) || (pawn.haul && pawn.orders.active!=='haul' && command.work === haulingWork(pawn.haul.destination)) || (pawn.cooking && pawn.orders.active!=='cook' && command.work === taskWork(pawn.cooking)))) releaseWork(world, pawn,drops);
    pawn.planCooldown = 0; refreshStock(world); return { ok: true };
  }
  if (!['designate', 'cancel', 'stockpile'].includes(command.type)) return refusal('invalid-command', 'Commande inconnue.');
  if (!inBounds(world, command.x, command.z)) return refusal('out-of-bounds', 'Cellule hors de la carte.');
  if (command.type === 'stockpile') {
    if(cookingCellReserved(world,command))return refusal('occupied','Case réservée par un cuisinier.');
    if (world.pawns.some(p => p.haul?.destination.type === 'aside' && !p.haul.whole && sameCell(p.haul.destination, command))) return refusal('occupied', 'Case réservée pour le dégagement des cultures.');
    if (typeof command.enabled !== 'boolean' || !validStorageSettings(command)) return refusal('invalid-storage', 'Filtres, priorité (1–4) ou capacité (1–75) invalides.');
    const existing = world.stockpiles.find(zone => sameCell(zone, command));
    if (!command.enabled) {
      if (!existing) return refusal('missing-target', 'Aucune cellule de stockage ici.');
      world.stockpiles.splice(world.stockpiles.indexOf(existing), 1);
    } else {
      if (growingZoneAt(world, cellIndex(world, command.x, command.z)) || ['water', 'rock'].includes(world.tiles[cellIndex(world, command.x, command.z)]!.terrain)
        || world.resources.some(item => sameCell(item, command))
        || [...world.structures, ...world.jobs].some(item => !['deconstruct','uninstall'].includes(item.kind)&&occupancyOf('furniture' in item?item.furniture?.kind??item.kind:item.kind)?.zones!==true&&occupies(item,command))) return refusal('occupied', 'Stockage impossible sur cette cellule occupée ou infranchissable.');
      if (existing) {
        existing.filters = command.filters ? { ...command.filters } : existing.filters;
        existing.priority = command.priority ?? existing.priority;
        existing.capacity = command.capacity ?? existing.capacity;
      } else world.stockpiles.push({ id: world.nextId++, x: command.x, z: command.z, filters: { ...(command.filters ?? { wood: true, food: true }) }, priority: command.priority ?? 2, capacity: command.capacity ?? MAX_STACK });
    }
    for(const pawn of world.pawns)if(pawn.cooking?.storageId===existing?.id&&pawn.cooking){pawn.cooking.storageId=null;delete pawn.cooking.storageQuantity;pawn.path=[];pawn.planCooldown=0;}
    // Re-evaluate pending capacity reservations atomically after the policy change.
    for (const pawn of world.pawns) if (pawn.haul?.destination.type === 'stockpile'
      && (!destinationValid(world, pawn) || pawn.haul.destination.stockpileId === existing?.id)) releaseWork(world, pawn,drops);
    for(const p of world.pawns)if(p.haul?.whole&&p.haul.destination.type==='aside'&&!destinationValid(world,p))releaseWork(world,p,drops);
    wakePlanners(world); refreshStock(world); return { ok: true };
  }
  if (command.type === 'cancel') {
    const existing = world.jobs.find(job => footprintCells(job).some(cell => sameCell(cell, command)))??furnitureIntentAt(world,command);
    if (!existing) return refusal('missing-target', 'Aucun ordre à annuler ici.');
    if(isRoofJob(existing)){designateRoofArea(world,[cellIndex(world,command.x,command.z)],'ignore-roof');wakePlanners(world);return {ok:true};}
    for (const pawn of world.pawns) if (pawn.jobId === existing.id || (pawn.haul && constructionHaulId(pawn.haul.destination) === existing.id)) releaseWork(world, pawn,drops);
    world.jobs.splice(world.jobs.indexOf(existing), 1);
    const delivered = world.piles.filter(pile => pile.owner.type === 'job' && pile.owner.jobId === existing.id);
    for (const pile of delivered) if(!commitDrop(world,pile,existing,drops)) throw new Error('Preflighted cancellation has no drop cell.');
    event(world, 'command', 'Ordre annulé ; les matériaux restent sur place.');
    wakePlanners(world); refreshStock(world); return { ok: true };
  }
  const result = canDesignate(world, command);
  if (!result.ok) return result;
  if(command.kind==='uninstall') {
    if(!Number.isSafeInteger(world.nextId+1))return refusal('invalid-command','Limite des identités atteinte.');
    designateUninstall(world,deconstructionAt(world,command)!);wakePlanners(world);return {ok:true};
  }
  if(command.kind==='deconstruct') {
    if(!Number.isSafeInteger(world.nextId+1))return refusal('invalid-command','Limite des identités atteinte.');
    designateDeconstruction(world,deconstructionAt(world,command)!);
    wakePlanners(world);event(world,'command','Bâtiment désigné pour déconstruction.');return {ok:true};
  }
  removeZonesForPlan(world,command,drops);
  world.jobs.push({ id: world.nextId++, kind: command.kind, ...(isConstruction(command)?{construction:'blueprint' as const,material:command.material??'wood' as const}:{}), x: command.x, z: command.z, orientation: command.orientation ?? 0, footprint: 'standard', status: 'pending', reservedBy: null, progress: 0, escrow: { wood: 0, food: 0 } });
  refreshStock(world); wakePlanners(world); event(world, 'command', `Nouvel ordre : ${JOB_LABEL[command.kind]} (${command.x}, ${command.z}).`); return { ok: true };
}

function completeJob(world: World, pawn: Pawn, job: Job): void {
  if (job.kind === 'chop' || job.kind === 'harvest' || job.kind === 'cut') {
    const resource = world.resources.find(item => sameCell(item, job));
    if (!resource) { releaseWork(world, pawn); return; }
    if (job.kind === 'harvest' && !harvestable(world, resource)) { releaseWork(world, pawn); return; }
    const quantity=gatherResource(world,resource,job.kind);
    if(quantity===null){job.progress=jobDuration(world,job)-1;releaseWork(world,pawn);return;}
    if(job.kind!=='chop'&&quantity>0)event(world,'job',`${pawn.name} a récolté ${quantity} ${resource.kind==='rice'?'riz':'baies'}.`);
  } else if (isRoofJob(job)) {
    finishRoofJob(world,job);
  } else if (job.kind === 'deconstruct') {
    const target=world.structures.find(s=>s.id===job.deconstruction?.structureId);
    if(!finishDeconstruction(world,pawn,job)){releaseWork(world,pawn);return;}
    if(target?.kind==='wall'||target?.kind==='door')reconcileRoofSupport(world,false,target);
  } else if (job.kind==='mine'||job.kind==='install'||job.kind==='uninstall') {
    return; // Furniture transfers are processed by their physical state machine.
  } else if (job.kind === 'sow') {
    finishSowing(world, job);
  } else {
    if(!constructionSupplied(world,job)||!constructionSiteFree(world,job,pawn.id)){job.progress=jobDuration(world,job)-1;releaseWork(world,pawn);return;}
    world.piles = world.piles.filter(pile => pile.owner.type !== 'job' || pile.owner.jobId !== job.id);
    world.structures.push({ ...(job.kind==='door'?{door:builtDoorState(world,job)}:{}),...(job.material?{material:job.material}:{}),...(job.kind==='campfire'?{fuel:newCampfireFuel(),bills:[]}:job.kind==='stonecutter'?{bills:[]}:{}), id: world.nextId++, kind: job.kind as import('./types.ts').StructureKind, x: job.x, z: job.z, orientation: job.orientation, footprint: job.footprint });
  }
  if(job.kind==='wall'||job.kind==='door')autoRoofRooms(world,job);
  const jobIndex=world.jobs.indexOf(job);if(jobIndex>=0)world.jobs.splice(jobIndex,1); pawn.jobId = null; pawn.path = []; pawn.state = 'idle'; pawn.planCooldown = 0;
  event(world, 'job', `${pawn.name} a terminé le travail : ${JOB_LABEL[job.kind]}.`); wakePlanners(world);
}
const workEnvironments=new WeakMap<World,WorkEnvironmentCache>();
export function stepWorld(world: World, ticks = 1, diagnostics?:import('./work-planner.ts').SearchStats): void {
  if (!Number.isInteger(ticks) || ticks < 0 || ticks > 100000) throw new Error('Tick count must be an integer between 0 and 100000.');
  for (let step = 0; step < ticks; step++) {
    world.tick++;
    expireFood(world);
    burnFuel(world);
    updateDoors(world);
    scheduleGrowing(world);
    scheduleRoofs(world);
    // Build only if this tick actually plans or moves. No cross-tick cache can hide
    // a command, edited terrain, restored save, or a wall that changed between calls.
    let blocked: Uint8Array | undefined;
    let roofs: RoofContext | undefined;
    let environment:WorkEnvironment|undefined;
    const getEnvironment=()=>{
      if(environment)return environment;
      let cache=workEnvironments.get(world);if(!cache){cache=new WorkEnvironmentCache();workEnvironments.set(world,cache);}
      return environment=cache.read(world);
    };
    const getRoofs = () => roofs ??= new RoofContext(world);
    const getBlocked: NavigationGrid = () => blocked ??= blockedCells(world);
    const occupied = CIVIL_TRANSIT_BLOCKERS;
    const budget: SearchBudget = { remaining: PATH_SEARCHES_PER_TICK, pairs: 32768,stats:diagnostics };
    for (let offset = 0; offset < world.pawns.length; offset++) {
      const pawn = world.pawns[((world.tick - 1) + offset) % world.pawns.length]!;
      pawn.moveCooldown = Math.max(0, (pawn.motion?.end ?? world.tick) - world.tick); if (pawn.planCooldown > 0) pawn.planCooldown--;
      updateNeeds(world, pawn);
      if(pawn.need?.kind==='eat' && pawn.need.dining && !validDiningPlace(world,pawn.need.dining)) {pawn.need.phase='choose-spot';pawn.need.dining=null;pawn.need.progress=0;pawn.path=[];pawn.state='moving';}
      if (pawn.moveCooldown > 0) { pawn.state = pawn.jobId !== null || pawn.haul || pawn.need || pawn.cooking || pawn.recreation.task ? 'moving' : 'idle'; continue; }
      const needsContext = {
        search: (goals?: ReadonlySet<number>) => search(world, pawn, getBlocked(), occupied, budget, goals),
        move: (target: Cell, exact: boolean) => moveToward(world, pawn, target, true, getBlocked, budget, exact),
        release: () => releaseWork(world, pawn),
        event: (message: string) => event(world, 'need', message),
      };
      if (leaveTransitCell(world,pawn,getBlocked,budget)) continue;
      if (advanceOrders(world,pawn,getBlocked,budget)) continue;
      if (advancePriorityWork(world,pawn,getBlocked,budget)) continue;
      if (processNeeds(world, pawn, needsContext) || pawn.orders.active===null&&processRecreation(world, pawn, needsContext)) continue;
      if (pawn.jobId === null && pawn.haul === null && !pawn.cooking && pawn.planCooldown === 0) planWork(world, pawn, getBlocked, occupied, budget);
      if (pawn.haul) { const refueling=pawn.haul.destination.type==='fuel';processHaul(world, pawn, (target, allow) => moveToward(world, pawn, target, allow, getBlocked, budget), () => {wakePlanners(world);if(refueling)environment=undefined;});continue; }
      if(pawn.cooking) {processCooking(world,pawn,{
        workRate:(station,worker)=>getEnvironment().production(station,worker).total,
        candidates:()=>searchCandidates(world,pawn,getBlocked(),occupied,budget),
        search:goals=>search(world,pawn,getBlocked(),occupied,budget,goals),
        move:(target,exact)=>moveToward(world,pawn,target,true,getBlocked,budget,exact),
        release:()=>releaseWork(world,pawn),event:message=>event(world,'job',message),
      });continue;}
      const job = world.jobs.find(candidate => candidate.id === pawn.jobId); if (!job) { processRecreation(world,pawn,needsContext,true); continue; }
      if (job.growingZoneId !== undefined && !growingJobValid(world, job)) { releaseWork(world, pawn); world.jobs = world.jobs.filter(j => j.id !== job.id); continue; }
      if (job.kind === 'sow' && groundPile(world, job)) { releaseWork(world, pawn); continue; }
      if(isRoofJob(job)) {
        if(!roofJobWanted(world,job,getRoofs())){releaseWork(world,pawn);reconcileRoofJobs(world,getRoofs());continue;}
        const tree=job.kind==='build-roof'?world.resources.find(r=>r.kind==='tree'&&sameCell(r,job)):undefined;
        if(tree&&!job.clearance){
          if(world.jobs.some(j=>j.id!==job.id&&sameCell(j,tree)&&(!isRoofJob(j)||j.clearance))){releaseWork(world,pawn);continue;}
          job.clearance={resourceId:tree.id,progress:0};
        }
      }
      if(job.clearance) {
        const plant=world.resources.find(r=>r.id===job.clearance!.resourceId);
        if(!plant){releaseWork(world,pawn);continue;}
        if(adjacent(pawn,plant)) {
          pawn.path=[];pawn.state='working';job.clearance.progress++;
          if(job.clearance.progress>=clearingDuration(plant)) {
            const quantity=gatherResource(world,plant,plant.kind==='tree'?'chop':'cut');
            if(quantity!==null)event(world,'job',`${pawn.name} a dégagé le chantier${plant.kind!=='tree'&&quantity>0?` et a récolté ${quantity} ${plant.kind==='rice'?'riz':'baies'}`:''}.`);
            releaseWork(world,pawn);wakePlanners(world);
          }
        } else moveToward(world,pawn,constructionWorkTarget(world,job),false,getBlocked,budget);
        continue;
      }
      if(job.kind==='sow'&&packedAt(world,job)){releaseWork(world,pawn);continue;}
      if(job.furniture){if(advanceFurniture(world,pawn,job,target=>moveToward(world,pawn,target,false,getBlocked,budget),()=>releaseWork(world,pawn))){blocked=undefined;roofs=undefined;environment=undefined;wakePlanners(world);}continue;}
      if(job.kind==='deconstruct'&&!deconstructionAvailable(world,job,pawn.id)){releaseWork(world,pawn);continue;}
      if(isConstruction(job)&&(!constructionSupplied(world,job)||!constructionSiteFree(world,job,pawn.id))){releaseWork(world,pawn);continue;}
      if(job.kind==='mine') {
        if(Math.max(Math.abs(pawn.x-job.x),Math.abs(pawn.z-job.z))===1) {
          if(advanceMining(world,pawn,job)) {reconcileRoofSupport(world,false,job);world.jobs.splice(world.jobs.indexOf(job),1);pawn.jobId=null;pawn.state='idle';pawn.planCooldown=0;blocked=undefined;roofs=undefined;environment=undefined;wakePlanners(world);event(world,'job',`${pawn.name} a terminé le minage.`);}
        } else moveToward(world,pawn,job,false,getBlocked,budget);
        continue;
      }
      const cells = footprintCells(job);
      if (cells.some(cell => adjacent(pawn, cell)) && !cells.some(cell => sameCell(pawn, cell))) {
        pawn.path = []; pawn.state = 'working'; job.progress++;
        if (job.progress >= jobDuration(world, job)) {completeJob(world, pawn, job);blocked=undefined;roofs=undefined;environment=undefined;}
      } else moveToward(world, pawn, job, false, getBlocked, budget);
    }
    if(world.roofing)reconcileRoofJobs(world,roofs);
    reconcileOrders(world);
    refreshStock(world);
  }
}
