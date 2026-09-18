import { cancelShooting } from './shooting-state.ts';
import { AUTO_UNDRAFT_TICKS,DRAFT_QUEUE_LIMIT,sameCell,type DraftCommand } from './drafting-rules.ts';
import { draftDestination,draftDestinationContext } from './drafting-destinations.ts';
import { clearQueuedOrders } from './player-orders.ts';
import { releaseAssignments } from './work-release.ts';
import { interruptWork } from './interrupted-cargo.ts';
import { medicallyStopped } from './health-rules.ts';
import { blockedCells,canStep,routeToCell } from './pathfinding.ts';
import { startTravel } from './movement.ts';
import { CIVIL_TRANSIT_BLOCKERS } from './travel.ts';
import { search,type NavigationGrid,type SearchBudget } from './work-planner.ts';
import { canStandAt } from './furniture-travel.ts';
import { leaveTransitCell } from './transit-exit.ts';
import type { LightReader } from './light-environment.ts';
import type { CommandResult,Pawn,World } from './types.ts';

const refuse=(reason:string):CommandResult=>({ok:false,code:'invalid-command',reason});
function announce(world:World,pawn:Pawn,reason:string):void {
  world.events.push({tick:world.tick,type:'command',message:`${pawn.name} : ${reason}`});if(world.events.length>80)world.events.splice(0,world.events.length-80);
}

/** The logical cell already denotes the end of an active edge. Keep the load on
 * its GPU pose until that edge finishes; never drop it ahead of its carrier. */
function interruptDraftWork(world:World,pawn:Pawn):void {
  const travelling=!!pawn.motion&&pawn.motion.end>world.tick;
  const carrying=travelling&&(world.piles.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id)||world.packed.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===pawn.id));
  if(!carrying){interruptWork(world,pawn);return;}
  clearQueuedOrders(world,pawn);delete pawn.priorityWork;releaseAssignments(world,pawn);
  pawn.interruptedCargo=true;pawn.planCooldown=0;
}

export function endDraft(world:World,pawn:Pawn):void {
  cancelShooting(pawn);delete pawn.draft;interruptDraftWork(world,pawn);pawn.planCooldown=0;pawn.needCooldown=0;
}
export function applyDraftCommand(world:World,command:DraftCommand):CommandResult {
  if(!Array.isArray(command.pawnIds)||!command.pawnIds.length||command.pawnIds.some(id=>!Number.isSafeInteger(id))||new Set(command.pawnIds).size!==command.pawnIds.length)return refuse('Sélection tactique invalide.');
  const pawns=command.pawnIds.map(id=>world.pawns.find(p=>p.id===id));
  if(pawns.some(p=>!p))return refuse('Colon introuvable.');
  const selected=(pawns as Pawn[]).sort((a,b)=>a.id-b.id);
  if(command.type==='draft') {
    if(typeof command.enabled!=='boolean')return refuse('État de mobilisation invalide.');
    if(command.enabled&&selected.some(medicallyStopped))return refuse('Un colon à terre ou décédé ne peut pas être mobilisé.');
    for(const pawn of selected)if(!!pawn.draft!==command.enabled){
      if(command.enabled){interruptDraftWork(world,pawn);pawn.draft={lastActiveTick:world.tick,target:null,queue:[]};pawn.planCooldown=0;}
      else endDraft(world,pawn);
    }
    return {ok:true};
  }
  if(selected.some(p=>!p.draft||medicallyStopped(p)))return refuse('Mobilisez d’abord tous les colons sélectionnés.');
  if(command.type==='draft-stop') {
    for(const pawn of selected){cancelShooting(pawn);interruptDraftWork(world,pawn);pawn.draft={lastActiveTick:world.tick,target:null,queue:[]};pawn.planCooldown=0;}
    return {ok:true};
  }
  if(!command.target||!Number.isInteger(command.target.x)||!Number.isInteger(command.target.z)||typeof command.queue!=='boolean')return refuse('Destination tactique invalide.');
  if(command.queue&&selected.some(p=>p.draft!.queue.length>=DRAFT_QUEUE_LIMIT))return refuse('La file de déplacements est pleine.');
  const blocked=blockedCells(world),context=draftDestinationContext(world,command.queue?new Set():new Set(command.pawnIds));
  const plans=[];
  for(const pawn of selected) {
    const origin=command.queue?(pawn.draft!.queue.at(-1)??pawn.draft!.target??pawn):pawn;
    const queued=command.queue&&!!(pawn.draft!.target||pawn.draft!.queue.length);
    const plan=draftDestination(world,pawn,command.target,blocked,context,origin,!queued);
    if(!plan)return refuse('Aucune destination accessible et libre près du clic.');
    context.claimed.add(plan.target.z*world.width+plan.target.x);plans.push({pawn,...plan});
  }
  // Validate the whole group before releasing any ownership or reservation.
  for(const {pawn,target,path} of plans) {
    const draft=pawn.draft!;
    if(command.queue&&(draft.target||draft.queue.length)){draft.queue.push(target);continue;}
    cancelShooting(pawn);interruptDraftWork(world,pawn);draft.target=target;draft.queue=[];draft.lastActiveTick=world.tick;
    pawn.path=path;pawn.planCooldown=0;pawn.state=path.length||pawn.moveCooldown>0?'moving':'idle';
    if(pawn.shooting?.stance?.phase==='cooldown'){pawn.path=[];pawn.state='idle';}
  }
  return {ok:true};
}

