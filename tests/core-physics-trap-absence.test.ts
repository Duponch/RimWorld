import {expect,test,vi} from 'vitest';
import * as contacts from '../src/sim/spike-traps-297.ts';
import {applyCommand,advanceWorldCore297} from '../src/sim/engine.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import {registeredCampaign,registeredMapId} from '../src/sim/world-map-context.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {constructionRecipe} from '../src/sim/construction-materials.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {finishDeconstruction} from '../src/sim/deconstruction.ts';
import {initialSpikeTrapState,spikeTrapTargetKey} from '../src/sim/spike-trap-state.ts';
import {legacyHumanAge} from '../src/sim/human-age.ts';
import type {Pawn,Structure,World} from '../src/sim/types.ts';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';

function quiet(){
 const w=deconstructionCamp(1,32),p=w.pawns[0]!;w.stockpiles=[];w.growingZones=[];delete w.home;w.rng=0xdeadbeef;
 Object.assign(p,{x:15,z:16,hunger:100,rest:100,restZeroTicks:0,collapsePending:false,state:'idle',path:[],motion:null,moveCooldown:0});p.age=legacyHumanAge();delete p.health;
 p.schedule.fill('work');p.recreation.level=100;
 for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
 refreshStock(w);expect(validateWorld(w)).toEqual([]);return w;
}
function core(w:World){const previous=effectiveCore297(w);const result=advanceWorldCore297(w);expect(result.core).toBe(previous+1);expect(effectiveCore297(w)).toBe(previous+1);return result;}
function cores(w:World,count:number){for(let n=0;n<count;n++)core(w);}
// Core physics owns a stable registered local view, not the serialized root.
// Read only existing authority/map brands; do not create a view to observe it.
function samePhysicalMap(owner:World,root:World):boolean {
 const id=registeredMapId(root);
 return id!==undefined&&registeredCampaign(owner)===registeredCampaign(root)&&registeredMapId(owner)===id;
}
function exact(w:World){expect(validateWorld(w)).toEqual([]);const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);return raw;}
function draft(w:World,target:{x:number;z:number}){const p=w.pawns[0]!;expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);expect(applyCommand(w,{type:'draft-move',pawnIds:[p.id],target,queue:false}).ok).toBe(true);}

test('no-trap Core movement reuses absence until an existing macro or command barrier, and reload owns a fresh capture',()=>{
 const w=quiet();draft(w,{x:20,z:16});const capture=vi.spyOn(contacts,'spikeTrapWindow297');
 const reads=()=>capture.mock.calls.filter(([owner])=>samePhysicalMap(owner,w)).length;
 try{
  cores(w,14);const afterInitialAndMacro=reads();
  const beforeRefusal=serializeWorld(w),rng=w.rng;
  expect(applyCommand(w,{type:'spike-trap-auto-rebuild',structureId:w.nextId+100,on:false}).ok).toBe(false);
  expect(serializeWorld(w)).toBe(beforeRefusal);expect(w.rng).toBe(rng);
  core(w);const afterCommand=reads();cores(w,3);const afterOrdinary=reads();
  const raw=exact(w),loaded=deserializeWorld(raw),loadedBefore=effectiveCore297(loaded);
  core(w);core(loaded);expect(effectiveCore297(loaded)).toBe(loadedBefore+1);expect(serializeWorld(loaded)).toBe(serializeWorld(w));
  // Core1 initial, Core10 macro prefix and Core11 macro suffix invalidation.
  // Ordinary physical arrivals cannot add a Thing and must not repeat the scan.
  expect(afterInitialAndMacro).toBe(3);expect(afterCommand).toBe(4);expect(afterOrdinary).toBe(4);
  expect(capture.mock.calls.filter(([owner])=>samePhysicalMap(owner,loaded))).toHaveLength(1);
 }finally{capture.mockRestore();}
});

