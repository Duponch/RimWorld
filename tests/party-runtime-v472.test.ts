import {expect,test} from 'vitest';
import {deserializeWorld,serializeWorld,stepWorld} from '../src/sim/index.ts';
import {advanceParty292,processParty292,reconcileParty292,reconcilePartyPawn292} from '../src/sim/party-runtime-292.ts';
import {PARTY_CHECK_CORE292,partyBusy292,partyCapable292,partyDanger292,partyHome292,partyRoll292,partySeed292,partyThreshold292} from '../src/sim/party-rules-292.ts';
import {partyArea292,partyCells292,partyTaskSiteValid292} from '../src/sim/party-space-292.ts';
import {RoomTopologyCache} from '../src/sim/room-topology.ts';
import {blockedCells,reachableCells} from '../src/sim/pathfinding.ts';
import {preparePartyRelease292} from '../src/sim/party-release-292.ts';
import {processRecreation} from '../src/sim/recreation.ts';
import {allowedAreaRecreationAllowed} from '../src/sim/allowed-area-services.ts';
import {ensureFireState} from '../src/sim/fire-rules.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {secondaryContext} from '../src/sim/secondary-site-context.ts';
import {captureSecondaryMap} from '../src/sim/secondary-site-context.ts';
import {partyCamp472} from './scenarios/social-party-v472.ts';
import type {NeedContext} from '../src/sim/needs.ts';
import type {Pawn,World} from '../src/sim/types.ts';

/** Prepared active owner only for isolated runtime boundaries, never a native acquisition. */
function active(w:World,durationCore=5000):void {
 const now=w.tick*10;w.party292={adoptedAtCore:now,nextCheckCore:now+5000,rng:1,pending:false,lastStartedAtCore:now,
  active:{startedAtCore:now,durationCore,advancedAtCore:now,organizerId:w.pawns[0]!.id,site:{x:14,z:11},members:[]}};
}
function present(w:World,p:Pawn,elapsed=1,presentCore=0):void {
 const a=w.party292!.active!;p.x=12+w.party292!.active!.members.length%4;p.z=11+Math.floor(a.members.length/4);p.path=[];p.moveCooldown=0;p.motion=null;
 p.recreation.task={activity:'party',partyStartedAtCore:a.startedAtCore,buildingId:null,target:{x:p.x,z:p.z},phase:'active',elapsed};p.state='recreating';
 a.members=[...a.members,{pawnId:p.id,joinedAtCore:a.startedAtCore,presentCore}];if(p.id===a.organizerId)a.organizerJoined=true;
}
function context(w:World,p:Pawn):NeedContext {
 const topology=new RoomTopologyCache().read(w);
 return {recreationTopology:()=>topology,search:goals=>reachableCells(w,p,blockedCells(w),new Set(),goals),
  move:()=>{},release:()=>{throw Error('Party must not release work/cargo through generic recreation');},event:()=>{}};
}
function pass(w:World,run=true):void {
 w.tick++;const topology=new RoomTopologyCache().read(w);reconcileParty292(w,topology);
 if(run)for(const p of w.pawns)processParty292(w,p,context(w,p));advanceParty292(w,topology);
}
function due(w:World):void {advanceParty292(w);w.party292!.pending=true;w.tick=w.party292!.nextCheckCore/10;}

test('prospective adoption schedules a future opportunity without touching global streams or nextId',()=>{
 const w=partyCamp472(),rng=w.rng,nextId=w.nextId,whole=serializeWorld(w);
 expect(w.party292).toBeUndefined();expect(partyHome292(w)).toBe(true);expect(serializeWorld(w)).toBe(whole);
 advanceParty292(w);expect(w.party292).toEqual({adoptedAtCore:20000,nextCheckCore:25000,rng:partySeed292(w.seed,0),pending:false});
 expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);advanceParty292(w);expect(w.party292!.nextCheckCore).toBe(25000);
});

