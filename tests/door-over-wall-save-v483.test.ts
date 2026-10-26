import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {beforeAll,expect,test} from 'vitest';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {deserializeCampaign,serializeCampaign,validateCampaignSchema295,validateWorld} from '../src/sim/serialization.ts';
import {validWallDoorHistoricalTransport296,validWallDoorJob296,validWallDoorWorld296,registerWallDoorPlanIds296,validWallDoorResidentNamespace296} from '../src/sim/wall-door-save-296.ts';
import {validNovelHistoricalTransport295} from '../src/sim/book-save-295.ts';
import {validReadingWorld295} from '../src/sim/book-transport-295.ts';
import {campaignOnlySummary} from '../src/sim/world-map-presentation.ts';
import * as compatibility from '../src/sim/schema-compatibility-257.ts';
import {advanceDoorOverWall483,buildDoorOverWallScenario483,copyDoorOverWall483,planDoorOverWall483} from './scenarios/door-over-wall-v483.ts';
import type {Job,World} from '../src/sim/types.ts';

let paid:ReturnType<typeof buildDoorOverWallScenario483>;
beforeAll(()=>{paid=buildDoorOverWallScenario483(3);});
function planned(){const f=copyDoorOverWall483(paid),plan=planDoorOverWall483(f);return {...f,...plan};}
const receivers=()=>[new SnapshotDecoder(),new ResidentPresentationAssembler()];
const clone=<T>(v:T):T=>structuredClone(v);
const jobOf=(w:{jobs:Job[]})=>w.jobs.find(j=>j.wallDoor296)!;

test('authentic295 native reading campaign validates entirely and changes only its schema number',()=>{
 const bytes=readFileSync(new URL('./fixtures/novel-v482-active-native.json',import.meta.url));
 expect(createHash('sha256').update(bytes).digest('hex')).toBe('cdeeee40b28d591f1f0295ab9b6020e5601f9668681d9742bf4d3f25e60551f8');
 const old=JSON.parse(bytes.toString('utf8')),before=JSON.stringify(old);
 expect(old.schemaVersion).toBe(295);expect(validateCampaignSchema295(old)).toEqual([]);expect(JSON.stringify(old)).toBe(before);
 const restored=deserializeCampaign(bytes.toString('utf8')) as World;
 expect(JSON.parse(serializeCampaign(restored))).toEqual({...old,schemaVersion:296});expect(validReadingWorld295(restored)).toBe(true);
 expect(restored.jobs.some(j=>Object.hasOwn(j,'wallDoor296'))).toBe(false);expect(restored.nextId).toBe(old.nextId);expect(restored.rng).toBe(old.rng);
});

test('authentic295 is fully checked before a wallDoor field or malformed pre-existing actor can migrate',()=>{
 const old=JSON.parse(readFileSync(new URL('./fixtures/novel-v482-active-native.json',import.meta.url),'utf8'));
 const broken=clone(old);broken.pawns[0].jobId=broken.nextId+100;const before=JSON.stringify(broken);
 expect(validateCampaignSchema295(broken).length).toBeGreaterThan(0);expect(()=>deserializeCampaign(before)).toThrow();expect(JSON.stringify(broken)).toBe(before);
 old.pawns[0].wallDoor296={manual:true};expect(validateCampaignSchema295(old).length).toBeGreaterThan(0);expect(()=>deserializeCampaign(JSON.stringify(old))).toThrow();
});

test('all explicit closed schema families retain295 and296 and refuse297',()=>{
 for(const guard of Object.values(compatibility)){expect(guard(295)).toBe(true);expect(guard(296)).toBe(true);expect(guard(297)).toBe(false);expect(guard(0)).toBe(false);}
 const old=JSON.parse(readFileSync(new URL('./fixtures/novel-v482-active-native.json',import.meta.url),'utf8'));
 expect(validNovelHistoricalTransport295(old,296)).toBe(true);expect(validNovelHistoricalTransport295(old,297)).toBe(false);
});

test.each([295,297])('wall-door shape refuses schema%s without enriching historical saves',version=>{
 const f=planned(),before=JSON.stringify(f.world);expect(validWallDoorHistoricalTransport296(f.world,version)).toBe(false);expect(validWallDoorJob296(f.job,version)).toBe(false);expect(JSON.stringify(f.world)).toBe(before);
 const raw=JSON.parse(serializeCampaign(f.world));raw.schemaVersion=version;expect(()=>deserializeCampaign(JSON.stringify(raw))).toThrow();
});

