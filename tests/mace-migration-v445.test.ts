import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserializeCampaign,deserializeWorld,serializeCampaign,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {validMaceHistoricalTransport269} from '../src/sim/catalogue-save-269.ts';
import {validSmithingWorkShape267} from '../src/sim/smithing-save-267.ts';
import {validWeaponShape} from '../src/sim/equipment-save.ts';
import {MACE_ITEMS_269} from '../src/sim/mace-content-269.ts';
import {MACE_TOOL_IDS_269} from '../src/sim/mace-combat-269.ts';
import {newCookingBill,validBillSettings} from '../src/sim/cooking-bills.ts';
import {newWeaponState} from '../src/sim/equipment-rules.ts';
import {validSmeltingProduct} from '../src/sim/smelting-rules.ts';
import {newBuildingFuel} from '../src/sim/fuel.ts';
import {validCraftingFuelDestination269,validCraftingFuelTransport269} from '../src/sim/fuel-purpose-save-269.ts';
import {addMaterial,addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {registryCamp,preparedMap} from './helpers/world-maps-v255.ts';
import {reorganizationCamp256} from './helpers/group-reorganization-v256.ts';
import {foodWorkstationCamp} from './scenarios/food-workstations.ts';
import {SCHEMA_VERSION,type MaterialPile,type World,type HaulTask,type Structure} from '../src/sim/types.ts';

const REFERENCES=[['Les Forges','v432/les-forges-crash-test.json'],['Les Aulnes','v394/les-aulnes-integrees.json'],['Les Éclaircies','v419/les-eclaircies.json']] as const;
function publicPayload(path:string):string {
 const text=readFileSync(new URL(`../public/test-saves/${path}`,import.meta.url),'utf8'),envelope=JSON.parse(text) as Record<string,unknown>;
 if(envelope.format!=='lisiere-save')return text;
 if(envelope.version!==1||envelope.codec!=='gzip-base64'||typeof envelope.payload!=='string')throw Error('Unexpected public envelope');
 const bytes=gunzipSync(Buffer.from(envelope.payload,'base64'));expect(bytes.length).toBe(envelope.uncompressedBytes);return bytes.toString('utf8');
}
const historical=(w:World):string=>JSON.stringify({...w,schemaVersion:268});
const maceWork=(w:World):MaterialPile=>({id:w.nextId++,item:'unfinished-mace',kind:'unfinished',quantity:1,owner:{type:'ground',x:5,z:5},
 smithingWork:{recipe:'make-mace',material:'uranium',authorId:w.pawns[0]!.id,progress:100,parts:[{item:'uranium',quantity:50}]}});
const knifeWork=(w:World):MaterialPile=>({id:w.nextId++,item:'unfinished-knife',kind:'unfinished',quantity:1,owner:{type:'ground',x:6,z:5},
 smithingWork:{recipe:'make-plasteel-knife',material:'plasteel',authorId:w.pawns[0]!.id,progress:100,parts:[{item:'plasteel',quantity:30}]}});

test.each(REFERENCES)('%s migrates a strict whole268 witness to the current schema without adding permissions, goods, history or progress',(label,path)=>{
 // Public files predate268. Their ordinary migrations establish this explicit
 // historical witness; neither those files nor their named archives are edited.
 const w=deserializeWorld(publicPayload(path)),text=historical(w),before=JSON.parse(text),copy=deserializeCampaign(text);
 expect(w.schemaVersion).toBe(SCHEMA_VERSION);expect(copy.schemaVersion).toBe(SCHEMA_VERSION);expect(validateWorld(copy)).toEqual([]);
 expect(JSON.parse(serializeCampaign(copy)),label).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(historical(w)).toBe(text);
},120000);

test('268 keeps the finished knife and its paid work, while old smelting filters stay absent and future outputs remain refused',()=>{
 const w=registryCamp();addMaterial(w,'weapon',1,{type:'ground',x:4,z:4},'plasteel-knife');w.piles.push(knifeWork(w));
 const text=historical(w),copy=deserializeWorld(text);expect(JSON.parse(serializeCampaign(copy))).toEqual({...JSON.parse(text),schemaVersion:SCHEMA_VERSION});
 expect(copy.piles).toEqual(w.piles);expect(validMaceHistoricalTransport269(w,268)).toBe(true);
 expect(validWeaponShape(w.piles.find(q=>q.item==='plasteel-knife')! as unknown as Record<string,unknown>,268)).toBe(true);
 const bill=newCookingBill(500,'smelt-weapon',268),before=structuredClone(bill);
 expect(MACE_ITEMS_269.every(item=>!Object.hasOwn(bill.filters,item))).toBe(true);
 expect(validBillSettings(bill,bill.recipe,268)).toBe(true);expect(validBillSettings(bill,bill.recipe,269)).toBe(true);expect(bill).toEqual(before);
 for(const item of MACE_ITEMS_269)expect(validBillSettings({...bill,filters:{...bill.filters,[item]:false}},bill.recipe,268)).toBe(false);
 for(const [item,quantity] of [['plasteel',13],['gold',125],['uranium',13],['silver',125]] as const){expect(validSmeltingProduct(item,quantity,'smelt-weapon',268)).toBe(false);expect(validSmeltingProduct(item,quantity,'smelt-weapon',269)).toBe(true);}
 expect(validSmeltingProduct('plasteel',8,'smelt-weapon',268)).toBe(true);expect(validSmeltingProduct('steel',19,'smelt-weapon',268)).toBe(true);
 const raw=JSON.parse(text);raw.schemaVersion=SCHEMA_VERSION+1;expect(()=>deserializeCampaign(JSON.stringify(raw))).toThrow();expect(validMaceHistoricalTransport269(raw,SCHEMA_VERSION+1)).toBe(false);
});

test('268 refuses six products, the recipe, workpiece, twelve recovery tools and hidden permissions across true owning domains',()=>{
 const {w,g}=reorganizationCamp256(),control=historical(w);
 expect(JSON.parse(serializeCampaign(deserializeCampaign(control)))).toEqual({...JSON.parse(control),schemaVersion:SCHEMA_VERSION});
 const check=(label:string,mutate:(v:World)=>void)=>{const bad=JSON.parse(control) as World;mutate(bad);const text=JSON.stringify(bad);expect(validMaceHistoricalTransport269(bad,268),label).toBe(false);expect(()=>deserializeCampaign(text),label).toThrow();expect(JSON.stringify(bad)).toBe(text);expect(historical(w)).toBe(control);};
 for(const item of MACE_ITEMS_269){
  check(item,v=>v.piles.push({id:v.nextId++,item,kind:'weapon',quantity:1,owner:{type:'ground',x:4,z:4},weapon:newWeaponState(item)}));
  check(`${item} false filter`,v=>{v.structures[0]!.bills=[{...newCookingBill(v.nextId++,'smelt-weapon',268),filters:{[item]:false}}];});
 }
 for(const tool of MACE_TOOL_IDS_269)check(tool,v=>{v.pawns[0]!.melee={order:null,strike:{targetId:null,atCore:v.tick*10,untilCore:v.tick*10+(tool.startsWith('plasteel-')?96:tool.startsWith('uranium-')?132:120),tool,outcome:'miss'}};});
 check('new work',v=>v.piles.push(maceWork(v)));
 check('new recipe on existing station',v=>{v.structures[0]!.bills=[newCookingBill(v.nextId++,'make-mace')];});
 check('queued work',v=>{v.pawns[0]!.orders.queue.push({cooking:{recipe:'make-mace'}} as never);});
 check('away original possession',v=>{const row=v.worldGroups!.groups.find(r=>r.state.id===g.id)!.state;if(!('members'in row))throw Error('Missing actual away owner');row.items.push({id:v.nextId++,item:'steel-mace',kind:'weapon',quantity:1,owner:{type:'inventory',pawnId:row.members[0]!.id},weapon:newWeaponState('steel-mace')});});
 check('false stockpile workpiece filter',v=>{Object.assign(v,{stockpiles:[{id:v.nextId++,x:4,z:4,items:{'unfinished-mace':false}}]});});
 check('historical item ledger',v=>{v.destroyed={count:0,lost:{},items:{'gold-mace':1}};});
});

test('268 future products and recovery are rejected in inactive maps and immutable checkpoint/delta predecessors',()=>{
 const w=registryCamp();preparedMap(w,52,'legacy-site',false);const control=historical(w),bad=JSON.parse(control) as World;
 const map=bad.worldMaps!.sites.find(s=>s.map)!.map!;map.piles.push({id:bad.nextId++,item:'wood-mace',kind:'weapon',quantity:1,owner:{type:'ground',x:4,z:4},weapon:newWeaponState('wood-mace')});
 expect(validMaceHistoricalTransport269(bad,268)).toBe(false);expect(()=>deserializeCampaign(JSON.stringify(bad))).toThrow();expect(historical(w)).toBe(control);
 const old=JSON.parse(control) as World,encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),packet=structuredClone(encoder.encode(old,0,0)),first=decoder.adopt(packet);
 expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Valid268 checkpoint refused');const retained=structuredClone(first.world);
 old.piles.push(maceWork(old));const delta=structuredClone(encoder.encode(old,0,0));expect(delta.kind).toBe('delta');expect(decoder.adopt(delta).status).toBe('resync');expect(first.world).toEqual(retained);
 const full=structuredClone(packet);if(full.kind!=='checkpoint')throw Error('Expected full checkpoint');full.world.pawns[0]!.melee={order:null,strike:{targetId:null,atCore:w.tick*10,untilCore:w.tick*10+132,tool:'uranium-mace-head',outcome:'miss'}};
 expect(new SnapshotDecoder().adopt(full).status).toBe('resync');expect(first.world).toEqual(retained);
});

