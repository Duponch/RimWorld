import {expect,test} from 'vitest';
import {validPartyField292,validPartyNonOwner292} from '../src/sim/party-state-292.ts';
import {validPartyHistoricalTransport292,validPartyTask292,validPartyWorld292} from '../src/sim/party-save-292.ts';
import {serializeWorld,deserializeWorld,validateCampaignSchema291} from '../src/sim/serialization.ts';
import {releaseAssignments} from '../src/sim/work-release.ts';
import {forestryCamp471} from './scenarios/forestry-v471.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {newCryptosleepHolder271,cryptosleepInteraction271,type PlayerCasket271} from '../src/sim/cryptosleep-state-271.ts';
import {planCryptosleepEntry271,planCryptosleepRelease271} from '../src/sim/cryptosleep-transfer-271.ts';
import {createMedicalRecord} from '../src/sim/injury-state.ts';
import {medicalCamp} from './scenarios/health.ts';
import {registryCamp,preparedMap} from './helpers/world-maps-v255.ts';
import {flushRegisteredMap,registeredMapId} from '../src/sim/world-map-context.ts';
import {validWorldMapRegistry} from '../src/sim/world-map-save.ts';

function camp(){const w=forestryCamp471(false),p=w.pawns[0]!,now=w.tick*10;w.party292={adoptedAtCore:now,nextCheckCore:now+5000,rng:1,pending:false};return {w,p,now};}
function active(){const {w,p,now}=camp();w.party292!.lastStartedAtCore=now;w.party292!.active={startedAtCore:now,durationCore:5000,advancedAtCore:now,organizerId:p.id,site:{x:p.x,z:p.z},members:[]};return {w,p,now};}

test('Party starter preserves absent first-start date, pending and independent RNG across exact whole reload',()=>{
 const {w}=camp();w.party292!.pending=true;const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);expect(w.party292!.lastStartedAtCore).toBeUndefined();
});
test('strict 291 migration changes only schema and offers no Party owner, memory, opportunity or task',()=>{
 const {w}=camp();delete w.party292;const old=JSON.parse(serializeWorld(w));old.schemaVersion=291;expect(validateCampaignSchema291(old)).toEqual([]);
 const result=deserializeWorld(JSON.stringify(old));expect(JSON.parse(serializeWorld(result))).toEqual({...old,schemaVersion:293});
});
test('future Party discriminants are rejected in literal 291 and future 294 remains closed',()=>{
 const {w,now}=active();expect(validPartyHistoricalTransport292(w,291)).toBe(false);expect(validPartyHistoricalTransport292(w,293)).toBe(true);expect(validPartyHistoricalTransport292(w,294)).toBe(false);
 expect(validPartyHistoricalTransport292({world:{tick:w.tick},pawns:{removed:[],upserted:[{recreation:{task:{activity:'party',partyStartedAtCore:now,target:{x:1,z:1},buildingId:null,phase:'travel',elapsed:0}}}]}},291)).toBe(false);
 expect(validPartyTask292({activity:'skygaze',partyStartedAtCore:now},292,w.tick,w.width,w.height)).toBe(false);
});
test('Party active event may have no members and never grants its organizer an implicit membership',()=>{
 const {w,p}=active();expect(validPartyWorld292(w)).toBe(true);expect(p.recreation.task).toBeNull();expect(p.partyMemories292).toBeUndefined();
 w.party292!.active!.organizerId=w.nextId;expect(validPartyWorld292(w)).toBe(false);
});
test('Party membership is reciprocal at arrival before the first presence interval',()=>{
 const {w,p,now}=active();w.party292!.active!.organizerJoined=true;w.party292!.active!.members=[{pawnId:p.id,joinedAtCore:now,presentCore:0}];
 p.state='recreating';p.recreation.task={activity:'party',partyStartedAtCore:now,buildingId:null,target:{x:p.x,z:p.z},phase:'active',elapsed:0};
 expect(validPartyWorld292(w)).toBe(true);p.recreation.task.partyStartedAtCore=now-10;expect(validPartyWorld292(w)).toBe(false);
});
test('Party memory scalar and owner dates survive same-person transport but task cannot outlive the local event',()=>{
 const {w,p,now}=active();p.partyMemories292=[{at:w.tick,power:.5}];expect(validPartyWorld292(w)).toBe(true);
 p.recreation.task={activity:'party',partyStartedAtCore:now,buildingId:null,target:{x:p.x,z:p.z},phase:'travel',elapsed:0};expect(validPartyWorld292(w)).toBe(false);
});
test('Party strict owner descriptors reject getters, explicit undefined and future dates without reading them',()=>{
 const {w}=camp();let reads=0;const owner={};Object.defineProperty(owner,'party292',{enumerable:true,get(){reads++;throw Error('getter');}});
 expect(validPartyField292(owner,292,w.tick,w.width,w.height,w.nextId)).toBe(false);expect(reads).toBe(0);
 expect(validPartyField292({party292:undefined},292,w.tick,w.width,w.height,w.nextId)).toBe(false);
 w.party292!.adoptedAtCore=w.tick*10+1;expect(validPartyWorld292(w)).toBe(false);expect(validPartyNonOwner292({kind:'tree',party292:undefined})).toBe(false);
});
test('Party release through the ordinary interruption path removes membership before a new assignment',()=>{
 const {w,p,now}=active();w.party292!.active!.organizerJoined=true;w.party292!.active!.members=[{pawnId:p.id,joinedAtCore:now,presentCore:0}];
 p.recreation.task={activity:'party',partyStartedAtCore:now,buildingId:null,target:{x:p.x,z:p.z},phase:'active',elapsed:0};p.state='recreating';
 releaseAssignments(w,p);expect(w.party292!.active).toBeUndefined();expect(p.recreation.task).toBeNull();expect(p.partyMemories292).toBeUndefined();
});

