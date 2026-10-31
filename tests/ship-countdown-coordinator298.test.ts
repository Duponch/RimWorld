import {expect,test} from 'vitest';
import {createShipCountdownCoordinator298} from '../src/bridge/ship-countdown-coordinator-298.ts';
import {damageStructure,structureMaxHp} from '../src/sim/thing-damage.ts';
import {validateWorld,serializeWorld,deserializeWorld} from '../src/sim/serialization.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import type {EscapeCampaign298} from '../src/sim/ship-escape-state-298.ts';
import type {World} from '../src/sim/types.ts';
import {declaredReadyShip298,DECLARED_READY_SHIP_PREPARATION298} from './helpers/declared-ready-ship298.ts';

/* Three prospective real-service contracts, not a campaign or activation
 * receipt. The helper declares NEW coherent initial state/date and MUST pass
 * input Whole/OwnReload before returning. No test supplies a physical service,
 * fake finalizer, browser clock, forged capture/token or repaired ACTUAL. */
const history=(w:World)=>(w as EscapeCampaign298).escapedShips298;
const withoutArchive=(w:World)=>JSON.stringify(Object.fromEntries(Object.entries(w).filter(([k])=>k!=='escapedShips298')));
function whole(w:World){expect(validateWorld(w)).toEqual([]);const text=serializeWorld(w),copy=deserializeWorld(text);expect(validateWorld(copy)).toEqual([]);expect(serializeWorld(copy)).toBe(text);expect(serializeWorld(w)).toBe(text);return {text,copy};}
function due(coordinator:ReturnType<typeof createShipCountdownCoordinator298>,world:World,generation:number){
 let result=coordinator.updateEligible(0,world,generation);expect(result.kind).toBe('waiting');
 // Supplied eligible deltas only. This does not select a browser/Unity cap.
 for(let n=0;n<32&&result.kind==='waiting';n++)result=coordinator.updateEligible(.25,world,generation);
 expect(result.kind,result.kind==='failed'?result.reason:DECLARED_READY_SHIP_PREPARATION298).toBe('departed');
 if(result.kind!=='departed')throw Error('The real departure did not commit');return result.departureId;
}

test('ordinary start plus eligible deltas commits the real physical archive and preserves a valid exact Whole/OwnReload',()=>{
 const f=declaredReadyShip298(),w=f.world,before=whole(w).text,coordinator=createShipCountdownCoordinator298(w),payloads=JSON.stringify(f.parts),rng=w.rng,nextId=w.nextId;
 try{
  const started=coordinator.start(w,f.computer.id);expect(started.ok,started.ok?'':started.reason).toBe(true);if(!started.ok)throw Error(started.reason);
  expect(serializeWorld(w)).toBe(before);expect(coordinator.updateEligible(.25,w,started.generation).kind).toBe('waiting');expect(serializeWorld(w)).toBe(before);
  const id=due(coordinator,w,started.generation),archive=history(w)!;expect(archive.credits).toBe(id);expect(archive.departures).toHaveLength(1);expect(archive.receipts).toHaveLength(1);
  const departure=archive.departures[0]!;expect(departure.id).toBe(id);expect(departure.finalRoot298).toBe('network');expect(departure.parts).toHaveLength(f.parts.length);
  for(const part of f.parts){expect(w.structures).not.toContain(part);expect(departure.parts).toContain(part);}
  expect(f.casket.shipCryptosleep277.occupant).toEqual({kind:'human',pawn:f.actor});expect(f.casket.shipCryptosleep277.occupant?.kind==='human'&&f.casket.shipCryptosleep277.occupant.pawn).toBe(f.actor);
  for(const item of f.heldItems)expect(f.casket.shipCryptosleep277.items).toContain(item);expect(JSON.stringify(f.parts)).toBe(payloads);
  expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(effectiveCore297(w)).toBe(f.core);expect(coordinator.active).toBe(false);
  whole(w);const after=serializeWorld(w);expect(coordinator.updateEligible(1,w,coordinator.generation).kind).toBe('idle');expect(serializeWorld(w)).toBe(after);
 }finally{coordinator.cleanup();}
});

