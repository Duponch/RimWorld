import { exposeFoodPoisoning,ingestionFoodPoison } from './food-poisoning.ts';
import { processFoodPoisoningVomit,processVomit,type FoodPoisonVomitContext } from './food-poisoning-runtime.ts';
import { fluVomitChance } from './flu-rules.ts';
import { immuneDiseaseVomitChance } from './immune-diseases-rules.ts';
import { createMedicalRecord } from './injury-state.ts';
import { healthRandom,reconcilePawnHealth } from './health.ts';
import { reconcileAnimalHealth } from './wildlife-health.ts';
import { interruptWork } from './interrupted-cargo.ts';
import { addFilth } from './filth.ts';
import { canStandAt } from './furniture-travel.ts';
import type { WildAnimal } from './wildlife-state.ts';
import { animalSpecies } from './animal-species.ts';
import type { MaterialPile,Pawn,World } from './types.ts';

/** Selected difficulty applies at ingestion, including animals. The historical
 * camp retains factor one; a new mechanism never pretends it is Adventure. */
export function ingestFoodRisk(w:World,p:Pawn|WildAnimal,food:Pick<MaterialPile,'item'|'foodPoison'>,human=true):void {
  if(w.schemaVersion<89)return;
  const cause=ingestionFoodPoison(food,human,w.gameProfile?.difficulty==='adventure-story'?.75:1,()=>healthRandom(w));
  if(!cause)return;
  p.health??={...createMedicalRecord(w.tick),...(!human?{body:(p as WildAnimal).species}:{})};
  p.health.foodPoisoning=exposeFoodPoisoning(p.health.foodPoisoning,cause,food.item,w.tick);
  if(human)reconcilePawnHealth(w,p as Pawn);else reconcileAnimalHealth(w,p as WildAnimal);
  w.events.push({tick:w.tick,type:'need',message:`${human?(p as Pawn).name:animalSpecies((p as WildAnimal).species).label+' '+p.id} souffre d’une intoxication alimentaire.`});
  if(w.events.length>80)w.events.splice(0,w.events.length-80);
}
/** Captured movement finishes before a vomiting episode interrupts the job.
 * Carried material is released through the ordinary conservative mechanism. */
export function processPawnVomiting(w:World,p:Pawn):boolean {
  const state=p.health?.foodPoisoning,flu=p.health?.flu,malaria=p.health?.immuneDiseases?.malaria;
  if((!state&&!flu&&!malaria)||p.state==='dead')return false;
  const context:FoodPoisonVomitContext={
    awake:!['sleeping','downed'].includes(p.state)&&!p.stun,position:p,foodLevel:p.hunger,foodMax:100,
    random:()=>healthRandom(w),canStand:c=>canStandAt(w,c),deposit:c=>addFilth(w,c,'vomit'),
    start:()=>{if(p.moveCooldown>0)return false;interruptWork(w,p);p.path=[];p.state='idle';return true;},
  };
  // An active malaria episode keeps its owner; otherwise the historical
  // food poisoning/Flu order runs first, followed by malaria only if idle.
  const activeMalaria=!!malaria?.vomit;
  let chosen:ReturnType<typeof processVomit>|undefined;
  if(activeMalaria)chosen=processVomit(malaria!,w.tick,p.id%60,context,immuneDiseaseVomitChance(malaria));
  else{
    const result=state?.vomit?processFoodPoisoningVomit(state,w.tick,p.id%60,context):
      flu?.vomit?processVomit(flu,w.tick,p.id%60,context,fluVomitChance(flu)):
      state?processFoodPoisoningVomit(state,w.tick,p.id%60,context):undefined;
    chosen=result?.active||!flu?result:processVomit(flu,w.tick,p.id%60,context,fluVomitChance(flu));
    if(!chosen?.active&&malaria)chosen=processVomit(malaria,w.tick,p.id%60,context,immuneDiseaseVomitChance(malaria));
  }
  // Evolution retains residual malaria while its physical episode is active.
  // Completing that episode can exhaust the final reason to keep the record.
  const diseases=p.health?.immuneDiseases;
  if(malaria&&diseases?.malaria===malaria&&!malaria.severity&&!malaria.immunity&&!malaria.vomit){
    delete diseases.malaria;if(!diseases.plague)delete p.health!.immuneDiseases;
  }
  if(!chosen)return false;
  p.hunger=chosen.foodLevel;
  if(chosen.active){p.path=[];if(!['dead','downed','sleeping'].includes(p.state))p.state='idle';p.planCooldown=0;}
  return chosen.active;
}
export function processAnimalVomiting(w:World,a:WildAnimal):boolean {
  const state=a.health?.foodPoisoning;if(!state||a.state==='dead')return false;
  const result=processFoodPoisoningVomit(state,w.tick,a.id%60,{
    awake:!['sleeping','downed'].includes(a.state)&&!a.stun,position:a,foodLevel:a.food,foodMax:animalSpecies(a.species).nutrition,
    random:()=>healthRandom(w),canStand:c=>canStandAt(w,c),deposit:c=>addFilth(w,c,'vomit'),
    start:()=>{if(a.motion&&a.motion.end>w.tick||a.strike&&a.strike.untilCore>w.tick*10)return false;a.path=[];delete a.meal;delete a.strike;delete a.retaliation;a.state='idle';return true;},
  });
  a.food=result.foodLevel;if(result.active)a.nextDecision=w.tick+1;return result.active;
}
