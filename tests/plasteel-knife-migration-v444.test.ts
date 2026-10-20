import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserializeCampaign,deserializeWorld,serializeCampaign,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {validKnifeHistoricalTransport268} from '../src/sim/catalogue-save-268.ts';
import {validSmithingWorkShape267} from '../src/sim/smithing-save-267.ts';
import {isSmithingProduct267,smithingWorkTotal267} from '../src/sim/smithing-content-267.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {newWeaponState} from '../src/sim/equipment-rules.ts';
import {newBuildingFuel} from '../src/sim/fuel.ts';
import {researchCost} from '../src/sim/research.ts';
import {addMaterial,addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {registryCamp,preparedMap} from './helpers/world-maps-v255.ts';
import {reorganizationCamp256} from './helpers/group-reorganization-v256.ts';
import {foodWorkstationCamp} from './scenarios/food-workstations.ts';
import {SCHEMA_VERSION,type MaterialPile,type Structure,type World} from '../src/sim/types.ts';

const REFERENCES=[
 ['Les Forges','v432/les-forges-crash-test.json'],
 ['Les Aulnes','v394/les-aulnes-integrees.json'],
 ['Les Éclaircies','v419/les-eclaircies.json'],
] as const;
function publicPayload(path:string):string {
 const text=readFileSync(new URL(`../public/test-saves/${path}`,import.meta.url),'utf8'),envelope=JSON.parse(text) as Record<string,unknown>;
 if(envelope.format!=='lisiere-save')return text;
 if(envelope.version!==1||envelope.codec!=='gzip-base64'||typeof envelope.payload!=='string')throw Error('Unexpected public envelope');
 const bytes=gunzipSync(Buffer.from(envelope.payload,'base64'));expect(bytes.length).toBe(envelope.uncompressedBytes);return bytes.toString('utf8');
}
const historical=(w:World):string=>JSON.stringify({...w,schemaVersion:267});
const asRecord=(q:MaterialPile)=>q as unknown as Record<string,unknown>;
const knifeWork=(w:World):MaterialPile=>({id:w.nextId++,item:'unfinished-knife',kind:'unfinished',quantity:1,owner:{type:'ground',x:5,z:5},
 smithingWork:{recipe:'make-plasteel-knife',material:'plasteel',authorId:w.pawns[0]!.id,progress:100,parts:[{item:'plasteel',quantity:30}]}});
const plateWork=(w:World):MaterialPile=>({id:w.nextId++,item:'unfinished-plate-armor',kind:'unfinished',quantity:1,owner:{type:'ground',x:6,z:5},
 smithingWork:{recipe:'make-plate-armor',material:'steel',authorId:w.pawns[0]!.id,progress:100,parts:[{item:'steel',quantity:75},{item:'steel',quantity:75},{item:'steel',quantity:20}]}});

test.each(REFERENCES)('%s migrates a strict complete267 witness to current by the root version alone',(label,path)=>{
 // Public files predate267. Ordinary historical migrations are applied first;
 // this explicitly declared267 witness is never called an original267 file.
 const w=deserializeWorld(publicPayload(path)),text=historical(w),before=JSON.parse(text),loaded=deserializeCampaign(text);
 expect(w.schemaVersion).toBe(SCHEMA_VERSION);expect(loaded.schemaVersion).toBe(SCHEMA_VERSION);expect(validateWorld(loaded)).toEqual([]);
 expect(JSON.parse(serializeCampaign(loaded)),label).toEqual({...before,schemaVersion:SCHEMA_VERSION});
 expect(historical(w)).toBe(text);
},120000);

test('old finished knives in real ground/inventory owners and old smithing receipts remain legal under267 and268',()=>{
 const w=registryCamp();addMaterial(w,'weapon',1,{type:'ground',x:4,z:4},'plasteel-knife');
 addMaterial(w,'weapon',1,{type:'inventory',pawnId:w.pawns[0]!.id},'plasteel-knife');
 const work=plateWork(w);w.piles.push(work);expect(validateWorld(w)).toEqual([]);
 expect(isSmithingProduct267('plasteel-knife')).toBe(false);
 for(const version of [267,268]){
  expect(validSmithingWorkShape267(asRecord(work),version)).toBe(true);
  expect(validKnifeHistoricalTransport268(w,version)).toBe(true);
 }
 const text=historical(w),copy=deserializeWorld(text);
 expect(JSON.parse(serializeCampaign(copy))).toEqual({...JSON.parse(text),schemaVersion:SCHEMA_VERSION});
 expect(copy.piles.filter(q=>q.item==='plasteel-knife')).toEqual(w.piles.filter(q=>q.item==='plasteel-knife'));
 const raw=JSON.parse(serializeCampaign(copy));raw.schemaVersion=SCHEMA_VERSION+1;
 expect(()=>deserializeCampaign(JSON.stringify(raw))).toThrow();
 expect(validKnifeHistoricalTransport268(raw,SCHEMA_VERSION+1)).toBe(false);
});

test('267 rejects prospective recipe/workpiece keys in actual local, away, history, queue and filter owners before migration',()=>{
 const {w,g}=reorganizationCamp256(),control=historical(w);
 expect(JSON.parse(serializeCampaign(deserializeCampaign(control)))).toEqual({...JSON.parse(control),schemaVersion:SCHEMA_VERSION});
 for(const [label,mutate] of [
  ['unfinished identity',(v:World)=>{v.piles.push(knifeWork(v));}],
  ['recipe on an existing station',(v:World)=>{v.structures[0]!.bills=[newCookingBill(v.nextId++,'make-plasteel-knife')];}],
  ['hidden false bill filter',(v:World)=>{v.structures[0]!.bills=[{...newCookingBill(v.nextId++,'simple-meal'),filters:{'unfinished-knife':false}}];}],
  ['false stockpile item filter',(v:World)=>{Object.assign(v,{stockpiles:[{id:v.nextId++,x:4,z:4,items:{'unfinished-knife':false}}]});}],
  ['queued manufacture',(v:World)=>{v.pawns[0]!.orders.queue.push({cooking:{recipe:'make-plasteel-knife'}} as never);}],
  ['away original possession',(v:World)=>{const row=v.worldGroups!.groups.find(r=>r.state.id===g.id)!.state;if(!('members'in row))throw Error('Away owner missing');const q=knifeWork(v);q.owner={type:'inventory',pawnId:row.members[0]!.id};row.items.push(q);}],
  ['historical quantity dictionary',(v:World)=>{v.destroyed={count:0,lost:{},items:{'unfinished-knife':1}};}],
 ] as const){
  const bad=JSON.parse(control) as World;mutate(bad);const text=JSON.stringify(bad);
  expect(validKnifeHistoricalTransport268(bad,267),label).toBe(false);
  expect(()=>deserializeCampaign(text),label).toThrow();expect(JSON.stringify(bad),label).toBe(text);expect(historical(w)).toBe(control);
 }
});

test('267 refuses prospective manufacture on its actual inactive map and public same-tick deltas without replacing the retained world',()=>{
 const w=registryCamp();preparedMap(w,52,'legacy-site',false);const control=historical(w),bad=JSON.parse(control) as World;
 const inactive=bad.worldMaps!.sites.find(s=>s.map)!.map!;inactive.piles.push(knifeWork(bad));
 expect(validKnifeHistoricalTransport268(bad,267)).toBe(false);expect(()=>deserializeCampaign(JSON.stringify(bad))).toThrow();expect(historical(w)).toBe(control);
 const old=JSON.parse(control) as World,encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const full=structuredClone(encoder.encode(old,0,0)),first=decoder.adopt(full);expect(first.status).toBe('applied');
 if(first.status!=='applied')throw Error('Historical checkpoint refused');const retained=structuredClone(first.world);
 old.piles.push(knifeWork(old));const delta=structuredClone(encoder.encode(old,0,0));expect(delta.kind).toBe('delta');expect(old.tick).toBe(retained.tick);
 expect(decoder.adopt(delta).status).toBe('resync');expect(first.world).toEqual(retained);
 const forged=structuredClone(full);if(forged.kind!=='checkpoint')throw Error('Expected full checkpoint');forged.world.piles.push(knifeWork(forged.world));
 expect(new SnapshotDecoder().adopt(forged).status).toBe('resync');expect(first.world).toEqual(retained);
});

test('current admits same-tick work and finished WeaponState in public and resident projections, retaining immutable predecessors',()=>{
 // Declared transport fixtures, not a claim that work or production happened
 // without a physical step. The production pilot exercises the real commit.
 const w=registryCamp(),encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),strict=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const send=(checkpoint=false)=>{
  const packet=structuredClone(encoder.encode(w,0,0,checkpoint)),a=strict.adopt(structuredClone(packet)),b=resident.adopt(packet);
  expect(a.status).toBe('applied');expect(b.status).toBe('applied');if(a.status!=='applied'||b.status!=='applied')throw Error('Valid current transport refused');
  expect(b.world).toEqual(a.world);return {world:a.world,resident:b.world,packet};
 };
 const first=send(),original=structuredClone(first.world),residentOriginal=structuredClone(first.resident),q=knifeWork(w);w.piles.push(q);
 const next=send();expect(next.packet.kind).toBe('delta');expect(next.world.tick).toBe(first.world.tick);
 expect(next.world.piles.find(p=>p.id===q.id)?.smithingWork).toEqual(q.smithingWork);
 const retained=structuredClone(next.world);w.piles=w.piles.filter(p=>p.id!==q.id);
 const product:MaterialPile={id:w.nextId++,item:'plasteel-knife',kind:'weapon',quantity:1,owner:{type:'ground',x:5,z:5},weapon:newWeaponState('plasteel-knife')};w.piles.push(product);
 const finished=send();expect(finished.packet.kind).toBe('delta');expect(finished.world.piles.some(p=>p.id===q.id)).toBe(false);
 expect(finished.world.piles.find(p=>p.id===product.id)).toEqual(product);expect(product.apparel).toBeUndefined();expect(product.weapon!.hitPoints).toBe(280);
 expect(first.world).toEqual(original);expect(first.resident).toEqual(residentOriginal);expect(next.world).toEqual(retained);
 expect(validateWorld(w)).toEqual([]);const saved=serializeCampaign(w);expect(serializeCampaign(deserializeCampaign(saved))).toBe(saved);
 // Replacing a World instance, including by load, starts a fresh checkpoint.
 const replacement=deserializeWorld(saved),packet=structuredClone(encoder.encode(replacement,0,0,true));expect(packet.kind).toBe('checkpoint');
 expect(strict.adopt(structuredClone(packet)).status).toBe('applied');expect(resident.adopt(packet).status).toBe('applied');
});

