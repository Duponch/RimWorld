import {beforeAll,expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {releaseWork} from '../src/sim/work-release.ts';
import {damageStructure,structureMaxHp} from '../src/sim/thing-damage.ts';
import {blockedCells} from '../src/sim/pathfinding.ts';
import {orderReadiness} from '../src/sim/player-orders.ts';
import {AUTODOORS_RESEARCH_COST} from '../src/sim/research.ts';
import {roofKindAt} from '../src/sim/roof-rules.ts';
import {reconcileRoofSupport} from '../src/sim/roofing.ts';
import {deliveredMaterial,constructionSupplied} from '../src/sim/construction-materials.ts';
import {buildDoorOverWallScenario483,copyDoorOverWall483,planDoorOverWall483,advanceDoorOverWall483} from './scenarios/door-over-wall-v483.ts';
import type {Command,World} from '../src/sim/types.ts';

let paid:ReturnType<typeof buildDoorOverWallScenario483>;
beforeAll(()=>{paid=buildDoorOverWallScenario483(3);expect(validateWorld(paid.world)).toEqual([]);});
const fixture=()=>copyDoorOverWall483(paid);
const command=(w:World,c:Command)=>{const r=applyCommand(w,c);expect(r.ok,JSON.stringify(r)).toBe(true);return r;};
const valid=(w:World)=>expect(validateWorld(w),JSON.stringify({tick:w.tick,jobs:w.jobs,pawns:w.pawns})).toEqual([]);
const exact=(w:World)=>{valid(w);const s=serializeWorld(w),copy=deserializeWorld(s);expect(serializeWorld(copy)).toBe(s);expect(copy).toEqual(w);return copy;};
const until=advanceDoorOverWall483;
function active(f:ReturnType<typeof fixture>,progress=false){const r=planDoorOverWall483(f);command(f.world,{type:'order-job',pawnId:f.ids.builderId,jobId:r.job.id,queue:false});if(progress)until(f.world,()=>r.job.progress>0);return r;}
function unlock(w:World,pileId:number){command(w,{type:'material-forbid',pileId,forbidden:false});}

test('fixture is a paid finished wall with real delivery, frame and work, preserving original adult needs and skills',()=>{
 expect(paid.world.schemaVersion).toBe(296);expect(paid.played.finishedAt).toBeGreaterThan(0);expect(paid.played.observations.some(o=>o.phase==='delivery-deliver')).toBe(true);
 expect(paid.played.observations.some(o=>o.delivered===5&&o.phase==='frame')).toBe(true);expect(paid.played.observations.some(o=>o.progress>0)).toBe(true);
 expect(paid.world.piles.filter(p=>p.item==='wood')).toEqual([]);expect(paid.world.structures).toHaveLength(1);expect(paid.world.pawns[0]!.skills.construction.xp).toBeGreaterThan(0);exact(paid.world);
});

test('steel door plan leaves the paid wooden wall intact, reserves a distinct identity and cannot deliver or spend before removal',()=>{
 const f=fixture(),w=f.world,before=structuredClone(w.structures),rng=w.rng,piles=structuredClone(w.piles),next=w.nextId,{job,planId}=planDoorOverWall483(f);
 expect(w.structures).toEqual(before);expect(w.rng).toBe(rng);expect(w.piles).toEqual(piles);expect(w.jobs).toHaveLength(1);expect(job.kind).toBe('deconstruct');expect(job.wallDoor296).toEqual({manual:false,plan:{revision:1,id:planId,kind:'door',material:'steel'}});
 expect(new Set([job.id,planId,f.ids.wallId]).size).toBe(3);expect(planId).toBeGreaterThanOrEqual(next);expect(w.nextId).toBeGreaterThan(planId);expect(job.progress).toBe(0);expect(job.escrow.wood).toBe(0);expect(deliveredMaterial(w,job,'steel')).toBe(0);expect(blockedCells(w)[16*w.width+16]).toBe(1);
 expect(w.pawns.every(p=>!p.haul)).toBe(true);exact(w);
 const snapshot=serializeWorld(w);expect(applyCommand(w,{type:'designate',kind:'door',material:'steel',...f.cells.wall}).ok).toBe(false);expect(serializeWorld(w)).toBe(snapshot);
});

test('real contact deconstructs without door stock, refunds old wood, exposes an open blueprint then finite steel delivery/frame/work completes the door',()=>{
 const f=fixture(),w=f.world,{job,planId}=active(f),oldId=job.id,p=w.pawns[0]!;exact(w);
 until(w,()=>job.progress>0);expect(Math.abs(p.x-16)+Math.abs(p.z-16)).toBe(1);expect(p.state).toBe('working');expect(w.structures.some(s=>s.id===f.ids.wallId)).toBe(true);expect(w.piles.find(p=>p.id===f.ids.steelId)?.quantity).toBe(65);exact(w);
 const progressed=exact(w),at=w.tick;until(w,()=>!w.structures.some(s=>s.id===f.ids.wallId));stepWorld(progressed,w.tick-at);expect(progressed).toEqual(w);
 const blueprint=w.jobs.find(j=>j.id===planId)!;expect(blueprint).toMatchObject({kind:'door',construction:'blueprint',progress:0,reservedBy:null,status:'pending',material:'steel'});expect(blueprint.wallDoor296).toBeUndefined();expect(w.jobs.some(j=>j.id===oldId)).toBe(false);
 expect(w.pawns.every(p=>p.jobId!==oldId&&p.jobId!==planId&&p.orders.active!==oldId&&!p.orders.queue.includes(oldId))).toBe(true);
 expect(w.deconstructed.count).toBe(1);const refund=w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);expect([2,3]).toContain(refund);expect(refund+w.deconstructed.lostWood).toBe(5);expect(blockedCells(w)[16*w.width+16]).toBe(0);exact(w);
 stepWorld(w,10);expect(blueprint.progress).toBe(0);expect(blueprint.construction).toBe('blueprint');expect(deliveredMaterial(w,blueprint,'steel')).toBe(0);
 unlock(w,f.ids.steelId);until(w,()=>w.pawns.some(p=>p.haul?.destination.type==='job'&&p.haul.destination.jobId===planId));exact(w);
 until(w,()=>blueprint.construction==='frame');expect(deliveredMaterial(w,blueprint,'steel')).toBeGreaterThan(0);expect(deliveredMaterial(w,blueprint,'steel')).toBeLessThanOrEqual(25);expect(w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(65);exact(w);
 until(w,()=>constructionSupplied(w,blueprint));expect(deliveredMaterial(w,blueprint,'steel')).toBe(25);exact(w);
 until(w,()=>blueprint.progress>0);exact(w);until(w,()=>w.structures.some(s=>s.kind==='door'&&s.x===16&&s.z===16));expect(w.jobs).toEqual([]);expect(w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(40);expect(w.deconstructed.count).toBe(1);expect(w.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0)).toBe(refund);exact(w);
});

test('reserved future identity can materialize when no new blueprint identity can be allocated',()=>{
 const f=fixture(),w=f.world,{job,planId}=active(f);until(w,()=>job.progress>0);
 // Salvage still needs a physical pile ID; reserve one through the exact live
 // nextId budget. The successor itself must reuse its already-owned identity.
 w.nextId=Number.MAX_SAFE_INTEGER-1;until(w,()=>!w.structures.some(s=>s.id===f.ids.wallId));expect(w.jobs.find(j=>j.id===planId)?.kind).toBe('door');valid(w);
});

for(const cancellation of ['plan-id','cell'] as const)test(`implicit ${cancellation} cancellation before assignment removes both unowned intentions without touching the wall`,()=>{
 const f=fixture(),w=f.world,{planId}=planDoorOverWall483(f);command(w,cancellation==='plan-id'?{type:'cancel-job',jobId:planId}:{type:'cancel',...f.cells.wall});expect(w.jobs).toEqual([]);expect(w.structures[0]!.id).toBe(f.ids.wallId);stepWorld(w,20);expect(w.jobs).toEqual([]);expect(w.deconstructed.count).toBe(0);exact(w);
});
for(const boundary of ['travel','work'] as const)test(`cancel plan during ${boundary} preserves only captured work; interruption cannot turn it into a phantom designation`,()=>{
 const f=fixture(),w=f.world,{job,planId}=active(f,boundary==='work'),p=w.pawns[0]!;if(boundary==='travel')expect(job.progress).toBe(0);
 expect(job.wallDoor296?.fromBlueprint).toBe(true);command(w,{type:'cancel-job',jobId:planId});expect(w.jobs).toContain(job);expect(job.wallDoor296).toEqual({manual:false,fromBlueprint:true});exact(w);
 command(w,{type:'draft',pawnIds:[p.id],enabled:true});expect(w.jobs).not.toContain(job);expect(p.jobId).toBeNull();command(w,{type:'draft',pawnIds:[p.id],enabled:false});stepWorld(w,20);expect(w.jobs).toEqual([]);expect(w.structures.some(s=>s.id===f.ids.wallId)).toBe(true);exact(w);
});
test('cancelled implicit work may finish the real wall without resurrecting its removed plan',()=>{
 const f=fixture(),w=f.world,{job,planId}=active(f,true);command(w,{type:'cancel-job',jobId:planId});until(w,()=>!w.structures.some(s=>s.id===f.ids.wallId));expect(w.jobs).toEqual([]);expect(w.deconstructed.count).toBe(1);expect(w.structures.some(s=>s.kind==='door')).toBe(false);expect(w.pawns.every(p=>p.jobId!==job.id)).toBe(true);exact(w);
});
test('clear-orders after cancelled implicit attribution leaves no persistent deconstruction or future door',()=>{
 const f=fixture(),w=f.world,{job,planId}=active(f);command(w,{type:'cancel-job',jobId:planId});command(w,{type:'clear-orders',pawnId:f.ids.builderId});expect(w.jobs).not.toContain(job);expect(w.pawns[0]!.orders).toEqual({active:null,queue:[]});exact(w);
});
test('cancel after wall removal cancels the ordinary blueprint and keeps salvage without a second wall refund',()=>{
 const f=fixture(),w=f.world,{planId}=active(f);until(w,()=>!w.structures.some(s=>s.id===f.ids.wallId));const salvage=structuredClone(w.piles.filter(p=>p.item==='wood')),ledger=structuredClone(w.deconstructed);command(w,{type:'cancel-job',jobId:planId});expect(w.jobs).toEqual([]);expect(w.piles.filter(p=>p.item==='wood')).toEqual(salvage);expect(w.deconstructed).toEqual(ledger);exact(w);
});

for(const started of [false,true])test(`preexisting manual deconstruction ${started?'already attributed':'pending'} keeps authority when the future plan is cancelled`,()=>{
 const f=fixture(),w=f.world;command(w,{type:'designate',kind:'deconstruct',...f.cells.wall});const job=w.jobs[0]!;
 if(started){command(w,{type:'order-job',pawnId:f.ids.builderId,jobId:job.id,queue:false});until(w,()=>job.progress>0);}
 const before={id:job.id,progress:job.progress,reservedBy:job.reservedBy},r=planDoorOverWall483(f);expect(r.job).toBe(job);expect(job).toMatchObject(before);expect(job.wallDoor296?.manual).toBe(true);expect(job.wallDoor296?.fromBlueprint).toBeUndefined();command(w,{type:'cancel-job',jobId:r.planId});expect(w.jobs).toContain(job);expect(job.progress).toBe(before.progress);exact(w);
 if(started){expect(releaseWork(w,w.pawns[0]!)).toBe(true);expect(w.jobs).toContain(job);expect(job.reservedBy).toBeNull();}
 until(w,()=>!w.structures.some(s=>s.id===f.ids.wallId));expect(w.jobs).toEqual([]);expect(w.deconstructed.count).toBe(1);exact(w);
});
test('removing manual authority stops work attributed before plan, but retains independent future plan for fresh implicit attribution',()=>{
 const f=fixture(),w=f.world;command(w,{type:'designate',kind:'deconstruct',...f.cells.wall});const job=w.jobs[0]!;command(w,{type:'order-job',pawnId:f.ids.builderId,jobId:job.id,queue:false});until(w,()=>job.progress>0);const {planId}=planDoorOverWall483(f);
 command(w,{type:'cancel-job',jobId:job.id});expect(job.wallDoor296?.manual).toBe(false);expect(job.wallDoor296?.plan?.id).toBe(planId);expect(job.reservedBy).toBeNull();expect(w.pawns[0]!.jobId).toBeNull();exact(w);
 command(w,{type:'order-job',pawnId:f.ids.builderId,jobId:job.id,queue:false});expect(job.wallDoor296?.fromBlueprint).toBe(true);until(w,()=>w.jobs.some(j=>j.id===planId));exact(w);
});
test('promotion to manual authority does not change implicit work origin; cancelling manual authority keeps its actual execution',()=>{
 const f=fixture(),w=f.world,{job,planId}=active(f,true),progress=job.progress;command(w,{type:'designate',kind:'deconstruct',...f.cells.wall});expect(w.jobs).toHaveLength(1);expect(job.wallDoor296).toMatchObject({manual:true,fromBlueprint:true});expect(job.progress).toBe(progress);
 command(w,{type:'cancel-job',jobId:job.id});expect(job.wallDoor296).toMatchObject({manual:false,fromBlueprint:true,plan:{id:planId}});expect(job.reservedBy).toBe(f.ids.builderId);expect(job.progress).toBe(progress);exact(w);
});
test('plan and manual IDs cancel independently in either order while cell cancellation removes both pending intentions',()=>{
 for(const first of ['plan','manual','cell'] as const){const f=fixture(),w=f.world,{job,planId}=planDoorOverWall483(f);command(w,{type:'designate',kind:'deconstruct',...f.cells.wall});
  if(first==='cell')command(w,{type:'cancel',...f.cells.wall});else{command(w,{type:'cancel-job',jobId:first==='plan'?planId:job.id});expect(w.jobs).toHaveLength(1);expect(job.wallDoor296?.plan?.id).toBe(first==='plan'?undefined:planId);command(w,{type:'cancel-job',jobId:first==='plan'?job.id:planId});}
  expect(w.jobs).toEqual([]);expect(w.structures[0]!.id).toBe(f.ids.wallId);exact(w);
 }
});
test('whole-cell cancellation during implicit work removes both reasons and interruption purges remaining execution',()=>{
 const f=fixture(),w=f.world,{job}=active(f,true);command(w,{type:'designate',kind:'deconstruct',...f.cells.wall});command(w,{type:'cancel',...f.cells.wall});expect(job.wallDoor296).toEqual({manual:false,fromBlueprint:true});expect(w.jobs).toContain(job);expect(releaseWork(w,w.pawns[0]!)).toBe(true);expect(w.jobs).toEqual([]);exact(w);
});

test('two actual adults cannot reserve the same physical wall and an old queued mandate never becomes a door construction mandate',()=>{
 const f=fixture(),w=f.world,{job,planId}=active(f),other=w.pawns[1]!;command(w,{type:'priority',pawnId:other.id,work:'build',value:1});expect(applyCommand(w,{type:'order-job',pawnId:other.id,jobId:job.id,queue:false}).ok).toBe(false);expect(job.reservedBy).toBe(f.ids.builderId);
 until(w,()=>w.jobs.some(j=>j.id===planId));expect(w.pawns.every(p=>p.jobId!==job.id&&!p.orders.queue.includes(job.id)&&p.orders.active!==job.id)).toBe(true);expect(w.pawns.every(p=>p.orders.active!==planId&&!p.orders.queue.includes(planId))).toBe(true);exact(w);
});
test('allowed area and true navigation barriers refuse assignment without spending or removing the wall',()=>{
 const f=fixture(),w=f.world,{job}=planDoorOverWall483(f);command(w,{type:'allowed-area-create',label:'Rester au camp'});const area=w.allowedAreas![0]!;
 command(w,{type:'allowed-area-paint',areaId:area.id,enabled:true,from:{x:8,z:14},to:{x:13,z:19}});command(w,{type:'assign-allowed-area',pawnId:f.ids.builderId,areaId:area.id});expect(applyCommand(w,{type:'order-job',pawnId:f.ids.builderId,jobId:job.id,queue:false}).ok).toBe(false);expect(job.progress).toBe(0);expect(job.reservedBy).toBeNull();exact(w);
 command(w,{type:'assign-allowed-area',pawnId:f.ids.builderId,areaId:null});for(const c of [{x:15,z:16},{x:17,z:16},{x:16,z:15},{x:16,z:17}])w.tiles[c.z*w.width+c.x]={terrain:'rock'};
 expect(applyCommand(w,{type:'order-job',pawnId:f.ids.builderId,jobId:job.id,queue:false}).ok).toBe(false);expect(w.structures[0]!.id).toBe(f.ids.wallId);exact(w);
});
test('external lethal damage transfers the plan before discarding physical wall work and produces no deconstruction refund',()=>{
 const f=fixture(),w=f.world,{job,planId}=active(f),wall=w.structures.find(s=>s.id===f.ids.wallId)!;expect(damageStructure(w,wall,structureMaxHp(wall),'bullet')).toBe(true);expect(w.structures).not.toContain(wall);expect(w.jobs.some(j=>j.id===job.id)).toBe(false);expect(w.jobs.find(j=>j.id===planId)).toMatchObject({kind:'door',construction:'blueprint',material:'steel'});expect(w.deconstructed.count).toBe(0);expect(w.pawns.every(p=>p.jobId!==job.id)).toBe(true);exact(w);
});
for(const roof of ['thin','thick'] as const)for(const external of [false,true])test(`${roof} natural roof uses actual collapse after ${external?'external wall kill':'real wall deconstruction'}; future blueprint receives its ordinary physical outcome`,()=>{
 const f=fixture(),w=f.world,i=16*w.width+16;w.roofing={constructed:[],build:[],remove:[],cursor:0,natural:{thin:roof==='thin'?[i]:[],thick:roof==='thick'?[i]:[]}};
 expect(reconcileRoofSupport(w,false,f.cells.wall)).toBe(0);const {planId}=active(f);exact(w);
 if(external){const wall=w.structures.find(s=>s.id===f.ids.wallId)!;expect(damageStructure(w,wall,structureMaxHp(wall),'bullet')).toBe(true);}else until(w,()=>!w.structures.some(s=>s.id===f.ids.wallId));
 if(roof==='thin'){expect(roofKindAt(w,i)).toBeUndefined();expect(w.jobs.find(j=>j.id===planId)).toMatchObject({kind:'door',construction:'blueprint'});expect(w.tiles[i]!.terrain).toBe('soil');}
 else{expect(roofKindAt(w,i)).toBe('natural-thick');expect(w.tiles[i]!.terrain).toBe('rock');expect(w.tiles[i]!.collapsedRock).toBeDefined();expect(w.jobs.some(j=>j.id===planId)).toBe(false);}
 expect(w.deconstructed.count).toBe(external?0:1);exact(w);
});

test('autodoor research gates before mutation and real low construction skill blocks the successor, not wall removal',()=>{
 const f=fixture(),w=f.world,before=serializeWorld(w);expect(applyCommand(w,{type:'designate',kind:'autodoor',material:'steel',...f.cells.wall}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
 w.research??={points:0,project:null};w.research.autodoors={points:AUTODOORS_RESEARCH_COST,completedAt:w.tick};const {job,planId}=planDoorOverWall483(f,'autodoor'),low=w.pawns[2]!;expect(low.skills.construction.level).toBe(4);command(w,{type:'priority',pawnId:low.id,work:'build',value:1});command(w,{type:'order-job',pawnId:low.id,jobId:job.id,queue:false});until(w,()=>w.jobs.some(j=>j.id===planId));const blueprint=w.jobs.find(j=>j.id===planId)!;expect(blueprint.kind).toBe('autodoor');exact(w);
 unlock(w,f.ids.steelId);unlock(w,f.ids.componentId);until(w,()=>blueprint.construction==='frame');expect(orderReadiness(w,low,blueprint)).toMatch(/Construction 6/);expect(applyCommand(w,{type:'order-job',pawnId:low.id,jobId:planId,queue:false}).ok).toBe(false);
 until(w,()=>w.structures.some(s=>s.kind==='autodoor'));expect(w.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0)).toBe(0);expect(w.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0)).toBe(0);exact(w);
});
test('rough rock, a finished other building and a worked wall frame remain outside the exception; old empty wall ghost replacement remains acquired',()=>{
 const rough=fixture();rough.world.tiles[15*32+16]={terrain:'rock'};const bytes=serializeWorld(rough.world);expect(applyCommand(rough.world,{type:'designate',kind:'door',material:'steel',x:16,z:15}).ok).toBe(false);expect(serializeWorld(rough.world)).toBe(bytes);
 // Isolated negative input: a standard wooden column has no door-state
 // component to fabricate and is deliberately outside finished Wall only.
 const other=fixture();other.world.structures[0]!.kind='column';const saved=serializeWorld(other.world);expect(applyCommand(other.world,{type:'designate',kind:'door',material:'steel',...other.cells.wall}).ok).toBe(false);expect(serializeWorld(other.world)).toBe(saved);
 const ghost=fixture(),w=ghost.world;command(w,{type:'designate',kind:'wall',material:'wood',x:18,z:16});const old=w.jobs.find(j=>j.kind==='wall')!;command(w,{type:'designate',kind:'door',material:'steel',x:18,z:16});expect(w.jobs.some(j=>j.id===old.id)).toBe(false);expect(w.jobs.find(j=>j.x===18&&j.z===16)).toMatchObject({kind:'door',construction:'blueprint'});expect(w.jobs.some(j=>j.wallDoor296)).toBe(false);exact(w);
 const frame=fixture(),v=frame.world;unlock(v,frame.ids.steelId);command(v,{type:'designate',kind:'wall',material:'steel',x:18,z:16});until(v,()=>v.jobs.some(j=>j.kind==='wall'&&j.construction==='frame'));const frameBytes=serializeWorld(v);expect(applyCommand(v,{type:'designate',kind:'door',material:'steel',x:18,z:16}).ok).toBe(false);expect(serializeWorld(v)).toBe(frameBytes);exact(v);
});
test('identity exhaustion and stale target ID fail before edits and leave the paid wall intact',()=>{
 const f=fixture(),w=f.world;w.nextId=Number.MAX_SAFE_INTEGER-1;const before=serializeWorld(w);expect(applyCommand(w,{type:'designate',kind:'door',material:'steel',...f.cells.wall}).ok).toBe(false);expect(serializeWorld(w)).toBe(before);
 const g=fixture(),s=serializeWorld(g.world);expect(applyCommand(g.world,{type:'designate',kind:'door',material:'steel',targetId:g.ids.wallId+999,...g.cells.wall}).ok).toBe(false);expect(serializeWorld(g.world)).toBe(s);
});
