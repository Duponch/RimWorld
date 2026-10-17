import {expect,test} from 'vitest';
import {registryCamp} from './helpers/world-maps-v255.ts';
import {registeredMap} from '../src/sim/world-map-context.ts';
import {prepareReformDeparture260,type ReformDepartureInput260} from '../src/sim/group-reform-departure-260.ts';
import {prepareReformRemovalAreas260} from '../src/sim/group-reform-removal-areas-260.ts';
import {prepareReformRetirementSurface260} from '../src/sim/group-reform-retirement-surface-260.ts';
import {areaRemovalWrites259} from '../src/sim/map-removal-writes-259.ts';
import {commitRemovedMapAreas} from '../src/sim/pawn-map-areas.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import type {AwayGroup} from '../src/sim/group-capture.ts';
import {planPawnDrops,planReformRemainingDrops260,planReformDrops260,planReformInventoryDrops260,reformHumanOrigin260} from '../src/sim/work-release.ts';
import {startTravel} from '../src/sim/movement.ts';
import {groupFormationAuthority} from '../src/sim/group-authority.ts';
import type {MaterialPile} from '../src/sim/types.ts';
/** Write-set unit fixture from the existing prepared registry. The deliberately
 * minimal private next record is NOT a saved caravan, full Reform admission,
 * played Camp retirement, or a migration proof. Full integration remains QA. */
function fixture(){const root=registryCamp();root.schemaVersion=260;const map=registeredMap(root,0)!,p=map.pawns[0]!;
 const next={id:root.planet!.nextGroupId,members:[p],items:[]} as unknown as AwayGroup,record={originMapId:0,localMapId:null,context:{seed:map.seed,width:map.width,height:map.height},state:next};
 const input:ReformDepartureInput260={people:[p],animals:[],captured:new Set(),drops:new Map(),inventoryDrops:new Map(),transfers:[],intrinsic:[],packs:[],packUpdates:[],next,record,nextId:root.nextId,mapId:0};
 return {root,map,p,next,record,input};}

test('prepare is read-only and consumed departure preserves original owner identities once',()=>{const f=fixture(),before=JSON.stringify(f.root),rng=f.root.rng,ids=f.root.nextId,oldPeople=f.map.pawns,plan=prepareReformDeparture260(f.map,f.input);
 expect(JSON.stringify(f.root)).toBe(before);expect(plan.current()).toBe(true);plan.begin();plan.commit();expect(f.next.members[0]).toBe(f.p);expect(f.map.pawns).not.toBe(oldPeople);expect(f.map.pawns).not.toContain(f.p);expect(f.root.worldGroups!.groups.at(-1)).toBe(f.record);expect(f.p.planCooldown).toBe(0);expect(f.p.bedId).toBe(null);expect(f.root.rng).toBe(rng);expect(f.root.nextId).toBe(ids);expect(()=>plan.commit()).toThrow();});

test('same-value health replacement invalidates the source before the first write',()=>{const f=fixture();f.p.health=createMedicalRecord(f.map.tick);const plan=prepareReformDeparture260(f.map,f.input),health=structuredClone(f.p.health);f.p.health=health;const before=JSON.stringify(f.root),pawns=f.map.pawns;
 expect(plan.current()).toBe(false);expect(()=>plan.begin()).toThrow();expect(JSON.stringify(f.root)).toBe(before);expect(f.map.pawns).toBe(pawns);expect(f.p.health).toBe(health);expect(f.root.worldGroups!.groups).toEqual([]);});

test('immutable assignment recipient refuses during preparation without source writes',()=>{const f=fixture();Object.freeze(f.p.orders);const before=JSON.stringify(f.root),pawns=f.map.pawns;expect(()=>prepareReformDeparture260(f.map,f.input)).toThrow();expect(JSON.stringify(f.root)).toBe(before);expect(f.map.pawns).toBe(pawns);});

