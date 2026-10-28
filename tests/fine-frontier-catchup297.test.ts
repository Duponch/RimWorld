import {expect,test} from 'vitest';
import {MotionTimeline,MOTION_BUFFER_TICKS} from '../src/render/MotionTimeline';
import {PresentationQueue} from '../src/render/PresentationQueue';
import type {PawnTrack} from '../src/bridge/motion-tracks';
import type {World} from '../src/sim/types';
// NUM received-frontier tests only, no Worker/Native source/World/SIM grant.
const eps=1e-9;
function fine(t:MotionTimeline,tick:number,speed:number,now:number,reset=false,tracks:PawnTrack[]=[]){t.adopt(tick,speed,tracks,now,reset,true,true);}

test('a delayed already-confirmed positive receipt closes accumulated fine297 lag to at most one Core immediately',()=>{
 const t=new MotionTimeline();fine(t,100,1,0,true);fine(t,100.1,1,20);t.advance(200);
 expect(t.tick).toBeCloseTo(100.1,9);const before=t.tick;
 fine(t,101.8,1,500);expect(t.tick).toBeCloseTo(101.7,9);expect(t.tick).toBeGreaterThan(before+1);
 expect(t.tick).toBeLessThanOrEqual(101.8);expect(101.8-t.tick).toBeLessThanOrEqual(.1+eps);
 expect(t.advance(100000)).toBe(101.8);expect(t.advance(200000)).toBe(101.8);
});

test.each([30,60])('delivered-late fine297 samples do not retain10-22Core of extra playhead lag at%iRAF',raf=>{
 const messages=[{at:40,tick:10.2,speed:1},{at:260,tick:11.5,speed:1},{at:480,tick:12.9,speed:3},{at:740,tick:17.3,speed:3},{at:960,tick:25.2,speed:6},{at:1220,tick:34.5,speed:1}];
 const t=new MotionTimeline();fine(t,10,1,0,true);let index=0,confirmed=10,previous=10,jumps=0;
 for(let frame=1;frame<=Math.ceil(1400*raf/1000);frame++){
  const now=frame*1000/raf;
  while(messages[index]&&messages[index]!.at<=now){const m=messages[index++]!,before=t.tick;fine(t,m.tick,m.speed,m.at);confirmed=m.tick;
   expect(t.tick).toBeGreaterThanOrEqual(before-eps);expect(t.tick).toBeLessThanOrEqual(confirmed+eps);expect(confirmed-t.tick).toBeLessThanOrEqual(.1+eps);if(t.tick>before+eps)jumps++;
  }
  const played=t.advance(now);expect(played).toBeGreaterThanOrEqual(previous-eps);expect(played).toBeLessThanOrEqual(confirmed+eps);previous=played;
 }
 expect(index).toBe(messages.length);expect(jumps).toBeGreaterThan(0);expect(t.advance(10000)).toBe(confirmed);expect(t.advance(20000)).toBe(confirmed);
});

test('a stale or repeated receipt cannot rewind fine297; no delivery advances past the latest actually received tick',()=>{
 const t=new MotionTimeline();fine(t,100,1,0,true);fine(t,102,1,100);const first=t.tick;
 fine(t,101.2,1,110);expect(t.tick).toBe(first);fine(t,102,1,120);expect(t.tick).toBe(first);
 t.advance(10000);expect(t.tick).toBe(102);fine(t,101.9,6,11000);expect(t.tick).toBe(102);expect(t.advance(20000)).toBe(102);
});

