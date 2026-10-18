import {expect,test} from 'vitest';
import {validGroupCommand} from '../src/sim/group-command-shape.ts';
import {validGroupEncounterFields261} from '../src/sim/caravan-registry-save-261.ts';
import {validCaravan261Historical} from '../src/sim/caravan-schema-historical-261.ts';
import {validIrregularClimateMarker262} from '../src/sim/geographic-irregular-temperature-262.ts';
import type {EncounterValidation261} from '../src/sim/caravan-encounter-save-261.ts';

// Pure envelope witnesses only. No fabricated World/Pawn, saved campaign,
// generator, custody transfer or route is claimed by these small shapes.
const context=(version:number):EncounterValidation261=>({version,atCore:0,tileCount:1,factionIds:new Set(),mapIds:new Set(),settlements:[]});
test('the existing retreat intention continues exactly261|262, while older and future command fields remain refused',()=>{
 const command={type:'group-start',retreat261:true,originMapId:0,memberIds:[7],sources:[],destination:0};
 for(const version of [261,262])expect(validGroupCommand(command,version)).toBe(true);
 for(const version of [259,260,263])expect(validGroupCommand(command,version)).toBe(false);
 expect(validGroupCommand({...command,retreat261:undefined},262)).toBe(false);
});
test('retreat management tags remain old261 data and continue in262 without inventing a tag on absent envelopes',()=>{
 const local={encounters261:{revision:1},state:{memberIds:[]},retreat261:{revision:1}},away={...local,state:{members:[]},retreat261:{revision:1,autoJoinable:true}};
 for(const version of [261,262]){expect(validGroupEncounterFields261(local,context(version),8)).toBe(true);expect(validGroupEncounterFields261(away,context(version),8)).toBe(true);}
 for(const version of [260,263])expect(validGroupEncounterFields261(away,context(version),8)).toBe(false);
 const absent={encounters261:{revision:1},state:{members:[]}},before=JSON.stringify(absent);expect(validGroupEncounterFields261(absent,context(262),8)).toBe(true);expect(JSON.stringify(absent)).toBe(before);expect(Object.hasOwn(absent,'retreat261')).toBe(false);
 expect(validGroupEncounterFields261({...local,retreat261:{revision:1,autoJoinable:true}},context(262),8)).toBe(false);
 let reads=0;const bad={};Object.defineProperty(bad,'revision',{enumerable:true,get(){reads++;throw Error('Must not read');}});expect(validGroupEncounterFields261({...local,retreat261:bad},context(262),8)).toBe(false);expect(reads).toBe(0);
});
test('old260 raw fence rejects both new261 owner tags before migration',()=>{
 for(const tag of ['retreat261','undraftIds261'])expect(validCaravan261Historical({nested:{[tag]:{revision:1}}},260)).toBe(false);
});
test('irregular climate permission is prospective262 only and absence stays literal',()=>{
 const old={},before=JSON.stringify(old);for(const version of [260,261,262])expect(validIrregularClimateMarker262(old,version)).toBe(true);expect(JSON.stringify(old)).toBe(before);
 for(const version of [260,261,263])expect(validIrregularClimateMarker262({irregular262:true},version)).toBe(false);expect(validIrregularClimateMarker262({irregular262:true},262)).toBe(true);
 for(const value of [false,undefined])expect(validIrregularClimateMarker262({irregular262:value},262)).toBe(false);expect(validIrregularClimateMarker262(Object.create({irregular262:true}),262)).toBe(false);
});
