// PRIVATE CANDIDATE AUTHORING ONLY, NOT RUN. Imports target the real candidate modules
// when Root overlays candidate/src and candidate/tests onto a full private source copy.
// Timeline inputs and Scene dispatcher Worlds below are NUM presentation fragments, NOT valid saves/Native fixtures.
import {test} from 'vitest';
import assert from 'node:assert/strict';
import {MotionTimeline} from '../src/render/MotionTimeline';
import {SceneRenderCore} from '../src/render/SceneRenderCore';
import {PresentationQueue} from '../src/render/PresentationQueue';
import type {PresentationChanges} from '../src/bridge/presentation-changes';
import type {PawnTrack} from '../src/bridge/motion-tracks';
import type {PresentationSegment} from '../src/sim/travel-timing';
import type {World} from '../src/sim/types';

const edge=(start:number,end:number,x=0):PresentationSegment=>({start,end,from:{x,z:0},to:{x:x+1,z:0}});
const tracks=():PawnTrack[]=>[{id:17,segments:[edge(100,102),edge(102,104,1),edge(104,108,2)]}];

test('an adopted pause immediately joins the latest confirmed frontier at each running speed without advancing Core or changing tracks',()=>{
 for(const speed of [1,3,6]){
  const timeline=new MotionTimeline(),input=tracks(),before=JSON.stringify(input);timeline.adopt(100,speed,input,1000,true);timeline.adopt(104,speed,input,1040);timeline.advance(1060);
  assert.ok(timeline.tick>=100&&timeline.tick<104);const beforePause=timeline.tick;timeline.adopt(104,0,input,1065);
  assert.equal(timeline.tick,104);assert.ok(timeline.tick>=beforePause);assert.equal(timeline.segment(17),input[0]!.segments[2]);assert.equal(timeline.tracks.get(17),input[0]!.segments);
  for(const now of [1060,1065,1080,2000,900000])assert.equal(timeline.advance(now),104,'An old RAF or long wall gap cannot drain or advance paused time');
  assert.equal(JSON.stringify(input),before);assert.equal(input[0]!.segments.length,3,'Confirmed tracks remain owned, rather than being discarded to stop motion');
 }
});

test('pause clears queued positive rate changes and resume still needs two genuinely new confirmed ticks',()=>{
 const timeline=new MotionTimeline(),input=tracks();timeline.adopt(100,1,input,1000,true);timeline.adopt(104,1,input,1040);timeline.adopt(106,3,input,1050);
 timeline.adopt(108,0,input,1100);assert.equal(timeline.tick,108);assert.equal(timeline.advance(1090),108);assert.equal(timeline.advance(1200),108);
 timeline.adopt(108,1,input,1200);assert.equal(timeline.advance(1210),108);timeline.adopt(109,1,input,1300);assert.equal(timeline.advance(1300),108);
 timeline.adopt(110,1,input,1400);assert.equal(timeline.advance(1400),108);assert.ok(Math.abs(timeline.advance(1410)-108.06)<1e-9);
});

test('same-tick paused edits and later paused confirmed ticks are visible without starting another clock',()=>{
 const timeline=new MotionTimeline(),input=tracks();timeline.adopt(100,1,input,0,true);timeline.adopt(104,0,input,10);assert.equal(timeline.tick,104);
 const corrected:PawnTrack[]=[{id:17,segments:[edge(100,106,9)]}];timeline.adopt(104,0,corrected,11);assert.equal(timeline.tick,104);assert.equal(timeline.segment(17),corrected[0]!.segments[0]);
 timeline.adopt(106,0,corrected,12);assert.equal(timeline.tick,106);assert.equal(timeline.advance(10000),106);assert.equal(timeline.tracks.get(17),corrected[0]!.segments);
});

test('an older nonreset pause cannot rewind a timeline that already owns a later confirmed tick',()=>{
 const timeline=new MotionTimeline();timeline.adopt(100,1,[],0,true);timeline.adopt(106,1,[],20);timeline.advance(40);timeline.adopt(105,0,[],50);assert.equal(timeline.tick,106);assert.equal(timeline.advance(1000),106);
});

test('explicit load/reset retains its own frontier and clears tracks of the replaced owner',()=>{
 const timeline=new MotionTimeline(),input=tracks();timeline.adopt(100,1,input,1000,true,true);timeline.adopt(106,0,input,1100,false,true);assert.equal(timeline.tick,106);const generation=timeline.playbackGeneration435;
 const loaded:PawnTrack[]=[{id:23,segments:[edge(40,43)]}];timeline.adopt(42,0,loaded,5000,true,true);assert.equal(timeline.tick,42);assert.equal(timeline.advance(10000),42);assert.equal(timeline.tracks.has(17),false);assert.equal(timeline.tracks.get(23),loaded[0]!.segments);assert.equal(timeline.playbackGeneration435,generation+1);
});

