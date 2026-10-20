import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createWorld,applyCommand} from '../src/sim/engine.ts';
import {registeredMapPresentation} from '../src/sim/world-map-presentation.ts';
import {registeredMap} from '../src/sim/world-map-context.ts';
import {deserializeCampaign,deserializeWorld,serializeCampaign,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {newFermentationState265} from '../src/sim/fermentation-state-265.ts';
import {initialDrugPolicies265} from '../src/sim/alcohol-policy-265.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {validBrewingHistoricalTransport265} from '../src/sim/brewing-catalogue-save-265.ts';
import {orbitalBeerCount265,orbitalStock} from '../src/sim/orbital-stock.ts';
import {ARMOR_STUFFS267,isSmithingApparel267} from '../src/sim/smithing-apparel-267.ts';
import type {World,Structure} from '../src/sim/types.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';

function publicText(path:string):string {
 const text=readFileSync(new URL(`../public/test-saves/${path}`,import.meta.url),'utf8'),v=JSON.parse(text);
 return v.format==='lisiere-save'?gunzipSync(Buffer.from(v.payload,'base64')).toString('utf8'):text;
}
function old264(w:World):World {
 // Fresh current presets include prospective forge permissions. The explicit
 // historical witness must omit those before changing its schema number.
 if(w.apparelPolicies)w.apparelPolicies=w.apparelPolicies.map(p=>({...p,
  allowedItems:p.allowedItems.filter(i=>!isSmithingApparel267(i)),
  allowedMaterials:p.allowedMaterials.filter(m=>!(ARMOR_STUFFS267 as readonly string[]).includes(m))}));
 Object.assign(w,{schemaVersion:264});delete w.drugPolicies;delete w.nextDrugPolicyId;return w;
}

test('migrated absent drug registry stays absent in snapshots and a real edit shares its actual authority',()=>{
 const w=old264(createWorld(441,32,32)),migrated=deserializeWorld(JSON.stringify(w));
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const before=structuredClone(registeredMapPresentation(migrated)!);
 expect(Object.hasOwn(before,'drugPolicies')).toBe(false);expect(Object.hasOwn(before,'nextDrugPolicyId')).toBe(false);
 const first=decoder.adopt(structuredClone(encoder.encode(migrated,0,0)));expect(first.status).toBe('applied');
 if(first.status==='applied')expect(first.world).toEqual(before);
 const local=registeredMap(migrated,0)!;
 expect(applyCommand(local,{type:'drug-policy-create',name:'Règle partagée'}).ok).toBe(true);
 expect(migrated.drugPolicies?.map(p=>p.name)).toEqual(['Drogues sociales','Règle partagée']);
 const after=structuredClone(registeredMapPresentation(migrated)!);
 const second=decoder.adopt(structuredClone(encoder.encode(migrated,0,1)));expect(second.status).toBe('applied');
 if(second.status==='applied')expect(second.world).toEqual(after);
 expect(Object.hasOwn(before,'drugPolicies')).toBe(false);
 expect(serializeCampaign(deserializeCampaign(serializeCampaign(migrated)))).toBe(serializeCampaign(migrated));
});
test.each([
 ['Les Forges','v432/les-forges-crash-test.json'],
 ['Les Aulnes','v394/les-aulnes-integrees.json'],
 ['Les Éclaircies','v419/les-eclaircies.json'],
] as const)('%s: strict264 → current changes only the campaign number, all owners included',(name,path)=>{
 // A public older payload first takes its ordinary old migrations. This
 // explicit264 witness is not described as an originally published264 save.
 const witness=old264(deserializeWorld(publicText(path))),before=JSON.stringify(witness);
 const migrated=deserializeCampaign(before);
 expect(migrated.schemaVersion).toBe(SCHEMA_VERSION);
 expect(JSON.parse(serializeCampaign(migrated)),name).toEqual({...JSON.parse(before),schemaVersion:SCHEMA_VERSION});
 expect(JSON.stringify(witness)).toBe(before);
 expect(migrated).not.toHaveProperty('drugPolicies');expect(migrated).not.toHaveProperty('nextDrugPolicyId');
 expect(migrated.research).not.toHaveProperty('brewing');
},120_000);

test('new games have four editable presets;264 rejects every future brewing family before migration',()=>{
 const w=createWorld(441,32,32);expect(w.drugPolicies).toEqual(initialDrugPolicies265());
 expect(validateWorld(w)).toEqual([]);
 const old=old264(structuredClone(w)),base=JSON.stringify(old);
 expect(()=>deserializeWorld(base)).not.toThrow();
 const building:Structure={id:old.nextId,kind:'fermenting-barrel',x:8,z:8,orientation:0,footprint:'standard',material:'wood',fermentation:newFermentationState265()};
 const mutants:readonly [string,(v:World)=>void][]=[
  ['registry',v=>{v.drugPolicies=initialDrugPolicies265();v.nextDrugPolicyId=5;}],
  ['assignment',v=>{v.pawns[0]!.drugPolicyId=1;}],
  ['clinical',v=>{Object.assign(v.pawns[0]!,{health:{...(v.pawns[0]!.health??{}),alcohol:{}}});} ],
  ['building',v=>{v.structures.push(structuredClone(building));v.nextId++;}],
  ['packed',v=>{v.packed.push({building:structuredClone(building),owner:{type:'ground',x:8,z:8}});v.nextId++;}],
  ['hops',v=>{v.piles.push({id:v.nextId++,item:'hops',kind:'food',quantity:1,owner:{type:'ground',x:8,z:8},rot:{progress:0,atTick:v.tick}});}],
  ['beer',v=>{v.piles.push({id:v.nextId++,item:'beer',kind:'beer',quantity:1,owner:{type:'ground',x:8,z:8}});}],
  ['wort',v=>{v.piles.push({id:v.nextId++,item:'wort',kind:'wort',quantity:1,owner:{type:'ground',x:8,z:8},rot:{progress:0,atTick:v.tick}});}],
  ['crop',v=>{v.resources.push({id:v.nextId++,kind:'hops',x:8,z:8,amount:8,growth:0,growthTick:v.tick});}],
  ['research',v=>{v.research??={points:0,project:null};v.research.brewing={points:0};}],
  ['bill',v=>{v.structures.push({...building,id:v.nextId++,kind:'brewery',bills:[newCookingBill(v.nextId++,'brew-wort')]});}],
  ['spoilage',v=>{v.spoiled.wort=1;}],
  ['deconstruction',v=>{v.deconstructed.lostWort=1;}],
 ];
 for(const [name,mutate] of mutants){const v=JSON.parse(base) as World;mutate(v);const unchanged=JSON.stringify(v);expect(()=>deserializeWorld(unchanged),name).toThrow();expect(JSON.stringify(v),name).toBe(unchanged);}
 expect(JSON.stringify(old)).toBe(base);
 expect(validBrewingHistoricalTransport265({schemaVersion:264,piles:{upserted:[{item:'beer'}]}},264)).toBe(false);
});

test('an installed or minified partial barrel survives the full save boundary and same-tick snapshots',()=>{
 const w=createWorld(441,32,32);w.resources=w.resources.filter(r=>r.x!==8||r.z!==8);w.tiles[8*w.width+8]={terrain:'grass'};
 const s:Structure={id:w.nextId++,kind:'fermenting-barrel',x:8,z:8,orientation:2,footprint:'standard',material:'wood',fermentation:{wort:17,progress:Math.fround(.4),ruin:Math.fround(.1)}};w.structures.push(s);
 expect(validateWorld(w)).toEqual([]);expect(JSON.parse(serializeWorld(deserializeWorld(serializeWorld(w))))).toEqual(JSON.parse(serializeWorld(w)));
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=structuredClone(encoder.encode(w,0,0));
 expect(first.kind).toBe('checkpoint');expect(decoder.adopt(first).status).toBe('applied');const retained=JSON.stringify(first);
 s.fermentation!.progress=Math.fround(.5);const delta=structuredClone(encoder.encode(w,0,0));expect(delta.kind).toBe('delta');
 const adopted=decoder.adopt(delta);expect(adopted.status).toBe('applied');if(adopted.status==='applied')expect(adopted.world.structures.find(p=>p.id===s.id)?.fermentation).toEqual(s.fermentation);
 expect(JSON.stringify(first)).toBe(retained);
 w.structures=w.structures.filter(p=>p!==s);w.packed.push({building:s,owner:{type:'ground',x:8,z:8}});
 expect(validateWorld(w)).toEqual([]);expect(JSON.parse(serializeWorld(deserializeWorld(serializeWorld(w))))).toEqual(JSON.parse(serializeWorld(w)));
 const missing=structuredClone(w);delete missing.packed[0]!.building.fermentation;expect(()=>deserializeWorld(JSON.stringify(missing))).toThrow();
});

test('bulk orbital beer is prospective, priced stock; a zero draw gives no object or identity',()=>{
 expect([0,70/270,1].map(orbitalBeerCount265)).toEqual([0,0,17]);
 const w=createWorld(441,32,32),ship={id:w.nextId++,kind:'bulk' as const,name:'Préparé',arrivedAt:0,departAt:4000,announced:true};
 const old=old264(structuredClone(w)),state={rng:42},before=old.nextId;
 const oldStock=orbitalStock(old,ship,state);expect(oldStock.every(p=>p.item!=='beer')).toBe(true);expect(old.nextId-before).toBe(oldStock.length);
 const current=structuredClone(w),newState={rng:42},stock=orbitalStock(current,ship,newState);
 expect(stock.filter(p=>p.item!=='beer')).toEqual(oldStock);expect(stock.filter(p=>p.item==='beer').every(p=>p.kind==='beer'&&p.quantity<=25&&p.owner.type==='orbital-ship')).toBe(true);
 expect(newState.rng).not.toBe(state.rng);
});
