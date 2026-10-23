import {expect,test} from 'vitest';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {fixtureMechanoid} from './scenarios/mechanoid-combat-v213.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';

test('an actual helpful wave coats the same local animal and machine and their real local engine intervals expire900Core without advancing sparse mechanical health',()=>{
 const {world:w,animal,handler}=animalHaulingCamp459();handler.priorities.handle=0;
 // Declared initial quiet clinical scene, before emission. No coat, injury,
 // fuse, future clinical result or earned transport is supplied.
 const m=fixtureMechanoid(w,14,12),source={id:w.nextId++,kind:'firefoam-popper' as const,x:13,z:13,orientation:0 as const,footprint:'standard' as const,material:'steel' as const,firefoam290:{autoRebuild:false}};
 w.structures.push(source);expect(validateWorld(w)).toEqual([]);expect(damageStructure(w,source,50,'melee')).toBe(true);
 const acquired=new Map<number,number>();
 for(let n=0;n<10&&acquired.size<2;n++){
  stepWorld(w);
  for(const actor of [animal,m])if(actor.health?.coveredInFirefoam290&&!acquired.has(actor.id)){expect(actor.health.coveredInFirefoam290.remainingCore).toBe(900);acquired.set(actor.id,w.tick);}
 }
 expect(acquired.size).toBe(2);const sparseTick=m.health!.tick;
 expect(validateWorld(w)).toEqual([]);const raw=serializeWorld(w),copy=deserializeWorld(raw);expect(serializeWorld(copy)).toBe(raw);
 for(let n=0;n<90;n++){
  stepWorld(w);stepWorld(copy);
  for(const actor of [animal,m]){const remaining=900-(w.tick-acquired.get(actor.id)!)*10;if(remaining>0)expect(actor.health!.coveredInFirefoam290!.remainingCore).toBe(remaining);else expect(actor.health!.coveredInFirefoam290).toBeUndefined();}
 }
 expect(m.health!.tick).toBe(sparseTick);expect(validateWorld(w)).toEqual([]);expect(serializeWorld(copy)).toBe(serializeWorld(w));
});
