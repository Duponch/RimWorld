import {expect,test} from 'vitest';
import {advanceCoreStartingArrival256} from '../src/sim/starting-pod-runtime-256';
import {hitSkyfallerRoof256} from '../src/sim/roofing';
import {CORE_STARTING_ARRIVAL_PROFILE_256} from '../src/sim/starting-pod-state-256';
import type {CoreStartingArrivalPending256} from '../src/sim/starting-pod-state-256';
import type {World} from '../src/sim/types';

// A declared roof-contact unit input, NOT an admitted generated World. No
// actor discharge or save is claimed here; the real generated-250 replay is
// checked separately. All ten possible intra-macro contact offsets matter.
function contact(version:number,fall:number){
 const tick=Math.ceil((fall-15)/10),pod={id:10,skyfallerId:11,cell:{x:1,z:1},phase:'incoming',fallCore:fall,remainingCore:fall-(tick-1)*10,ageCore:0,roofHit:false};
 const arrival={profile:CORE_STARTING_ARRIVAL_PROFILE_256,phase:'incoming',start:0,landAt:Math.ceil(fall/10),openAt:Math.ceil((fall+111)/10),personalTick:0,atCore:(tick-1)*10,pods:[pod],openedCells:[]} as unknown as CoreStartingArrivalPending256;
 const world={schemaVersion:version,tick,phaseCore297:0,width:3,height:3,site:{revision:3},planet:{revision:3},startingArrival:arrival} as unknown as World;
 return {world,pod,arrival,tick};
}

test('all roof-contact offsets in current physical schemas use the actual macro frontier instead of stalling the capsule',()=>{
 for(const version of [297,298])for(let fall=120;fall<130;fall++){
  const {world,pod,arrival,tick}=contact(version,fall);
  expect(hitSkyfallerRoof256(world,pod.cell,tick*10-1)).toBe(false);
  advanceCoreStartingArrival256(world);
  expect(pod.roofHit,`schema${version}/fall${fall}`).toBe(true);
  expect(pod.remainingCore).toBe(fall-tick*10);
  expect(arrival.atCore).toBe(tick*10);
  expect(hitSkyfallerRoof256(world,pod.cell,tick*10-1)).toBe(false);
 }
});

test('historical pre-physical arrival batches retain their original accepted roof clock interval',()=>{
 for(let fall=120;fall<130;fall++){
  const {world,pod,arrival,tick}=contact(296,fall);
  advanceCoreStartingArrival256(world);
  expect(pod.roofHit).toBe(true);expect(pod.remainingCore).toBe(fall-tick*10);expect(arrival.atCore).toBe(tick*10);
 }
});

test('a previously stalled capsule retries at the real frontier without resetting its fall or allocating a replacement',()=>{
 const {world,pod,arrival}=contact(298,122);
 world.tick=50;arrival.atCore=490;pod.remainingCore=0;
 const original=pod,fall=pod.fallCore;
 advanceCoreStartingArrival256(world);
 expect(arrival.pods[0]).toBe(original);expect(pod.fallCore).toBe(fall);
 expect(pod.roofHit).toBe(true);expect(pod.phase).toBe('landed');expect(pod.ageCore).toBe(9);expect(arrival.atCore).toBe(500);
});
