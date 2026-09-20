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
  withoutSocial(expected);
  for(const p of expected.pawns as {priorities:{warden?:number;basic?:number;research?:number;hunt?:number}}[]){p.priorities.warden=3;p.priorities.basic=3;p.priorities.research=3;p.priorities.hunt=0;}
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
  withoutSocial(world);
  for(const p of (world as {pawns:{skills?:{shooting?:unknown;melee?:unknown}}[]}).pawns)if(p.skills){delete p.skills.shooting;delete p.skills.melee;}
  return world;
}
/** Independent expectation of the additive skill migrations. */
export function withMigratedShootingSkills<T>(world:T):T {
  const copy=structuredClone(world);
  for(const p of (copy as {pawns:{skills:{shooting?:unknown;melee?:unknown}}[]}).pawns){p.skills.shooting={level:8,xp:0,dailyXp:0,passion:0};p.skills.melee={level:8,xp:0,dailyXp:0,passion:0};}
  return withMigratedResearch(copy);
}

function withoutMedicineItems(world:unknown):void {
  const w=world as {piles?:{kind:string}[]};
  if(w.piles)w.piles=w.piles.filter(p=>p.kind!=='medicine'&&p.kind!=='weapon'&&p.kind!=='apparel');
}

/** Pre-V70 fixture builders strip social history; production validation stays strict. */
function withoutSocial(world:unknown):void {
  withoutResearch(world);
  for(const p of (world as {pawns:{social?:unknown;skills?:{social?:unknown}}[]}).pawns){delete p.social;if(p.skills)delete p.skills.social;}
}

/** Authentic pre-V73 fixture, not a production sanitizer. */
export function withoutResearch<T>(world:T):T {
  withoutHunting(world);
  const w=world as {research?:unknown;pawns:{research?:unknown;priorities:{research?:number};skills?:{intellectual?:unknown}}[]};
  delete w.research;for(const p of w.pawns){delete p.research;delete p.priorities.research;if(p.skills)delete p.skills.intellectual;}return world;
}
/** Independent neutral additive migration expectation. */
export function withMigratedResearch<T>(world:T):T {
  const copy=withoutResearch(structuredClone(world));
  for(const p of (copy as {pawns:{priorities:{warden?:number;basic?:number;research?:number;hunt?:number}}[]}).pawns){p.priorities.warden=3;p.priorities.basic=3;p.priorities.research=3;p.priorities.hunt=0;}
  return copy;
}

/** Construct an authentic pre-V79 fixture, never repair a production save. */
export function withoutHunting<T>(world:T):T {
  withoutFoodCrops(world);
  const w=world as any;delete w.hunting;delete w.butchery;
  if(w.spoiled)delete w.spoiled['hare-meat'];
  for(const policy of w.foodPolicies??[])policy.allowed=policy.allowed.filter((id:string)=>id!=='hare-meat');
  const task=(c:any)=>{if(c)delete c.workTicks;};
  const bills=(s:any)=>{for(const b of s.bills??[]){delete b.filters['hare-meat'];delete b.filters['hare-corpse'];}};
  for(const s of w.structures??[])bills(s);for(const p of w.packed??[])bills(p.building);
  for(const a of w.wildlife?.animals??[])delete a.corpseRot;
  for(const p of w.pawns){delete p.hunting;delete p.priorities.hunt;if(p.skills)delete p.skills.cooking;task(p.cooking);for(const o of p.orders?.queue??[])if(typeof o==='object')task(o.cooking);}
  return world;
}
/** Migration enables no hunt, invents no Cooking practice and leaves policies. */
export function withMigratedHunting<T>(world:T):T {
  const copy=withoutHunting(structuredClone(world));
  for(const p of (copy as any).pawns)p.priorities.hunt=0;
  return withMigratedBasic(copy);
}

/** Independent V85 expectation: no sanitizer or production migration call. */
export function withMigratedBasic<T>(world:T):T {
  const copy=structuredClone(world);
  for(const p of (copy as {pawns:{priorities:{warden?:number;basic?:number}}[]}).pawns){p.priorities.warden=3;p.priorities.basic=3;}
  return copy;
}

/** Pre-V84 fixture shape only. Production migration never broadens food filters. */
export function withoutFoodCrops<T>(world:T):T {
  const w=world as any;
  for(const p of w.pawns){delete p.priorities.basic;delete p.priorities.warden;}
  for(const policy of w.foodPolicies??[])policy.allowed=policy.allowed.filter((id:string)=>id!=='potato'&&id!=='corn');
  for(const s of [...w.structures??[],...(w.packed??[]).map((p:any)=>p.building)])for(const b of s.bills??[]){delete b.filters.potato;delete b.filters.corn;}
  if(w.spoiled){delete w.spoiled.potato;delete w.spoiled.corn;}
  return world;
}
