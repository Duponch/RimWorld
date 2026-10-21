import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserializeCampaign,deserializeWorld,serializeCampaign,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {validLongswordHistoricalTransport270} from '../src/sim/catalogue-save-270.ts';
import {validSmithingWorkShape267} from '../src/sim/smithing-save-267.ts';
import {validWeaponShape} from '../src/sim/equipment-save.ts';
import {LONGSWORD_ITEMS_270} from '../src/sim/longsword-content-270.ts';
import {LONGSWORD_TOOL_IDS_270} from '../src/sim/longsword-combat-270.ts';
import {MACE_ITEMS_269} from '../src/sim/mace-content-269.ts';
import {newCookingBill,validBillSettings} from '../src/sim/cooking-bills.ts';
import {newWeaponState} from '../src/sim/equipment-rules.ts';
import {meleeRecoveryCore} from '../src/sim/melee-statistics.ts';
import {validSmeltingProduct} from '../src/sim/smelting-rules.ts';
import {newBuildingFuel} from '../src/sim/fuel.ts';
import {ensureFireState} from '../src/sim/fire-rules.ts';
import {validCraftingFuelTransport269} from '../src/sim/fuel-purpose-save-269.ts';
import {researchCost} from '../src/sim/research.ts';
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
const historical=(w:World):string=>JSON.stringify({...w,schemaVersion:269});
const knifeWork=(w:World):MaterialPile=>({id:w.nextId++,item:'unfinished-knife',kind:'unfinished',quantity:1,owner:{type:'ground',x:6,z:5},smithingWork:{recipe:'make-plasteel-knife',material:'plasteel',authorId:w.pawns[0]!.id,progress:100,parts:[{item:'plasteel',quantity:30}]}});
const maceWork=(w:World):MaterialPile=>({id:w.nextId++,item:'unfinished-mace',kind:'unfinished',quantity:1,owner:{type:'ground',x:7,z:5},smithingWork:{recipe:'make-mace',material:'uranium',authorId:w.pawns[0]!.id,progress:100,parts:[{item:'uranium',quantity:50}]}});
const swordWork=(w:World):MaterialPile=>({id:w.nextId++,item:'unfinished-longsword',kind:'unfinished',quantity:1,owner:{type:'ground',x:5,z:5},smithingWork:{recipe:'make-longsword',material:'uranium',authorId:w.pawns[0]!.id,progress:100,parts:[{item:'uranium',quantity:75},{item:'uranium',quantity:25}]}});
function until(w:World,done:()=>boolean,limit=3000){for(let i=0;i<limit&&!done();i++)stepWorld(w);expect(done(),JSON.stringify({tick:w.tick,pawn:w.pawns[0]!.state,cooking:w.pawns[0]!.cooking,haul:w.pawns[0]!.haul})).toBe(true);expect(validateWorld(w)).toEqual([]);}

test.each(REFERENCES)('%s migrates a strict whole269 witness by number alone without creating research, goods, history or progress',(label,path)=>{
 // Reuse the same three immutable public payloads and ordinary migrations as
 // V445. The explicit269 witness is validated before neutral270 migration.
 const w=deserializeWorld(publicPayload(path)),text=historical(w),before=JSON.parse(text),copy=deserializeCampaign(text);
 expect(w.schemaVersion).toBe(SCHEMA_VERSION);expect(copy.schemaVersion).toBe(SCHEMA_VERSION);expect(validateWorld(copy)).toEqual([]);
 expect(JSON.parse(serializeCampaign(copy)),label).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(historical(w)).toBe(text);
 expect(copy.research?.longBlades).toBeUndefined();
},120000);

