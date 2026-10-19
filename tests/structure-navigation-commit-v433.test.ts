import {expect,test,vi} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import * as navigation from '../src/sim/structure-navigation.ts';
import {blockedCells,routeToCell} from '../src/sim/pathfinding.ts';
import {search,type SearchBudget} from '../src/sim/work-planner.ts';
import {navigationCosts} from '../src/sim/furniture-travel.ts';
import {constructionRecipe} from '../src/sim/construction-materials.ts';
import {setWorkUnits} from '../src/sim/work-progress.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {requestPowerFlick} from '../src/sim/power-flick.ts';
import {newDoorState} from '../src/sim/door-rules.ts';
import {initialSpikeTrapState,spikeTrapTargetKey,spikeTrapSpringChance} from '../src/sim/spike-trap-state.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {reconcilePawnHealth} from '../src/sim/health.ts';
import {legacyHumanAge} from '../src/sim/human-age.ts';
import {registeredCampaign,registeredMapId} from '../src/sim/world-map-context.ts';
import {COMPLEX_FURNITURE_RESEARCH_COST} from '../src/sim/research.ts';
import {createPrisonerState} from '../src/sim/prisoner-state.ts';
import {medicalCamp} from './scenarios/health.ts';
import type {Cell,Job,Pawn,Structure,World} from '../src/sim/types.ts';

function camp(count=3):World {
 const w=medicalCamp(count,16);w.structures=[];w.jobs=[];w.resources=[];w.piles=[];w.packed=[];
 w.tiles=w.tiles.map(()=>({terrain:'soil'}));delete w.wildlife;delete w.mechanoids;delete w.home;
 for(const p of w.pawns){
  p.age=legacyHumanAge();delete p.health;
  Object.assign(p,{x:2,z:3,state:'idle',hunger:100,rest:100,restZeroTicks:0,collapsePending:false,path:[],motion:null,moveCooldown:0,planCooldown:0,jobId:null});
 }
 refreshStock(w);return w;
}
function building(w:World,kind:Structure['kind'],x:number,z:number):Structure {
 const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'wood'};
 if(kind==='door'||kind==='fence-gate')s.door=newDoorState(w.tick);
 if(kind==='spike-trap')s.spikeTrap=initialSpikeTrapState(w,{x,z});
 w.structures.push(s);return s;
}
function draft(p:Pawn,target:Cell){p.draft={lastActiveTick:0,target,queue:[]};p.path=[];p.planCooldown=0;}
function barrier(w:World){for(let z=0;z<w.height;z++)if(z!==8)building(w,'wall',8,z);}
function finishWall(w:World,worker:Pawn,x:number,z:number):Job {
 const j:Job={id:w.nextId++,kind:'wall',material:'wood',x,z,orientation:0,footprint:'standard',construction:'frame',status:'active',reservedBy:worker.id,progress:0,escrow:{wood:0,food:0}};
 w.jobs.push(j);addMaterial(w,'wood',5,{type:'job',jobId:j.id},'wood');
 setWorkUnits(j,Math.round((constructionRecipe(j).work-.01)*10000));
 worker.jobId=j.id;worker.state='working';worker.planCooldown=20;worker.priorities.build=1;return j;
}
type ReadReceipt={geometry:navigation.StructureNavigationGeometry;ids:number[];roomDoors:number[];corners:number[]};
type ReaderReceipt={world:World;reads:ReadReceipt[];invalidations:number};

/** The oracle changes only the new capture lifetime: every read reconstructs
 * geometry from the current World. The real engine, commits, searches, contact
 * damage and PRNG producers execute unchanged in both branches. */
