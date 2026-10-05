import { assignBackground } from '../../src/sim/background-generation.ts';
import { applyCommand } from '../../src/sim/engine.ts';
import { mentalState } from '../../src/sim/mental-state.ts';
import { breakThresholds } from '../../src/sim/traits.ts';
import type { Pawn, Structure, World } from '../../src/sim/types.ts';
import { fixtureBuilding } from '../scenarios/deconstruction.ts';
import { medicalCamp } from '../scenarios/health.ts';

export type AggressiveCrisisKind='tantrum'|'berserk'|'murderous-rage';
export const AGGRESSIVE_CRISIS_KINDS:readonly AggressiveCrisisKind[]=['tantrum','berserk','murderous-rage'];

/** Healthy private test camp. Nothing has broken, attacked or recovered. */
export function mentalCrisesCamp(count=3):World {
  const world=medicalCamp(count);
  for(const [i,pawn] of world.pawns.entries()){
    Object.assign(pawn,{x:10+i*4,z:12,hunger:95,rest:90,mood:70,comfort:50,hostilityResponse:'ignore'});
    pawn.recreation.level=50;pawn.traits=['optimist'];pawn.memories=[];
    delete pawn.health;delete pawn.mental;
    for(const work of Object.keys(pawn.priorities) as Array<keyof Pawn['priorities']>)pawn.priorities[work]=0;
  }
  return world;
}

/** Two existing, intact owned buildings satisfy the bounded Tantrum catalogue. */
export function crisisBuildings(world:World):[number,number] {
  const stool:Structure=fixtureBuilding(world,'stool',12,15),table:Structure=fixtureBuilding(world,'table',16,15);
  stool.material='wood';table.material='wood';return [stool.id,table.id];
}

/** Exposure only. Its RNG is supplied explicitly; the real producer must start
 * the crisis later. Fourteen ticks remain before the first sampled check. */
export function exposeToCrisis(world:World,pawn:Pawn,kind:AggressiveCrisisKind,rng:number):void {
  if(pawn.mental?.crisis)throw new Error('Cannot prepare exposure over an existing crisis.');
  const thresholds=breakThresholds(pawn),major=kind==='tantrum';
  pawn.mood=major?(thresholds[1]+thresholds[2])/2:0;
  const mental=mentalState(pawn);mental.below=major?[2100,2100,0]:[2100,2100,2100];mental.cooldown=0;
  world.rng=rng;world.tick+=(1-(world.tick+pawn.id)%15+15)%15;
}

/** Native preparation has a real tree/job, but no assigned work or episode.
 * The browser must order it, observe its active edge and then the mood entry.
 * Seeds are deliberately required rather than guessed before the final engine. */
export function mentalCrisesNativeFixture(kind:AggressiveCrisisKind,rng:number) {
  const world=mentalCrisesCamp(),aggressor=world.pawns[0]!,victim=world.pawns[1]!,defender=world.pawns[2]!;
  aggressor.name='<b>Colère</b> & retour';victim.name='Cible de la colère';defender.name='Défense au contact';
  victim.x=18;defender.x=18;defender.z=14;defender.skills.melee.level=12;
  const buildingIds=crisisBuildings(world);
  const tree={id:world.nextId++,kind:'tree' as const,x:14,z:12,amount:12};world.resources.push(tree);
  if(!applyCommand(world,{type:'designate',kind:'chop',x:tree.x,z:tree.z}).ok)throw new Error('Cannot prepare the unfinished crisis job.');
  const job=world.jobs.at(-1)!;aggressor.priorities.gather=1;
  exposeToCrisis(world,aggressor,kind,rng);
  return {world,kind,aggressorId:aggressor.id,victimId:victim.id,defenderId:defender.id,jobId:job.id,buildingIds};
}

/** A pacifist's stored level is intentionally high: admission must not turn it
 * into an effective combat level or grant forbidden XP. */
export function makeCrisisPacifist(pawn:Pawn):void {
  assignBackground(pawn,{childhood:'quiet-child'});
  Object.assign(pawn.skills.melee,{level:20,xp:765432,dailyXp:12345});
}
