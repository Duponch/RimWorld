import {validateTrade} from '../src/sim/trade-save';
import {writeTestFileSync} from './test-output';
import {withWorldGroup} from '../src/sim/world-map-context';
import {harness as campaignHarness} from './helpers/group-admission-v412';
import {preparedMap} from './helpers/world-maps-v255';
import {validAncientMonumentState256} from '../src/sim/ancient-monument-save-256';
import {validGlowPodPacked256} from '../src/sim/cave-glowpod-minification-256';
import {validateFurniture} from '../src/sim/furniture-transfer-save';
import {expect,test} from 'vitest';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction';
import {addMaterial} from '../src/sim/materials';
import {emptyGroupLedger,previewGroupLoading,prepareGroupPickup,commitGroupPickup} from '../src/sim/group-loading';
import {groupFormationAuthority,groupSourceChoices} from '../src/sim/group-authority';
import {captureGroupMass,type PreparingGroup,type AwayGroup} from '../src/sim/group-capture';
import {newGroupFreight} from '../src/sim/group-freight';
import {groupFreightUnitMass258,groupPackedMassGrams258,regularGroupFreight258,regularGroupFreightItem258,validLoadedGroupFreight258} from '../src/sim/group-freight-contract-258';
import {newShelfStorage} from '../src/sim/shelf-storage';
import {captureProspectiveGroupMass256} from '../src/sim/group-caravan-mass-256';
import {previewGroupBedrollLoading256,commitGroupBedrollPickup256,validGroupBedrollLoading256} from '../src/sim/group-bedroll-loading-256';
import {validCaravanBedrollPacks256,canReturnGroupBedrolls256} from '../src/sim/group-bedroll-capture-256';
import {validatePackedFurnitureRecords} from '../src/sim/furniture-transfer-save';
import {draftSplitInventory,commitSplitInventory} from '../src/sim/group-inventory-reorganization';
import {openGroupReorganization,groupReorganizationBalance} from '../src/sim/group-reorganization-balance';
import {serializeWorld,deserializeWorld} from '../src/sim/serialization';
import {setMaterialForbidden256} from '../src/sim/material-permission-256';
import type {PackedFurniture} from '../src/sim/furniture-rules';
import {ITEM_DEFINITIONS,type ItemId} from '../src/sim/items';
import {validateGroupPackedComponents258} from '../src/sim/group-packed-components-258';
import {registerGroupThingIds} from '../src/sim/group-namespace-save';
import type {MaterialPile,World} from '../src/sim/types';

/** Prepared finite local possessions, no invented journey/loading/acquisition. */
function camp(){const w=deconstructionCamp(2);w.piles=[];w.structures=[];w.packed=[];return w;}
function pile(w:World,item:ItemId,quantity:number,owner?:MaterialPile['owner']):MaterialPile {
 const actual=owner??{type:'ground' as const,x:3+w.piles.length%8,z:5+Math.floor(w.piles.length/8)};
 addMaterial(w,ITEM_DEFINITIONS[item].kind,quantity,actual,item);return w.piles.at(-1)!;
}
function group(w:World):PreparingGroup {return {id:1,startedAt:w.tick,destination:1,phase:'loading',memberIds:w.pawns.map(p=>p.id),rendezvous:{x:3,z:4},meeting:[],manifest:[],cursor:0,exits:[],ledger:emptyGroupLedger(),freight:newGroupFreight(),travelPreparation:true};}
function pack(w:World,kind:PackedFurniture['building']['kind'],owner:PackedFurniture['owner'],x=220):PackedFurniture {
 const building=fixtureBuilding(w,kind,x,17);w.structures=w.structures.filter(s=>s!==building);
 const value:PackedFurniture={building,owner};w.packed.push(value);return value;
}

