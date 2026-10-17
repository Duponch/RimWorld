import {validGroupForageHistoricalTransport256} from '../src/sim/group-forage-save-256.ts';
import {expect,test} from 'vitest';
import {startingPawn} from '../src/sim/starting-pawns.ts';
import {emptyGroupLedger} from '../src/sim/group-loading.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {acquireFlu} from '../src/sim/flu-state.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';
import {newGroupForageRevision256,validGroupForageRevision256} from '../src/sim/group-forage-state-256.ts';
import {advanceGroupForage256,type GroupForageOwner256} from '../src/sim/group-forage-256.ts';
import {groupWouldBenefitFromCarrying256,recalculateGroupCarried256,setGroupCaravanCarrySick256,validGroupCaravanCarryPawnField256} from '../src/sim/group-caravan-carry-256.ts';
import {recalculateGroupBeds256,GroupComfortMarks256} from '../src/sim/group-caravan-beds-256.ts';
import {ingestGroupFood256} from '../src/sim/group-foraged-ingestion-256.ts';
import {advanceGroupForagedAges256} from '../src/sim/group-foraged-age-256.ts';
import {captureProspectiveGroupMass256} from '../src/sim/group-caravan-mass-256.ts';
import {freshRot} from '../src/sim/food-preservation.ts';
import type {PackedFurniture} from '../src/sim/furniture-rules.ts';
const person=(id:number)=>startingPawn(id,'Voyageur '+id,0,0,0,.65,718,0);
function prepared(){
 const w=deconstructionCamp(2),members=[person(1),person(2)];Object.assign(w,{schemaVersion:256,tick:0,nextId:100,pawns:[],planet:{revision:2,adoptedAt:0,generationSeed:718,homeTile:0,civilianTile:1,nextGroupId:2,tiles:[0,1].map(id=>({id,center:[id,0,1],neighbours:[1-id],biome:'temperate-forest',hilliness:'flat',meanTemperature:12,rainfall:900}))}});
 const g:GroupForageOwner256={id:1,startedAt:0,destination:1,ledger:emptyGroupLedger(),phase:'travelling',members,items:[],departedAt:0,lastPersonalTick:0,baseline:{food:0,silver:0,cargo:{cloth:0,'muffalo-wool':0},medicine:0,component:0},entry:{x:0,z:0},tile:0,route:[0,1],segment:null,paused:false,stop:null,travel:{revision:1,tickDelta:0,forage:newGroupForageRevision256([])}};w.group=g;return {w,g};
}
const bed=(id:number,pawnId:number,quality:'normal'|'good'='normal'):PackedFurniture=>({building:{id,kind:'bedroll',material:'cloth',quality,x:249,z:248,orientation:0,footprint:'standard'},owner:{type:'inventory',pawnId}});

test('forage permission is prospective and birth captures real fruit only without crediting it as gathered',()=>{
 const state=newGroupForageRevision256([{id:5,kind:'food',item:'berries',quantity:7,owner:{type:'inventory',pawnId:1}}]);expect(state.opening).toEqual({berries:7,'agave-fruit':0});expect(state.gathered.berries).toBe(0);expect(validGroupForageRevision256(state)).toBe(true);
 const bad={...state,progress:1};expect(validGroupForageRevision256(bad)).toBe(false);let reads=0;Object.defineProperty(bad,'progress',{get(){reads++;return 0;},enumerable:true});expect(validGroupForageRevision256(bad)).toBe(false);expect(reads).toBe(0);
});

test('actual collection creates original food inventory, mass, IDs and one accounting receipt',()=>{
 const {w,g}=prepared();g.members[0]!.skills.plants!.level=10;g.members[1]!.skills.plants!.level=0;g.travel.forage.progress=Math.fround(.999);const before=w.nextId,inputs=JSON.stringify(g.members);let draws=0;
 const receipt=advanceGroupForage256(w,g,{coreTick:4,deltaCore:15,movingNow:false,nightResting:false,carriedBefore:new Set(),playerDef:'PlayerColony',rotRate:1,availablePileSlots:100,random:()=>{draws++;return 0;},integer:()=>0});
 expect(draws).toBe(1);expect(receipt.length).toBe(1);const units=receipt.reduce((n,r)=>n+r.quantity,0);expect(units).toBeGreaterThan(0);expect(g.travel.forage.gathered.berries).toBe(units);expect(g.travel.forage.opening.berries).toBe(0);expect(g.items[0]).toMatchObject({id:before,item:'berries',quantity:units,owner:{type:'inventory',pawnId:1}});expect(w.nextId).toBe(before+1);expect(captureProspectiveGroupMass256(g)!.grams).toBe(units*27);expect(JSON.stringify(g.members)).toBe(inputs);expect(g.travel.forage.progress).toBe(0);
});

test('sick carrying is a real per-person preference and never a generic downed teleport',()=>{
 const {w,g}=prepared(),p=g.members[0]!;p.state='downed';expect(groupWouldBenefitFromCarrying256(p)).toBe(false);expect(recalculateGroupCarried256(g,true).size).toBe(0);p.health=createMedicalRecord(0);expect(acquireFlu(p.health,1000000)).toBe(true);expect(recalculateGroupCarried256(g,true)).toEqual(new Set([p.id]));
 const before=JSON.stringify(p.health);expect(setGroupCaravanCarrySick256(w,{type:'group-carry-sick',groupId:g.id,pawnId:p.id,enabled:false}).ok).toBe(true);expect(recalculateGroupCarried256(g,true).size).toBe(0);expect(JSON.stringify(p.health)).toBe(before);expect(validGroupCaravanCarryPawnField256(p,255)).toBe(false);expect(validGroupCaravanCarryPawnField256(p,256)).toBe(true);expect(recalculateGroupCarried256(g,false).size).toBe(0);
});