test('269 retains all old maces, knife, paid receipts and smelting limits without inserting new filter permissions',()=>{
 const w=registryCamp();addMaterial(w,'weapon',1,{type:'ground',x:4,z:4},'plasteel-knife');
 for(const [i,item] of MACE_ITEMS_269.entries())addMaterial(w,'weapon',1,{type:'ground',x:4+i,z:6},item);
 w.research??={project:null,points:0};w.research.smithing={points:researchCost('smithing'),completedAt:w.tick};w.piles.push(knifeWork(w),maceWork(w));
 const text=historical(w),copy=deserializeWorld(text);expect(JSON.parse(serializeCampaign(copy))).toEqual({...JSON.parse(text),schemaVersion:SCHEMA_VERSION});expect(copy.piles).toEqual(w.piles);
 for(const pile of w.piles.filter(q=>q.kind==='weapon'))expect(validWeaponShape(pile as unknown as Record<string,unknown>,269)).toBe(true);
 const bill=newCookingBill(500,'smelt-weapon',269),before=structuredClone(bill);
 expect(LONGSWORD_ITEMS_270.every(item=>!Object.hasOwn(bill.filters,item))).toBe(true);expect(MACE_ITEMS_269.filter(item=>item!=='wood-mace').every(item=>bill.filters[item]===false)).toBe(true);
 expect(validBillSettings(bill,bill.recipe,269)).toBe(true);expect(validBillSettings(bill,bill.recipe,SCHEMA_VERSION)).toBe(true);expect(bill).toEqual(before);
 for(const item of LONGSWORD_ITEMS_270)expect(validBillSettings({...bill,filters:{...bill.filters,[item]:false}},bill.recipe,269)).toBe(false);
 for(const [item,quantity] of [['steel',25],['plasteel',25],['uranium',25],['silver',250],['gold',250]] as const){expect(validSmeltingProduct(item,quantity,'smelt-weapon',269)).toBe(false);expect(validSmeltingProduct(item,quantity,'smelt-weapon',SCHEMA_VERSION)).toBe(true);}
 const raw=JSON.parse(text);raw.schemaVersion=271;expect(()=>deserializeCampaign(JSON.stringify(raw))).toThrow();expect(validLongswordHistoricalTransport270(raw,271)).toBe(false);
});

test('269 refuses all six swords,18 tools, work, recipe and false research/filter markers in real owning domains and public same-tick envelopes',()=>{
 const {w,g}=reorganizationCamp256();
 expect(applyCommand(w,{type:'stockpile',enabled:true,x:4,z:4,filters:{wood:true,food:true},priority:2,capacity:500}).ok).toBe(true);
 ensureFireState(w).ledger.items.wood=1;expect(validateWorld(w)).toEqual([]);const control=historical(w);
 expect(JSON.parse(serializeCampaign(deserializeCampaign(control)))).toEqual({...JSON.parse(control),schemaVersion:SCHEMA_VERSION});
 type Mutation=(v:World)=>void;
 const cases:Array<readonly [string,Mutation]>=[
  ...LONGSWORD_ITEMS_270.map(item=>[item,(v:World)=>v.piles.push({id:v.nextId++,item,kind:'weapon',quantity:1,owner:{type:'ground',x:4,z:4},weapon:newWeaponState(item)})] as const),
  ...LONGSWORD_TOOL_IDS_270.map(tool=>[tool,(v:World)=>{v.pawns[0]!.melee={order:null,strike:{targetId:null,atCore:v.tick*10,untilCore:v.tick*10+meleeRecoveryCore(tool),tool,outcome:'miss'}};}] as const),
  ['new paid work',v=>v.piles.push(swordWork(v))],
  ['recipe on a real existing structure',v=>{v.structures[0]!.bills=[newCookingBill(v.nextId++,'make-longsword')];}],
  ['false steel sword input filter',v=>{v.structures[0]!.bills=[{...newCookingBill(v.nextId++,'smelt-weapon',269),filters:{'steel-longsword':false}}];}],
  ['false workpiece storage filter',v=>{const cell=v.stockpiles.find(q=>q.x===4&&q.z===4)!;(cell.items??={})['unfinished-longsword']=false;}],
  ['historical fire loss ledger',v=>{v.fires!.ledger.items['wood-longsword']=1;}],
  ['historical item ledger',v=>{v.destroyed={count:0,lost:{},items:{'gold-longsword':1}};}],
  ['false longBlades research marker',v=>{Object.assign(v.research??={project:null,points:0},{longBlades:false});}],
  ['false long-blades research marker',v=>{Object.assign(v.research??={project:null,points:0},{'long-blades':false});}],
  ['future selected project',v=>{v.research??={project:null,points:0};v.research.project='long-blades';}],
  ['away original possession',v=>{const row=(v.worldGroups?.groups??(v.campaignMap?.revision===2?v.campaignMap.groups:[])).find(r=>r.state.id===g.id)!.state;if(!('members'in row))throw Error('Missing actual away owner');row.items.push({id:v.nextId++,item:'silver-longsword',kind:'weapon',quantity:1,owner:{type:'inventory',pawnId:row.members[0]!.id},weapon:newWeaponState('silver-longsword')});}],
 ];
 for(const [label,mutate] of cases){
  const bad=JSON.parse(control) as World;mutate(bad);const text=JSON.stringify(bad);
  expect(validLongswordHistoricalTransport270(bad,269),label).toBe(false);expect(()=>deserializeCampaign(text),label).toThrow();expect(JSON.stringify(bad)).toBe(text);expect(historical(w)).toBe(control);
  const old=JSON.parse(control) as World,encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),checkpoint=structuredClone(encoder.encode(old,0,0)),first=decoder.adopt(structuredClone(checkpoint));
  expect(first.status,label).toBe('applied');if(first.status!=='applied')throw Error(`Valid269 checkpoint refused: ${label}`);const retained=structuredClone(first.world);
  const forged=structuredClone(checkpoint);if(forged.kind!=='checkpoint')throw Error('Expected actual checkpoint');mutate(forged.world);
  expect(new SnapshotDecoder().adopt(forged).status,label).toBe('resync');expect(first.world).toEqual(retained);
  mutate(old);const delta=structuredClone(encoder.encode(old,0,0));expect(delta.kind,label).toBe('delta');expect(delta.world.tick).toBe(first.world.tick);
  expect(decoder.adopt(delta).status,label).toBe('resync');expect(first.world).toEqual(retained);
 }
 // A real queued intent is checked separately from the wire fixture above.
 const queued=JSON.parse(control) as World;queued.pawns[0]!.orders.queue.push({cooking:{recipe:'make-longsword'}} as never);
 expect(validLongswordHistoricalTransport270(queued,269)).toBe(false);expect(()=>deserializeCampaign(JSON.stringify(queued))).toThrow();
},120000);

