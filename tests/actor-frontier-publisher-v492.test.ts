
import{afterEach,test,vi}from'vitest';
import assert from'node:assert/strict';
import{prepared}from'./frontier-runtime-harness';
import{CorePhasePublisher297}from'../src/bridge/core-phase-publisher-297';
import{CorePhaseFrameOwner297}from'../src/bridge/core-phase-owner-297';
import{AudioCueRecorder}from'../src/bridge/audio-cues';
import{MotionRecorder}from'../src/bridge/motion-tracks';
import{advanceWorldCore297}from'../src/sim/engine';
import{effectiveCore297}from'../src/sim/core-phase-297';
import{deserializeCampaign,validateWorld,serializeCampaign}from'../src/sim/serialization';
import{physicalVisibleCoreMap297,coreMapId297}from'../src/bridge/core-phase-data-297';
import{TerrainJournalSnapshotEncoder}from'../src/bridge/terrain-journal-encoder';
import{peekTerrainJournalCursor,markTerrainCellChanged,invalidateTerrainJournal,TERRAIN_JOURNAL_CAPACITY}from'../src/sim/terrain-mutation-journal';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function setup(doorAtCore?:number,frontier=true,enroll=true){
 const root=deserializeCampaign(prepared({doorAtCore}).raw);assert.ok('tiles' in root,'Prepared fixture must own its local map');const local=()=>physicalVisibleCoreMap297(root)!,p=new CorePhasePublisher297(),motion=new MotionRecorder(),owner=new CorePhaseFrameOwner297();motion.capture(local());
 const encoder=new TerrainJournalSnapshotEncoder();if(enroll)encoder.encode(local(),0,6,true);
 const seeded=p.prepareFull(local(),1,1,motion.snapshot(),coreMapId297(local()),frontier?'frontier':undefined);p.commitFull(seeded,1000);
 const full=owner.adoptFull(structuredClone(local()),1,1,structuredClone(motion.snapshot()),seeded.metadata,6);
 const step=(proof=true)=>{const result=advanceWorldCore297(root),w=local(),row=result.maps.find(x=>x.mapId===coreMapId297(w))!;assert.ok(row);motion.capture(w);
  p.observe({core:result.core,actorsChanged:row.actorsChanged,projectileEvents:row.projectileEvents,requiresFull:row.requiresHardFull297},result.localTickCompleted,1000+result.core);
  if(result.localTickCompleted&&proof)p.observeMacroActors297(w);return{result,row};};
 const realFull=(revision=2)=>{const packet=encoder.encode(local(),0,6);assert.ok(packet);return p.prepareFull(local(),1,revision,motion.snapshot(),coreMapId297(local()),frontier?'frontier':undefined);};
 return{root,local,p,motion,owner,seeded,fullWorld:full.world,step,encoder,realFull};
}
test('a real macro needs an explicit post-suffix membership/dependency proof before any frontier can be prepared',()=>{
 const h=setup();for(let i=0;i<10;i++)h.step(false);assert.equal(effectiveCore297(h.root),10);assert.equal(h.p.canPublishActors297,false);assert.throws(()=>h.p.preparePhase(h.local(),h.motion.snapshot(),6),'Unproved postmacro capture cannot leak actors');
 const second=h.local().pawns[1]!,before=second.planCooldown;second.planCooldown=before===7?8:7;assert.deepEqual(validateWorld(h.root),[],'Controlled publisher-input mutation remains a genuine valid297 World');
 h.p.observeMacroActors297(h.local());const tx=h.p.preparePhase(h.local(),h.motion.snapshot(),6);assert.equal(tx.packet.type,'actor-frontier-297');assert.deepEqual(tx.packet.actors.map(x=>x.id).sort((a,b)=>a-b),h.local().pawns.map(x=>x.id).sort((a,b)=>a-b));
 const row=tx.packet.actors.find(x=>x.id===second.id)!;assert.ok(row.kind==='human');assert.equal(row.fields.planCooldown,second.planCooldown,'Every post-suffix slot is copied, including a field absent from movement dirty evidence');
 const borrowed=row.fields.planCooldown;second.planCooldown=0;assert.equal(row.fields.planCooldown,borrowed,'Prepared rows do not retain mutable actor fields');
 const staged=h.owner.prepare(tx.packet);h.p.commitPhase(tx,1020);const projection=h.owner.commit(staged);assert.equal(projection.actorScene.core,10);assert.equal(effectiveCore297(projection.world),0);assert.equal(projection.world,h.fullWorld);
 const record=projection.actorScene.byId[second.id]!;assert.ok(record.kind==='human');assert.equal(record.actor.planCooldown,borrowed);
});
test('dependency change atmacro10 stays hard after a later macro returns to baseline; only commitFull reseeds it',()=>{
 const h=setup(),pawn=h.local().pawns[0]!;assert.ok(pawn.appearance);const original=pawn.appearance.hairColor;
 for(let i=0;i<10;i++)h.step(false);pawn.appearance.hairColor=original^0x000101;assert.deepEqual(validateWorld(h.root),[]);h.p.observeMacroActors297(h.local());assert.equal(h.p.canDeferFull,false);assert.equal(h.p.canPublishActors297,false);
 for(let i=0;i<10;i++)h.step(false);pawn.appearance.hairColor=original;h.p.observeMacroActors297(h.local());assert.equal(h.p.canPublishActors297,false,'Later equality cannot clear the historical hard latch');
 const abandoned=h.realFull(2);assert.equal(h.p.canPublishActors297,false,'Preparation is not a baseline commit');h.step(false);assert.throws(()=>h.p.commitFull(abandoned,1040),/raced/);
 const whole=serializeCampaign(h.root),fresh=h.realFull(2);h.p.commitFull(fresh,1041);assert.equal(h.p.needsFull,false);assert.equal(h.p.canPublishActors297,true);assert.equal(serializeCampaign(h.root),whole,'Publication changes no SIM field');
});
test('failed or abandoned actor staging retains dirty proof and only a current successful commit consumes it',()=>{
 const h=setup();h.step();const tx=h.p.preparePhase(h.local(),h.motion.snapshot(),6),staged=h.owner.prepare(tx.packet);assert.equal(h.owner.currentCore,0);assert.equal(h.p.hasPending,true);
 h.step();assert.throws(()=>h.p.commitPhase(tx,1020),/Stale/);assert.equal(h.owner.currentCore,0);assert.equal(h.p.hasPending,true);
 const retry=h.p.preparePhase(h.local(),h.motion.snapshot(),6),current=h.owner.prepare(retry.packet);h.p.commitPhase(retry,1021);const projection=h.owner.commit(current);assert.equal(projection.core,2);assert.equal(h.p.hasPending,false);assert.throws(()=>h.owner.commit(staged),/Stale/);
});
test('a genuine old door cue outside the current frontier window falls back to owned Full preparation without early drain',()=>{
 const h=setup(11),audio=new AudioCueRecorder();audio.capture(h.local());
 for(let i=0;i<20;i++){const result=advanceWorldCore297(h.root),w=h.local(),row=result.maps.find(x=>x.mapId===coreMapId297(w))!;h.motion.capture(w);audio.capturePhysical297(w,result.core,row.strikeAudio297,row.shotAudio297);}
 const queued=audio.preparePublication297();assert.ok(queued.cues.some(c=>c.kind==='door.close'&&c.tick===1.1));
 const base=h.realFull(2);h.p.commitFull(base,1020);assert.equal(h.p.audioFitsPhase297(h.local(),queued.cues),false,'Earlier owned cue cannot be relabelled as current Core');
 h.p.requestFull();const abandoned=h.realFull(3);assert.equal(h.p.needsFull,true);assert.deepEqual(audio.preparePublication297().cues,queued.cues,'Eligibility and abandoned Full preparation do not drain');
 assert.throws(()=>audio.commitPublication297(structuredClone(queued)),/Stale/);assert.deepEqual(audio.preparePublication297().cues,queued.cues,'A copied shape has no queue-commit proof');
 h.p.commitFull(abandoned,1040);audio.commitPublication297(queued);assert.equal(audio.preparePublication297().cues.length,0);assert.equal(h.p.needsFull,false);
});
test('an anchor without explicit frontier mode retains historical same-civil and Hold20 policy',()=>{
 const h=setup(undefined,false);for(let i=0;i<10;i++)h.step(false);assert.equal(h.p.frontierMode297,false);assert.equal(h.p.canDeferFull,true);assert.equal(h.p.quietBudgetExpired(1029.999),false);assert.equal(h.p.quietBudgetExpired(1030),true);assert.throws(()=>h.p.preparePhase(h.local(),h.motion.snapshot(),6),/Full publication/);
});

