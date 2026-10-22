import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {hasPrisonerSurgery280,validPrisonerSurgeryHistoricalTransport280,validPrisonerSurgeryWorld280} from '../src/sim/prisoner-surgery-save-280.ts';
import {SnapshotEncoder,SnapshotDecoder,type SnapshotMessage} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {promoteRootMap,registeredMapForValidation} from '../src/sim/world-map-context.ts';
import {SCHEMA_VERSION,type World} from '../src/sim/types.ts';
import {preparedMap} from './helpers/world-maps-v255.ts';
import {prisonerSurgeryCamp457} from './scenarios/prisoner-surgery-v457.ts';

type Camp=ReturnType<typeof prisonerSurgeryCamp457>;
type Mode=Parameters<typeof prisonerSurgeryCamp457>[0];
const modes=['infected-leg','missing-leg'] as const;
const historical279=(w:World):World=>{const old=structuredClone(w);Object.assign(old,{schemaVersion:279});return old;};
const person=(c:Camp,id:number)=>c.world.pawns.find(p=>p.id===id)!;

function requested(mode:Mode):Camp {
 const c=prisonerSurgeryCamp457(mode),w=c.world;
 expect(validateWorld(w),JSON.stringify(c.preparation)).toEqual([]);
 expect(applyCommand(w,mode==='infected-leg'
  ?{type:'surgery-request',pawnId:c.patientId,part:'left-leg'}
  :{type:'surgery-install',pawnId:c.patientId,part:'left-leg',implant:'prosthetic-leg'})).toEqual({ok:true});
 expect(validateWorld(w)).toEqual([]);return c;
}
function administered(c:Camp):void {
 const w=c.world,doctor=person(c,c.doctorId);
 expect(applyCommand(w,{type:'priority',pawnId:c.doctorId,work:'doctor',value:1})).toEqual({ok:true});
 // The supplied adult captivity, healed absence/infection and finite supplies
 // are declared starting property. Bed admission, path, transport and first
 // anesthetic dose below are played; no outcome or RNG is selected/reset.
 for(let i=0;i<700&&doctor.surgery?.phase!=='work';i++)stepWorld(w);
 expect(doctor.surgery?.phase,JSON.stringify({tick:w.tick,doctor,patient:person(c,c.patientId)})).toBe('work');
 expect(doctor.surgery?.patientId).toBe(c.patientId);expect(doctor.surgery?.bedId).toBe(c.bedId);
 expect(person(c,c.patientId).health?.anesthetic).toBeDefined();expect(validateWorld(w)).toEqual([]);
}
function public280(w:World){
 const encoder=new SnapshotEncoder(),strict=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const packet=structuredClone(encoder.encode(w,0,0)),a=strict.adopt(structuredClone(packet)),b=resident.adopt(structuredClone(packet));
 expect(a.status,a.status==='resync'?a.reason:'strict checkpoint').toBe('applied');
 expect(b.status,b.status==='resync'?b.reason:'resident checkpoint').toBe('applied');
 if(a.status!=='applied'||b.status!=='applied')throw Error('Original captive clinical publication refused');
 expect(b.world).toEqual(a.world);return {encoder,strict,resident,packet,a,b};
}
function refusedCheckpoint(packet:SnapshotMessage):void {
 expect(packet.kind).toBe('checkpoint');
 expect(new SnapshotDecoder().adopt(structuredClone(packet)).status).toBe('resync');
 expect(new ResidentPresentationAssembler().adopt(structuredClone(packet)).status).toBe('resync');
}

test('valid279 captive without surgical intent migrates by number alone, preserving the real prison and clinical preparations',()=>{
 const c=prisonerSurgeryCamp457(),old=historical279(c.world),raw=JSON.stringify(old),loaded=deserializeWorld(raw);
 expect(SCHEMA_VERSION).toBe(280);expect(validateWorld(loaded)).toEqual([]);
 expect(JSON.parse(serializeWorld(loaded))).toEqual({...old,schemaVersion:SCHEMA_VERSION});
 expect(loaded.pawns.find(p=>p.id===c.patientId)?.prisoner).toEqual(person(c,c.patientId).prisoner);
 expect(loaded.rng).toBe(old.rng);expect(loaded.tick).toBe(old.tick);expect(loaded.nextId).toBe(old.nextId);
 expect(JSON.stringify(old)).toBe(raw);expect(hasPrisonerSurgery280(loaded)).toBe(false);public280(old);
});