test('269 admits same-tick work and WeaponState in matching public/resident projections and rejects malformed receipts transactionally',()=>{
 // Prepared wire states only; acquisition and work are played by the separate
 // finite-stock production pilot. No gameplay transaction is claimed here.
 const w=registryCamp(),encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),strict=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const send=(checkpoint=false)=>{const packet=structuredClone(encoder.encode(w,0,0,checkpoint)),a=strict.adopt(structuredClone(packet)),b=resident.adopt(packet);expect(a.status).toBe('applied');expect(b.status).toBe('applied');if(a.status!=='applied'||b.status!=='applied')throw Error('Valid269 projection refused');expect(b.world).toEqual(a.world);return {world:a.world,resident:b.world,packet};};
 const first=send(),original=structuredClone(first.world),residentOriginal=structuredClone(first.resident),q=maceWork(w);w.piles.push(q);
 const saved=serializeWorld(w),delta=structuredClone(encoder.encode(w,0,0));expect(delta.kind).toBe('delta');
 for(const [label,mutate] of [
  ['mixed material',(p:MaterialPile)=>{p.smithingWork!.parts[0]!.item='steel';}],
  ['wrong quota',(p:MaterialPile)=>{p.smithingWork!.parts[0]!.quantity=49;}],
  ['excess work',(p:MaterialPile)=>{p.smithingWork!.progress=11_400_001;}],
  ['wrong identity',(p:MaterialPile)=>{p.item='unfinished-knife';}],
  ['unexpected weapon state',(p:MaterialPile)=>{p.weapon=newWeaponState('uranium-mace');}],
 ] as const){
  const bad=structuredClone(delta);if(bad.kind!=='delta'||!bad.piles)throw Error('Expected actual work delta');mutate(bad.piles.upserted.find(p=>p.id===q.id)!);
  expect(strict.adopt(bad).status,label).toBe('resync');expect(first.world,label).toEqual(original);
  const raw=JSON.parse(saved) as World;mutate(raw.piles.find(p=>p.id===q.id)!);expect(()=>deserializeCampaign(JSON.stringify(raw)),label).toThrow();
 }
 const accepted=strict.adopt(structuredClone(delta)),displayed=resident.adopt(delta);expect(accepted.status).toBe('applied');expect(displayed.status).toBe('applied');if(accepted.status!=='applied'||displayed.status!=='applied')throw Error('Valid work delta refused');expect(displayed.world).toEqual(accepted.world);
 expect(validSmithingWorkShape267(q as unknown as Record<string,unknown>,269)).toBe(true);expect(validSmithingWorkShape267(q as unknown as Record<string,unknown>,268)).toBe(false);
 const paid=structuredClone(accepted.world);w.piles=w.piles.filter(p=>p.id!==q.id);const product:MaterialPile={id:w.nextId++,item:'uranium-mace',kind:'weapon',quantity:1,owner:{type:'ground',x:5,z:5},weapon:newWeaponState('uranium-mace')};w.piles.push(product);
 const finished=send();expect(finished.packet.kind).toBe('delta');expect(finished.world.tick).toBe(first.world.tick);expect(finished.world.piles.find(p=>p.id===product.id)).toEqual(product);expect(finished.world.piles.some(p=>p.id===q.id)).toBe(false);
 expect(first.world).toEqual(original);expect(first.resident).toEqual(residentOriginal);expect(accepted.world).toEqual(paid);
 const bytes=serializeWorld(w),replacement=deserializeWorld(bytes);expect(serializeWorld(replacement)).toBe(bytes);const full=structuredClone(encoder.encode(replacement,0,0,true));expect(full.kind).toBe('checkpoint');expect(strict.adopt(structuredClone(full)).status).toBe('applied');expect(resident.adopt(full).status).toBe('applied');
});

