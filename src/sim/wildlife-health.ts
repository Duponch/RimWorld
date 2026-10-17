import {activeHiveInsect256,hiveInstigatorFaction256,notifyHivePawnHarmed256,receiveHiveMemo256,combatTargetKeyForHive256} from './cave-hive-lord-256.ts';
import {detachHiveInsect256} from './cave-hive-lifecycle-256.ts';
import {commitToxicDeath256,cancelToxicVomit256} from './toxic-buildup-256.ts';
import {localAnimalConditionFrontier256} from './animal-condition-medical-frontier-256.ts';
import {cancelCryptosleepVomit256} from './cryptosleep-sickness-256.ts';
import {dropAnimalContentsOnDeath256,cancelAnimalLocalGroupIntents256} from './animal-local-contents-256.ts';
import {beginDuckFlyExit256} from './duck-flyer-runtime-256.ts';
import {planAnimalDeathExplosion256,isExplosiveAnimal256,requireAnimalDeathCapacity256} from './animal-death-explosion-v256.ts';
import {createAnimalMedicalRecord256} from './animal-clinical-age-v256.ts';
import {isAnimalSpecies256} from './animal-core-v256.ts';
import { animalBodyModel } from './body-model.ts';
import { assessBody,HEALTHY_BODY_INPUT } from './body-capacities.ts';
import { advanceMedical } from './injury-evolution.ts';
import { assessMedical,medicalStatus } from './injury-state.ts';
import { resolveUnarmoredBullet,validateUnarmoredBullet,type UnarmoredBullet } from './bullet-impact.ts';
import { healthRandom } from './health.ts';
import { mergeSlowIntervals,travelEnd } from './travel-timing.ts';
import type { WildAnimal } from './wildlife-state.ts';
import { animalSpecies } from './animal-species.ts';
import { animalNutritionMax } from './animal-life.ts';
import type { Cell,World } from './types.ts';
import { malnutritionRate } from './malnutrition.ts';
import { cancelAnimalPredation } from './wildlife-predation.ts';
import { recoverAnimalManhunter } from './animal-manhunter.ts';
import { animalCarrier } from './animal-rest-state.ts';

