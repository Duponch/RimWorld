import {test,expect} from 'vitest';
import {constructFreshInitialWildAnimal256} from '../src/sim/initial-animal-constructor-256.ts';
import {INITIAL_ANIMAL_FACTS_256} from '../src/sim/initial-animal-data-256.ts';
import {cleanMapRemovedAnimal256} from '../src/sim/world-lost-owners.ts';
import {worldPawnActiveBoundary256} from '../src/sim/world-pawn-life-256.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';
import type {WorldPawnOwner256} from '../src/sim/world-pawn-state-256.ts';

// A real fresh constructor and primitive draw oracle only. No map, World,
// campaign birth, biological catchup or played animal history is invented.
function native(){
 const result=constructFreshInitialWildAnimal256({fact:INITIAL_ANIMAL_FACTS_256.Hare,id:17,cell:{x:4,z:5},tick:100,random:{value:()=>.99,float:a=>Math.fround(a),integer:a=>a}});
 if(result.status!=='ready')throw Error(result.reason);return result.animal;
}
test('actual removal cleanup keeps original age/growth/needs and stops at the occupied end of an engaged edge',()=>{
 const a=native(),tracker=a.growthTracker!,trackerBefore=structuredClone(tracker),age=a.ageTicks,remainder=a.ageCoreRemainder,food=a.food,rest=a.rest;
 a.state='moving';a.path=[{x:5,z:5}];a.motion={from:{x:4,z:5},to:{x:5,z:5},start:99,end:103};a.x=5;
 cleanMapRemovedAnimal256(a,100);expect(a).toMatchObject({x:4,z:5,state:'idle',path:[],ageTicks:age,ageCoreRemainder:remainder,food,rest});expect(a.motion).toBeUndefined();expect(a.growthTracker).toBe(tracker);expect(a.growthTracker).toEqual(trackerBefore);
});
test('shared cleanup does not install a prospective tracker or rewrite literal historical species',()=>{
 const a:WildAnimal={id:18,species:'hare',sex:'female',ageTicks:10000,x:2,z:3,food:.1,rest:.8,state:'idle',path:[],nextDecision:101};
 const before=JSON.stringify(a);cleanMapRemovedAnimal256(a,100);expect(JSON.stringify(a)).toBe(before);expect(Object.hasOwn(a,'growthTracker')).toBe(false);
});
test('retained gear is a real admission refusal, never an item refund or skipped runtime',()=>{
 const a=native(),item={id:19,kind:'wood' as const,item:'wood' as const,quantity:1,owner:{type:'inventory' as const,pawnId:a.id}},row:WorldPawnOwner256={kind:'animal',actor:a,factionId:null,originMapId:1,context:{seed:7,width:32,height:32},clockCore:1000,enteredAtAbsCore:163000,mode:'active',items:[item],packed:[]};
 const before=JSON.stringify(row);expect(worldPawnActiveBoundary256(row)).toContain('retained-holder adapter');expect(JSON.stringify(row)).toBe(before);expect(row.items[0]).toBe(item);
});