function oneTick(w:World,cold=false,onFirstInvalidate?:(world:World)=>void):ReaderReceipt {
 const createReader=navigation.structureNavigationReader,receipts:ReaderReceipt[]=[];
 const spy=vi.spyOn(navigation,'structureNavigationReader').mockImplementation(world=>{
  const reader=createReader(world),receipt:ReaderReceipt={world,reads:[],invalidations:0};receipts.push(receipt);
  return {
   read(){
    const geometry=cold?navigation.captureStructureNavigation(world):reader.read();
    receipt.reads.push({geometry,ids:geometry.entries.map(e=>e.structure.id),roomDoors:geometry.roomDoors.map(s=>s.id),corners:[...geometry.corners]});return geometry;
   },
   invalidate(){if(!receipt.invalidations)onFirstInvalidate?.(world);receipt.invalidations++;reader.invalidate();},
  };
 });
 try{stepWorld(w);}finally{spy.mockRestore();}
 // Registered maps execute through a live local view, not the root wrapper.
 // Match its actual campaign/map identity rather than object equality, without
 // accidentally accepting an away/group projection or another map's reader.
 const local=receipts.filter(r=>registeredCampaign(r.world)===registeredCampaign(w)&&registeredMapId(r.world)===registeredMapId(w));
 expect(local,'exactly one reader belongs to the actual local decision phase').toHaveLength(1);return local[0]!;
}
function compareOneTick(w:World,onFirstInvalidate?:(world:World)=>void):ReaderReceipt {
 expect(validateWorld(w),'prepared checkpoint').toEqual([]);
 const cold=structuredClone(w),tick=w.tick;
 const receipt=oneTick(w,false,onFirstInvalidate);oneTick(cold,true,onFirstInvalidate);
 expect(w.tick).toBe(tick+1);expect(validateWorld(w),'committed checkpoint').toEqual([]);
 expect(serializeWorld(w)).toBe(serializeWorld(cold));return receipt;
}

test('a completed wall blocks the later colonist in the same engine tick after an earlier search warmed geometry',()=>{
 const w=camp(),[warm,builder,walker]=w.pawns as [Pawn,Pawn,Pawn];barrier(w);
 draft(warm,{x:4,z:3});Object.assign(builder,{x:7,z:8});Object.assign(walker,{x:6,z:8});draft(walker,{x:10,z:8});
 const job=finishWall(w,builder,8,8),materialId=w.piles[0]!.id,receipt=compareOneTick(w);
 const wall=w.structures.find(s=>s.kind==='wall'&&s.x===8&&s.z===8)!;
 expect(wall).toBeDefined();expect(w.jobs).not.toContain(job);expect(w.piles.some(p=>p.id===materialId)).toBe(false);
 expect(receipt.invalidations).toBeGreaterThan(0);expect(receipt.reads[0]!.ids).not.toContain(wall.id);expect(receipt.reads.at(-1)!.ids).toContain(wall.id);
 expect(warm.motion).not.toBeNull();expect(walker.motion).toBeNull();expect(walker.draft!.target).toBeNull();expect({x:walker.x,z:walker.z}).toEqual({x:6,z:8});
});

test('a real released carried patient springs a trap after geometry was read; the later route immediately loses its avoidance surcharge',()=>{
 const w=camp(4),[warm,carrier,patient,walker]=w.pawns as [Pawn,Pawn,Pawn,Pawn];
 const trap=building(w,'spike-trap',6,8),bed=building(w,'bed',12,12);bed.medical=true;bed.prisoner=true;bed.quality='normal';
 for(let i=10;i<=14;i++){building(w,'wall',i,10);building(w,'wall',i,14);if(i>10&&i<14){if(i!==12)building(w,'wall',10,i);building(w,'wall',14,i);}}
 building(w,'door',10,12);
 draft(warm,{x:4,z:3});Object.assign(carrier,{x:6,z:8,rest:0,restZeroTicks:101,collapsePending:true,state:'moving'});
 carrier.draft={lastActiveTick:w.tick,target:null,queue:[]};carrier.orders.active='rescue';carrier.rescue={patientId:patient.id,bedId:bed.id,phase:'carry'};
 Object.assign(patient,{x:6,z:8,faction:'outlaws'});patient.prisoner=createPrisonerState(w,patient);
 patient.health={...createMedicalRecord(w.tick),bloodLoss:Math.round(.8*BLOOD_UNIT)};reconcilePawnHealth(w,patient);
 // The carried patient is absent from the real Core contact window. The
 // carrier's existing contact is already recorded. Only the real collapse
 // releases the patient before its later before-decision visit in this tick.
 // A hostile, unreleased prisoner has the real certain spring rule. Do not
 // depend on an allied0.5% chance or guess which global draw precedes contact.
 trap.spikeTrap!.touching=[spikeTrapTargetKey(carrier)];w.rng=1;expect(spikeTrapSpringChance(w,patient)).toBe(1);
 Object.assign(walker,{x:5,z:8});draft(walker,{x:7,z:8});
 const receipt=compareOneTick(w),trapIndex=trap.z*w.width+trap.x;
 expect(receipt.reads[0]!.ids).toContain(trap.id);
 expect(receipt.invalidations,JSON.stringify({carrier:{state:carrier.state,rescue:carrier.rescue,collapsePending:carrier.collapsePending},patient:{state:patient.state,health:patient.health},rng:w.rng,trapPresent:w.structures.includes(trap),touching:trap.spikeTrap!.touching})).toBeGreaterThan(0);
 expect(receipt.reads.at(-1)!.ids).not.toContain(trap.id);
 expect(carrier.rescue).toBeUndefined();expect(w.structures).not.toContain(trap);expect(w.destroyed?.lost.wood).toBe(45);
 expect(patient.health!.injuries.length+patient.health!.missing.length).toBeGreaterThan(0);expect(w.rng).not.toBe(1);
 expect(walker.motion?.to).toEqual({x:6,z:8});expect(walker.motion?.terrainDelay??0).toBe(0);
 expect(navigationCosts(w,walker,undefined,receipt.reads.at(-1)!.geometry).costs?.get(trapIndex)??0).toBe(0);
});