test('closed and public cursor selection remain identical across a pause rebase and smooth running resume',()=>{
 const publicTimeline=new MotionTimeline(),closed=new MotionTimeline(),input=tracks();
 for(const [tick,speed,now,reset] of [[100,1,0,true],[104,1,20,false],[106,0,40,false],[106,6,100,false],[107,6,120,false],[108,6,140,false],[109,3,160,false]] as const){
  publicTimeline.adopt(tick,speed,input,now,reset);closed.adopt(tick,speed,input,now,reset,true);assert.equal(closed.tick,publicTimeline.tick);assert.equal(closed.playbackEnabled435,true);
  for(const at of [now,now+4,now+16]){assert.equal(closed.advance(at),publicTimeline.advance(at));assert.equal(closed.playbackSegment435(17),closed.segment(17));assert.ok(closed.tick<=tick);}
 }
});

test('positive delivery and starvation preserve the original no-jump and no-extrapolation policy',()=>{
 const timeline=new MotionTimeline();timeline.adopt(100,1,[],0,true);timeline.adopt(102,1,[],340);assert.equal(timeline.advance(500),100.96);const old=timeline.tick;
 timeline.adopt(104,6,[],510);assert.equal(timeline.tick,old);assert.ok(timeline.advance(520)>old);assert.equal(timeline.advance(10000),104);assert.equal(timeline.advance(20000),104);
 timeline.adopt(105,3,[],20010);assert.equal(timeline.tick,104);assert.ok(timeline.advance(20020)>104);assert.ok(timeline.tick<=105);
});

function worldFragment(tick:number,label:string):World {
 // Exact data consumed by Scene.setWorld and the actual queue dispatcher only.
 return {tick,seed:491,width:8,height:8,jobs:[],growingZones:[],stockpiles:[],piles:[],home:[],label} as unknown as World;
}
function sceneHarness(closed=false){
 let now=0,hidden=false,frameResets=0,animationResets=0;const applied:{world:World;reset:boolean}[]=[],projectileReads:World[]=[],failures:string[]=[],timeline=new MotionTimeline();
 // Real queue; only its phase observer is a controlled continuous/no-discrete-change test port.
 const queue=new PresentationQueue(undefined,()=>({capture:()=>false} as unknown as PresentationChanges));
 const core=Object.assign(Object.create(SceneRenderCore.prototype),{
  disposed:false,fatalError:undefined,received:undefined,world:undefined as World|undefined,hasTracks:false,immutableSnapshot:false,immutableWorlds:new WeakSet<World>(),
  timeline,presentation:queue,applicationContext:closed?{}:undefined,confirmedIntentReader:undefined,confirmedIntents:undefined,
  confirmedJobMarkers:{clear(){}},hostPort:{now:()=>now,hidden:()=>hidden},projectiles:{adopt(world:World){projectileReads.push(world);}},
  invalidatePausedShadow(){},applyWorld(world:World,reset=false){applied.push({world,reset});this.world=world;},reportFailure(message:string){failures.push(message);},
  frames:{reset(){frameResets++;}},animationDetail:{reset(){animationResets++;}},lastFrame:0,
 });
 return {core,timeline,queue,applied,projectileReads,failures,at(value:number){now=value;},hide(value:boolean){hidden=value;},resets:()=>({frameResets,animationResets}),
  set(world:World,reset=false,speed=1,motion?:PawnTrack[],immutable=true){const supplied=arguments.length>=4?motion:[];SceneRenderCore.prototype.setWorld.call(core,world,reset,speed,supplied,immutable);},
  visibility(){SceneRenderCore.prototype.visibilityChanged.call(core);}};
}

