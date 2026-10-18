import {expect,test} from 'vitest';
import {validGeographicSettlementDimensions262} from '../src/sim/geographic-creation-options-262.ts';
import {assembleSettlementMap257,type SettlementMapInputs257} from '../src/sim/camp-map-assembly-256.ts';

test('262 reads the captured square normal configuration200 through325, without a250 fallback or future opening',()=>{
 for(const size of [200,225,250,275,300,325]){
  const expected=Object.freeze({width:size,height:size}),before=JSON.stringify(expected);
  expect(validGeographicSettlementDimensions262(262,size,size,expected)).toBe(true);
  expect(validGeographicSettlementDimensions262(262,size===200?225:200,size,expected)).toBe(false);
  expect(validGeographicSettlementDimensions262(262,size,size)).toBe(false);expect(JSON.stringify(expected)).toBe(before);
 }
 for(const [w,h]of [[200,225],[350,350],[375,375],[400,400]])expect(validGeographicSettlementDimensions262(262,w,h,{width:w,height:h})).toBe(false);
 for(const version of [258,263])expect(validGeographicSettlementDimensions262(version,250,250,{width:250,height:250})).toBe(false);
 for(const version of [259,260,261]){expect(validGeographicSettlementDimensions262(version,250,250)).toBe(true);for(const size of [200,225])expect(validGeographicSettlementDimensions262(version,size,size,{width:size,height:size})).toBe(false);}
});

test('a mismatching settlement proposal is refused by the actual first preflight before Init or shared mutation',()=>{
 for(const [version,size,dimensions]of [[262,200,{width:225,height:225}],[262,350,{width:350,height:350}],[262,200,undefined],[261,200,{width:200,height:200}]] as const){
  const campaign={schemaVersion:version,tick:0,rng:1,nextId:1},settlement={dimensions,lordIds:{nextId:0},casketGroupIds:{nextId:0}},proposal={campaign,size,settlement,tile:17,calendarOrigin:0,provenance:{source:'Declared malformed dimension proposal',atTick:0,nextId:1,tile:17}};
  let reads=0;Object.defineProperty(proposal,'init',{get(){reads++;throw Error('Init must not be reached');}});
  const before=JSON.stringify({campaign,settlement}),first=assembleSettlementMap257(proposal as unknown as SettlementMapInputs257).next();
  expect(first.done).toBe(true);expect(first.value).toMatchObject({status:'blocked',phase:'preflight',reason:'Missing captured Camp256 ownership/clock frontier'});expect(first.value).not.toHaveProperty('world');expect(reads).toBe(0);expect(JSON.stringify({campaign,settlement})).toBe(before);
 }
});
