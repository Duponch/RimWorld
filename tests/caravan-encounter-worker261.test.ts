import {mockRequestId298} from './request-id-binding298';
import {afterEach,expect,test,vi} from 'vitest';
import {pendingFixture261,preparedEncounterSource261,admitted261,away261,checkpoint261} from './helpers/caravan-encounter261-acquired.ts';
import {deserializeCampaign,serializeCampaign} from '../src/sim/serialization.ts';
import type {Request,Response} from '../src/bridge/protocol.ts';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.resetModules();});

test.skipIf(process.env.TRAVEL261_ENCOUNTER_SIM!=='1')('actual Worker: cold Meeting remains paused; live neutral modal restores prior speed, explicit Pause keeps zero',async()=>{
 // Scoped production setup releases the live SIM World before the Worker owns
 // its cold-loaded replacement. Only the real RAW string crosses this boundary.
 const input=(()=>{const f=pendingFixture261('meeting');return {raw:serializeCampaign(f.root),tick:f.root.tick,groupId:f.record.state.id,memberIds:away261(f.record).members.map(p=>p.id),goods:away261(f.record).items.map(p=>structuredClone(p)),foreignIds:f.pending.people.map(p=>p.id)};})();
 vi.resetModules();let now=10_000,wake:(()=>void)|undefined,id=0;
 const replies=new Map<number,Extract<Response,{type:'reply'}>>(),faults:string[]=[];let visible:{speed:number;urgentThreats?:{generation:number;pauseRevision:number}}|undefined;
 const scope={onmessage:undefined as unknown as (e:MessageEvent<Request>)=>void,postMessage(p:Response){
  if(p.type==='reply')replies.set(p.id,p);
  else if(p.type==='fault')faults.push(p.reason);
  else if(p.type==='snapshot'||p.type==='campaign-only')visible={speed:p.speed,urgentThreats:p.urgentThreats};
 }};
 // Host inputs only; actual FixedClock, SIM, runtime, encoder and serialization
 // are deliberately not mocked. Capturing the one interval creates no timer.
 vi.spyOn(performance,'now').mockImplementation(()=>now);vi.stubGlobal('self',scope);vi.stubGlobal('setInterval',(fn:()=>void)=>{wake=fn;return 1;});
 await import('../src/bridge/simulation.worker');
 function request(p:Request){scope.onmessage({data:p} as MessageEvent<Request>);const reply=replies.get(mockRequestId298(p));replies.delete(mockRequestId298(p));if(!reply)throw Error('Expected synchronous reply from existing Worker path');expect(faults).toEqual([]);return reply;}
 function saved(){const reply=request({type:'save',id:++id});expect(reply.ok,reply.reason).toBe(true);if(!reply.data)throw Error('Actual Worker save absent');return reply.data;}
 expect(request({type:'load',id:++id,data:input.raw}).ok).toBe(true);expect(visible?.speed).toBe(0);expect(saved()).toBe(input.raw);
 const speed=request({type:'speed',id:++id,speed:6});expect(speed.ok).toBe(false);expect(speed.reason).toMatch(/rencontre.*pause/i);expect(visible?.speed).toBe(0);expect(saved()).toBe(input.raw);
 const other=request({type:'command',id:++id,command:{type:'group-select',groupId:null}});expect(other.ok).toBe(false);expect(other.reason).toMatch(/rencontre/i);expect(saved()).toBe(input.raw);
 if(!wake)throw Error('Existing Worker interval not installed');for(let n=0;n<3;n++){now+=1000;wake();}expect(visible?.speed).toBe(0);expect(saved()).toBe(input.raw);
 expect(request({type:'load',id:++id,data:input.raw}).ok).toBe(true);expect(visible?.speed).toBe(0);expect(saved()).toBe(input.raw);
 expect(request({type:'command',id:++id,command:{type:'caravan-encounter-choice',groupId:input.groupId,choice:'continue'}}).ok).toBe(true);expect(visible?.speed).toBe(0);
 let resolvedRaw=saved();{
  const resolved=deserializeCampaign(resolvedRaw);admitted261(resolved);expect(resolved.tick).toBe(input.tick);const r=resolved.worldGroups!.groups.find(r=>r.state.id===input.groupId)!;expect(r.pending261).toBeUndefined();const g=away261(r);expect(g.members.map(p=>p.id)).toEqual(input.memberIds);expect(g.items).toEqual(input.goods);for(const foreignId of input.foreignIds)expect(resolved.worldPawns!.owners.filter(r=>r.actor.id===foreignId)).toHaveLength(1);checkpoint261(resolved,'meeting-worker-04-after-real-continue-before-resume');
 }
 // No incidental elapsed time or menu closing resumes the game by itself.
 now+=1000;wake();expect(saved()).toBe(resolvedRaw);resolvedRaw='';
 const token=visible?.urgentThreats;if(!token)throw Error('Actual threat pause token absent');expect(request({type:'speed',id:++id,speed:1,options:{explicit:true,token:{generation:token.generation,pauseRevision:token.pauseRevision}}}).ok).toBe(true);expect(visible?.speed).toBe(1);
 now+=250;wake();{const continuedRaw=saved(),continued=deserializeCampaign(continuedRaw);admitted261(continued);expect(continued.tick).toBeGreaterThan(input.tick);const continuedGroup=continued.worldGroups!.groups.find(r=>r.state.id===input.groupId)!;expect(continuedGroup.pending261).toBeUndefined();expect(away261(continuedGroup).members.map(p=>p.id)).toEqual(input.memberIds);expect(away261(continuedGroup).items).toEqual(input.goods);checkpoint261(continued,'meeting-worker-05-after-explicit-real-resume');}expect(faults).toEqual([]);
 // Two declared decision branches reuse the same genuine pre-producer RAW.
 // No travel is replayed, no pending or remembered speed is inserted into SIM.
 const before=preparedEncounterSource261(),chance=await import('../src/sim/caravan-incident-calculation-261.ts');
 const gate=vi.spyOn(chance,'caravanIncidentOccurs261').mockImplementation((_biome,kind)=>kind==='meeting');
 try{for(const explicitPause of [false,true]){
  expect(request({type:'load',id:++id,data:before.raw}).ok).toBe(true);expect(visible?.speed).toBe(0);expect(request({type:'speed',id:++id,speed:3}).ok).toBe(true);now+=250;wake();expect(visible?.speed).toBe(0);
  const pendingRaw=saved();{const pending=deserializeCampaign(pendingRaw);admitted261(pending);expect(pending.tick).toBe(before.boundary);expect(pending.worldGroups!.groups.find(r=>r.state.id===before.groupId)?.pending261?.kind).toBe('meeting');checkpoint261(pending,`meeting-worker-live-${explicitPause?'manual-pause':'prior-speed'}-before-choice`);}
  if(explicitPause)expect(request({type:'speed',id:++id,speed:0}).ok).toBe(true);
  expect(request({type:'command',id:++id,command:{type:'caravan-encounter-choice',groupId:before.groupId,choice:'continue'}}).ok).toBe(true);expect(visible?.speed).toBe(explicitPause?0:3);
  {const resolved=deserializeCampaign(saved());admitted261(resolved);expect(resolved.tick).toBe(before.boundary);expect(resolved.worldGroups!.groups.find(r=>r.state.id===before.groupId)?.pending261).toBeUndefined();checkpoint261(resolved,`meeting-worker-live-${explicitPause?'manual-pause':'prior-speed'}-after-choice`);}
 }}finally{gate.mockRestore();}expect(faults).toEqual([]);
},120_000);