/** Shared weighted navigation/captured edges; no planner or need bonus in tactical mode. */
export function processDraft(world:World,pawn:Pawn,getBlocked:NavigationGrid,budget:SearchBudget,getLight:LightReader):void {
  const draft=pawn.draft!;
  if(draft.target&&!canStandAt(world,draft.target)) {draft.target=null;pawn.path=[];pawn.state='idle';pawn.planCooldown=0;announce(world,pawn,'destination devenue impraticable.');}
  if((!draft.target||sameCell(pawn,draft.target))&&draft.queue.length) {
    if(!budget.remaining)return;budget.remaining--;
    const intent=draft.queue.shift()!,context=draftDestinationContext(world,new Set([pawn.id]));
    const next=draftDestination(world,pawn,intent,getBlocked(),context);
    if(next){draft.target=next.target;pawn.path=next.path;pawn.planCooldown=0;}
    else {draft.target=null;pawn.path=[];announce(world,pawn,'déplacement en file inaccessible, ordre suivant conservé.');}
  }
  if(draft.target&&!sameCell(pawn,draft.target)) {
    draft.lastActiveTick=world.tick;pawn.state='moving';
    const blocked=getBlocked();let next=pawn.path[0];
    if(!next||!canStep(world,pawn,next,blocked,CIVIL_TRANSIT_BLOCKERS)) {
      if(pawn.planCooldown>0)return;
      const reach=search(world,pawn,blocked,CIVIL_TRANSIT_BLOCKERS,budget,new Set([draft.target.z*world.width+draft.target.x]));if(!reach)return;
      const path=routeToCell(world,draft.target,reach);pawn.planCooldown=20;
      if(!path){draft.target=null;pawn.path=[];pawn.state='idle';announce(world,pawn,'chemin interrompu.');return;}
      pawn.path=path;next=path[0];
    }
    if(next&&startTravel(world,pawn,next,getLight))pawn.path.shift();
    return;
  }
  if(leaveTransitCell(world,pawn,getBlocked,budget,getLight)){draft.lastActiveTick=world.tick;return;}
  pawn.state='idle';pawn.path=[];
  // No hostiles exist yet. Combat must supply its active-threat condition here.
  if(world.tick-draft.lastActiveTick>=AUTO_UNDRAFT_TICKS){endDraft(world,pawn);announce(world,pawn,'démobilisation après une longue attente sans menace.');}
}