test('actual observed destruction of the original computer produces an empty final network and leaves every other original in place',()=>{
 const f=declaredReadyShip298(),w=f.world,coordinator=createShipCountdownCoordinator298(w);
 try{
  const started=coordinator.start(w,f.computer.id);expect(started.ok,started.ok?'':started.reason).toBe(true);if(!started.ok)throw Error(started.reason);
  expect(damageStructure(w,f.computer,structureMaxHp(f.computer),'bullet')).toBe(true);expect(w.structures).not.toContain(f.computer);
  whole(w);const rest=withoutArchive(w),survivors=f.parts.filter(p=>p!==f.computer),payloads=JSON.stringify(survivors),rng=w.rng,nextId=w.nextId,core=effectiveCore297(w);
  const id=due(coordinator,w,started.generation),archive=history(w)!;expect(archive.credits).toBe(id);expect(archive.departures).toHaveLength(1);
  expect(archive.departures[0]!.finalRoot298).toBe('known-destroyed');expect(archive.departures[0]!.parts).toEqual([]);expect(archive.departures[0]!.aliases).toEqual([]);
  for(const part of survivors)expect(w.structures).toContain(part);expect(JSON.stringify(survivors)).toBe(payloads);expect(withoutArchive(w)).toBe(rest);
  expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);expect(effectiveCore297(w)).toBe(core);whole(w);
 }finally{coordinator.cleanup();}
});

test('Menu/front, refused starts and old owner/generation never mutate a Whole or counterfeit departure',()=>{
 const f=declaredReadyShip298(),w=f.world,coordinator=createShipCountdownCoordinator298(w),before=whole(w).text;
 try{
  const first=coordinator.start(w,f.computer.id);expect(first.ok).toBe(true);if(!first.ok)throw Error(first.reason);
  expect(coordinator.updateEligible(.25,w,first.generation).kind).toBe('waiting');const retained=coordinator.status();
  expect(coordinator.start(w,w.nextId+100).ok).toBe(false);expect(coordinator.status()).toEqual(retained);expect(serializeWorld(w)).toBe(before);
  expect(coordinator.updateEligible(100,w,first.generation-1).kind).toBe('refused');expect(coordinator.status()).toEqual(retained);expect(serializeWorld(w)).toBe(before);
  expect(coordinator.cancelFromMenu(w,first.generation)).toBe(true);expect(coordinator.active).toBe(false);expect(coordinator.status().countingDown).toBe(false);
  expect(coordinator.updateEligible(100,w,first.generation).kind).toBe('refused');expect(coordinator.updateEligible(100,w,coordinator.generation).kind).toBe('idle');expect(serializeWorld(w)).toBe(before);
  const second=coordinator.start(w,f.computer.id);expect(second.ok).toBe(true);if(!second.ok)throw Error(second.reason);
  expect(coordinator.cancelFromFront(w,second.generation)).toBe(true);expect(coordinator.active).toBe(false);expect(serializeWorld(w)).toBe(before);
  const third=coordinator.start(w,f.computer.id);expect(third.ok).toBe(true);if(!third.ok)throw Error(third.reason);const active=coordinator.status();
  expect(coordinator.bindAcceptedOwner(w)).toBe(false);expect(coordinator.status()).toEqual(active);
  // Actual current-schema Whole admission, then an internal accepted-owner
  // switch. This is not an unimplemented Worker/ACK or UI load-policy test.
  const loaded=deserializeWorld(before);expect(validateWorld(loaded)).toEqual([]);expect(serializeWorld(loaded)).toBe(before);expect(loaded).not.toBe(w);
  expect(coordinator.bindAcceptedOwner(loaded)).toBe(true);const bound=coordinator.status();expect(bound.active).toBe(false);
  expect(coordinator.updateEligible(100,w,coordinator.generation).kind).toBe('refused');expect(coordinator.updateEligible(100,loaded,third.generation).kind).toBe('refused');
  expect(coordinator.start(w,f.computer.id).ok).toBe(false);expect(coordinator.status()).toEqual(bound);expect(history(w)).toBeUndefined();expect(history(loaded)).toBeUndefined();
  expect(serializeWorld(w)).toBe(before);expect(serializeWorld(loaded)).toBe(before);whole(w);whole(loaded);
 }finally{coordinator.cleanup();}
 expect(coordinator.status().disposed).toBe(true);expect(coordinator.start(w,f.computer.id).ok).toBe(false);expect(coordinator.updateEligible(100,w,coordinator.generation).kind).toBe('refused');expect(serializeWorld(w)).toBe(before);
});
