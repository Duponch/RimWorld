import {test,expect} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {applyCommand,advanceWorldCore297} from '../src/sim/engine.ts';
import {serializeWorld,validateWorld} from '../src/sim/serialization.ts';
function moving(){const w=deconstructionCamp(1,32),p=w.pawns[0]!;Object.assign(p,{x:3,z:5,hunger:70,rest:80,needCooldown:20});p.schedule.fill('anything');p.recreation.level=100;
 expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);
 expect(applyCommand(w,{type:'draft-move',pawnIds:[p.id],target:{x:12,z:5},queue:false}).ok).toBe(true);
 advanceWorldCore297(w);expect(p.motion?.from).toEqual({x:3,z:5});expect(p.moveCooldown).toBeGreaterThan(0);expect(validateWorld(w)).toEqual([]);return {w,p};}
test('single GoHere on the actually occupied source keeps the existing order and consumes no played time or random draw',()=>{
 const {w,p}=moving(),before=serializeWorld(w),from={...p.motion!.from};
 expect(applyCommand(w,{type:'draft-move',pawnIds:[p.id],target:from,queue:false})).toMatchObject({ok:true});
 expect(serializeWorld(w)).toBe(before);expect(p.draft!.target).toEqual({x:12,z:5});
});
test('the future endpoint is still a valid destination and retains the already paid step',()=>{
 const {w,p}=moving(),before=structuredClone(p.motion),to={...p.motion!.to};
 expect(applyCommand(w,{type:'draft-move',pawnIds:[p.id],target:to,queue:false})).toMatchObject({ok:true});
 expect(p.motion).toEqual(before);expect(p.draft!.target).toEqual(to);expect(p.path).toEqual([]);
});
