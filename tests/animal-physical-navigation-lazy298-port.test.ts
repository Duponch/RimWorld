import {expect,test} from 'vitest';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {animalNavigation,createAnimalNavigationReader} from '../src/sim/wildlife-navigation.ts';
import {effectiveLocal297} from '../src/sim/core-phase-297.ts';
import {addMaterial} from '../src/sim/materials.ts';

test('a real physical step reader does not scan pile standability while legacy captures it immediately',()=>{
 const {world,animal}=animalHaulingCamp459(),descriptor=Object.getOwnPropertyDescriptor(world,'piles')!;
 let reads=0;
 // Disposable ordinary fixture instrumentation only. No getter-bearing World
 // is passed to Engine, exported, validated or claimed as a campaign state.
 Object.defineProperty(world,'piles',{configurable:true,enumerable:true,get(){reads++;throw Error('Unused standability pile scan');}});
 try{
  const read=createAnimalNavigationReader(world,undefined,undefined,()=>effectiveLocal297(world)),nav=read(animal);
  expect(nav.step(animal,{x:13,z:12})).toBe(true);expect(nav.haulStep(animal,{x:13,z:12})).toBe(true);expect(reads).toBe(0);
  expect(()=>animalNavigation(world)).toThrow('Unused standability pile scan');expect(reads).toBe(1);
 }finally{Object.defineProperty(world,'piles',descriptor);}
});

test('the first real physical free query retains the legacy furniture chunk and corner permissions',()=>{
 const {world,animal}=animalHaulingCamp459();
 addMaterial(world,'chunk',1,{type:'ground',x:13,z:12},'granite-chunk');fixtureBuilding(world,'wall',15,12);
 const legacy=animalNavigation(world),physical=animalNavigation(world,false,false,undefined,false,undefined,undefined,()=>effectiveLocal297(world));
 for(const cell of [{x:12,z:12},{x:13,z:12},{x:8,z:19},{x:12,z:19},{x:15,z:12}])expect(physical.free(cell)).toBe(legacy.free(cell));
 expect(physical.free({x:12,z:12})).toBe(true);expect(physical.free({x:13,z:12})).toBe(false);expect(physical.free({x:15,z:12})).toBe(false);
 for(const [from,to]of [[animal,{x:13,z:12}],[{x:14,z:11},{x:15,z:12}],[{x:14,z:12},{x:15,z:13}]] as const)expect(physical.step(from,to)).toBe(legacy.step(from,to));
});
