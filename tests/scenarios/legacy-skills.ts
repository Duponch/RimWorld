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
  for(const p of expected.pawns as {priorities:{doctor?:number;patient?:number;bedrest?:number}}[])Object.assign(p.priorities,{doctor:1,patient:1,bedrest:3});
  for(const p of expected.pawns as {medicalCare?:unknown}[])delete p.medicalCare;
  withoutMedicineItems(expected);
  return expected;
}

/** V45 and earlier had neither medical work nor rescue state. Keep invalid
 * future-field tests separate: this helper constructs only authentic fixtures. */
export function withoutMedicalWork<T>(world:T):T {
  for(const p of (world as {pawns:Array<{priorities:{doctor?:number}}>}).pawns)delete p.priorities.doctor;
  withoutCare(world);
  return world;
}

/** Explicit historical fixture only. Never used to sanitize a rejected save. */
export function withoutCare<T>(world:T):T {
  withoutShootingSkills(world);
  withoutMedicineItems(world);
  for(const p of (world as {pawns:Array<{medicalCare?:unknown;skills?:{medicine?:unknown};priorities:{patient?:number;bedrest?:number}}>}).pawns){
    delete p.medicalCare;delete p.priorities.patient;delete p.priorities.bedrest;if(p.skills)delete p.skills.medicine;
  }
  return world;
}

/** Only authentic pre-V56 fixtures; never apply to the serializer's input in production. */
export function withoutShootingSkills<T>(world:T):T {
  for(const p of (world as {pawns:{skills?:{shooting?:unknown;melee?:unknown}}[]}).pawns)if(p.skills){delete p.skills.shooting;delete p.skills.melee;}
  return world;
}
/** Independent expectation of the additive skill migrations. */
export function withMigratedShootingSkills<T>(world:T):T {
  const copy=structuredClone(world);
  for(const p of (copy as {pawns:{skills:{shooting?:unknown;melee?:unknown}}[]}).pawns){p.skills.shooting={level:8,xp:0,dailyXp:0,passion:0};p.skills.melee={level:8,xp:0,dailyXp:0,passion:0};}
  return copy;
}

function withoutMedicineItems(world:unknown):void {
  const w=world as {piles?:{kind:string}[]};
  if(w.piles)w.piles=w.piles.filter(p=>p.kind!=='medicine'&&p.kind!=='weapon'&&p.kind!=='apparel');
}
