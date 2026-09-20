import { exposeFoodPoisoning,ingestionFoodPoison } from './food-poisoning.ts';
import { processFoodPoisoningVomit } from './food-poisoning-runtime.ts';
import { createMedicalRecord } from './injury-state.ts';
import { healthRandom,reconcilePawnHealth } from './health.ts';
import { reconcileAnimalHealth } from './wildlife-health.ts';
import { interruptWork } from './interrupted-cargo.ts';
import { addFilth } from './filth.ts';
import { canStandAt } from './furniture-travel.ts';
import { HARE,type WildAnimal } from './wildlife-state.ts';
import type { MaterialPile,Pawn,World } from './types.ts';

/** Selected difficulty applies at ingestion, including animals. The historical
 * camp retains factor one; a new mechanism never pretends it is Adventure. */
export function ingestFoodRisk(w:World,p:Pawn|WildAnimal,food:Pick<MaterialPile,'item'|'foodPoison'>,human=true):void {
  if(w.schemaVersion<89)return;
  const cause=ingestionFoodPoison(food,human,w.gameProfile?.difficulty==='adventure-story'?.75:1,()=>healthRandom(w));
  if(!cause)return;
  p.health??={...createMedicalRecord(w.tick),...(!human?{body:'hare' as const}:{})};
  p.health.foodPoisoning=exposeFoodPoisoning(p.health.foodPoisoning,cause,food.item,w.tick);
  if(human)reconcilePawnHealth(w,p as Pawn);else reconcileAnimalHealth(w,p as WildAnimal);
  w.events.push({tick:w.tick,type:'need',message:`${human?(p as Pawn).name:'Lièvre '+p.id} souffre d’une intoxication alimentaire.`});
  if(w.events.length>80)w.events.splice(0,w.events.length-80);
}
/** Captured movement finishes before a vomiting episode interrupts the job.
 * Carried material is released through the ordinary conservative mechanism. */
export function processPawnVomiting(w:World,p:Pawn):boolean {
  const state=p.health?.foodPoisoning;if(!state||p.state==='dead')return false;
  const result=processFoodPoisoningVomit(state,w.tick,p.id%60,{
    awake:!['sleeping','downed'].includes(p.state)&&!p.stun,position:p,foodLevel:p.hunger,foodMax:100,
    random:()=>healthRandom(w),canStand:c=>canStandAt(w,c),deposit:c=>addFilth(w,c,'vomit'),
    start:()=>{if(p.moveCooldown>0)return false;interruptWork(w,p);p.path=[];p.state='idle';return true;},
  });
  p.hunger=result.foodLevel;
  if(result.active){p.path=[];if(!['dead','downed','sleeping'].includes(p.state))p.state='idle';p.planCooldown=0;}
  return result.active;
}
export function processAnimalVomiting(w:World,a:WildAnimal):boolean {
  const state=a.health?.foodPoisoning;if(!state||a.state==='dead')return false;
  const result=processFoodPoisoningVomit(state,w.tick,a.id%60,{
    awake:!['sleeping','downed'].includes(a.state)&&!a.stun,position:a,foodLevel:a.food,foodMax:HARE.nutrition,
    random:()=>healthRandom(w),canStand:c=>canStandAt(w,c),deposit:c=>addFilth(w,c,'vomit'),
    start:()=>{if(a.motion&&a.motion.end>w.tick)return false;a.path=[];delete a.meal;delete a.strike;delete a.retaliation;a.state='idle';return true;},
  });
  a.food=result.foodLevel;if(result.active)a.nextDecision=w.tick+1;return result.active;
}
