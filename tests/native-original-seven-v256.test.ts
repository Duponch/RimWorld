import {describe,it,expect} from 'vitest';
import {LEGACY_ANIMAL_SPECIES_IDS} from '../src/sim/animal-species';
import {nativeAnimalAnatomy256} from '../src/sim/native-animal-anatomy-256';
import {CORE_ANIMAL_BODIES_256} from '../src/sim/animal-anatomy-data-v256';
import {animalPartId256} from '../src/sim/animal-anatomy-v256';
import {ANIMAL_BODY_MODELS,animalBodyModel,medicalModel} from '../src/sim/body-model';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256';
import {createAnimalMedicalRecord256,validAnimalClinicalOwner256} from '../src/sim/animal-clinical-age-v256';
import {validateMedicalRecord} from '../src/sim/injury-validation';
import {assessMedical} from '../src/sim/injury-state';
import {drawInitialAnimalScars256} from '../src/sim/initial-animal-scars-256';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256';
import {corpseVisualMask,corpseVisualPartBit} from '../src/render/corpse-presentation';
import type {WildAnimal} from '../src/sim/wildlife-state';
const validate=(h:unknown,v=256)=>validateMedicalRecord(h,true,true,false,false,true,true,true,true,true,true,true,v);
const original=(species:typeof LEGACY_ANIMAL_SPECIES_IDS[number]):WildAnimal=>{
 const a:WildAnimal={id:17,species,sex:'female',ageTicks:2000000,x:1,z:1,food:0,rest:1,state:'idle',path:[],nextDecision:501};
 attachGeneratedAnimalGrowth256(a,5000,256);return a;
};
/** Pure originals and visual records only, not a played World or generation campaign. */
describe('prospective native anatomy of the original seven species',()=>{
 it.each(LEGACY_ANIMAL_SPECIES_IDS)('%s uses true native records only when marked, leaving historical model and record literal',species=>{
  const historical=ANIMAL_BODY_MODELS[species],old=original(species);delete old.growthTracker;delete old.ageCoreRemainder;
  const oldRecord=createAnimalMedicalRecord256({tick:500,schemaVersion:255},old);
  expect(oldRecord).toEqual({tick:500,nextInjuryId:1,injuries:[],missing:[],bloodLoss:0,body:species});
  expect(animalBodyModel(species)).toBe(historical);expect(medicalModel(oldRecord)).toBe(historical);
  const a=original(species),h=createAnimalMedicalRecord256({tick:500,schemaVersion:256},a),native=medicalModel(h),fact=nativeAnimalAnatomy256(species),rows=CORE_ANIMAL_BODIES_256[fact.body];
  expect(native).not.toBe(historical);expect(native.parts.map(p=>p.nativeDefId)).toEqual(rows.map(r=>r.defId));
  expect(native.parts.map(p=>p.id)).toEqual(rows.map(r=>animalPartId256(fact.body,r.index)));
  expect(native.healthScale).toBe(Math.fround(fact.baseHealthScale));expect(validate(h)).toBeNull();
  expect(validAnimalClinicalOwner256(h,species,a.ageTicks,500)).toBe(true);expect(assessMedical(h).vitalFailure).toBe(false);
  expect(h.animalGrowth).toBe(1);expect(h.animalBirthTick).toBe(500-a.ageTicks);
  expect(animalBodyModel(species)).toBe(historical);expect(medicalModel(oldRecord)).toBe(historical);
  expect(validate(h,255)).not.toBeNull();
 });
 it('checks the exact prospective birth owner without offering anchors to an old record',()=>{
  const a=original('hare'),h=createAnimalMedicalRecord256({tick:500,schemaVersion:256},a);
  expect(validAnimalClinicalOwner256({...h,animalBirthTick:h.animalBirthTick!+1},a.species,a.ageTicks,500)).toBe(false);
  const missing={...h};delete missing.animalBirthTick;expect(validate(missing)).not.toBeNull();
  const old={...h};delete old.animalGrowth;expect(validate(old)).not.toBeNull();
 });
 it('maps the native original limb to the existing resident visual slot, without hiding healthy legs',()=>{
  const a=original('hare'),h=createAnimalMedicalRecord256({tick:500,schemaVersion:256},a),body=nativeAnimalAnatomy256(a.species).body;
  const leg=CORE_ANIMAL_BODIES_256[body].find(row=>row.defId==='Leg')!;
  const visual={animalId:a.id,species:a.species,sex:a.sex,ageTicks:a.ageTicks,health:h,growthTracker:a.growthTracker};
  const bit=corpseVisualPartBit('left-front-leg',a.species);expect(bit).toBeGreaterThan(0);expect(corpseVisualMask(visual)&bit).toBe(0);
  const missing={...visual,health:{...h,missing:[{part:animalPartId256(body,leg.index),bornAt:500}]}};
  expect(corpseVisualMask(missing)&bit).toBe(bit);expect(corpseVisualMask(visual)&bit).toBe(0);
 });
 it('creates the selected old-age scar on the real prospective hare, while unmarked calls retain their explicit refusal',()=>{
  const a=original('hare'),fact=INITIAL_ANIMAL_FACTS_256.Hare,values=[0,.9,0],integers=[1,3],before=JSON.stringify(a);
  const random={value:()=>Math.fround(values.shift()!),integer:(min:number,max:number)=>{const n=integers.shift()!;expect(n).toBeGreaterThanOrEqual(min);expect(n).toBeLessThan(max);return n;},float:():number=>{throw Error('Unexpected float');}};
  const made=drawInitialAnimalScars256(fact,a.ageTicks*10,1,1,500,random,a);
  expect(made.status).toBe('represented');if(made.status!=='represented'||!made.health)throw Error('Missing real native clinical record');
  expect(made.health.animalGrowth).toBe(1);expect(made.health.injuries[0]).toMatchObject({part:'torso',severity:3000,scar:{threshold:3000,pain:0}});
  expect(validate(made.health)).toBeNull();expect(values).toEqual([]);expect(integers).toEqual([]);expect(JSON.stringify(a)).toBe(before);
  expect(drawInitialAnimalScars256(fact,a.ageTicks*10,1,1,500,random)).toEqual({status:'blocked',reason:'legacy-anatomy'});
 });
});
