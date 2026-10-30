import {expect,test} from 'vitest';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {animalNavigation,createAnimalNavigationReader} from '../src/sim/wildlife-navigation.ts';
import {advanceWorldCore297} from '../src/sim/engine.ts';
import {effectiveCore297,effectiveLocal297} from '../src/sim/core-phase-297.ts';
import {newDoorState,doorMotionTicks,doorOpenness} from '../src/sim/door-rules.ts';
import type {Structure} from '../src/sim/types.ts';

/** Declared valid fixture family and its actual Labrador original. Only the
 * timed door specimen is prepared; five real Core steps advance it, no macro,
 * supplied fake World.tick, training grant or route-choice RNG. */
function scene(){
 const f=animalHaulingCamp459(),w=f.world,a=f.animal,target={x:13,z:12};
 const door:Structure={id:w.nextId++,kind:'door',material:'wood',...target,orientation:0,footprint:'standard',door:newDoorState(w.tick)};
 const duration=doorMotionTicks(door);
 Object.assign(door.door!,{open:true,from:1-.5/duration,changedAt:0,closeAt:11.5});
 w.structures.push(door);
 const reader=createAnimalNavigationReader(w,undefined,()=>undefined,()=>effectiveLocal297(w));
 return {...f,target,door,reader,nav:reader(a),legacy:animalNavigation(w)};
}
function through(s:ReturnType<typeof scene>,core:number){
 while(effectiveCore297(s.world)<core){const before=effectiveCore297(s.world);expect(advanceWorldCore297(s.world).core).toBe(before+1);}
 expect(s.world.tick).toBe(0);expect(effectiveCore297(s.world)).toBe(core);
}

test('one retained physical navigation sees opening finish at Core5 while the legacy macro timestamp is still zero',()=>{
 const s=scene(),rng=s.world.rng,nextId=s.world.nextId;
 through(s,4);expect(doorOpenness(s.door,effectiveLocal297(s.world))).toBeLessThan(1);
 expect(s.nav.step(s.animal,s.target)).toBe(false);expect(s.nav.free(s.target)).toBe(false);
 expect(s.nav.route(s.animal,[s.target])).toBeUndefined();
 through(s,5);expect(doorOpenness(s.door,effectiveLocal297(s.world))).toBe(1);
 expect(s.reader(s.animal)).toBe(s.nav);expect(s.nav.step(s.animal,s.target)).toBe(true);expect(s.nav.free(s.target)).toBe(true);
 expect(s.nav.route(s.animal,[s.target])).toEqual([s.target]);
 expect(s.legacy.step(s.animal,s.target)).toBe(false);
 expect(s.world.rng).toBe(rng);expect(s.world.nextId).toBe(nextId);
});

test('forbidden and closing policy remain live on the captured actual door and its diagonal frame remains solid',()=>{
 const s=scene();through(s,5);expect(s.nav.step(s.animal,s.target)).toBe(true);
 s.door.door!.forbidden=true;expect(s.nav.step(s.animal,s.target)).toBe(false);
 s.door.door!.forbidden=false;expect(s.nav.step(s.animal,s.target)).toBe(true);
 expect(s.nav.step(s.animal,{x:13,z:13})).toBe(false); // door frame at the side cell
 Object.assign(s.door.door!,{open:false,from:1,changedAt:effectiveLocal297(s.world),closeAt:null});
 expect(s.nav.step(s.animal,s.target)).toBe(false);expect(s.nav.free(s.target)).toBe(false);
});

test('haul point traversal uses that same completed physical opening and keeps forbidden and closing guards',()=>{
 const s=scene();through(s,4);expect(s.nav.haulStep(s.animal,s.target)).toBe(false);
 through(s,5);expect(s.nav.haulStep(s.animal,s.target)).toBe(true);
 s.door.door!.forbidden=true;expect(s.nav.haulStep(s.animal,s.target)).toBe(false);
 s.door.door!.forbidden=false;
 Object.assign(s.door.door!,{open:false,from:1,changedAt:effectiveLocal297(s.world),closeAt:null});
 expect(s.nav.haulStep(s.animal,s.target)).toBe(false);
});
