import {expect,test} from 'vitest';
import {harness,carryingWork,downed,preparing,away,exact,resumed,contact,reachCarry} from './helpers/group-admission-v412.ts';
import {preparedMap} from './helpers/world-maps-v255.ts';
import {applyCommand,deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/index.ts';
import {flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {groupMemberReason} from '../src/sim/group-authority.ts';
import {campaignPresentation} from '../src/sim/secondary-site-presentation.ts';
import {SnapshotEncoder,SnapshotDecoder,type SnapshotMessage} from '../src/bridge/snapshots.ts';
import {applyMeleeStun} from '../src/sim/stun.ts';
import {attachPawnFire} from '../src/sim/fire.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {addCryptosleepSickness256} from '../src/sim/cryptosleep-sickness-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {createPrisonerState} from '../src/sim/prisoner-state.ts';
import {damagePile} from '../src/sim/thing-damage.ts';

test('real work cargo is acquired at contact; new formation waits for the captured edge before releasing all work and depositing locally',()=>{
 const f=carryingWork(),edge=structuredClone(f.p.motion),task=f.p.haul,orders=structuredClone(f.p.orders),cargoId=f.cargo.id,total=f.map.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0);
 exact(f.w,'01-work-held-before-command');const id=f.start([f.p]);
 expect(preparing(f,id).humanPreparation?.releaseIds).toContain(f.p.id);expect(f.p.haul).toBe(task);expect(f.p.motion).toEqual(edge);expect(f.p.orders).toEqual(orders);expect(f.cargo.owner.type).toBe('pawn');
 exact(f.w,'01-intent-before-edge-end');
 while(f.w.tick+1<edge!.end){f.step();expect(f.p.haul).toBe(task);expect(f.cargo.owner).toEqual({type:'pawn',pawnId:f.p.id});}
 f.until(()=>preparing(f,id).humanPreparation?.releaseIds.length===0,30);
 expect(f.p.haul).toBeNull();expect(f.p.orders).toEqual({active:null,queue:[]});expect(f.cargo.id).toBe(cargoId);expect(f.map.piles).toContain(f.cargo);expect(f.cargo.owner.type).toBe('ground');
 if(f.cargo.owner.type!=='ground')throw Error('Real work cargo was not deposited');expect(contact(f.cargo.owner,edge!.to)).toBe(true);
 expect(f.map.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0)).toBe(total);exact(f.w,'01-work-released');
});

test('global preflight refusal preserves the actual task, carried object, orders, allocator and random stream; captive refusal is explicit',()=>{
 const f=carryingWork(),food=f.map.piles.find(p=>p.item==='survival-meal'&&p.owner.type==='ground')!;
 const before=JSON.stringify(f.w),task=f.p.haul,cargo=f.cargo,edge=structuredClone(f.p.motion);
 expect(applyCommand(f.w,{type:'group-start',originMapId:0,memberIds:[f.p.id],sources:[{pileId:food.id,quantity:food.quantity+1}],destination:52},f.runtime).ok).toBe(false);
 expect(JSON.stringify(f.w)).toBe(before);expect(f.p.haul).toBe(task);expect(f.cargo).toBe(cargo);expect(f.p.motion).toEqual(edge);expect(f.w.worldGroups!.groups).toHaveLength(0);exact(f.w,'02-refused-no-interruption');
 const delayed=carryingWork(),promised=delayed.map.piles.find(p=>p.item==='survival-meal'&&p.owner.type==='ground')!,delayedTask=delayed.p.haul,delayedOrders=structuredClone(delayed.p.orders),delayedId=delayed.start([delayed.p]);
 expect(delayed.p.motion!.end).toBeGreaterThan(delayed.w.tick+1);expect(damagePile(delayed.map,promised,10000,'bomb')).toBe(true);expect(delayed.map.piles).not.toContain(promised);flushRegisteredMap(delayed.map);delayed.step();
 expect(delayed.w.worldGroups!.groups.some(r=>r.state.id===delayedId)).toBe(false);expect(delayed.p.haul).toBe(delayedTask);expect(delayed.p.orders).toEqual(delayedOrders);expect(delayed.cargo.owner).toEqual({type:'pawn',pawnId:delayed.p.id});exact(delayed.w,'02-delayed-refusal-keeps-ordinary-work');
 const c=harness(),p=c.map.pawns[1]!;p.faction='outlaws';p.prisoner=createPrisonerState(c.map,p);flushRegisteredMap(c.map);
 const unchanged=JSON.stringify(c.w);expect(groupMemberReason(c.map,p)).toContain('prisonniers');expect(applyCommand(c.w,{type:'group-start',originMapId:0,memberIds:[c.map.pawns[0]!.id,p.id],sources:[],destination:52},c.runtime).ok).toBe(false);expect(JSON.stringify(c.w)).toBe(unchanged);
});

