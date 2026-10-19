import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots';
import type {Request} from '../src/bridge/protocol';
import type {PawnTrack} from '../src/bridge/motion-tracks';
import {addFilth} from '../src/sim/filth';
import {WorkerNaturalAppearance} from '../src/bridge/worker-natural-appearance';
import {residentPublication,readResidentWorkerMessage,type ResidentAuxiliaryEnvelope} from '../src/bridge/resident-protocol';
import {fixture} from './resident-presentation-fixtures-v427';
import {ResidentAuxiliaryEncoder} from '../src/bridge/resident-auxiliary-sections';
import {ResidentVegetationAssembler} from '../src/bridge/resident-vegetation-assembler';
import {ResidentMotionRecorder} from '../src/bridge/resident-motion';
import {SimulationClient,type SnapshotReader} from '../src/bridge/SimulationClient';

function harness(){const world=fixture(),base=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),natural=new WorkerNaturalAppearance(),aux=new ResidentAuxiliaryEncoder(),recorder=new ResidentMotionRecorder(),reader=new ResidentVegetationAssembler(),strict=new SnapshotDecoder();
 const capture=(checkpoint=false)=>{recorder.capture(world);const full={...base.encode(world,0,1,checkpoint),motion:recorder.snapshot()},oracle=structuredClone(full),appearance=natural.capture(world,full),prepared=aux.capture(full);return{oracle,envelope:structuredClone(residentPublication(prepared.publication,appearance,prepared.auxiliary))};};
 const unwrap=(envelope:ResidentAuxiliaryEnvelope)=>{const packet=readResidentWorkerMessage(envelope);if(packet.type!=='snapshot')throw Error('Wrong kind');return packet;};
 const send=(checkpoint=false)=>{const row=capture(checkpoint),packet=unwrap(row.envelope),result=reader.adopt(packet),expected=strict.adopt(row.oracle);expect(result.status).toBe('applied');expect(expected.status).toBe('applied');if(result.status!=='applied'||expected.status!=='applied')throw Error('Refused');expect(result.world).toStrictEqual(expected.world);expect(reader.readMotion(packet)).toStrictEqual(row.oracle.motion);return{...row,packet,world:result.world,motion:reader.readMotion(packet)!};};return{world,base,natural,aux,recorder,reader,strict,capture,unwrap,send};}

test('fixed V3 reconstructs motion and all World fields before complete atomic admission',()=>{
 const h=harness(),a=h.send(),oldWorld=structuredClone(a.world),oldMotion=structuredClone(a.motion);h.world.pawns[0]!.motion={from:{x:4,z:4},to:{x:5,z:4},start:h.world.tick,end:h.world.tick+3};h.world.home=[0,1];const b=h.send();expect(b.envelope.publication.motion).toBe(0);expect(b.motion[0]!.segments.length).toBe(1);expect(a.world).toStrictEqual(oldWorld);expect(a.motion).toStrictEqual(oldMotion);
 const c=h.send();expect(c.motion[0]).toBe(b.motion[0]);expect(c.world.home).toBe(b.world.home);
});

test.each(['refuse','throw'] as const)('late full-admission %s leaves no readable partial motion and permits exact retry',mode=>{
 const h=harness(),a=h.send(),before=structuredClone(a.motion);h.world.home=[2,3];h.world.pawns[0]!.motion={from:{x:4,z:4},to:{x:5,z:4},start:h.world.tick,end:h.world.tick+3};const row=h.capture(),packet=h.unwrap(row.envelope);
 const extra=()=>{if(mode==='throw')throw Error('late motion probe');return false;};if(mode==='throw')expect(()=>h.reader.adopt(packet,extra)).toThrow('late motion probe');else expect(h.reader.adopt(packet,extra).status).toBe('resync');expect(()=>h.reader.readMotion(packet)).toThrow('before successful admission');expect(h.reader.readMotion(a.packet)).toStrictEqual(before);
 expect(h.reader.adopt(packet).status).toBe('applied');expect(h.reader.readMotion(packet)).toStrictEqual(row.oracle.motion);expect(h.reader.readMotion(a.packet)).toStrictEqual(before);
});

