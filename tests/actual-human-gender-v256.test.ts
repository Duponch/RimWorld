import {expect,test} from 'vitest';
import {drawActualHumanGender256,type ActualHumanGenderInputs256} from '../src/sim/actual-human-gender-256.ts';
import {drawActualAncientHumanBirth256} from '../src/sim/ancient-human-birth-256.ts';
const free:ActualHumanGenderInputs256={requestFixedGender:null,kindFixedGender:null,raceHasGenders:true,raceForceGender:'None'};
test('a present request None overrides kind and race without taking a gender draw',()=>{
 let calls=0;const random={value(){calls++;return .1;}};
 expect(drawActualHumanGender256({...free,requestFixedGender:'None',kindFixedGender:'Female',raceForceGender:'Male'},random)).toBe('None');
 expect(calls).toBe(0);
});
test('the real Kind override precedes race policy and preserves its explicit None',()=>{
 let calls=0;const random={value(){calls++;return .1;}};
 expect(drawActualHumanGender256({...free,kindFixedGender:'Female',raceHasGenders:false},random)).toBe('Female');
 expect(drawActualHumanGender256({...free,kindFixedGender:'None',raceForceGender:'Male'},random)).toBe('None');
 expect(calls).toBe(0);
});
test('a genderless race returns None before its force field, while the gendered force bypasses Rand',()=>{
 let calls=0;const random={value(){calls++;return .1;}};
 expect(drawActualHumanGender256({...free,raceHasGenders:false,raceForceGender:'Female'},random)).toBe('None');
 expect(drawActualHumanGender256({...free,raceForceGender:'Female'},random)).toBe('Female');expect(calls).toBe(0);
});
test('only the unforced gendered branch consumes one Value, with the strict float32 half boundary',()=>{
 let calls=0;
 expect(drawActualHumanGender256(free,{value(){calls++;return .25;}})).toBe('Male');
 expect(drawActualHumanGender256(free,{value(){calls++;return .5;}})).toBe('Female');
 expect(calls).toBe(2);
});
test('missing resolved request/race facts refuse before any draw',()=>{
 let calls=0;const random={value(){calls++;return 0;}};
 const {raceForceGender:removed,...partial}=free;expect(removed).toBe('None');
 expect(()=>drawActualHumanGender256(partial as ActualHumanGenderInputs256,random)).toThrow('explicit');
 expect(calls).toBe(0);
});
test('the AncientSoldier caller retains the one gender Value after both real component Rest draws and before age',()=>{
 const calls:string[]=[];
 const birth=drawActualAncientHumanBirth256(500,7200000,{
  float(a){calls.push(`float:${a}`);return a;},
  integer(a){calls.push('integer');return a;},
  value(){calls.push('value');return .5;}
 });
 expect(birth.gender).toBe('Female');expect(calls.slice(0,4)).toEqual(['float:0.9','float:0.9','value','float:0']);
});