test.each(modes)('%s captive intent is refused in279 before migration, including fresh public deltas, without adopting or erasing the predecessor',mode=>{
 const c=prisonerSurgeryCamp457(mode),bad=c.world;expect(validateWorld(bad)).toEqual([]);
 Object.assign(bad,{schemaVersion:279});const q=public280(bad),retained=structuredClone(q.a.world),shown=structuredClone(q.b.world);
 // The command explicitly runs under280. Only the version is changed around
 // it: keep this exact World and its original arrays so the forbidden279
 // publication is a true next delta, not a replacement checkpoint.
 Object.assign(bad,{schemaVersion:280});
 expect(applyCommand(bad,mode==='infected-leg'
  ?{type:'surgery-request',pawnId:c.patientId,part:'left-leg'}
  :{type:'surgery-install',pawnId:c.patientId,part:'left-leg',implant:'prosthetic-leg'})).toEqual({ok:true});
 expect(validateWorld(bad)).toEqual([]);Object.assign(bad,{schemaVersion:279});
 expect(bad.pawns.find(p=>p.id===c.patientId)?.surgeryRequest).toBeDefined();
 expect(validPrisonerSurgeryHistoricalTransport280(bad,279)).toBe(false);
 expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow(/Future captive surgery/);
 const full=structuredClone(new SnapshotEncoder().encode(bad,0,0));refusedCheckpoint(full);
 const delta=structuredClone(q.encoder.encode(bad,0,0));expect(delta.kind).toBe('delta');
 expect(q.strict.adopt(structuredClone(delta)).status).toBe('resync');expect(q.resident.adopt(structuredClone(delta)).status).toBe('resync');
 expect(q.a.world).toEqual(retained);expect(q.b.world).toEqual(shown);
 // Reuse this still-fresh revision with the legal old body: rejection cannot
 // advance either reader or silently delete the prospective request.
 const corrected=structuredClone(delta);delete corrected.world.pawns.find(p=>p.id===c.patientId)!.surgeryRequest;
 expect(q.strict.adopt(structuredClone(corrected)).status).toBe('applied');expect(q.resident.adopt(corrected).status).toBe('applied');
 expect(bad.pawns.find(p=>p.id===c.patientId)?.surgeryRequest).toBeDefined();
});

test.each(modes)('%s real captive operation survives RAW/checkpoint/resident delta; broken patient, doctor and actual bed links reject atomically',mode=>{
 const c=requested(mode),w=c.world,q=public280(w),retained=structuredClone(q.a.world),shown=structuredClone(q.b.world);
 administered(c);const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);expect(validPrisonerSurgeryWorld280(w)).toBe(true);
 const checkpoint=structuredClone(new SnapshotEncoder().encode(w,0,0)),delta=structuredClone(q.encoder.encode(w,0,0));
 expect(checkpoint.kind).toBe('checkpoint');expect(delta.kind).toBe('delta');
 const mutations:[string,(world:World)=>void][]=[
  ['missing actual patient intent',v=>{delete v.pawns.find(p=>p.id===c.patientId)!.surgeryRequest;}],
  ['actual patient removed while the doctor retains the operation',v=>{v.pawns=v.pawns.filter(p=>p.id!==c.patientId);} ],
  ['different requested member',v=>{v.pawns.find(p=>p.id===c.patientId)!.surgeryRequest!.part='right-leg';}],
  ['doctor targeting himself',v=>{v.pawns.find(p=>p.id===c.doctorId)!.surgery!.patientId=c.doctorId;}],
  ['doctor permission revoked',v=>{v.pawns.find(p=>p.id===c.doctorId)!.priorities.doctor=0;}],
  ['actual prison bed made civilian',v=>{delete v.structures.find(s=>s.id===c.bedId)!.prisoner;}],
  ['task points at a different real staff bed',v=>{v.pawns.find(p=>p.id===c.doctorId)!.surgery!.bedId=v.pawns.find(p=>p.id===c.doctorId)!.bedId!;}],
 ];
 for(const [label,mutate] of mutations){
  const bad=structuredClone(w);mutate(bad);expect(validateWorld(bad).length,label).toBeGreaterThan(0);
  expect(validPrisonerSurgeryWorld280(bad),label).toBe(false);expect(()=>deserializeWorld(JSON.stringify(bad)),label).toThrow();
  const badFull=structuredClone(checkpoint);mutate(badFull.world as World);refusedCheckpoint(badFull);
  const badDelta=structuredClone(delta);mutate(badDelta.world as World);
  expect(q.strict.adopt(structuredClone(badDelta)).status,label).toBe('resync');expect(q.resident.adopt(badDelta).status,label).toBe('resync');
  expect(q.a.world,label).toEqual(retained);expect(q.b.world,label).toEqual(shown);
 }
 const a=q.strict.adopt(structuredClone(delta)),b=q.resident.adopt(delta);
 expect(a.status,a.status==='resync'?a.reason:'strict operation delta').toBe('applied');expect(b.status,b.status==='resync'?b.reason:'resident operation delta').toBe('applied');
 if(a.status!=='applied'||b.status!=='applied')throw Error('Original valid operation delta refused after hostile candidates');
 expect(b.world).toEqual(a.world);expect(a.world.pawns.find(p=>p.id===c.patientId)?.prisoner).toEqual(person(c,c.patientId).prisoner);
 expect(a.world.pawns.find(p=>p.id===c.doctorId)?.surgery).toEqual(person(c,c.doctorId).surgery);
 expect(q.a.world).toEqual(retained);expect(q.b.world).toEqual(shown);expect(serializeWorld(w)).toBe(raw);
});