test('269 rejects future goods and false markers inside an actual inactive temporary map, preserving its predecessor',()=>{
 const w=registryCamp(),prepared=preparedMap(w,52,'legacy-site',false);
 const index=prepared.tiles.findIndex((tile,i)=>!['water','rock'].includes(tile.terrain)&&!prepared.resources.some(r=>r.x===i%prepared.width&&r.z===Math.floor(i/prepared.width))&&!prepared.structures.some(r=>r.x===i%prepared.width&&r.z===Math.floor(i/prepared.width)));if(index<0)throw Error('No valid prepared storage cell');
 prepared.stockpiles.push({id:w.nextId++,x:index%prepared.width,z:Math.floor(index/prepared.width),filters:{wood:true,food:true},priority:2,capacity:500});
 expect(validateWorld(w)).toEqual([]);const control=historical(w);
 expect(JSON.parse(serializeCampaign(deserializeCampaign(control)))).toEqual({...JSON.parse(control),schemaVersion:SCHEMA_VERSION});
 for(const mutate of [
  (map:NonNullable<NonNullable<World['worldMaps']>['sites'][number]['map']>,root:World)=>{map.piles.push({id:root.nextId++,item:'wood-longsword',kind:'weapon',quantity:1,owner:{type:'ground',x:4,z:4},weapon:newWeaponState('wood-longsword')});},
  (map:NonNullable<NonNullable<World['worldMaps']>['sites'][number]['map']>,root:World)=>{const cell=map.stockpiles.at(-1)!;(cell.items??={})['unfinished-longsword']=false;},
 ]){
  const bad=JSON.parse(control) as World,map=bad.worldMaps!.sites.find(s=>s.map)!.map!;mutate(map,bad);
  expect(validLongswordHistoricalTransport270(bad,269)).toBe(false);expect(()=>deserializeCampaign(JSON.stringify(bad))).toThrow();expect(historical(w)).toBe(control);
 }
});

