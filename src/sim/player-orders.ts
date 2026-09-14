import { JOB_WOOD_COST, footprintCells } from './definitions.ts';
import { constructionSiteFree, isConstruction } from './construction-rules.ts';
import { growingJobValid } from './farming.ts';
import { groundPile } from './ground-placement.ts';
import { harvestable } from './plants.ts';
import { blockedCells, cellIndex, interactionGoals, reachableCells, routeToJob } from './pathfinding.ts';
import { search, workType, type NavigationGrid, type SearchBudget } from './work-planner.ts';
import { planCommandDrops, releaseWork } from './work-release.ts';
import type { Cell, CommandResult, Job, Pawn, World } from './types.ts';

export interface PlayerOrders { active: number | null; queue: number[] }
export type OrderCommand = { type: 'order-job'; pawnId: number; jobId: number; queue: boolean } | { type: 'clear-orders'; pawnId: number };
export interface OrderOption { jobId: number; label: string; enabled: boolean; reason?: string }
export const MAX_QUEUED_ORDERS = 32;
const labels: Record<Job['kind'], string> = { chop:'Abattre',harvest:'Récolter',cut:'Couper',sow:'Semer du riz',wall:'Construire le mur',bed:'Construire le lit',table:'Construire la table',stool:'Construire le tabouret',campfire:'Construire le feu',horseshoes:'Construire le piquet' };
const fail = (reason: string): CommandResult => ({ok:false,code:'invalid-command',reason});
const busy = (pawn: Pawn) => pawn.jobId !== null || !!(pawn.haul || pawn.cooking || pawn.need || pawn.recreation.task);

/** This provider orders one executable job, never an entire construction chain.
 * Delivery, clearance and cooking providers will have their own quantity contracts. */
export function orderReadiness(world: World, pawn: Pawn, job: Job, accepted=false): string | undefined {
  if (!accepted&&!pawn.priorities[workType(job)]) return 'Ce travail est désactivé dans le tableau Travail.';
  if (job.reservedBy !== null && job.reservedBy !== pawn.id) return 'Travail réservé par un autre colon.';
  if (job.growingZoneId !== undefined && !growingJobValid(world,job)) return 'La culture ne permet plus ce travail.';
  if (job.kind === 'harvest') {
    const plant = world.resources.find(r=>r.x===job.x&&r.z===job.z);
    if (!plant || !harvestable(world,plant)) return 'La plante ne peut pas être récoltée.';
  }
  if (isConstruction(job)) {
    if (job.escrow.wood !== JOB_WOOD_COST[job.kind]) return 'Approvisionnement forcé pas encore disponible ; les livraisons automatiques restent actives.';
    if (job.clearance || !constructionSiteFree(world,job,pawn.id)) return 'Chantier gêné ; le dégagement forcé n’est pas encore disponible.';
  }
  if (job.kind === 'sow' && groundPile(world,job)) return 'Le sol doit être dégagé ; transport forcé pas encore disponible.';
}
function goals(world: World, job: Job) {
  const cells=footprintCells(job), result=interactionGoals(world,cells);
  for(const cell of cells)result.delete(cellIndex(world,cell.x,cell.z));
  return result;
}
function route(world:World,pawn:Pawn,job:Job):Cell[]|null {
  return routeToJob(world,job,reachableCells(world,pawn,blockedCells(world),new Set(),goals(world,job)),false);
}
function preflight(world:World,pawn:Pawn,job:Job,queue=false):string|undefined {
  if(pawn.collapsePending || world.restRules==='legacy'&&pawn.rest===0) return 'Ce colon doit récupérer de son épuisement.';
  if(pawn.jobId===job.id || queue&&pawn.orders.queue.includes(job.id)) return 'Ce travail est déjà attribué à ce colon.';
  return orderReadiness(world,pawn,job);
}
/** Called only for a menu query in the worker, not on render frames/snapshots. */
export function queryOrderOptions(world:World,pawnId:number,cell:Cell,queue=false):OrderOption[] {
  const pawn=world.pawns.find(p=>p.id===pawnId);if(!pawn)return [];
  const job=world.jobs.find(j=>footprintCells(j).some(c=>c.x===cell.x&&c.z===cell.z));if(!job)return [];
  const reason=preflight(world,pawn,job,queue) ?? (route(world,pawn,job)===null?'Aucun accès praticable à ce travail.':undefined);
  return [{jobId:job.id,label:labels[job.kind],enabled:!reason,...(reason?{reason}:{})}];
}
export function clearQueuedOrders(world:World,pawn:Pawn):void {
  const ids=new Set(pawn.orders.queue);
  for(const job of world.jobs)if(ids.has(job.id)&&job.reservedBy===pawn.id){job.reservedBy=null;job.status='pending';}
  pawn.orders.queue=[];
}
function start(pawn:Pawn,job:Job,path:Cell[]):void {
  job.reservedBy=pawn.id;job.status='active';pawn.jobId=job.id;
  pawn.orders.active=job.id;pawn.path=path;pawn.planCooldown=0;
  pawn.state=path.length||pawn.moveCooldown>0?'moving':'working';
}
export function applyOrderCommand(world:World,command:OrderCommand):CommandResult {
  const pawn=world.pawns.find(p=>p.id===command.pawnId);
  if(!pawn)return fail('Colon introuvable.');
  if(command.type==='clear-orders') {
    const drops=pawn.orders.active!==null?planCommandDrops(world,command):new Map();
    if(!drops)return fail('Pas de place pour déposer la cargaison.');
    if(pawn.orders.active!==null&&!releaseWork(world,pawn,drops))return fail('Impossible d’interrompre ce travail.');
    clearQueuedOrders(world,pawn);return {ok:true};
  }
  if(typeof command.queue!=='boolean'||!Number.isSafeInteger(command.jobId))return fail('Ordre invalide.');
  const job=world.jobs.find(j=>j.id===command.jobId);if(!job)return fail('Ce travail n’existe plus.');
  const reason=preflight(world,pawn,job,command.queue);if(reason)return fail(reason);
  if(command.queue&&pawn.orders.queue.length>=MAX_QUEUED_ORDERS)return fail(`File limitée à ${MAX_QUEUED_ORDERS} travaux.`);
  const path=route(world,pawn,job);if(path===null)return fail('Aucun accès praticable à ce travail.');
  if(command.queue&&(busy(pawn)||pawn.orders.queue.length>0)) {
    // Queue reservations are exclusive from acceptance, as in the reference.
    job.reservedBy=pawn.id;job.status='active';pawn.orders.queue.push(job.id);
  } else {
    const drops=planCommandDrops(world,command);if(!drops)return fail('Pas de place pour déposer la cargaison.');
    if(!releaseWork(world,pawn,drops))return fail('Impossible d’interrompre ce travail.');
    clearQueuedOrders(world,pawn);start(pawn,job,path);
  }
  world.events.push({tick:world.tick,type:'command',message:`${pawn.name} : ${labels[job.kind]}${command.queue?' (file)':''}.`});
  if(world.events.length>80)world.events.shift();
  return {ok:true};
}
/** Reconcile cancellations before a save can observe
 * dangling reservations. No navigation and no scan when nobody has orders. */
