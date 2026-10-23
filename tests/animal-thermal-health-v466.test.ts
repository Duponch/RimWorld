import {expect,test} from 'vitest';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {constructFreshInitialWildAnimal256} from '../src/sim/initial-animal-constructor-256.ts';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {enableWildlife} from '../src/sim/wildlife.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {applyAnimalThermal466,animalThermalProfile466} from '../src/sim/animal-thermal-v466.ts';
import {advanceAnimalHealth,reconcileAnimalHealth} from '../src/sim/wildlife-health.ts';
import {HEAT_UNIT,nextHeatSeverity} from '../src/sim/heat-severity.ts';
import {nextColdSeverity} from '../src/sim/cold-rules.ts';
import {reconcileMedicalDeath} from '../src/sim/injury-state.ts';
import {medicalCivilTick271} from '../src/sim/suspended-human-clock-271.ts';
import {animalCarrier} from '../src/sim/animal-rest-state.ts';
import {advanceCorpses} from '../src/sim/corpses.ts';
import {validAnimalDeathExplosionOwner256} from '../src/sim/animal-death-provenance-v256.ts';
import {startAnimalManhunter} from '../src/sim/animal-manhunter.ts';
import type {World} from '../src/sim/types.ts';

// Controlled kernel/health fixtures, not played acquisition or a native test.
// The existing actual fresh Labrador/boom constructors own each species;
// thermal severity and stress frontiers are declared before the property.
function ordinary(){const f=animalHaulingCamp459();return {...f,w:f.world,a:f.animal};}
function explosive(species:'boomalope'|'boomrat'='boomalope',lethal=true){
 const w=deconstructionCamp(1,32);w.tick=100;
 const random=new WorldGenerationRandom(w.seed),made=constructFreshInitialWildAnimal256({fact:INITIAL_ANIMAL_FACTS_256[species==='boomalope'?'Boomalope':'Boomrat'],id:w.nextId,cell:{x:10,z:10},tick:w.tick,random});
 if(made.status!=='ready')throw Error('Declared explosive construction blocked without retry: '+made.reason);
 const a=made.animal;w.nextId++;enableWildlife(w,0);w.wildlife!.animals.push(a);
 a.health??=createAnimalMedicalRecord256(w,a);if(lethal)a.health.heatstroke=HEAT_UNIT-1;
 a.stagger={sinceCore:w.tick*10-1,untilCore:w.tick*10};a.sleepUntilCore=w.tick*10;
 return {w,a,hot:animalThermalProfile466(a)!.max+30};
}

test('comfortable local opportunity leaves the actual healthy animal without a dossier or RNG draw',()=>{
 const {w,a}=ordinary(),before=structuredClone(a),rng=w.rng,range=animalThermalProfile466(a)!;
 expect(applyAnimalThermal466(w,a,undefined,{temperature:(range.min+range.max)/2,mapHeld:true})).toBeUndefined();
 advanceAnimalHealth(w,a,{temperature:(range.min+range.max)/2,mapHeld:true});
 expect(a).toEqual(before);expect(Object.hasOwn(a,'health')).toBe(false);expect(w.rng).toBe(rng);
});

test('the first real dose constructs only a current animal dossier and ordinary flushes never redose it',()=>{
 const {w,a}=ordinary(),rng=w.rng,range=animalThermalProfile466(a)!,temperature=range.max+30;
 advanceAnimalHealth(w,a,{temperature,mapHeld:true});const h=a.health!;
 expect(h.body).toBe(a.species);expect(h.tick).toBe(w.tick);expect(medicalCivilTick271(h)).toBe(w.tick);
 expect(h.animalBirthTick).toBe(w.tick-a.ageTicks);expect(h.heatstroke).toBe(nextHeatSeverity(0,temperature,range.max));
 for(let n=0;n<3;n++)advanceAnimalHealth(w,a);
 expect(a.health).toBe(h);expect(h.heatstroke).toBe(nextHeatSeverity(0,temperature,range.max));expect(w.rng).toBe(rng);
});