test('only actual usable bedroll inventory supplies beds; moving needs real carried sick patient',()=>{
 const {g}=prepared();g.packed=[bed(70,1),bed(71,2,'good')];const first=g.packed[0]!,best=g.packed[1]!;const stationary=recalculateGroupBeds256(g,false,new Set());expect(stationary.get(1)!.pack).toBe(best);expect(stationary.get(2)!.pack).toBe(first);expect(stationary.get(1)!.restEffectiveness).toBeCloseTo(.95*1.08,12);expect(recalculateGroupBeds256(g,true,new Set()).size).toBe(0);
 const p=g.members[0]!;p.health=createMedicalRecord(0);acquireFlu(p.health,1000000);const carried=recalculateGroupCarried256(g,true),moving=recalculateGroupBeds256(g,true,carried);expect(moving.size).toBe(1);expect(moving.get(p.id)).toMatchObject({immunityFactor:1.05,healPerDay:4});expect(g.packed).toEqual([first,best]);
});

test('comfort is a hash15 source mark and a separate needs150 update, expired at16 and reset at load',()=>{
 const {g}=prepared(),p=g.members[0]!;g.packed=[bed(70,1)];const use=recalculateGroupBeds256(g,false,new Set()).get(1)!,marks=new GroupComfortMarks256();p.comfort=0;marks.used(p,use,168,15);expect(p.comfort).toBe(0);marks.needAt(p,168);expect(p.comfort).toBe(0);marks.needAt(p,169);expect(p.comfort).toBeCloseTo(Math.fround(Math.fround(Math.fround(.6)*Math.fround(.06))*100),6);marks.clear();p.comfort=50;marks.needAt(p,319);expect(p.comfort).toBeLessThan(50);
});

test('eating and spoilage debit real inventory separately without creating gathered history',()=>{
 const {w,g}=prepared(),p=g.members[0]!;p.hunger=0;g.items=[{id:40,kind:'food',item:'berries',quantity:30,owner:{type:'inventory',pawnId:1},...freshRot('berries',0)}];g.travel.forage=newGroupForageRevision256(g.items);const opening=g.travel.forage.opening.berries;
 const result=ingestGroupFood256(w,g,p,{random:()=>.99,notice:()=>{}}),consumed=g.travel.forage.consumed.berries;expect(consumed).toBeGreaterThan(0);expect(result.massRemovedGrams).toBe(consumed*27);expect(g.travel.forage.gathered.berries).toBe(0);
 for(const pile of g.items)pile.rot={progress:999999,atTick:0};advanceGroupForagedAges256(w,g,1);expect(g.items).toHaveLength(0);expect(g.travel.forage.spoiled.berries).toBeGreaterThan(0);expect(g.travel.forage.spoiled.berries+consumed).toBe(opening);expect(g.travel.forage.gathered.berries).toBe(0);
});


test('partial inventory absorption allocates its actual SplitOff identity while retaining the remainder ID',()=>{
 const {w,g}=prepared();g.members[0]!.skills.plants!.level=10;g.members[1]!.skills.plants!.level=0;g.items=[{id:50,kind:'food',item:'berries',quantity:74,owner:{type:'inventory',pawnId:1},...freshRot('berries',0)}];g.travel.forage=newGroupForageRevision256(g.items);g.travel.forage.progress=Math.fround(.999);const next=w.nextId;
 const rows=advanceGroupForage256(w,g,{coreTick:4,deltaCore:15,movingNow:false,nightResting:false,carriedBefore:new Set(),playerDef:'PlayerColony',rotRate:1,availablePileSlots:100,random:()=>0,integer:()=>0});
 expect(rows).toHaveLength(1);expect(rows[0]!.quantity).toBeGreaterThan(1);expect(rows[0]!.createdPileId).toBe(next);expect(rows[0]!.merged).toEqual([{pileId:50,absorbedPileId:next+1,quantity:1}]);expect(rows[0]!.retainedPileId).toBe(next);expect(w.nextId).toBe(next+2);expect(g.items.find(p=>p.id===50)!.quantity).toBe(75);expect(g.items.some(p=>p.id===next+1)).toBe(false);
});


test('historical transport refuses only the new local inventory permission, on both original maps and retained-owner deltas',()=>{
 const pile={id:9,kind:'food',item:'berries',quantity:3,owner:{type:'inventory',pawnId:1}},local={pawns:[{id:1}],piles:[pile]};expect(validGroupForageHistoricalTransport256(local,255)).toBe(false);expect(validGroupForageHistoricalTransport256(local,256)).toBe(true);expect(validGroupForageHistoricalTransport256({pawns:[{id:1}],piles:[]},255,[pile])).toBe(false);expect(validGroupForageHistoricalTransport256({pawns:[],piles:[],worldMaps:{sites:[{id:1,map:local}]}},255)).toBe(false);expect(validGroupForageHistoricalTransport256({pawns:[],piles:[],secondarySite:{map:local}},255)).toBe(false);expect(validGroupForageHistoricalTransport256({...local,pawns:[{id:1,visitor:{}}]},255)).toBe(true);expect(validGroupForageHistoricalTransport256({...local,piles:[{...pile,owner:{type:'ground',x:0,z:0}}]},255)).toBe(true);expect(validGroupForageHistoricalTransport256({...local,piles:[{...pile,owner:{type:'pawn',pawnId:1}}]},255)).toBe(true);expect(validGroupForageHistoricalTransport256({...local,world:{}},255)).toBe(false);
});
