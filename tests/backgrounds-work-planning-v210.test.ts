import { expect, test } from 'vitest';
import { applyCommand } from '../src/sim/engine.ts';
import { backgroundWorkRefusal } from '../src/sim/colonist-backgrounds.ts';
import { HUMAN_YEAR_TICKS } from '../src/sim/human-age.ts';
import { asBuilder, constructionHaulPriority } from '../src/sim/construction-rules.ts';
import { newCookingBill } from '../src/sim/cooking-bills.ts';
import { planCookingOrder } from '../src/sim/player-cooking.ts';
import { planHaulOrder, startHaulOrder } from '../src/sim/player-hauling.ts';
import { processHaul } from '../src/sim/hauling.ts';
import { addGroundMaterial, refreshStock, reservedSource } from '../src/sim/materials.ts';
import { advanceOrders, orderReadiness, reconcileOrders } from '../src/sim/player-orders.ts';
import { advancePriorityWork } from '../src/sim/priority-work.ts';
import { releaseWork } from '../src/sim/work-release.ts';
import { planWork } from '../src/sim/work-planner.ts';
import { blockedCells } from '../src/sim/pathfinding.ts';
import { haulingWork, workPriority } from '../src/sim/work-types.ts';
import { urgentWorkEnabled } from '../src/sim/urgent-care.ts';
import { rescueReason, applyRescue, reconcileRescues } from '../src/sim/rescue.ts';
import { captureReason } from '../src/sim/capture.ts';
import { constructionWorkRate } from '../src/sim/skills.ts';
import { negotiatorRefusal } from '../src/sim/trade-contact.ts';
import { commercialPreparationReason } from '../src/sim/commercial-trip.ts';
import { scoutEligible } from '../src/sim/caravan-trip.ts';
import { applyCommercialPreparation } from '../src/sim/commercial-loading.ts';
import { createPrisonerState } from '../src/sim/prisoner-state.ts';
import { feedingReason } from '../src/sim/feeding-rules.ts';
import { tendingReason } from '../src/sim/tending.ts';
import type { Pawn, Structure } from '../src/sim/types.ts';
import { medicalCamp } from './scenarios/health.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { rescueCamp } from './scenarios/rescue.ts';

function background(p:Pawn, adulthood:NonNullable<Pawn['background']>['adulthood'], childhood:NonNullable<Pawn['background']>['childhood']='settlement-child'):void {
  p.age={biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:30*HUMAN_YEAR_TICKS};
  p.background={childhood,...adulthood?{adulthood}:{}};
}
function choppingWorld() {
  const w=medicalCamp(),p=w.pawns[0]!;delete p.health;p.priorities.gather=2;
  w.resources.push({id:w.nextId++,kind:'tree',x:18,z:16,amount:12});
  expect(applyCommand(w,{type:'designate',kind:'chop',x:18,z:16}).ok).toBe(true);
  return {w,p,job:w.jobs[0]!};
}
function kitchen() {
  const w=medicalCamp(),p=w.pawns[0]!;delete p.health;p.x=8;p.z=10;p.priorities.cook=2;
  const station:Structure=fixtureBuilding(w,'campfire',15,8);
  station.fuel!.ticks=6000;station.bills=[newCookingBill(w.nextId++)];
  addGroundMaterial(w,'food',10,{x:8,z:8},'rice');refreshStock(w);
  return {w,p,station,source:w.piles[0]!};
}

test('an absent biography preserves planning and the saved work table',()=>{
  const {w,p,job}=choppingWorld(),priorities=structuredClone(p.priorities);
  delete p.background;
  planWork(w,p,()=>blockedCells(w),new Set(),{remaining:8,pairs:32768});
  expect(p.jobId).toBe(job.id);expect(job.reservedBy).toBe(p.id);
  expect(p.priorities).toEqual(priorities);
});

test('a saved nonzero rank cannot admit forbidden autonomous or accepted direct work',()=>{
  const {w,p,job}=choppingWorld();background(p,'merchant');
  expect(workPriority(p,'gather')).toBe(0);expect(p.priorities.gather).toBe(2);
  expect(orderReadiness(w,p,job,true)).toContain('Incapacité');
  const before=JSON.stringify(w);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false})).toMatchObject({ok:false,reason:expect.stringContaining('Incapacité')});
  expect(JSON.stringify(w)).toBe(before);
  planWork(w,p,()=>blockedCells(w),new Set(),{remaining:8,pairs:32768});
  expect(p.jobId).toBeNull();expect(job.reservedBy).toBeNull();expect(p.priorities.gather).toBe(2);
});

test('priority edits cannot enable an incapable provider or change its previous rank on refusal',()=>{
  const {w,p}=choppingWorld();background(p,'merchant');const before=JSON.stringify(w);
  expect(applyCommand(w,{type:'priority',pawnId:p.id,work:'gather',value:1})).toMatchObject({ok:false,reason:expect.stringContaining('Incapacité')});
  expect(JSON.stringify(w)).toBe(before);
});

