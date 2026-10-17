import {preparedSchema256} from './helpers/legacy-fixture-guards.ts';
import {expect,test} from 'vitest';
import {huntingCamp} from './scenarios/hunting';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256.ts';
import {constructAnimalMind256} from '../src/sim/animal-condition-mental-state-256.ts';
import {tryStartAnimalConfusionLocal256,advanceAnimalConfusion256} from '../src/sim/animal-condition-mental-runtime-256.ts';
import {animalNavigation,moveAnimal} from '../src/sim/wildlife-navigation.ts';
import {validateWildlife} from '../src/sim/wildlife-save.ts';
import {groupPawnInterval256} from '../src/sim/group-core-cadence-256.ts';
test('prepared actual original admits and recovers confusion on the same unfinished physical edge with valid RAW',()=>{
 const w=huntingCamp();preparedSchema256(w);const a=w.wildlife!.animals[0]!;
 // Align this explicitly prepared clock before the real edge is made.
 // One legitimate ten-Core interval crosses the actual hash30; no played time is advanced.
 const preparedTick=[w.tick,w.tick+1,w.tick+2].find(t=>groupPawnInterval256(a.id,t*10,30,10));if(preparedTick===undefined)throw Error('Missing actual hash frontier');w.tick=preparedTick;
 delete a.health;a.state='idle';a.food=.2;
 if(!a.growthTracker)attachGeneratedAnimalGrowth256(a,w.tick*10,256);
 if(!a.wander)constructAnimalMind256(a,256);
 const nav=animalNavigation(w),next=[{x:a.x+1,z:a.z},{x:a.x-1,z:a.z},{x:a.x,z:a.z+1},{x:a.x,z:a.z-1}].find(c=>nav.free(c)&&nav.step(a,c))!;
 expect(next).toBeDefined();a.path=[next];expect(moveAnimal(w,a,nav.step)).toBe(true);
 const edge=a.motion!,position={x:a.x,z:a.z};expect(edge.end).toBeGreaterThan(w.tick);
 expect(validateWildlife(w,256,new Set())).toEqual([]);
 expect(tryStartAnimalConfusionLocal256(w,a,w.tick*10)).toBe(true);
 expect(a.state).toBe('moving');expect(a.motion).toBe(edge);expect({x:a.x,z:a.z}).toEqual(position);expect(a.path).toEqual([]);
 expect(validateWildlife(w,256,new Set())).toEqual([]);
 // Prepared near-maximum episode; this invokes the real recovery branch,
 // with one actual mental interval and no extra World/age/position clock.
 a.confusion!.ageCore=119970;
 advanceAnimalConfusion256(a,w.tick*10,10,{value:()=>{throw Error('maximum recovery must not draw');},integer:()=>{throw Error('unexpected draw');},float:()=>{throw Error('unexpected draw');}},true);
 expect(a.confusion).toBeUndefined();expect(a.state).toBe('moving');expect(a.motion).toBe(edge);expect({x:a.x,z:a.z}).toEqual(position);expect(a.path).toEqual([]);
 expect(validateWildlife(w,256,new Set())).toEqual([]);
});
