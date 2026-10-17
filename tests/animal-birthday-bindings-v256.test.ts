import {expect,test} from 'vitest';
import {constructAnimalMind256,validAnimalMindFields256,type ActualAnimalMind256} from '../src/sim/animal-condition-mental-state-256.ts';
import {advanceAnimalConfusionState256,advanceAnimalConfusion256} from '../src/sim/animal-condition-mental-runtime-256.ts';
import {caravanAnimalConditionFrontier256} from '../src/sim/animal-condition-medical-frontier-256.ts';
import {destroyAnimalConditionPart256} from '../src/sim/animal-condition-missing-part-256.ts';
import {animalConditionCareTargets256,animalConditionTreatmentBatch256,animalConditionMedicineCount256} from '../src/sim/animal-condition-care-256.ts';
import {tryApplyAnimalAgeCondition256} from '../src/sim/animal-birthday-application-256.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {attachActualAnimalGrowth256} from '../src/sim/animal-growth-runtime-256.ts';
import {groupPawnInterval256} from '../src/sim/group-core-cadence-256.ts';
import {advanceMedical} from '../src/sim/injury-evolution.ts';
import {validateMedicalRecord} from '../src/sim/injury-validation.ts';
import {medicalModel} from '../src/sim/body-model.ts';
import {animalCareTargets} from '../src/sim/animal-care.ts';
import {herdCareCamp} from './helpers/veterinary-v277.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import type {InitialAnimalRandom256} from '../src/sim/initial-animal-age-256.ts';
const random=(value=.99):InitialAnimalRandom256=>({value:()=>value,integer:(a,b)=>a+Math.floor(value*(b-a)),float:(a,b)=>b<=a?Math.fround(a):Math.fround(Math.fround(Math.fround(value)*Math.fround(b-a))+Math.fround(a))});
function original(tick=100):ActualAnimalMind256 {
 const a:ActualAnimalMind256={id:17,species:'wild-boar',sex:'female',ageTicks:600000,x:12,z:13,food:.2,rest:1,state:'idle',path:[],nextDecision:tick};
 attachActualAnimalGrowth256(a,{value:1,nextCheckCore:tick*10+240},256);constructAnimalMind256(a,256);return a;
}
test('new original has ctor false; JSON/load never reset it to Reset/default true',()=>{
 const a=original();expect(a.wander).toEqual({revision:1,nextMoveOrderIsWait:false});expect(()=>constructAnimalMind256(a,256)).toThrow();
 a.wander!.nextMoveOrderIsWait=true;const clone=JSON.parse(JSON.stringify(a));expect(validAnimalMindFields256(clone,256,100,32,32)).toBe(true);expect(clone).toEqual(a);
 expect(validAnimalMindFields256(clone,255,100,32,32)).toBe(false);
});
test('new own undefined, accessor and symbol fields are refused without executing a getter',()=>{
 const a=original(),base={...a};delete base.wander;let reads=0;
 expect(validAnimalMindFields256({...base,wander:undefined},256,100,32,32)).toBe(false);
 Object.defineProperty(base,'wander',{enumerable:true,get(){reads++;return a.wander;}});
 expect(validAnimalMindFields256(base,256,100,32,32)).toBe(false);expect(reads).toBe(0);
 const clone=JSON.parse(JSON.stringify(a));Object.defineProperty(clone.wander,Symbol('future'),{value:0});expect(validAnimalMindFields256(clone,256,100,32,32)).toBe(false);
});
test('mental age uses actual hash30, not elapsed wall time; max recovery makes no extra roll',()=>{
 const a=original(),core=Array.from({length:30},(_,i)=>1000+i).find(c=>groupPawnInterval256(a.id,c,30,1))!;
 let calls=0;const r={...random(),value:()=>{calls++;return .999;}};
 const c={revision:1 as const,ageCore:3480};expect(advanceAnimalConfusionState256(c,a.id,core,1,r)).toBe(false);expect(c.ageCore).toBe(3510);expect(calls).toBe(1);
 c.ageCore=119970;calls=0;expect(advanceAnimalConfusionState256(c,a.id,core,1,r)).toBe(true);expect(calls).toBe(0);
});
test('downing recovers real episode and stops local job while preserving original captured edge and bed',()=>{
 const a=original();a.confusion={revision:1,ageCore:30};a.wander!.job={kind:'goto',destination:{x:15,z:13}};a.path=[{x:15,z:13}];
 a.motion={from:{x:11,z:13},to:{x:12,z:13},start:99,end:102,speedFactor:1,terrainDelay:0};const edge=a.motion;
 a.mapBed={revision:1,bedId:50,mapId:0};a.state='downed';advanceAnimalConfusion256(a,1000,1,random(),true);
 expect(a.confusion).toBeUndefined();expect(a.path).toEqual([]);expect(a.wander!.job).toBeUndefined();expect(a.motion).toBe(edge);expect(a.mapBed).toEqual({revision:1,bedId:50,mapId:0});
});
test('Carcinoma removes true non-core Skull subtree without a wound or a fresh bleeding amputation',()=>{
 const a=original(),h=createAnimalMedicalRecord256({tick:100,schemaVersion:256},a),model=medicalModel(h);let draws=0;
 h.animalAgeConditions={revision:1,nextId:2,cases:[{id:1,kind:'Carcinoma',part:'skull',bornAt:100,ageCore:0,severity:1,noPain:false,growth:{mode:0,growingFactor:Math.fround(.45),remissionFactor:Math.fround(.7)},tend:{ticksLeft:-1,quality:0,totalQuality:0}}]};
 const subtree=model.parts.filter(p=>{for(let id:typeof p.id|null=p.id;id!==null;id=model.byId[id].parent)if(id==='skull')return true;return false;});
 expect(model.byId.skull.destroyable).toBe(false);expect(destroyAnimalConditionPart256(h,'skull',1000,{...random(),value:()=>{draws++;return .99;}})).toBe(true);
 expect(draws).toBe(subtree.length);expect(h.injuries).toEqual([]);expect(h.missing).toEqual([{part:'skull',bornAt:100,nonFresh:true}]);expect(h.animalAgeConditions!.cases).toEqual([]);
 expect(validateMedicalRecord(h,true,true,false,false,true,true,true,true,true,true,true,256)).toBeNull();
 expect(validateMedicalRecord(h,true,true,false,false,true,true,true,true,true,true,true,255)).not.toBeNull();
});
test('asthma tendAllAtOnce batches actual paired lungs into one real dose',()=>{
 const a=original(),h=createAnimalMedicalRecord256({tick:100,schemaVersion:256},a);tryApplyAnimalAgeCondition256(h,'Asthma',random());
 const targets=animalConditionCareTargets256(h);expect(targets).toHaveLength(2);expect(animalConditionTreatmentBatch256(h,targets,true)).toEqual(targets);expect(animalConditionMedicineCount256(h,targets)).toBe(1);
});
test('caravan clinical binding updates original condition and mental episode, then round-trips with no local job',()=>{
 const a=original(),tick=Array.from({length:6},(_,i)=>101+i).find(t=>Array.from({length:10},(_,i)=>(t-1)*10+i+1).some(c=>groupPawnInterval256(a.id,c,60,1)))!;
 const h=createAnimalMedicalRecord256({tick,schemaVersion:256},a,tick-1);a.health=h;tryApplyAnimalAgeCondition256(h,'Dementia',random());
 const frontier=caravanAnimalConditionFrontier256(a,h,()=>0)!;
 advanceMedical(h,1,{phase:a.id%60,posture:'standing',starving:false},()=>0,frontier);frontier.commit();
 expect(a.health).toBe(h);expect(a.confusion).toBeDefined();expect(a.wander!.job).toBeUndefined();expect(h.animalAgeConditions!.cases[0]!.ageCore).toBe(10);
 expect(validateMedicalRecord(h,true,true,false,false,true,true,true,true,true,true,true,256)).toBeNull();
 const clone=JSON.parse(JSON.stringify(a));expect(clone).toEqual(a);expect(validAnimalMindFields256(clone,256,tick,32,32,false)).toBe(true);
});
test('prepared veterinary camp traverses real pickup/contact, reloads actual carried medicine and tends both asthma lungs',()=>{
 const f=herdCareCamp(),w=f.world,a=w.wildlife!.animals[0]!;w.schemaVersion=256;
 delete a.health;attachActualAnimalGrowth256(a,{value:1,nextCheckCore:w.tick*10+240},256);constructAnimalMind256(a,256);a.health=createAnimalMedicalRecord256(w,a);tryApplyAnimalAgeCondition256(a.health,'Asthma',random());
 const units=(world:typeof w)=>world.piles.filter(p=>p.item==='medicine').reduce((n,p)=>n+p.quantity,0),initial=units(w);
 let current=w,reloaded=false,sawContact=false;
 for(let i=0;i<500;i++){
  stepWorld(current);const patient=current.wildlife!.animals.find(p=>p.id===f.animalId)!,doctor=current.pawns.find(p=>p.id===f.doctorId)!;
  if(doctor.animalCare?.phase==='treat'){expect(Math.abs(doctor.x-patient.x)+Math.abs(doctor.z-patient.z)).toBeLessThanOrEqual(1);expect((doctor.motion?.end??0)<=current.tick).toBe(true);sawContact=true;}
  if(!reloaded&&current.piles.some(p=>p.owner.type==='pawn'&&p.owner.pawnId===f.doctorId&&p.item==='medicine')){expect(validateWorld(current)).toEqual([]);const text=serializeWorld(current);current=deserializeWorld(text);expect(serializeWorld(current)).toBe(text);reloaded=true;}
  if(patient.health!.animalAgeConditions!.cases.every(c=>(c.tend?.ticksLeft??0)>0)&&!doctor.animalCare)break;
 }
 const patient=current.wildlife!.animals.find(p=>p.id===f.animalId)!;expect(reloaded).toBe(true);expect(sawContact).toBe(true);expect(animalCareTargets(patient)).toEqual([]);expect(units(current)).toBe(initial-1);expect(validateWorld(current)).toEqual([]);
});