test('existing regular goods use verified grams; previous contracts and excluded unfinished/corpse remain closed',()=>{
 const w=camp();const facts:[ItemId,number][]=[['herbal-medicine',350],['medicine',500],['glitterworld-medicine',500],['component',600],['advanced-component',600],['gold',8],['plasteel',250],['light-leather',30],['granite-blocks',1250],['sandstone-chunk',20000],['revolver',1400],['cloth-shirt',300]];
 for(const [item,grams] of facts){const p=pile(w,item,1);expect(groupFreightUnitMass258(p,258),item).toBe(grams);expect(regularGroupFreight258(p,258),item).toBe(true);expect(regularGroupFreight258(p,257)).toBe(false);}
 expect(groupFreightUnitMass258(pile(w,'advanced-component',1),257)).toBeUndefined();
 for(const item of ['unfinished-shirt','legacy-chunk','human-corpse'] as const)expect(regularGroupFreightItem258(item,258)).toBe(false);
});

test('real preview admits medicines/components, applies the actual permission authority, and keeps source state unchanged',()=>{
 const w=camp(),a=pile(w,'medicine',2),b=pile(w,'advanced-component',3);setMaterialForbidden256(b,true);
 const authority=groupFormationAuthority(w),before=JSON.stringify(w);
 expect(groupSourceChoices(w).find(p=>p.pile===a)?.available).toBe(2);expect(groupSourceChoices(w).find(p=>p.pile===b)?.reason).toContain('interdit');
 expect(previewGroupLoading(w,w.pawns.map(p=>p.id),[{pileId:b.id,quantity:1}],authority).kind).toBe('refused');
 expect(previewGroupLoading(w,w.pawns.map(p=>p.id),[{pileId:a.id,quantity:2}],authority).kind).toBe('ready');expect(JSON.stringify(w)).toBe(before);
});

test('physical split pickups keep their receipt objects and final whole pickup keeps the original source ID',()=>{
 const w=camp();for(const p of w.pawns)pile(w,'steel',20,{type:'inventory',pawnId:p.id});const source=pile(w,'component',50),original=source.id;
 const preview=previewGroupLoading(w,w.pawns.map(p=>p.id),[{pileId:source.id,quantity:50}],groupFormationAuthority(w));expect(preview.kind).toBe('ready');if(preview.kind!=='ready')throw Error('Missing actual loading preview');expect(preview.manifest.length).toBeGreaterThan(1);
 const g=group(w);g.manifest=preview.manifest;w.worldGroups!.groups.push({originMapId:w.worldMaps!.rootMapId!,localMapId:w.worldMaps!.rootMapId!,context:{seed:w.seed,width:w.width,height:w.height},state:g});
 withWorldGroup(w,g.id,local=>{while(g.cursor<g.manifest.length){const line=g.manifest[g.cursor]!,p=local.pawns.find(p=>p.id===line.carrierId)!;if(source.owner.type!=='ground')throw Error('Remaining source lost its actual ground owner');Object.assign(p,{x:source.owner.x-1,z:source.owner.z,path:[],moveCooldown:0});delete p.motion;
  const prepared=prepareGroupPickup(local,g,groupFormationAuthority(local,true));if(prepared.kind!=='ready')writeTestFileSync('artifacts/freight-v413/refused-real-pickup.json',JSON.stringify({world:w,reason:prepared.reason}));expect(prepared.kind,JSON.stringify(prepared.kind==='refused'?prepared:{})).toBe('ready');if(prepared.kind!=='ready')throw Error('Missing contact plan');expect(commitGroupPickup(local,g,prepared.plan)).toBe(true);
 }});
 expect(g.manifest.at(-1)!.carriedPileId).toBe(original);expect(w.piles.find(p=>p.id===original)).toBe(source);expect(new Set(g.manifest.map(l=>l.carriedPileId)).size).toBe(g.manifest.length);
 const actual=()=>new Map(w.piles.map(p=>[p.id,p]));expect(validLoadedGroupFreight258(g,actual(),258)).toBe(true);
 const taken=w.piles.find(p=>p.id===g.manifest[0]!.carriedPileId)!;taken.quantity++;expect(validLoadedGroupFreight258(g,actual(),258)).toBe(false);taken.quantity--;
 const held=taken.owner;taken.owner={type:'ground',x:3,z:5};expect(validLoadedGroupFreight258(g,actual(),258)).toBe(false);taken.owner=held;
 expect(validLoadedGroupFreight258(g,actual(),258)).toBe(true);expect(w.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0)).toBe(50);
});

