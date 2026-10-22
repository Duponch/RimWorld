import {expect,test} from 'vitest';
import {addCoupleMemory285,expireCoupleMemories285,coupleMoodThoughts285,coupleOpinionOffset285,validCoupleMemories285,validCoupleMemoryField285,
 COUPLE_MEMORY_DURATION_285 as D,COUPLE_MEMORY_LIMIT_285,type CoupleMemoryHolder285} from '../src/sim/couple-memories-285.ts';

const people={get:(id:number)=>({name:id===2||id===3?'Même nom':`Personne ${id}`})};

test('a factual finish adds separate events without renewing the original date or allocating another owner',()=>{
 const holder:CoupleMemoryHolder285={};addCoupleMemory285(holder,2,100);const first=holder.coupleMemories285![0]!;
 addCoupleMemory285(holder,2,200);
 expect(holder.coupleMemories285).toEqual([{otherId:2,at:100},{otherId:2,at:200}]);expect(holder.coupleMemories285![0]).toBe(first);
 expect(coupleMoodThoughts285(holder,200,people)[0]!.offset).toBeCloseTo(12.8);
 expect(coupleOpinionOffset285(holder,2,200)).toBe(10);
});

test('mood and opinion group by actual partnerID even when two partners have the same name',()=>{
 const holder:CoupleMemoryHolder285={coupleMemories285:[{otherId:2,at:0},{otherId:3,at:0},{otherId:2,at:0}]};
 const thoughts=coupleMoodThoughts285(holder,1,people);
 expect(thoughts).toHaveLength(2);expect(thoughts.map(t=>t.id)).toEqual(['couple-2','couple-3']);
 expect(thoughts[0]!.offset).toBeCloseTo(12.8);expect(thoughts[1]!.offset).toBe(8);
 expect(coupleOpinionOffset285(holder,2,1)).toBe(10);expect(coupleOpinionOffset285(holder,3,1)).toBe(6);expect(coupleOpinionOffset285(holder,4,1)).toBe(0);
});

test('the ten-event limit is global across partners, with no per-partner renewal',()=>{
 const holder:CoupleMemoryHolder285={};
 for(let n=0;n<10;n++)addCoupleMemory285(holder,n%2+2,n);
 addCoupleMemory285(holder,4,10);
 expect(holder.coupleMemories285).toHaveLength(COUPLE_MEMORY_LIMIT_285);
 expect(holder.coupleMemories285!.map(m=>m.at)).toEqual([1,2,3,4,5,6,7,8,9,10]);
 expect(holder.coupleMemories285!.at(-1)).toEqual({otherId:4,at:10});
});

test('global eviction uses active age after suspension and first list entry on equal ages',()=>{
 const holder:CoupleMemoryHolder285={coupleMemories285:[{otherId:2,at:0,suspendedTicks:900},...Array.from({length:9},()=>({otherId:3,at:500}))]};
 const suspended=holder.coupleMemories285![0]!;addCoupleMemory285(holder,4,1000);
 expect(holder.coupleMemories285![0]).toBe(suspended);expect(holder.coupleMemories285!.filter(m=>m.at===500)).toHaveLength(8);
 const tied:CoupleMemoryHolder285={coupleMemories285:Array.from({length:10},(_,n)=>({otherId:n+2,at:0}))};
 addCoupleMemory285(tied,20,0);expect(tied.coupleMemories285![0]!.otherId).toBe(3);
});

test('opinion alone fades over the final30percent; mood remains full until the local deadline',()=>{
 const holder:CoupleMemoryHolder285={coupleMemories285:[{otherId:2,at:0}]};
 expect(coupleOpinionOffset285(holder,2,D*.7)).toBe(6);expect(coupleOpinionOffset285(holder,2,D*.85)).toBe(3);
 expect(coupleMoodThoughts285(holder,D*.85,people)[0]!.offset).toBe(8);
 expect(coupleOpinionOffset285(holder,2,D-1)).toBe(1);expect(coupleMoodThoughts285(holder,D-1,people)).toHaveLength(1);
 expect(coupleOpinionOffset285(holder,2,D)).toBe(0);expect(coupleMoodThoughts285(holder,D,people)).toEqual([]);
});

test('opinion weights youngest active age first, not newest event date or array rank',()=>{
 // Civilly old event0 is only1000ticks active; event500 is15300ticks active.
 const holder:CoupleMemoryHolder285={coupleMemories285:[{otherId:2,at:500},{otherId:2,at:0,suspendedTicks:14800}]};
 //6 +3*.6 =7.8 ->8; incorrectly sorting by event date gives3+6*.6 ->7.
 expect(coupleOpinionOffset285(holder,2,15800)).toBe(8);
 const before=JSON.stringify(holder);expect(coupleMoodThoughts285(holder,15800,people)[0]!.offset).toBeCloseTo(12.8);expect(JSON.stringify(holder)).toBe(before);
});

