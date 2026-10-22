import {expect,test} from 'vitest';
import {HUMAN_YEAR_TICKS} from '../src/sim/human-age.ts';
import {coupleBiologicalYears285,coupleAdult285,coupleIndividualFactor285,coupleMtbHours285,coupleHourlyChance285,coupleDurationCore285,coupleCooldownMeanHours285,coupleCooldownCore285,type CoupleMtbPerson285} from '../src/sim/couple-rules-285.ts';
import type {NativeHumanIdentity256} from '../src/sim/native-human-identity-256.ts';

const native=(remainder:number):NativeHumanIdentity256=>({revision:1,gender:'None',name:{first:'Aube',nick:'',last:'',nickSet:false},biologicalCoreRemainder:remainder});
const person=(changes:Partial<CoupleMtbPerson285>={}):CoupleMtbPerson285=>({ageYears:22,pain:0,consciousness:1,opinion:0,attraction:1,...changes});

test('adult admission uses the actual biological owner and native Core remainder, never a missing-age or chronological fallback',()=>{
 expect(coupleBiologicalYears285({})).toBeUndefined();expect(coupleAdult285({})).toBe(false);
 const before={age:{biologicalTicks:18*HUMAN_YEAR_TICKS-1},nativeHuman:native(9)},adult={age:{biologicalTicks:18*HUMAN_YEAR_TICKS},nativeHuman:native(0)};
 expect(coupleBiologicalYears285(before)).toBeCloseTo(18-1/(HUMAN_YEAR_TICKS*10),12);expect(coupleAdult285(before)).toBe(false);expect(coupleAdult285(adult)).toBe(true);
 expect(coupleAdult285({age:{biologicalTicks:17*HUMAN_YEAR_TICKS}})).toBe(false);expect(coupleAdult285({age:{biologicalTicks:18*HUMAN_YEAR_TICKS}})).toBe(true);
 expect(coupleAdult285({age:{biologicalTicks:60*HUMAN_YEAR_TICKS},nativeHuman:native(10)})).toBe(false);
 expect(coupleBiologicalYears285({age:{biologicalTicks:Number.MAX_SAFE_INTEGER}})).toBeUndefined();
 const olderCalendar={age:{biologicalTicks:17*HUMAN_YEAR_TICKS,chronologicalTicks:100*HUMAN_YEAR_TICKS}};
 expect(coupleAdult285(olderCalendar)).toBe(false);
 const snapshot=JSON.stringify([before,adult,olderCalendar]);coupleBiologicalYears285(before);coupleAdult285(adult);expect(JSON.stringify([before,adult,olderCalendar])).toBe(snapshot);
});

test('the primary age hill plateaus16–25 and declines25–80, with pain and low consciousness independently slowing frequency',()=>{
 expect(coupleIndividualFactor285(14,0,1)).toBe(Infinity);expect(coupleIndividualFactor285(15,0,1)).toBe(2);
 for(const years of [16,18,22,25])expect(coupleIndividualFactor285(years,0,1)).toBe(1);
 expect(coupleIndividualFactor285(52.5,0,1)).toBeCloseTo(1/.6,12);expect(coupleIndividualFactor285(80,0,1)).toBe(5);expect(coupleIndividualFactor285(100,0,1)).toBe(5);
 expect(coupleIndividualFactor285(22,.5,.25)).toBe(4);expect(coupleIndividualFactor285(22,0,.5)).toBe(1);
 expect(coupleIndividualFactor285(22,1,1)).toBe(Infinity);expect(coupleIndividualFactor285(22,0,0)).toBe(Infinity);
 for(const args of [[22,-.1,1],[22,1.1,1],[22,0,-.1],[NaN,0,1]] as const)expect(coupleIndividualFactor285(args[0],args[1],args[2])).toBeUndefined();
});

test('MTB keeps both explicit opinions and attractions, requires two adults and leaves health admission to the actual owner',()=>{
 expect(coupleMtbHours285(person(),person())).toBe(12);
 expect(coupleMtbHours285(person({opinion:100}),person({opinion:100}))).toBeCloseTo(5.88,12);
 expect(coupleMtbHours285(person({opinion:-100}),person({opinion:-100}))).toBeCloseTo(20.28,12);
 expect(coupleMtbHours285(person({attraction:0}),person({attraction:0}))).toBeCloseTo(1200,10);
 expect(coupleMtbHours285(person({pain:.5}),person({consciousness:.25}))).toBe(48);
 expect(coupleMtbHours285(person({ageYears:17.999}),person())).toBeUndefined();expect(coupleMtbHours285(person(),person({ageYears:17.999}))).toBeUndefined();
 expect(coupleMtbHours285(person({attraction:-1}),person())).toBeUndefined();expect(coupleMtbHours285(person(),person({opinion:101}))).toBeUndefined();
 const a=Object.freeze(person({pain:.2,opinion:23})),b=Object.freeze(person({ageYears:50,opinion:-17,attraction:.4}));
 expect(coupleMtbHours285(a,b)).toBeCloseTo(coupleMtbHours285(b,a)!,10);
});

test('the hourly chance is linear inverse MTB, bounded, and distinctly differs from an exponential event model',()=>{
 expect(coupleHourlyChance285(12)).toBe(1/12);expect(coupleHourlyChance285(2)).toBe(.5);expect(coupleHourlyChance285(.5)).toBe(1);
 expect(coupleHourlyChance285(2)).not.toBeCloseTo(1-Math.exp(-.5),5);
 expect(coupleHourlyChance285(Infinity)).toBe(0);for(const hours of [0,-1,NaN])expect(coupleHourlyChance285(hours)).toBe(0);
 expect(coupleHourlyChance285(100000)).toBe(.00001);
});

test('duration is a single supplied uniform draw truncated in Core ticks, without local tick rounding or a second draw',()=>{
 expect(coupleDurationCore285(0)).toBe(250);expect(coupleDurationCore285(.5)).toBe(1500);expect(coupleDurationCore285(1)).toBe(2750);
 expect(coupleDurationCore285(.0007)).toBe(251);expect(coupleDurationCore285(.999)).toBe(2747);
 for(const draw of [-.001,1.001,Infinity,NaN])expect(coupleDurationCore285(draw)).toBeUndefined();
});

test('each supplied normal sample produces the age cooldown independently from the hourly MTB, with a half-hour floor',()=>{
 for(const [years,mean] of [[18,1.5],[22,1.5],[26,2.75],[30,4],[40,8],[50,12],[62.5,24],[75,36],[100,36]] as const)expect(coupleCooldownMeanHours285(years)).toBe(mean);
 expect(coupleCooldownCore285(22,0)).toBe(3750);expect(coupleCooldownCore285(22,1)).toBe(4500);expect(coupleCooldownCore285(22,-10)).toBe(1250);
 expect(coupleCooldownCore285(30,.001)).toBe(10000);expect(coupleCooldownCore285(50,0)).toBe(30000);
 expect(coupleCooldownMeanHours285(17.999)).toBeUndefined();expect(coupleCooldownCore285(17,0)).toBeUndefined();expect(coupleCooldownCore285(22,NaN)).toBeUndefined();expect(coupleCooldownCore285(22,Number.MAX_VALUE)).toBeUndefined();
});