test('current rejects malformed knife receipts in files and deltas while267 refuses even their valid shape',()=>{
 const w=registryCamp(),q=knifeWork(w);w.piles.push(q);const saved=serializeCampaign(w),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const full=structuredClone(encoder.encode(w,0,0)),first=decoder.adopt(full);if(first.status!=='applied')throw Error('Valid knife checkpoint refused');
 const retained=structuredClone(first.world);q.smithingWork!.progress++;const delta=structuredClone(encoder.encode(w,0,0));
 expect(validSmithingWorkShape267(asRecord(q),267)).toBe(false);expect(validSmithingWorkShape267(asRecord(q),268)).toBe(true);expect(validSmithingWorkShape267(asRecord(q),SCHEMA_VERSION)).toBe(true);expect(validSmithingWorkShape267(asRecord(q),SCHEMA_VERSION+1)).toBe(false);
 for(const [label,mutate] of [
  ['foreign material',(p:MaterialPile)=>{p.smithingWork!.material='steel';}],
  ['missing ingredient',(p:MaterialPile)=>{p.smithingWork!.parts[0]!.quantity=29;}],
  ['foreign receipt',(p:MaterialPile)=>{p.smithingWork!.parts[0]!.item='steel';}],
  ['excess progress',(p:MaterialPile)=>{p.smithingWork!.progress=smithingWorkTotal267('make-plasteel-knife','plasteel')+1;}],
  ['wrong workpiece',(p:MaterialPile)=>{p.item='unfinished-simple-helmet';}],
  ['wrong runtime payload',(p:MaterialPile)=>{p.weapon=newWeaponState('plasteel-knife');}],
 ] as const){
  const forged=structuredClone(delta);if(forged.kind!=='delta'||!forged.piles)throw Error('Expected actual pile delta');
  const target=forged.piles.upserted.find(p=>p.id===q.id)!;mutate(target);
  expect(decoder.adopt(forged).status,label).toBe('resync');expect(first.world,label).toEqual(retained);
  const raw=JSON.parse(saved) as World;mutate(raw.piles.find(p=>p.id===q.id)!);const text=JSON.stringify(raw);expect(()=>deserializeCampaign(text),label).toThrow();expect(JSON.stringify(raw)).toBe(text);
 }
 expect(decoder.adopt(delta).status).toBe('applied');expect(first.world).toEqual(retained);
});

