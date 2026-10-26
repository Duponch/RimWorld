import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expect,test} from 'vitest';
import {validNovelHistoricalTransport295,validNovelPile295,validReadingPawnFields295,validReadingTask295} from '../src/sim/book-save-295.ts';
import {validReadingWorld295} from '../src/sim/book-transport-295.ts';
import {deserializeCampaign,serializeCampaign,validateCampaignSchema294,validateWorld} from '../src/sim/serialization.ts';
import {getToxicFallout294} from '../src/sim/toxic-fallout-state-294.ts';
import {validStorageItems} from '../src/sim/storage-filters.ts';
import {validShelfSettings} from '../src/sim/shelf-save.ts';
import {newShelfStorage} from '../src/sim/shelf-storage.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {campaignOnlySummary} from '../src/sim/world-map-presentation.ts';
import {registryCamp} from './helpers/world-maps-v255.ts';
import {prepareNovelScenario482} from './scenarios/novel-v482.ts';
import {validOrbitalTransport} from '../src/sim/orbital-save.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {validStorageSettings} from '../src/sim/designation.ts';
import {validLinkedShelfPolicy286,patchLinkedShelfPolicy286} from '../src/sim/linked-storage-policy-286.ts';
import {validLinkedStorageRegistryShape286} from '../src/sim/linked-storage-save-286.ts';
import {patchShelfPolicy} from '../src/sim/shelf-commands.ts';
import type {NovelBook295} from '../src/sim/book-state-295.ts';
import type {ReadingTask295} from '../src/sim/reading-state-295.ts';
import {SCHEMA_VERSION,type MaterialPile,type World} from '../src/sim/types.ts';

/** Exact own V481 native export after286 played steps, not a295 world renamed
 *294. Original: tmp/toxic-fallout-v481/native-2026-10-26T04-01-45.763Z-26724/
 *played-dose-paused.json. The declared day60 scenario and its actual toxic
 *burdens are preserved; no new acquisition/reading is claimed by this fixture. */
const legacyBytes=readFileSync(new URL('./fixtures/novel-v482-toxic-active-294.json',import.meta.url));
const legacyText=legacyBytes.toString('utf8');
const bookState=():NovelBook295=>({revision:1,quality:'normal',title:'Le sentier des lanternes',description:'Un récit original pour une préparation de conservation.'});
const pile=(id=999):MaterialPile=>({id,kind:'book',item:'novel',quantity:1,owner:{type:'ground',x:6,z:6},book:bookState()});
function worldWithBook():{world:World;book:MaterialPile} {
 const world=deserializeCampaign(legacyText) as World,book=pile(world.nextId++);world.piles.push(book);return {world,book};
}
function readingWorld(stage:ReadingTask295['stage'],phase:ReadingTask295['phase']):{world:World;book:MaterialPile} {
 const {world,book}=worldWithBook(),pawn=world.pawns[0]!;
 delete pawn.draft;delete pawn.motion;pawn.path=[];pawn.moveCooldown=0;pawn.jobId=null;pawn.haul=null;pawn.need=null;
 book.owner=stage==='pickup'?{type:'ground',x:pawn.x,z:pawn.z}:{type:'pawn',pawnId:pawn.id};
 pawn.state=phase==='travel'?'moving':stage==='read'?'recreating':'idle';
 pawn.recreation.task={activity:'read',bookId:book.id,stage,phase,target:{x:pawn.x,z:pawn.z},buildingId:null,elapsed:stage==='read'||stage==='return'?12:0,manual:true};
 return {world,book};
}

