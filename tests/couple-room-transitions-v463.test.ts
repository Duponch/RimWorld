import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {bedSlotCell} from '../src/sim/bed-slots.ts';
import {claimLocalActorBed256} from '../src/sim/actor-bed-local-256.ts';
import {HUMAN_YEAR_TICKS} from '../src/sim/human-age.ts';
import {coupleHourlyChance285,coupleMtbHours285} from '../src/sim/couple-rules-285.ts';
import {coupleOpportunityRoll285} from '../src/sim/couple-random-285.ts';
import {opinionOf} from '../src/sim/social-state.ts';
import {tryCoupleOpportunity285} from '../src/sim/couple-runtime-285.ts';
import {prepareCoupleRelease285} from '../src/sim/couple-release-285.ts';
import {advanceRoomRest} from '../src/sim/room-experience.ts';
import {captureRoomQuality} from '../src/sim/room-quality.ts';
import {ROOM_MEMORY_DURATION,ROOM_MEMORY_OFFSETS} from '../src/sim/room-impressiveness.ts';
import type {Pawn} from '../src/sim/types.ts';

/** Declared built-room and adult/sleep preparation. No paid construction or
 * naturally played romance is claimed. Entry still uses the real positive
 * opportunity, without replacing seed or world RNG. */
function room(applied:boolean){
 const w=medicalCamp(2),[a,b]=w.pawns as [Pawn,Pawn],bed=fixtureBuilding(w,'double-bed',14,14);
 Object.assign(bed,{material:'wood'});
 for(let x=11;x<=19;x++){fixtureBuilding(w,'wall',x,11);fixtureBuilding(w,'wall',x,19);}
 for(let z=12;z<=18;z++){fixtureBuilding(w,'wall',11,z);fixtureBuilding(w,'wall',19,z);}
 for(let z=12;z<=18;z++)for(let x=12;x<=18;x++)w.tiles[z*w.width+x]={terrain:'grass',floor:'marble-tile'};
 const art=fixtureBuilding(w,'large-sculpture',16,16);Object.assign(art,{material:'jade',quality:'normal'});
 w.relationships={links:[{kind:'lover',aId:Math.min(a.id,b.id),bId:Math.max(a.id,b.id),recordedAt:w.tick-1}]};
 for(const [p,slot]of [[a,0],[b,1]]as const){
  delete p.nativeHuman;delete p.health;delete p.social;delete p.mental;delete p.medicalSleep;
  p.age={biologicalTicks:30*HUMAN_YEAR_TICKS,chronologicalTicks:30*HUMAN_YEAR_TICKS};claimLocalActorBed256(w,p,bed,slot);
  Object.assign(p,bedSlotCell(bed,slot),{state:'sleeping',jobId:null,haul:null,cooking:null,path:[],motion:null,moveCooldown:0,hunger:100});
  p.orders.active=null;p.orders.queue=[];p.recreation.task=null;delete p.roomMemories;
 }
 const first={ageYears:30,pain:0,consciousness:1,opinion:opinionOf(a,b.id,w.tick,w),attraction:1};
 const second={...first,opinion:opinionOf(b,a.id,w.tick,w)},mtb=coupleMtbHours285(first,second);
 if(mtb===undefined)throw Error('Actual prepared pair has no MTB');const chance=coupleHourlyChance285(mtb),initial=w.tick;
 let found=false;for(let n=0;n<2000;n++){const tick=initial+n*250;if(coupleOpportunityRoll285(w.seed,a.id,tick*10)<chance){w.tick=tick;found=true;break;}}
 if(!found)throw Error('No positive check in declared preparation bound');
 const stage=captureRoomQuality(w).room(a)?.stage;
 if(stage===undefined||ROOM_MEMORY_OFFSETS.bedroom[stage]===null)throw Error('Prepared true bedroom must support an observable memory');
 const rng=w.rng;
 for(const p of [a,b]){
  p.need={kind:'sleep',phase:'sleep',bedId:bed.id,target:{x:p.x,z:p.z},roomRest:{nextAt:applied?w.tick:w.tick+750,applied:false}};
  if(applied)advanceRoomRest(w,p);
 }
 // The next local tick is in the same deterministic opportunity hour. This
 // makes the real transition's refreshed memory date distinguishable.
 if(applied)w.tick++;
 expect(w.rng).toBe(rng);return {w,a,b,bed,art};
}
const bedroom=(p:Pawn)=>p.roomMemories?.find(m=>m.kind==='bedroom');

