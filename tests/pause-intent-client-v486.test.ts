// Actual shared client with an explicitly controlled Worker boundary.
import {afterEach,expect,test,vi} from 'vitest';
import {SimulationClient} from '../src/bridge/SimulationClient';
import {SnapshotEncoder} from '../src/bridge/snapshots';
import {createWorld,serializeWorld} from '../src/sim/index';
import type {Request,Response} from '../src/bridge/protocol';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();FakeWorker.all=[];});
class FakeWorker{
 static all:FakeWorker[]=[];onmessage?: (event:MessageEvent<Response>)=>void;onerror?:unknown;onmessageerror?:unknown;requests:(Request&{pauseIntent?:{origin:number;at:number}})[]=[];terminated=false;
 constructor(){FakeWorker.all.push(this);}postMessage(request:Request){this.requests.push(structuredClone(request));}terminate(){this.terminated=true;}emit(message:Response){this.onmessage?.({data:message} as MessageEvent<Response>);}get last(){return this.requests.at(-1)!;}reply(){this.emit({type:'reply',id:this.last.id,ok:true});}
}
test('shared client internally captures fresh pause stamps only for0, keeps copies and retires old Worker authority',async()=>{
 const origin=performance.timeOrigin;let now=1000;vi.spyOn(performance,'now').mockImplementation(()=>now);vi.spyOn(performance,'timeOrigin','get').mockReturnValue(origin);vi.stubGlobal('Worker',FakeWorker);const client=new SimulationClient();
 const loadValid=async(worker:FakeWorker,seed:number)=>{const world=createWorld(seed,32,32),raw=serializeWorld(world),loading=client.load(raw),packet=new SnapshotEncoder<true>({structureDelta:true,minimumStructures:1000}).encode(world,0,0,true);worker.emit({...packet,motion:[],urgentThreats:{generation:1,pauseRevision:0,serial:0,urgentHeld:false,rows:[]}});worker.emit({type:'reply',id:worker.last.id,ok:true,checkpoint:{epoch:packet.epoch,revision:packet.revision}});await loading;};
 try{
  const first=FakeWorker.all[0]!;await loadValid(first,486030);const token={generation:1,pauseRevision:0},options={explicit:true as const,token},p=client.setSpeed(0,options);first.reply();await p;const old=first.last.pauseIntent;expect(old).toEqual({origin,at:1000});token.pauseRevision=99;expect((first.last as Extract<Request,{type:'speed'}>).options?.token.pauseRevision).toBe(0);
  now=1200;const q=client.setSpeed(0);first.reply();await q;expect(first.last.pauseIntent).toEqual({origin,at:1200});expect(first.last.pauseIntent).not.toBe(old);expect(old).toEqual({origin,at:1000});
  for(const speed of [1,3,6]){now+=10;const pending=client.setSpeed(speed);first.reply();await pending;expect(Object.hasOwn(first.last,'pauseIntent')).toBe(false);}
  now=1500;const abandoned=client.setSpeed(0),rejected=expect(abandoned).rejects.toMatchObject({outcome:'unknown',stopped:true});client.stop('private restart fixture');await rejected;expect(first.terminated).toBe(true);client.restartForReplacement();const second=FakeWorker.all[1]!;await expect(client.setSpeed(0)).rejects.toMatchObject({outcome:'unknown'});expect(second.requests).toEqual([]);
  // Real valid checkpoint is necessary to clear the existing stopped fault.
  await loadValid(second,486032);
  const fault=vi.fn();client.onFault=fault;first.emit({type:'fault',speed:0,reason:'retired worker must be ignored'});expect(fault).not.toHaveBeenCalled();now=2200;const resumed=client.setSpeed(0);second.reply();await resumed;expect(second.last.pauseIntent).toEqual({origin,at:2200});expect(old).toEqual({origin,at:1000});
 }finally{client.stop('private fixture finished');}
});
