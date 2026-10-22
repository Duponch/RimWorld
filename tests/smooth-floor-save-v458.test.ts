import {expect,test} from 'vitest';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {validSmoothFloorsHistoricalTransport281,validSmoothFloorTile281,validSmoothFloorWorld281} from '../src/sim/smooth-floor-save-281.ts';
import {workProgress} from '../src/sim/work-progress.ts';
import {promoteRootMap,registeredMapForValidation} from '../src/sim/world-map-context.ts';
import {SnapshotEncoder,SnapshotDecoder,type SnapshotMessage} from '../src/bridge/snapshots.ts';
import {TileSnapshotCache} from '../src/bridge/tile-snapshot-cache.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {SCHEMA_VERSION,type Job,type World} from '../src/sim/types.ts';
import {preparedMap} from './helpers/world-maps-v255.ts';
import {smoothFloorCamp458} from './scenarios/smooth-floor-v458.ts';
import {prisonerSurgeryCamp457} from './scenarios/prisoner-surgery-v457.ts';

type Camp=ReturnType<typeof smoothFloorCamp458>;
const index=(c:Camp)=>c.cell.z*c.world.width+c.cell.x;
const worker=(c:Camp)=>c.world.pawns.find(p=>p.id===c.workerId)!;
const targetJob=(c:Camp)=>c.world.jobs.find(j=>j.kind==='smooth-floor'&&j.x===c.cell.x&&j.z===c.cell.z);
const historical280=(w:World):World=>{const copy=structuredClone(w);Object.assign(copy,{schemaVersion:280});return copy;};

/** The common scenario starts BEFORE excavation, with finite property and no
 * favorable stream. Only ordinary commands/ticks below create both surfaces. */
function excavated():Camp {
 const c=smoothFloorCamp458(),w=c.world;expect(validateWorld(w),JSON.stringify(c.preparation)).toEqual([]);
 expect(w.tiles[index(c)]).toMatchObject({terrain:'rock',stone:c.stone});
 expect(applyCommand(w,{type:'designate',kind:'mine',...c.cell})).toEqual({ok:true});
 for(let n=0;n<900&&w.tiles[index(c)]!.terrain==='rock';n++)stepWorld(w);
 expect(w.tiles[index(c)]).toMatchObject({terrain:'rough-stone',stone:c.stone});expect(validateWorld(w)).toEqual([]);return c;
}
function ordered(c:Camp):Job {
 expect(applyCommand(c.world,{type:'designate',kind:'smooth-floor',...c.cell})).toEqual({ok:true});
 const j=targetJob(c);expect(j).toBeDefined();expect(j?.progress).toBe(0);expect(j?.reservedBy).toBeNull();
 expect(validateWorld(c.world)).toEqual([]);return j!;
}
function worked(c:Camp):Job {
 const j=targetJob(c);if(!j)throw Error('Actual smoothing intent missing');
 for(let n=0;n<400&&workProgress(j)===0;n++)stepWorld(c.world);
 expect(worker(c).jobId).toBe(j.id);expect(j.status).toBe('active');expect(j.reservedBy).toBe(c.workerId);
 expect(workProgress(j)).toBeGreaterThan(0);expect(workProgress(j)).toBeLessThan(280);expect(validateWorld(c.world)).toEqual([]);return j;
}
function finished(c:Camp):void {
 for(let n=0;n<700&&c.world.tiles[index(c)]!.terrain!=='smoothed-stone';n++)stepWorld(c.world);
 expect(c.world.tiles[index(c)]).toMatchObject({terrain:'smoothed-stone',stone:c.stone});
 expect(targetJob(c)).toBeUndefined();expect(worker(c).jobId).toBeNull();expect(validateWorld(c.world)).toEqual([]);
}
function publication(w:World){
 const encoder=new SnapshotEncoder(),strict=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const packet=structuredClone(encoder.encode(w,0,0)),a=strict.adopt(structuredClone(packet)),b=resident.adopt(structuredClone(packet));
 expect(a.status,a.status==='resync'?a.reason:'strict checkpoint').toBe('applied');
 expect(b.status,b.status==='resync'?b.reason:'resident checkpoint').toBe('applied');
 if(a.status!=='applied'||b.status!=='applied')throw Error('Original smoothing publication refused');
 expect(b.world).toEqual(a.world);return {encoder,strict,resident,packet,a,b};
}
function rejectCheckpoint(packet:SnapshotMessage,label:string):void {
 expect(packet.kind,`${label}: checkpoint envelope`).toBe('checkpoint');
 const strict=new SnapshotDecoder().adopt(structuredClone(packet)),resident=new ResidentPresentationAssembler().adopt(structuredClone(packet));
 expect(strict.status,`${label}: fresh strict checkpoint; resident=${resident.status}`).toBe('resync');
 expect(resident.status,`${label}: fresh resident checkpoint; strict=${strict.status}`).toBe('resync');
}
function terrainCandidate(packet:SnapshotMessage,source:World,bad:World):SnapshotMessage {
 const candidate=structuredClone(packet);if(candidate.kind!=='delta')throw Error('Expected a fresh terrain delta');
 const cache=new TileSnapshotCache();cache.reset(source.tiles);const changes=cache.diff(bad.tiles);expect(changes.length).toBeGreaterThan(0);
 const changed=new Set(changes.map(c=>c[0]));candidate.tiles=[...(candidate.tiles??[]).filter(c=>!changed.has(c[0])),...changes].sort((a,b)=>a[0]-b[0]);return candidate;
}

