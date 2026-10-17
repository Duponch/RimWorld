import {expect,test} from 'vitest';
import {registryCamp} from './helpers/world-maps-v255.ts';
import {detachMapOwners} from '../src/sim/world-lost-owners.ts';
import {validLostArchiveShape,validateLostArchives} from '../src/sim/world-lost-save.ts';
import {injurePawn,healthRandom} from '../src/sim/health.ts';
import {damageRetainedHumanBody256} from '../src/sim/human-corpses.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {adultAgeTicks} from '../src/sim/animal-life.ts';
import {addResolvedInjury} from '../src/sim/injury-state.ts';
import {commitAnimalImpact} from '../src/sim/wildlife-health.ts';
import {damageRetainedAnimalBody256} from '../src/sim/corpses.ts';
import {enableWildlife} from '../src/sim/wildlife.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';

test('a real retained human body freezes its original HP/clinical record in a compact256 owner',()=>{
 const w=registryCamp();Object.assign(w,{schemaVersion:256});const pawn=w.pawns[0]!;
 injurePawn(w,pawn,'brain','crush',99000);expect(damageRetainedHumanBody256(w,pawn,20)).toBe(true);
 const clinical=JSON.stringify(pawn.health),age=JSON.stringify(pawn.age),a=detachMapOwners(w,0,w.planet!.homeTile),original=a.humans.find(h=>h.id===pawn.id)!;
 expect(original.pawn).toBe(pawn);expect(original.pawn?.body?.damage).toBe(20);
 expect(validLostArchiveShape(a,w.tick,w.nextId,256,w)).toBe(true);expect(validLostArchiveShape(a,w.tick,w.nextId,255,w)).toBe(false);
 w.worldGroups!.abandonedContents.push(a);expect(validateLostArchives(w,new Map(),new Set())).toEqual([]);
 expect(JSON.stringify(pawn.health)).toBe(clinical);expect(JSON.stringify(pawn.age)).toBe(age);expect(original.pawn?.body?.pileId).toBeUndefined();
});

test('declared actual turkey owner preserves comp progress and real clinical birth/retained corpse HP, never a local lay task',()=>{
 const w=registryCamp();Object.assign(w,{schemaVersion:256});enableWildlife(w,1);expect(w.wildlife).toBeDefined();
 const a:WildAnimal={id:w.nextId++,species:'turkey',sex:'female',x:15,z:15,food:.1,rest:1,state:'idle',path:[],nextDecision:w.tick,ageTicks:adultAgeTicks('turkey'),eggLayer:{progress:.25,fertilizations:0}};
 w.wildlife!.animals=[a];const record=createAnimalMedicalRecord256(w,a),random={rng:w.rng};
 addResolvedInjury(record,'brain','crush',99000,()=>healthRandom(random));commitAnimalImpact(w,a,record,random);
 expect(a.state).toBe('dead');expect(damageRetainedAnimalBody256(w,a,20)).toBe(true);
 const archive=detachMapOwners(w,0,w.planet!.homeTile),before=JSON.stringify(a);
 expect(validLostArchiveShape(archive,w.tick,w.nextId,256,w)).toBe(true);expect(JSON.stringify(a)).toBe(before);
 expect(validLostArchiveShape(archive,w.tick,w.nextId,255,w)).toBe(false);
 const wrong=structuredClone(archive),health=wrong.animals[0]!.animal.health!;health.animalBirthTick=(health.animalBirthTick??0)+1;
 expect(validLostArchiveShape(wrong,w.tick,w.nextId,256,w)).toBe(false);
 const local=structuredClone(archive);Object.assign(local.animals[0]!.animal,{eggLay:{target:{x:15,z:15},progress:1}});
 expect(validLostArchiveShape(local,w.tick,w.nextId,256,w)).toBe(false);
});

test('literal255 remains admitted; future own undefined and getters are refused before owner readers',()=>{
 const w=registryCamp(),archive=detachMapOwners(w,0,w.planet!.homeTile);
 expect(validLostArchiveShape(archive,w.tick,w.nextId,255,w)).toBe(true);
 const future=structuredClone(archive);Object.assign(future.humans[0]!.pawn!,{body:{observedAt:w.tick,rot:{progress:0,atTick:w.tick},damage:undefined}});
 expect(validLostArchiveShape(future,w.tick,w.nextId,255,w)).toBe(false);
 let reads=0;const getter=structuredClone(archive);Object.defineProperty(getter.humans[0]!.pawn!,'body',{enumerable:true,get(){reads++;throw Error('getter');}});
 expect(validLostArchiveShape(getter,w.tick,w.nextId,256,w)).toBe(false);expect(reads).toBe(0);
});