test('future family and true secondary/camp contexts cannot adopt Party',()=>{
 const w=partyCamp472();(w as unknown as {schemaVersion:number}).schemaVersion=293;advanceParty292(w);expect(w.party292).toBeUndefined();
 const secondary=partyCamp472();secondary.expeditionSite={tile:1,createdAt:secondary.tick,calendarOffset:0};advanceParty292(secondary);expect(secondary.party292).toBeUndefined();
 const old=partyCamp472();delete old.worldMaps;delete old.worldGroups;expect(partyHome292(old)).toBe(true);
 old.secondarySite={revision:1,tile:1,createdAt:old.tick,selected:false,map:captureSecondaryMap(partyCamp472()),visit:null};
 expect(partyHome292(secondaryContext(old)!)).toBe(false);
});

test('private seed/roll is deterministic, nonzero and leaves campaign RNG untouched',()=>{
 const w=partyCamp472(4,123),rng=w.rng;
 expect(w.seed).toBe(123);expect(partySeed292(123,0)).not.toBe(partySeed292(123,1));expect(partySeed292(123)).toBe(partySeed292(123));
 expect(partyRoll292(1).value).toBeLessThan(1/480);expect(partyRoll292(1).rng).toBeGreaterThan(0);expect(w.rng).toBe(rng);
});

test('pending retries only at a due 5000-Core check, never at intermediate passes',()=>{
 const w=partyCamp472();due(w);for(const p of w.pawns)p.schedule.fill('work');advanceParty292(w);
 expect(w.party292!.pending).toBe(true);expect(w.party292!.active).toBeUndefined();
 for(const p of w.pawns)p.schedule.fill('anything');w.tick++;advanceParty292(w);expect(w.party292!.active).toBeUndefined();
 w.tick=w.party292!.nextCheckCore/10;advanceParty292(w);expect(w.party292!.active).toBeDefined();
});

test('first start has no ten-day delay and organizer is not supplied as an initial member',()=>{
 const w=partyCamp472();due(w);const rng=w.rng,nextId=w.nextId;advanceParty292(w);
 const a=w.party292!.active!;expect(a).toBeDefined();expect(a.members).toEqual([]);expect(a.organizerJoined).toBeUndefined();
 expect(a.durationCore).toBeGreaterThanOrEqual(5000);expect(a.durationCore).toBeLessThanOrEqual(15000);
 expect(w.party292!.lastStartedAtCore).toBe(w.tick*10);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);
});

test('roll still advances while pending and during cooldown after an actual start',()=>{
 const w=partyCamp472();due(w);w.party292!.lastStartedAtCore=w.tick*10-10;w.party292!.rng=1;const expected=partyRoll292(1);advanceParty292(w);
 expect(w.party292!.rng).toBe(expected.rng);expect(w.party292!.pending).toBe(true);expect(w.party292!.active).toBeUndefined();
});

test('collective gates reject three civilians and exactly half drafted',()=>{
 const few=partyCamp472(3);due(few);advanceParty292(few);expect(few.party292!.active).toBeUndefined();
 const w=partyCamp472();due(w);for(const p of w.pawns.slice(0,2))p.draft={target:null,queue:[],lastActiveTick:w.tick};advanceParty292(w);expect(w.party292!.active).toBeUndefined();
});

test('threshold ten is a potential threshold, never a member cap',()=>{
 expect(partyThreshold292(4)).toBe(3);expect(partyThreshold292(30)).toBe(10);
 const w=partyCamp472(12);active(w);for(const p of w.pawns)expect(processParty292(w,p,context(w,p))).toBe(true);
 expect(w.party292!.active!.members).toHaveLength(12);expect(new Set(w.pawns.map(p=>JSON.stringify(p.recreation.task!.target))).size).toBe(12);
});

test('ten civilians need six available invitees at the native even rounding boundary',()=>{
 const w=partyCamp472(10);due(w);
 for(const p of w.pawns.slice(6))p.draft={target:null,queue:[],lastActiveTick:w.tick};
 expect(partyThreshold292(10)).toBe(6);advanceParty292(w);
 expect(w.party292!.active).toBeDefined();expect(w.party292!.active!.members).toEqual([]);
});