test('270 admits work and WeaponState in matching public/resident same-tick projections while malformed receipts stay transactional',()=>{
 // Prepared learned research and wire states only. Production is played by
 // the separate finite-stock pilot, not inferred from these projections.
 const w=registryCamp();w.research??={project:null,points:0};w.research.smithing={points:researchCost('smithing'),completedAt:w.tick};w.research.longBlades={points:researchCost('long-blades'),completedAt:w.tick};
 const encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),strict=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const send=(checkpoint=false)=>{const packet=structuredClone(encoder.encode(w,0,0,checkpoint)),a=strict.adopt(structuredClone(packet)),b=resident.adopt(packet);expect(a.status).toBe('applied');expect(b.status).toBe('applied');if(a.status!=='applied'||b.status!=='applied')throw Error('Valid270 projection refused');expect(b.world).toEqual(a.world);return {world:a.world,resident:b.world,packet};};
 const first=send(),original=structuredClone(first.world),residentOriginal=structuredClone(first.resident),q=swordWork(w);w.piles.push(q);
 const saved=serializeWorld(w),delta=structuredClone(encoder.encode(w,0,0));expect(delta.kind).toBe('delta');
 for(const [label,mutate] of [
  ['mixed material',(p:MaterialPile)=>{p.smithingWork!.parts[0]!.item='steel';}],
  ['wrong quota',(p:MaterialPile)=>{p.smithingWork!.parts[1]!.quantity=24;}],
  ['excess work',(p:MaterialPile)=>{p.smithingWork!.progress=34_200_001;}],
  ['wrong identity',(p:MaterialPile)=>{p.item='unfinished-mace';}],
  ['unexpected weapon state',(p:MaterialPile)=>{p.weapon=newWeaponState('uranium-longsword');}],
 ] as const){
  const bad=structuredClone(delta);if(bad.kind!=='delta'||!bad.piles)throw Error('Expected actual work delta');mutate(bad.piles.upserted.find(p=>p.id===q.id)!);
  expect(strict.adopt(bad).status,label).toBe('resync');expect(first.world,label).toEqual(original);
  const raw=JSON.parse(saved) as World;mutate(raw.piles.find(p=>p.id===q.id)!);expect(()=>deserializeCampaign(JSON.stringify(raw)),label).toThrow();
 }
 const accepted=strict.adopt(structuredClone(delta)),displayed=resident.adopt(delta);expect(accepted.status).toBe('applied');expect(displayed.status).toBe('applied');if(accepted.status!=='applied'||displayed.status!=='applied')throw Error('Valid work delta refused');expect(displayed.world).toEqual(accepted.world);
 expect(validSmithingWorkShape267(q as unknown as Record<string,unknown>,SCHEMA_VERSION)).toBe(true);expect(validSmithingWorkShape267(q as unknown as Record<string,unknown>,269)).toBe(false);
 const paid=structuredClone(accepted.world);w.piles=w.piles.filter(p=>p.id!==q.id);
 const product:MaterialPile={id:w.nextId++,item:'uranium-longsword',kind:'weapon',quantity:1,owner:{type:'ground',x:5,z:5},weapon:newWeaponState('uranium-longsword')};w.piles.push(product);
 const finished=send();expect(finished.packet.kind).toBe('delta');expect(finished.world.tick).toBe(first.world.tick);expect(finished.world.piles.find(p=>p.id===product.id)).toEqual(product);expect(finished.world.piles.some(p=>p.id===q.id)).toBe(false);
 expect(first.world).toEqual(original);expect(first.resident).toEqual(residentOriginal);expect(accepted.world).toEqual(paid);
 const bytes=serializeWorld(w),replacement=deserializeWorld(bytes);expect(serializeWorld(replacement)).toBe(bytes);const full=structuredClone(encoder.encode(replacement,0,0,true));expect(full.kind).toBe('checkpoint');expect(strict.adopt(structuredClone(full)).status).toBe('applied');expect(resident.adopt(full).status).toBe('applied');
});