test('historical sparse owner domains reject the captive/intent pair without scanning geography or banning current pending held intentions',()=>{
 const c=requested('missing-leg'),pawn=structuredClone(person(c,c.patientId));
 // These are sparse fence inputs, not fabricated complete holders or Worlds.
 // Existing pending free/captive intentions remain literals in current
 // owner domains; this fence does not execute an off-map operation.
 const inputs=[{pawns:[pawn]},{worldMaps:{sites:[{map:{pawns:[pawn]}}]}},
  {worldPawns:{owners:[{pawn}]}},{structures:[{shipCryptosleep277:{occupant:{kind:'human',pawn}}}]},
  {type:'snapshot',world:{schemaVersion:279,pawns:[pawn]}},
  {type:'snapshot',world:{schemaVersion:279},structures:{removed:[],upserted:[{shipCryptosleep277:{occupant:{kind:'human',pawn}}}]}}];
 for(const input of inputs){
  expect(validPrisonerSurgeryHistoricalTransport280(input,279)).toBe(false);
  expect(validPrisonerSurgeryHistoricalTransport280(input,280)).toBe(true);
  expect(validPrisonerSurgeryHistoricalTransport280(input,281)).toBe(false);
 }
 let reads=0;const sparse={pawns:[pawn]},ordinary={pawns:[]};
 for(const input of [sparse,ordinary])for(const key of ['tiles','resources','planet'])Object.defineProperty(input,key,{enumerable:true,get(){reads++;throw Error('Terrain must not be read');}});
 expect(validPrisonerSurgeryHistoricalTransport280(sparse,279)).toBe(false);
 expect(validPrisonerSurgeryHistoricalTransport280(ordinary,279)).toBe(true);expect(reads).toBe(0);
});

test('future281 is rejected by RAW, prospective domain and fresh checkpoint/delta readers without touching the retained280 world',()=>{
 const c=requested('missing-leg'),w=c.world,q=public280(w),retained=structuredClone(q.a.world),shown=structuredClone(q.b.world),future=structuredClone(w);
 Object.assign(future,{schemaVersion:281});expect(validPrisonerSurgeryWorld280(future)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(future))).toThrow();
 const full=structuredClone(q.packet);Object.assign(full.world,{schemaVersion:281});refusedCheckpoint(full);
 const good=structuredClone(q.encoder.encode(w,0,0)),bad=structuredClone(good);Object.assign(bad.world,{schemaVersion:281});
 expect(q.strict.adopt(structuredClone(bad)).status).toBe('resync');expect(q.resident.adopt(bad).status).toBe('resync');
 expect(q.a.world).toEqual(retained);expect(q.b.world).toEqual(shown);
 expect(q.strict.adopt(structuredClone(good)).status).toBe('applied');expect(q.resident.adopt(good).status).toBe('applied');
});

test('the original prison on an inactive real map is validated before279 migration and its pending280 implant remains saved without a local substitute',()=>{
 const c=requested('missing-leg'),w=c.world;
 expect(applyCommand(w,{type:'planet-adopt'})).toEqual({ok:true});
 const planet=w.planet;if(!planet||planet.revision===3)throw Error('Expected the declared legacy planet producer');
 const destination=planet.tiles.find(t=>t.id!==planet.homeTile&&t.id!==planet.civilianTile&&t.biome!=='ocean'&&t.hilliness!=='mountainous');
 if(!destination)throw Error('No legal legacy second-map fixture destination');
 // Declared independent empty landscape, not a caravan journey or a second
 // colony. The original prison, people, requests and goods are never copied
 // into that map: the normal owner promotion stores their actual map body.
 const other=preparedMap(w,destination.id,'legacy-site',false),otherId=w.worldMaps!.sites.find(s=>s.map?.pawns===other.pawns)!.id;
 promoteRootMap(w,otherId);expect(applyCommand(w,{type:'map-view',mapId:otherId})).toEqual({ok:true});
 expect(w.pawns.some(p=>p.id===c.patientId)).toBe(false);
 const original=registeredMapForValidation(w,0)!;expect(original.pawns.find(p=>p.id===c.patientId)?.surgeryRequest?.implant).toBe('prosthetic-leg');
 expect(original.structures.find(s=>s.id===c.bedId)).toMatchObject({prisoner:true,medical:true});expect(validateWorld(w)).toEqual([]);
 const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
 const old=historical279(w);expect(validPrisonerSurgeryHistoricalTransport280(old,279)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(old))).toThrow(/Future captive surgery/);
 delete old.worldMaps!.sites.find(s=>s.id===0)!.map!.pawns.find(p=>p.id===c.patientId)!.surgeryRequest;
 expect(JSON.parse(serializeWorld(deserializeWorld(JSON.stringify(old))))).toEqual({...old,schemaVersion:SCHEMA_VERSION});
 expect(serializeWorld(w)).toBe(raw);
});