test('fine297 pause remains exact and frozen, clearing earlier rate changes; resume waits only for a genuinely new Core',()=>{
 const t=new MotionTimeline();fine(t,10,1,0,true);fine(t,12,3,100);fine(t,14,6,120);fine(t,14.2,0,130);
 expect(t.tick).toBe(14.2);for(const now of [120,130,200,100000])expect(t.advance(now)).toBe(14.2);
 fine(t,14.2,1,100010);expect(t.tick).toBe(14.2);expect(t.advance(100020)).toBe(14.2);
 fine(t,14.3,1,100030);expect(t.tick).toBeCloseTo(14.2,9);expect(t.advance(100030)).toBeCloseTo(14.2,9);
 expect(t.advance(100040)).toBeCloseTo(14.26,9);fine(t,14.4,3,100050);expect(t.tick).toBeCloseTo(14.3,9);expect(t.tick).toBeLessThanOrEqual(14.4);
});

test('an explicit owner reset keeps its lower frontier, revokes old cursor generation and replaces old track membership',()=>{
 const old:PawnTrack[]=[{id:1,segments:[{from:{x:0,z:0},to:{x:1,z:0},start:100,end:101}]}],fresh:PawnTrack[]=[{id:2,segments:[{from:{x:3,z:0},to:{x:4,z:0},start:40,end:41}]}];
 const t=new MotionTimeline();fine(t,100,1,0,true,old);fine(t,106,1,100,false,old);const generation=t.playbackGeneration435;
 fine(t,40,1,1000,true,fresh);expect(t.tick).toBe(40);expect(t.playbackGeneration435).toBe(generation+1);expect(t.tracks.has(1)).toBe(false);expect(t.tracks.get(2)).toBe(fresh[0]!.segments);expect(t.advance(1010)).toBe(40);
 fine(t,40.1,1,1020,false,fresh);expect(t.tick).toBeCloseTo(40,9);expect(t.playbackSegment435(2)).toBe(fresh[0]!.segments[0]);
});

test('fine297 forward correction keeps every received track piece and lets the real Scene queue choose its latest due Full only',()=>{
 const tracks:PawnTrack[]=[{id:7,segments:[{from:{x:0,z:0},to:{x:1,z:0},start:100,end:101},{from:{x:1,z:0},to:{x:1,z:0},start:101.2,end:101.2,fromFraction:0,toFraction:0,stop297:true},{from:{x:1,z:0},to:{x:2,z:0},start:101.4,end:104}]}];
 const before=structuredClone(tracks),t=new MotionTimeline(),q=new PresentationQueue();
 const worlds=[101,102,103].map(tick=>({tick,label:String(tick)}) as unknown as World);for(const w of worlds)q.push(w);
 fine(t,100,1,0,true,tracks);fine(t,103,1,500,false,tracks);expect(t.tick).toBeCloseTo(102.9,9);
 expect(q.take(t.tick)).toBe(worlds[1]);expect(q.size).toBe(1);expect(q.take(t.tick)).toBeUndefined();expect(q.take(103)).toBe(worlds[2]);
 expect(t.tracks.get(7)).toBe(tracks[0]!.segments);expect(t.playbackSegment435(7)).toBe(tracks[0]!.segments[2]);expect(tracks).toStrictEqual(before);
});

test('historical mode remains strictly RAF-only with two ticks and unchanged pause/resume policy',()=>{
 expect(MOTION_BUFFER_TICKS).toBe(2);const t=new MotionTimeline();t.adopt(0,1,[],0,true,true,false);t.adopt(2,1,[],340,false,true,false);expect(t.tick).toBe(0);expect(t.advance(500)).toBeCloseTo(.96,9);
 const old=t.tick;t.adopt(6,6,[],510,false,true,false);expect(t.tick).toBe(old);expect(t.advance(520)).toBeGreaterThan(old);
 t.adopt(6,0,[],530,false,true,false);expect(t.tick).toBe(6);expect(t.advance(1000)).toBe(6);
 t.adopt(6,1,[],1000,false,true,false);t.adopt(7,1,[],1200,false,true,false);expect(t.advance(1200)).toBe(6);t.adopt(8,1,[],1400,false,true,false);expect(t.advance(1400)).toBe(6);expect(t.advance(1410)).toBeCloseTo(6.06,9);
});