test('paid old268 knife work resumes through the ordinary physical pipeline after neutral269 migration',()=>{
 const w=foodWorkstationCamp(),p=w.pawns[0]!;w.deterioration!.lastTick=w.tick;if(w.fires)w.fires.clockCore=w.tick*10;
 delete p.background;delete p.traits;p.priorities.craft=1;p.recreation.level=100;p.skills.crafting={level:0,xp:0,dailyXp:0,passion:0};w.research={project:null,points:0};
 expect(applyCommand(w,{type:'designate',kind:'crafting-spot',x:10,z:7}).ok).toBe(true);const station=w.structures.find(s=>s.kind==='crafting-spot')!;
 addGroundMaterial(w,'plasteel',30,{x:16,z:7});addGroundMaterial(w,'food',5,{x:3,z:5},'survival-meal');refreshStock(w);
 expect(applyCommand(w,{type:'bill-add',structureId:station.id,recipe:'make-plasteel-knife'}).ok).toBe(true);
 for(let n=0;n<3000&&!w.piles.some(q=>q.smithingWork?.progress);n++)stepWorld(w);
 const paid=w.piles.find(q=>q.item==='unfinished-knife');expect(paid?.smithingWork?.progress).toBeGreaterThan(0);const text=historical(w),copy=deserializeWorld(text);
 expect(JSON.parse(serializeWorld(copy))).toEqual({...JSON.parse(text),schemaVersion:SCHEMA_VERSION});expect(copy.piles.find(q=>q.id===paid!.id)?.smithingWork).toEqual(paid!.smithingWork);
 const start=w.tick;for(let n=0;n<2000&&p.cooking?.phase!=='output';n++)stepWorld(w);expect(p.cooking?.phase).toBe('output');stepWorld(copy,w.tick-start);
 expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(validateWorld(w)).toEqual([]);expect(w.piles.filter(q=>q.item==='plasteel-knife')).toHaveLength(1);expect(w.piles.some(q=>q.id===paid!.id)).toBe(false);
 expect(w.piles.some(q=>MACE_ITEMS_269.includes(q.item as typeof MACE_ITEMS_269[number])||q.item==='unfinished-mace')).toBe(false);
});

