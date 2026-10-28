import {describe,it,expect} from 'vitest';
import {MotionTimeline,MOTION_BUFFER_TICKS} from '../src/render/MotionTimeline';
import {PresentationQueue} from '../src/render/PresentationQueue';
import type {World} from '../src/sim/types';
import type {PawnTrack} from '../src/bridge/motion-tracks';
const tracks:PawnTrack[]=[{id:7,segments:[{from:{x:1,z:1},to:{x:2,z:1},start:20,end:21}]}];
describe('explicit fine Core presentation policy297',()=>{
 it('starts with one confirmed Core reserve and never extrapolates on famine',()=>{const t=new MotionTimeline();t.adopt(20,1,tracks,0,true,true,true);t.adopt(20.1,1,tracks,20,false,true,true);expect(t.advance(40)).toBe(20.1);expect(t.advance(1040)).toBe(20.1);});
 it('preserves the historical two-local-tick reserve',()=>{expect(MOTION_BUFFER_TICKS).toBe(2);const t=new MotionTimeline();t.adopt(20,1,tracks,0,true,true);t.adopt(20.1,1,tracks,20,false,true);expect(t.advance(1040)).toBe(20);});
 it('snaps only an authoritative pause and resumes from that confirmed frontier',()=>{const t=new MotionTimeline();t.adopt(20,1,tracks,0,true,true,true);t.adopt(20.4,0,tracks,40,false,true,true);expect(t.tick).toBe(20.4);expect(t.advance(500)).toBe(20.4);t.adopt(20.4,1,tracks,510,false,true,true);expect(t.advance(520)).toBe(20.4);t.adopt(20.5,1,tracks,530,false,true,true);expect(t.advance(550)).toBe(20.5);});
 it('selects a confirmed stationary STOP instead of a stale earlier edge',()=>{const t=new MotionTimeline(),stop={from:{x:2,z:1},to:{x:2,z:1},start:20.1,end:20.1,fromFraction:0,toFraction:0,stop297:true as const};t.adopt(20.1,0,[{id:7,segments:[tracks[0]!.segments[0]!,stop]}],0,true,true,true);expect(t.segment(7)).toBe(stop);expect(t.playbackSegment435(7)).toBe(stop);});
 it('does not replace distinct same-civil-tick Full captures',()=>{const q=new PresentationQueue(),a={tick:20} as World,b={tick:20} as World;q.push(a,20);q.push(b,20.3);expect(q.size).toBe(2);expect(q.take(20.1)).toBe(a);expect(q.take(20.3)).toBe(b);});
});
