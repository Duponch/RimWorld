import { isColonist } from './affiliation.ts';
import { allowedAreaReason } from './allowed-area-state.ts';
import { FOOD_ITEMS,foodAllowed,type FoodItemId } from './food-policy.ts';
import { ITEM_DEFINITIONS,mealQuantity,rawFoodThought } from './items.ts';
import { ticksUntilRot } from './food-preservation.ts';
import { rawFoodPoisonChance } from './food-poisoning.ts';
import { prisonFood } from './prison-food.ts';
import { pawnBody,medicallyStopped } from './health-rules.ts';
import { patientClaimed } from './care-access.ts';
import { TICKS_PER_DAY } from './types.ts';
import { carrierOf } from './rescue-state.ts';
import { reservedSource } from './materials.ts';
import { canStandAt } from './furniture-travel.ts';
import { reservedServiceCells,serviceCell } from './service-reservations.ts';
import { blockedCells,reachableCells,routeToJob } from './pathfinding.ts';
import { planCommandDrops,releaseWork } from './work-release.ts';
import { clearQueuedOrders } from './player-orders.ts';
import { cancelShooting } from './shooting-state.ts';
import { cancelMelee } from './melee-state.ts';
import type { Cell,Command,CommandResult,MaterialPile,NeedTask,Pawn,World } from './types.ts';

export type ConsumeTask=Extract<NeedTask,{kind:'eat'}>;
export type ConsumeCommand=Extract<Command,{type:'order-consume'}>;
export const isForcedConsuming=(pawn:Pick<Pawn,'need'>):boolean=>pawn.need?.kind==='eat'&&pawn.need.forced===true;

/** Physical ability is independent of jobs, diet and hunger. No passive provider. */
function actorReason(world:Pick<World,'schemaVersion'|'tick'>,pawn:Pawn):string|undefined {
  if(world.schemaVersion<234)return 'La consommation directe nécessite une sauvegarde actuelle.';
  if(!isColonist(pawn)||pawn.prisoner||pawn.visitor||pawn.raid||pawn.podRescue)return 'Choisissez un colon humain libre.';
  if(medicallyStopped(pawn)||pawn.health?.death)return 'Ce colon à terre ou décédé ne peut pas consommer directement.';
  if(pawn.mental?.crisis)return 'Ce colon est en crise et ne reçoit pas cet ordre.';
  if(pawn.health?.foodPoisoning?.vomit||pawn.health?.flu?.vomit||pawn.health?.immuneDiseases?.malaria?.vomit)return 'Attendez la fin du vomissement.';
  const body=pawnBody(pawn);
  if(body.capacities.eating<=0||body.capacities.manipulation<=0)return 'Ce colon doit pouvoir manger et manipuler la portion.';
  if(pawn.burning||pawn.bombRefuge||pawn.heatRefuge||pawn.tactics)return 'Terminez la réaction immédiate avant de consommer.';
  if((pawn.stun?.untilCore??0)>world.tick*10||pawn.melee?.strike||pawn.shooting?.stance?.phase==='cooldown')return 'Attendez la fin de l’étourdissement ou de la récupération de combat.';
}
/** Accepted actor/mandate guard without scans of pawns or piles. Ownership and
 * contact relationships belong to the indexed save/transport coordinator. */
export function consumeActivityValid(world:Pick<World,'schemaVersion'|'tick'>,pawn:Pawn):boolean {
  const task=pawn.need;
  return isForcedConsuming(pawn)&&!actorReason(world,pawn)&&task?.kind==='eat'&&task.paste===undefined&&task.phase!=='collect'
    &&pawn.orders.active==='consume'&&!pawn.orders.queue.length&&!pawn.priorityWork&&!pawn.interruptedCargo
    &&pawn.jobId===null&&!pawn.haul&&!pawn.cooking&&!pawn.rescue&&!pawn.tend&&!pawn.feed&&!pawn.ward&&!pawn.surgery
    &&!pawn.research&&!pawn.orbitalTrade&&!pawn.deepWork&&!pawn.animalHandling&&!pawn.animalCare&&!pawn.animalFeed&&!pawn.animalRescue
    &&!pawn.hunting&&!pawn.burial&&!pawn.cleaning&&!pawn.firefighting&&!pawn.trade&&!pawn.equipmentTask&&!pawn.recreation.task
    &&!pawn.flee&&!pawn.melee&&!pawn.shooting&&!pawn.transitExit
    &&(!pawn.draft||pawn.draft.target===null&&!pawn.draft.queue.length)
    &&(task.phase==='ingest'?pawn.state==='eating':pawn.state==='moving');
}
function available(world:World,pawn:Pawn,pile:MaterialPile):number {
  // Active claims are excluded by exceptPawn; its waiting claims also end when
  // this direct command replaces the whole queue. Foreign owners remain intact.
  const view=pawn.orders.queue.length?{...world,pawns:world.pawns.map(p=>p===pawn?{...p,orders:{...p.orders,queue:[]}}:p)}:world;
  return pile.quantity-reservedSource(view,pile.id,pawn.id);
}
export function consumeReason(world:World,pawn:Pawn,pile:MaterialPile|undefined):string|undefined {
  if(!world.pawns.includes(pawn))return 'Colon local introuvable.';
  const reason=actorReason(world,pawn);if(reason)return reason;
  if(carrierOf(world,pawn.id))return 'Ce colon est transporté.';
  if(patientClaimed(world,pawn.id,pawn))return 'Ce colon est encore réservé comme patient par un soignant.';
  if(pawn.collapsePending||world.restRules==='legacy'&&pawn.rest===0)return 'Ce colon doit récupérer de son épuisement.';
  if(pawn.interruptedCargo)return 'Déposez d’abord la cargaison interrompue.';
  if(pawn.surgery?.phase==='work')return 'Terminez ou annulez l’intervention en cours avant de consommer.';
  const carrying=world.piles.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id)||world.packed.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id);
  if(carrying&&(pawn.moveCooldown>0||(pawn.motion?.end??0)>world.tick))return 'Attendez la fin du déplacement avant de déposer la cargaison.';
  if(!pile||!world.piles.includes(pile)||pile.kind!=='food'||!FOOD_ITEMS.includes(pile.item as FoodItemId)||pile.owner.type!=='ground')return 'Choisissez une pile de nourriture présente au sol.';
  if(ticksUntilRot(pile,world.tick)<=0)return 'Cette nourriture a expiré.';
  const area=allowedAreaReason(world,pawn,pile.owner);if(area)return area;
  const quantity=mealQuantity(pawn,pile,available(world,pawn,pile));
  if(quantity<=0)return 'Cette portion est déjà réservée.';
  if(quantity<pile.quantity&&(world.piles.length>=32768||!Number.isSafeInteger(world.nextId+1)))return 'Pas de place pour identifier la portion séparée.';
  if(!planCommandDrops(world,{type:'order-consume',pawnId:pawn.id,pileId:pile.id,queue:false}))return 'Pas de place pour déposer la cargaison avant de consommer.';
}
/** Keep existing service reservations, including the durable urgent visitor that
 * ordinary clinical work may displace later in the same tick. */
