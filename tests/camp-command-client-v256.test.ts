import {afterEach,describe,expect,it,vi} from 'vitest';
import {SimulationClient} from '../src/bridge/SimulationClient';
import type {Request,Response} from '../src/bridge/protocol';
// Transport-only owners/decoder doubles. No local generation or gameplay proof.
vi.mock('../src/bridge/snapshots',()=>({SnapshotDecoder:class{adopt(p:{world:unknown}){return {status:'applied',world:p.world,replaced:false};}}}));
vi.mock('../src/bridge/urgent-threats',()=>({validThreatPauseMode:()=>true,UrgentThreatDelivery:class{accepts(){return true;}commit(){}reset(){}}}));
class Port {
 static current:Port;requests:Request[]=[];onmessage?:(e:MessageEvent<Response>)=>void;onerror?:unknown;onmessageerror?:unknown;terminate=vi.fn();
 constructor(){Port.current=this;}postMessage(p:Request){this.requests.push(structuredClone(p));}deliver(p:unknown){this.onmessage!({data:p} as MessageEvent<Response>);}
}
function setup(){vi.stubGlobal('Worker',Port);const client=new SimulationClient(),port=Port.current,progress=vi.fn();client.onCampProgress=progress;return {client,port,progress};}
const begin=(c:SimulationClient)=>c.command({type:'group-enter',groupId:7,mode:'camp'});
const turn=async()=>{await Promise.resolve();await Promise.resolve();};
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('Camp command transport',()=>{
 it('correlates progress and waits for the actual checkpoint adoption',async()=>{
  const {client,port,progress}=setup();let settled=false;const command=begin(client).then(()=>{settled=true;});const id=port.requests[0]!.id;
  port.deliver({type:'camp-entry-progress',id:id+1,groupId:7,progress:{phase:'plants900'}});port.deliver({type:'camp-entry-progress',id,groupId:8,progress:{phase:'plants900'}});expect(progress).not.toHaveBeenCalled();
  port.deliver({type:'camp-entry-progress',id,groupId:7,progress:{phase:'plants900',completed:4,total:10}});expect(progress).toHaveBeenCalledTimes(1);
  port.deliver({type:'reply',id,ok:true,checkpoint:{epoch:3,revision:12}});await turn();expect(settled).toBe(false);expect(client.hasCampPreparation).toBe(true);
  port.deliver({type:'snapshot',epoch:3,revision:11,world:{tick:4},speed:0,stepMs:0,urgentThreats:{}});await turn();expect(settled).toBe(false);
  port.deliver({type:'snapshot',epoch:3,revision:12,world:{tick:4},speed:0,stepMs:0,urgentThreats:{}});await command;expect(settled).toBe(true);expect(client.hasCampPreparation).toBe(false);expect(progress).toHaveBeenLastCalledWith(undefined);client.dispose();
 });
 it('timeout is pending; targeted cancel ACK alone does not settle or resume entry',async()=>{
  vi.useFakeTimers();const {client,port}=setup();client.onError=vi.fn();const command=begin(client),result=command.catch(e=>e);const id=port.requests[0]!.id;
  await vi.advanceTimersByTimeAsync(15000);expect(client.hasCampPreparation).toBe(true);expect(port.requests).toHaveLength(1);
  await expect(client.setSpeed(1)).rejects.toThrow();expect(port.requests).toHaveLength(1);
  const cancel=client.cancelCampEntry256(id,7),request=port.requests.at(-1)!;expect(request).toMatchObject({type:'camp-entry-cancel',operationId:id,groupId:7});
  port.deliver({type:'reply',id:request.id,ok:true,data:'{"cancelRequested":true}'});await cancel;expect(client.hasCampPreparation).toBe(true);
  port.deliver({type:'reply',id,ok:false,outcome:'refused',reason:'Preparation cancelled',data:'{"campEntry":"cancelled"}'});expect((await result).outcome).toBe('refused');expect(client.hasCampPreparation).toBe(false);expect(port.requests.some(r=>r.type==='speed')).toBe(false);client.dispose();
 });
 it('a refusal clears progress only after the final correlated reply',async()=>{
  const {client,port,progress}=setup();const command=begin(client),result=command.catch(e=>e),id=port.requests[0]!.id;
  port.deliver({type:'camp-entry-progress',id,groupId:7,progress:{phase:'preparing'}});
  port.deliver({type:'camp-entry-progress',id,groupId:7,progress:{phase:'plants900',completed:NaN,total:10}});expect(progress).toHaveBeenCalledTimes(1);
  port.deliver({type:'reply',id,ok:false,outcome:'refused',reason:'Actual generator refused species'});expect((await result).outcome).toBe('refused');expect(progress).toHaveBeenLastCalledWith(undefined);client.dispose();
 });
});
