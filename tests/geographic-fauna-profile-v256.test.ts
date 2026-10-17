import {expect,test} from 'vitest';
import {validWildlifeProfileVersion256 as valid,GEOGRAPHIC_FAUNA_PROFILE_256 as profile} from '../src/sim/geographic-fauna-profile-256';
test('only the new256 Site3 owner admits the geographic family; version or site migration alone never promotes it',()=>{
 const s={profile};expect(valid({site:{revision:3}},256,s)).toBe(true);
 for(const version of [76,178,255,257])expect(valid({site:{revision:3}},version,s)).toBe(false);
 for(const site of [undefined,{revision:1},{revision:2}])expect(valid({site},256,s)).toBe(false);
 expect(valid({site:{revision:3}},256,{profile,population:undefined})).toBe(false);
 expect(valid({site:{revision:3}},256,{profile,population:{targetWeight:0,arrivals:0}})).toBe(false);
});
test('historical profile boundaries remain exact and never acquire a profile or population by reading',()=>{
 for(const [name,min]of [['temperate-hares-v1',76],['biome-herbivores-v1',91],['biome-fauna-v2',178]]as const){
  const s={profile:name,population:{literal:true}},before=JSON.stringify(s);
  expect(valid({},min-1,s)).toBe(false);expect(valid({},min,s)).toBe(true);expect(valid({site:{revision:3}},256,s)).toBe(true);expect(JSON.stringify(s)).toBe(before);
 }
 expect(valid({},256,undefined)).toBe(true);expect(valid({},256,null)).toBe(false);expect(valid({},256,{profile:'future'})).toBe(false);
});
