import { readFileSync } from 'node:fs';
import { assertHarvestPhase,confirmedTravelExcess,presentationStarvations,visibleSpeedResponse,type TravelFrameWitness } from '../scripts/harvest-assertions';
import { expect, test } from 'vitest';
import { FrameMetrics } from '../src/render/FrameMetrics';

test('frame telemetry measures real cadence, counts stalls and resets hidden/resumed windows without growing memory', () => {
  const metrics = new FrameMetrics(); let now = 0;
  metrics.record(now);
  for (let i = 0; i < 12000; i++) metrics.record(now += 1000 / 120);
  expect(metrics.fps).toBeCloseTo(120, 5); expect(metrics.meanMs).toBeCloseTo(1000 / 120, 5);
  metrics.record(now += 1000); expect(metrics.fps).toBeLessThan(90);
  metrics.record(now += 60000, true); expect(metrics.fps).toBe(0);
  metrics.record(now += 60000);
  for (let i = 0; i < 60; i++) metrics.record(now += 1000 / 60);
  expect(metrics.fps).toBeCloseTo(60, 5); expect(metrics.p95Ms).toBeCloseTo(1000 / 60, 5);
  metrics.reset(); metrics.record(now); metrics.record(now); metrics.record(NaN);
  expect(metrics.fps).toBe(0);
  metrics.record(now);
  for (let i = 0; i < 1000; i++) metrics.record(now += 1);
  expect(metrics.fps).toBe(1000);
});


test('presentation acceptance rejects the recorded speed defect and incomplete or desynchronized observations',()=>{
  for(const [delta,dt,old,next,result] of [[.12,20,1,6,false],[.42,20,1,6,true],[.72,20,1,6,true],[.42,20,6,1,true],[.12,20,6,1,true],[0,20,6,1,false],[.84,20,1,6,false],[NaN,20,1,6,false],[1,0,1,6,false]])
    expect(visibleSpeedResponse(delta as number,dt as number,old as number,next as number)).toBe(result);
  const load=(name:string)=>JSON.parse(readFileSync(new URL('../artifacts/'+name,import.meta.url),'utf8')).phases;
  const old=load('harvest-sync-speed-before.json')[0];
  expect(()=>assertHarvestPhase({...old,starvedFrames:0,controls:old.controls.filter((c:any)=>c.delay!==null)})).toThrow(/Delayed speed/);
  const corrected=load('harvest-sync-speed-coalesced.json');
  for(const phase of corrected)expect(()=>assertHarvestPhase(phase)).not.toThrow();
  for(const change of [(p:any)=>p.controls=[],(p:any)=>p.controls[0].delay=null,(p:any)=>p.controls[0].delay=101,(p:any)=>p.starvedFrames=1,(p:any)=>p.jumpCount=1,(p:any)=>p.solidOccupancyCount=1,(p:any)=>p.removals=[],(p:any)=>p.removals[0].play=p.removals[0].tick-1]) {
    const bad=structuredClone(corrected[0]);change(bad);expect(()=>assertHarvestPhase(bad)).toThrow();
  }
});

test('stalled presentation means a full second without tick progress, not ordinary repeated high-FPS images',()=>{
  const frames=[] as {at:number;play:number;speed:number}[];
  for(let at=0;at<=1400;at+=5)frames.push({at,play:Math.floor(at/30),speed:6});
  expect(presentationStarvations(frames)).toEqual([]);
  const stall=[{at:0,play:10,speed:6},{at:500,play:10,speed:6},{at:1001,play:10,speed:6},{at:1200,play:10,speed:6}];
  expect(presentationStarvations(stall)).toEqual([{previous:stall[0],current:stall[2]}]);
  expect(presentationStarvations([{at:0,play:10,speed:0},{at:1200,play:10,speed:0}])).toEqual([]);
});

test('a recorded chop contact edge exceeds the raw speed alarm yet follows one unchanged confirmed trajectory',()=>{
  const dt=29.1,segment={from:{x:117,z:122},to:{x:116,z:122},start:2744,end:2747};
  const from={x:117,z:121.92060089111328},to={x:115.81999969482422,z:122};
  const previous:TravelFrameWitness={position:{x:116.78413861084002,z:121.93512563476561},
    from,to,start:116,end:116.5,time:(2744.5488-2048)/6,play:2744.5488,segment};
  const current:TravelFrameWitness={...previous,position:{x:116.37208250427268,z:121.96285180358885},
    time:(2745.5964-2048)/6,play:2745.5964};
  expect(Math.hypot(current.position.x-previous.position.x,current.position.z-previous.position.z))
    .toBeGreaterThan(dt*.013+.02);
  expect(confirmedTravelExcess(previous,current,dt)).toBe(true);

  const teleport=structuredClone(current);teleport.position.x-=1;
  expect(confirmedTravelExcess(previous,teleport,dt)).toBe(false);

  const replacedBound=structuredClone(current);replacedBound.to.x-=.1;
  const alpha=(replacedBound.time-replacedBound.start)/(replacedBound.end-replacedBound.start);
  replacedBound.position.x=replacedBound.from.x+(replacedBound.to.x-replacedBound.from.x)*alpha;
  replacedBound.position.z=replacedBound.from.z+(replacedBound.to.z-replacedBound.from.z)*alpha;
  expect(confirmedTravelExcess(previous,replacedBound,dt)).toBe(false);

  const skippedClock=structuredClone(current);skippedClock.play+=.1;skippedClock.time+=.1/6;
  const advanced=(skippedClock.time-skippedClock.start)/(skippedClock.end-skippedClock.start);
  skippedClock.position.x=skippedClock.from.x+(skippedClock.to.x-skippedClock.from.x)*advanced;
  skippedClock.position.z=skippedClock.from.z+(skippedClock.to.z-skippedClock.from.z)*advanced;
  expect(confirmedTravelExcess(previous,skippedClock,dt)).toBe(false);

  const changedSegment=structuredClone(current);changedSegment.segment.start++;
  expect(confirmedTravelExcess(previous,changedSegment,dt)).toBe(false);
  const invalidTime=structuredClone(current);invalidTime.time=NaN;
  expect(confirmedTravelExcess(previous,invalidTime,dt)).toBe(false);
});