test('an authorized gate policy is read live between two searches at the same tick without rebuilding footprint membership',()=>{
 const w=camp(1),pawn=w.pawns[0]!;barrier(w);Object.assign(pawn,{x:7,z:8});
 const gate=building(w,'fence-gate',8,8);gate.door!.forbidden=true;
 const reader=navigation.structureNavigationReader(w),geometry=reader.read(),budget:SearchBudget={remaining:2,pairs:100,structureGeometry:reader.read},goal={x:9,z:8},tick=w.tick,rng=w.rng;
 const denied=search(w,pawn,blockedCells(w,false,reader.read()),new Set(),budget)!;expect(routeToCell(w,goal,denied)).toBeNull();
 expect(applyCommand(w,{type:'door-policy',structureId:gate.id,setting:'forbidden',value:false}).ok).toBe(true);
 expect(reader.read()).toBe(geometry);expect(geometry.at(gate)).toEqual([gate]);
 const allowed=search(w,pawn,blockedCells(w,false,reader.read()),new Set(),budget)!;
 expect(routeToCell(w,goal,allowed)).toEqual([{x:8,z:8},goal]);expect(w.tick).toBe(tick);expect(w.rng).toBe(rng);expect(budget.remaining).toBe(0);
});

test.each(['fence','fence-gate'] as const)('the environment commit refreshes in-place %s→door membership without array or length changes',kind=>{
 const w=camp(),[warm,worker,walker]=w.pawns as [Pawn,Pawn,Pawn];barrier(w);
 w.research={...w.research,project:null,points:0,complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:w.tick}};
 const gate=building(w,kind,8,8),vent=building(w,'vent',3,6);vent.material='steel';vent.vent={open:true};
 draft(warm,{x:4,z:3});Object.assign(worker,{x:3,z:5});worker.priorities.basic=1;
 expect(requestPowerFlick(w,vent.id,false).ok).toBe(true);
 const job=w.jobs.find(j=>j.kind==='flick')!;job.progress=10;job.status='active';job.reservedBy=worker.id;worker.jobId=job.id;worker.state='working';worker.planCooldown=20;
 Object.assign(walker,{x:6,z:8});draft(walker,{x:10,z:8});
 // A fixture-only in-place edit at an actual environment commit exercises
 // that lifetime independently of the append/replacement fallback guards.
 // No player mechanic that transforms a fence into a door is being asserted.
 const receipt=compareOneTick(w,world=>{
  const array=world.structures,length=array.length,subject=array.find(s=>s.id===gate.id)!;
  subject.kind='door';subject.door??=newDoorState(world.tick);
  expect(world.structures).toBe(array);expect(array).toHaveLength(length);
 });
 expect(vent.vent!.open).toBe(false);expect(w.jobs).not.toContain(job);expect(gate.kind).toBe('door');
 expect(receipt.invalidations).toBeGreaterThan(0);expect(receipt.reads[0]!.roomDoors).not.toContain(gate.id);expect(receipt.reads.at(-1)!.roomDoors).toContain(gate.id);
 const gateIndex=8*w.width+8;if(kind==='fence')expect(receipt.reads[0]!.corners).not.toContain(gateIndex);
 expect(receipt.reads.at(-1)!.corners).toContain(gateIndex);
 const geometry=receipt.reads.at(-1)!.geometry;
 expect(navigationCosts(w,walker,undefined,geometry).costs?.get(gateIndex)).toBe(navigationCosts(w,walker).costs?.get(gateIndex));
 expect(navigationCosts(w,walker,undefined,geometry).costs?.get(gateIndex)).toBeGreaterThan(0);
});
