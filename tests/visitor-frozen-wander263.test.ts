import {describe,it,expect} from 'vitest';
import {validArchivedVisitorMental} from '../src/sim/visitor-save';
import {exitVisitor} from '../src/sim/visitors';
import type {World,Pawn} from '../src/sim/types';
// Scalar owner/projection witnesses only. No World/map/campaign constructor,
// visitor arrival, new cohort, gameplay step or historical fixture mutation.
const departure=9682;
const header=(version=263)=>({schemaVersion:version,width:325,height:325}) as Pick<World,'schemaVersion'|'width'|'height'>;
const mind=()=>({below:[0,0,0],cooldown:0,catharsis:[] as number[],wander:{revision:1,nextMoveOrderIsWait:false}});
describe('frozen visitor constructed wander256',()=>{
 it('admits the real constructed shape without mutation, using the departure clock for frozen catharsis',()=>{
  const pawn={mental:mind()},before=JSON.stringify(pawn);expect(validArchivedVisitorMental(pawn,header(),departure)).toBe(true);expect(JSON.stringify(pawn)).toBe(before);
  pawn.mental.catharsis=[departure+1];expect(validArchivedVisitorMental(pawn,header(),departure)).toBe(true);expect(validArchivedVisitorMental(pawn,header(),10500)).toBe(false);expect(pawn.mental.catharsis).toEqual([departure+1]);
 });
 it('keeps absent legacy mental literal and refuses every pre256 future mental field',()=>{
  for(const version of [88,150,192,255]){expect(validArchivedVisitorMental({},header(version),departure)).toBe(true);expect(validArchivedVisitorMental({mental:mind()},header(version),departure)).toBe(false);expect(validArchivedVisitorMental({mental:undefined},header(version),departure)).toBe(false);}
  expect(validArchivedVisitorMental({mental:mind()},header(256),departure)).toBe(true);expect(validArchivedVisitorMental({mental:undefined},header(),departure)).toBe(false);expect(validArchivedVisitorMental({mental:{below:[0,0,0],cooldown:0,catharsis:[]}},header(),departure)).toBe(false);
 });
 it('rejects crises, malformed/future wander and out-of-departure bounds without recovery or normalization',()=>{
  for(const crisis of [undefined,null,{kind:'confused-wander',age:0,target:null,waitUntil:departure},{kind:'sad-wander',age:0,target:null,waitUntil:departure}])expect(validArchivedVisitorMental({mental:{...mind(),crisis}},header(),departure)).toBe(false);
  for(const change of [{wander:{revision:2,nextMoveOrderIsWait:false}},{wander:{revision:1,nextMoveOrderIsWait:0}},{wander:{revision:1,nextMoveOrderIsWait:false,future:true}},{below:[0,150,0]},{below:[2101,0,0]},{cooldown:1501},{catharsis:[departure]},{catharsis:[departure+18001]},{catharsis:[departure+1,departure+1]},{future:true}])expect(validArchivedVisitorMental({mental:{...mind(),...change}},header(),departure)).toBe(false);
 });
 it('does not accept inherited or accessor mental/wander authorities',()=>{
  expect(validArchivedVisitorMental(Object.create({mental:mind()}),header(),departure)).toBe(false);const inherited=Object.assign(Object.create({wander:mind().wander}),{below:[0,0,0],cooldown:0,catharsis:[]});expect(validArchivedVisitorMental({mental:inherited},header(),departure)).toBe(false);
  let reads=0;const accessor={};Object.defineProperty(accessor,'mental',{enumerable:true,get(){reads++;return mind();}});expect(validArchivedVisitorMental(accessor,header(),departure)).toBe(false);const m={below:[0,0,0],cooldown:0,catharsis:[]};Object.defineProperty(m,'wander',{enumerable:true,get(){reads++;return mind().wander;}});expect(validArchivedVisitorMental({mental:m},header(),departure)).toBe(false);expect(reads).toBe(0);
  const belowGetter=mind();Object.defineProperty(belowGetter,'below',{enumerable:true,get(){reads++;return [0,0,0];}});expect(validArchivedVisitorMental({mental:belowGetter},header(),departure)).toBe(false);expect(reads).toBe(0);
  const inheritedBase=Object.assign(Object.create({below:[0,0,0]}),{cooldown:0,catharsis:[],wander:mind().wander});expect(validArchivedVisitorMental({mental:inheritedBase},header(),departure)).toBe(false);
  const symbol=mind();Object.defineProperty(symbol,Symbol('future'),{enumerable:true,value:true});expect(validArchivedVisitorMental({mental:symbol},header(),departure)).toBe(false);
  const nonenumerable=mind();Object.defineProperty(nonenumerable,'below',{enumerable:false});expect(validArchivedVisitorMental({mental:nonenumerable},header(),departure)).toBe(false);
  const nullPrototype=Object.assign(Object.create(null),mind());expect(validArchivedVisitorMental({mental:nullPrototype},header(),departure)).toBe(true);
 });
});
describe('current263 crisis keeps its physical visitor owner',()=>{
 it('refuses before archive, owner, items or personal-food receipt mutation',()=>{
  const p={id:17,mental:{...mind(),crisis:{kind:'confused-wander',age:0,target:null,waitUntil:departure}},visitor:{group:1,role:'traveler',phase:'leaving',goal:null,personalFoodIds:[18]},state:'idle'} as unknown as Pawn;
  const context={schemaVersion:263,tick:departure,pawns:[p],piles:[],packed:[],visitors:{departed:[]}},before=JSON.stringify(context),foods=p.visitor!.personalFoodIds;expect(exitVisitor(context as unknown as World,p)).toBe(false);expect(JSON.stringify(context)).toBe(before);expect(context.pawns[0]).toBe(p);expect(p.visitor!.personalFoodIds).toBe(foods);expect(context.visitors.departed).toEqual([]);
 });
 it('leaves historical<=262 processing literal, including its existing personal-food filter before another refusal',()=>{
  for(const version of [255,256,261,262]){const p={id:17,x:0,z:0,mental:{...mind(),crisis:{kind:'confused-wander',age:0,target:null,waitUntil:departure}},visitor:{group:1,role:'traveler',phase:'leaving',goal:null,personalFoodIds:[18]},state:'downed'} as unknown as Pawn;const context={schemaVersion:version,tick:departure,width:325,height:325,piles:[]};expect(exitVisitor(context as unknown as World,p)).toBe(false);expect(p.visitor!.personalFoodIds).toEqual([]);}
 });
});
