import { medicalCamp } from './health.ts';
import { fixtureBuilding } from './deconstruction.ts';
import { fixturePower } from './power.ts';
import { shootingQueries } from '../../src/sim/shooting.ts';
import { captureTurretTargets,type TurretQueries,type TurretTargetIndex } from '../../src/sim/mini-turret.ts';
import { newMiniTurretState } from '../../src/sim/mini-turret-state.ts';
import { SMITHING_RESEARCH_COST,MACHINING_RESEARCH_COST,GUNSMITHING_RESEARCH_COST,GUN_TURRETS_RESEARCH_COST } from '../../src/sim/research.ts';
import type { Structure,World } from '../../src/sim/types.ts';

/** Intact prepared machine and hostile human, with no shot/damage/reload played.
 * Seed1 and an ID on the Core15 phase expose the first private shot at a local
 * boundary; the unused ID gap is explicit, not a hidden remapping of RNG. */
export function miniTurretCamp():World {
  const w=medicalCamp(3,64);w.rng=1;
  w.research??={project:null,points:0};w.research.project=null;
  Object.assign(w.research,{smithing:{points:SMITHING_RESEARCH_COST,completedAt:0},machining:{points:MACHINING_RESEARCH_COST,completedAt:0},
    gunsmithing:{points:GUNSMITHING_RESEARCH_COST,completedAt:0},gunTurrets:{points:GUN_TURRETS_RESEARCH_COST,completedAt:0}});
  if(w.wildlife)w.wildlife.animals=[];
  Object.assign(w.pawns[0]!,{x:4,z:4});
  Object.assign(w.pawns[1]!,{x:44,z:32,faction:'outlaws'});
  Object.assign(w.pawns[2]!,{x:4,z:6,faction:'outlanders'});
  const generator=fixturePower(w,'wood-generator',11,32);
  w.nextId+=(15-w.nextId%15)%15;
  const turret:Structure=fixtureBuilding(w,'mini-turret',16,32);
  turret.material='steel';turret.power={on:true,parentId:generator.id};turret.turret=newMiniTurretState();
  return w;
}
export const campTurret=(w:World):Structure=>w.structures.find(s=>s.kind==='mini-turret')!;
/** This capture dies with a synchronous unchanged decision, as in combat. */
export function miniTurretQueries(w:World):TurretQueries {
  const queries=shootingQueries(w);let index:TurretTargetIndex|undefined;
  return {...queries,turretTargets:()=>index??=captureTurretTargets(w)};
}
