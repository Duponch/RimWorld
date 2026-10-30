import {expect,test} from 'vitest';
import {frontierHarness} from './frontier-runtime-harness';
import {MotionTimeline} from '../src/render/MotionTimeline';
import {CorePhaseFrameOwner297} from '../src/bridge/core-phase-owner-297';
import {applyCommand} from '../src/sim/index';
import {serializeCampaign,validateWorld} from '../src/sim/serialization';

/** Prospective contract, NOT executed by its author. Stage this single file
 * beside the existing product tests in ROOT's isolated graph. The only controlled
 * inputs are monotone wall time and ordinary task delivery, as in the existing
 * Runtime harness. No forged phase, World clock, route, RNG or Native authority.
 * This is a cadence diagnosis, not a CPU/FPS/GPU benchmark. */
test.each([1,3,6] as const)('regular real publications keep a running confirmed clock advancing at x%i',speed=>{
 const h=frontierHarness({speed}),timeline=new MotionTimeline(),owner=new CorePhaseFrameOwner297();
 const command={type:'draft-move' as const,pawnIds:[h.input.pawnId],target:{x:25,z:5},queue:false};
 expect(h.request({type:'command',command}).reply.ok).toBe(true);
 const oracle=h.oracle;if(!('pawns' in oracle))throw Error('This declared movement oracle must own its actual local map');
 expect(applyCommand(oracle,command).ok).toBe(true);
 let publication=0,full=0,phase=0,ready=false,confirmed=0,adoptionJumps=0,maxAdoptionJump=0,regularAdoptionJumps=0;
 const receipts:{kind:string;at:number;core:number;speed:number;before:number;after:number}[]=[];
 const feed=()=>{
  while(publication<h.publications.length){
   const receipt=h.publications[publication++]!;
   const p=receipt.kind==='full'?(()=>{const row=h.rows[full++]!;return owner.adoptFull(row.world,row.packet.epoch,row.packet.revision,row.packet.motion,row.packet.corePhase297,row.packet.speed as 0|1|3|6);})():owner.commit(owner.prepare(h.phaseRows[phase++]!.packet));
   expect(p.core).toBe(receipt.core);
   const before=timeline.tick;
   timeline.adopt(p.core/10,p.speed,p.tracks,receipt.at,!ready,true,true);
   if(ready&&p.speed>0&&timeline.tick>before){adoptionJumps++;maxAdoptionJump=Math.max(maxAdoptionJump,timeline.tick-before);if(receipt.at>=1200)regularAdoptionJumps++;}
   ready=true;confirmed=p.core/10;
   expect(timeline.tick).toBeLessThanOrEqual(confirmed);
   receipts.push({kind:receipt.kind,at:receipt.at,core:p.core,speed:p.speed,before,after:timeline.tick});
  }
 };
 feed();
 const frames:{at:number;tick:number;confirmed:number;delta:number;held:boolean}[]=[];
 let previous=timeline.tick;
 // 300-Hz event ordering grid: genuine20ms timer wakes every6 units;
 // presentation60Hz every5 units. A coincident receipt precedes that frame.
 // 800ms, at most288 physical Cores per case; no invented transport delay.
 for(let unit=1;unit<=240;unit++){
  const now=1000+unit*10/3;h.at(now);
  if(unit%6===0){h.wake();h.drain();feed();}
  if(unit%5===0){
   const tick=timeline.advance(now),delta=tick-previous;
   expect(tick).toBeGreaterThanOrEqual(previous);expect(tick).toBeLessThanOrEqual(confirmed);
   if(unit>=60)frames.push({at:now,tick,confirmed,delta,held:tick===previous});
   previous=tick;
  }
 }
 const actualCore=h.lastCore();expect(actualCore).toBe(speed*48);
 const played=serializeCampaign(h.owner());expect(validateWorld(h.owner())).toStrictEqual([]);
 expect(played).toBe(h.oracleCores(actualCore));
 expect(h.request({type:'speed',speed:0}).reply.ok).toBe(true);feed();h.drain();
 expect(timeline.tick).toBe(actualCore/10);expect(timeline.advance(100000)).toBe(actualCore/10);
 expect(h.saved()).toBe(played);h.assertFullDecoder();
 const report={speed,actualCore,nominalFrameDelta:speed/10,frames:frames.length,
  heldFrames:frames.filter(f=>f.held).length,minDelta:Math.min(...frames.map(f=>f.delta)),maxDelta:Math.max(...frames.map(f=>f.delta)),
  adoptionJumps,maxAdoptionJump,regularAdoptionJumps,receipts,framesTrace:frames};
 console.info('REGULAR_CONFIRMED_CLOCK297 '+JSON.stringify(report));
 // Expected RED on the current product if one-Core receipt correction produces
 // repeated holds even under this nonstarved regular producer. No assertion
 // demands a new Core, synthetic position, future time or changed native tween.
 expect(report.heldFrames,JSON.stringify(report)).toBe(0);
 expect(report.regularAdoptionJumps,JSON.stringify(report)).toBe(0);
 // Ten decimal places tolerate only number arithmetic noise in local ticks.
 // No visually meaningful jitter or elapsed-time jump is accepted.
 expect(report.minDelta,JSON.stringify(report)).toBeCloseTo(report.nominalFrameDelta,10);
 expect(report.maxDelta,JSON.stringify(report)).toBeCloseTo(report.nominalFrameDelta,10);
});