test.each(['not deconstruction','not wall','extra state','extra plan','missing material','future revision','parent identity','target identity','delivered goods'] as const)('closed descriptor rejects %s',kind=>{
 const {world,job}=planned();const raw=job as unknown as Record<string,any>;
 if(kind==='not deconstruction')raw.kind='repair';if(kind==='not wall')raw.deconstruction.kind='bed';
 if(kind==='extra state')raw.wallDoor296.cost=5;if(kind==='extra plan')raw.wallDoor296.plan.cost=5;
 if(kind==='missing material')delete raw.wallDoor296.plan.material;if(kind==='future revision')raw.wallDoor296.plan.revision=2;
 if(kind==='parent identity')raw.wallDoor296.plan.id=job.id;if(kind==='target identity')raw.wallDoor296.plan.id=job.deconstruction!.structureId;
 if(kind==='delivered goods')raw.escrow.wood=1;
 expect(validWallDoorJob296(job,296)).toBe(false);expect(validateWorld(world).length).toBeGreaterThan(0);
});

test.each(['state','plan','manual','parent'] as const)('descriptor accessors are refused with zero reads: %s',kind=>{
 const f=planned();let reads=0;const bad=clone(new SnapshotEncoder().encode(f.world,0,0));const job=jobOf(bad.world);
 const object=kind==='state'||kind==='parent'?job:kind==='plan'?job.wallDoor296!:job.wallDoor296!;
 const field=kind==='state'?'wallDoor296':kind==='plan'?'plan':kind==='manual'?'manual':'kind';
 Object.defineProperty(object,field,{enumerable:true,configurable:true,get(){reads++;return null;}});
 expect(validWallDoorHistoricalTransport296(bad,296)).toBe(false);expect(reads).toBe(0);
 for(const receiver of receivers()){expect(receiver.adopt(bad).status,receiver.constructor.name).toBe('resync');expect(reads).toBe(0);}
});

test.each(['structure','pawn','pile','archive'] as const)('wall-door state never belongs to a %s',kind=>{
 const state=planned().job.wallDoor296!;
 const raw=kind==='structure'?{structures:[{wallDoor296:state}]}:kind==='pawn'?{pawns:[{wallDoor296:state}]}:kind==='pile'?{piles:[{wallDoor296:state}]}:{worldGroups:{abandonedContents:[{items:[{wallDoor296:state}]}]}};
 expect(validWallDoorHistoricalTransport296(raw,296)).toBe(false);
});

test('presentation fence does not traverse terrain, health or geography',()=>{
 const {job}=planned(),raw={jobs:[job]};let reads=0;
 for(const key of ['tiles','planet','health'])Object.defineProperty(raw,key,{get(){reads++;throw Error('Not an owner lane');}});
 expect(validWallDoorHistoricalTransport296(raw,296)).toBe(true);expect(reads).toBe(0);
});

test('implicit canceled work requires exactly its living assigned pawn, never an idle reservation or queue alone',()=>{
 const f=planned();advanceDoorOverWall483(f.world,()=>f.world.pawns.some(p=>p.jobId===f.job.id));
 expect(f.job.wallDoor296!.fromBlueprint).toBe(true);delete f.job.wallDoor296!.plan;
 expect(validWallDoorWorld296(f.world)).toBe(true);expect(validateWorld(f.world)).toEqual([]);
 const owner=f.world.pawns.find(p=>p.jobId===f.job.id)!;owner.jobId=null;
 expect(validWallDoorWorld296(f.world)).toBe(false);owner.jobId=f.job.id;owner.state='dead';expect(validWallDoorWorld296(f.world)).toBe(false);
});

test('manual prior attribution can remain unmarked while an implicit current attribution cannot',()=>{
 const f=planned();advanceDoorOverWall483(f.world,()=>f.world.pawns.some(p=>p.jobId===f.job.id));
 delete f.job.wallDoor296!.fromBlueprint;expect(validWallDoorWorld296(f.world)).toBe(false);
 f.job.wallDoor296!.manual=true;expect(validWallDoorWorld296(f.world)).toBe(true);
 delete f.job.wallDoor296!.plan;expect(validWallDoorWorld296(f.world)).toBe(true);
});