test('accepted job, explicit priority, queue and physical cargo are conserved',()=>{
 const w=partyCamp472();active(w);const p=w.pawns[1]!;
 p.jobId=123;expect(processParty292(w,p,context(w,p))).toBe(false);expect(p.jobId).toBe(123);p.jobId=null;
 p.priorityWork={cell:{x:10,z:10},work:'build',startedAt:w.tick};expect(partyBusy292(p)).toBe(true);expect(processParty292(w,p,context(w,p))).toBe(false);delete p.priorityWork;
 p.orders.queue=[123];expect(processParty292(w,p,context(w,p))).toBe(false);expect(p.orders.queue).toEqual([123]);p.orders.queue=[];
 w.piles.push({id:w.nextId++,kind:'wood',item:'wood',quantity:3,owner:{type:'pawn',pawnId:p.id}});
 const cargo=structuredClone(w.piles);expect(processParty292(w,p,context(w,p))).toBe(false);expect(w.piles).toEqual(cargo);
});

test('exhausted navigation quota waits without admitting or declaring inaccessibility',()=>{
 const w=partyCamp472();active(w);const p=w.pawns[1]!,c=context(w,p);c.search=()=>null;
 expect(processParty292(w,p,c)).toBe(true);expect(p.recreation.task).toBeNull();expect(w.party292!.active!.members).toEqual([]);
 expect(processParty292(w,p,context(w,p))).toBe(true);expect(w.party292!.active!.members).toHaveLength(1);
});

test('late admission accepts exactly 1200 Core remaining and refuses less',()=>{
 const w=partyCamp472();active(w);w.tick+=380;
 expect(processParty292(w,w.pawns[1]!,context(w,w.pawns[1]!))).toBe(true);w.tick++;
 expect(processParty292(w,w.pawns[2]!,context(w,w.pawns[2]!))).toBe(false);
});

test('travel, same-pass arrival and newly admitted membership grant no presence or joy',()=>{
 const w=partyCamp472();active(w);const p=w.pawns[1]!;p.recreation.level=20;const joy=p.recreation.level;
 expect(processParty292(w,p,context(w,p))).toBe(true);expect(p.recreation.task!.phase).toBe('travel');
 pass(w);expect(w.party292!.active!.members[0]!.presentCore).toBe(0);expect(p.recreation.level).toBe(joy);
 // Declared final edge endpoint for an isolated arrival boundary.
 const target=p.recreation.task!.target;p.x=target.x;p.z=target.z;p.path=[];p.moveCooldown=0;p.motion=null;
 pass(w);expect(p.recreation.task!.phase).toBe('active');expect(p.recreation.task!.elapsed).toBe(0);expect(w.party292!.active!.members[0]!.presentCore).toBe(0);
 pass(w);expect(w.party292!.active!.members[0]!.presentCore).toBe(10);expect(p.recreation.level).toBeCloseTo(joy+.035,10);
});

test('future motion endpoint is not physical presence even with forged-looking active coordinates',()=>{
 const w=partyCamp472();active(w);const p=w.pawns[1]!;present(w,p);const joy=p.recreation.level;
 p.motion={from:{x:p.x-1,z:p.z},to:{x:p.x,z:p.z},start:w.tick,end:w.tick+1};
 pass(w);expect(w.party292!.active!.members[0]!.presentCore).toBe(0);expect(p.recreation.level).toBe(joy);
});

test('one completed interval grants ten Core once; saturated or bored joy does not finish Party',()=>{
 const w=partyCamp472();active(w);const p=w.pawns[1]!;present(w,p);p.recreation.level=100;p.recreation.bored.social=true;
 pass(w);const a=w.party292!.active!;expect(a.members[0]!.presentCore).toBe(10);advanceParty292(w);expect(a.members[0]!.presentCore).toBe(10);
 expect(processRecreation(w,p,context(w,p))).toBe(false);expect(p.recreation.task!.activity).toBe('party');expect(w.party292!.active).toBeDefined();
});