test('a held person reads the acquisition frontier without expiring or mutating memory',()=>{
 const holder:CoupleMemoryHolder285={coupleMemories285:[{otherId:2,at:0}],cryptosleepHeldAt271:100};
 const before=JSON.stringify(holder);expireCoupleMemories285(holder,2*D);
 expect(coupleOpinionOffset285(holder,2,2*D)).toBe(6);expect(coupleMoodThoughts285(holder,2*D,people)[0]!.offset).toBe(8);
 expect(JSON.stringify(holder)).toBe(before);
 const ship={...holder,cryptosleepHeldAt271:undefined,shipCryptosleepHeldAt277:100};
 expect(coupleOpinionOffset285(ship,2,2*D)).toBe(6);
});

test('resumed memory preserves its factual date and expires only after corrected active time',()=>{
 const holder:CoupleMemoryHolder285={coupleMemories285:[{otherId:2,at:100,suspendedTicks:1000}]},end=100+D+1000;
 const memory=holder.coupleMemories285![0]!;expireCoupleMemories285(holder,end-1);
 expect(holder.coupleMemories285![0]).toBe(memory);expect(memory.at).toBe(100);
 expireCoupleMemories285(holder,end);expect(Object.hasOwn(holder,'coupleMemories285')).toBe(false);
});

test('readers work on frozen records and an injected name lookup without world capture',()=>{
 const memory=Object.freeze({otherId:2,at:0}),holder=Object.freeze({coupleMemories285:Object.freeze([memory])}) as unknown as Readonly<CoupleMemoryHolder285>;
 expect(coupleMoodThoughts285(holder,1,{get:()=>undefined})[0]!.label).toContain('cette personne');
 expect(coupleOpinionOffset285(holder,2,1)).toBe(6);expect(memory).toEqual({otherId:2,at:0});
});

test('invalid acquisition cannot purge existing memories or install a benefit during suspension',()=>{
 const holder:CoupleMemoryHolder285={coupleMemories285:[{otherId:2,at:0}]},before=JSON.stringify(holder);
 for(const id of [0,-1,NaN,1.5])expect(()=>addCoupleMemory285(holder,id,2*D)).toThrow();
 expect(()=>addCoupleMemory285(holder,2,NaN)).toThrow();expect(JSON.stringify(holder)).toBe(before);
 holder.shipCryptosleepHeldAt277=1;const held=JSON.stringify(holder);
 expect(()=>addCoupleMemory285(holder,2,2*D)).toThrow();expect(JSON.stringify(holder)).toBe(held);
});

test('shape admits only285 presence, exact data fields, bounded corrected clocks and at mostten memories',()=>{
 const value=[{otherId:2,at:100,suspendedTicks:100}];
 expect(validCoupleMemories285(value,285,1000)).toBe(true);
 expect(validCoupleMemories285(value,284,1000)).toBe(false);expect(validCoupleMemories285(value,286,1000)).toBe(false);
 expect(validCoupleMemories285(undefined,284,1000)).toBe(true);expect(validCoupleMemories285(undefined,286,1000)).toBe(false);
 for(const bad of [[],Array.from({length:11},()=>({otherId:2,at:100})),[{otherId:0,at:100}],[{otherId:2,at:1001}],[{otherId:2,at:100,suspendedTicks:0}],[{otherId:2,at:100,suspendedTicks:901}],[{otherId:2,at:100,offset:8}]])
  expect(validCoupleMemories285(bad,285,1000)).toBe(false);
 expect(validCoupleMemories285([{otherId:2,at:0}],285,D)).toBe(false);
 const sparse=Array(1);expect(validCoupleMemories285(sparse,285,1000)).toBe(false);
});

test('descriptor guard rejects ownundefined, inheritance, nonenumerable fields and accessors without invoking them',()=>{
 expect(validCoupleMemoryField285({},284,100)).toBe(true);
 expect(validCoupleMemoryField285({coupleMemories285:[{otherId:2,at:0}]},285,100)).toBe(true);
 expect(validCoupleMemoryField285({coupleMemories285:undefined},285,100)).toBe(false);
 expect(validCoupleMemoryField285(Object.create({coupleMemories285:[]}),285,100)).toBe(false);
 expect(validCoupleMemoryField285(Object.defineProperty({},'coupleMemories285',{value:[{otherId:2,at:0}]}),285,100)).toBe(false);
 const accessor=Object.defineProperty({},'coupleMemories285',{enumerable:true,get(){throw Error('Must not invoke getter');}});
 expect(validCoupleMemoryField285(accessor,285,100)).toBe(false);
 const event=Object.defineProperty({otherId:2},'at',{enumerable:true,get(){throw Error('Must not invoke event getter');}});
 expect(validCoupleMemories285([event],285,100)).toBe(false);
});