function reservedContacts(world:World,pawn:Pawn):Set<number> {
  const reserved=reservedServiceCells(world,pawn.id);
  for(const other of world.pawns)if(other.id!==pawn.id){const cell=serviceCell(other);if(cell)reserved.add(cell.z*world.width+cell.x);}
  return reserved;
}
export function consumeContactValid(world:World,pawn:Pawn,cell:Cell=pawn):boolean {
  return canStandAt(world,cell)&&!reservedContacts(world,pawn).has(cell.z*world.width+cell.x);
}
export function consumeProposal(world:World,pawn:Pawn,pile:MaterialPile|undefined):{task:ConsumeTask;path:Cell[]}|undefined {
  if(consumeReason(world,pawn,pile)||!pile||pile.owner.type!=='ground')return;
  const reach=reachableCells(world,pawn,blockedCells(world),new Set());
  // Service claims forbid stopping, not crossing. This also handles shelves,
  // whose occupied cell is traversable but cannot be an eating destination.
  reach.stops=new Set([...(reach.stops??[]),...reservedContacts(world,pawn)]);
  const path=routeToJob(world,pile.owner,reach,true);if(!path)return;
  return {task:{kind:'eat',forced:true,phase:'pickup',sourcePileId:pile.id,carryPileId:null,quantity:mealQuantity(pawn,pile,available(world,pawn,pile)),progress:0,dining:null},path};
}
export function consumeWarnings(world:World,pawn:Pawn,pile:MaterialPile):string[] {
  const warnings:string[]=[];
  if(!foodAllowed(world,pawn,pile.item))warnings.push('Cet aliment est exclu du régime ; cet ordre direct le consommera.');
  if(rawFoodThought(pile.item))warnings.push('Aliment cru : humeur et risque alimentaire habituels.');
  if(pile.item==='kibble')warnings.push('Croquettes : cet aliment destiné aux animaux déplaît aux humains.');
  if(prisonFood(world,pile))warnings.push('Cette nourriture est réservée aux personnes détenues.');
  if(pile.foodPoison?.fraction)warnings.push('Cette pile est contaminée : risque d’intoxication alimentaire.');
  else if(rawFoodPoisonChance(pile.item)>0)warnings.push('Cet aliment présente un risque d’intoxication alimentaire.');
  const left=ticksUntilRot(pile,world.tick);
  if(Number.isFinite(left))warnings.push(left<=0?'Cette nourriture a expiré.':`Nourriture périssable : ${Math.max(0,left/TICKS_PER_DAY*24).toFixed(1)} h avant pourriture à température actuelle.`);
  return warnings;
}
export function applyConsume(world:World,command:ConsumeCommand):CommandResult {
  const fail=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
  if(!Number.isSafeInteger(command.pawnId)||!Number.isSafeInteger(command.pileId)||command.queue!==false)return fail('Ordre de consommation invalide : aucune file.');
  const pawn=world.pawns.find(p=>p.id===command.pawnId),pile=world.piles.find(p=>p.id===command.pileId);
  if(!pawn)return fail('Colon local introuvable.');
  const reason=consumeReason(world,pawn,pile);if(reason)return fail(reason);
  const proposal=consumeProposal(world,pawn,pile);if(!proposal)return fail('Aucun accès libre au contact de cette nourriture.');
  const drops=planCommandDrops(world,command);
  if(!drops||!releaseWork(world,pawn,drops))return fail('Impossible de déposer la cargaison avant de consommer.');
  clearQueuedOrders(world,pawn);delete pawn.priorityWork;delete pawn.flee;
  cancelShooting(pawn);cancelMelee(pawn);
  if(pawn.draft){pawn.draft.target=null;pawn.draft.queue=[];pawn.draft.lastActiveTick=world.tick;}
  pawn.need=proposal.task;pawn.orders.active='consume';pawn.path=proposal.path;pawn.state='moving';pawn.planCooldown=0;pawn.needCooldown=0;
  return {ok:true};
}
