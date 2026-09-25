import { FLOOR_DEFINITIONS } from './flooring.ts';
import { isColonist } from './affiliation.ts';
import { captureReason,captureProposal } from './capture.ts';
import { feedingReason } from './feeding-rules.ts';
import { feedingProposal } from './feeding.ts';
import { tendingReason,tendingProposal,lyingPatient } from './tending.ts';
import { carrierOf } from './rescue-state.ts';
import { rescueReason,rescueProposal,wantsRescue } from './rescue.ts';
import { stationRecipe } from './production-recipes.ts';
import { furnitureReady, furnitureWorkTarget, packedAt } from './furniture-rules.ts';
import { deconstructionAvailable } from './deconstruction-rules.ts';
import { rememberPriorityWork, expirePriorityWork } from './priority-work-state.ts';
import { isCookingOrder } from './order-types.ts';
import { advanceCookingOrder, planCookingOrder, queuedCookingReason, startCookingOrder } from './player-cooking.ts';
import { footprintCells } from './definitions.ts';
import { constructionSkillRequired,constructionSupplied } from './construction-materials.ts';
import { isRoofJob } from './roof-rules.ts';
import { asBuilder, constructionHaulPriority, constructionObstruction, constructionSiteFree, isConstruction } from './construction-rules.ts';
import { growingJobValid } from './farming.ts';
import { groundPile } from './ground-placement.ts';
import { harvestable } from './plants.ts';
import { blockedCells, cellIndex, interactionGoals, reachableCells, routeToJob } from './pathfinding.ts';
import { search, workType, type NavigationGrid, type SearchBudget } from './work-planner.ts';
import { planCommandDrops, releaseWork } from './work-release.ts';
import { haulOrderCell, planHaulOrder, queuedHaulReason, startHaulOrder, type HaulOrderTarget } from './player-hauling.ts';
import { canReach, destinationCell } from './work-planner.ts';
import type { Cell, CommandResult, HaulTask, Job, Pawn, World } from './types.ts';

import { equipmentOrderReason } from './equipment.ts';
import { apparelLabel } from './apparel-rules.ts';
import { equippedWeapon,weaponLabel,type EquipmentAction } from './equipment-rules.ts';

export interface PlayerOrders { active: number | 'bury' | 'equipment' | 'haul' | 'cook' | 'feed' | 'tend' | 'rescue' | null; queue: import('./order-types.ts').QueuedOrder[] }
export type OrderCommand = { type:'order-cook';pawnId:number;structureId:number;queue:boolean } | { type: 'order-job'; pawnId: number; jobId: number; queue: boolean } | { type:'order-haul';pawnId:number;target:HaulOrderTarget;queue:boolean } | { type: 'clear-orders'; pawnId: number };
export interface OrderOption { jobId: number; capturePatientId?:number; equipmentItemId?:number; equipmentAction?:EquipmentAction; cookStationId?:number; rescuePatientId?:number; tendPatientId?:number; feedPatientId?:number; haulTarget?:HaulOrderTarget; label: string; enabled: boolean; reason?: string }
export const MAX_QUEUED_ORDERS = 32;
const labels: Record<Job['kind'], string> = { grave:'Creuser une tombe','lay-floor':'Poser un sol','remove-floor':'Retirer un sol',heater:'Radiateur','wind-turbine':'Éolienne',flick:'Actionner l’interrupteur','power-conduit':'Construire le conduit','power-switch':'Construire l’interrupteur',battery:'Construire la batterie','solar-generator':'Construire le panneau solaire', 'fueled-stove':'Construire la cuisinière à bois', 'electric-stove':'Construire la cuisinière électrique', 'butcher-table':'Construire la table de boucherie', 'butcher-spot':'boucherie', cooler:'Construire le climatiseur', 'research-bench':'Bureau de recherche','tailor-bench':'Établi de tailleur','electric-tailor-bench':'Établi de tailleur électrique','machining-table':'Construire l’atelier d’usinage', 'crafting-spot':'Placer l’artisanat', repair:'réparer', 'wood-generator':'construire le générateur à bois', 'standing-lamp':'construire la lampe', 'passive-cooler':'Construire le refroidisseur passif', 'build-roof':'Poser le toit', 'remove-roof':'Retirer le toit', door:'Construire la porte', stonecutter:'Construire la table de taille', mine:'Miner', uninstall:'Désinstaller',install:'Réinstaller', deconstruct:'Déconstruire', chop:'Abattre',harvest:'Récolter',cut:'Couper',sow:'Semer',wall:'Construire le mur',bed:'Construire le lit',table:'Construire la table','table-square':'Construire la table carrée','table-long':'Construire la table longue',stool:'Construire le tabouret','dining-chair':'Construire la chaise',armchair:'Construire le fauteuil','end-table':'Construire la table de chevet',dresser:'Construire la commode','flower-pot':'Construire le pot de fleurs',campfire:'Construire le feu',horseshoes:'Construire le piquet' };
const fail = (reason: string): CommandResult => ({ok:false,code:'invalid-command',reason});
const busy = (pawn: Pawn) => pawn.jobId !== null || !!(pawn.hunting || pawn.heatRefuge || pawn.research || pawn.equipmentTask || pawn.ward || pawn.feed || pawn.tend || pawn.rescue || pawn.haul || pawn.cooking || pawn.need || pawn.recreation.task);
const clearingPlant=(world:World,job:Job)=>!isConstruction(job)?undefined:job.clearance?world.resources.find(r=>r.id===job.clearance!.resourceId):constructionObstruction(world,job).plant;
const orderLabel=(world:World,job:Job)=>clearingPlant(world,job)?'Couper la plante qui gêne le chantier':labels[job.kind];