test('a real author-bound267 helmet work resumes after the neutral migration to current with the entire continuation unchanged',()=>{
 // Prepared old workshop, research and finite stock. Hauling, refuelling,
 // working and output below all run through ordinary commands and steps.
 const w=foodWorkstationCamp(),p=w.pawns[0]!;w.deterioration!.lastTick=w.tick;if(w.fires)w.fires.clockCore=w.tick*10;
 delete p.background;delete p.traits;p.priorities.craft=1;p.recreation.level=100;p.skills.crafting={level:7,xp:0,dailyXp:0,passion:0};
 w.research={project:null,points:researchCost('complex-clothing'),completedAt:1000,smithing:{points:researchCost('smithing'),completedAt:1001}};
 const s:Structure={id:w.nextId++,kind:'fueled-smithy',x:10,z:7,orientation:0,footprint:'standard',material:'steel',fuel:newBuildingFuel('fueled-smithy'),bills:[]};w.structures.push(s);
 addGroundMaterial(w,'wood',50,{x:17,z:8});addGroundMaterial(w,'steel',40,{x:16,z:7});addGroundMaterial(w,'food',5,{x:3,z:5},'survival-meal');refreshStock(w);
 const command=applyCommand(w,{type:'bill-add',structureId:s.id,recipe:'make-simple-helmet'});expect(command.ok,command.reason).toBe(true);
 for(let n=0;n<3000&&!w.piles.some(q=>q.smithingWork?.progress);n++)stepWorld(w);
 const work=w.piles.find(q=>q.smithingWork?.recipe==='make-simple-helmet');expect(work).toBeDefined();expect(work!.smithingWork!.progress).toBeGreaterThan(0);
 const text=historical(w),migrated=deserializeWorld(text);expect(JSON.parse(serializeWorld(migrated))).toEqual({...JSON.parse(text),schemaVersion:SCHEMA_VERSION});
 expect(migrated.piles.find(q=>q.id===work!.id)?.smithingWork).toEqual(work!.smithingWork);
 const start=w.tick;for(let n=0;n<2000&&p.cooking?.phase!=='output';n++)stepWorld(w);expect(p.cooking?.phase).toBe('output');
 stepWorld(migrated,w.tick-start);expect(serializeWorld(migrated)).toBe(serializeWorld(w));expect(validateWorld(w)).toEqual([]);
 expect(w.piles.some(q=>q.id===work!.id)).toBe(false);expect(w.piles.filter(q=>q.item==='steel-simple-helmet')).toHaveLength(1);
 expect(w.piles.some(q=>q.item==='plasteel-knife'||q.item==='unfinished-knife')).toBe(false);expect(w.structures.some(s=>s.bills?.some(b=>b.recipe==='make-plasteel-knife'))).toBe(false);
});
