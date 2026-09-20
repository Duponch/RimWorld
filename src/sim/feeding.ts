import { bedsideAccess } from './care-access.ts';
import { FEED_TICKS,feedingReason,feedingPlaceValid,feedingWork,type FeedTask } from './feeding-rules.ts';
import { copyPileCondition } from './pile-condition.ts';
import { selectFood } from './food-selection.ts';
import { mealQuantity,nutritionOf,ITEM_DEFINITIONS,rawFoodThought } from './items.ts';
import { reservedSource } from './materials.ts';
import { adjacent,blockedCells,reachableCells,type Reachability } from './pathfinding.ts';
import { clearQueuedOrders } from './player-orders.ts';
import { planCommandDrops,releaseWork } from './work-release.ts';
import { interruptWork } from './interrupted-cargo.ts';
import { updatePawnHealth } from './health.ts';
import { rememberMeal } from './wellbeing.ts';
import type { NeedContext } from './needs.ts';
import type { Cell,CommandResult,Pawn,World } from './types.ts';

export function feedingProposal(world:World,doctor:Pawn,patient:Pawn,reach:Reachability):{task:FeedTask;path:Cell[]}|undefined {
  if(feedingReason(world,doctor,patient))return;
  const sources=world.piles.filter(p=>p.kind==='food'&&p.owner.type==='ground'&&p.quantity>reservedSource(world,p.id));
  if(!sources.length)return;
  const access=bedsideAccess(world,doctor,patient,reach);if(!access)return;
  const food=selectFood(world,doctor,sources,reach,patient);if(!food)return;
  const pile=sources.find(p=>p.id===food.id)!;
  return {task:{patientId:patient.id,spot:access.spot,sourcePileId:pile.id,carryPileId:null,quantity:mealQuantity(patient,pile,pile.quantity-reservedSource(world,pile.id)),phase:'pickup',progress:0},path:food.path};
}
export function startFeeding(doctor:Pawn,proposal:{task:FeedTask;path:Cell[]},forced=false):void {
  doctor.feed=proposal.task;doctor.path=proposal.path;doctor.state='moving';doctor.planCooldown=0;if(forced)doctor.orders.active='feed';
}
export function applyFeeding(world:World,command:{pawnId:number;patientId:number;queue:boolean}):CommandResult {
  const doctor=world.pawns.find(p=>p.id===command.pawnId),patient=world.pawns.find(p=>p.id===command.patientId);
  const fail=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
  if(!doctor||!patient||typeof command.queue!=='boolean')return fail('Colon ou patient introuvable.');
  if(command.queue)return fail('La file d’alimentation assistée n’est pas encore disponible.');
  const reason=feedingReason(world,doctor,patient);if(reason)return fail(reason);
  const proposal=feedingProposal(world,doctor,patient,reachableCells(world,doctor,blockedCells(world),new Set()));
  if(!proposal)return fail('Aucun aliment autorisé disponible ou aucun accès à la nourriture et au chevet.');
  const drops=planCommandDrops(world,{type:'order-feed',...command});if(!drops||!releaseWork(world,doctor,drops))return fail('Pas de place pour déposer la cargaison.');
  clearQueuedOrders(world,doctor);delete doctor.priorityWork;startFeeding(doctor,proposal,true);return {ok:true};
}
export function reconcileFeeding(world:World):void {
  for(const d of world.pawns)if(d.feed){
    const t=d.feed,p=world.pawns.find(p=>p.id===t.patientId),food=world.piles.find(p=>p.id===(t.phase==='pickup'?t.sourcePileId:t.carryPileId));
    if(feedingReason(world,d,p,true)||d.priorities[feedingWork(p)]===0&&d.orders.active!=='feed'||!p||!feedingPlaceValid(world,t,p)||!food||food.kind!=='food'
      ||(t.phase==='pickup'?food.owner.type!=='ground'||reservedSource(world,food.id)>food.quantity:food.owner.type!=='pawn'||food.owner.pawnId!==d.id||food.quantity!==t.quantity))interruptWork(world,d);
  }
}
export function processFeeding(world:World,doctor:Pawn,context:NeedContext):void {
  const t=doctor.feed;if(!t)return;
  const p=world.pawns.find(p=>p.id===t.patientId)!;
  if(p?.health&&p.health.tick<world.tick&&!p.health.death)updatePawnHealth(world,p);
  if(feedingReason(world,doctor,p,true)||!feedingPlaceValid(world,t,p)){interruptWork(world,doctor);return;}
  const food=world.piles.find(p=>p.id===(t.phase==='pickup'?t.sourcePileId:t.carryPileId));
  if(!food||food.kind!=='food'){interruptWork(world,doctor);return;}
  if(t.phase==='pickup'){
    if(food.owner.type!=='ground'||reservedSource(world,food.id)>food.quantity){interruptWork(world,doctor);return;}
    if((doctor.x!==food.owner.x||doctor.z!==food.owner.z)&&!adjacent(doctor,food.owner)){context.move(food.owner,false);return;}
    if(food.quantity===t.quantity){food.owner={type:'pawn',pawnId:doctor.id};t.carryPileId=food.id;}
    else {
      if(world.piles.length>=32768||!Number.isSafeInteger(world.nextId+1)){interruptWork(world,doctor);return;}
      food.quantity-=t.quantity;t.carryPileId=world.nextId++;
      world.piles.push({id:t.carryPileId,kind:'food',item:food.item,quantity:t.quantity,owner:{type:'pawn',pawnId:doctor.id},...copyPileCondition(food)});
    }
    t.phase='deliver';doctor.path=[];doctor.state='moving';return;
  }
  if(food.owner.type!=='pawn'||food.owner.pawnId!==doctor.id||food.quantity!==t.quantity){interruptWork(world,doctor);return;}
  if(doctor.x!==t.spot.x||doctor.z!==t.spot.z){context.move(t.spot,true);return;}
  t.phase='feed';doctor.state='working';doctor.path=[];
  if(++t.progress<FEED_TICKS)return;
  // Anchor health under the old hunger before nutrition changes. Feeding has
  // no Medicine XP and a lying patient gets no new ate-without-table thought.
  world.piles.splice(world.piles.indexOf(food),1);p.hunger=Math.min(100,p.hunger+nutritionOf(food));
  rememberMeal(world,p,true,rawFoodThought(food.item));
  context.event(`${p.name} a mangé une portion (${t.quantity} × ${ITEM_DEFINITIONS[food.item].label}) au lit, avec l’aide de ${doctor.name}.`);
  releaseWork(world,doctor);
}