test('authentic294 active Fallout migrates the entire campaign by its schema number alone',()=>{
 expect(createHash('sha256').update(legacyBytes).digest('hex')).toBe('71965d8d91399346f793cd19af49f2954096ac2ae87fd8e09e3e17f6fcc89da2');
 const old=JSON.parse(legacyText),before=JSON.stringify(old);expect(old.schemaVersion).toBe(294);expect(validateCampaignSchema294(old)).toEqual([]);expect(JSON.stringify(old)).toBe(before);
 const migrated=deserializeCampaign(legacyText) as World;expect(migrated).toEqual({...old,schemaVersion:SCHEMA_VERSION});expect(migrated.rng).toBe(old.rng);
 expect(getToxicFallout294(migrated)).toEqual(old.miscIncidents.toxicFallout.active);expect(migrated.pawns.map(p=>p.health)).toEqual(old.pawns.map((p:World['pawns'][number])=>p.health));
 expect(migrated.piles.some(p=>p.item==='novel'||p.kind==='book'||Object.hasOwn(p,'book'))).toBe(false);
 for(const p of migrated.pawns){expect(Object.hasOwn(p,'readingPolicy295')).toBe(false);expect(Object.hasOwn(p.recreation.tolerance,'reading')).toBe(false);expect(Object.hasOwn(p.recreation.bored,'reading')).toBe(false);}
 expect(JSON.parse(serializeCampaign(migrated))).toEqual({...old,schemaVersion:SCHEMA_VERSION});
});

test.each(['book','policy','genre','task'] as const)('the complete294 contract refuses future %s before changing its number',kind=>{
 const raw=JSON.parse(legacyText),p=raw.pawns[0];
 if(kind==='book')raw.piles.push(pile(raw.nextId++));
 if(kind==='policy')p.readingPolicy295=1;
 if(kind==='genre'){p.recreation.tolerance.reading=0;p.recreation.bored.reading=false;}
 if(kind==='task')p.recreation.task={activity:'read',bookId:123,stage:'pickup',phase:'travel',target:{x:p.x,z:p.z},buildingId:null,elapsed:0};
 const before=JSON.stringify(raw);expect(validateCampaignSchema294(raw).length).toBeGreaterThan(0);expect(()=>deserializeCampaign(before)).toThrow();expect(JSON.stringify(raw)).toBe(before);
});

test.each([
 ['registered map',{worldMaps:{sites:[{map:{piles:[pile()]}}]}}],
 ['map projection',{campaignMap:{maps:[{map:{piles:[pile()]}}]}}],
 ['WorldPawn',{worldPawns:{owners:[{items:[pile()]}]}}],
 ['retained casket',{structures:[{cryptosleep:{items:[pile()]}}]}],
 ['lost caravan',{worldGroups:{abandonedContents:[{items:[pile()]}]}}],
 ['orbital delivery',{orbital:{pending:[{items:[pile()]}]}}],
] as const)('historical book closure follows the actual %s envelope',(_name,raw)=>{
 expect(validNovelHistoricalTransport295(raw,294)).toBe(false);expect(validNovelHistoricalTransport295(raw,295)).toBe(true);expect(validNovelHistoricalTransport295(raw,296)).toBe(true);expect(validNovelHistoricalTransport295(raw,297)).toBe(false);
});

test('a Novel item without its Book original is refused even when the metadata key is absent',()=>{
 const raw=pile();delete raw.book;
 expect(validNovelPile295(raw,295)).toBe(false);expect(validNovelHistoricalTransport295({piles:[raw]},295)).toBe(false);
 expect(validNovelHistoricalTransport295({trade:{recent:[{lines:[{item:'novel',quantity:1}]}]}},295)).toBe(true);
 expect(validNovelHistoricalTransport295({trade:{recent:[{lines:[{item:'novel',quantity:1}]}]}},294)).toBe(false);
});

test.each([
 ['quantity2',(p:Record<string,unknown>)=>{p.quantity=2;}],
 ['wrong category',(p:Record<string,unknown>)=>{p.kind='apparel';}],
 ['equipped',(p:Record<string,unknown>)=>{p.owner={type:'equipment',pawnId:1};}],
 ['construction deposit',(p:Record<string,unknown>)=>{p.owner={type:'job',jobId:1};}],
 ['foreign rot',(p:Record<string,unknown>)=>{p.rot={progress:0,atTick:0};}],
 ['destroyed HP',(p:Record<string,unknown>)=>{p.damage=60;}],
] as const)('new physical admission refuses %s',(_name,mutate)=>{
 const raw=pile() as unknown as Record<string,unknown>;mutate(raw);expect(validNovelPile295(raw,295)).toBe(false);
});