test('legacy V2 and V3 without motion extension remain literal; reentry without predecessor requires a checkpoint',()=>{
 const h=harness();h.send();
 const full={...h.base.encode(h.world,0,1),motion:h.recorder.snapshot()},appearance=h.natural.capture(h.world,full);h.aux.capture(full);const v2=residentPublication(full,appearance),packet=readResidentWorkerMessage(structuredClone(v2));if(packet.type!=='snapshot')throw Error('Wrong kind');expect(h.reader.adopt(packet).status).toBe('applied');expect(h.reader.readMotion(packet)).toStrictEqual(full.motion);
 const later=h.capture(),laterPacket=h.unwrap(later.envelope);expect(h.reader.adopt(laterPacket).status).toBe('resync');expect(()=>h.reader.readMotion(laterPacket)).toThrow();
 const reset=h.send(true),legacy=structuredClone(reset.envelope);delete (legacy.auxiliary as {motion?:unknown}).motion;Object.assign(legacy.publication,{motion:reset.oracle.motion});const fresh=new ResidentVegetationAssembler(),literalPacket=h.unwrap(legacy);expect(fresh.adopt(literalPacket).status).toBe('applied');expect(fresh.readMotion(literalPacket)).toStrictEqual(reset.oracle.motion);
});

test('missing motion sidecar marker and invalid natural metadata refuse the combined transaction',()=>{
 const h=harness(),a=h.send(),old=structuredClone(a.motion),row=h.capture(),missing=structuredClone(row.envelope);delete (missing.auxiliary as {motion?:unknown}).motion;expect(h.reader.adopt(h.unwrap(missing)).status).toBe('resync');
 const bad=structuredClone(row.envelope);Object.assign(bad.natural,{tick:bad.natural.tick+1});const rejected=h.unwrap(bad);expect(h.reader.adopt(rejected).status).toBe('resync');expect(()=>h.reader.readMotion(rejected)).toThrow();expect(h.reader.readMotion(a.packet)).toStrictEqual(old);const p=h.unwrap(row.envelope);expect(h.reader.adopt(p).status).toBe('applied');expect(h.reader.readMotion(p)).toStrictEqual(row.oracle.motion);
});

test('a filth capture exception after motion preparation permits an exact retry of the same producer revision',()=>{
 const h=harness();h.world.tiles[2+3*h.world.width]={terrain:'soil'};expect(addFilth(h.world,{x:2,z:3},'blood')).toBe(true);const a=h.send(),oldWorld=structuredClone(a.world),oldMotion=structuredClone(a.motion);
 h.world.home=[2,3];h.world.pawns[0]!.motion={from:{x:4,z:4},to:{x:5,z:4},start:h.world.tick,end:h.world.tick+3};h.recorder.capture(h.world);
 const full={...h.base.encode(h.world,0,1),motion:h.recorder.snapshot()},oracle=structuredClone(full),filth=structuredClone(h.world.filth!);let getterReads=0;
 Object.defineProperty(filth.items[0]!,'thickness',{enumerable:true,configurable:true,get(){getterReads++;return 2;}});
 const bad=structuredClone(full);bad.motion=full.motion;bad.world.filth=filth;expect(()=>h.aux.capture(bad)).toThrow('plain own data');expect(getterReads).toBe(0);
 // The same full packet and revision are retried. Any premature commit of
 // motion, filth or cold sections would consume their common predecessor.
 const appearance=h.natural.capture(h.world,full),prepared=h.aux.capture(full),section=prepared.auxiliary.motion!.section;expect(section.mode).toBe('tracks');if(section.mode!=='tracks')throw Error('Wrong mode');expect(section.rows.flatMap(row=>row.append)).toHaveLength(1);
 const envelope=structuredClone(residentPublication(prepared.publication,appearance,prepared.auxiliary)),packet=h.unwrap(envelope),result=h.reader.adopt(packet),expected=h.strict.adopt(oracle);expect(result.status).toBe('applied');expect(expected.status).toBe('applied');if(result.status!=='applied'||expected.status!=='applied')throw Error('Refused retry');
 expect(result.world).toStrictEqual(expected.world);expect(h.reader.readMotion(packet)).toStrictEqual(oracle.motion);expect(a.world).toStrictEqual(oldWorld);expect(a.motion).toStrictEqual(oldMotion);
});

