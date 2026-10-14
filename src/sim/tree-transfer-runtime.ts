/** V349 engine dispatch bound to the current real World. */
import type {Cell,Pawn} from './types.ts';
import {advanceWork,setWorkUnits,workProgress,WORK_FRACTIONS} from './work-progress.ts';
import {treeWorkCorePerTick,replantDurationCore,extractTreeDefinition,treePackLive} from './tree-transfer-rules.ts';
import type {TreeJob} from './tree-transfer-state.ts';
import {planTreeExtraction,commitTreeExtraction,planTreeReplantation,commitTreeReplantation,type TreeHost} from './tree-transfer-atomic.ts';
export interface TreeWorkContext {
  /** Includes affiliation/work table/Manipulation, area, physical recovery and claims. */
  permitted(pawn:Pawn,job:TreeJob):boolean;
  /** Only cardinal/actual contact with no future segment, no remaining route. */
  contact(pawn:Pawn,target:Cell):boolean;
  /** Must use existing common navigation quota/path pipeline. */
  move(target:Cell,touch:boolean):void;
  stop(pawn:Pawn,job:TreeJob):void;
  plantSpeed(pawn:Pawn):number;
  learnPlants(pawn:Pawn):void;
  /** This is custody transfer of the same wrapper, never a stack split. */
  pickupWhole(pawn:Pawn,job:TreeJob):boolean;
  /** Validate fertility/roof/obstacles, excluding non-tree plants via real clearing. */
  destinationReady(pawn:Pawn,job:TreeJob):boolean;
}
/** Returns whether the domain handled the current action, not a proof of success. */
export function advanceTreeTransfer(host:TreeHost,pawn:Pawn,job:TreeJob,context:TreeWorkContext):boolean {
  if(!context.permitted(pawn,job)){context.stop(pawn,job);return true;}
  if(job.tree.kind==='extract'){
    const tree=host.resource(job.tree.resourceId),def=tree&&extractTreeDefinition(tree);
    if(!tree||!def||!host.extractionReady(job,tree)){context.stop(pawn,job);return true;}
    if(!context.contact(pawn,tree)){context.move(tree,true);return true;}
    pawn.path=[];pawn.state='working';
    if(workProgress(job)<def.workCore){
      const rate=treeWorkCorePerTick(context.plantSpeed(pawn),host.growth(tree));
      if(rate<=0){context.stop(pawn,job);return true;}
      advanceWork(job,10*rate);
      if(workProgress(job)>def.workCore)setWorkUnits(job,def.workCore*WORK_FRACTIONS);
      context.learnPlants(pawn);
    }
    if(workProgress(job)>=def.workCore){const plan=planTreeExtraction(host,job);if(plan)commitTreeExtraction(host,plan);}
    return true;
  }
  const task=job.tree,ref=host.pile(task.sourcePileId),pile=ref?.pile;
  if(!ref?.active||!pile||!treePackLive(pile,host.tick)||pile.innerResource.id!==task.resourceId){context.stop(pawn,job);return true;}
  if(task.phase==='pickup'){
    if(pile.owner.type!=='ground'){context.stop(pawn,job);return true;}
    if(!context.contact(pawn,pile.owner)){context.move(pile.owner,true);return true;}
    if(context.pickupWhole(pawn,job)){task.carryPileId=pile.id;task.phase='carry';pawn.path=[];pawn.state='moving';}
    return true;
  }
  if(pile.owner.type!=='pawn'||pile.owner.pawnId!==pawn.id||task.carryPileId!==pile.id){context.stop(pawn,job);return true;}
  if(!context.destinationReady(pawn,job)){context.stop(pawn,job);return true;}
  if(!context.contact(pawn,job)){context.move(job,true);return true;}
  pawn.path=[];pawn.state='working';
  if(task.phase==='carry'){
    const def=extractTreeDefinition(pile.innerResource),duration=def&&replantDurationCore(def,context.plantSpeed(pawn),pile.innerResource.growth??1);
    if(duration===undefined){context.stop(pawn,job);return true;}
    task.phase='prepare';task.durationCore=duration;task.workCore=0;return true;
  }
  if(task.durationCore===undefined){context.stop(pawn,job);return true;}
  if(task.workCore<task.durationCore){task.workCore=Math.min(task.durationCore,task.workCore+10);context.learnPlants(pawn);}
  if(task.workCore>=task.durationCore){const plan=planTreeReplantation(host,job);if(plan)commitTreeReplantation(host,plan);}
  return true;
}