/** Declared queue/transport fixture: installed forge, finite wood and an
 * accepted waiting reservation. The production pilot plays the real refuel. */
function fuelQueueFixture(){
 const w=foodWorkstationCamp(),p=w.pawns[0]!;w.deterioration!.lastTick=w.tick;if(w.fires)w.fires.clockCore=w.tick*10;
 delete p.background;delete p.traits;p.recreation.level=100;p.priorities.craft=1;p.priorities.cook=0;p.priorities.haul=0;
 const station:Structure={id:w.nextId++,kind:'fueled-smithy',x:10,z:7,orientation:0,footprint:'standard',material:'steel',fuel:newBuildingFuel('fueled-smithy'),bills:[]};w.structures.push(station);
 addGroundMaterial(w,'wood',20,{x:4,z:6});refreshStock(w);const source=w.piles.find(q=>q.item==='wood')!;
 const task:HaulTask={sourcePileId:source.id,quantity:10,phase:'pickup',carryPileId:null,destination:{type:'fuel',structureId:station.id,forced:true}};
 p.orders.queue.push(task);expect(validateWorld(w)).toEqual([]);return {w,p,station,task};
}

test('new269 queued crafting fuel has a closed exclusive purpose and a true forge while old cooking fuel stays literal',()=>{
 const {w,task}=fuelQueueFixture(),destination=task.destination;
 if(destination.type!=='fuel')throw Error('Expected real queued fuel destination');destination.forCrafting=true;
 expect(validCraftingFuelDestination269(destination as unknown as Record<string,unknown>,269)).toBe(true);
 expect(validCraftingFuelTransport269(w,269)).toBe(true);expect(validateWorld(w)).toEqual([]);
 const text=serializeWorld(w);expect(serializeWorld(deserializeWorld(text))).toBe(text);
 const competing=JSON.parse(text) as World;competing.pawns[0]!.orders.queue.push(structuredClone(task));
 expect(validCraftingFuelTransport269(competing,269)).toBe(false); // another order of the same actor still reserves the forge
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(first.status).toBe('applied');
 if(first.status!=='applied')throw Error('Valid queued crafting fuel refused');const retained=structuredClone(first.world);
 for(const [label,change] of [
  ['both purposes',{forCrafting:true,forCooking:true}],['false legacy purpose still conflicts',{forCrafting:true,forCooking:false}],
  ['false new purpose',{forCrafting:false}],['missing purpose value',{forCrafting:undefined}],['wrong destination',{type:'hopper',forCrafting:true}],
 ] as const){
  const malformed={...destination,...change};expect(validCraftingFuelDestination269(malformed,269),label).toBe(false);
  const bad=JSON.parse(text) as World,queued=bad.pawns[0]!.orders.queue[0] as HaulTask;Object.assign(queued.destination,change);
  expect(validCraftingFuelTransport269(bad,269),label).toBe(false);
  if(change.forCrafting!==undefined)expect(()=>deserializeCampaign(JSON.stringify(bad)),label).toThrow();
  expect(first.world).toEqual(retained);
 }
 const wrong=JSON.parse(text) as World;wrong.structures.find(s=>s.id===destination.structureId)!.kind='campfire';expect(validCraftingFuelTransport269(wrong,269)).toBe(false);
 expect(validCraftingFuelDestination269({type:'fuel',structureId:1,forCooking:false},268)).toBe(true);
});