test('the real SimulationClient reads motion from the original admitted Worker packet, only after applied adoption',()=>{
 const h=harness(),reader=h.reader,seen:SnapshotMessage<true>[]=[],read=reader.readMotion.bind(reader),delivered:(PawnTrack[]|undefined)[]=[],errors:string[]=[];
 reader.readMotion=packet=>{seen.push(packet);return read(packet);};
 class FakeWorker {
  onmessage?:((event:MessageEvent<unknown>)=>void)|null;readonly requests:Request[]=[];terminated=false;
  postMessage(request:Request):void {this.requests.push(request);if(request.type==='resync')this.deliver({type:'reply',id:request.id,ok:true});}
  terminate():void {this.terminated=true;}
  deliver(value:unknown):void {this.onmessage!({data:value} as MessageEvent<unknown>);}
 }
 const worker=new FakeWorker();class Client extends SimulationClient {
  protected override createDecoder():SnapshotReader{return reader;}
  protected override createWorker():Worker{return worker as unknown as Worker;}
  protected override readWorkerMessage(value:unknown){return readResidentWorkerMessage(value);}
 }
 const client=new Client();client.onSnapshot=(_world,_step,_speed,_replaced,motion)=>{delivered.push(motion);};client.onError=message=>{errors.push(message);};
 const urgent={generation:1,serial:0,pauseRevision:0,urgentHeld:false,rows:[]};
 try {
  const first=h.capture();Object.assign(first.envelope.publication,{urgentThreats:structuredClone(urgent)});const firstOriginal=first.envelope.publication as unknown as SnapshotMessage<true>;expect(firstOriginal.motion).toBe(0);
  worker.deliver(first.envelope);expect(seen).toEqual([firstOriginal]);expect(seen[0]).toBe(firstOriginal);expect(delivered).toHaveLength(1);expect(delivered[0]).toStrictEqual(first.oracle.motion);expect(firstOriginal.motion).toBe(0);const old=structuredClone(delivered[0]);
  worker.deliver(first.envelope);expect(seen).toHaveLength(1);expect(delivered).toHaveLength(1); // stale must never call readMotion
  h.world.pawns[0]!.motion={from:{x:4,z:4},to:{x:5,z:4},start:h.world.tick,end:h.world.tick+3};const next=h.capture();Object.assign(next.envelope.publication,{urgentThreats:structuredClone(urgent)});
  const bad=structuredClone(next.envelope);Object.assign(bad.auxiliary.motion!,{tick:bad.auxiliary.motion!.tick+1});worker.deliver(bad);expect(seen).toHaveLength(1);expect(delivered).toHaveLength(1);expect(()=>read(bad.publication as unknown as SnapshotMessage<true>)).toThrow('before successful admission');expect(worker.requests.at(-1)?.type).toBe('resync');
  worker.deliver(next.envelope);const nextOriginal=next.envelope.publication as unknown as SnapshotMessage<true>;expect(seen).toHaveLength(2);expect(seen[1]).toBe(nextOriginal);expect(delivered).toHaveLength(2);expect(delivered[1]).toStrictEqual(next.oracle.motion);expect(nextOriginal.motion).toBe(0);expect(delivered[0]).toStrictEqual(old);expect(errors).toEqual([]);
 }finally{client.dispose();}expect(worker.terminated).toBe(true);
});
