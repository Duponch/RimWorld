import { initialSkills } from '../../src/sim/skills.ts';
/** Historical fixtures must not smuggle V43's new actor profile into old schemas. */
export function withoutPawnSkills<T>(world:T):T {
  for(const p of (world as {pawns:Array<{skills?:unknown}>}).pawns)delete p.skills;
  return world;
}

/** Expected additive migration only; does not call the migration under test. */
export function withMigratedSkills<T extends {tick:number;pawns:unknown[]}>(world:T):T {
  const expected=structuredClone(world);
  for(const p of expected.pawns as {skills:unknown}[])p.skills=initialSkills(8,0);
  return expected;
}