/** This provider orders one executable job, never an entire construction chain.
 * Quantity-based delivery is handled separately by player-hauling. */
export function orderReadiness(world: World, pawn: Pawn, job: Job, accepted=false): string | undefined {
  if(job.kind==='lay-floor'&&job.floor&&pawn.skills.construction.level<FLOOR_DEFINITIONS[job.floor].skill)return `Construction ${FLOOR_DEFINITIONS[job.floor].skill} nécessaire pour finir ce sol.`;
  if (!accepted&&(job.kind==='install'?!Number.isFinite(constructionHaulPriority(pawn)):!pawn.priorities[workType(job)])) return 'Ce travail est désactivé dans le tableau Travail.';
  if (job.reservedBy !== null && job.reservedBy !== pawn.id) return 'Travail réservé par un autre colon.';
  if (job.growingZoneId !== undefined && !growingJobValid(world,job)) return 'La culture ne permet plus ce travail.';
  if(job.kind==='mine'&&world.tiles[job.z*world.width+job.x]?.terrain!=='rock')return 'Le massif a disparu.';
  if (job.kind === 'harvest') {
    const plant = world.resources.find(r=>r.x===job.x&&r.z===job.z);
    if (!plant || !harvestable(world,plant)) return 'La plante ne peut pas être récoltée.';
  }
  if (isConstruction(job)) {
    const plant=clearingPlant(world,job);
    if((!accepted||job.clearance)&&plant&&plant.kind!=='rock')return;
    if(job.clearance)return 'La plante à dégager a disparu.';
    const skill=constructionSkillRequired(job.kind);if(pawn.skills.construction.level<skill)return `Construction ${skill} nécessaire pour finir cet ouvrage.`;
    if (!constructionSupplied(world,job)) return 'Approvisionnement nécessaire ; choisissez Livrer les matériaux.';
    if (!constructionSiteFree(world,job,pawn.id)) return 'Chantier gêné ; dégagez les piles ou attendez le passage des colons.';
  }
  if(job.furniture&&!furnitureReady(world,job,pawn))return 'Meuble utilisé ou emplacement encombré.';
  if (job.kind === 'deconstruct' && !deconstructionAvailable(world,job,pawn.id)) return 'Bâtiment utilisé ou réservé par un autre colon.';
  if (job.kind === 'sow' && (groundPile(world,job)||packedAt(world,job))) return 'Le sol doit être dégagé ; choisissez Dégager avant de semer.';
}
function goals(world: World, job: Job) {
  const plant=clearingPlant(world,job),cells=plant?[plant]:footprintCells(furnitureWorkTarget(world,job) as Job), result=interactionGoals(world,cells,job.kind);
  for(const cell of cells)result.delete(cellIndex(world,cell.x,cell.z));
  return result;
}
function route(world:World,pawn:Pawn,job:Job):Cell[]|null {
  return routeToJob(world,clearingPlant(world,job)??furnitureWorkTarget(world,job),reachableCells(world,pawn,blockedCells(world),new Set(),goals(world,job)),false);
}
function preflight(world:World,pawn:Pawn,job:Job,queue=false):string|undefined {
  const medical=medicalWorkRefusal(pawn);if(medical)return medical;
  if(pawn.interruptedCargo)return 'Ce colon doit d’abord déposer sa cargaison interrompue. Libérez une case de sol à proximité.';
  if(pawn.collapsePending || world.restRules==='legacy'&&pawn.rest===0) return 'Ce colon doit récupérer de son épuisement.';
  if(pawn.jobId===job.id || queue&&pawn.orders.queue.includes(job.id)) return 'Ce travail est déjà attribué à ce colon.';
  return orderReadiness(world,pawn,job);
}
/** Called only for a menu query in the worker, not on render frames/snapshots. */
export function queryOrderOptions(world:World,pawnId:number,cell:Cell,queue=false):OrderOption[] {
  if(world.pawns.some(p=>p.id===pawnId&&!isColonist(p)))return [];
  const pawn=world.pawns.find(p=>p.id===pawnId);if(!pawn)return [];
  if(pawn.mental?.crisis)return [{jobId:0,label:'Errance triste',enabled:false,reason:'Ce colon ne peut pas obéir pendant sa crise.'}];
  const jobs=world.jobs.filter(j=>footprintCells(j).some(c=>c.x===cell.x&&c.z===cell.z));
  const job=jobs.find(j=>!isRoofJob(j))??jobs[0],pile=groundPile(world,cell),options:OrderOption[]=[];
  for(const target of jobs) {
    const reason=preflight(world,pawn,target,queue) ?? (route(world,pawn,target)===null?'Aucun accès praticable à ce travail.':undefined);
    options.push({jobId:target.id,label:orderLabel(world,target),enabled:!reason,...(reason?{reason}:{})});
  }
  const primary=equippedWeapon(world,pawn);
  const weapon=pile?.kind==='weapon'?pile:pawn.x===cell.x&&pawn.z===cell.z?primary:undefined;
  if(weapon){
    const action=weapon===primary?'drop':'equip';
    const reason=queue?'La file d’équipement n’est pas encore disponible.':equipmentOrderReason(world,pawn,weapon,action)
      ??(action==='equip'&&routeToJob(world,cell,reachableCells(world,pawn,blockedCells(world),new Set()),true)===null?'Aucun accès praticable à cette arme.':undefined);
    options.push({jobId:0,equipmentItemId:weapon.id,equipmentAction:action,label:`${action==='equip'?'Équiper':'Déposer'} ${weaponLabel(weapon)}`,enabled:!reason,...reason?{reason}:{}});
  }
  if(pile?.kind==='apparel'){
    const reason=queue?'La file d’équipement n’est pas encore disponible.':equipmentOrderReason(world,pawn,pile,'wear')
      ??(routeToJob(world,cell,reachableCells(world,pawn,blockedCells(world),new Set()),true)===null?'Aucun accès praticable à ce vêtement.':undefined);
    options.push({jobId:0,equipmentItemId:pile.id,equipmentAction:'wear',label:`Porter ${apparelLabel(pile)}`,enabled:!reason,...reason?{reason}:{}});
  }
  const targets:HaulOrderTarget[]=[];
  if(job&&isConstruction(job)) {
    const obstacle=constructionObstruction(world,job);
    if((obstacle.pile||obstacle.pack)&&!obstacle.plant)targets.push({type:'clear',jobId:job.id});
    if(!constructionSupplied(world,job))targets.push({type:'job',jobId:job.id});
  }
  if(job?.kind==='sow'&&(pile||packedAt(world,cell)))targets.push({type:'clear-sow',jobId:job.id});
  const pack=packedAt(world,cell);if(pack)targets.push({type:'furniture',structureId:pack.building.id});
  if(pile)targets.push({type:'pile',pileId:pile.id});
  const fire=world.structures.find(s=>(stationRecipe(s)!==null||s.kind==='passive-cooler')&&footprintCells(s).some(c=>c.x===cell.x&&c.z===cell.z));
  if(fire&&(fire.kind==='campfire'||fire.kind==='fueled-stove'||fire.kind==='passive-cooler'))targets.push({type:'fuel',structureId:fire.id});
  for(const target of targets) {
    const view=orderView(world,pawn,queue),proposal=planHaulOrder(view,view.pawns.find(p=>p.id===pawn.id)!,target);
    const reason=exhausted(world,pawn)??proposal.reason;
    options.push({jobId:job?.id??0,haulTarget:target,label:proposal.label,enabled:!reason,...(reason?{reason}:{})});
  }
  if(fire&&stationRecipe(fire)) {
    const view=orderView(world,pawn,queue),proposal=planCookingOrder(view,view.pawns.find(p=>p.id===pawn.id)!,fire.id),reason=exhausted(world,pawn)??proposal.reason;
    options.push({jobId:0,cookStationId:fire.id,label:proposal.label,enabled:!reason,...(reason?{reason}:{})});
  }
  for(const patient of world.pawns)if(patient!==pawn&&patient.x===cell.x&&patient.z===cell.z&&!isColonist(patient)&&!patient.prisoner&&patient.state!=='dead'){
    const reason=queue?'La capture ne peut pas encore être ajoutée à une file.':exhausted(world,pawn)??captureReason(world,pawn,patient)
      ??(!captureProposal(world,pawn,patient,reachableCells(world,pawn,blockedCells(world),new Set()))?'Aucun lit de prison accessible et disponible.':undefined);
    options.push({jobId:0,capturePatientId:patient.id,label:`Capturer ${patient.name}`,enabled:!reason,...reason?{reason}:{}});
  }
  for(const patient of world.pawns)if(patient.id!==pawn.id&&patient.x===cell.x&&patient.z===cell.z&&wantsRescue(patient)){
    const reason=queue?'Le secours direct ne peut pas encore être ajouté à une file.':exhausted(world,pawn)??rescueReason(world,pawn,patient)
      ??(!rescueProposal(world,pawn,patient,reachableCells(world,pawn,blockedCells(world),new Set()))?'Aucun couchage accessible et disponible.':undefined);
    options.push({jobId:0,rescuePatientId:patient.id,label:`Secourir ${patient.name}`,enabled:!reason,...reason?{reason}:{}});
  }
  for(const patient of world.pawns)if(patient!==pawn&&patient.x===cell.x&&patient.z===cell.z&&lyingPatient(patient)){
    const reason=queue?'La file de soins n’est pas encore disponible.':tendingReason(world,pawn,patient)??(!tendingProposal(world,pawn,patient,reachableCells(world,pawn,blockedCells(world),new Set()))?'Aucune place accessible au chevet.':undefined);
    options.push({jobId:0,tendPatientId:patient.id,label:`Soigner ${patient.name}`,enabled:!reason,...reason?{reason}:{}});
    const feedReason=queue?'La file d’alimentation assistée n’est pas encore disponible.':feedingReason(world,pawn,patient)??(!feedingProposal(world,pawn,patient,reachableCells(world,pawn,blockedCells(world),new Set()))?'Aucun aliment autorisé ou accès au chevet.':undefined);
    options.push({jobId:0,feedPatientId:patient.id,label:`Nourrir ${patient.name}`,enabled:!feedReason,...feedReason?{reason:feedReason}:{}});
  }
  if(pawn.x===cell.x&&pawn.z===cell.z){
    const reason=queue?'La file de soins n’est pas encore disponible.':tendingReason(world,pawn,pawn)??(!tendingProposal(world,pawn,pawn,reachableCells(world,pawn,blockedCells(world),new Set()))?'Aucune place pour se soigner.':undefined);
    options.push({jobId:0,tendPatientId:pawn.id,label:'Se soigner',enabled:!reason,...reason?{reason}:{}});
  }
  return options;
}
const exhausted=(world:World,pawn:Pawn)=>(carrierOf(world,pawn.id)?'Ce colon est transporté.':undefined)??medicalWorkRefusal(pawn)??(pawn.interruptedCargo?'Ce colon doit d’abord déposer sa cargaison interrompue. Libérez une case de sol à proximité.':pawn.collapsePending||world.restRules==='legacy'&&pawn.rest===0?'Ce colon doit récupérer de son épuisement.':undefined);
function orderView(world:World,pawn:Pawn,queue:boolean):World {
  if(queue)return world;
  return {...world,pawns:world.pawns.map(p=>p!==pawn?p:{...p,haul:null,need:null,cooking:null,orders:{active:null,queue:[]}})};
}
export function clearQueuedOrders(world:World,pawn:Pawn):void {
  const ids=new Set(pawn.orders.queue);
  for(const job of world.jobs)if(ids.has(job.id)&&job.reservedBy===pawn.id){delete job.clearance;delete job.installationWork;job.reservedBy=null;job.status='pending';}
  pawn.orders.queue=[];
}
export function startJobOrder(pawn:Pawn,job:Job,path:Cell[]):void {
  if(job.kind==='install')job.installationWork??=asBuilder(pawn)?'build':'haul';
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
    clearQueuedOrders(world,pawn);delete pawn.priorityWork;return {ok:true};
  }
  if(command.type==='order-haul'||command.type==='order-cook') {
    if(typeof command.queue!=='boolean'||(command.type==='order-cook'?!Number.isSafeInteger(command.structureId):!command.target||!['pile','furniture','job','clear','clear-sow','fuel'].includes(command.target.type)
      ||!Number.isSafeInteger(command.target.type==='pile'?command.target.pileId:command.target.type==='fuel'||command.target.type==='furniture'?command.target.structureId:command.target.jobId)))return fail('Ordre de transport invalide.');
    const reason=exhausted(world,pawn);if(reason)return fail(reason);
    if(command.queue&&pawn.orders.queue.length>=MAX_QUEUED_ORDERS)return fail(`File limitée à ${MAX_QUEUED_ORDERS} travaux.`);
    let view=orderView(world,pawn,command.queue);
    const drops=command.queue?new Map():planCommandDrops(view,command);if(!drops)return fail('Pas de place pour déposer la cargaison.');
    if(drops.size)view={...view,packed:view.packed.map(p=>drops.has(p.building.id)?{...p,owner:{type:'ground',...drops.get(p.building.id)!}}:p),piles:view.piles.map(p=>drops.has(p.id)?{...p,owner:{type:'ground',...drops.get(p.id)!}}:p)};
    const actor=view.pawns.find(p=>p.id===pawn.id)!;
    const proposal=command.type==='order-cook'?planCookingOrder(view,actor,command.structureId):(()=>{const p=planHaulOrder(view,actor,command.target);return {...p,order:p.task};})();
    if(!proposal.order||!proposal.path)return fail(proposal.reason??'Transport impossible.');
    if(command.queue&&(busy(pawn)||pawn.orders.queue.length))pawn.orders.queue.push(proposal.order);
    else {
      if(!releaseWork(world,pawn,drops))return fail('Impossible d’interrompre ce travail.');
      clearQueuedOrders(world,pawn);if(isCookingOrder(proposal.order))startCookingOrder(pawn,proposal.order,proposal.path);else startHaulOrder(pawn,proposal.order,proposal.path);
    }
    rememberPriorityWork(world,pawn,command,proposal.order);
    world.events.push({tick:world.tick,type:'command',message:`${pawn.name} : ${proposal.label}${command.queue?' (file)':''}.`});
    if(world.events.length>80)world.events.shift();return {ok:true};
  }
  if(typeof command.queue!=='boolean'||!Number.isSafeInteger(command.jobId))return fail('Ordre invalide.');
  const job=world.jobs.find(j=>j.id===command.jobId);if(!job)return fail('Ce travail n’existe plus.');
  const reason=preflight(world,pawn,job,command.queue);if(reason)return fail(reason);
  if(command.queue&&pawn.orders.queue.length>=MAX_QUEUED_ORDERS)return fail(`File limitée à ${MAX_QUEUED_ORDERS} travaux.`);
  const path=route(world,pawn,job);if(path===null)return fail('Aucun accès praticable à ce travail.');
  const plant=clearingPlant(world,job),label=orderLabel(world,job);
  if(command.queue&&(busy(pawn)||pawn.orders.queue.length>0)) {
    // Queue reservations are exclusive from acceptance, as in the reference.
    if(job.kind==='install')job.installationWork=asBuilder(pawn)?'build':'haul';
    job.reservedBy=pawn.id;job.status='active';pawn.orders.queue.push(job.id);
    if(plant)job.clearance={resourceId:plant.id,progress:0};
  } else {
    const drops=planCommandDrops(world,command);if(!drops)return fail('Pas de place pour déposer la cargaison.');
    if(!releaseWork(world,pawn,drops))return fail('Impossible d’interrompre ce travail.');
    clearQueuedOrders(world,pawn);startJobOrder(pawn,job,path);
    if(plant)job.clearance={resourceId:plant.id,progress:0};
  }
  rememberPriorityWork(world,pawn,command);
  world.events.push({tick:world.tick,type:'command',message:`${pawn.name} : ${label}${command.queue?' (file)':''}.`});
  if(world.events.length>80)world.events.shift();
  return {ok:true};
}
/** Reconcile cancellations before a save can observe
 * dangling reservations. No navigation and no scan when nobody has orders. */
