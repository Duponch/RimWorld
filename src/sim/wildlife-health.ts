import { HARE_MODEL } from './body-model.ts';
import { assessBody,HEALTHY_BODY_INPUT } from './body-capacities.ts';
import { advanceMedical } from './injury-evolution.ts';
import { assessMedical,createMedicalRecord,medicalStatus } from './injury-state.ts';
import { resolveUnarmoredBullet,validateUnarmoredBullet,type UnarmoredBullet } from './bullet-impact.ts';
import { healthRandom } from './health.ts';
import { mergeSlowIntervals,travelEnd } from './travel-timing.ts';
import type { WildAnimal } from './wildlife-state.ts';
import { HARE } from './wildlife-state.ts';
import type { Cell,World } from './types.ts';
import { malnutritionRate } from './malnutrition.ts';

const HEALTHY_HARE=assessBody(HEALTHY_BODY_INPUT,HARE_MODEL);
export const animalBody=(a:WildAnimal)=>a.health?assessMedical(a.health):HEALTHY_HARE;
export function reconcileAnimalHealth(w:World,a:WildAnimal):void {
  if(!a.health)return;
  const status=medicalStatus(a.health);
  if(status!=='mobile') {
    const changed=a.state!==status;
    a.state=status;a.path=[];delete a.meal;delete a.flee;delete a.threat;delete a.retaliation;delete a.strike;delete a.stun;
    // Keep a captured edge. Presentation finishes its continuous falling path.
    if(changed){w.events.push({tick:w.tick,type:'need',message:`Lièvre ${a.id} ${status==='dead'?'est mort':'est à terre'}.`});if(w.events.length>80)w.events.splice(0,w.events.length-80);}
  } else if(a.state==='downed'){a.state='idle';a.nextDecision=w.tick;}
}
export function advanceAnimalHealth(w:World,a:WildAnimal):void {
  if(w.schemaVersion>=84&&a.food<=0&&a.state!=='dead')a.health??={...createMedicalRecord(Math.max(0,w.tick-1)),body:'hare'};
  if(a.stagger&&a.stagger.untilCore<=w.tick*10)delete a.stagger;
  if(a.sleepUntilCore!==undefined&&a.sleepUntilCore<=w.tick*10)delete a.sleepUntilCore;
  if(!a.health||a.health.death)return;
  const lying=(!a.motion||a.motion.end<=w.tick)&&['sleeping','downed'].includes(a.state);
  advanceMedical(a.health,w.tick-a.health.tick,{phase:a.id%60,posture:lying?'ground':'standing',starving:a.food<=0,malnutritionRate:w.schemaVersion>=84?malnutritionRate(a.id):undefined,
    hunger:a.food/HARE.nutrition*100,rest:a.rest*100,restingBonus:lying&&a.state==='sleeping',infectionSeed:(w.seed^Math.imul(a.id,0x9e3779b1))>>>0},()=>healthRandom(w));
  reconcileAnimalHealth(w,a);
}
export function scareAnimal(w:World,a:WildAnimal,danger:Cell,core:number):void {
  if(a.state==='dead'||a.state==='downed')return;
  a.sleepUntilCore=Math.max(a.sleepUntilCore??0,core+1000);
  delete a.threat;delete a.retaliation;
  a.flee={danger:{x:danger.x,z:danger.z},until:w.tick+600};
  delete a.meal;a.path=[];a.state=a.motion&&a.motion.end>w.tick?'moving':'idle';a.nextDecision=w.tick;
}
/** Real projectile producer. Commit localized injuries, death roll and PRNG
 * together; no global animal hit-point counter or resource creation. */
export function damageAnimalWithBullet(w:World,a:WildAnimal,hit:UnarmoredBullet,core=w.tick*10,danger?:Cell):void {
  validateUnarmoredBullet(hit,HARE_MODEL);
  if(!Number.isSafeInteger(core)||core<Math.max(0,(w.tick-1)*10)||core>w.tick*10)throw new Error('Invalid animal impact time');
  if(w.schemaVersion<77||!w.wildlife?.animals.includes(a))throw new Error('Invalid animal impact owner');
  if(a.state==='dead'||!hit.damage)return;
  advanceAnimalHealth(w,a);if(a.health?.death)return;
  const random={rng:w.rng};
  const record=a.health??{...createMedicalRecord(w.tick),body:'hare' as const};
  const impact=resolveUnarmoredBullet(record,hit,()=>healthRandom(random));
  if(!impact.selected)return;
  commitAnimalImpact(w,a,impact.record,random);
  if(danger)scareAnimal(w,a,danger,core);
  delayAnimalImpact(a,core);
}
/** Shared violent-injury transaction; delayed blood loss never enters it. */
export function commitAnimalImpact(w:World,a:WildAnimal,record:import('./injury-types.ts').MedicalRecord,random:{rng:number}):void {
  if(a.state!=='downed'&&medicalStatus(record)==='downed'&&healthRandom(random)<.5)record.death={tick:w.tick,cause:'downed'};
  w.rng=random.rng;a.health=record;reconcileAnimalHealth(w,a);
}
export function delayAnimalImpact(a:WildAnimal,core:number,stun=false):void {
  if(a.state==='dead')return;
  // Revolver stopping power .5 exceeds this species' body size .2.
  const at=core/10;
  a.stagger={sinceCore:a.stagger&&a.stagger.untilCore>=core?a.stagger.sinceCore:core,untilCore:Math.max(a.stagger?.untilCore??0,core+95)};
  if(stun&&a.state!=='downed')a.stun={sinceCore:a.stun&&a.stun.untilCore>=core?a.stun.sinceCore:core,untilCore:Math.max(a.stun?.untilCore??0,core+45)};
  if(a.motion&&a.motion.end>at){const m={...a.motion,stagger:mergeSlowIntervals([...(a.motion.stagger??[]),{start:Math.max(a.motion.start,at),end:a.stagger.untilCore/10}])};if(stun&&a.stun)m.stuns=mergeSlowIntervals([...(m.stuns??[]),{start:Math.max(m.start,at),end:a.stun!.untilCore/10}]);m.end=travelEnd(m);a.motion=m;}
}
