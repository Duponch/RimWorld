import {expect,test} from 'vitest';
import {createShipCountdownSession298} from '../src/bridge/ship-countdown-session-298.ts';

// Portable pure-session contracts. Owners/roots below are declared identities,
// not a simulated runtime, acquired building, World/SAVE or played campaign.
test('Single7.2 follows eligible Update deltas, exact zero stays CountingDown, and one due token is consumed once',()=>{
 const owner={},root={},otherOwner={},otherRoot={};
 const clock=createShipCountdownSession298<object,object>(owner);
 expect(clock.timeLeftSeconds).toBe(-1000);expect(clock.countingDown).toBe(false);
 expect(clock.start(root,owner)).toBe(true);
 expect(clock.timeLeftSeconds).toBe(7.199999809265137);expect(clock.countingDown).toBe(true);
 expect(clock.update(0.2,owner)).toBeUndefined();expect(clock.timeLeftSeconds).toBe(7);
 expect(clock.update(0.5,owner)).toBeUndefined();expect(clock.timeLeftSeconds).toBe(6.5);
 const due=clock.update(6.5,owner)!;
 expect(due).toBeDefined();expect(due.root).toBe(root);expect(due.owner).toBe(owner);
 expect(clock.timeLeftSeconds).toBe(0);expect(clock.countingDown).toBe(true);
 expect(clock.update(1,owner)).toBeUndefined();expect(clock.update(0,owner)).toBeUndefined();
 expect(clock.timeLeftSeconds).toBe(0);expect(clock.isCurrent(due,owner,root)).toBe(true);
 expect(clock.adopt({...due},owner,root)).toBe(false);
 expect(clock.adopt(due,otherOwner,root)).toBe(false);expect(clock.adopt(due,owner,otherRoot)).toBe(false);
 expect(clock.isCurrent(due,owner,root)).toBe(true);
 expect(clock.adopt(due,owner,root)).toBe(true);expect(clock.adopt(due,owner,root)).toBe(false);
 expect(clock.update(100,owner)).toBeUndefined();expect(clock.timeLeftSeconds).toBe(0);
});

test('invalid deltas never change the session or a due token, while explicit menu cancellation uses Single-1000',()=>{
 const owner={},root={},clock=createShipCountdownSession298<object,object>(owner);
 clock.start(root,owner);clock.update(0.2,owner);
 for(const bad of [NaN,Infinity,-Infinity,-1,Number.MAX_VALUE]){
  const generation=clock.generation;
  expect(()=>clock.update(bad,owner)).toThrow(RangeError);
  expect(clock.timeLeftSeconds).toBe(7);expect(clock.generation).toBe(generation);
 }
 const due=clock.update(7.25,owner)!;
 expect(clock.timeLeftSeconds).toBe(-0.25);expect(clock.countingDown).toBe(false);
 const generation=clock.generation;
 expect(()=>clock.update(Number.MAX_VALUE,owner)).toThrow(RangeError);
 expect(clock.timeLeftSeconds).toBe(-0.25);expect(clock.generation).toBe(generation);
 expect(clock.isCurrent(due,owner,root)).toBe(true);
 clock.cancelFromMenu();
 expect(clock.timeLeftSeconds).toBe(-1000);expect(clock.countingDown).toBe(false);
 expect(clock.generation).toBe(generation+1);expect(clock.adopt(due,owner,root)).toBe(false);
 expect(clock.update(1,owner)).toBeUndefined();expect(clock.timeLeftSeconds).toBe(-1000);
});

test('unaccepted owners cannot advance or start; accepted owner replacement invalidates the old root and epoch',()=>{
 const ownerA={},ownerB={},rootA={},rootB={},clock=createShipCountdownSession298<object,object>(ownerA);
 clock.start(rootA,ownerA);clock.update(0.2,ownerA);
 const generation=clock.generation;
 // Refused replacement/load: integration must not call bindOwner. Merely
 // presenting its unaccepted identity cannot cancel the current countdown.
 expect(clock.update(2,ownerB)).toBeUndefined();expect(clock.start(rootB,ownerB)).toBe(false);
 expect(clock.timeLeftSeconds).toBe(7);expect(clock.generation).toBe(generation);
 clock.update(0.5,ownerA);expect(clock.timeLeftSeconds).toBe(6.5);
 const oldDue=clock.update(100,ownerA)!;
 clock.bindOwner(ownerB); // Explicit safety adaptation AFTER accepted replacement.
 expect(clock.timeLeftSeconds).toBe(-1000);expect(clock.countingDown).toBe(false);
 expect(clock.adopt(oldDue,ownerA,rootA)).toBe(false);
 expect(clock.update(100,ownerA)).toBeUndefined();expect(clock.start(rootA,ownerA)).toBe(false);
 expect(clock.start(rootB,ownerB)).toBe(true);const newDue=clock.update(100,ownerB)!;
 expect(clock.adopt(oldDue,ownerB,rootA)).toBe(false);expect(clock.isCurrent(newDue,ownerB,rootB)).toBe(true);
 // A validated replacement that reuses the same owner object still changes epoch.
 clock.bindOwner(ownerB);expect(clock.adopt(newDue,ownerB,rootB)).toBe(false);
 expect(clock.start(rootB,ownerB)).toBe(true);const finalDue=clock.update(100,ownerB)!;
 expect(clock.adopt(finalDue,ownerB,rootB)).toBe(true);expect(clock.adopt(finalDue,ownerB,rootB)).toBe(false);
});