test('a medical flush already at the current frontier does not erase the sole later thermal opportunity',()=>{
 const {w,a}=ordinary(),range=animalThermalProfile466(a)!,temperature=range.max+20;
 a.health=createAnimalMedicalRecord256(w,a);const h=a.health;
 advanceAnimalHealth(w,a);expect(h.tick).toBe(w.tick);expect(h.heatstroke).toBeUndefined();
 advanceAnimalHealth(w,a,{temperature,mapHeld:true});
 expect(a.health).toBe(h);expect(h.heatstroke).toBe(nextHeatSeverity(0,temperature,range.max));
 advanceAnimalHealth(w,a);expect(h.heatstroke).toBe(nextHeatSeverity(0,temperature,range.max));
});

test('a delayed clinical flush pays exactly one current thermal dose rather than replaying the new air',()=>{
 const {w,a}=ordinary(),range=animalThermalProfile466(a)!,temperature=range.max+40;
 a.health=createAnimalMedicalRecord256(w,a);const h=a.health;w.tick+=30;a.ageTicks+=30;
 advanceAnimalHealth(w,a,{temperature,mapHeld:true});
 expect(a.health).toBe(h);expect(h.tick).toBe(w.tick);expect(h.heatstroke).toBe(nextHeatSeverity(0,temperature,range.max));
 expect(h.animalBirthTick).toBe(w.tick-a.ageTicks);
});

test('cold death precedes Heat recovery on the same current clinical outcome',()=>{
 const {w,a}=ordinary(),range=animalThermalProfile466(a)!;
 a.health=createAnimalMedicalRecord256(w,a);const h=a.health;h.hypothermia=HEAT_UNIT-1;h.heatstroke=400_000_000;
 const result=applyAnimalThermal466(w,a,h,{temperature:range.min-100,mapHeld:true});
 expect(result).toBe(h);expect(h.death).toEqual({tick:w.tick,cause:'hypothermia'});
 expect(h.heatstroke).toBe(400_000_000);reconcileAnimalHealth(w,a);expect(a.state).toBe('dead');
});

test('ordinary cold and Heat recover on the same original at a comfortable real opportunity',()=>{
 const {w,a}=ordinary(),range=animalThermalProfile466(a)!;
 a.health=createAnimalMedicalRecord256(w,a);const h=a.health;h.hypothermia=50_000_000;h.heatstroke=50_000_000;
 const air=(range.min+range.max)/2,rng=w.rng;
 advanceAnimalHealth(w,a,{temperature:air,mapHeld:true});
 expect(a.health).toBe(h);expect(h.hypothermia).toBe(nextColdSeverity(50_000_000,air,range.min));
 expect(h.heatstroke).toBe(nextHeatSeverity(50_000_000,air,range.max));expect(w.rng).toBe(rng);
});

test('a truly rescue-carried patient remains map-held and gains cold without off-map decay',()=>{
 const {w,a,handler,spotId}=ordinary(),range=animalThermalProfile466(a)!;
 a.health=createAnimalMedicalRecord256(w,a);const h=a.health;h.hypothermia=10_000_000;
 handler.animalRescue={animalId:a.id,spotId,phase:'carry'};expect(animalCarrier(w,a.id)).toBe(handler);
 const temperature=range.min-20;
 advanceAnimalHealth(w,a,{temperature,mapHeld:true});
 expect(a.health).toBe(h);expect(h.hypothermia).toBe(nextColdSeverity(10_000_000,temperature,range.min));
 expect(h.hypothermia).not.toBe(nextColdSeverity(10_000_000,temperature,range.min,true));
 expect(w.wildlife!.animals.includes(a)).toBe(true);expect(handler.animalRescue?.animalId).toBe(a.id);
});

test('an adopted civil frontier after suspension is kept distinct from the active clinical age',()=>{
 const {w,a}=ordinary();a.health=createAnimalMedicalRecord256(w,a);const h=a.health,clinical=h.tick,birth=h.animalBirthTick;
 w.tick+=500;h.civilTick271=w.tick;const range=animalThermalProfile466(a)!;
 advanceAnimalHealth(w,a,{temperature:range.max+30,mapHeld:true});
 expect(a.health).toBe(h);expect(h.tick).toBe(clinical);expect(h.civilTick271).toBe(w.tick);expect(h.animalBirthTick).toBe(birth);
 expect(h.heatstroke).toBe(nextHeatSeverity(0,range.max+30,range.max));
});

