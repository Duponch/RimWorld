import {expect,test} from 'vitest';
import {INITIAL_ANIMAL_FACTS_256 as F} from '../src/sim/initial-animal-data-256';
import {drawInitialAnimalScars256,initialAnimalScarTickets256} from '../src/sim/initial-animal-scars-256';
import {attachGeneratedAnimalGrowth256} from '../src/sim/animal-growth-runtime-256';
import {nativeAnimalAnatomy256} from '../src/sim/native-animal-anatomy-256';
import {CORE_ANIMAL_BODIES_256} from '../src/sim/animal-anatomy-data-v256';
import {animalPartId256} from '../src/sim/animal-anatomy-v256';
import {medicalBleed,medicalPain,remainingPartHealth,partMissing,assessMedical} from '../src/sim/injury-state';
import {validateMedicalRecord} from '../src/sim/injury-validation';
import {advanceMedical} from '../src/sim/injury-evolution';
import type {InitialAnimalRandom256} from '../src/sim/initial-animal-age-256';
import type {WildAnimal} from '../src/sim/wildlife-state';
class Script implements InitialAnimalRandom256 {
 calls:string[]=[];constructor(readonly values:number[],readonly integers:number[]){}
 value(){this.calls.push('value');const v=this.values.shift();if(v===undefined)throw Error('Unplanned value');return Math.fround(v);}
 integer(min:number,max:number){this.calls.push(`integer:${min}:${max}`);const v=this.integers.shift();if(v===undefined||v<min||v>=max)throw Error('Unplanned integer');return v;}
 float():number{throw Error('Unplanned float');}
}
const owner=(core=7200000):WildAnimal=>{const a:WildAnimal={id:17,species:'hare',sex:'female',ageTicks:Math.floor(core/10),ageCoreRemainder:core%10,x:1,z:1,food:.1,rest:1,state:'idle',path:[],nextDecision:1};attachGeneratedAnimalGrowth256(a,0,256);return a;};
function selection(defId:string){const body=nativeAnimalAnatomy256('hare').body,tickets=initialAnimalScarTickets256(body),i=tickets.findIndex(t=>t.row.defId===defId);if(i<0)throw Error('Missing real part');const t=tickets[i]!,sum=tickets.reduce((s,t)=>s+t.weight,0),before=tickets.slice(0,i).reduce((s,t)=>s+t.weight,0);return {body,row:t.row,roll:(before+t.weight/2)/sum};}
const validate=(h:unknown,version=256)=>validateMedicalRecord(h,true,true,false,false,true,true,true,true,true,true,true,version);
test('the selected real native Hare ear is lost, not replaced by healthy/scar candidate, with exact duplicate constructor draws',()=>{
 const a=owner(),s=selection('Ear'),random=new Script([s.roll,.9,0,.9,.9],[1,6]),before=JSON.stringify(a);
 const made=drawInitialAnimalScars256(F.Hare,a.ageTicks*10,1,1,0,random,a);expect(made.status).toBe('represented');if(made.status!=='represented'||!made.health)throw Error('Actual Hare loss missing');const h=made.health,part=animalPartId256(s.body,s.row.index);
 expect(h.injuries).toEqual([]);expect(h.missing).toEqual([{part,bornAt:0,nonFresh:true}]);expect(h.nextInjuryId).toBe(2);expect(remainingPartHealth(h,part)).toBe(0);expect(medicalBleed(h)).toBe(0);expect(medicalPain(h)).toBe(0);expect(validate(h)).toBeNull();expect(validate(h,255)).not.toBeNull();expect(JSON.stringify(a)).toBe(before);
 expect(random.calls).toEqual(['value','integer:0:4','value','integer:2:7','value','value','value']);expect(random.values).toEqual([]);expect(random.integers).toEqual([]);
 const loaded=JSON.parse(JSON.stringify(h));advanceMedical(loaded,1,{phase:0,posture:'standing',starving:false},()=>{throw Error('A nonFresh loss cannot roll healing/infection');});expect(loaded.missing).toEqual(h.missing);expect(loaded.injuries).toEqual([]);expect(loaded.bloodLoss).toBe(0);
 const forged={...h,missing:[{part,bornAt:0,nonFresh:undefined}]};expect(validate(forged)).not.toBeNull();const historical={...h};delete historical.animalGrowth;delete historical.animalBirthTick;expect(validate(historical)).not.toBeNull();
});
test('accepted limb loss repeats root and descendant construction, persisting one ancestor with actual capacity reduction',()=>{
 const a=owner(1),s=selection('Leg'),rows=CORE_ANIMAL_BODIES_256[s.body],under=(i:number)=>{for(let n:number|null=i;n!==null;n=rows[n]!.parent)if(n===s.row.index)return true;return false;},subtree=rows.filter(r=>under(r.index));
 const random=new Script([s.roll,.9,0,...Array(subtree.length*2).fill(.9)],[1,6]),made=drawInitialAnimalScars256(F.Hare,1,1,.25,0,random,a);
 expect(made.status).toBe('represented');if(made.status!=='represented'||!made.health)throw Error('Actual limb loss missing');const h=made.health;
 expect(h.missing).toEqual([{part:animalPartId256(s.body,s.row.index),bornAt:0,nonFresh:true}]);expect(h.injuries).toEqual([]);for(const child of subtree)expect(partMissing(h,animalPartId256(s.body,child.index))).toBe(true);
 expect(assessMedical(h).capacities.moving).toBeLessThan(1);expect(assessMedical(h).vitalFailure).toBe(false);expect(validate(h)).toBeNull();expect(random.values).toEqual([]);expect(random.calls.filter(c=>c==='value')).toHaveLength(3+subtree.length*2);
});
test('lethal head-loss preview consumes its temporary constructors but commits no injury/loss and never rerolls',()=>{
 const a=owner(1),s=selection('Head'),rows=CORE_ANIMAL_BODIES_256[s.body],subtree=rows.filter(r=>{for(let p:number|null=r.index;p!==null;p=rows[p]!.parent)if(p===s.row.index)return true;return false;}),random=new Script([s.roll,.9,0,...Array(subtree.length).fill(.9)],[1,6]),before=JSON.stringify(a);
 expect(drawInitialAnimalScars256(F.Hare,1,1,.25,0,random,a)).toEqual({status:'represented'});expect(random.values).toEqual([]);expect(random.integers).toEqual([]);expect(random.calls.filter(c=>c==='value')).toHaveLength(3+subtree.length);expect(JSON.stringify(a)).toBe(before);
});