test('Scene presents the current paused World immediately and clears only its old scene queue, even before the200ms continuous deadline',()=>{
 const h=sceneHarness(),initial=worldFragment(100,'initial');h.set(initial,true,1);h.queue.push(initial);assert.equal(h.queue.take(100,100),initial);h.at(120);
 const old=worldFragment(101,'queued old'),running=worldFragment(102,'queued running');h.set(old,false,1);h.set(running,false,1);assert.equal(h.queue.size,2);assert.equal(h.queue.take(102,150),undefined,'The real queue is inside its continuous200ms throttle');
 const paused=worldFragment(102,'current paused'),before=JSON.stringify(paused),calls=h.applied.length;h.at(151);h.set(paused,false,0);
 assert.equal(h.timeline.tick,102);assert.equal(h.queue.size,0);assert.equal(h.applied.length,calls+1);assert.equal(h.applied.at(-1)!.world,paused);assert.equal(h.applied.at(-1)!.reset,false);assert.equal(h.core.received.world,paused);assert.equal(h.core.world,paused);assert.equal(h.core.immutableWorlds.has(paused),true);
 assert.equal(h.queue.take(Infinity,10000),undefined,'An older queued scene cannot overwrite the pause on a later frame');assert.equal(h.timeline.advance(10000),102);assert.equal(JSON.stringify(paused),before);assert.deepEqual(h.failures,[]);
});

test('Scene same-tick paused edits each apply immediately without resetting closed playback authority',()=>{
 const h=sceneHarness(true),initial=worldFragment(100,'initial');h.set(initial,true,1);h.at(20);h.set(worldFragment(102,'pause'),false,0);const generation=h.timeline.playbackGeneration435;
 for(let n=0;n<3;n++){const edited=worldFragment(102,'paused edit '+n);h.at(21+n);const calls=h.applied.length;h.set(edited,false,0);assert.equal(h.applied.length,calls+1);assert.equal(h.applied.at(-1)!.world,edited);assert.equal(h.queue.size,0);assert.equal(h.timeline.tick,102);assert.equal(h.timeline.playbackGeneration435,generation);assert.equal(h.timeline.playbackEnabled435,true);}
});

test('hidden Scene records the latest pause and waits for its existing visibility reset before doing display work',()=>{
 const h=sceneHarness(),initial=worldFragment(100,'initial');h.set(initial,true,1);h.hide(true);h.at(20);const paused=worldFragment(104,'hidden paused'),calls=h.applied.length;h.set(paused,false,0);
 assert.equal(h.applied.length,calls);assert.equal(h.core.received.world,paused);assert.equal(h.timeline.tick,100);h.hide(false);h.at(10000);h.visibility();assert.equal(h.applied.length,calls+1);assert.equal(h.applied.at(-1)!.world,paused);assert.equal(h.applied.at(-1)!.reset,true);assert.equal(h.timeline.tick,104);assert.equal(h.timeline.advance(20000),104);assert.deepEqual(h.resets(),{frameResets:1,animationResets:1});
});

test('disposed and fatal Scene guards still reject a later pause before touching received data or the queue',()=>{
 for(const blocked of ['disposed','fatalError']){const h=sceneHarness(),initial=worldFragment(100,'initial');h.set(initial,true,1);h.core[blocked]=blocked==='disposed'?true:'NUM fatal';const previous=h.core.received,calls=h.applied.length,projectiles=h.projectileReads.length;h.at(20);h.set(worldFragment(104,'blocked pause'),false,0);assert.equal(h.core.received,previous);assert.equal(h.applied.length,calls);assert.equal(h.projectileReads.length,projectiles);assert.equal(h.timeline.tick,100);}
});

test('an explicit replacement paused World uses the normal reset path, not stale queued worlds or old tracks',()=>{
 const h=sceneHarness(true);h.set(worldFragment(100,'initial'),true,1,[{id:17,segments:[edge(100,105)]}]);h.at(20);h.set(worldFragment(102,'queued'),false,1);const loaded=worldFragment(40,'loaded'),motion=[{id:23,segments:[edge(40,43)]}];h.at(1000);h.set(loaded,true,0,motion);
 assert.equal(h.applied.at(-1)!.world,loaded);assert.equal(h.applied.at(-1)!.reset,true);assert.equal(h.queue.size,0);assert.equal(h.timeline.tick,40);assert.equal(h.timeline.tracks.has(17),false);assert.equal(h.timeline.tracks.get(23),motion[0]!.segments);
});

test('a paused untracked delivery also stops a previously tracked Scene, without changing normal untracked admission',()=>{
 const h=sceneHarness();h.set(worldFragment(100,'initial'),true,1,[{id:17,segments:[edge(100,108)]}]);h.at(20);h.set(worldFragment(104,'running'),false,1,[{id:17,segments:[edge(100,108)]}]);h.at(40);const paused=worldFragment(104,'pause without optional motion');h.set(paused,false,0,undefined);assert.equal(h.timeline.tick,104);assert.equal(h.timeline.advance(20000),104);assert.equal(h.applied.at(-1)!.world,paused);assert.equal(h.queue.size,0);
});
