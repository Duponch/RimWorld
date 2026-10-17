import {expect,test} from 'vitest';
import {groupHashOffset256,groupPawnInterval256,groupCoreTicks256} from '../src/sim/group-core-cadence-256';
import {groupHumanNeedOrder256} from '../src/sim/group-human-needs-order-256';
import {advanceGroupRouteInterval256,groupOwnersCannotMove256,validProspectiveGroupSegment256} from '../src/sim/group-route-interval-256';
import {advanceGroupNeedMeters256,GroupRestMarks256} from '../src/sim/group-need-meters-256';
import {startingPawn} from '../src/sim/starting-pawns';
import {emptyGroupLedger} from '../src/sim/group-loading';
import {captureGroupTravel,type AwayGroup} from '../src/sim/group-capture';
import {depletedHumanHunger,BED_REST_PER_TICK} from '../src/sim/human-need-rates';
import type {PlanetState} from '../src/sim/planet-state';
const person=(id:number)=>startingPawn(id,'Témoin '+id,0,0,0,.65,718,0);
const planet:PlanetState={revision:2,adoptedAt:0,generationSeed:718,homeTile:0,civilianTile:2,nextGroupId:2,tiles:[0,1,2].map(id=>({id,center:[id,0,1],neighbours:id===1?[0,2]:[1],biome:'temperate-forest',hilliness:'flat',meanTemperature:12,rainfall:900}))};
function prepared():AwayGroup{return {id:1,startedAt:0,destination:2,ledger:emptyGroupLedger(),phase:'travelling',members:[person(1),person(2)],items:[],departedAt:0,lastPersonalTick:0,baseline:{food:0,silver:0,cargo:{cloth:0,'muffalo-wool':0},medicine:0,component:0},entry:{x:0,z:0},tile:0,route:[1,2],segment:{from:0,to:1,totalCore:12,remainingCore:2},paused:false,stop:null};}
const context=(g:AwayGroup,deltaCore:number)=>{const travel=captureGroupTravel(g,()=>({incapable:false,restNeed:false}))!;return {travel,cost:{homeCivilCore:30000,mass:travel.mass},deltaCore,validFinalPushDestination:()=>false};};

test('elapsed ten Core ticks and signed hash phases have no civil offset or fabricated delta loop',()=>{
 expect(groupCoreTicks256(1)).toEqual([1,2,3,4,5,6,7,8,9,10]);expect(groupCoreTicks256(2)[0]).toBe(11);
 expect(groupHashOffset256(1)).toBe(-1471036369);expect(groupPawnInterval256(1,19,150,1)).toBe(true);expect(groupPawnInterval256(1,18,150,1)).toBe(false);expect(groupPawnInterval256(1,18,150,15)).toBe(true);
 expect(groupPawnInterval256(1,4000000115,150,1)).toBe(true);expect(()=>groupCoreTicks256(0)).toThrow();
});

test('installed Mono equal-human-key permutation differs from a stable JS reverse above16',()=>{
 const seventeen=Array.from({length:17},(_,i)=>person(i+1)),before=[...seventeen];
 expect(groupHumanNeedOrder256(seventeen).map(p=>p.id)).toEqual([17,8,2,3,4,5,6,7,9,16,10,11,12,13,14,15,1]);expect(seventeen).toEqual(before);expect(groupHumanNeedOrder256(seventeen).every(p=>seventeen.includes(p))).toBe(true);
 const thirtyThree=Array.from({length:33},(_,i)=>person(i+1));expect(groupHumanNeedOrder256(thirtyThree).map(p=>p.id)).toEqual([33,16,2,3,4,5,6,7,8,9,10,11,12,13,14,15,17,32,18,19,20,21,22,23,24,25,26,27,28,29,30,31,1]);expect(groupHumanNeedOrder256(seventeen.slice(0,16)).map(p=>p.id)).toEqual(Array.from({length:16},(_,i)=>16-i));
});

test('one interval pays delta once and defers edge entry, preserving original objects on refusal',()=>{
 const g=prepared(),before=structuredClone(g),first=advanceGroupRouteInterval256(planet,g,context(g,15));expect(g).toEqual(before);expect(first.state).toMatchObject({tile:0,segment:{remainingCore:-13}});expect(first.event).toBeNull();
 if(!('members' in first.state))throw Error('Not an away owner');const next=advanceGroupRouteInterval256(planet,first.state,context(first.state,15));expect(next.state).toMatchObject({tile:1,segment:{from:1,to:2}});expect(next.event).toBeNull();
 expect(validProspectiveGroupSegment256({from:0,to:1,totalCore:60000,remainingCore:-30})).toBe(true);expect(validProspectiveGroupSegment256({from:0,to:1,totalCore:60000,remainingCore:-33})).toBe(false);
});

test('a single downed passenger does not stop all capable owners; all downed do',()=>{
 const g=prepared();g.members[0]!.state='downed';expect(groupOwnersCannotMove256(g.members)).toEqual([]);expect(advanceGroupRouteInterval256(planet,g,context(g,1)).state).toMatchObject({segment:{remainingCore:1},stop:null});
 g.members[1]!.state='downed';expect(groupOwnersCannotMove256(g.members)).toEqual([1,2]);expect(advanceGroupRouteInterval256(planet,g,context(g,1)).state).toMatchObject({segment:{remainingCore:2},stop:{kind:'incapacity',pawnIds:[1,2]}});
});

test('needs150 owns meter changes; runtime rest marks expire and reset without saved gain',()=>{
 const g=prepared();g.members=[g.members[0]!];const p=g.members[0]!,marks=new GroupRestMarks256();p.hunger=100;p.rest=50;const expectedFood=100-(100-depletedHumanHunger(p,false))*15;
 marks.mark(p,168,.8);const c={coreTick:169,legacyFood:false,legacyRest:false,joyToleranceFall:.003,restMarks:marks};advanceGroupNeedMeters256(g,{...c,coreTick:168});expect(p.hunger).toBe(100);expect(p.rest).toBe(50);
 advanceGroupNeedMeters256(g,c);expect(p.hunger).toBeCloseTo(expectedFood,12);expect(p.rest).toBeCloseTo(50+BED_REST_PER_TICK*.8*15,12);expect(marks.effectiveness(p.id,183)).toBeUndefined();marks.clear();expect(marks.effectiveness(p.id,169)).toBeUndefined();
});