test('historical287 predecessors and a dead dossier receive no new local thermal mutation',()=>{
 const {w,a}=ordinary(),range=animalThermalProfile466(a)!;a.health=createAnimalMedicalRecord256(w,a);const h=a.health;
 const before=structuredClone(h);expect(applyAnimalThermal466({...w,schemaVersion:286 as World['schemaVersion']},a,h,{temperature:range.max+100,mapHeld:true})).toBe(h);expect(h).toEqual(before);
 h.heatstroke=HEAT_UNIT;reconcileMedicalDeath(h);const dead=structuredClone(h);
 expect(applyAnimalThermal466(w,a,h,{temperature:range.min-100,mapHeld:true})).toBe(h);expect(h).toEqual(dead);
});

test('unrepresented extreme-air burn remains a declared omission rather than a general refusal or extra damage',()=>{
 const {w,a}=ordinary(),range=animalThermalProfile466(a)!,rng=w.rng;
 expect(()=>advanceAnimalHealth(w,a,{temperature:range.max+200,mapHeld:true})).not.toThrow();
 expect(a.health!.heatstroke).toBe(nextHeatSeverity(0,range.max+200,range.max));expect(a.health!.injuries).toEqual([]);expect(w.rng).toBe(rng);
});

for(const species of ['boomalope','boomrat'] as const)test(species+' thermal death reserves exactly one real wave and preserves corpse provenance',()=>{
 const {w,a,hot}=explosive(species),rng=w.rng;
 advanceAnimalHealth(w,a,{temperature:hot,mapHeld:true});
 expect(a.state).toBe('dead');expect(a.health!.death).toEqual({tick:w.tick,cause:'heatstroke'});expect(w.bombWaves).toHaveLength(1);
 const wave=w.bombWaves![0]!;expect(wave.sourceId).toBe(a.id);expect(validAnimalDeathExplosionOwner256(w,wave)).toBe(true);
 expect(a.stagger).toBeUndefined();expect(a.sleepUntilCore).toBeUndefined();expect(w.rng).toBe(rng);
 advanceAnimalHealth(w,a);expect(w.bombWaves).toHaveLength(1);
 advanceCorpses(w);expect(w.piles.find(p=>p.id===a.id)?.corpse?.health.death).toEqual({tick:w.tick,cause:'heatstroke'});
 expect(validAnimalDeathExplosionOwner256(w,wave)).toBe(true);
});

test('a new thermal death on an unfinished physical edge detonates at its occupied origin and retains the same falling body',()=>{
 const {w,a,hot}=explosive(),edge={from:{x:10,z:10},to:{x:11,z:10},start:w.tick-1,end:w.tick+2};
 Object.assign(a,{x:11,z:10,state:'moving',motion:edge,path:[{x:12,z:10}]});
 advanceAnimalHealth(w,a,{temperature:hot,mapHeld:true});
 expect(a.state).toBe('dead');expect(a.motion).toBe(edge);expect(a.path).toEqual([]);
 expect(w.bombWaves).toHaveLength(1);expect(w.bombWaves![0]!.center).toEqual(edge.from);
 advanceCorpses(w);expect(w.wildlife!.animals.includes(a)).toBe(true);expect(w.piles.some(p=>p.id===a.id)).toBe(false);
 w.tick=edge.end;advanceCorpses(w);
 expect(w.piles.find(p=>p.id===a.id)?.owner).toEqual({type:'ground',...edge.to});
 expect(validAnimalDeathExplosionOwner256(w,w.bombWaves![0]!)).toBe(true);
});

test('new explosive thermal capacity refusal retains the whole actor, expired timers, intentions, dossier and RNG',()=>{
 const {w,a,hot}=explosive();a.path=[{x:11,z:10}];a.state='moving';w.nextId=Number.MAX_SAFE_INTEGER;
 const before=structuredClone(w),health=a.health,stagger=a.stagger,path=a.path;
 expect(()=>advanceAnimalHealth(w,a,{temperature:hot,mapHeld:true})).toThrow('Cannot reserve animal death explosion');
 expect(w).toEqual(before);expect(a.health).toBe(health);expect(a.stagger).toBe(stagger);expect(a.path).toBe(path);
});