test('valid280 BEFORE world migrates by number alone without mining, smoothing, job, inventory or random adoption',()=>{
 const c=smoothFloorCamp458(),old=historical280(c.world),raw=JSON.stringify(old),loaded=deserializeWorld(raw);
 expect(SCHEMA_VERSION).toBe(281);expect(validateWorld(loaded)).toEqual([]);
 expect(JSON.parse(serializeWorld(loaded))).toEqual({...old,schemaVersion:SCHEMA_VERSION});
 expect(loaded.tiles[index(c)]).toMatchObject({terrain:'rock',stone:c.stone});expect(loaded.jobs).toEqual([]);
 expect(loaded.tick).toBe(old.tick);expect(loaded.rng).toBe(old.rng);expect(loaded.nextId).toBe(old.nextId);
 expect(JSON.stringify(old)).toBe(raw);publication(old);
});

test('real new intent and real completed terrain cannot enter280 before migration, including fresh public delta and sparse terrain owner lanes',()=>{
 const c=excavated(),w=c.world;Object.assign(w,{schemaVersion:280});const q=publication(w),retained=structuredClone(q.a.world),shown=structuredClone(q.b.world);
 // Only the real command runs under281. Keep this same World and its arrays
 // while testing the forbidden280 successor, so it is a genuine delta.
 Object.assign(w,{schemaVersion:281});const j=ordered(c);Object.assign(w,{schemaVersion:280});
 expect(validSmoothFloorsHistoricalTransport281(w,280)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();
 rejectCheckpoint(structuredClone(new SnapshotEncoder().encode(w,0,0)),'future smooth mandate in280');
 const delta=structuredClone(q.encoder.encode(w,0,0));expect(delta.kind).toBe('delta');
 expect(q.strict.adopt(structuredClone(delta)).status).toBe('resync');expect(q.resident.adopt(structuredClone(delta)).status).toBe('resync');
 expect(q.a.world).toEqual(retained);expect(q.b.world).toEqual(shown);
 const corrected=structuredClone(delta);corrected.world.jobs=corrected.world.jobs.filter(job=>job.id!==j.id);
 expect(q.strict.adopt(structuredClone(corrected)).status).toBe('applied');expect(q.resident.adopt(corrected).status).toBe('applied');
 // The hostile candidates never delete the actual simulation's mandate.
 expect(targetJob(c)).toBe(j);Object.assign(w,{schemaVersion:281});worked(c);finished(c);
 const raw=serializeWorld(w),old=historical280(w),tile=structuredClone(w.tiles[index(c)]!);
 expect(()=>deserializeWorld(JSON.stringify(old))).toThrow();expect(validSmoothFloorsHistoricalTransport281(old,280)).toBe(false);
 rejectCheckpoint(structuredClone(new SnapshotEncoder().encode(old,0,0)),'future completed smoothed terrain in280');
 // Pure sparse fences, derived from the played result. These fragments are
 // not claimed to be standalone Worlds, collapse events or complete packets.
 const lanes=[{tiles:[tile]},{worldMaps:{sites:[{map:{tiles:[tile]}}]}},
  {tiles:[{terrain:'rock',stone:c.stone,collapsedRock:{terrain:'smoothed-stone'}}]},
  {type:'snapshot',world:{schemaVersion:280},tiles:[[index(c),'smoothed-stone']] }];
 for(const lane of lanes){expect(validSmoothFloorsHistoricalTransport281(lane,280)).toBe(false);expect(validSmoothFloorsHistoricalTransport281(lane,281)).toBe(true);expect(validSmoothFloorsHistoricalTransport281(lane,282)).toBe(false);}
 expect(serializeWorld(w)).toBe(raw);
});

test('real saved work and result survive both public readers; broken worker, progress, recipe and retained predecessor reject atomically',()=>{
 const c=excavated(),w=c.world,j=ordered(c);worked(c);const q=publication(w),retained=structuredClone(q.a.world),shown=structuredClone(q.b.world);
 const rawAtWork=serializeWorld(w),loaded=deserializeWorld(rawAtWork);expect(serializeWorld(loaded)).toBe(rawAtWork);
 expect(loaded.jobs.find(job=>job.id===j.id)).toEqual(j);expect(loaded.pawns.find(p=>p.id===c.workerId)?.jobId).toBe(j.id);
 stepWorld(w);expect(workProgress(j)).toBeGreaterThan(workProgress(retained.jobs.find(job=>job.id===j.id)!));expect(validateWorld(w)).toEqual([]);
 const full=structuredClone(new SnapshotEncoder().encode(w,0,0)),delta=structuredClone(q.encoder.encode(w,0,0));expect(delta.kind).toBe('delta');
 const mutations:[string,(view:World)=>void,('tile'|'transition')?][]=[
  ['job removed while its real worker retains jobId',v=>{v.jobs=v.jobs.filter(job=>job.id!==j.id);},'transition'],
  ['same ID retyped as another job',v=>{v.jobs.find(job=>job.id===j.id)!.kind='chop';},'transition'],
  ['paid blueprint injected',v=>{v.jobs.find(job=>job.id===j.id)!.construction='blueprint';}],
  ['construction material injected',v=>{v.jobs.find(job=>job.id===j.id)!.material='wood';}],
  ['escrow injected',v=>{v.jobs.find(job=>job.id===j.id)!.escrow.wood=1;}],
  ['actual worker loses only his reciprocal claim',v=>{v.pawns.find(p=>p.id===c.workerId)!.jobId=null;}],
  ['pending mandate improperly retains worked progress',v=>{const job=v.jobs.find(job=>job.id===j.id)!,p=v.pawns.find(p=>p.id===c.workerId)!;job.status='pending';job.reservedBy=null;p.jobId=null;p.state='idle';}],
  ['unfinished work already at completion threshold',v=>{v.jobs.find(job=>job.id===j.id)!.progress=280;}],
  ['source stone missing',v=>{delete v.tiles[index(c)]!.stone;},'tile'],
 ];
 for(const [label,mutate,lane] of mutations){
  const bad=structuredClone(w);mutate(bad);expect(validateWorld(bad).length,label).toBeGreaterThan(0);
  expect(validSmoothFloorWorld281(bad,q.a.world),label).toBe(false);expect(()=>deserializeWorld(JSON.stringify(bad)),label).toThrow();
  // RAW certifies the complete pawn/job references. A fresh public checkpoint
  // has no previous smoothing identity once that job is removed or retyped;
  // it does not provide generic certification of absent jobId/order targets.
  // Those two mutants therefore retain strict RAW and same-epoch delta checks
  // with the real predecessor, without claiming fresh-checkpoint attestation.
  if(lane!=='transition'){const cp=structuredClone(full);mutate(cp.world as World);rejectCheckpoint(cp,label);}
  const candidate=lane==='tile'?terrainCandidate(delta,w,bad):structuredClone(delta);if(lane!=='tile')mutate(candidate.world as World);
  expect(q.strict.adopt(structuredClone(candidate)).status,`${label}: strict same-epoch transition`).toBe('resync');expect(q.resident.adopt(candidate).status,`${label}: resident same-epoch transition`).toBe('resync');
  expect(q.a.world,label).toEqual(retained);expect(q.b.world,label).toEqual(shown);
 }
 const a=q.strict.adopt(structuredClone(delta)),b=q.resident.adopt(delta);expect(a.status).toBe('applied');expect(b.status).toBe('applied');
 if(a.status!=='applied'||b.status!=='applied')throw Error('Actual work delta refused after hostile candidates');expect(b.world).toEqual(a.world);
 const workRetained=structuredClone(a.world),shownWork=structuredClone(b.world);finished(c);
 const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);publication(w);
 const result=structuredClone(q.encoder.encode(w,0,0));expect(result.kind).toBe('delta');
 const done=q.strict.adopt(structuredClone(result)),doneShown=q.resident.adopt(result);expect(done.status).toBe('applied');expect(doneShown.status).toBe('applied');
 if(done.status!=='applied'||doneShown.status!=='applied')throw Error('Actual terrain completion delta refused');expect(doneShown.world).toEqual(done.world);
 expect(done.world.tiles[index(c)]).toMatchObject({terrain:'smoothed-stone',stone:c.stone});expect(done.world.jobs.some(job=>job.id===j.id)).toBe(false);
 expect(a.world).toEqual(workRetained);expect(b.world).toEqual(shownWork);expect(q.a.world).toEqual(retained);expect(q.b.world).toEqual(shown);
 const finalCheckpoint=structuredClone(new SnapshotEncoder().encode(w,0,0)),finalDelta=structuredClone(q.encoder.encode(w,0,0)),finalRetained=structuredClone(done.world),finalShown=structuredClone(doneShown.world);
 const tileMutations:[string,(view:World)=>void][]=[['completed terrain without stone',v=>{delete v.tiles[index(c)]!.stone;}],['completed terrain with false wood material',v=>{Object.assign(v.tiles[index(c)]!,{stone:'wood'});}],['completed terrain with injected ore',v=>{v.tiles[index(c)]!.ore='steel';}]];
 for(const [label,mutate] of tileMutations){
  const bad=structuredClone(w);mutate(bad);expect(validSmoothFloorTile281(bad.tiles[index(c)]!,281)).toBe(false);expect(validateWorld(bad).length).toBeGreaterThan(0);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
  const cp=structuredClone(finalCheckpoint);mutate(cp.world as World);rejectCheckpoint(cp,label);
  const candidate=terrainCandidate(finalDelta,w,bad);expect(q.strict.adopt(structuredClone(candidate)).status,`${label}: strict same-epoch transition`).toBe('resync');expect(q.resident.adopt(candidate).status,`${label}: resident same-epoch transition`).toBe('resync');
  expect(done.world).toEqual(finalRetained);expect(doneShown.world).toEqual(finalShown);
 }
 expect(q.strict.adopt(structuredClone(finalDelta)).status).toBe('applied');expect(q.resident.adopt(finalDelta).status).toBe('applied');
 expect(serializeWorld(w)).toBe(raw);
});