test('new getters, inherited and hidden fields are refused without invoking them',()=>{
 let reads=0;const b=pile();Object.defineProperty(b,'book',{enumerable:true,get(){reads++;return bookState();}});
 expect(validNovelHistoricalTransport295({piles:[b]},294)).toBe(false);expect(validNovelHistoricalTransport295({piles:[b]},295)).toBe(false);
 const pawn={recreation:{level:50,tolerance:{},bored:{},task:null}};Object.defineProperty(pawn,'readingPolicy295',{enumerable:true,get(){reads++;return 1;}});
 expect(validReadingPawnFields295(pawn,294)).toBe(false);expect(validReadingPawnFields295(pawn,295)).toBe(false);
 const hidden=pile();Object.defineProperty(hidden,'book',{enumerable:false,value:bookState()});expect(validNovelPile295(hidden,295)).toBe(false);
 expect(validReadingPawnFields295(Object.assign(Object.create({readingPolicy295:1}),{recreation:{}}),295)).toBe(false);expect(reads).toBe(0);
});

test('the presentation fence never touches terrain/resource/geographic payloads',()=>{
 let reads=0;const raw={piles:[pile()]};for(const k of ['tiles','resources','planet','health'])Object.defineProperty(raw,k,{get(){reads++;throw Error('Not a Book owner lane');}});
 expect(validNovelHistoricalTransport295(raw,295)).toBe(true);expect(reads).toBe(0);
});

test('reading genre is a strict optional pair, with neutral missing policy and no materialization',()=>{
 const p={recreation:{level:50,tolerance:{solitary:0},bored:{solitary:false},task:null}},before=JSON.stringify(p);
 expect(validReadingPawnFields295(p,295)).toBe(true);expect(JSON.stringify(p)).toBe(before);
 expect(validReadingPawnFields295({...p,readingPolicy295:2},295)).toBe(true);expect(validReadingPawnFields295({...p,readingPolicy295:2},294)).toBe(false);
 const r={...p,recreation:{...p.recreation,tolerance:{reading:51},bored:{reading:true}}};expect(validReadingPawnFields295(r,295)).toBe(true);
 expect(validReadingPawnFields295({...r,recreation:{...r.recreation,bored:{}}},295)).toBe(false);
 expect(validReadingPawnFields295({...r,recreation:{...r.recreation,bored:{reading:false}}},295)).toBe(false);
});

test('new storage choices are prospective and historical filters/getters stay closed',()=>{
 expect(validStorageItems({novel:true},295)).toBe(true);expect(validStorageItems({novel:false},294)).toBe(false);
 expect(Object.hasOwn(newShelfStorage([1,2],294).settings.filters,'book')).toBe(false);expect(newShelfStorage([1,2],295).settings.filters.book).toBe(true);
 const settings=newShelfStorage([1,2],295).settings;expect(validShelfSettings(settings,295)).toBe(true);expect(validShelfSettings(settings,294)).toBe(false);
 let reads=0;const items={};Object.defineProperty(items,'novel',{enumerable:true,get(){reads++;return true;}});expect(validStorageItems(items,295)).toBe(false);expect(reads).toBe(0);
});

test.each([294,295,296,297] as const)('standalone shelf/category and linked policies use their actual schema%s',version=>{
 const base=newShelfStorage([2,3],294).settings,filters={wood:true,food:true,book:true},policy={...base,filters};
 const expected=version===295||version===296;
 expect(validStorageSettings({filters},version)).toBe(expected);expect(validLinkedShelfPolicy286(policy,version)).toBe(expected);
 expect(patchLinkedShelfPolicy286(base,{filters},version)!==undefined).toBe(expected);
 expect(validLinkedStorageRegistryShape286({revision:1,nextId:2,groups:[{id:1,originMapId:0,name:'Livres',settings:policy,memberIds:[10,11]}]},version,100)).toBe(expected);
 // This unit fixture represents only the policy command's required owner;
 // it is not declared to be a complete or played campaign.
 const world={schemaVersion:version,structures:[{id:1,kind:'shelf',x:3,z:3,orientation:0,footprint:'standard',shelf:{cells:[2,3],settings:structuredClone(base)}}]} as unknown as World;
 const before=JSON.stringify(world),result=patchShelfPolicy(world,1,{filters});expect(result.ok).toBe(expected);
 if(expected)expect(world.structures[0]!.shelf!.settings.filters.book).toBe(true);else expect(JSON.stringify(world)).toBe(before);
});

