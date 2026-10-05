import { mechanoidCombatCamp,fixtureMechanoid } from './mechanoid-combat-v213.ts';
import { blockedCells } from '../../src/sim/pathfinding.ts';
import { LightEnvironmentCache } from '../../src/sim/light-environment.ts';
import { mechanoidCombatBatch,processMechanoidCombat } from '../../src/sim/mechanoid-combat.ts';
import type { RangedMechanoidKind } from '../../src/sim/mechanoid-ranged-state.ts';
import type { World } from '../../src/sim/types.ts';

/** Authored positions, kind and staging roster, before any route/aim/shot.
 * The authentic new-game clocks and initial personal pass come from V213's
 * preparation. No clinical state or combat consequence is injected. */
export function rangedMechanoidCamp(kind:RangedMechanoidKind='lancer',seed=1){
  const {w,m,victim}=mechanoidCombatCamp();m.mechKind=kind;w.rng=seed;
  w.raids!.mechActive!.composition={budget:kind==='lancer'?190:110,roster:[kind]};
  Object.assign(victim,{x:60,z:48});Object.assign(w.pawns[1]!,{x:60,z:50});
  return {w,m,victim};
}
export function prepareRangedDecision(w:World,m:ReturnType<typeof fixtureMechanoid>,remaining=1){
  const light=new LightEnvironmentCache(),budget={remaining,pairs:32768};
  processMechanoidCombat(w,m,()=>blockedCells(w),budget,()=>light.read(w),mechanoidCombatBatch(w));
  return budget;
}
