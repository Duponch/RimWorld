import { initialSkills } from '../../src/sim/skills.ts';
import { createDefaultApparelPolicyRegistry } from '../../src/sim/apparel-policy.ts';
import { createApparelWearCalendar } from '../../src/sim/apparel-renewal.ts';
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
  for(const p of expected.pawns as {priorities:{clean?:number;firefight?:number;warden?:number;basic?:number;research?:number;hunt?:number}}[]){p.priorities.clean=3;p.priorities.firefight=1;p.priorities.warden=3;p.priorities.basic=3;p.priorities.research=3;p.priorities.hunt=0;}
  return withMigratedV90(expected);
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
  for(const p of (copy as {pawns:{priorities:{clean?:number;firefight?:number;warden?:number;basic?:number;research?:number;hunt?:number}}[]}).pawns){p.priorities.clean=3;p.priorities.firefight=1;p.priorities.warden=3;p.priorities.basic=3;p.priorities.research=3;p.priorities.hunt=0;}
  return withMigratedV90(copy);
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
  for(const p of (copy as {pawns:{priorities:{clean?:number;firefight?:number;warden?:number;basic?:number}}[]}).pawns){p.priorities.clean=3;p.priorities.firefight=1;p.priorities.warden=3;p.priorities.basic=3;}
  return withMigratedV90(copy);
}

/** Independent expectation of V89->V90's neutral adoption. */
export function withMigratedV90<T>(world:T):T {
  const w=world as any,registry=createDefaultApparelPolicyRegistry();
  for(const structure of [...w.structures??[],...(w.packed??[]).map((p:any)=>p.building)])if(['bed','table','stool'].includes(structure.kind))structure.quality='normal';
  for(const pile of w.piles??[]){if(pile.apparel&&['cloth-shirt','cloth-tribalwear'].includes(pile.item))pile.apparel.material='cloth';if(pile.unfinished){pile.unfinished.material='cloth';pile.unfinished.units=pile.unfinished.cloth;}}
  for(const departure of w.raids?.departed??[])for(const pile of departure.items??[])if(pile.apparel&&['cloth-shirt','cloth-tribalwear'].includes(pile.item))pile.apparel.material='cloth';
  if(w.tailoring)w.tailoring.lostLeather=0;
  w.apparelWear=createApparelWearCalendar(w.tick,(w.seed^w.tick^0x0a77e1)>>>0);w.apparelPolicies=registry.apparelPolicies;w.nextApparelPolicyId=registry.nextApparelPolicyId;
  for(const pawn of w.pawns??[]){pawn.beauty=40;if((pawn.faction??'colony')==='colony'&&!pawn.visitor&&!pawn.prisoner&&pawn.state!=='dead'){pawn.apparelPolicyId=1;pawn.apparelAutomation=false;pawn.nextApparelCheckAt=w.tick+600+pawn.id%301;}}
  return world;
}

/** Remove only V90 fields when a test deliberately reconstructs a V89-or-
 * earlier payload. This is fixture construction, never production repair. */
export function withoutV90<T>(world:T):T {
  const w=world as any;
  delete w.apparelWear;delete w.apparelPolicies;delete w.nextApparelPolicyId;
  for(const pawn of w.pawns??[]){delete pawn.beauty;delete pawn.apparelPolicyId;delete pawn.apparelAutomation;delete pawn.nextApparelCheckAt;}
  for(const departure of w.visitors?.departed??[]){delete departure.pawn.beauty;delete departure.pawn.apparelPolicyId;delete departure.pawn.apparelAutomation;delete departure.pawn.nextApparelCheckAt;}
  for(const structure of [...w.structures??[],...(w.packed??[]).map((p:any)=>p.building)]){delete structure.quality;delete structure.flower;}
  for(const pile of [...w.piles??[],...(w.raids?.departed??[]).flatMap((d:any)=>d.items??[]),...(w.visitors?.departed??[]).flatMap((d:any)=>d.items??[])]){if(pile.apparel){delete pile.apparel.material;delete pile.apparel.forced;}if(pile.unfinished){delete pile.unfinished.material;delete pile.unfinished.units;}}
  for(const job of w.jobs??[])delete job.flowerPotId;
  if(w.tailoring)delete w.tailoring.lostLeather;
  return world;
}

/** Pre-V84 fixture shape only. Production migration never broadens food filters. */
export function withoutFoodCrops<T>(world:T):T {
  const w=world as any;
  withoutV90(world);
  delete w.filth;
  // Pre-V84 storage did not have V88 silver filters or its 500-unit ceiling.
  for(const s of w.stockpiles??[]){delete s.filters.silver;s.capacity=Math.min(s.capacity,75);}
  for(const tile of w.tiles??[])delete tile.floor;
  for(const p of w.pawns){delete p.filthFeet;delete p.cleaning;delete p.priorities.clean;delete p.priorities.basic;delete p.priorities.warden;delete p.priorities.firefight;}
  for(const policy of w.foodPolicies??[])policy.allowed=policy.allowed.filter((id:string)=>id!=='potato'&&id!=='corn');
  for(const s of [...w.structures??[],...(w.packed??[]).map((p:any)=>p.building)])for(const b of s.bills??[]){delete b.filters.potato;delete b.filters.corn;}
  if(w.spoiled){delete w.spoiled.potato;delete w.spoiled.corn;}
  return world;
}