test.each(['mark-aba','bulk','overflow','replacement']as const)('terrain %s after a real Full codec is hard until another true Full commit',kind=>{
 const h=setup();h.step();const w=h.local(),before=peekTerrainJournalCursor(w.tiles);assert.ok(before,'Only the initial real fixed codec enrolled the positive owner');
 if(kind==='mark-aba'){const old=w.tiles[0]!.fogged;w.tiles[0]!.fogged=true;markTerrainCellChanged(w.tiles,0);if(old===undefined)delete w.tiles[0]!.fogged;else w.tiles[0]!.fogged=old;markTerrainCellChanged(w.tiles,0);}
 else if(kind==='bulk')invalidateTerrainJournal(w.tiles);
 else if(kind==='overflow')for(let i=0;i<=TERRAIN_JOURNAL_CAPACITY;i++)markTerrainCellChanged(w.tiles,0);
 else w.tiles=structuredClone(w.tiles);
 assert.equal(h.p.terrainNeedsFull297(w),true);assert.throws(()=>h.p.preparePhase(w,h.motion.snapshot(),6),/Full publication/);assert.equal(h.p.canPublishActors297,false);assert.equal(h.p.canDeferFull,false,'Terrain invalidation latches hard, not merely quiet');
 const staged=h.realFull(2);assert.equal(h.p.needsFull,true,'Successful codec capture and Full preparation alone do not clear the old cursor');assert.equal(h.p.terrainNeedsFull297(w),true);
 h.p.commitFull(staged,1020);assert.equal(h.p.terrainNeedsFull297(w),false);assert.equal(h.p.canPublishActors297,true);assert.equal(h.p.needsFull,false);
});
test('a terrain change before a completed macro remains hard even when actor dependencies are otherwise equal',()=>{
 const h=setup();for(let n=0;n<9;n++)h.step();markTerrainCellChanged(h.local().tiles,0);h.step(false);assert.equal(effectiveCore297(h.root),10);
 h.p.observeMacroActors297(h.local());assert.equal(h.p.canPublishActors297,false);assert.equal(h.p.canDeferFull,false);assert.throws(()=>h.p.preparePhase(h.local(),h.motion.snapshot(),6),/Full publication/);
});
test('a read-only missing terrain owner never enrolls itself or grants frontier eligibility',()=>{
 const h=setup(undefined,true,false),w=h.local();assert.equal(peekTerrainJournalCursor(w.tiles),undefined);h.step();
 assert.equal(h.p.terrainNeedsFull297(w),true);assert.throws(()=>h.p.preparePhase(w,h.motion.snapshot(),6),/Full publication/);assert.equal(peekTerrainJournalCursor(w.tiles),undefined,'Publisher peek/preparation did not enroll or repair the map');
 const valid=h.realFull(2);assert.ok(peekTerrainJournalCursor(w.tiles),'Actual fixed codec alone enrolls it');assert.equal(h.p.needsFull,true);h.p.commitFull(valid,1020);assert.equal(h.p.terrainNeedsFull297(w),false);
});
test('stale and abandoned Full transactions cannot consume terrain changes observed by a newer actual Core',()=>{
 const h=setup();h.step();markTerrainCellChanged(h.local().tiles,0);assert.throws(()=>h.p.preparePhase(h.local(),h.motion.snapshot(),6),/Full publication/);
 const abandoned=h.realFull(2);assert.equal(h.p.terrainNeedsFull297(h.local()),true);h.step(false);assert.throws(()=>h.p.commitFull(abandoned,1020),/raced/);
 assert.equal(h.p.terrainNeedsFull297(h.local()),true);assert.equal(h.p.needsFull,true);
 h.p.commitFull(h.realFull(3),1040);assert.equal(h.p.terrainNeedsFull297(h.local()),false);assert.equal(h.p.needsFull,false);
});