test('waiting job reservations are released when their admitted provider is no longer capable',()=>{
  const {w,p,job}=choppingWorld();
  w.resources.push({id:w.nextId++,kind:'tree',x:20,z:16,amount:12});
  expect(applyCommand(w,{type:'designate',kind:'chop',x:20,z:16}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:w.jobs.at(-1)!.id,queue:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:true}).ok).toBe(true);
  expect(p.orders.queue).toEqual([job.id]);background(p,'merchant');
  reconcileOrders(w);
  expect(p.orders.queue).toEqual([]);expect(job.reservedBy).toBeNull();expect(job.status).toBe('pending');
});

test('an impossible priority-work intent expires before navigation or temporary forced ranks',()=>{
  const {w,p,job}=choppingWorld();background(p,'merchant');
  p.priorityWork={cell:{x:job.x,z:job.z},work:'build',startedAt:w.tick};
  const budget={remaining:8,pairs:32768},priorities=structuredClone(p.priorities);
  expect(advancePriorityWork(w,p,()=>{throw new Error('No search for an incapable provider.');},budget)).toBe(false);
  expect(p.priorityWork).toBeUndefined();expect(budget).toEqual({remaining:8,pairs:32768});expect(p.priorities).toEqual(priorities);
});

test('emergency ranking ignores forbidden work but retains the ranks of capable work',()=>{
  const p=medicalCamp().pawns[0]!;background(p,'merchant');p.priorities.build=1;p.priorities.doctor=2;
  expect(urgentWorkEnabled(p,'doctor')).toBe(true);
  p.priorities.haul=1;expect(urgentWorkEnabled(p,'doctor')).toBe(false);
  background(p,'mercenary');p.priorities.haul=0;expect(urgentWorkEnabled(p,'doctor')).toBe(false);
});

test('a builder may deliver and clear its own frame without general Hauling',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;delete p.health;background(p,'researcher');p.priorities.build=2;p.priorities.haul=1;
  expect(workPriority(p,'haul')).toBe(0);expect(asBuilder(p)).toBe(true);expect(constructionHaulPriority(p)).toBe(2);
  expect(applyCommand(w,{type:'designate',kind:'bed',material:'wood',x:18,z:16}).ok).toBe(true);
  const job=w.jobs[0]!;addGroundMaterial(w,'wood',45,{x:p.x,z:p.z});
  const proposal=planHaulOrder(w,p,{type:'job',jobId:job.id});
  expect(proposal.reason).toBeUndefined();expect(proposal.task?.destination).toEqual({type:'job',jobId:job.id,forConstruction:true});
  startHaulOrder(p,proposal.task!,proposal.path!);
  processHaul(w,p,()=>{},()=>{});expect(p.haul?.phase).toBe('deliver');
  const cargo=w.piles.find(pile=>pile.owner.type==='pawn'&&pile.owner.pawnId===p.id)!;
  p.x=job.x-1;p.z=job.z;processHaul(w,p,()=>{},()=>{});
  expect(cargo.owner).toEqual({type:'job',jobId:job.id});expect(w.piles.reduce((sum,pile)=>sum+pile.quantity,0)).toBe(45);
  expect(backgroundWorkRefusal(p,'haul')).toBeDefined();expect(p.priorities.haul).toBe(1);
  expect(haulingWork({type:'aside',x:20,z:16,constructionId:job.id,forConstruction:true})).toBe('build');
});

test('construction transport selects a capable hauler when Build is forbidden',()=>{
  const p=medicalCamp().pawns[0]!;background(p,'merchant');p.priorities.build=1;p.priorities.haul=3;
  expect(asBuilder(p)).toBe(false);expect(constructionHaulPriority(p)).toBe(3);
});

test('forced general haul is revalidated before pickup and releases its source claim without consumption',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;delete p.health;p.priorities.haul=1;
  addGroundMaterial(w,'wood',12,{x:p.x,z:p.z});const source=w.piles[0]!;
  expect(applyCommand(w,{type:'stockpile',x:20,z:16,enabled:true,capacity:75,priority:3,filters:{wood:true,food:false}}).ok).toBe(true);
  const proposal=planHaulOrder(w,p,{type:'pile',pileId:source.id});expect(proposal.task).toBeDefined();
  expect(proposal.task!.quantity).toBe(10); // One real trip is capped at CARRY_CAPACITY; the source still owns twelve.
  startHaulOrder(p,proposal.task!,proposal.path!);expect(reservedSource(w,source.id)).toBe(10);background(p,'researcher');
  processHaul(w,p,()=>{throw new Error('No movement before provider refusal.');},()=>{});
  expect(p.haul).toBeNull();expect(p.orders.active).toBeNull();expect(reservedSource(w,source.id)).toBe(0);
  expect(source.quantity).toBe(12);expect(source.owner).toEqual({type:'ground',x:p.x,z:p.z});
});