test('timeout is strictly greater than duration and stops before any new presence credit',()=>{
 const w=partyCamp472();active(w);const p=w.pawns[1]!;present(w,p);const a=w.party292!.active!;
 w.tick+=500;a.advancedAtCore=w.tick*10-10;reconcileParty292(w);processParty292(w,p,context(w,p));advanceParty292(w);
 expect(a.members[0]!.presentCore).toBe(10);expect(w.party292!.active).toBeDefined();w.tick++;advanceParty292(w);
 expect(w.party292!.active).toBeUndefined();expect(p.recreation.task).toBeNull();expect(p.partyMemories292).toHaveLength(1);
 expect(p.partyMemories292![0]!.power).toBeCloseTo(10/5000+.0625,6);
});

test('member death excludes the dead before the living outcome and cleans reciprocal tasks',()=>{
 const w=partyCamp472();active(w);const [organizer,guest]=w.pawns;present(w,organizer!,1,100);present(w,guest!,1,200);
 guest!.state='dead';reconcilePartyPawn292(w,guest!);
 expect(w.party292!.active).toBeUndefined();expect(guest!.partyMemories292).toBeUndefined();expect(organizer!.partyMemories292).toHaveLength(1);
 expect(organizer!.recreation.task).toBeNull();expect(guest!.recreation.task).toBeNull();
});

test('organizer never admitted is distinct from an organizer voluntarily leaving after joining',()=>{
 const w=partyCamp472();active(w);const organizer=w.pawns[0]!,guest=w.pawns[1]!;present(w,guest,1,100);
 reconcileParty292(w);expect(w.party292!.active).toBeDefined();present(w,organizer,1,100);
 preparePartyRelease292(w,new Set([organizer.id])).commit();expect(w.party292!.active).toBeUndefined();
 expect(organizer.partyMemories292).toBeUndefined();expect(guest.partyMemories292).toHaveLength(1);
});

test('grouped release excludes every departing member before the retained outcome',()=>{
 const w=partyCamp472();active(w);for(const p of w.pawns)present(w,p,1,100);
 const [a,b,c,d]=w.pawns;preparePartyRelease292(w,new Set([a!.id,b!.id,c!.id])).commit();
 expect(w.party292!.active).toBeUndefined();for(const p of [a,b,c])expect(p!.partyMemories292).toBeUndefined();expect(d!.partyMemories292).toHaveLength(1);
});

test('own clinical and schedule changes reconcile without a world or membership scan per actor',()=>{
 const w=partyCamp472();active(w);const p=w.pawns[1]!;present(w,p,1,100);p.schedule.fill('work');reconcilePartyPawn292(w,p);
 expect(w.party292!.active!.members).toEqual([]);expect(p.recreation.task).toBeNull();expect(p.partyMemories292).toBeUndefined();
 const organizer=w.pawns[0]!;organizer.health=createMedicalRecord(w.tick);organizer.health.bloodLoss=BLOOD_UNIT*.21;
 expect(partyCapable292(w,organizer,undefined,true)).toBe(false);reconcilePartyPawn292(w,organizer);expect(w.party292!.active).toBeUndefined();
});

test('autonomous physical fire is Low, allows continuing but prevents a new start',()=>{
 const w=partyCamp472();const f=ensureFireState(w);f.items.push({id:w.nextId++,x:25,z:25,size:.2,bornCore:w.tick*10,nextPulseCore:w.tick*10+15,complexCore:w.tick*10+150,spreadCore:w.tick*10+150});
 expect(partyDanger292(w)).toBe('Low');due(w);advanceParty292(w);expect(w.party292!.active).toBeUndefined();
 active(w);reconcileParty292(w);expect(w.party292!.active).toBeDefined();
});