test('future282 cannot enter RAW, tile domain or fresh public checkpoint/delta, preserving the current world',()=>{
 const c=smoothFloorCamp458(),w=c.world,q=publication(w),retained=structuredClone(q.a.world),shown=structuredClone(q.b.world),future=structuredClone(w);
 Object.assign(future,{schemaVersion:282});expect(validSmoothFloorWorld281(future)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(future))).toThrow();
 expect(validSmoothFloorTile281({terrain:'smoothed-stone',stone:'granite'},282)).toBe(false);
 const full=structuredClone(q.packet);Object.assign(full.world,{schemaVersion:282});rejectCheckpoint(full,'future schema282');
 const good=structuredClone(q.encoder.encode(w,0,0)),bad=structuredClone(good);expect(good.kind).toBe('delta');Object.assign(bad.world,{schemaVersion:282});
 expect(q.strict.adopt(structuredClone(bad)).status).toBe('resync');expect(q.resident.adopt(bad).status).toBe('resync');
 expect(q.a.world).toEqual(retained);expect(q.b.world).toEqual(shown);
 expect(q.strict.adopt(structuredClone(good)).status).toBe('applied');expect(q.resident.adopt(good).status).toBe('applied');
});

test('completed original stone remains authoritative on an inactive real map and is checked before280 migration',()=>{
 const c=excavated(),w=c.world;ordered(c);worked(c);finished(c);expect(applyCommand(w,{type:'planet-adopt'})).toEqual({ok:true});
 const planet=w.planet;if(!planet||planet.revision===3)throw Error('Expected the common legacy fixture planet');
 const tile=planet.tiles.find(t=>t.id!==planet.homeTile&&t.id!==planet.civilianTile&&t.biome!=='ocean'&&t.hilliness!=='mountainous');if(!tile)throw Error('Missing legal second-map destination');
 // Declared empty landscape and real owner promotion, not another colony or
 // a journey. Original terrain, people, property and clocks are retained.
 const other=preparedMap(w,tile.id,'legacy-site',false),id=w.worldMaps!.sites.find(s=>s.map?.pawns===other.pawns)!.id;
 promoteRootMap(w,id);expect(applyCommand(w,{type:'map-view',mapId:id})).toEqual({ok:true});
 const original=registeredMapForValidation(w,0)!;expect(original.tiles[index(c)]).toMatchObject({terrain:'smoothed-stone',stone:c.stone});expect(validateWorld(w)).toEqual([]);
 const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);expect(()=>deserializeWorld(JSON.stringify(historical280(w)))).toThrow();
 const bad=structuredClone(w);delete bad.worldMaps!.sites.find(s=>s.id===0)!.map!.tiles[index(c)]!.stone;
 expect(validateWorld(bad).length).toBeGreaterThan(0);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();expect(serializeWorld(w)).toBe(raw);
});