test('a declared downed free colon is really picked, carried, departed and returned with the same patient, injury identities and possessions',()=>{
 const f=harness(),{patient,carrier,silver}=downed(f),medical=patient.health!,injuryIds=medical.injuries.map(i=>i.id),shirtIds=f.map.piles.filter(p=>p.owner.type==='apparel'&&p.owner.pawnId===patient.id).map(p=>p.id);
 const medicalIdentity=(record:typeof medical)=>({body:record.body,nextInjuryId:record.nextInjuryId,injuries:record.injuries.map(({id,part,kind,bornAt})=>({id,part,kind,bornAt})),missing:structuredClone(record.missing)}),medicalOrigin=medicalIdentity(medical);
 exact(f.w,'03-initial-prepared-patient');const id=f.start([carrier,patient]);
 reachCarry(f,id,patient,carrier);
 expect(f.map.pawns).toContain(patient);expect(f.map.pawns).toContain(carrier);expect(patient.health).toBe(medical);expect({x:patient.x,z:patient.z}).toEqual({x:carrier.x,z:carrier.z});const captured=carrier.motion?{...carrier.motion}:null;if(captured)delete captured.snowEntryPending;expect(patient.motion).toEqual(captured);expect(patient.motion).not.toBe(carrier.motion);expect(patient.path).toEqual([]);
 exact(f.w,'03-human-carried-on-real-edge');
 f.until(()=>f.w.worldGroups!.groups.some(r=>r.state.id===id&&'members'in r.state),1600);
 const g=away(f,id);expect(g.members).toContain(patient);expect(g.members).toContain(carrier);expect(f.map.pawns).not.toContain(patient);expect(patient.state).toBe('downed');expect(patient.health).toBe(medical);expect(medical.injuries.map(i=>i.id)).toEqual(injuryIds);expect(g.items).toContain(silver);expect(silver.owner).toEqual({type:'inventory',pawnId:patient.id});for(const shirt of shirtIds)expect(g.items.some(p=>p.id===shirt&&p.owner.type==='apparel'&&p.owner.pawnId===patient.id)).toBe(true);
 exact(f.w,'03-departed-originals');
 // Departure is still at the origin: the real night-rest guard may postpone
 // the first segment. Require an actual movement payment before turning back.
 f.until(()=>{const moving=away(f,id);return moving.stop===null&&moving.segment!==null&&moving.segment.remainingCore<moving.segment.totalCore;},2400);
 f.command({type:'group-route',groupId:id,destination:f.w.planet!.homeTile});
 f.until(()=>f.map.pawns.includes(patient)||f.w.worldGroups!.groups.some(r=>r.state.id===id&&'members'in r.state&&r.state.phase==='awaiting-entry'&&r.state.tile===f.w.planet!.homeTile&&r.state.segment===null),2400);
 if(!f.map.pawns.includes(patient))f.command({type:'group-enter',groupId:id,mode:'visit'});
 exact(f.w,'03-returned-before-medical-assertions');
 expect(f.map.pawns).toContain(patient);expect(patient.state).toBe('downed');expect(f.map.piles).toContain(silver);
 // Ordinary caravan tending commits a new MedicalRecord on the SAME Pawn.
 // Preserve injury identities/anatomy while allowing real treatment/healing.
 expect(patient.health).toBeDefined();expect(medicalIdentity(patient.health!)).toEqual(medicalOrigin);expect(patient.health!.tick).toBe(f.w.tick);expect(patient.health!.tick).toBeGreaterThan(g.departedAt);
 f.until(()=>!f.w.worldGroups!.groups.some(r=>r.state.id===id),300);
 expect(silver.owner.type).toBe('ground');expect(silver.quantity).toBe(7);expect(patient.health?.injuries.map(i=>i.id)).toEqual(injuryIds);expect(medicalIdentity(patient.health!)).toEqual(medicalOrigin);expect(patient.health!.tick).toBe(f.w.tick);exact(f.w,'03-returned-deposited');
});