const HEALTHY_ANIMALS=new Map<ReturnType<typeof animalBodyModel>,ReturnType<typeof assessBody>>();
export const animalBody=(a:WildAnimal)=>{
  if(a.health)return assessMedical(a.health);
  const model=animalBodyModel(a.species,a.ageTicks,a.growthTracker?.value);let body=HEALTHY_ANIMALS.get(model);if(!body){body=assessBody(HEALTHY_BODY_INPUT,model);HEALTHY_ANIMALS.set(model,body);}return body;
};
export function reconcileAnimalHealth(w:World,a:WildAnimal):void {
  if(!a.health)return;
  if(a.health.death&&isAnimalSpecies256(a.species))a.ageTicks=a.health.death.tick-a.health.animalBirthTick!;
  const status=medicalStatus(a.health);if(status==='dead')commitToxicDeath256(a.health,()=>healthRandom(w));
  if(w.schemaVersion>=256&&status==='dead'){if(a.state!=='dead'){detachHiveInsect256(w,a);const wasSpawned=!animalCarrier(w,a.id);dropAnimalContentsOnDeath256(w,a,wasSpawned);cancelAnimalLocalGroupIntents256(w,a.id);}delete a.mapBed;if(a.domestic)delete a.domestic.bedId;}
  if(status!=='mobile') {
    // A real downing also releases the implicit Hive job reservation now;
    // Lord membership and the captured physical edge keep their own owners.
    if(w.schemaVersion===256)delete a.hiveJob;
    cancelCryptosleepVomit256(a.health);if(a.state!==status||status==='dead'||!assessMedical(a.health).canBeAwake)cancelToxicVomit256(a.health);
    recoverAnimalManhunter(w,a);
    delete a.confusion;if(a.wander)delete a.wander.job;
    const changed=a.state!==status;
    a.state=status;a.path=[];delete a.exitFlight;delete a.meal;delete a.flee;delete a.threat;delete a.retaliation;delete a.strike;delete a.stun;delete a.exiting;delete a.eggLay;delete a.predation;delete a.manhunter;
    // Keep a captured edge. Presentation finishes its continuous falling path.
    if(changed){w.events.push({tick:w.tick,type:'need',message:`${animalSpecies(a.species).label} ${a.id} ${status==='dead'?'est mort':'est à terre'}.`});if(w.events.length>80)w.events.splice(0,w.events.length-80);}
  } else if(a.state==='downed'){a.state='idle';a.nextDecision=w.tick;}
}
export function advanceAnimalHealth(w:World,a:WildAnimal):void {
  if(w.schemaVersion>=256&&a.health?.toxicBuildup&&!a.health.death&&a.state!=='dead'){advanceExplosiveAnimalHealth256(w,a,true);return;}
  if(w.schemaVersion>=256&&isExplosiveAnimal256(a.species)){advanceExplosiveAnimalHealth256(w,a);return;}
  if(w.schemaVersion>=84&&a.food<=0&&a.state!=='dead')a.health??=createAnimalMedicalRecord256(w,a,Math.max(0,w.tick-1));
  if(a.stagger&&a.stagger.untilCore<=w.tick*10)delete a.stagger;
  if(a.sleepUntilCore!==undefined&&a.sleepUntilCore<=w.tick*10)delete a.sleepUntilCore;
  if(!a.health||a.health.death)return;
  const lying=(!a.motion||a.motion.end<=w.tick)&&['sleeping','downed'].includes(a.state)&&!(w.schemaVersion>=221&&animalCarrier(w,a.id));
  const conditionFrontier=localAnimalConditionFrontier256(w,a,a.health,()=>healthRandom(w));
  advanceMedical(a.health,w.tick-a.health.tick,{phase:a.id%60,toxicOwner:{id:a.id,spawned:!animalCarrier(w,a.id),awake:a.state!=='sleeping'&&!a.stun},cryptosleepSicknessSpawned:!animalCarrier(w,a.id),posture:lying?'ground':'standing',starving:a.food<=0,malnutritionRate:w.schemaVersion>=84?malnutritionRate(a.id):undefined,
    hunger:a.food/animalNutritionMax(a)*100,rest:a.rest*100,restingBonus:lying&&a.state==='sleeping',infectionSeed:(w.seed^Math.imul(a.id,0x9e3779b1))>>>0},()=>healthRandom(w),conditionFrontier);
  conditionFrontier?.commit();reconcileAnimalHealth(w,a);
}
export function scareAnimal(w:World,a:WildAnimal,danger:Cell,core:number):void {
  if(a.state==='dead'||a.state==='downed'||a.manhunter||a.exitFlight||activeHiveInsect256(a))return;
  if(a.health)cancelToxicVomit256(a.health);
  cancelAnimalPredation(w,a);
  a.sleepUntilCore=Math.max(a.sleepUntilCore??0,core+1000);
  if(beginDuckFlyExit256(w,a,core,'flee'))return;
  delete a.threat;delete a.retaliation;
  a.flee={danger:{x:danger.x,z:danger.z},until:w.tick+600};
  delete a.exiting;
  delete a.meal;a.path=[];a.state=a.motion&&a.motion.end>w.tick?'moving':'idle';a.nextDecision=w.tick;
}
/** Real projectile producer. Commit localized injuries, death roll and PRNG
 * together; no global animal hit-point counter or resource creation. */
export function damageAnimalWithBullet(w:World,a:WildAnimal,hit:UnarmoredBullet,core=w.tick*10,danger?:Cell,instigatorId?:number):void {
  const model=animalBodyModel(a.species,a.ageTicks,a.growthTracker?.value);validateUnarmoredBullet(hit,model);
  if(!Number.isSafeInteger(core)||core<Math.max(0,(w.tick-1)*10)||core>w.tick*10)throw new Error('Invalid animal impact time');
  if(w.schemaVersion<77||!w.wildlife?.animals.includes(a))throw new Error('Invalid animal impact owner');
  if(a.state==='dead'||!hit.damage)return;
  requireAnimalDeathCapacity256(w,a);advanceAnimalHealth(w,a);if(a.health?.death)return;
  const random={rng:w.rng};
  const record=a.health??createAnimalMedicalRecord256(w,a);
  const impact=resolveUnarmoredBullet(record,hit,()=>healthRandom(random));
  if(!impact.selected)return;
  const preyId=a.predation?.targetId;
  commitAnimalImpact(w,a,impact.record,random,core,instigatorId===undefined?undefined:combatTargetKeyForHive256(w,instigatorId));
  // A predator's own prey is not a third-party ranged interruption. Without
  // an identified instigator, preserve the hunt rather than invent ownership.
  if(danger&&(preyId===undefined||instigatorId!==undefined&&instigatorId!==preyId))scareAnimal(w,a,danger,core);
  delayAnimalImpact(a,core);
}
/** Shared violent-injury transaction; delayed blood loss never enters it. */
export function commitAnimalImpact(w:World,a:WildAnimal,record:import('./injury-types.ts').MedicalRecord,random:{rng:number},core=w.tick*10,instigator?:import('./mini-turret-state.ts').BombInstigatorKey,collapse=false):void {
  const lordId=a.hive?.lordId;
  if(a.state!=='downed'&&medicalStatus(record)==='downed'&&healthRandom(random)<.5)record.death={tick:w.tick,cause:'downed'};
  const death=planAnimalDeathExplosion256(w,a,record,core);death.commit();
  commitToxicDeath256(record,()=>healthRandom(random));w.rng=random.rng;a.health=record;reconcileAnimalHealth(w,a);
  if(lordId!==null&&lordId!==undefined){if(a.state==='dead'){if(!collapse)receiveHiveMemo256(w,'pawn-lost',core,lordId);}else{const f=hiveInstigatorFaction256(w,instigator);notifyHivePawnHarmed256(w,lordId,f.hasFaction,f.parentFaction,core,()=>healthRandom(random));}w.rng=random.rng;}
}
export function delayAnimalImpact(a:WildAnimal,core:number,stun=false,stunDurationCore=45):void {
  if(a.state==='dead')return;
  // Revolver stopping power .5 exceeds this species' body size .2.
  const at=core/10;
  a.stagger={sinceCore:a.stagger&&a.stagger.untilCore>=core?a.stagger.sinceCore:core,untilCore:Math.max(a.stagger?.untilCore??0,core+95)};
  if(stun&&a.state!=='downed')a.stun={sinceCore:a.stun&&a.stun.untilCore>=core?a.stun.sinceCore:core,untilCore:Math.max(a.stun?.untilCore??0,core+stunDurationCore)};
  if(stun&&a.exiting){delete a.exiting;a.path=[];}
  if(a.motion&&a.motion.end>at){const m={...a.motion,stagger:mergeSlowIntervals([...(a.motion.stagger??[]),{start:Math.max(a.motion.start,at),end:a.stagger.untilCore/10}])};if(stun&&a.stun)m.stuns=mergeSlowIntervals([...(m.stuns??[]),{start:Math.max(m.start,at),end:a.stun!.untilCore/10}]);m.end=travelEnd(m);a.motion=m;}
}

