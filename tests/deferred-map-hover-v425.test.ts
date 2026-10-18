import {expect,test} from 'vitest';
import {DeferredMapHover} from '../src/render/deferred-map-hover';

const move=(x:number,y:number,buttons=0,pointerId=7)=>({clientX:x,clientY:y,buttons,pointerId});

test('a burst publishes only its latest position once at the next frame',()=>{
  const hover=new DeferredMapHover(),first=move(1,2),last=move(30,40);
  hover.move(first);hover.move(move(10,20));hover.move(last);
  last.clientX=900; // A retained native event must not become presentation state.
  expect(hover.take()).toEqual({x:30,y:40});expect(hover.take()).toBeUndefined();
  hover.move(move(50,60));expect(hover.take()).toEqual({x:50,y:60});
});

test.each([2,4])('camera button mask %s suppresses every intermediate hover and restores release coordinates',buttons=>{
  const hover=new DeferredMapHover();hover.beginCamera(move(1,2,buttons));
  for(const x of [3,5,8]){hover.move(move(x,9,buttons));expect(hover.take()).toBeUndefined();}
  hover.release(move(13,17));expect(hover.take()).toEqual({x:13,y:17});expect(hover.take()).toBeUndefined();
});

test('a second button observed only through pointermove suspends hover; releasing one button keeps navigation suspended',()=>{
  const hover=new DeferredMapHover();hover.move(move(1,2));
  hover.move(move(3,4,6));expect(hover.take()).toBeUndefined();
  hover.release(move(5,6,4));expect(hover.take()).toBeUndefined();
  hover.release(move(7,8));expect(hover.take()).toEqual({x:7,y:8});
});

test('cancel or lost capture resumes the last real coordinate once and ignores foreign pointers',()=>{
  const hover=new DeferredMapHover();hover.beginCamera(move(1,2,2));hover.move(move(11,12,2));
  hover.cancel(99);hover.move(move(500,600,0,99));expect(hover.take()).toBeUndefined();
  hover.cancel(7);expect(hover.take()).toEqual({x:11,y:12});expect(hover.take()).toBeUndefined();
});

test('leave prevents a queued or cancelled gesture from resurrecting a stale hover',()=>{
  const hover=new DeferredMapHover();hover.move(move(1,2));hover.leave();expect(hover.take()).toBeUndefined();
  hover.beginCamera(move(3,4,2));hover.leave();hover.cancel(7);expect(hover.take()).toBeUndefined();
  hover.move(move(5,6));expect(hover.take()).toEqual({x:5,y:6});
});

test('selection/construction takeover clears old deferred work; focus loss resumes only a retained real point',()=>{
  const hover=new DeferredMapHover();hover.beginCamera(move(1,2,2));hover.clear();hover.resume();
  expect(hover.take()).toBeUndefined();
  hover.beginCamera(move(3,4,4));hover.resume();expect(hover.take()).toEqual({x:3,y:4});expect(hover.take()).toBeUndefined();
});