test('save/reload and cancellation during a real carry edge keep both bodies, segment and possessions without teleportation',()=>{
 const f=harness(),{patient,carrier,silver}=downed(f),id=f.start([carrier,patient]);
 reachCarry(f,id,patient,carrier);
 const copy=resumed(f.w);exact(copy.w,'04-carried-reloaded');
 for(const a of [f,copy]){const g=preparing(a,id),row=g.humanPreparation!.passengers[0]!,p=a.map.pawns.find(p=>p.id===row.pawnId)!,q=a.map.pawns.find(p=>p.id===row.carrierId)!,position={x:p.x,z:p.z},motion=structuredClone(p.motion),carrierMotion=structuredClone(q.motion),owner=structuredClone(a.map.piles.find(i=>i.id===silver.id)!.owner);a.command({type:'group-cancel',groupId:id});expect(a.w.worldGroups!.groups).toHaveLength(0);expect({x:p.x,z:p.z}).toEqual(position);expect(p.motion).toEqual(motion);expect(q.motion).toEqual(carrierMotion);expect(a.map.piles.find(i=>i.id===silver.id)!.owner).toEqual(owner);expect(p.state).toBe('downed');}
 f.step();copy.step();expect(serializeCampaign(copy.w)).toBe(serializeCampaign(f.w));exact(f.w,'04-cancelled-edge-preserved');
});

test('fire, stun and a declared vomiting episode may consume the actor pass but end-of-tick reconciliation leaves saveable originals',()=>{
 for(const kind of ['fire','stun','vomit'] as const){const f=harness(),p=f.map.pawns[0]!,id=f.start([p]);
  // Explicit event stimuli, not a claim of naturally acquired injury/illness.
  if(kind==='fire')expect(attachPawnFire(f.map,p.id,.1)).toBe(true);
  if(kind==='stun')applyMeleeStun(f.map,p,f.w.tick*10);
  if(kind==='vomit'){p.health=createMedicalRecord(f.w.tick);addCryptosleepSickness256(p.health,new WorldGenerationRandom(218),257);p.health.cryptosleepSickness!.vomit={remainingCore:100,cell:{x:p.x,z:p.z}};}
  flushRegisteredMap(f.map);f.step();expect(f.w.worldGroups!.groups.some(r=>r.state.id===id)).toBe(false);expect(f.map.pawns).toContain(p);if(kind==='stun')expect(p.stun).toBeDefined();if(kind==='vomit')expect(p.health?.cryptosleepSickness?.vomit).toBeDefined();exact(f.w,`05-reconciled-${kind}`);
 }
});