test('standalone policy paths reject the prospective category getter with zero reads',()=>{
 let reads=0;const filters={wood:true,food:true};Object.defineProperty(filters,'book',{enumerable:true,get(){reads++;return true;}});
 const base=newShelfStorage([2,3],294).settings;
 for(const version of [294,295,296]){
  expect(validStorageSettings({filters},version)).toBe(false);expect(validLinkedShelfPolicy286({...base,filters},version)).toBe(false);
  expect(patchLinkedShelfPolicy286(base,{filters},version)).toBeUndefined();
  const world={schemaVersion:version,structures:[{id:1,kind:'shelf',shelf:{cells:[2,3],settings:structuredClone(base)}}]} as unknown as World,before=JSON.stringify(world);
  expect(patchShelfPolicy(world,1,{filters}).ok).toBe(false);expect(JSON.stringify(world)).toBe(before);
 }
 expect(reads).toBe(0);
});

test.each([
 ['pickup','travel'],['seat','active'],['seat','travel'],['read','active'],['return','active'],['return','travel'],
] as const)('whole campaign keeps the exact declared %s/%s original and clock', (stage,phase)=>{
 const {world,book}=readingWorld(stage,phase);world.pawns[0]!.readingPolicy295=2;
 expect(validReadingTask295(world.pawns[0]!.recreation.task,295)).toBe(true);expect(validReadingWorld295(world)).toBe(true);expect(validateWorld(world)).toEqual([]);
 const text=serializeCampaign(world),restored=deserializeCampaign(text) as World;expect(serializeCampaign(restored)).toBe(text);
 expect(restored.piles.find(p=>p.id===book.id)).toEqual(book);expect(restored.pawns[0]!.recreation.task).toEqual(world.pawns[0]!.recreation.task);
});

test('two readers cannot reserve one original and a phase cannot borrow someone else’s inventory',()=>{
 const {world,book}=readingWorld('read','active'),p=world.pawns[0]!,other=world.pawns[1]!;
 other.recreation.task=structuredClone(p.recreation.task);expect(validReadingWorld295(world)).toBe(false);other.recreation.task=null;
 book.owner={type:'inventory',pawnId:p.id};expect(validReadingWorld295(world)).toBe(false);
 book.owner={type:'pawn',pawnId:other.id};expect(validReadingWorld295(world)).toBe(false);
});

test.each(['second carry','different goods','different book'] as const)('a reading task never legalizes %s under the original carry guard',kind=>{
 const {world,book}=readingWorld('read','active'),pawn=world.pawns[0]!;
 expect(validateWorld(world)).toEqual([]);
 if(kind!=='second carry')book.owner={type:'ground',x:pawn.x,z:pawn.z};
 const other:MaterialPile=kind==='different book'?{...pile(world.nextId++),owner:{type:'pawn',pawnId:pawn.id}}
  :{id:world.nextId++,item:'wood',kind:'wood',quantity:1,owner:{type:'pawn',pawnId:pawn.id}};
 world.piles.push(other);refreshStock(world);
 const before=JSON.stringify(world);expect(pawn.recreation.task?.activity).toBe('read');
 if(pawn.recreation.task?.activity==='read')expect(pawn.recreation.task.bookId).toBe(book.id);
 expect(other.id).not.toBe(book.id);
 if(kind!=='second carry')expect(validReadingWorld295(world)).toBe(false);
 expect(validateWorld(world).length).toBeGreaterThan(0);expect(()=>serializeCampaign(world)).toThrow();expect(JSON.stringify(world)).toBe(before);
});

