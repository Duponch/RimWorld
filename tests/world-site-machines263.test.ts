import {describe,it,expect} from 'vitest';
import {draftSiteMechanoidRoster263,validSiteMechField263} from '../src/sim/world-site-mechanoids-263.ts';
import {mechMaxPawnCost,mechanoidRaidCost} from '../src/sim/mechanoid-raid-composition.ts';

describe('Site263 current mechanical producer and exact shape',()=>{
 it('spends only the real current bodies under the real budget/cap without changing the input frontier',()=>{
  const points=580,rng=2369646797,first=draftSiteMechanoidRoster263(points,rng);
  expect(first).toBeDefined();expect(first!.roster.length).toBeGreaterThan(0);
  expect(draftSiteMechanoidRoster263(points,rng)).toEqual(first);
  const cost=first!.roster.reduce((sum,k)=>sum+mechanoidRaidCost(k),0);
  expect(cost).toBeLessThanOrEqual(points);expect(points-cost).toBeLessThan(110);
  for(const k of first!.roster)expect(mechanoidRaidCost(k)).toBeLessThanOrEqual(mechMaxPawnCost(points));
  expect(rng).toBe(2369646797);
 });
 it('keeps a real unaffordable outcome empty and rejects an invalid budget before drawing',()=>{
  expect(draftSiteMechanoidRoster263(90,123)).toEqual({roster:[],nextRng:123});
  expect(draftSiteMechanoidRoster263(0,123)).toBeUndefined();expect(draftSiteMechanoidRoster263(Infinity,123)).toBeUndefined();
 });
 it('refuses future Site duty on old262 and accepts only the closed sleeping/waiting shape',()=>{
  // Pure grammar witness, not a manufactured World, pending, producer or owner.
  const value={state:'idle',path:[],site263:{revision:1,siteId:3,bornAtCore:10000,releaseAtCore:10000,awakeAtCore:null,wakeIfClose:true,goal:null}};
  const before=JSON.stringify(value);
  expect(validSiteMechField263(value,262,1000)).toBe(false);expect(validSiteMechField263(value,263,1000)).toBe(true);
  expect(validSiteMechField263({...value,site263:{...value.site263,releaseAtCore:10001}},263,1000)).toBe(false);
  expect(validSiteMechField263({...value,path:[{x:1,z:1}]},263,1000)).toBe(false);
  expect(validSiteMechField263({...value,temple:{}},263,1000)).toBe(false);
  expect(validSiteMechField263({...value,raid:{}},263,1000)).toBe(false);
  expect(validSiteMechField263({...value,site263:{...value.site263,awakeAtCore:10000,releaseAtCore:10120}},263,1000)).toBe(true);
  expect(JSON.stringify(value)).toBe(before);
 });
 it('rejects accessor duty before reading or granting a Site mandate',()=>{
  let reads=0;const value={};Object.defineProperty(value,'site263',{enumerable:true,get(){reads++;throw Error('must not read');}});
  expect(validSiteMechField263(value,263,1000)).toBe(false);expect(reads).toBe(0);
 });
});
