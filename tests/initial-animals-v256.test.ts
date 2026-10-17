import {test,expect} from 'vitest';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {INITIAL_ANIMAL_FACTS_256 as F} from '../src/sim/initial-animal-data-256.ts';
import {drawInitialAnimalAgeFraction256,initialAnimalStage256,drawInitialAnimalClinicalFrontier256} from '../src/sim/initial-animal-age-256.ts';
import {constructInitialWildAnimal256} from '../src/sim/initial-animal-constructor-256.ts';
import {initialAnimalTargetWeight256,selectInitialAnimalTicket256} from '../src/sim/initial-animals-256.ts';
import {actualAnimalBiologicalCoreAge256,validAnimalAgeCoreRemainder256,actualAnimalClinicalBirthCore256,validExactAnimalClinicalAge256} from '../src/sim/initial-animal-age-owner-256.ts';
/** Explicit endpoint sequence for control-flow oracles, NOT a Core seed
 * comparison. Actual composed generation remains ROOT's separate control. */
class Endpoints extends WorldGenerationRandom {
 calls:string[]=[];constructor(){super(0);}
 override value(){this.calls.push('value');return 1;}
 override float(min:number,_max:number){this.calls.push('float');return Math.fround(min);}
 override integer(min:number,_max:number){this.calls.push('integer');return min;}
}
test('age trapezoids consume two draws and retain the actual lower boundary',()=>{
 const r=new Endpoints();expect(drawInitialAnimalAgeFraction256(r)).toBe(Math.fround(.05));expect(r.calls).toEqual(['float','float']);
});
test('constructor runs Food Food Rest Rest before sex, then real post-age initialization without history',()=>{
 class NeedTrace extends Endpoints {ranges:[number,number][]=[];override float(min:number,max:number){this.ranges.push([min,max]);return super.float(min,max);}}
 const r=new NeedTrace(),result=constructInitialWildAnimal256({fact:F.Hare,id:700,cell:{x:8,z:9},tick:0,random:r,unspawnedAnimals:[]});
 expect(result.status).toBe('ready');if(result.status!=='ready')throw Error('Expected represented healthy lower-bound Hare');
 expect(r.calls).toEqual(['value','float','float','float','float','value','float','float','value','integer','float','float','value']);
 expect(r.ranges.slice(0,4)).toEqual([[.5,.9],[.5,.9],[.9,1],[.9,1]]);expect(r.ranges.slice(-2)).toEqual([[.5,.9],[.9,1]]);
 expect(result.animal.sex).toBe('female');expect(result.animal.ageTicks*10+result.animal.ageCoreRemainder).toBe(result.ageCoreTicks);expect(result.ageCoreTicks).toBe(1440000);
 expect(result.animal.food).toBeCloseTo(.1,7);expect(result.animal.rest).toBe(Math.fround(.9));expect(result.animal.caravanCarrySick).toBe(false);
 expect(result.animal.health).toBeUndefined();expect(result.animal.flight).toBeUndefined();expect(result.animal.exitFlight).toBeUndefined();expect(result.animal.path).toEqual([]);
});
test('default Adult development stage does not force a biological adult: actual Lynx lower tail is juvenile',()=>{
 const result=constructInitialWildAnimal256({fact:F.Lynx,id:701,cell:{x:8,z:9},tick:0,random:new Endpoints(),unspawnedAnimals:[]});
 expect(result.status).toBe('ready');if(result.status!=='ready')throw Error('Expected represented healthy lower-tail Lynx');
 expect(result.ageCoreTicks).toBeLessThan(1800000);expect(initialAnimalStage256(F.Lynx,result.ageCoreTicks).bodySizeFactor).toBe(.5);expect(result.animal.food).toBeCloseTo(.225,7);expect(result.growth).toBeCloseTo(.9,6);expect(result.nextGrowthCheckCore).toBe(240);
});
test('IEnumerable selection keeps zero-weight endpoint draws and never removes Cobra weight',()=>{
 const rows=[{fact:F.Hare,commonality:1,weight:1},{fact:F.Cobra,commonality:1,weight:0}];let calls=0;
 expect(selectInitialAnimalTicket256(rows,{float:(_min,max)=>{calls++;return max;}})?.fact.defId).toBe('Cobra');expect(calls).toBe(1);
 expect(selectInitialAnimalTicket256([{fact:F.Cobra,commonality:2,weight:2}],{float:()=>{throw Error('single positive has no draw');}})?.fact.defId).toBe('Cobra');
 const r=new Endpoints();expect(constructInitialWildAnimal256({fact:F.Cobra,id:701,cell:{x:8,z:9},tick:0,random:r,unspawnedAnimals:[]}).status).toBe('blocked');expect(r.calls).toEqual([]);
});
test('density is computed from the actual seasonal share, with native empty 0/0 kept transient',()=>{
 expect(initialAnimalTargetWeight256(62500,2,5,10)).toEqual({density:1,weight:6.25});expect(initialAnimalTargetWeight256(62500,2,0,10)).toEqual({density:0,weight:0});
 const empty=initialAnimalTargetWeight256(62500,0,0,0);expect(Number.isNaN(empty.density)).toBe(true);expect(Number.isNaN(empty.weight)).toBe(true);
});
test('unrepresented legacy scar/giver branches refuse at selection rather than retrying healthy',()=>{
 let calls=0;const scar=drawInitialAnimalClinicalFrontier256(F.Hare,3*3600000,{value:()=>{calls++;return 0;},float:()=>{throw Error('unexpected');},integer:()=>{throw Error('unexpected');}});
 expect(scar).toEqual({status:'blocked',branch:'old-age-injury-generation',scarCount:2,reason:'legacy-anatomy'});expect(calls).toBe(2);
 calls=0;const birthday=drawInitialAnimalClinicalFrontier256(F.Hare,3*3600000,{value:()=>++calls<=2?1:0,float:()=>{throw Error('unexpected');},integer:()=>{throw Error('unexpected');}});
 expect(birthday).toEqual({status:'blocked',branch:'birthday-giver',defId:'Asthma',year:1});expect(calls).toBe(10);
 const r=new Endpoints();expect(drawInitialAnimalClinicalFrontier256(F.Hare,3*3600000,r)).toEqual({status:'represented-healthy'});expect(r.calls).toHaveLength(20);
});
test('exact age remainder joins integer clinical anchors, death and held clocks without mutation',()=>{
 const a={ageTicks:30,ageCoreRemainder:7},record={tick:18,animalBirthTick:-10},before=JSON.stringify([a,record]);
 expect(actualAnimalBiologicalCoreAge256(a)).toBe(307);expect(actualAnimalClinicalBirthCore256(record,a)).toBe(-107);expect(validExactAnimalClinicalAge256(record,a,20)).toBe(true);
 expect(validExactAnimalClinicalAge256(record,{...a,ageTicks:31},21)).toBe(true);expect(validExactAnimalClinicalAge256({...record,tick:20,death:{tick:20}},a,90)).toBe(true);
 expect(validExactAnimalClinicalAge256({...record,animalBirthTick:-11},a,20)).toBe(false);expect(JSON.stringify([a,record])).toBe(before);
});
test('remainder future fields are strict data and the initial growth epsilon uses real Core age',()=>{
 expect(validAnimalAgeCoreRemainder256({ageTicks:0,ageCoreRemainder:0},255)).toBe(false);expect(validAnimalAgeCoreRemainder256({ageTicks:0,ageCoreRemainder:9},256)).toBe(true);
 for(const value of [undefined,-1,10,.5])expect(validAnimalAgeCoreRemainder256({ageTicks:0,ageCoreRemainder:value},256)).toBe(false);
 let calls=0;const accessor=Object.defineProperty({},'ageCoreRemainder',{enumerable:true,get(){calls++;return 0;}});expect(validAnimalAgeCoreRemainder256(accessor,256)).toBe(false);expect(calls).toBe(0);
 expect(validAnimalAgeCoreRemainder256(Object.defineProperty({},'ageCoreRemainder',{value:0}),256)).toBe(false);
 // minAge=.2222: old floor-local threshold would still be juvenile here.
 expect(initialAnimalStage256(F.Hare,799919).bodySizeFactor).toBe(1);expect(Math.floor(799919/10)).toBeLessThan(79992);
});