test('partial freight keeps the actual source and publishes only its admitted fragment',()=>{const f=fixture(),source=f.map.piles.find(p=>p.item==='silver'&&p.owner.type==='ground')!,quantity=source.quantity,fragment=structuredClone(source),remaining=structuredClone(source);fragment.id=f.root.nextId;fragment.quantity=2;fragment.owner={type:'inventory',pawnId:f.p.id};remaining.quantity-=2;f.next.items=[fragment];f.input.transfers=[{original:source,next:remaining,fragment}];f.input.nextId++;
 const plan=prepareReformDeparture260(f.map,f.input);plan.begin();plan.commit();expect(f.map.piles.find(p=>p.id===source.id)).toBe(source);expect(source.quantity).toBe(quantity-2);expect(source.owner.type).toBe('ground');expect(f.next.items).toEqual([fragment]);expect(f.next.items[0]).toBe(fragment);expect(f.map.piles).not.toContain(fragment);expect(f.root.nextId).toBe(fragment.id+1);});

test('departure and removed-map areas are distinct exact phases on the same person',()=>{const f=fixture();f.p.mapAreas={revision:1,assignments:[{mapId:0,areaId:7}]};const plan=prepareReformDeparture260(f.map,f.input),areas=prepareReformRemovalAreas260(f.root,0,new Set([7]),plan),seal=plan.seal(areaRemovalWrites259(areas));expect(seal(0)).toBe(true);plan.begin();plan.commit();expect(seal(1)).toBe(false);commitRemovedMapAreas(areas);expect(seal(1)).toBe(true);expect(f.p.mapAreas!.assignments).toEqual([]);});

test('read-only retirement archive and replaced registry binding refuse BEFORE admission',()=>{const f=fixture(),before=JSON.stringify(f.root);Object.freeze(f.root.worldMaps!.retired);expect(()=>prepareReformRetirementSurface260(f.root,f.map,0,true)).toThrow();expect(JSON.stringify(f.root)).toBe(before);
 const g=fixture(),current=prepareReformRetirementSurface260(g.root,g.map,0,false);expect(current()).toBe(true);g.root.worldGroups!.events=[];expect(current()).toBe(false);expect(g.map.pawns).toContain(g.p);expect(g.root.worldGroups!.groups).toEqual([]);});

/** Tiny declared placement fixture only, not a valid saved Camp. The same two
 * actual carriers compete for the only empty slot; no runtime is preplayed. */
test('remaining MapRemoved carrier refuses the slot already admitted to the departing carrier BEFORE mutation',()=>{
 const f=fixture(),other=f.map.pawns[1]!;f.map.pawns=[f.p,other];f.map.width=3;f.map.height=1;f.map.tiles=Array.from({length:3},()=>({terrain:'grass' as const}));f.map.resources=[];f.map.structures=[];f.map.jobs=[];f.map.stockpiles=[];f.map.packed=[];
 Object.assign(f.p,{x:0,z:0,bedId:null});Object.assign(other,{x:2,z:0,bedId:null});
 const pile=(owner:MaterialPile['owner']):MaterialPile=>({id:f.root.nextId++,kind:'wood',item:'wood',quantity:1,owner});
 const first=pile({type:'pawn',pawnId:f.p.id}),second=pile({type:'pawn',pawnId:other.id});f.map.piles=[pile({type:'ground',x:0,z:0}),pile({type:'ground',x:2,z:0}),first,second];
 f.input.nextId=f.root.nextId;f.input.drops=new Map([[first.id,{x:1,z:0}]]);
 const ordinary=planPawnDrops(f.map,new Set([other.id]));expect(ordinary?.get(second.id)).toEqual({x:1,z:0});
 const departure=prepareReformDeparture260(f.map,f.input),before=JSON.stringify(f.map),roster=f.map.pawns,piles=f.map.piles;
 expect(planReformRemainingDrops260(f.map,new Set([other.id]),departure)).toBe(null);
 expect(departure.current()).toBe(true);expect(JSON.stringify(f.map)).toBe(before);expect(f.map.pawns).toBe(roster);expect(f.map.piles).toBe(piles);expect(first.owner).toEqual({type:'pawn',pawnId:f.p.id});expect(second.owner).toEqual({type:'pawn',pawnId:other.id});
});

/** Tiny declared physical/placement fixture, not an admitted saved Camp.
 * Movement itself is always the existing startTravel producer. */