test('each actual LayDown transition refreshes an observed bedroom while preserving its RoomRest clock and global RNG',()=>{
 const s=room(true),rng=s.w.rng,first=bedroom(s.a)!,restA=s.a.need?.kind==='sleep'?s.a.need.roomRest:undefined,restB=s.b.need?.kind==='sleep'?s.b.need.roomRest:undefined;
 expect(first.expiresAt).toBe(s.w.tick-1+ROOM_MEMORY_DURATION);const dates=[restA!.nextAt,restB!.nextAt];
 const enteringStage=captureRoomQuality(s.w).room(s.a)!.stage;
 expect(tryCoupleOpportunity285(s.w,s.a)).toBe(true);
 for(const p of [s.a,s.b])expect(bedroom(p)).toEqual({kind:'bedroom',stage:enteringStage,expiresAt:s.w.tick+ROOM_MEMORY_DURATION});
 expect(s.a.coupleTask285!.roomRest).toBe(restA);expect(s.b.coupleTask285!.roomRest).toBe(restB);
 expect([restA!.nextAt,restB!.nextAt]).toEqual(dates);expect(restA!.applied).toBe(true);expect(restB!.applied).toBe(true);
 // A real room-quality input changes during the entered common stage.
 Object.assign(s.art,{quality:'awful'});s.w.tick++;const leavingStage=captureRoomQuality(s.w).room(s.a)!.stage;
 expect(ROOM_MEMORY_OFFSETS.bedroom[leavingStage]).not.toBeNull();expect(leavingStage).not.toBe(enteringStage);
 const before=JSON.stringify(s.w),plan=prepareCoupleRelease285(s.w,new Set([s.a.id]),{resumeAll:true});expect(JSON.stringify(s.w)).toBe(before);plan.commit();
 for(const p of [s.a,s.b])expect(bedroom(p)).toEqual({kind:'bedroom',stage:leavingStage,expiresAt:s.w.tick+ROOM_MEMORY_DURATION});
 expect(s.a.need?.kind==='sleep'?s.a.need.roomRest:undefined).toBe(restA);expect(s.b.need?.kind==='sleep'?s.b.need.roomRest:undefined).toBe(restB);
 expect([restA!.nextAt,restB!.nextAt]).toEqual(dates);expect(s.w.rng).toBe(rng);
});

test('an unobserved physical bedroom grants no free room memory at either transition and never redraws its acquired deadline',()=>{
 const s=room(false),rng=s.w.rng,rest=s.a.need?.kind==='sleep'?s.a.need.roomRest:undefined,date=rest!.nextAt;
 expect(bedroom(s.a)).toBeUndefined();expect(tryCoupleOpportunity285(s.w,s.a)).toBe(true);expect(bedroom(s.a)).toBeUndefined();expect(bedroom(s.b)).toBeUndefined();
 s.w.tick++;prepareCoupleRelease285(s.w,new Set([s.a.id]),{resumeAll:true}).commit();
 expect(bedroom(s.a)).toBeUndefined();expect(bedroom(s.b)).toBeUndefined();expect(s.a.need?.kind==='sleep'?s.a.need.roomRest:undefined).toBe(rest);
 expect(rest).toEqual({nextAt:date,applied:false});expect(s.w.rng).toBe(rng);
});

test('a changed true enclosure makes its prepared observed-room finish stale before either participant is written',()=>{
 const s=room(true);expect(tryCoupleOpportunity285(s.w,s.a)).toBe(true);s.w.tick++;
 const plan=prepareCoupleRelease285(s.w,new Set([s.a.id]),{resumeAll:true});expect(plan.current()).toBe(true);
 const wall=s.w.structures.find(b=>b.kind==='wall'&&b.x===11&&b.z===14);if(!wall)throw Error('Actual boundary wall missing');
 s.w.structures=s.w.structures.filter(b=>b!==wall);expect(captureRoomQuality(s.w).room(s.a)).toBeNull();
 const before=JSON.stringify(s.w),rng=s.w.rng;expect(plan.current()).toBe(false);expect(()=>plan.commit()).toThrow('Stale couple release');
 expect(JSON.stringify(s.w)).toBe(before);expect(s.a.coupleTask285).toBeDefined();expect(s.b.coupleTask285).toBeDefined();expect(s.w.rng).toBe(rng);
});