test('active hostile High stops and remembered members retain only acquired presence',()=>{
 const w=partyCamp472();active(w);present(w,w.pawns[1]!,1,100);const hostile=structuredClone(w.pawns[3]!);hostile.id=w.nextId++;hostile.faction='outlaws';w.pawns.push(hostile);
 expect(partyDanger292(w)).toBe('High');reconcileParty292(w);expect(w.party292!.active).toBeUndefined();expect(w.pawns[1]!.partyMemories292).toHaveLength(1);
});

test('bounded positions and coordinate-owned site survive removal of the initial table',()=>{
 const w=partyCamp472();active(w);present(w,w.pawns[1]!);const task=w.pawns[1]!.recreation.task!;
 expect(partyCells292({x:10,z:10})).toHaveLength(197);w.structures=[];
 expect(partyTaskSiteValid292(w,task)).toBe(true);expect(allowedAreaRecreationAllowed(w,w.pawns[1]!,task)).toBe(true);reconcileParty292(w);expect(w.party292!.active).toBeDefined();
 const topology=new RoomTopologyCache().read(w);expect(partyArea292(w,{x:1,z:1},{x:19,z:1},topology)).toBe(true);expect(partyArea292(w,{x:1,z:1},{x:20,z:1},topology)).toBe(false);
});

test('whole native-style acquisition has real travel, no arrival credit and exact continuation after reload',()=>{
 let seed=1;while(partyRoll292(partySeed292(seed,0)).value>=1/480)seed++;
 const w=partyCamp472(4,seed);stepWorld(w,501);expect(w.party292!.active).toBeDefined();
 const before=w.tick;let travelled=false,arrived=false;
 for(let n=0;n<180&&!arrived;n++){
  const old=new Map(w.pawns.map(p=>[p.id,{phase:p.recreation.task?.phase,motionEnd:p.motion?.end??0,x:p.x,z:p.z,target:p.recreation.task?.target}]));
  const oldTick=w.tick,previous=new Map(w.party292!.active!.members.map(m=>[m.pawnId,m.presentCore]));stepWorld(w);
  for(const p of w.pawns){if(p.motion&&p.motion.end>w.tick)travelled=true;const member=w.party292?.active?.members.find(m=>m.pawnId===p.id),prior=old.get(p.id)!;
   if(member&&(member.presentCore-(previous.get(p.id)??0))>0){expect(prior.phase).toBe('active');expect(prior.motionEnd).toBeLessThanOrEqual(oldTick);expect(prior.x).toBe(prior.target!.x);expect(prior.z).toBe(prior.target!.z);arrived=true;}}
 }
 expect(w.tick).toBeGreaterThan(before);expect(travelled).toBe(true);expect(arrived).toBe(true);
 const clone=deserializeWorld(serializeWorld(w));stepWorld(w,24);stepWorld(clone,24);expect(serializeWorld(clone)).toBe(serializeWorld(w));
});

test('a membership admitted after a cached lookup is observed by the following clinical hook',()=>{
 const w=partyCamp472();active(w);reconcilePartyPawn292(w,w.pawns[0]!);const guest=w.pawns[1]!;
 expect(processParty292(w,guest,context(w,guest))).toBe(true);guest.state='downed';reconcilePartyPawn292(w,guest);
 expect(w.party292!.active!.members).toEqual([]);expect(guest.recreation.task).toBeNull();
});

test('start preserves bounded event history and ordinary schedules are not rewritten',()=>{
 const w=partyCamp472();w.events=Array.from({length:80},(_,i)=>({tick:i,type:'need' as const,message:`Ancien ${i}`}));const schedules=w.pawns.map(p=>[...p.schedule]);
 due(w);advanceParty292(w);expect(w.events).toHaveLength(80);expect(w.events.at(-1)!.message).toContain('fête');expect(w.pawns.map(p=>p.schedule)).toEqual(schedules);
 expect(PARTY_CHECK_CORE292).toBe(5000);
});