/** Explosive health evolves a private record/stream so a capacity refusal
 * cannot leave clinical death or RNG committed without its required wave. */
function advanceExplosiveAnimalHealth256(w:World,a:WildAnimal,privateActor=false):void {
 const originalHealth=a.health,actualRng=w.rng,actualTick=w.tick,actualActors=w.wildlife?.animals,actorBefore=privateActor?JSON.stringify(a):undefined;
 if(privateActor&&(!actualActors?.includes(a)||!Object.isExtensible(a)||Reflect.ownKeys(a).some(k=>{const d=Object.getOwnPropertyDescriptor(a,k)!;return !('value'in d)||!d.writable||!d.configurable;})))throw Error('Toxic animal lacks its mutable actual original');
 const outcome=privateActor?structuredClone(a):a;
 if(outcome.stagger&&outcome.stagger.untilCore<=w.tick*10)delete outcome.stagger;
 if(outcome.sleepUntilCore!==undefined&&outcome.sleepUntilCore<=w.tick*10)delete outcome.sleepUntilCore;
 if(a.state==='dead'||a.health?.death)return;
 const record=privateActor?outcome.health:a.health?structuredClone(a.health):a.food<=0?createAnimalMedicalRecord256(w,a,Math.max(0,w.tick-1)):undefined;if(!record)return;
 const lying=(!a.motion||a.motion.end<=w.tick)&&['sleeping','downed'].includes(a.state)&&!animalCarrier(w,a.id),random={rng:w.rng};
 const conditionFrontier=localAnimalConditionFrontier256(w,a,record,()=>healthRandom(random));
 advanceMedical(record,w.tick-record.tick,{phase:a.id%60,toxicOwner:{id:a.id,spawned:!animalCarrier(w,a.id),awake:a.state!=='sleeping'&&!a.stun},cryptosleepSicknessSpawned:!animalCarrier(w,a.id),posture:lying?'ground':'standing',starving:a.food<=0,malnutritionRate:malnutritionRate(a.id),hunger:a.food/animalNutritionMax(a)*100,rest:a.rest*100,restingBonus:lying&&a.state==='sleeping',infectionSeed:(w.seed^Math.imul(a.id,0x9e3779b1))>>>0},()=>healthRandom(random),conditionFrontier);
 const death=planAnimalDeathExplosion256(w,a,record);
 if(privateActor&&(w.tick!==actualTick||w.rng!==actualRng||w.wildlife?.animals!==actualActors||!actualActors?.includes(a)||a.health!==originalHealth||JSON.stringify(a)!==actorBefore))throw Error('Stale actual toxic animal outcome');
 commitToxicDeath256(record,()=>healthRandom(random));death.commit();
 if(privateActor){outcome.health=record;for(const key of Object.keys(a))if(!Object.hasOwn(outcome,key))delete (a as unknown as Record<string,unknown>)[key];Object.assign(a,outcome);}else a.health=record;
 w.rng=random.rng;conditionFrontier?.commit();reconcileAnimalHealth(w,a);
}