test('orbital save admits the295 and296 original book, including explicit full HP, with297 closed and no stock change',()=>{
 const {world,ids}=prepareNovelScenario482(),book=world.piles.find(p=>p.id===ids.bookId)!;book.damage=0;
 const before=JSON.stringify(world);expect(validOrbitalTransport(world,295)).toBe(true);expect(JSON.stringify(world)).toBe(before);
 expect(validOrbitalTransport(world,294)).toBe(false);expect(validOrbitalTransport(world,296)).toBe(true);expect(validOrbitalTransport(world,297)).toBe(false);
 const state=book.book;delete book.book;expect(validOrbitalTransport(world,295)).toBe(false);book.book=state;
 book.quantity=2;expect(validOrbitalTransport(world,295)).toBe(false);
});

test('checkpoint rejection is atomic in both receivers, then its exact valid revision retries',()=>{
 const {world}=worldWithBook(),valid=structuredClone(new SnapshotEncoder().encode(world,0,0));if(valid.kind!=='checkpoint')throw Error('Expected checkpoint');
 const bad=structuredClone(valid);bad.world.piles.find(p=>p.kind==='book')!.quantity=2;
 for(const receiver of [new SnapshotDecoder(),new ResidentPresentationAssembler()]){
  expect(receiver.adopt(structuredClone(bad)).status,receiver.constructor.name).toBe('resync');
  const result=receiver.adopt(structuredClone(valid));expect(result.status,result.status==='resync'?result.reason:receiver.constructor.name).toBe('applied');
 }
});

test.each(['missing reference','removed inherited book'] as const)('sparse delta joins its actual inherited Book: %s',kind=>{
 const {world,book}=readingWorld('read','active'),encoder=new SnapshotEncoder(),opening=structuredClone(encoder.encode(world,0,0)),valid=structuredClone(encoder.encode(world,0,0));
 if(valid.kind!=='delta')throw Error('Expected delta');const bad=structuredClone(valid);
 if(kind==='missing reference'){const task=bad.world.pawns[0]!.recreation.task;if(task?.activity!=='read')throw Error('Missing read');task.bookId=world.nextId+100;}
 else bad.piles={removed:[book.id],upserted:[]};
 for(const receiver of [new SnapshotDecoder(),new ResidentPresentationAssembler()]){
  const first=receiver.adopt(structuredClone(opening));expect(first.status,first.status==='resync'?first.reason:receiver.constructor.name).toBe('applied');
  const before=first.status==='applied'?JSON.stringify(first.world):'';
  expect(receiver.adopt(structuredClone(bad)).status,receiver.constructor.name).toBe('resync');if(first.status==='applied')expect(JSON.stringify(first.world)).toBe(before);
  const result=receiver.adopt(structuredClone(valid));expect(result.status,result.status==='resync'?result.reason:receiver.constructor.name).toBe('applied');
 }
});

test('CampaignOnly refuses a new policy accessor atomically before a valid exact retry',()=>{
 const w=registryCamp(),summary=campaignOnlySummary(w),encoder=new SnapshotEncoder(),geographic=encoder.encodeCampaignSummary(summary,true);
 const valid={type:'campaign-only' as const,epoch:1,revision:1,stepMs:0,speed:0,urgentThreats:{generation:1,pauseRevision:0,serial:0,urgentHeld:false,rows:[]},summary:geographic.state,...geographic.geography?{geography:geographic.geography}:{}};
 for(const receiver of [new SnapshotDecoder(),new ResidentPresentationAssembler()]){
  let reads=0;const bad=structuredClone(valid);Object.defineProperty(bad.summary,'readingPolicy295',{enumerable:true,get(){reads++;return 1;}});
  expect(receiver.adoptCampaignOnly(bad).status,receiver.constructor.name).toBe('resync');expect(reads).toBe(0);
  const result=receiver.adoptCampaignOnly(structuredClone(valid));expect(result.status,result.status==='resync'?result.reason:receiver.constructor.name).toBe('applied');
 }
});