function movingFixture(){
 const f=fixture();f.map.width=4;f.map.height=3;f.map.tiles=Array.from({length:12},()=>({terrain:'grass' as const}));f.map.pawns=[f.p];f.map.resources=[];f.map.structures=[];f.map.jobs=[];f.map.stockpiles=[];f.map.piles=[];f.map.packed=[];delete f.map.roofing;
 Object.assign(f.p,{x:1,z:1,bedId:null,motion:null,moveCooldown:0,path:[],state:'idle'});
 const from={x:f.p.x,z:f.p.z};expect(startTravel(f.map,f.p,{x:2,z:1})).toBe(true);f.p.state='moving';expect(f.p.motion!.end).toBeGreaterThan(f.map.tick);return {...f,from};
}
test('true engaged edge with work cargo and inventory remainder shares its occupied origin and sealed StopDead writes',()=>{
 const f=movingFixture(),work:MaterialPile={id:f.root.nextId++,kind:'wood',item:'wood',quantity:3,owner:{type:'pawn',pawnId:f.p.id}},left:MaterialPile={id:f.root.nextId++,kind:'silver',item:'silver',quantity:2,owner:{type:'inventory',pawnId:f.p.id}};f.map.piles=[work,left];f.input.nextId=f.root.nextId;
 const origins=new Map([[f.p.id,Object.freeze(reformHumanOrigin260(f.map,f.p))]]),drops=planReformDrops260(f.map,new Set([f.p.id]),new Set(),new Set(),origins);expect(drops?.get(work.id)).toEqual(f.from);if(!drops)throw Error('Actual work cargo has no admissible cell');
 const inventory=planReformInventoryDrops260(f.map,[left],[],drops,new Set(),origins);expect(inventory).not.toBeNull();if(!inventory)throw Error('Actual remainder has no admissible cell');expect(inventory.get(left.id)).not.toEqual({x:2,z:1});
 Object.assign(f.input,{humanOrigins:origins,drops,inventoryDrops:inventory});const before=JSON.stringify(f.root),rng=f.root.rng,plan=prepareReformDeparture260(f.map,f.input);expect(JSON.stringify(f.root)).toBe(before);expect(plan.valueAfter(f.p,'x')).toBe(f.from.x);expect(plan.valueAfter(f.p,'z')).toBe(f.from.z);
 plan.begin();plan.commit();expect(f.next.members[0]).toBe(f.p);expect({x:f.p.x,z:f.p.z}).toEqual(f.from);expect(f.p.motion).toBeUndefined();expect(f.p.path).toEqual([]);expect(f.p.moveCooldown).toBe(0);expect(work.owner).toEqual({type:'ground',...drops.get(work.id)!});expect(left.owner).toEqual({type:'ground',...inventory.get(left.id)!});expect(f.map.piles).toContain(work);expect(f.map.piles).toContain(left);expect(work.quantity).toBe(3);expect(left.quantity).toBe(2);expect(f.root.rng).toBe(rng);
});
test('actual actor permissions retain identity while Touch starts from occupied from, not the blocked future endpoint',()=>{
 const f=movingFixture(),origins=new Map([[f.p.id,reformHumanOrigin260(f.map,f.p)]]);
 // Declared obstruction appearing after the actual start, before admission.
 for(let z=0;z<3;z++)f.map.tiles[z*4+2]={terrain:'rock',stone:'granite'};
 const actual=groupFormationAuthority(f.map,false,origins),future=groupFormationAuthority(f.map),target={x:3,z:1},touch=[target,{x:2,z:1},{x:3,z:0},{x:3,z:2}];
 expect(touch.some(c=>actual.reachable(f.p,c))).toBe(false);expect(touch.some(c=>future.reachable(f.p,c))).toBe(true);expect(f.map.pawns[0]).toBe(f.p);expect(f.p.motion!.from).toEqual(f.from);
});
test('engaged segment or coordinate recipient changes refuse before any StopDead, departure or drop write',()=>{
 const f=movingFixture(),plan=prepareReformDeparture260(f.map,f.input);f.p.motion!.end+=1;const before=JSON.stringify(f.root);expect(plan.current()).toBe(false);expect(()=>plan.begin()).toThrow();expect(JSON.stringify(f.root)).toBe(before);expect(f.root.worldGroups!.groups).toEqual([]);
 const g=movingFixture();Object.defineProperty(g.p,'x',{value:g.p.x,enumerable:true,writable:false,configurable:true});const frozen=JSON.stringify(g.root);expect(()=>prepareReformDeparture260(g.map,g.input)).toThrow();expect(JSON.stringify(g.root)).toBe(frozen);expect(g.map.pawns).toContain(g.p);
});