test('Party full and Resident checkpoint refusal is atomic and retries the exact valid revision',()=>{
 const {w}=camp(),encoder=new SnapshotEncoder(),valid=structuredClone(encoder.encode(w,0,0));if(valid.kind!=='checkpoint')throw Error('Expected checkpoint');
 const bad=structuredClone(valid);bad.world.party292!.rng=0;
 for(const receiver of [new SnapshotDecoder(),new ResidentPresentationAssembler()]){
  expect(receiver.adopt(structuredClone(bad)).status).toBe('resync');const result=receiver.adopt(structuredClone(valid));expect(result.status).toBe('applied');
  if(result.status==='applied')expect(result.world.party292).toEqual(w.party292);
 }
});
test('Party memory delta preserves retained owners on rejection then accepts the identical valid revision',()=>{
 const {w,p}=camp(),encoder=new SnapshotEncoder(),receivers=[new SnapshotDecoder(),new ResidentPresentationAssembler()],opening=structuredClone(encoder.encode(w,0,0));
 const held=receivers.map(receiver=>{const result=receiver.adopt(structuredClone(opening));if(result.status!=='applied')throw Error('Opening not applied');return {world:result.world,before:JSON.stringify(result.world)};});
 p.partyMemories292=[{at:w.tick,power:.5}];const valid=structuredClone(encoder.encode(w,0,0));if(valid.kind!=='delta')throw Error('Expected delta');
 const bad=structuredClone(valid);bad.world.pawns[0]!.partyMemories292![0]!.power=0;
 for(const [i,receiver] of receivers.entries()){
  expect(receiver.adopt(structuredClone(bad)).status).toBe('resync');expect(JSON.stringify(held[i]!.world)).toBe(held[i]!.before);
  const result=receiver.adopt(structuredClone(valid));expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world.pawns[0]!.partyMemories292).toEqual(p.partyMemories292);
 }
});
test('the same actual human carries a Party memory into a real casket transfer and resumes its suspended age',()=>{
 const {w,p}=camp(),at=w.tick;p.health=createMedicalRecord(at);p.partyMemories292=[{at:at-100,power:.5}];
 const c:PlayerCasket271={id:w.nextId++,kind:'cryptosleep-casket',x:20,z:20,orientation:0,footprint:'standard',material:'steel',cryptosleep:newCryptosleepHolder271(at)};w.structures.push(c);
 Object.assign(p,cryptosleepInteraction271(c),{state:'idle',need:null,path:[],moveCooldown:0,motion:null});p.cryptosleepTask={action:'enter',casketId:c.id,phase:'closing',progressCore:500,lastWorkedAt:at};
 const entry=planCryptosleepEntry271(w,c,p);expect(entry.ok).toBe(true);if(!entry.ok)throw Error(entry.reason);expect(entry.commit()).toBe(true);
 expect(c.cryptosleep.human).toBe(p);expect(w.pawns.includes(p)).toBe(false);expect(p.partyMemories292).toEqual([{at:at-100,power:.5}]);
 expect(validPartyHistoricalTransport292({structures:[c]},292)).toBe(true);expect(validPartyHistoricalTransport292({structures:[c]},291)).toBe(false);
 // Declared prospective release boundary, not an executed season or campaign.
 w.tick=at+500;const release=planCryptosleepRelease271(w,c,'deconstruct');expect(release.ok).toBe(true);if(!release.ok)throw Error(release.reason);expect(release.commit()).toBe(true);
 expect(w.pawns.find(q=>q.id===p.id)).toBe(p);expect(p.partyMemories292).toEqual([{at:at-100,power:.5,suspendedTicks:500}]);expect(p.cryptosleepHeldAt271).toBeUndefined();
});
test('a never-joined organizer entering a real casket closes for remaining members and frozen recipients refuse before any transfer',()=>{
 for(const frozen of [false,true]){
  const w=medicalCamp(2),[p,survivor]=w.pawns,at=w.tick,now=at*10;p!.health=createMedicalRecord(at);
  w.party292={adoptedAtCore:0,nextCheckCore:now+5000,rng:1,pending:false,lastStartedAtCore:now-1000,active:{startedAtCore:now-1000,durationCore:5000,advancedAtCore:now,organizerId:p!.id,site:{x:12,z:12},members:[{pawnId:survivor!.id,joinedAtCore:now-1000,presentCore:500}]}};
  survivor!.state='recreating';survivor!.recreation.task={activity:'party',partyStartedAtCore:now-1000,buildingId:null,target:{x:survivor!.x,z:survivor!.z},phase:'active',elapsed:50};
  const c:PlayerCasket271={id:w.nextId++,kind:'cryptosleep-casket',x:20,z:20,orientation:0,footprint:'standard',material:'steel',cryptosleep:newCryptosleepHolder271(at)};w.structures.push(c);
  Object.assign(p!,cryptosleepInteraction271(c),{state:'idle',need:null,path:[],moveCooldown:0,motion:null});p!.cryptosleepTask={action:'enter',casketId:c.id,phase:'closing',progressCore:500,lastWorkedAt:at};
  if(frozen)Object.preventExtensions(survivor!);const before=JSON.stringify(w),plan=planCryptosleepEntry271(w,c,p!);expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);
  expect(plan.commit()).toBe(!frozen);
  if(frozen){expect(JSON.stringify(w)).toBe(before);expect(w.pawns.includes(p!)).toBe(true);expect(c.cryptosleep.human).toBeNull();}
  else{expect(c.cryptosleep.human).toBe(p);expect(p!.partyMemories292).toBeUndefined();expect(survivor!.partyMemories292).toHaveLength(1);expect(w.party292.active).toBeUndefined();expect(survivor!.recreation.task).toBeNull();}
 }
});
test('Party remains a retained local map field through whole reload and selected full publication while 291 rejects it',()=>{
 const root=registryCamp(),remote=preparedMap(root),mapId=registeredMapId(remote)!;
 remote.party292={adoptedAtCore:remote.tick*10,nextCheckCore:remote.tick*10+5000,rng:17,pending:true};flushRegisteredMap(remote);
 expect(validWorldMapRegistry(root)).toBe(true);const raw=serializeWorld(root);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
 const historical=JSON.parse(raw);historical.schemaVersion=291;expect(validWorldMapRegistry(historical)).toBe(false);expect(validateCampaignSchema291(historical).length).toBeGreaterThan(0);expect(()=>deserializeWorld(JSON.stringify(historical))).toThrow(/Party/i);
 root.worldMaps!.selectedMapId=mapId;const packet=structuredClone(new SnapshotEncoder().encode(root,0,0));if(packet.kind!=='checkpoint')throw Error('Expected full selected map');
 for(const receiver of [new SnapshotDecoder(),new ResidentPresentationAssembler()]){const result=receiver.adopt(structuredClone(packet));expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world.party292).toEqual(remote.party292);}
 expect(root.party292).toBeUndefined();expect(remote.party292.pending).toBe(true);
});