export function reconcileOrders(world:World):void {
  let jobs:Map<number,Job>|undefined;
  for(const pawn of world.pawns) {
    const orders=pawn.orders;if(orders.active===null&&!orders.queue.length)continue;
    if(orders.active!==pawn.jobId)orders.active=null;
    if(!orders.queue.length)continue;
    jobs??=new Map(world.jobs.map(j=>[j.id,j]));
    orders.queue=orders.queue.filter(id=>{
      const job=jobs!.get(id);
      if(job&&job.reservedBy===pawn.id)return true;
      if(job?.reservedBy===pawn.id){job.reservedBy=null;job.status='pending';}
      return false;
    });
  }
}
/** Returns true if a queued decision has to wait for the shared search budget. */
export function advanceOrders(world:World,pawn:Pawn,getBlocked:NavigationGrid,budget:SearchBudget):boolean {
  if(busy(pawn)||!pawn.orders.queue.length)return false;
  const id=pawn.orders.queue[0]!,job=world.jobs.find(j=>j.id===id);
  let reason=job?orderReadiness(world,pawn,job,true):'Travail annulé.';
  let path:Cell[]|null=null;
  if(!reason&&job) {
    const reach=search(world,pawn,getBlocked(),new Set(),budget,goals(world,job));
    if(!reach)return true;
    path=routeToJob(world,job,reach,false);if(path===null)reason='Accès perdu.';
  }
  pawn.orders.queue.shift();
  if(!reason&&job&&path)start(pawn,job,path);
  else {
    if(job?.reservedBy===pawn.id){job.reservedBy=null;job.status='pending';}
    world.events.push({tick:world.tick,type:'command',message:`${pawn.name} : ordre abandonné. ${reason}`});
    if(world.events.length>80)world.events.shift();
    return true; // Process at most one queue entry per pawn/tick.
  }
  return false;
}
