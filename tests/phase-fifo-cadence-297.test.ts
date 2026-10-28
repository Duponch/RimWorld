import {afterEach,expect,test,vi} from 'vitest';
import {MainFrameAdmissionFIFO,type MainFrameAdmissionHost} from '../src/bridge/main-frame-admission-fifo';
// NUM queue scheduling witness ONLY. The Native checker is explicitly replaced
// by a test-local WeakMap. This grants NO Native/World/browser/GPU authority.
// The actual FIFO is unchanged and is the algorithm being tested.
const custody=vi.hoisted(()=>({known:new WeakMap<object,{run:()=>void;alive:boolean}>()}));
vi.mock('../src/bridge/native-clone-resident',()=>({
 isNativeCoreFullAdmissionTicket297(){return false;},
 isNativeCorePhaseAdmissionTicket297(info:unknown,run:unknown){if(!info||typeof info!=='object')return false;const held=custody.known.get(info);return !!held&&held.run===run&&held.alive;},
}));
class Host implements MainFrameAdmissionHost {time=0;tasks:(()=>void)[]=[];errors:unknown[]=[];now(){return this.time;}post(fn:()=>void){this.tasks.push(fn);}report(e:unknown){this.errors.push(e);}close(){}}
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function stream(host:Host,seen:string[],times:Map<string,number>){
 const tokens:object[]=[];
 const receive=async(name:string,phase:boolean)=>{
  const held={run:()=>{},alive:true};
  const run=()=>{if(!held.alive)return;held.alive=false;seen.push(name);times.set(name,host.time);};held.run=run;
  const ticket=Object.freeze({arrivalAt:host.time,run});if(phase){custody.known.set(ticket,held);tokens.push(ticket);}return ticket;
 };
 return {receive,close(){for(const token of tokens){const held=custody.known.get(token);if(held)held.alive=false;}}};
}
async function traffic(){
 const host=new Host(),seen:string[]=[],times=new Map<string,number>(),s=stream(host,seen,times),q=new MainFrameAdmissionFIFO(()=>true,()=>{throw Error('overflow');},host),expected:string[]=[];let next=1;
 try{for(let frame=1;frame<=60;frame++){const at=frame*1000/30;while(next<=100&&next*20<=at+1e-8){host.time=next*20;const name=String(next),ticket=await s.receive(name,next%8!==0);expected.push(name);q.enqueue(ticket.run,ticket);next++;}host.time=at;q.drainFrame();}return {host,seen,times,s,q,expected};}
 catch(error){q.close();s.close();throw error;}
}
test('50total messages per second (mostly phases) do not accumulate behind30RAF for2seconds',async()=>{const h=await traffic();try{expect(h.q.diagnostics().depth).toBe(0);expect(h.seen).toEqual(h.expected);expect(h.q.diagnostics().maxDepth).toBeLessThanOrEqual(3);expect(h.host.errors).toEqual([]);}finally{h.q.close();h.s.close();}});
test('a Pause barrier and its following ACK remain FIFO and reach admission within2frames after that mixed cadence',async()=>{const h=await traffic();try{h.host.time=2001;const pause=await h.s.receive('pause',false),ack=await h.s.receive('ack',false);h.q.enqueue(pause.run,pause);h.q.enqueue(ack.run,ack);for(let f=1;f<=2;f++){h.host.time=2000+f*1000/30;h.q.drainFrame();}expect(h.times.get('pause')??Infinity).toBeLessThanOrEqual(2000+1000/30);expect(h.times.get('ack')??Infinity).toBeLessThanOrEqual(2000+2*1000/30);expect(h.seen).toEqual([...h.expected,'pause','ack']);expect(h.q.diagnostics().depth).toBe(0);}finally{h.q.close();h.s.close();}});
test('one frame preserves all order while admitting up to8phases around at most one ordinary entry',async()=>{const host=new Host(),seen:string[]=[],s=stream(host,seen,new Map()),q=new MainFrameAdmissionFIFO(()=>true,()=>{},host);try{for(let i=1;i<=3;i++){const t=await s.receive('P'+i,true);q.enqueue(t.run,t);}const first=await s.receive('A',false);q.enqueue(first.run,first);for(let i=4;i<=8;i++){const t=await s.receive('P'+i,true);q.enqueue(t.run,t);}const second=await s.receive('B',false);q.enqueue(second.run,second);const tail=await s.receive('P9',true);q.enqueue(tail.run,tail);q.drainFrame();expect(seen).toEqual(['P1','P2','P3','A','P4','P5','P6','P7','P8']);q.drainFrame();expect(seen).toEqual(['P1','P2','P3','A','P4','P5','P6','P7','P8','B','P9']);}finally{q.close();s.close();}});
test('the ninth phase blocks a later ordinary barrier instead of skipping or reordering it',async()=>{const host=new Host(),seen:string[]=[],s=stream(host,seen,new Map()),q=new MainFrameAdmissionFIFO(()=>true,()=>{},host);try{for(let i=1;i<=9;i++){const t=await s.receive('P'+i,true);q.enqueue(t.run,t);}const b=await s.receive('barrier',false);q.enqueue(b.run,b);q.drainFrame();expect(seen).toEqual(Array.from({length:8},(_,i)=>'P'+(i+1)));expect(h(q)).toBe(2);q.drainFrame();expect(seen.at(-2)).toBe('P9');expect(seen.at(-1)).toBe('barrier');}finally{q.close();s.close();}});
function h(q:MainFrameAdmissionFIFO){return q.diagnostics().depth;}
test('legacy entries and public phase-looking metadata still take exactly one ordinary slot per frame',()=>{const host=new Host(),seen:number[]=[],q=new MainFrameAdmissionFIFO(()=>true,()=>{},host);const fake={arrivalAt:0,type:'actor-phase-297',phase297:true};try{for(let i=1;i<=3;i++)q.enqueue(()=>seen.push(i),fake);q.drainFrame();expect(seen).toEqual([1]);q.drainFrame();expect(seen).toEqual([1,2]);q.drainFrame();expect(seen).toEqual([1,2,3]);}finally{q.close();}});
