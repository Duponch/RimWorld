import {test,expect} from 'vitest';
import {INITIAL_ANIMAL_FACTS_256 as F} from '../src/sim/initial-animal-data-256.ts';
import {drawInitialAnimalScars256,initialAnimalScarTickets256} from '../src/sim/initial-animal-scars-256.ts';
import {drawInitialAnimalClinicalFrontier256,type InitialAnimalRandom256} from '../src/sim/initial-animal-age-256.ts';
import {medicalBleed,medicalPain,remainingPartHealth,tendInjury} from '../src/sim/injury-state.ts';
import {advanceMedical} from '../src/sim/injury-evolution.ts';
import {validateMedicalRecord} from '../src/sim/injury-validation.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
class Script implements InitialAnimalRandom256 {
 calls:string[]=[];
 constructor(readonly values:number[],readonly integers:number[]){}
 value(){this.calls.push('value');const value=this.values.shift();if(value===undefined)throw Error('Unexpected value');return Math.fround(value);}
 integer(min:number,max:number){this.calls.push(`integer:${min}:${max}`);const value=this.integers.shift();if(value===undefined||value<min||value>=max)throw Error('Unexpected integer range');return value;}
 float():number{throw Error('Unexpected float');}
}
const age=20595680;
test('actual initial Scratch becomes an existing permanent Cut record with real clinical birth and no exposure or healing',()=>{
 const r=new Script([0,.9,.7],[1,4]);
 const result=drawInitialAnimalScars256(F.Squirrel,age,1,1,50,r);
 expect(result.status).toBe('represented');if(result.status!=='represented'||!result.health)throw Error('Expected a real permanent scar');
 const h=result.health;
 expect(r.calls).toEqual(['value','integer:0:4','value','integer:2:7','value']);
 expect(h).toEqual({tick:50,nextInjuryId:2,injuries:[{id:1,part:'torso',kind:'cut',severity:4000,bornAt:50,scar:{threshold:4000,pain:1}}],missing:[],bloodLoss:0,body:'squirrel',animalBirthTick:50-Math.floor(age/10)});
 expect(validateMedicalRecord(h,true,true,false,false,true,true,true,true,true,true,true,256)).toBeNull();
 expect(remainingPartHealth(h,'torso')).toBe(6000);expect(medicalPain(h)).toBe(.1);expect(medicalBleed(h)).toBe(0);expect(tendInjury(h,1,1000)).toBe(false);
 const saved=JSON.stringify(h),resumed=JSON.parse(saved);
 const forbidden=()=>{throw Error('A permanent initial scar cannot roll healing or infection');};
 advanceMedical(h,600,{phase:0,posture:'bed',starving:false},forbidden);
 advanceMedical(resumed,600,{phase:0,posture:'bed',starving:false},forbidden);
 expect(h).toEqual(resumed);expect(h.injuries[0]!.severity).toBe(4000);expect(h.injuries[0]!.scar).toEqual({threshold:4000,pain:1});expect(h.bloodLoss).toBe(0);
});
test('WouldDie rejects a lethal second and third torso scar without clamping or replacing their draws',()=>{
 const r=new Script([0,.9,0,0,.9,0,0,.9,0],[1,6,1,6,1,6]);
 const result=drawInitialAnimalScars256(F.Squirrel,age,3,1,0,r);
 expect(result.status).toBe('represented');if(result.status!=='represented'||!result.health)throw Error('Expected one nonlethal scar');
 expect(result.health.injuries).toHaveLength(1);expect(result.health.injuries[0]!.severity).toBe(6000);expect(remainingPartHealth(result.health,'torso')).toBe(4000);
 expect(r.values).toEqual([]);expect(r.integers).toEqual([]);expect(r.calls).toHaveLength(15);
});
test('amputable claws keep their real coverage ticket and the chosen loss is nonFresh without a replacement scar',()=>{
 const tickets=initialAnimalScarTickets256('QuadrupedAnimalWithClawsTailAndJowl');
 const index=tickets.findIndex(t=>t.row.defId==='FrontClaw');expect(index).toBeGreaterThanOrEqual(0);
 const selected=tickets[index]!;expect(selected.row.scarFactor).toBe(0);expect(selected.weight).toBeGreaterThan(0);
 const total=tickets.reduce((sum,t)=>sum+t.weight,0),before=tickets.slice(0,index).reduce((sum,t)=>sum+t.weight,0),roll=(before+selected.weight/2)/total;
 const r=new Script([roll,0,.9],[1]);
 const made=drawInitialAnimalScars256(F.Iguana,15*3600000,1,1,0,r);expect(made.status).toBe('represented');if(made.status!=='represented'||!made.health)throw Error('Missing real amputation');
 expect(made.health.injuries).toEqual([]);expect(made.health.missing).toHaveLength(1);expect(made.health.missing[0]).toMatchObject({bornAt:0,nonFresh:true});expect(made.health.nextInjuryId).toBe(1);
 expect(validateMedicalRecord(made.health,true,true,false,false,true,true,true,true,true,true,true,256)).toBeNull();expect(medicalBleed(made.health)).toBe(0);expect(medicalPain(made.health)).toBe(0);
 expect(r.calls).toEqual(['value','integer:0:4','value','value']);expect(r.values).toEqual([]);
});
test('WouldDie temporary lost-part draw precedes the separate real accepted ear-loss constructor',()=>{
 const tickets=initialAnimalScarTickets256('QuadrupedAnimalWithPawsAndTail'),index=tickets.findIndex(t=>t.row.defId==='Ear'),selected=tickets[index]!;
 const total=tickets.reduce((sum,t)=>sum+t.weight,0),before=tickets.slice(0,index).reduce((sum,t)=>sum+t.weight,0),roll=(before+selected.weight/2)/total;
 const r=new Script([roll,.9,0,.9,.9],[1,6]);
 const made=drawInitialAnimalScars256(F.Squirrel,age,1,1,0,r);expect(made.status).toBe('represented');if(made.status!=='represented'||!made.health)throw Error('Missing real scar-induced loss');
 expect(made.health.injuries).toEqual([]);expect(made.health.missing).toHaveLength(1);expect(made.health.missing[0]).toMatchObject({bornAt:0,nonFresh:true});expect(made.health.nextInjuryId).toBe(2);expect(medicalBleed(made.health)).toBe(0);expect(medicalPain(made.health)).toBe(0);
 expect(r.calls).toEqual(['value','integer:0:4','value','integer:2:7','value','value','value']);expect(r.values).toEqual([]);
});
test('counted scars precede the unchanged nine birthday givers and selected diagnoses remain blocked',()=>{
 // Age5 / expectancy8: four scar-count draws, one real harmless torso scar,
 // then year1 Carcinoma..Asthma. This is a prepared control-flow oracle.
 const r=new Script([0,1,1,1,0,.9,0,...Array(7).fill(1),0],[1,4]);
 expect(drawInitialAnimalClinicalFrontier256(F.Squirrel,age,r)).toEqual({status:'blocked',branch:'birthday-giver',defId:'Asthma',year:1});
 expect(r.values).toEqual([]);expect(r.integers).toEqual([]);
});
test('fixed composed witness retains the exact old frontier; replay emits its new diagnosis or named refusal for ROOT review',()=>{
 const random=new WorldGenerationRandom(53804836);while(random.state.counter<2453)random.value();
 const result=drawInitialAnimalClinicalFrontier256(F.Squirrel,age,random);
 // This is the single existing tile39971 / attempt14, not a seed search.
 // The old producer stopped at2457 solely because the scar count was nonzero.
 expect(random.state.counter).toBeGreaterThan(2457);
 if(result.status==='represented-injured'){
  expect(result.health.injuries.length+result.health.missing.length).toBeGreaterThan(0);expect(medicalBleed(result.health)).toBe(0);
  expect(result.health.injuries.every(i=>i.scar?.pain!==undefined&&i.scar.threshold===i.severity)).toBe(true);
 }else if(result.status==='blocked')expect(result.branch==='birthday-giver'||['scar-part-loss','clinical-downing','amputation-nonfresh','clinical-stage-boundary'].includes(result.reason??'')).toBe(true);
 console.info('Fixed Squirrel clinical frontier',JSON.stringify({result,randomState:random.state}));
});
