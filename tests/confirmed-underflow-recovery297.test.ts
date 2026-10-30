import {expect,test} from 'vitest';
import {frontierHarness} from './frontier-runtime-harness';
import {MotionTimeline} from '../src/render/MotionTimeline';
import {CorePhaseFrameOwner297} from '../src/bridge/core-phase-owner-297';
import {applyCommand} from '../src/sim/index';
import {serializeCampaign,validateWorld} from '../src/sim/serialization';

/** Prospective single continuation, NOT run by its author. The actual Runtime
 * schedules and commits every Core; only its existing wall/task harness is
 * controlled. No fabricated packet queue, World clock, ACK or Native authority.
 * Fixed bounds precede the first ROOT run and must not be tuned after RED. */
test('confirmed playout survives two actual Runtime supply/recovery cycles without cumulative history debt',()=>{
 const h=frontierHarness({speed:6}),timeline=new MotionTimeline(),owner=new CorePhaseFrameOwner297();
 const command={type:'draft-move' as const,pawnIds:[h.input.pawnId],target:{x:25,z:5},queue:false};
 expect(h.request({type:'command',command}).reply.ok).toBe(true);
 const oracle=h.oracle;if(!('pawns' in oracle))throw Error('This declared movement oracle must own its actual local map');
 expect(applyCommand(oracle,command).ok).toBe(true);
 let publication=0,full=0,phase=0,ready=false,confirmed=0,epoch:number|undefined,lastProgressAt=1000,maxProgressGap=0;
 const receipts:{at:number;core:number;speed:number;jump:number;reset:boolean}[]=[];
 const feed=()=>{
  while(publication<h.publications.length){
   const receipt=h.publications[publication++]!;
   const p=receipt.kind==='full'?(()=>{const row=h.rows[full++]!;return owner.adoptFull(row.world,row.packet.epoch,row.packet.revision,row.packet.motion,row.packet.corePhase297,row.packet.speed as 0|1|3|6);})():owner.commit(owner.prepare(h.phaseRows[phase++]!.packet));
   expect(p.core).toBe(receipt.core);
   const reset=!ready||p.anchor.epoch!==epoch,before=timeline.tick;
   timeline.adopt(p.core/10,p.speed,p.tracks,receipt.at,reset,true,true);
   if(p.core/10>confirmed){maxProgressGap=Math.max(maxProgressGap,receipt.at-lastProgressAt);lastProgressAt=receipt.at;}
   confirmed=p.core/10;epoch=p.anchor.epoch;ready=true;
   expect(timeline.tick).toBeLessThanOrEqual(confirmed+1e-10);
   receipts.push({at:receipt.at,core:p.core,speed:p.speed,jump:timeline.tick-before,reset});
  }
 };
 feed();
 // Real Core birth times, observed around ordinary Runtime callbacks. Several
 // synchronous commits can legitimately share one controlled wall timestamp.
 const births:{core:number;at:number}[]=[{core:0,at:1000}];
 const perform=(now:number,operation:()=>unknown)=>{const before=h.lastCore();operation();const after=h.lastCore();for(let core=before+1;core<=after;core++)births.push({core,at:now});};
 let ageIndex=0;
 const realHistoryAge=(now:number,shownCore:number)=>{
  while(ageIndex+1<births.length&&births[ageIndex+1]!.core<=shownCore+1e-9)ageIndex++;
  const left=births[ageIndex]!,right=births[ageIndex+1];
  const at=right&&shownCore>left.core?left.at+(right.at-left.at)*(shownCore-left.core)/(right.core-left.core):left.at;
  return now-at;
 };
 type Stage='nominal'|'under1'|'recovery1'|'under2'|'recovery2';
 const stageAt=(elapsed:number):Stage=>elapsed<300?'nominal':elapsed<800?'under1':elapsed<1200?'recovery1':elapsed<1700?'under2':'recovery2';
 const starts:Record<Stage,number>={nominal:0,under1:300,recovery1:800,under2:1200,recovery2:1700};
 const frames:{at:number;elapsed:number;stage:Stage;tick:number;confirmed:number;playedCore:number;delta:number;held:boolean;historyTicks:number;realHistoryAgeMs:number;queuedTasks:number}[]=[];
 const source:{at:number;stage:Stage;core:number;queuedTasks:number}[]=[];
 let previous=timeline.tick;
 // 1800-Hz ordering grid: timer every36 units (20ms), RAF every30
 // (60Hz). Nominal tasks every5 units (360Core/s), under-supply every9
 // (200Core/s). This changes task availability, never the Runtime's nominal
 // speed6 or physical per-Core rules. One fixture continues through all arms.
 for(let unit=1;unit<=3780;unit++){
  const elapsed=unit*5/9,now=1000+elapsed,stage=stageAt(elapsed);h.at(now);
  if(unit%36===0){perform(now,()=>h.wake());if(stage==='nominal')perform(now,()=>h.drain());}
  if(stage!=='nominal'&&unit%(stage==='under1'||stage==='under2'?9:5)===0&&h.queued())perform(now,()=>h.runOne());
  feed();
  if(unit%36===0)source.push({at:now,stage,core:h.lastCore(),queuedTasks:h.queued()});
  if(unit%30===0){
   const tick=timeline.advance(now),delta=tick-previous;
   expect(tick).toBeGreaterThanOrEqual(previous);expect(tick).toBeLessThanOrEqual(confirmed+1e-10);
   expect(confirmed*10).toBeLessThanOrEqual(h.lastCore()+1e-8);
   frames.push({at:now,elapsed,stage,tick,confirmed,playedCore:h.lastCore(),delta,held:delta<=1e-10,historyTicks:confirmed-tick,realHistoryAgeMs:realHistoryAge(now,tick*10),queuedTasks:h.queued()});
   previous=tick;
  }
 }
 const actualCore=h.lastCore(),played=serializeCampaign(h.owner());
 expect(validateWorld(h.owner())).toStrictEqual([]);
 expect(played).toBe(h.oracleCores(actualCore));
 expect(h.request({type:'speed',speed:0}).reply.ok).toBe(true);feed();h.drain();
 expect(h.lastCore()).toBe(actualCore);expect(timeline.tick).toBe(actualCore/10);expect(timeline.advance(100000)).toBe(actualCore/10);
 expect(h.saved()).toBe(played);h.assertFullDecoder();
 // Genuine Runtime load/re-export, not a repaired clone or synthetic identity.
 expect(h.request({type:'load',data:played,threatPauseMode:'major'}).reply.ok).toBe(true);feed();
 expect(h.saved()).toBe(played);expect(timeline.tick).toBe(actualCore/10);
 expect(timeline.advance(100001)).toBe(actualCore/10);h.assertFullDecoder();
 const summary=(stage:Stage)=>{
  const selected=frames.filter(f=>f.stage===stage&&f.elapsed>=starts[stage]+200);
  expect(selected.length).toBeGreaterThan(4);
  const sourceRows=source.filter(f=>f.stage===stage&&f.at>=1000+starts[stage]+200),first=sourceRows[0]!,last=sourceRows.at(-1)!;
  return{stage,count:selected.length,held:selected.filter(f=>f.held).length,minDelta:Math.min(...selected.map(f=>f.delta)),maxDelta:Math.max(...selected.map(f=>f.delta)),
   meanRealAgeMs:selected.reduce((sum,f)=>sum+f.realHistoryAgeMs,0)/selected.length,maxRealAgeMs:Math.max(...selected.map(f=>f.realHistoryAgeMs)),
   sourceLocalTicksPerSecond:(last.core-first.core)*100/(last.at-first.at),minHistory:Math.min(...selected.map(f=>f.historyTicks)),maxHistory:Math.max(...selected.map(f=>f.historyTicks))};
 };
 const stages=(['nominal','under1','recovery1','under2','recovery2'] as const).map(summary);
 const report={actualCore,semanticSpeed:6,nominalFrameDelta:.6,steadyWarmupMs:200,maxProgressGap,ordinaryJoins:receipts.filter(r=>r.at>=1200&&r.speed>0&&!r.reset&&Math.abs(r.jump)>1e-10),stages,frames,receipts,source,births};
 console.info('CONFIRMED_UNDERSUPPLY_RECOVERY297 '+JSON.stringify(report));
 // Conservation/reload were checked before these new policy expectations.
 // An adverse age/delta/join stays RED; it is not excused by fewer held frames.
 expect(maxProgressGap,JSON.stringify(report)).toBeLessThanOrEqual(100);
 expect(report.ordinaryJoins,JSON.stringify(report)).toStrictEqual([]);
 for(const s of stages){
  expect(s.held,JSON.stringify(s)).toBe(0);
  expect(s.maxDelta,JSON.stringify(s)).toBeLessThanOrEqual(.6+1e-9);
  expect(s.minDelta,JSON.stringify(s)).toBeGreaterThanOrEqual(.09);
  expect(s.maxRealAgeMs,JSON.stringify(s)).toBeLessThanOrEqual(100+1e-9);
  if(s.stage==='nominal'){expect(s.minDelta).toBeCloseTo(.6,10);expect(s.maxDelta).toBeCloseTo(.6,10);}
  if(s.stage==='under1'||s.stage==='under2')expect(s.sourceLocalTicksPerSecond).toBeGreaterThanOrEqual(18);
  if(s.stage==='under1'||s.stage==='under2')expect(s.sourceLocalTicksPerSecond).toBeLessThanOrEqual(22);
 }
 const firstRecovery=stages[2]!,secondRecovery=stages[4]!;
 expect(secondRecovery.meanRealAgeMs,JSON.stringify(stages)).toBeLessThanOrEqual(firstRecovery.meanRealAgeMs+1000/60);
 expect(secondRecovery.maxRealAgeMs,JSON.stringify(stages)).toBeLessThanOrEqual(firstRecovery.maxRealAgeMs+1000/60);
});