test('a cook refuels its own bill without Hauling while generic refueling remains forbidden',()=>{
  const {w,p,station}=kitchen();background(p,'researcher');p.priorities.haul=1;station.fuel!.ticks=0;
  addGroundMaterial(w,'wood',10,{x:9,z:10});
  const proposal=planCookingOrder(w,p,station.id);expect(proposal.reason).toBeUndefined();
  expect(proposal.order).toMatchObject({destination:{type:'fuel',structureId:station.id,forCooking:true}});
  expect(planHaulOrder(w,p,{type:'fuel',structureId:station.id}).reason).toContain('Incapacité');
});

test('forbidden cooking cannot acquire ingredients and an admitted waiting recipe releases its reservations',()=>{
  const {w,p,station,source}=kitchen();p.priorities.gather=1;
  w.resources.push({id:w.nextId++,kind:'tree',x:10,z:12,amount:12});
  expect(applyCommand(w,{type:'designate',kind:'chop',x:10,z:12}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:w.jobs[0]!.id,queue:false}).ok).toBe(true);
  expect(applyCommand(w,{type:'order-cook',pawnId:p.id,structureId:station.id,queue:true}).ok).toBe(true);
  expect(reservedSource(w,source.id)).toBe(10);releaseWork(w,p);background(p,'merchant');
  expect(planCookingOrder(w,p,station.id).reason).toContain('Incapacité');
  advanceOrders(w,p,()=>{throw new Error('No queued recipe search for an incapable cook.');},{remaining:8,pairs:32768});
  expect(p.orders.queue).toEqual([]);expect(p.cooking).toBeNull();expect(reservedSource(w,source.id)).toBe(0);expect(source.quantity).toBe(10);
});

test('direct Rescue ignores incapacity and a zero Doctor rank, while automatic Rescue uses Caring',()=>{
  const w=rescueCamp(),[actor,patient]=w.pawns as [Pawn,Pawn];background(actor,'mercenary');actor.priorities.doctor=0;
  expect(rescueReason(w,actor,patient)).toContain('Incapacité');expect(rescueReason(w,actor,patient,true)).toBeUndefined();
  expect(applyRescue(w,{pawnId:actor.id,patientId:patient.id,queue:false}).ok).toBe(true);
  reconcileRescues(w);expect(actor.rescue).toMatchObject({patientId:patient.id});expect(actor.orders.active).toBe('rescue');expect(actor.priorities.doctor).toBe(0);
  expect(tendingReason(w,actor,patient,true)).toContain('Incapacité');expect(feedingReason(w,actor,patient,true)).toContain('Incapacité');
});

test('automatic prisoner rescue uses Warden while direct Capture stays exempt from Violence, Social and Hauling',()=>{
  const w=rescueCamp(),[actor,patient]=w.pawns as [Pawn,Pawn];background(actor,'hermit','quiet-child');
  patient.faction='outlaws';patient.prisoner=createPrisonerState(w,patient);actor.priorities.warden=1;
  expect(rescueReason(w,actor,patient)).toContain('Geôlier impossible');
  delete patient.prisoner;actor.priorities.warden=0;actor.priorities.haul=0;
  expect(captureReason(w,actor,patient)).toBeUndefined();expect(actor.background).toEqual({childhood:'quiet-child',adulthood:'hermit'});
});

test('a hauler can install a package with Construction disabled, using its effective zero skill',()=>{
  const w=medicalCamp(),p=w.pawns[0]!;delete p.health;background(p,'merchant');p.priorities.haul=1;p.priorities.build=3;
  p.skills.construction={level:12,xp:500,dailyXp:0,passion:2};const before=structuredClone(p.skills.construction);
  // Prepared package boundary, before an actual install command or movement.
  const building=fixtureBuilding(w,'stool',p.x,p.z);w.structures=[];w.packed=[{building,owner:{type:'ground',x:p.x,z:p.z}}];
  expect(applyCommand(w,{type:'install',structureId:building.id,x:18,z:16,orientation:0}).ok).toBe(true);
  const job=w.jobs[0]!;expect(orderReadiness(w,p,job)).toBeUndefined();
  expect(applyCommand(w,{type:'order-job',pawnId:p.id,jobId:job.id,queue:false}).ok).toBe(true);
  expect(job.installationWork).toBe('haul');expect(constructionWorkRate(p,job,1)).toBe(.3);expect(p.skills.construction).toEqual(before);
});

test('Social incapacity refuses direct and off-map negotiation before preparation while reconnaissance stays available',()=>{
  const w=medicalCamp(2),p=w.pawns[0]!;delete p.health;background(p,'hermit');
  expect(negotiatorRefusal(p)).toContain('Incapacité');expect(commercialPreparationReason(w,p)).toContain('Incapacité');
  expect(scoutEligible(w,p)).toBeNull();
  addGroundMaterial(w,'food',3,{x:p.x,z:p.z},'survival-meal');addGroundMaterial(w,'silver',100,{x:p.x+1,z:p.z},'silver');
  const before=JSON.stringify(w);
  expect(applyCommercialPreparation(w,{type:'commercial-start',pawnId:p.id,foodPileId:w.piles[0]!.id,quantity:2,silver:100})).toMatchObject({ok:false,reason:expect.stringContaining('Incapacité')});
  expect(JSON.stringify(w)).toBe(before);expect(w.commercialTrip).toBeUndefined();
});
