import {declareUnplayedFixture296} from './scenarios/initial-core-clock-v492';
import {expect,test} from 'vitest';
import {cleanlinessCamp} from './scenarios/cleanliness.ts';
import {startTravel} from '../src/sim/movement.ts';
import {travelEnd} from '../src/sim/travel-timing.ts';
import {validCapturedTravelDelay} from '../src/sim/captured-travel-delay.ts';
import {validatePawnRecordShape} from '../src/sim/pawn-record-save.ts';
import {initialSpikeTrapState} from '../src/sim/spike-trap-state.ts';
import {validateWorld,serializeWorld,deserializeWorld,stepWorld} from '../src/sim/index.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import type {Pawn} from '../src/sim/types.ts';

/** Declared movement fixture, not a generated campaign or an acquisition. */
function edge(trap=false,historical=false){
 const w=cleanlinessCamp(),p=w.pawns[0]!,to={x:p.x+1,z:p.z+1};
 if(historical)declareUnplayedFixture296(w);
 for(const key of Object.keys(p.priorities) as (keyof Pawn['priorities'])[])p.priorities[key]=0;
 w.tiles[to.z*w.width+to.x]={terrain:'mossy-soil'};
 if(trap)w.structures.push({id:w.nextId++,kind:'spike-trap',...to,orientation:0,footprint:'standard',material:'wood',spikeTrap:initialSpikeTrapState(w,to)});
 expect(startTravel(w,p,to)).toBe(true);return {w,p,to};
}

test.each([false,true])('actual mossy-ground edge with known trap=%s saves its original invoice and resumes it',trap=>{
 const {w,p,to}=edge(trap),motion=structuredClone(p.motion)!;
 expect(motion.terrainDelay).toBe(trap?4.3:.3);expect(motion.end).toBe(travelEnd(motion));
 expect(validatePawnRecordShape(p as unknown as Record<string,unknown>,w,w.schemaVersion)).toEqual([]);
 // The source may disappear while this physical edge is still finishing.
 w.tiles[to.z*w.width+to.x]={terrain:'grass'};w.structures=[];
 expect(validateWorld(w)).toEqual([]);const raw=serializeWorld(w),twin=deserializeWorld(raw);
 expect(twin.pawns[0]!.motion).toEqual(motion);expect(serializeWorld(twin)).toBe(raw);
 for(let i=0;i<12;i++){stepWorld(w);stepWorld(twin);expect(serializeWorld(twin)).toBe(serializeWorld(w));}
 expect(p.moveCooldown).toBe(0);expect({x:p.x,z:p.z}).toEqual(to);
});

test('new captured invoices are refused before geography256 and malformed amounts remain refused',()=>{
 for(const delay of [.3,4.3]){expect(validCapturedTravelDelay(delay,255)).toBe(false);expect(validCapturedTravelDelay(delay,256)).toBe(true);}
 for(const delay of [.3000000001,.2999999999,4.3000000001,4.2999999999,.5,4.5,0,-.3,NaN,Infinity,'0.3',null])expect(validCapturedTravelDelay(delay,256)).toBe(false);
 for(const trap of [false,true]){
  const {w,p}=edge(trap,true);expect(p.motion!.coreMove297).toBeUndefined();
  expect(validatePawnRecordShape(p as unknown as Record<string,unknown>,w,256)).toEqual([]);
  expect(validatePawnRecordShape(p as unknown as Record<string,unknown>,w,255)).toContain('Inconsistent travel duration.');
  // Genuine old raw is migrated before continuation; its captured invoice stays literal.
  const before=structuredClone(p.motion),migrated=deserializeWorld(JSON.stringify(w));
  expect(migrated.pawns[0]!.motion).toEqual(before);expect(migrated.phaseCore297).toBe(0);
 }
 const {w,p}=edge();expect(validatePawnRecordShape(p as unknown as Record<string,unknown>,w,w.schemaVersion)).toEqual([]);
 p.motion!.end+=.01;expect(validatePawnRecordShape(p as unknown as Record<string,unknown>,w,w.schemaVersion)).toContain('Inconsistent travel duration.');
});

test('full and sparse MAIN adoption keep the exact captured edge after its ground has changed',()=>{
 const {w,p,to}=edge(),motion=structuredClone(p.motion)!;w.tiles[to.z*w.width+to.x]={terrain:'grass'};
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const first=decoder.adopt(structuredClone(encoder.encode(w,0,1)));expect(first.status,first.status==='resync'?first.reason:undefined).toBe('applied');
 stepWorld(w);const next=decoder.adopt(structuredClone(encoder.encode(w,1,1)));expect(next.status,next.status==='resync'?next.reason:undefined).toBe('applied');
 if(next.status==='applied'){expect(next.world.pawns[0]!.motion).toEqual(motion);expect(next.world.pawns[0]!.moveCooldown).toBe(p.moveCooldown);}
});
