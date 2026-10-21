import {expect,test} from 'vitest';
import {harness,away,resumed} from './helpers/group-admission-v412.ts';
import {serializeCampaign,deserializeCampaign,validateWorld} from '../src/sim/serialization.ts';
import {flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {campaignPresentation} from '../src/sim/secondary-site-presentation.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {administerAnesthetic,validAnesthetic,anestheticCivilBornAt271} from '../src/sim/anesthetic.ts';
import {reconcilePawnHealth} from '../src/sim/health.ts';
import {medicalCivilTick271} from '../src/sim/suspended-human-clock-271.ts';
import {newCryptosleepHolder271,type PlayerCasket271} from '../src/sim/cryptosleep-state-271.ts';
import {hiveDefeatThoughts256} from '../src/sim/cave-hive-memories-256.ts';
import {researchCost,CRYPTOSLEEP_RESEARCH_COST271} from '../src/sim/research.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import type {Pawn,World} from '../src/sim/types.ts';

/** Reuse the single-colony admission workshop and its finite provisions.
 * Casket, prerequisites, initial anesthetic dose and hive memory are declared
 * preparation. No operation, hive victory, research or construction is claimed.
 * Carry,500-Core closing, held time,300-Core opening and group departure must
 * all execute on the same originals through ordinary commands and ticks. */
test('the same anesthetized casket occupant really departs with continued clinical cadence and hive memory through save and public transport',()=>{
 const f=harness(),{map,w}=f,carrier=map.pawns[0]!,patient=map.pawns[1]!;
 for(const p of [carrier,patient]){delete p.background;delete p.traits;delete p.health;p.schedule.fill('work');}
 Object.assign(carrier,{x:21,z:14});Object.assign(patient,{x:22,z:14});
 // Keep the scenario's already completed clothing record and its exact points;
 // only the explicitly prepared prerequisite projects are added here.
 w.research={...w.research!,project:null,
  smithing:{points:researchCost('smithing'),completedAt:w.tick},machining:{points:researchCost('machining'),completedAt:w.tick},
  microelectronics:{points:researchCost('microelectronics'),completedAt:w.tick},multiAnalyzer:{points:researchCost('multi-analyzer'),completedAt:w.tick},
  cryptosleep:{points:CRYPTOSLEEP_RESEARCH_COST271,completedAt:w.tick}};
 const casket:PlayerCasket271={id:map.nextId++,kind:'cryptosleep-casket',x:23,z:14,orientation:0,footprint:'standard',material:'steel',cryptosleep:newCryptosleepHolder271(w.tick)};
 map.structures.push(casket);patient.health=createMedicalRecord(w.tick);
 expect(administerAnesthetic(patient.health,()=>.999999)).toBe(true);patient.hiveDefeats=[w.tick];
 const doseAt=w.tick,hiveAt=w.tick,personId=patient.id;
 reconcilePawnHealth(map,patient);expect(patient.state).toBe('downed');flushRegisteredMap(map);expect(validateWorld(w)).toEqual([]);

 f.command({type:'order-carry-cryptosleep',pawnId:carrier.id,patientId:personId,casketId:casket.id});
 f.until(()=>carrier.cryptosleepTask?.phase==='closing',400);const closingAt=w.tick;
 f.until(()=>casket.cryptosleep.human===patient,400);
 expect(w.tick-closingAt).toBe(50);
 expect(map.pawns.includes(patient)).toBe(false);expect(casket.cryptosleep.human).toBe(patient);
 const heldAt=casket.cryptosleep.heldAt,heldHealth=structuredClone(patient.health),heldClinical=patient.health!.tick;
 for(let i=0;i<37;i++)f.step();
 expect(patient.health).toEqual(heldHealth);expect(patient.hiveDefeats).toEqual([hiveAt]);
 f.command({type:'order-open-cryptosleep',pawnId:carrier.id,casketId:casket.id});
 f.until(()=>carrier.cryptosleepTask?.phase==='opening',400);const openingAt=w.tick;
 f.until(()=>casket.cryptosleep.human===null,400);
 expect(w.tick-openingAt).toBe(30);
 expect(map.pawns.find(p=>p.id===personId)).toBe(patient);expect(patient.cryptosleepHeldAt271).toBeUndefined();
 const releasedAt=w.tick,suspended=releasedAt-heldAt;
 expect(suspended).toBeGreaterThanOrEqual(37+30);expect(patient.health!.tick).toBe(heldClinical);
 expect(medicalCivilTick271(patient.health!)).toBe(releasedAt);expect(patient.health!.anesthetic).toBeDefined();
 expect(anestheticCivilBornAt271(patient.health!)).toBe(doseAt);expect(patient.health!.anesthetic!.severity).toBe(heldHealth!.anesthetic!.severity);
 expect(patient.hiveDefeats).toEqual([hiveAt]);expect(patient.hiveDefeatSuspendedTicks271).toEqual([suspended]);
 expect(hiveDefeatThoughts256(patient,releasedAt)[0]!.expiresAt).toBe(hiveAt+60_000+suspended);

 const id=f.start([carrier,patient],4);
 f.until(()=>w.worldGroups!.groups.some(r=>r.state.id===id&&'members'in r.state),1600);
 const g=away(f,id);expect(g.members.find(p=>p.id===personId)).toBe(patient);expect(map.pawns.includes(patient)).toBe(false);
 const check=(p:Pawn,clock:number)=>{
  expect(medicalCivilTick271(p.health!)).toBe(clock);expect(clock-p.health!.tick).toBe(suspended);
  expect(validAnesthetic(p.health!.anesthetic,p.health!.tick,true,p.id%20,clock,271)).toBe(true);expect(validAnesthetic(p.health!.anesthetic,p.health!.tick,true,p.id%20,clock,w.schemaVersion)).toBe(true);
  expect(anestheticCivilBornAt271(p.health!)).toBe(doseAt);expect(p.hiveDefeats).toEqual([hiveAt]);
  expect(p.hiveDefeatSuspendedTicks271).toEqual([suspended]);expect(p.cryptosleepHeldAt271).toBeUndefined();
 };
 check(patient,w.tick);expect(validateWorld(w)).toEqual([]);
 const saved=serializeCampaign(w),literal271={...JSON.parse(saved),schemaVersion:271},old=JSON.stringify(literal271),copy=deserializeCampaign(old);
 // Strict271 retains the same acquired group, pulse anchors and memories;272
 // contributes only its version number, without a dose, person or progress.
 expect(serializeCampaign(copy)).toBe(saved);expect(JSON.stringify(literal271)).toBe(old);
 if(!('pawns'in copy))throw Error('Actual loaded colony lost at group reload');
 const replay=resumed(copy),replayed=away(replay,id).members.find(p=>p.id===personId)!;check(replayed,copy.tick);

 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
 const publish=()=>{const packet=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(packet.status,packet.status==='resync'?packet.reason:packet.status).toBe('applied');if(packet.status!=='applied')throw Error('Actual group publication refused');expect(packet.world).toEqual(campaignPresentation(w));return packet.world;};
 const publicPerson=(view:World)=>{const group=view.campaignMap?.revision===2?view.campaignMap.groups.find(r=>r.id===id)?.state:undefined;if(!group||!('members'in group))throw Error('Actual away group absent from publication');return group.members.find(p=>p.id===personId)!;};
 const first=publish(),frozen=structuredClone(first);check(publicPerson(first),w.tick);
 const severity=patient.health!.anesthetic!.severity,clinical=patient.health!.tick;
 for(let i=0;i<21;i++){f.step();replay.step();}
 expect(serializeCampaign(replay.w)).toBe(serializeCampaign(w));expect(patient.health!.tick-clinical).toBe(21);
 expect(patient.health!.anesthetic!.severity).toBeLessThan(severity);check(patient,w.tick);check(replayed,replay.w.tick);
 const second=publish();check(publicPerson(second),w.tick);expect(first).toEqual(frozen);
 expect(serializeCampaign(deserializeCampaign(serializeCampaign(w)))).toBe(serializeCampaign(w));
},60_000);