test('strict old256 validates two maps and both historical groups before the scalar257 migration; no admission history is grafted',()=>{
 const f=harness(),other=preparedMap(f.w,52,'legacy-site',true),p=f.map.pawns[0]!,q=other.pawns[0]!;
 f.start([p]);f.command({type:'map-view',mapId:1});f.command({type:'group-start',originMapId:1,memberIds:[q.id],sources:[],destination:f.w.planet!.homeTile});
 // Declared historical shape at this unplayed gathering boundary only. This
 // is not a migration helper and never edits an archived/public fixture.
 const old=JSON.parse(serializeCampaign(f.w));old.schemaVersion=256;for(const r of old.worldGroups.groups){delete r.state.admission;delete r.state.humanPreparation;}
 const literal=JSON.stringify(old),groupBefore=structuredClone(old.worldGroups.groups),otherBefore=structuredClone(old.worldMaps.sites[1].map),loaded=deserializeCampaign(literal);
 expect(loaded.schemaVersion).toBe(257);expect(loaded.worldGroups!.groups).toEqual(groupBefore);expect(loaded.worldMaps!.sites[1]!.map).toEqual(otherBefore);expect(JSON.parse(serializeCampaign(loaded))).toEqual({...old,schemaVersion:257});
 for(const mutate of [(r:typeof old)=>r.worldGroups.groups[0].state.admission={revision:1},(r:typeof old)=>r.worldGroups.groups[1].state.humanPreparation={revision:1,releaseIds:[],passengers:[]},(r:typeof old)=>r.worldMaps.sites[1].map.pawns[0].jobId=r.nextId+100,(r:typeof old)=>r.schemaVersion=258]){const bad=structuredClone(old);mutate(bad);expect(()=>deserializeCampaign(JSON.stringify(bad))).toThrow();expect(serializeCampaign(loaded)).toBe(serializeCampaign(deserializeCampaign(literal)));}
 exact(loaded,'06-migrated-two-map-literal-groups');
});

test('raw admission refuses duplicate patients, wrong-map carrier and phase forged across the physical contact frontier without replacing the world',()=>{
 const f=harness(),{patient,carrier}=downed(f),id=f.start([carrier,patient]);preparedMap(f.w,52,'legacy-site',true);const raw=serializeCampaign(f.w),before=raw;
 for(const change of [(g:ReturnType<typeof preparing>)=>g.humanPreparation!.passengers.push({...g.humanPreparation!.passengers[0]!}),(g:ReturnType<typeof preparing>)=>g.humanPreparation!.passengers[0]!.carrierId=f.w.worldMaps!.sites[1]!.map!.pawns[0]!.id,(g:ReturnType<typeof preparing>)=>g.humanPreparation!.passengers[0]!.phase='carry']){const bad=JSON.parse(raw),g=bad.worldGroups.groups.find((r:{state:{id:number}})=>r.state.id===id).state;change(g);expect(()=>deserializeCampaign(JSON.stringify(bad))).toThrow();expect(serializeCampaign(f.w)).toBe(before);}
 exact(f.w,'07-original-after-invalid-raw');
});

test('RAW, full and same-tick delta agree during carry; malformed carrier metadata requests resync atomically and inactive map keeps references',()=>{
 const f=harness(),{patient,carrier}=downed(f),id=f.start([carrier,patient]);preparedMap(f.w,52,'legacy-site',true);
 reachCarry(f,id,patient,carrier);
 const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
 const adopt=(packet:SnapshotMessage<true>)=>{const result=decoder.adopt(packet);expect(result.status,result.status==='resync'?result.reason:result.status).toBe('applied');if(result.status!=='applied')throw Error('Actual packet not adopted');expect(result.world).toEqual(campaignPresentation(f.w));return result.world;};
 const full=structuredClone(encoder.encode(f.w,0,0));expect(full.kind).toBe('checkpoint');const accepted=adopt(full),frozen=structuredClone(accepted);exact(f.w,'08-carry-raw-before-transport');
 // A real command changes metadata at the same confirmed tick.
 f.command({type:'group-select',groupId:null});const good=structuredClone(encoder.encode(f.w,0,0)),bad=structuredClone(good),metadata=bad.world.campaignMap;expect(good.kind).toBe('delta');if(!metadata||metadata.revision!==2)throw Error('Actual campaign projection absent');const g=metadata.groups.find(r=>r.id===id)!.state;if(!('manifest'in g))throw Error('Actual preparation metadata absent');g.humanPreparation!.passengers[0]!.carrierId=patient.id;
 expect(decoder.adopt(bad).status).toBe('resync');expect(accepted).toEqual(frozen);adopt(good);
 f.command({type:'map-view',mapId:1});const inactive=structuredClone(encoder.encode(f.w,0,0));expect(inactive.kind).toBe('checkpoint');const view=adopt(inactive);expect(view.pawns.some(p=>p.id===patient.id)).toBe(false);expect(view.campaignMap?.revision).toBe(2);exact(f.w,'08-inactive-map-actual-owners');
});