test.each(['wall only removed','same cell different identity','job target only changed','implicit orphan','duplicate nested id','out of namespace'] as const)('both delta readers join current structures, inherited work and actors before committing: %s',kind=>{
 const f=planned(),encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),opening=clone(encoder.encode(f.world,0,0)),valid=clone(encoder.encode(f.world,0,0));
 if(valid.kind!=='delta')throw Error('Expected delta');const bad=clone(valid),job=jobOf(bad.world);
 if(kind==='wall only removed')bad.structures={removed:[f.ids.wallId],upserted:[]};
 if(kind==='same cell different identity'){const wall=clone(f.world.structures.find(s=>s.id===f.ids.wallId)!);wall.id=bad.world.nextId++;bad.structures={removed:[f.ids.wallId],upserted:[wall]};}
 if(kind==='job target only changed')job.deconstruction!.structureId=bad.world.nextId+99;
 if(kind==='implicit orphan')delete job.wallDoor296!.plan;
 if(kind==='duplicate nested id')job.wallDoor296!.plan!.id=f.world.piles[0]!.id;
 if(kind==='out of namespace')job.wallDoor296!.plan!.id=bad.world.nextId;
 for(const receiver of receivers()){
  const initial=receiver.adopt(clone(opening));expect(initial.status,initial.status==='resync'?initial.reason:receiver.constructor.name).toBe('applied');
  if(initial.status!=='applied')continue;const before=JSON.stringify(initial.world);
  expect(receiver.adopt(clone(bad)).status,receiver.constructor.name).toBe('resync');expect(JSON.stringify(initial.world)).toBe(before);
  const retry=receiver.adopt(clone(valid));expect(retry.status,retry.status==='resync'?retry.reason:receiver.constructor.name).toBe('applied');
 }
});

test('nested successor registers exactly once and collides with an already registered owner from any map',()=>{
 const f=planned(),ids=new Set<number>();expect(registerWallDoorPlanIds296(f.world,ids)).toEqual([]);expect([...ids]).toEqual([f.planId]);
 expect(registerWallDoorPlanIds296(f.world,ids).length).toBe(1);
 const otherMapIds=new Set([f.planId]);expect(registerWallDoorPlanIds296(f.world,otherMapIds).length).toBe(1);
 f.job.wallDoor296!.plan!.id=f.world.piles[0]!.id;expect(validWallDoorResidentNamespace296(f.world)).toBe(false);expect(validateWorld(f.world).length).toBeGreaterThan(0);
});

test('retained owner identity cannot be borrowed by a future plan in either reader',()=>{
 const f=planned();f.job.wallDoor296!.plan!.id=f.world.pawns[0]!.id;
 const packet=clone(new SnapshotEncoder().encode(f.world,0,0));
 for(const receiver of receivers())expect(receiver.adopt(clone(packet)).status,receiver.constructor.name).toBe('resync');
});

test('campaign-only rejects successor authority atomically, preserving the exact revision for a valid retry',()=>{
 const summary=campaignOnlySummary(copyDoorOverWall483(paid).world),encoder=new SnapshotEncoder(),geographic=encoder.encodeCampaignSummary(summary,true);
 const opening={type:'campaign-only' as const,epoch:1,revision:1,stepMs:0,speed:0,urgentThreats:{generation:1,pauseRevision:0,serial:0,urgentHeld:false,rows:[]},summary:geographic.state,...geographic.geography?{geography:geographic.geography}:{}};
 for(const receiver of receivers()){
  const first=receiver.adoptCampaignOnly(clone(opening));expect(first.status,first.status==='resync'?first.reason:receiver.constructor.name).toBe('applied');
  if(first.status!=='applied')continue;const before=JSON.stringify(first.summary),valid={...clone(opening),revision:2},bad=clone(valid);let reads=0;
  Object.defineProperty(bad.summary,'wallDoor296',{enumerable:true,get(){reads++;return {manual:false};}});
  expect(receiver.adoptCampaignOnly(bad).status,receiver.constructor.name).toBe('resync');expect(reads).toBe(0);expect(JSON.stringify(first.summary)).toBe(before);
  const retry=receiver.adoptCampaignOnly(clone(valid));expect(retry.status,retry.status==='resync'?retry.reason:receiver.constructor.name).toBe('applied');
 }
});
