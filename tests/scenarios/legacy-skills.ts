import { initialSkills } from '../../src/sim/skills.ts';
/** Historical fixtures must not smuggle V43's new actor profile into old schemas. */
export function withoutPawnSkills<T>(world:T):T {
  for(const p of (world as {pawns:Array<{skills?:unknown}>}).pawns)delete p.skills;
  withoutMedicalWork(world);
  return world;
}

/** Expected additive migration only; does not call the migration under test. */
export function withMigratedSkills<T extends {tick:number;pawns:unknown[]}>(world:T):T {
  const expected=structuredClone(world);
  for(const p of expected.pawns as {skills:unknown}[])p.skills=initialSkills(8,0);
  for(const p of expected.pawns as {priorities:{doctor?:number}}[])p.priorities.doctor=1;
  return expected;
}

/** V45 and earlier had neither medical work nor rescue state. Keep invalid
 * future-field tests separate: this helper constructs only authentic fixtures. */
export function withoutMedicalWork<T>(world:T):T {
  for(const p of (world as {pawns:Array<{priorities:{doctor?:number}}>}).pawns)delete p.priorities.doctor;
  return world;
}