test('268 refuses even false crafting fuel markers in files, queued checkpoints and same-tick deltas before migration',()=>{
 const {w}=fuelQueueFixture(),control=historical(w);expect(JSON.parse(serializeWorld(deserializeWorld(control)))).toEqual({...JSON.parse(control),schemaVersion:SCHEMA_VERSION});
 for(const value of [true,false]){
  const bad=JSON.parse(control) as World,task=bad.pawns[0]!.orders.queue[0] as HaulTask;Object.assign(task.destination,{forCrafting:value});const text=JSON.stringify(bad);
  expect(validMaceHistoricalTransport269(bad,268)).toBe(false);expect(()=>deserializeCampaign(text)).toThrow();expect(JSON.stringify(bad)).toBe(text);
 }
 const old=JSON.parse(control) as World,encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),full=structuredClone(encoder.encode(old,0,0)),first=decoder.adopt(full);
 expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Valid old fuel queue refused');const retained=structuredClone(first.world);
 Object.assign((old.pawns[0]!.orders.queue[0] as HaulTask).destination,{forCrafting:true});const delta=structuredClone(encoder.encode(old,0,0));expect(delta.kind).toBe('delta');
 expect(decoder.adopt(delta).status).toBe('resync');expect(first.world).toEqual(retained);
 const forged=structuredClone(full);if(forged.kind!=='checkpoint')throw Error('Expected full fuel queue checkpoint');Object.assign((forged.world.pawns[0]!.orders.queue[0] as HaulTask).destination,{forCrafting:false});
 expect(new SnapshotDecoder().adopt(forged).status).toBe('resync');expect(first.world).toEqual(retained);expect(historical(w)).toBe(control);
});
