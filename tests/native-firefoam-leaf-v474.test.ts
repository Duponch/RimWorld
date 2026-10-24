// Constructed scanner cases; native source/event provenance is covered separately.
// These are constructed scanner-hook cases, not a native provenance mint.
import {expect,test} from 'vitest';
import {createFirefoamLaneValidatorsInternal290,validFirefoamHistoricalTransport290} from '../src/sim/firefoam-save-290';
import {validFirefoamActorOwners290,validFirefoamActorOwnersWithLanesInternal290} from '../src/sim/firefoam-actor-save-290';

test('an already empty constructed owner skips both edge loops after semantics, preserving result',()=>{
 const leaf={unrelated:17};let reads=0,proofs=0;
 const guards=createFirefoamLaneValidatorsInternal290((value,key)=>{reads++;return Object.getOwnPropertyDescriptor(value,key);},value=>{proofs++;return value===leaf;});
 expect(guards.historical(leaf,293)).toBe(validFirefoamHistoricalTransport290(leaf,293));
 expect(reads).toBe(0);expect(proofs).toBe(2);
});

test('invalid building semantics reject before a permissive empty-edge oracle is consulted',()=>{
 const bad={kind:'firefoam-popper',material:'wood'},seen:object[]=[];
 const guards=createFirefoamLaneValidatorsInternal290(Object.getOwnPropertyDescriptor,value=>{seen.push(value);return value===bad;});
 expect(guards.historical({structures:[bad]},293)).toBe(false);
 expect(seen).not.toContain(bad);
});

test('invalid actor semantics reject before a permissive empty-edge oracle is consulted',()=>{
 const bad={coveredInFirefoam290:{}},seen:object[]=[];
 expect(validFirefoamActorOwnersWithLanesInternal290(bad,293,Object.getOwnPropertyDescriptor,value=>{seen.push(value);return true;})).toBe(false);
 expect(validFirefoamActorOwners290(bad,293)).toBe(false);expect(seen).toEqual([]);
});

test.each([
 ['enumerable undefined',{value:undefined,enumerable:true,configurable:true},true],
 ['nonenumerable undefined',{value:undefined,enumerable:false,configurable:true},false],
 ['accessor',{get(){throw Error('owner getter must not run');},enumerable:true,configurable:true},false],
] as const)('a refused leaf proof retains descriptor behavior for an own lane: %s',(_name,descriptor,expected)=>{
 const row={};Object.defineProperty(row,'structures',descriptor);let read=false;
 const guards=createFirefoamLaneValidatorsInternal290((value,key)=>{if(value===row&&key==='structures')read=true;return Object.getOwnPropertyDescriptor(value,key);},()=>false);
 expect(guards.historical(row,293)).toBe(expected);expect(validFirefoamHistoricalTransport290(row,293)).toBe(expected);
 expect(read).toBe(true);
});

test('specialized feet and filth supply only their actual edge sets',()=>{
 const feet={lastTerrain:'dirt'},filth={revision:1},seen:{value:object;keys:string[]}[]=[];
 const guards=createFirefoamLaneValidatorsInternal290(Object.getOwnPropertyDescriptor,(value,keys)=>{
  if(value!==feet&&value!==filth)return false;seen.push({value,keys:[...keys]});return true;
 });
 const raw={filthFeet:feet,filth};
 expect(guards.historical(raw,293)).toBe(validFirefoamHistoricalTransport290(raw,293));
 expect(seen.find(row=>row.value===feet)?.keys).toEqual(['carried']);
 expect(seen.find(row=>row.value===filth)?.keys).toEqual(['items']);
});

test('an owner with a real child remains traversed and rejects that child',()=>{
 const bad={kind:'firefoam-popper',material:'wood'},owner={structures:[bad]};
 const guards=createFirefoamLaneValidatorsInternal290(Object.getOwnPropertyDescriptor,value=>value!==owner&&value!==bad);
 expect(guards.historical(owner,293)).toBe(validFirefoamHistoricalTransport290(owner,293));
 expect(guards.historical(owner,293)).toBe(false);
});

test('live inherited owner accessors retain strict refusal without invoking their getter',()=>{
 const old=Object.getOwnPropertyDescriptor(Object.prototype,'commercialTrip');let getterCalls=0;
 let native:boolean|undefined,strict:boolean|undefined,actors:boolean|undefined;
 try{
  Object.defineProperty(Object.prototype,'commercialTrip',{enumerable:false,configurable:true,get(){getterCalls++;throw Error('inherited getter must not run');}});
  // This constructed oracle declines a leaf whenever any inherited lane exists.
  const guards=createFirefoamLaneValidatorsInternal290(Object.getOwnPropertyDescriptor,(_value,keys)=>!Reflect.ownKeys(Object.prototype).some(key=>typeof key==='string'&&keys.has(key)));
  native=guards.historical({},293);strict=validFirefoamHistoricalTransport290({},293);actors=validFirefoamActorOwners290({},293);
 }finally{
  if(old)Object.defineProperty(Object.prototype,'commercialTrip',old);else Reflect.deleteProperty(Object.prototype,'commercialTrip');
 }
 expect(native).toBe(false);expect(strict).toBe(false);expect(actors).toBe(false);expect(getterCalls).toBe(0);
});