test('a real macro completes an initial supplied trap frame after absence, then an accepted removal cannot leave stale contacts',()=>{
 const w=quiet(),p=w.pawns[0]!,site={x:16,z:16};p.priorities.build=1;p.skills.construction.level=20;
 expect(applyCommand(w,{type:'designate',kind:'spike-trap',material:'wood',orientation:0,...site}).ok).toBe(true);
 const job=w.jobs.find(j=>j.kind==='spike-trap')!;
 // Declared initial fixture: all prior work/material already belongs to this
 // frame before any Core is played; the last actual macro stroke is not skipped.
 addMaterial(w,'wood',45,{type:'job',jobId:job.id},'wood');job.construction='frame';job.progress=constructionRecipe(job).work-1;job.status='active';job.reservedBy=p.id;p.jobId=job.id;p.state='working';refreshStock(w);exact(w);
 const capture=vi.spyOn(contacts,'spikeTrapWindow297');
 try{
  cores(w,9);expect(w.structures.some(s=>s.kind==='spike-trap')).toBe(false);
  const beforeMacroReads=capture.mock.calls.filter(([owner])=>samePhysicalMap(owner,w)).length;
  for(let n=0;n<60&&!w.structures.some(s=>s.kind==='spike-trap');n++)core(w);
  const trap=w.structures.find(s=>s.kind==='spike-trap')!;expect(trap).toBeDefined();expect(w.jobs.some(j=>j.id===job.id)).toBe(false);expect(w.piles.some(i=>i.owner.type==='job'&&i.owner.jobId===job.id)).toBe(false);
  core(w);expect(capture.mock.calls.some(([owner],i)=>samePhysicalMap(owner,w)&&i>=beforeMacroReads)).toBe(true);
  const raw=exact(w),loaded=deserializeWorld(raw);
  for(const state of [w,loaded]){
   expect(applyCommand(state,{type:'designate',kind:'deconstruct',...site}).ok).toBe(true);
   const removal=state.jobs.find(j=>j.deconstruction?.structureId===trap.id)!;expect(removal).toBeDefined();
   // Actual public atomic retirement service; this case does not claim elapsed
   // deconstruction labor or a player journey through its planner.
   expect(finishDeconstruction(state,state.pawns[0]!,removal)).toBe(true);
  }
  expect(serializeWorld(w)).toBe(serializeWorld(loaded));expect(w.structures.some(s=>s.id===trap.id)).toBe(false);
  for(let n=0;n<3;n++){core(w);core(loaded);expect(serializeWorld(w)).toBe(serializeWorld(loaded));}
  exact(w);expect(beforeMacroReads).toBe(1);
 }finally{capture.mockRestore();}
});

test('present traps keep exact paid-contact RNG and consequences when a fresh owner is reloaded after every real Core',()=>{
 const w=quiet(),p=w.pawns[0]!,trap=fixtureBuilding(w,'spike-trap',16,16) as Structure;trap.material='wood';trap.spikeTrap=initialSpikeTrapState(w,trap);refreshStock(w);exact(w);draft(w,trap);
 let replay=deserializeWorld(serializeWorld(w)),contacted=false;const initialRng=w.rng,key=spikeTrapTargetKey(p);
 for(let n=0;n<120&&!contacted;n++){
  core(w);core(replay);expect(serializeWorld(replay)).toBe(serializeWorld(w));
  contacted=!w.structures.some(s=>s.id===trap.id)||trap.spikeTrap!.touching.includes(key);
  replay=deserializeWorld(serializeWorld(replay));
 }
 expect(contacted).toBe(true);expect(w.rng).not.toBe(initialRng);expect(effectiveCore297(w)).toBe(effectiveCore297(replay));
 for(let n=0;n<2;n++){core(w);core(replay);expect(serializeWorld(replay)).toBe(serializeWorld(w));replay=deserializeWorld(serializeWorld(replay));}
 exact(w);
});
