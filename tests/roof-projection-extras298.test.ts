import {expect,test} from 'vitest';
import {advanceWorldCore297} from '../src/sim/engine.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import {roofCollapseProjection256,type RoofCollapseProjectionOptions256} from '../src/sim/roof-collapse-projection-256.ts';
import {declaredFixture} from './helpers/declared-ship-content298.ts';
import type {World} from '../src/sim/types.ts';

/* Surface probes only. The finite32² Source10 fixture is reused unchanged as
 * the base. The two local data domains below are then DECLARED for ownership
 * and slot-adoption tests, not produced by gameplay, fog or a real party.
 * No resulting World is claimed as a Whole/reload, departure or Native play. */
function localDomains():World {
 const w=declaredFixture(),core=effectiveCore297(w);
 expect(w.schemaVersion).toBe(298);
 w.exploration={revision:1};
 w.party292={adoptedAtCore:core,nextCheckCore:core+1000,rng:1,pending:false,lastStartedAtCore:core,
  active:{startedAtCore:core,durationCore:5000,advancedAtCore:core,organizerId:w.pawns[0]!.id,site:{x:6,z:6},members:[]}};
 return w;
}
const both={extraMutableDomains:['exploration','party292']} as const;

test('closed local domain option owns private data, adopts prepared values and refuses a changed source without writes',()=>{
 const w=localDomains(),observed=JSON.stringify(w);let getterReads=0;
 const accessor={};Object.defineProperty(accessor,'extraMutableDomains',{enumerable:true,get(){getterReads++;return [];}});
 for(const bad of [accessor,{extraMutableDomains:['thermal']},{extraMutableDomains:['party292','party292']},{extraMutableDomains:['exploration'],skip:true}])
  expect(()=>roofCollapseProjection256(w,bad as unknown as RoofCollapseProjectionOptions256)).toThrow();
 expect(getterReads).toBe(0);expect(JSON.stringify(w)).toBe(observed);
 const oldExploration=w.exploration!,oldParty=w.party292!,originalPawn=w.pawns[0]!,rootRng=w.rng,rootId=w.nextId,core=effectiveCore297(w);
 const projection=roofCollapseProjection256(w,both),view=projection.view;
 expect(view.exploration).not.toBe(oldExploration);expect(view.party292).not.toBe(oldParty);expect(view.party292!.active!.site).not.toBe(oldParty.active!.site);
 delete view.exploration;view.party292!.active!.site.x=7;
 expect(oldParty.active!.site.x).toBe(6);expect(oldExploration.revision).toBe(1);expect(JSON.stringify(w)).toBe(observed);
 const plan=projection.finish();expect(plan.current()).toBe(true);expect(plan.adopt()).toBe(true);expect(plan.current()).toBe(false);expect(plan.adopt()).toBe(false);
 expect(w.exploration).toBeUndefined();expect(Object.hasOwn(w,'exploration')).toBe(false);expect(w.party292!.active!.site.x).toBe(7);
 expect(w.pawns[0]).toBe(originalPawn);expect(w.rng).toBe(rootRng);expect(w.nextId).toBe(rootId);expect(effectiveCore297(w)).toBe(core);

 const changed=localDomains(),other=roofCollapseProjection256(changed,both);other.view.party292!.pending=true;
 const refused=other.finish();expect(refused.current()).toBe(true);
 changed.party292!.active!.site.z=7; // Declared in-place source fault after preparation.
 const afterFault=JSON.stringify(changed);
 expect(refused.current()).toBe(false);expect(refused.adopt()).toBe(false);expect(JSON.stringify(changed)).toBe(afterFault);
});

test('a frozen real extra-domain destination refuses before writes; without opt-in the historical path leaves it untouched',()=>{
 for(const key of ['exploration','party292'] as const){
  const w=localDomains(),projection=roofCollapseProjection256(w,both),source=w[key];
  if(key==='exploration')delete projection.view.exploration;else projection.view.party292!.pending=true;
  Object.defineProperty(w,key,{value:source,enumerable:true,writable:false,configurable:false});
  const before=JSON.stringify(w),plan=projection.finish();
  expect(plan.current()).toBe(false);expect(plan.adopt()).toBe(false);expect(JSON.stringify(w)).toBe(before);expect(w[key]).toBe(source);

  const ordinary=localDomains(),retained=ordinary[key];
  Object.defineProperty(ordinary,key,{value:retained,enumerable:true,writable:false,configurable:false});
  const historical=roofCollapseProjection256(ordinary); // No extra selection/list.
  expect(historical.view[key]).toBe(retained);
  const unchanged=historical.finish();expect(unchanged.current()).toBe(true);expect(unchanged.adopt()).toBe(true);expect(ordinary[key]).toBe(retained);
 }
});

test('a phase-only stale fault invalidates a prepared physical projection while tick and every other World value remain unchanged',()=>{
 const w=declaredFixture();expect(w.schemaVersion).toBe(298);
 for(let n=0;n<7;n++){const before=effectiveCore297(w);expect(advanceWorldCore297(w).core).toBe(before+1);}
 expect(w.phaseCore297).toBe(7);
 const plan=roofCollapseProjection256(w).finish();expect(plan.current()).toBe(true);
 const tick=w.tick,withoutPhase=JSON.stringify({...w,phaseCore297:0});
 // Explicit diagnostic stale-frontier fault, NOT another played Core or a
 // save admitted under the altered frontier. All other fields stay literal.
 w.phaseCore297=8;
 expect(w.tick).toBe(tick);expect(JSON.stringify({...w,phaseCore297:0})).toBe(withoutPhase);
 const afterFault=JSON.stringify(w);expect(plan.current()).toBe(false);expect(plan.adopt()).toBe(false);expect(JSON.stringify(w)).toBe(afterFault);
});