test('a real ongoing captive prosthesis service from280 migrates to281 by number alone with request, task, doses and anatomy unchanged',()=>{
 const c=prisonerSurgeryCamp457('missing-leg'),w=c.world,doctor=w.pawns.find(p=>p.id===c.doctorId)!;
 expect(validateWorld(w),JSON.stringify(c.preparation)).toEqual([]);
 expect(applyCommand(w,{type:'surgery-install',pawnId:c.patientId,part:'left-leg',implant:'prosthetic-leg'})).toEqual({ok:true});
 expect(applyCommand(w,{type:'priority',pawnId:c.doctorId,work:'doctor',value:1})).toEqual({ok:true});
 for(let n=0;n<700&&doctor.surgery?.phase!=='work';n++)stepWorld(w);
 expect(doctor.surgery?.phase).toBe('work');expect(validateWorld(w)).toEqual([]);
 const old=historical280(w),raw=JSON.stringify(old),loaded=deserializeWorld(raw);
 expect(JSON.parse(serializeWorld(loaded))).toEqual({...old,schemaVersion:281});expect(loaded.pawns.find(p=>p.id===c.doctorId)?.surgery).toEqual(doctor.surgery);
 expect(loaded.pawns.find(p=>p.id===c.patientId)?.surgeryRequest).toEqual(w.pawns.find(p=>p.id===c.patientId)?.surgeryRequest);
 expect(loaded.pawns.find(p=>p.id===c.patientId)?.health).toEqual(w.pawns.find(p=>p.id===c.patientId)?.health);
 expect(loaded.rng).toBe(old.rng);expect(loaded.tick).toBe(old.tick);expect(loaded.nextId).toBe(old.nextId);expect(JSON.stringify(old)).toBe(raw);
 publication(old);publication(loaded);
});