test('paid269 knife work resumes through its physical pipeline after neutral270 migration',()=>{
 const w=foodWorkstationCamp(),p=w.pawns[0]!;w.deterioration!.lastTick=w.tick;if(w.fires)w.fires.clockCore=w.tick*10;
 delete p.background;delete p.traits;p.priorities.craft=1;p.recreation.level=100;p.skills.crafting={level:0,xp:0,dailyXp:0,passion:0};w.research={project:null,points:0};
 expect(applyCommand(w,{type:'designate',kind:'crafting-spot',x:10,z:7}).ok).toBe(true);const station=w.structures.find(s=>s.kind==='crafting-spot')!;
 addGroundMaterial(w,'plasteel',30,{x:16,z:7});addGroundMaterial(w,'food',5,{x:3,z:5},'survival-meal');refreshStock(w);
 expect(applyCommand(w,{type:'bill-add',structureId:station.id,recipe:'make-plasteel-knife'}).ok).toBe(true);
 until(w,()=>w.piles.some(q=>q.smithingWork?.progress));
 const paid=w.piles.find(q=>q.item==='unfinished-knife')!,text=historical(w),copy=deserializeWorld(text);
 expect(JSON.parse(serializeWorld(copy))).toEqual({...JSON.parse(text),schemaVersion:SCHEMA_VERSION});expect(copy.piles.find(q=>q.id===paid.id)?.smithingWork).toEqual(paid.smithingWork);
 const start=w.tick;until(w,()=>p.cooking?.phase==='output',2000);stepWorld(copy,w.tick-start);
 expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(w.piles.filter(q=>q.item==='plasteel-knife')).toHaveLength(1);expect(w.piles.some(q=>q.id===paid.id)).toBe(false);expect(w.research!.longBlades).toBeUndefined();
});

test('a true269 queued crafting-fuel reservation keeps its purpose and physically delivers the same wood after migration',()=>{
 // Declared installed forge, finite wood and accepted queued reservation;
 // actual pickup, travel and contact delivery are performed after this point.
 const w=foodWorkstationCamp(),p=w.pawns[0]!;w.deterioration!.lastTick=w.tick;if(w.fires)w.fires.clockCore=w.tick*10;
 delete p.background;delete p.traits;p.recreation.level=100;p.priorities.craft=1;p.priorities.cook=0;p.priorities.haul=0;
 const station:Structure={id:w.nextId++,kind:'fueled-smithy',x:10,z:7,orientation:0,footprint:'standard',material:'steel',fuel:newBuildingFuel('fueled-smithy'),bills:[]};w.structures.push(station);
 addGroundMaterial(w,'wood',20,{x:4,z:6});refreshStock(w);const source=w.piles.find(q=>q.item==='wood')!;
 const task:HaulTask={sourcePileId:source.id,quantity:10,phase:'pickup',carryPileId:null,destination:{type:'fuel',structureId:station.id,forced:true,forCrafting:true}};p.orders.queue.push(task);
 expect(validCraftingFuelTransport269(w,269)).toBe(true);expect(validateWorld(w)).toEqual([]);
 const text=historical(w),copy=deserializeWorld(text);expect(JSON.parse(serializeWorld(copy))).toEqual({...JSON.parse(text),schemaVersion:SCHEMA_VERSION});
 until(w,()=>p.haul?.phase==='deliver');expect(p.haul?.destination).toEqual(task.destination);const carried=w.piles.find(q=>q.owner.type==='pawn'&&q.owner.pawnId===p.id)!;expect(carried).toMatchObject({item:'wood',quantity:10});
 const pickupTick=w.tick;stepWorld(copy,pickupTick-JSON.parse(text).tick);expect(serializeWorld(copy)).toBe(serializeWorld(w));
 const held=serializeWorld(w),heldCopy=deserializeWorld(held);expect(serializeWorld(heldCopy)).toBe(held);
 until(w,()=>station.fuel!.ticks>0);stepWorld(copy,w.tick-pickupTick);stepWorld(heldCopy,w.tick-pickupTick);
 expect(serializeWorld(copy)).toBe(serializeWorld(w));expect(serializeWorld(heldCopy)).toBe(serializeWorld(w));expect(w.piles.some(q=>q.id===carried.id)).toBe(false);
 expect(w.piles.filter(q=>q.item==='wood').reduce((n,q)=>n+q.quantity,0)).toBe(10);expect(p.priorities.cook).toBe(0);expect(p.priorities.haul).toBe(0);expect(w.research?.longBlades).toBeUndefined();
});
