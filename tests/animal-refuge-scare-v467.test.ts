import {expect,test} from 'vitest';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {initialWorldRegistry,registeredMapId} from '../src/sim/world-map-context.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {medicalCivilTick271} from '../src/sim/suspended-human-clock-271.ts';
import {animalNavigation,moveAnimal} from '../src/sim/wildlife-navigation.ts';
import {animalEscape} from '../src/sim/wildlife-flight.ts';
import {scareAnimal} from '../src/sim/wildlife-health.ts';
import {reconcileWildlife} from '../src/sim/wildlife.ts';

// Existing constructor-born Labrador and finite20wood. The prospective refuge,
// serious dossier and inventory holding below are declared transition preparation,
// not played acquisition of sickness/transport. The real scare producer and
// actual escape planner run; no engine clock or captured edge is rewritten.
test('real scare admission retires refuge before a later reconciliation can erase the new flee route',()=>{
 const {world:w,animal:a,woodId}=animalHaulingCamp459();initialWorldRegistry(w);
 a.health=createAnimalMedicalRecord256(w,a);a.health.heatstroke=350_000_000;
 const h=a.health,before=structuredClone(h),civil=medicalCivilTick271(h),age=a.ageTicks,rng=w.rng,faunaRng=w.wildlife!.rng;
 const wood=w.piles.find(p=>p.id===woodId)!;wood.owner={type:'inventory',pawnId:a.id};const owner=wood.owner;
 const holding={phase:'holding' as const,carryPileId:wood.id,sinceCore:w.tick*10};a.haul=holding;
 a.animalThermalRefuge288={mapId:registeredMapId(w)!,target:{x:a.x+2,z:a.z},phase:'travel',startedAtCore:w.tick*10};
 a.path=[{x:a.x+1,z:a.z},{x:a.x+2,z:a.z}];const nav=animalNavigation(w);
 expect(moveAnimal(w,a,nav.step,1,nav.geometry)).toBe(true);const edge=a.motion!;expect(edge.end).toBeGreaterThan(w.tick);
 scareAnimal(w,a,{x:edge.from.x-2,z:edge.from.z},w.tick*10);
 expect(a.animalThermalRefuge288).toBeUndefined();expect(a.flee).toBeDefined();expect(a.path).toEqual([]);expect(a.motion).toBe(edge);
 expect(a.health).toBe(h);expect(h).toEqual(before);expect(medicalCivilTick271(h)).toBe(civil);expect(a.ageTicks).toBe(age);expect(w.rng).toBe(rng);expect(w.wildlife!.rng).toBe(faunaRng);
 expect(w.piles.find(p=>p.id===woodId)).toBe(wood);expect(wood.owner).toBe(owner);expect(a.haul).toBe(holding);
 // The new danger owner prepares its real future escape; reconciliation must
 // not mistake that route for the thermal job that scare already terminated.
 const escape=animalEscape(w,a,animalNavigation(w));expect(escape?.length).toBeGreaterThan(0);a.path=escape!;
 const flee=a.flee;reconcileWildlife(w);
 expect(a.flee).toBe(flee);expect(a.path).toBe(escape);expect(a.motion).toBe(edge);expect(a.animalThermalRefuge288).toBeUndefined();
 expect(a.health).toBe(h);expect(h).toEqual(before);expect(a.ageTicks).toBe(age);expect(medicalCivilTick271(h)).toBe(civil);expect(wood.owner).toBe(owner);expect(a.haul).toBe(holding);expect(w.rng).toBe(rng);expect(w.wildlife!.rng).toBe(faunaRng);
});