test('minified inner pose survives 250→200 entry and ground drop literally; old257 and current owner bounds remain strict',()=>{
 const w=camp(),p=pack(w,'table',{type:'inventory',pawnId:w.pawns[0]!.id}),header={width:200,height:200,tick:w.tick,nextId:w.nextId};
 const original=JSON.stringify(p.building);expect(validatePackedFurnitureRecords([p],header,258,new Set())).toEqual([]);expect(validatePackedFurnitureRecords([p],header,257,new Set()).length).toBeGreaterThan(0);
 expect(validCaravanBedrollPacks256([p],w.pawns,w.nextId,258,w.tick)).toBe(true);expect(validCaravanBedrollPacks256([p],w.pawns,w.nextId,257,w.tick)).toBe(false);
 const target={...w,width:200,height:200,packed:[],structures:[]};expect(canReturnGroupBedrolls256(target,[p],w.pawns)).toBe(true);
 p.owner={type:'ground',x:3,z:5};expect(validatePackedFurnitureRecords([p],header,258,new Set())).toEqual([]);expect(JSON.stringify(p.building)).toBe(original);
 p.owner={type:'ground',x:220,z:5};expect(validatePackedFurnitureRecords([p],header,258,new Set()).length).toBeGreaterThan(0);
 p.owner={type:'inventory',pawnId:w.pawns[0]!.id};p.building.orientation=9 as 0;expect(validatePackedFurnitureRecords([p],header,258,new Set()).length).toBeGreaterThan(0);
});

test('revision2 loads the same table at contact, rechecks changed capacity, and revision1 remains bedroll only',()=>{
 const w=camp(),p=w.pawns[0]!,table=pack(w,'table',{type:'ground',x:3,z:5}),mass=captureGroupMass(w.pawns,w.piles,true,258)!;
 const preview=previewGroupBedrollLoading256(w,[table.building.id],w.pawns,mass,()=> 'reachable');expect(preview.kind).toBe('ready');if(preview.kind!=='ready')throw Error('Missing furniture preview');expect(preview.preview.loading.revision).toBe(2);expect(preview.preview.mass.grams-mass.grams).toBe(5000);
 const g=group(w);g.bedrollLoading=preview.preview.loading;w.group=g;const carrier=w.pawns.find(a=>a.id===g.bedrollLoading!.manifest[0]!.carrierId)!;Object.assign(carrier,{x:3,z:4,path:[],moveCooldown:0});delete carrier.motion;
 expect(validGroupBedrollLoading256({...g.bedrollLoading,revision:1},w,g,258)).toBe(false);expect(validGroupBedrollLoading256(g.bedrollLoading,w,g,257)).toBe(false);
 const heavy=pile(w,'steel',70,{type:'inventory',pawnId:carrier.id});const before=JSON.stringify(table);expect(commitGroupBedrollPickup256(w,g,carrier)).toBe(false);expect(JSON.stringify(table)).toBe(before);
 w.piles=w.piles.filter(a=>a!==heavy);expect(commitGroupBedrollPickup256(w,g,carrier)).toBe(true);expect(table.owner).toEqual({type:'inventory',pawnId:carrier.id});expect(w.packed[0]).toBe(table);expect(table.building.x).toBe(220);
 const tooHeavy=pack(w,'double-bed',{type:'ground',x:4,z:5});expect(previewGroupBedrollLoading256(w,[tooHeavy.building.id],[p],captureGroupMass([p],[],true,258)!,()=> 'reachable').kind).toBe('refused');
});

