import {expect,test} from 'vitest';
import {isNativeCorePhaseAdmissionTicket297,isNativeCoreFullAdmissionTicket297} from '../src/bridge/native-clone-resident';
test('actual phase and Full checker exports grant nothing to public metadata, copies or swapped functions',()=>{
 const run=()=>{},look={run,arrivalAt:0,type:'snapshot',schemaVersion:297,corePhase297:{mapId:0,core:0,projectilesRetained:[]},modernFull297:true};
 for(const value of [null,undefined,1,'full',look,{...look},Object.freeze({...look})]){
  expect(isNativeCoreFullAdmissionTicket297(value,run)).toBe(false);
  expect(isNativeCoreFullAdmissionTicket297(value,()=>run())).toBe(false);
  expect(isNativeCorePhaseAdmissionTicket297(value,run)).toBe(false);
 }
});
test('actual Full scheduling checker does not inspect hostile caller properties',()=>{
 let reads=0;const value=new Proxy({},{get(){reads++;throw Error('No property grant');},getOwnPropertyDescriptor(){reads++;throw Error('No descriptor grant');},ownKeys(){reads++;throw Error('No shape grant');}});
 expect(isNativeCoreFullAdmissionTicket297(value,()=>{})).toBe(false);expect(reads).toBe(0);
});