export function reconcileOrders(world:World):void {
  let jobs:Map<number,Job>|undefined;
  for(const pawn of world.pawns) {
    expirePriorityWork(world,pawn);
    const orders=pawn.orders;if(orders.active===null&&!orders.queue.length)continue;
    if(orders.active==='bury'?!pawn.burial:orders.active==='equipment'?!pawn.equipmentTask:orders.active==='haul'?!pawn.haul:orders.active==='cook'?!pawn.cooking:orders.active==='feed'?!pawn.feed:orders.active==='tend'?!pawn.tend:orders.active==='rescue'?!pawn.rescue:orders.active!==pawn.jobId)orders.active=null;
    if(!orders.queue.length)continue;
    jobs??=new Map(world.jobs.map(j=>[j.id,j]));
    orders.queue=orders.queue.filter(id=>{
      if(typeof id!=='number') {
        const reason=isCookingOrder(id)?queuedCookingReason(world,id):queuedHaulReason(world,id);
        if(reason){world.events.push({tick:world.tick,type:'command',message:`${pawn.name} : livraison abandonnée. ${reason}`});if(world.events.length>80)world.events.shift();}
        return !reason;
      }
      const job=jobs!.get(id);
      if(job&&job.reservedBy===pawn.id)return true;
      if(job?.reservedBy===pawn.id){delete job.installationWork;job.reservedBy=null;job.status='pending';}
      return false;
    });
  }
}
/** Returns true if a queued decision has to wait for the shared search budget. */
export function advanceOrders(world:World,pawn:Pawn,getBlocked:NavigationGrid,budget:SearchBudget):boolean {
  if(busy(pawn)||!pawn.orders.queue.length)return false;
  const order=pawn.orders.queue[0]!;
  if(isCookingOrder(order))return advanceCookingOrder(world,pawn,order,getBlocked,budget);
  if(typeof order!=='number') {
    let reason=queuedHaulReason(world,order);const source=haulOrderCell(world,order),target=destinationCell(world,order.destination);
    let path:Cell[]|null=null;
    if(!reason&&source&&target) {
      const targetGoals=interactionGoals(world,'kind' in target?footprintCells(target as Job):[target]);
      if(order.destination.type==='job')for(const cell of footprintCells(target as Job))targetGoals.delete(cellIndex(world,cell.x,cell.z));
      const reach=search(world,pawn,getBlocked(),new Set(),budget,undefined,[interactionGoals(world,[source]),targetGoals]);if(!reach)return true;
      path=routeToJob(world,source,reach,true);
      if(!path||!canReach(world,target,reach,order.destination.type!=='job'))reason='Accès perdu.';
    }
    pawn.orders.queue.shift();
    if(!reason&&path)startHaulOrder(pawn,order,path);
    else {
      world.events.push({tick:world.tick,type:'command',message:`${pawn.name} : livraison abandonnée. ${reason??'Cible disparue.'}`});
      if(world.events.length>80)world.events.shift();return true;
    }
    return false;
  }
  const id=pawn.orders.queue[0]!,job=world.jobs.find(j=>j.id===id);
  let reason=job?orderReadiness(world,pawn,job,true):'Travail annulé.';
  let path:Cell[]|null=null;
  if(!reason&&job) {
    const reach=search(world,pawn,getBlocked(),new Set(),budget,goals(world,job));
    if(!reach)return true;
    path=routeToJob(world,clearingPlant(world,job)??furnitureWorkTarget(world,job),reach,false);if(path===null)reason='Accès perdu.';
  }
  pawn.orders.queue.shift();
  if(!reason&&job&&path)startJobOrder(pawn,job,path);
  else {
    if(job?.reservedBy===pawn.id){delete job.clearance;delete job.installationWork;job.reservedBy=null;job.status='pending';}
    world.events.push({tick:world.tick,type:'command',message:`${pawn.name} : ordre abandonné. ${reason}`});
    if(world.events.length>80)world.events.shift();
    return true; // Process at most one queue entry per pawn/tick.
  }
  return false;
}
import { medicalWorkRefusal } from './health-rules.ts';