test('full wave storage also refuses the new lethal dose before expired timers or clinical state are adopted',()=>{
 const {w,a,hot}=explosive();
 // Capacity-only stress setup; these inert slots are not claimed to be a
 // serializable gameplay wave history or an acquired native battlefield.
 w.bombWaves=Array.from({length:w.width*w.height},()=>({})) as NonNullable<World['bombWaves']>;
 const before=structuredClone(w),health=a.health,stagger=a.stagger;
 expect(()=>advanceAnimalHealth(w,a,{temperature:hot,mapHeld:true})).toThrow('Cannot reserve animal death explosion');
 expect(w).toEqual(before);expect(a.health).toBe(health);expect(a.stagger).toBe(stagger);
});

test('a successful nonlethal explosive dose preserves the original nested owners and spends no explosion identity',()=>{
 const {w,a,hot}=explosive();a.health!.heatstroke=1;
 a.domestic={since:w.tick,care:'herbal',tameness:5,nextDecay:w.tick+6000};a.wander!.job={kind:'wait',untilCore:w.tick*10+100};
 const domestic=a.domestic,wander=a.wander,job=a.wander!.job,nextId=w.nextId,rng=w.rng;
 advanceAnimalHealth(w,a,{temperature:hot,mapHeld:true});
 expect(a.domestic).toBe(domestic);expect(a.wander).toBe(wander);expect(a.wander!.job).toBe(job);
 expect(a.health!.heatstroke).toBe(nextHeatSeverity(1,hot,animalThermalProfile466(a)!.max));
 expect(w.nextId).toBe(nextId);expect(w.rng).toBe(rng);expect(w.bombWaves).toBeUndefined();
});

test('toxic explosive refusal includes its private terminal draw and intentions in the same unchanged transaction',()=>{
 const {w,a,hot}=explosive();a.health!.toxicBuildup={severity:Math.fround(.01),bornAt:a.health!.tick};
 a.wander!.job={kind:'wait',untilCore:w.tick*10+100};w.nextId=Number.MAX_SAFE_INTEGER;
 const before=structuredClone(w),health=a.health,wander=a.wander;
 expect(()=>advanceAnimalHealth(w,a,{temperature:hot,mapHeld:true})).toThrow('Cannot reserve animal death explosion');
 expect(w).toEqual(before);expect(a.health).toBe(health);expect(a.wander).toBe(wander);
});

test('the earlier independent scaria frontier remains committed when the subsequent thermal death transaction refuses',()=>{
 const {w,a,hot}=explosive('boomalope',false);
 expect(startAnimalManhunter(w,a,w.tick*10,true)).toBe(true);
 a.health!.scaria261={manhunterCore:-999999};a.health!.heatstroke=HEAT_UNIT-1;
 a.sleepUntilCore=w.tick*10;w.nextId=Number.MAX_SAFE_INTEGER;
 const health=a.health,scaria=a.health!.scaria261,manhunter=a.manhunter,stagger=a.stagger,expected=structuredClone(w);
 expected.wildlife!.animals.find(p=>p.id===a.id)!.health!.scaria261!.manhunterCore=w.tick*10;
 expect(()=>advanceAnimalHealth(w,a,{temperature:hot,mapHeld:true})).toThrow('Cannot reserve animal death explosion');
 // advanceAnimalScaria261 is an earlier genuine producer, not part of the
 // new thermal transaction. Only its own real marker change survives.
 expect(w).toEqual(expected);expect(a.health).toBe(health);expect(a.health!.scaria261).toBe(scaria);
 expect(scaria.manhunterCore).toBe(w.tick*10);expect(a.manhunter).toBe(manhunter);expect(a.stagger).toBe(stagger);
 expect(a.sleepUntilCore).toBe(w.tick*10);expect(a.health!.heatstroke).toBe(HEAT_UNIT-1);expect(a.health!.death).toBeUndefined();
});

test('a carried explosive thermal death creates no immediate or delayed explosion at deposit',()=>{
 const {w,a,hot}=explosive();w.pawns[0]!.animalRescue={animalId:a.id,spotId:1,phase:'carry'};
 advanceAnimalHealth(w,a,{temperature:hot,mapHeld:true});expect(a.state).toBe('dead');expect(w.bombWaves).toBeUndefined();
 delete w.pawns[0]!.animalRescue;advanceAnimalHealth(w,a);advanceCorpses(w);expect(w.bombWaves).toBeUndefined();
});
