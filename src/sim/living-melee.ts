import { isAnimalTarget,type LivingTarget } from './combat-target.ts';
import { apparelProtection } from './apparel-protection.ts';
import { disturbanceEvents,isLying } from './disturbance.ts';
import { healthRandom,reconcilePawnHealth,updatePawnHealth } from './health.ts';
import { pawnBody } from './health-rules.ts';
import { createMedicalRecord } from './injury-state.ts';
import { resolveUnarmoredMelee } from './melee-impact.ts';
import { meleeHitChance,meleeDodgeChance,type MeleeTool } from './melee-statistics.ts';
import { applyBulletStagger } from './stagger.ts';
import { applyMeleeStun } from './stun.ts';
import { cancelShooting } from './shooting-state.ts';
import { learnSkill,XP_SCALE } from './skills.ts';
import { advanceAnimalHealth,animalBody,commitAnimalImpact,delayAnimalImpact } from './wildlife-health.ts';
import type { World } from './types.ts';

/** The same anatomical transaction serves both directions of interspecies
 * combat. Recovery is installed before injury can interrupt either actor. */
export function strikeLivingTarget(w:World,attacker:LivingTarget,target:LivingTarget,tool:MeleeTool,core:number,randomState:{rng:number},disturbance=disturbanceEvents(w)):void {
  const animal=isAnimalTarget(target),animalAttacker=isAnimalTarget(attacker),random=()=>healthRandom(randomState);
  const immobile=animal?['downed','sleeping'].includes(target.state):isLying(target);
  if(!animalAttacker&&!immobile)learnSkill(attacker.skills.melee,200*(tool.cooldownCore/60)*XP_SCALE,attacker);
  const ac=(animalAttacker?animalBody(attacker):pawnBody(attacker)).capacities,dc=(animal?animalBody(target):pawnBody(target)).capacities;
  const hit=immobile||random()<meleeHitChance(animalAttacker?4:attacker.skills.melee.level,ac.sight,ac.manipulation);
  const dodge=hit&&!immobile&&(animal||!target.shooting?.stance)&&random()<meleeDodgeChance(animal?0:target.skills.melee.level,dc.moving,dc.sight);
  const outcome=!hit?'miss':dodge?'dodge':'hit';
  const strike={targetId:target.id,atCore:core,untilCore:core+tool.cooldownCore,tool:tool.id,outcome} as const;
  if(animalAttacker){attacker.strike=strike;delete attacker.retaliation;}else attacker.melee!.strike=strike;
  attacker.path=[];attacker.state='idle';
  // A miss still registers a nearby melee threat and wakes a wild animal.
  if(animal&&target.state!=='downed'){
    target.threat={targetId:attacker.id,harmedAtCore:core};target.sleepUntilCore=Math.max(target.sleepUntilCore??0,core+1000);
    delete target.meal;delete target.flee;target.path=[];target.state=target.motion&&target.motion.end>w.tick?'moving':'idle';target.nextDecision=w.tick;
  }
  let stun=false,injured=false;
  if(outcome==='hit'){
    const damage=Math.max(1,tool.damage*(.8+random()*.4));
    w.rng=randomState.rng;
    if(animal)advanceAnimalHealth(w,target);else if(!target.health||target.health.tick<w.tick)updatePawnHealth(w,target);
    randomState.rng=w.rng;
    const protection=animal?undefined:apparelProtection(w,target,tool.kind==='bite'?'sharp':'blunt',tool.penetration,random);
    const record=target.health??{...createMedicalRecord(w.tick),...(animal?{body:'hare' as const}:{})};
    const impact=resolveUnarmoredMelee(record,{damage,kind:tool.kind},random,protection?.protect);
    protection?.commit();injured=impact.layers.length>0;stun=impact.stun;
    if(animal)commitAnimalImpact(w,target,impact.record,randomState);else target.health=impact.record;
  }
  w.rng=randomState.rng;
  if(animal)delayAnimalImpact(target,core,stun);
  else {
    if(outcome==='hit'){reconcilePawnHealth(w,target);if(injured)disturbance.damage(target,core,immobile);}
    applyBulletStagger(w,target,core,1);if(stun)applyMeleeStun(w,target,core);
    if(target.shooting?.stance?.phase==='aim')cancelShooting(target);
  }
  if(!animalAttacker)attacker.lastAttack={targetId:target.id,atCore:core};
}
