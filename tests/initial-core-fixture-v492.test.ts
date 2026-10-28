import {expect,test} from 'vitest';
import {createWorld} from '../src/sim/index';
import {initializeDeclaredFixtureTick297,declareUnplayedFixture296} from './scenarios/initial-core-clock-v492';
import {validCoreMoveHistoricalTransport297} from '../src/sim/core-move-save-297';
test('only an unplayed untouched297 fixture may initialize a different initial civil clock',()=>{
 const w=createWorld(42,32,32),rng=w.rng;initializeDeclaredFixtureTick297(w,3000);
 expect(w.corePathBudget297).toEqual({tick:3000,remaining:8,pairs:32768});expect(w.rng).toBe(rng);expect(w.phaseCore297).toBe(0);
 expect(()=>initializeDeclaredFixtureTick297(w,4000)).toThrow(/unplayed/);
});
test('fixture helpers never refill a spent owner or downgrade a nonzero played phase',()=>{
 const spent=createWorld(42,32,32);spent.corePathBudget297!.remaining=7;const raw=JSON.stringify(spent);
 expect(()=>initializeDeclaredFixtureTick297(spent,3000)).toThrow(/untouched/);expect(()=>declareUnplayedFixture296(spent)).toThrow(/untouched/);expect(JSON.stringify(spent)).toBe(raw);
 const phase=createWorld(42,32,32);phase.phaseCore297=7;const at7=JSON.stringify(phase);
 expect(()=>declareUnplayedFixture296(phase)).toThrow(/unplayed/);expect(JSON.stringify(phase)).toBe(at7);
});
test('a declared unplayed296 fixture contains no prospective owner or motion metadata',()=>{
 const w=createWorld(42,32,32),rng=w.rng;declareUnplayedFixture296(w);
 expect(Number(w.schemaVersion)).toBe(296);expect(Object.hasOwn(w,'phaseCore297')).toBe(false);expect(Object.hasOwn(w,'corePathBudget297')).toBe(false);
 expect(validCoreMoveHistoricalTransport297(w,296)).toBe(true);expect(w.rng).toBe(rng);
});
