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

test('the recorded mine diagonal is continuous but a smooth two-cell leap still refuses',()=>{
  // Exact two witnesses from V414 presentation01, pawn12409 at53266.
  // The preserved red artifact is not rewritten/reclassified by this fixture.
  const dt=62.400000000001455,segment={from:{x:147,z:159},to:{x:148,z:160},start:2131.58073580374,end:2135.823376490859};
  const previous:TravelFrameWitness={position:{x:147.15715450592484,z:159.15715450592484},
    from:{x:147,z:159},to:{x:148.21212768554688,z:160.21212768554688},start:13.930122375488281,end:14.637228965759277,
    time:14.021800000011885,play:2132.1308000000713,segment};
  const current:TravelFrameWitness={...previous,position:{x:147.79895393434597,z:159.79895393434597},time:14.396200000011882,play:2134.3772000000713};
  expect(Math.hypot(current.position.x-previous.position.x,current.position.z-previous.position.z)).toBeGreaterThan(dt*.013+.02);
  expect(confirmedTravelExcess(previous,current,dt)).toBe(true);

  // Keep clocks, endpoints across both frames, contact envelope, and exact
  // interpolation coherent; only the confirmed grid edge becomes a 2x1 leap.
  const leap=[structuredClone(previous),structuredClone(current)];
  for(const frame of leap){frame.segment.to.x++;frame.to.x++;const alpha=(frame.time-frame.start)/(frame.end-frame.start);
    frame.position={x:frame.from.x+(frame.to.x-frame.from.x)*alpha,z:frame.from.z+(frame.to.z-frame.from.z)*alpha};}
  expect(confirmedTravelExcess(leap[0]!,leap[1]!,dt)).toBe(false);

  const teleport=structuredClone(current);teleport.position.x+=1;
  expect(confirmedTravelExcess(previous,teleport,dt)).toBe(false);
});


/** Exact two witnesses from retained V415 presentation02, pawn12409/tick2132.
 * The original red artifact remains untouched; no new run supplied these data. */
function mineBoundary415(){
 const dt=25.099999999998545;
 const previous:TravelFrameWitness={position:{x:146.9592389947276,z:158.9592389947276},from:{x:146,z:158},to:{x:147,z:159},start:13.223015785217285,end:13.930122375488281,time:13.901300000034098,play:2131.4078000002046,segment:{from:{x:146,z:158},to:{x:147,z:159},start:2127.338095116621,end:2131.58073580374}};
 const current:TravelFrameWitness={position:{x:147.20875216300215,z:159.20875216300215},from:{x:147,z:159},to:{x:148.21212768554688,z:160.21212768554688},start:13.930122375488281,end:14.637228965759277,time:14.051900000034115,play:2132.3114000002047,segment:{from:{x:147,z:159},to:{x:148,z:160},start:2131.58073580374,end:2135.823376490859}};
 return {dt,previous,current};
}
// Negative fixtures preserve each changed GPU leg's own interpolation so a
// smooth-looking teleport or altered junction cannot pass merely by being smooth.
function reposed415(f:TravelFrameWitness){const alpha=(f.time-f.start)/(f.end-f.start);f.position={x:f.from.x+(f.to.x-f.from.x)*alpha,z:f.from.z+(f.to.z-f.from.z)*alpha};}
test('recorded415 mine crossing exactly one proved grid/GPU boundary is continuous without raising the raw alarm',()=>{
 const {dt,previous,current}=mineBoundary415();expect(Math.hypot(current.position.x-previous.position.x,current.position.z-previous.position.z)).toBeGreaterThan(dt*.013+.02);
 expect(previous.segment.to).toEqual(current.segment.from);expect(previous.segment.end).toBe(current.segment.start);expect(previous.to).toEqual(current.from);expect(previous.end).toBe(current.start);
 expect(confirmedTravelExcess(previous,current,dt)).toBe(true);
});
test('one-boundary proof refuses real pose/edge leaps, spatial gaps, timestamp gaps/overlaps, offsets and skipped time',()=>{
 const mutations:((p:TravelFrameWitness,c:TravelFrameWitness)=>void)[]=[
  (_p,c)=>{c.position.x+=.1;},
  (_p,c)=>{c.segment.from.x++;c.segment.to.x++;c.from.x++;c.to.x++;c.position.x++;},
  (_p,c)=>{c.segment.to.x++;c.to.x++;reposed415(c);},
  (_p,c)=>{c.from.x+=.01;reposed415(c);},
  (_p,c)=>{c.segment.start+=.001;c.start+=.001/6;reposed415(c);},
  (_p,c)=>{c.segment.start-=.001;c.start-=.001/6;reposed415(c);},
  (_p,c)=>{c.start+=.00001;c.end+=.00001;c.time+=.00001;reposed415(c);},
  (_p,c)=>{c.to.x+=.01;reposed415(c);},
  (_p,c)=>{c.end+=.001;reposed415(c);},
  (_p,c)=>{c.segment.end=c.segment.start;},
  (_p,c)=>{c.end=c.start;},
  (_p,c)=>{c.play+=.01;c.time+=.01/6;reposed415(c);},
 ];
 for(const mutate of mutations){const {dt,previous,current}=mineBoundary415();mutate(previous,current);expect(Math.hypot(current.position.x-previous.position.x,current.position.z-previous.position.z)).toBeGreaterThan(dt*.013+.02);expect(confirmedTravelExcess(previous,current,dt)).toBe(false);}
});
test('one-boundary proof never fills missing/nonfinite witnesses or accepts absent elapsed time',()=>{
 const {dt,previous,current}=mineBoundary415();for(const key of ['position','from','to','start','end','time','play','segment'] as const){const bad=structuredClone(current) as unknown as Record<string,unknown>;delete bad[key];expect(confirmedTravelExcess(previous,bad as unknown as TravelFrameWitness,dt)).toBe(false);}
 for(const change of [(f:TravelFrameWitness)=>{f.play=NaN;},(f:TravelFrameWitness)=>{f.time=Infinity;},(f:TravelFrameWitness)=>{f.segment.start=NaN;},(f:TravelFrameWitness)=>{f.from.x=Infinity;}]){const bad=structuredClone(current);change(bad);expect(confirmedTravelExcess(previous,bad,dt)).toBe(false);}
 expect(confirmedTravelExcess(undefined as unknown as TravelFrameWitness,current,dt)).toBe(false);for(const elapsed of [0,-1,100,NaN])expect(confirmedTravelExcess(previous,current,elapsed)).toBe(false);
});
