import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {advanceWorldCore297} from '../src/sim/engine.ts';
import {effectiveCore297} from '../src/sim/core-phase-297.ts';
import {disturbanceEvents} from '../src/sim/disturbance.ts';
import {validDisturbance} from '../src/sim/disturbance-state.ts';
import {validateWorld,serializeWorld,deserializeWorld} from '../src/sim/serialization.ts';
test('a genuine phase7 impact owns its full sleep-blocking horizon and roundtrips without a civil-clock refusal',()=>{
 const w=deconstructionCamp(1,32),p=w.pawns[0]!;p.needCooldown=20;
 for(let n=0;n<7;n++)advanceWorldCore297(w);expect(w.tick).toBe(0);expect(w.phaseCore297).toBe(7);
 disturbanceEvents(w).impact({x:p.x,z:p.z},effectiveCore297(w));
 expect(p.disturbance?.sleepUntilCore).toBe(1007);expect(validDisturbance(p.disturbance,297,w.tick,7)).toBe(true);
 expect(validDisturbance(p.disturbance,296,w.tick)).toBe(false);expect(validDisturbance(p.disturbance,297,w.tick)).toBe(false);expect(validDisturbance(p.disturbance,297,w.tick,17)).toBe(false);
 expect(validateWorld(w)).toEqual([]);const raw=serializeWorld(w),loaded=deserializeWorld(raw);expect(serializeWorld(loaded)).toBe(raw);expect(loaded.pawns[0]!.disturbance).toEqual(p.disturbance);
});
