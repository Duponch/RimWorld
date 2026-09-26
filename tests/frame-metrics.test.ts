import { readFileSync } from 'node:fs';
import { assertHarvestPhase,presentationStarvations,visibleSpeedResponse } from '../scripts/harvest-assertions';
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
