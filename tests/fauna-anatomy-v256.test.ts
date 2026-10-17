import {expect,test} from 'vitest';
import {animalBodyModel,medicalModel} from '../src/sim/body-model.ts';
import {assessBody,HEALTHY_BODY_INPUT} from '../src/sim/body-capacities.ts';
import {animalPartId256} from '../src/sim/animal-anatomy-v256.ts';
import {animalCore256,animalStageAgeTicks256,ANIMAL_SPECIES_IDS_256} from '../src/sim/animal-core-v256.ts';
import {createAnimalMedicalRecord256,validAnimalClinicalOwner256,advanceAnimalAges256} from '../src/sim/animal-clinical-age-v256.ts';
import {validateMedicalRecord} from '../src/sim/injury-validation.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {animalShape256} from '../src/render/animal-shape-v256';
import {animalVisualParts256} from '../src/render/animal-visual-parts-v256';
import {isAnimalSpeciesInVersion} from '../src/sim/animal-species.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';
const animal=(species:WildAnimal['species'],ageTicks=0):WildAnimal=>({id:1,species,sex:'female',ageTicks,x:2,z:2,food:.1,rest:1,state:'idle',path:[],nextDecision:1});
const medical=(value:unknown,version=256)=>validateMedicalRecord(value,true,true,false,false,true,true,true,true,true,true,true,version);

test('twelve actual trees: bird21, snake15, turtle21, monkey63; no four-leg surrogate',()=>{
 expect(animalBodyModel('duck').parts).toHaveLength(21);expect(animalBodyModel('cobra').parts).toHaveLength(15);
 expect(animalBodyModel('tortoise').parts).toHaveLength(21);expect(animalBodyModel('monkey').parts).toHaveLength(63);
 expect(animalBodyModel('cobra').parts.filter(p=>p.nativeDefId==='Leg')).toHaveLength(0);
 expect(animalBodyModel('duck').parts.filter(p=>p.nativeDefId==='Leg')).toHaveLength(2);
 expect(animalBodyModel('elephant').parts.some(p=>p.nativeDefId==='Trunk')).toBe(true);
 expect(animalBodyModel('wild-boar').parts.filter(p=>p.nativeDefId==='Tusk')).toHaveLength(2);
 expect(animalBodyModel('hare').byId.torso.hp).toBe(16);expect(animalBodyModel('hare',0)).toBe(animalBodyModel('hare'));
});

test('clinical health uses life-stage health factors, never body-size factor; corpse cannot grow',()=>{
 const a=animal('cobra',0),w={tick:100,schemaVersion:256};const h=createAnimalMedicalRecord256(w,a);
 expect(medicalModel(h).byId.brain.hp).toBe(2); // ceil10 ×(.5 health ×.25 baby), not ×.2 body
 h.tick=100+animalStageAgeTicks256('cobra','juvenile');expect(medicalModel(h).byId.brain.hp).toBe(3);
 const before=medicalModel(h);h.death={tick:h.tick,cause:'trauma'};
 h.tick+=animalStageAgeTicks256('cobra','adult');expect(medicalModel(h)).toBe(before);
 const rat=animalBodyModel('rat',0);expect(rat.byId.brain.hp).toBe(1);expect(animalBodyModel('rat').byId.brain.hp).toBe(3);
});

test('one real tick advances only new living owners; true clinical offset and frozen dead age are required',()=>{
 const a=animal('duck',20),old=animal('hare',30),dead=animal('duck',40);dead.state='dead';
 const owner={schemaVersion:255,tick:100,rng:1,wildlife:{animals:[a,old,dead]}};
 advanceAnimalAges256(owner);expect(a.ageTicks).toBe(20);
 owner.schemaVersion=256;advanceAnimalAges256(owner);expect([a.ageTicks,old.ageTicks,dead.ageTicks]).toEqual([21,30,40]);
 const h=createAnimalMedicalRecord256({tick:100,schemaVersion:256},a,99);
 expect(h.animalBirthTick).toBe(79);expect(validAnimalClinicalOwner256(h,a.species,a.ageTicks,100)).toBe(true);
 expect(validAnimalClinicalOwner256({...h,animalBirthTick:80},a.species,a.ageTicks,100)).toBe(false);
 const corpse={...h,death:{tick:99,cause:'trauma' as const}};
 expect(validAnimalClinicalOwner256(corpse,a.species,20,10000)).toBe(true);expect(validAnimalClinicalOwner256(corpse,a.species,21,10000)).toBe(false);
});

test('strict record admission: missing/future anchors, humans and malformed death reject without throwing',()=>{
 const h=createAnimalMedicalRecord256({tick:100,schemaVersion:256},animal('duck',30));
 expect(medical(h)).toBeNull();expect(medical(h,255)).not.toBeNull();
 const {animalBirthTick,...missing}=h;expect(medical(missing)).not.toBeNull();
 expect(validateMedicalRecord({...createMedicalRecord(100),animalBirthTick:0},true,true,true,true,false,false,true,true,true,true,true,256)).not.toBeNull();
 expect(medical({...h,death:{tick:'bad'}})).not.toBeNull();
 expect(isAnimalSpeciesInVersion('duck',255)).toBe(false);expect(isAnimalSpeciesInVersion('duck',256)).toBe(true);expect(isAnimalSpeciesInVersion('hare',76)).toBe(true);
});

test('capacity tags respect two real bird legs and loss of snake organs',()=>{
 const bird=animalBodyModel('duck'),legs=bird.parts.filter(p=>p.nativeDefId==='Leg');
 expect(assessBody(HEALTHY_BODY_INPUT,bird).capacities.moving).toBe(1);
 expect(assessBody({...HEALTHY_BODY_INPUT,missing:[legs[0]!.id]},bird).capacities.moving).toBe(.5);
 expect(assessBody({...HEALTHY_BODY_INPUT,missing:legs.map(p=>p.id)},bird).capacities.moving).toBe(0);
 const snake=animalBodyModel('cobra');expect(assessBody(HEALTHY_BODY_INPUT,snake).capacities.moving).toBe(1);
 expect(assessBody({...HEALTHY_BODY_INPUT,missing:['heart']},snake).vitalFailure).toBe(true);
 const monkey=animalBodyModel('monkey'),finger=monkey.parts.find(p=>p.nativeDefId==='Finger')!;
 expect(assessBody({...HEALTHY_BODY_INPUT,missing:[finger.id]},monkey).capacities.manipulation).toBeLessThan(1);
 expect(assessBody({...HEALTHY_BODY_INPUT,missing:[finger.id]},monkey).capacities.moving).toBe(1);
});

test('original shapes use actual anatomical identities; each species shares one bounded absence word',()=>{
 for(const id of ANIMAL_SPECIES_IDS_256){const model=animalBodyModel(id),shape=animalShape256(id),visual=animalVisualParts256(id)!;
  expect(shape.rings.length).toBeGreaterThanOrEqual(2);expect(visual.length).toBeLessThanOrEqual(23);expect(new Set(visual).size).toBe(visual.length);
  for(const part of shape.parts)expect(model.byId[part.bodyPart!],id+':'+part.bodyPart).toBeDefined();
  for(const ring of shape.rings)expect(model.byId[ring.part!],id+':'+ring.part).toBeDefined();
 }
 expect(animalPartId256(animalCore256('cobra').race.body,0)).toBe('torso');
});