test('capture, prospective mass and split sum real pack masses and keep original buildings and poses',()=>{
 const w=camp(),[a,b]=w.pawns,table=pack(w,'table-long',{type:'inventory',pawnId:a!.id}),bed=pack(w,'bed',{type:'inventory',pawnId:b!.id});
 expect(captureGroupMass(w.pawns,[],true,258,w.packed)?.grams).toBe(50000);expect(captureGroupMass(w.pawns,[],true,257,w.packed)).toBeUndefined();
 const g:AwayGroup={id:1,startedAt:w.tick,destination:1,phase:'stationary',members:w.pawns,items:[],packed:w.packed,departedAt:w.tick,lastPersonalTick:w.tick,baseline:{food:0,silver:0,cargo:{cloth:0,'muffalo-wool':0},medicine:0,component:0},entry:{x:3,z:4},tile:1,route:[1],segment:null,paused:false,stop:{kind:'stationary'},ledger:emptyGroupLedger(),freight:newGroupFreight()};
 expect(captureProspectiveGroupMass256(g,258)?.grams).toBe(50000);expect(groupPackedMassGrams258(bed,258)).toBe(30000);
 const bytes=JSON.stringify(w.packed),draft=draftSplitInventory(w.pawns,[],new Set([b!.id]),[],w.nextId,w.rng,w.tick,w.packed,[table.building.id],undefined,258);expect(draft).toBeDefined();expect(JSON.stringify(w.packed)).toBe(bytes);if(!draft)throw Error('Missing actual pack split');commitSplitInventory(draft);
 expect(draft.childPacked).toContain(table);expect(draft.sourcePacked).toContain(bed);expect([...draft.childPacked,...draft.sourcePacked].map(p=>p.building)).toEqual(expect.arrayContaining([table.building,bed.building]));expect(table.building.x).toBe(220);
 const context={seed:w.seed,width:w.width,height:w.height};g.reorganization=openGroupReorganization(g,[],w.tick,w.pawns.map(p=>({pawnId:p.id,originMapId:0,context})));expect(groupReorganizationBalance(g,g.reorganization,[])).toBe(true);
});

test('strict257 migration gives no freight, receipt, owner or draw and rejects future revision2 before migration',()=>{
 const f=campaignHarness(),other=preparedMap(f.w,52,'legacy-site',true),p=f.map.pawns[0]!,q=other.pawns[0]!;
 f.start([p]);f.command({type:'map-view',mapId:1});f.command({type:'group-start',originMapId:1,memberIds:[q.id],sources:[],destination:f.w.planet!.homeTile});
 const raw=JSON.parse(serializeWorld(f.w));raw.schemaVersion=257;const literal=JSON.stringify(raw);
 const copy=deserializeWorld(literal);expect(JSON.parse(serializeWorld(copy))).toEqual({...raw,schemaVersion:258});expect(copy.rng).toBe(f.w.rng);expect(copy.nextId).toBe(f.w.nextId);
 for(const row of [0,1]){const bad=JSON.parse(literal);bad.worldGroups.groups[row].state.bedrollLoading={revision:2,manifest:[]};expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/257/);}
 const badInventory=JSON.parse(literal),map=badInventory.worldMaps.sites[1].map;map.piles.push({id:badInventory.nextId++,item:'advanced-component',kind:'advanced-component',quantity:1,owner:{type:'inventory',pawnId:q.id}});expect(()=>deserializeWorld(JSON.stringify(badInventory))).toThrow(/257/);
 expect(JSON.stringify(raw)).toBe(literal);
});

