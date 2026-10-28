import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {advanceWorldCore297} from '../src/sim/engine.ts';
import {startFirefoamWick290} from '../src/sim/firefoam-290.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {validateWorld,serializeWorld,deserializeWorld} from '../src/sim/serialization.ts';
import {validateFirefoamLocal290} from '../src/sim/firefoam-save-290.ts';
import type {Pawn,Structure} from '../src/sim/types.ts';
test('a genuine phase7 firefoam retirement keeps an unprocessed clinical birth until the next actual macro',()=>{
 const w=deconstructionCamp(1,32),p=w.pawns[0]!;p.needCooldown=20;p.recreation.level=100;
 for(const key of Object.keys(p.priorities)as(keyof Pawn['priorities'])[])p.priorities[key]=0;
 const source:Structure={id:w.nextId++,kind:'firefoam-popper',x:12,z:10,orientation:0,footprint:'standard',material:'steel',firefoam290:{autoRebuild:false}};w.structures.push(source);
 for(let n=0;n<7;n++)advanceWorldCore297(w);expect(w.phaseCore297).toBe(7);
 expect(startFirefoamWick290(w,source)).toBe(true);expect(source.firefoam290!.wick!.startedAtCore).toBe(7);expect(validateFirefoamLocal290(w)).toEqual([]);
 expect(damageStructure(w,source,100,'melee')).toBe(true);expect(w.structures).not.toContain(source);
 const wave=w.firefoam290!.waves[0]!;expect(wave).toMatchObject({startedAtCore:7,advancedAtCore:7,nextCell:0,affectedActorKeys:[]});expect(validateFirefoamLocal290(w)).toEqual([]);expect(validateWorld(w)).toEqual([]);
 const raw=serializeWorld(w),loaded=deserializeWorld(raw);expect(serializeWorld(loaded)).toBe(raw);
 const bad=structuredClone(w);bad.firefoam290!.waves[0]!.nextCell=1;expect(validateFirefoamLocal290(bad).length).toBeGreaterThan(0);
 const wrongReceipt=structuredClone(w);wrongReceipt.firefoam290!.waves[0]!.advancedAtCore=8;expect(validateFirefoamLocal290(wrongReceipt).length).toBeGreaterThan(0);
 for(let n=0;n<2;n++){advanceWorldCore297(w);advanceWorldCore297(loaded);expect(wave.nextCell).toBe(0);expect(wave.advancedAtCore).toBe(7);expect(validateFirefoamLocal290(w)).toEqual([]);}
 advanceWorldCore297(w);advanceWorldCore297(loaded);expect(w.phaseCore297).toBe(0);expect(w.tick).toBe(1);expect(wave.nextCell).toBeGreaterThan(0);expect(wave.advancedAtCore).toBe(10);expect(validateWorld(w)).toEqual([]);expect(serializeWorld(loaded)).toBe(serializeWorld(w));
});