test('original powered furniture and workbenches keep domain validation away from the map',()=>{
 const w=camp(),battery=pack(w,'battery',{type:'inventory',pawnId:w.pawns[0]!.id});
 battery.building.material='steel';battery.building.power={on:false,parentId:null};battery.building.battery={stored:123};
 expect(validateGroupPackedComponents258(w,[battery],258)).toEqual([]);
 battery.building.battery.stored=Number.MAX_SAFE_INTEGER;expect(validateGroupPackedComponents258(w,[battery],258).length).toBeGreaterThan(0);battery.building.battery.stored=123;
 battery.building.power.on=true;expect(validateGroupPackedComponents258(w,[battery],258).length).toBeGreaterThan(0);battery.building.power.on=false;
 battery.building.breakdown={brokenAt:w.tick+1};expect(validateGroupPackedComponents258(w,[battery],258,w.tick).length).toBeGreaterThan(0);delete battery.building.breakdown;
 const bench=pack(w,'stonecutter',{type:'inventory',pawnId:w.pawns[1]!.id});bench.building.material='wood';bench.building.bills=[];expect(validateGroupPackedComponents258(w,[bench],258)).toEqual([]);
 bench.building.bills=[{id:w.nextId++} as import('../src/sim/cooking-types').CookingBill];expect(validateGroupPackedComponents258(w,[bench],258).length).toBeGreaterThan(0);
});

test('global group namespace includes the original inner bill and shelf-cell owners',()=>{
 const w=camp(),bench=pack(w,'stonecutter',{type:'inventory',pawnId:w.pawns[0]!.id});
 const billId=w.nextId++;bench.building.bills=[{id:billId} as import('../src/sim/cooking-types').CookingBill];
 const shelf=pack(w,'shelf',{type:'inventory',pawnId:w.pawns[1]!.id}),cells=[w.nextId++,w.nextId++];shelf.building.material='wood';shelf.building.shelf=newShelfStorage(cells);
 const g:AwayGroup={id:1,startedAt:w.tick,destination:1,phase:'stationary',members:w.pawns,items:[],packed:[bench,shelf],departedAt:w.tick,lastPersonalTick:w.tick,baseline:{food:0,silver:0,cargo:{cloth:0,'muffalo-wool':0},medicine:0,component:0},entry:{x:3,z:4},tile:1,route:[1],segment:null,paused:false,stop:{kind:'stationary'},ledger:emptyGroupLedger()};w.group=g;
 const ids=new Set<number>();expect(registerGroupThingIds(w,ids)).toEqual([]);expect(ids.has(billId)).toBe(true);expect(ids.has(bench.building.id)).toBe(true);expect(cells.every(id=>ids.has(id))).toBe(true);
 const collision=new Set([billId]);expect(registerGroupThingIds(w,collision).length).toBeGreaterThan(0);
});

test('new freight inventories remain valid during local formation, cancellation and return without broadening old257',()=>{
 const w=camp(),p=w.pawns[0]!;for(const item of ['advanced-component','gold','plasteel'] as const)pile(w,item,1,{type:'inventory',pawnId:p.id});
 expect(validateTrade(w,258)).toEqual([]);expect(validateTrade(w,257)).toContain('Invalid inventory ownership.');
});

test('packed urn and GlowPod retain literal source pose while installed geometry and old257 stay bounded',()=>{
 const w=camp(),holder=w.pawns[0]!.id;
 const urn:PackedFurniture={building:{id:w.nextId++,kind:'urn',x:220,z:17,orientation:0,footprint:'standard',material:'steel'},owner:{type:'inventory',pawnId:holder}};
 const pod:PackedFurniture={building:{id:w.nextId++,kind:'glow-pod',x:221,z:17,orientation:0,footprint:'standard',factionId:null,glowPod:{revision:1,madeAtCore:0,ageCore:-1}},owner:{type:'inventory',pawnId:holder}};
 w.packed=[urn,pod];expect(validatePackedFurnitureRecords(w.packed,w,258,new Set())).toEqual([]);expect(validateFurniture(w,258,new Set())).toEqual([]);expect(validAncientMonumentState256(w,258)).toBe(true);expect(validGlowPodPacked256(pod.building,258,w)).toBe(true);
 expect(validAncientMonumentState256(w,257)).toBe(false);expect(validGlowPodPacked256(pod.building,257,w)).toBe(false);
 w.structures.push(urn.building);expect(validAncientMonumentState256(w,258)).toBe(false);w.structures=[];
 pod.owner={type:'ground',x:220,z:5};expect(validatePackedFurnitureRecords([pod],w,258,new Set()).length).toBeGreaterThan(0);
});
