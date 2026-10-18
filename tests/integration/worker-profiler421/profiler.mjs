import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createWorkerTunnel} from './transport.mjs';

const sha=source=>createHash('sha256').update(source).digest('hex');
const clockExpression='({now:performance.now(),timeOrigin:performance.timeOrigin,href:location.href,dedicated:typeof DedicatedWorkerGlobalScope!=="undefined"&&globalThis instanceof DedicatedWorkerGlobalScope,documentAbsent:typeof document==="undefined"})';

/** ROOT ONLY. One Source Worker CPU sampler; the supplied Page CDP session is owned. */
export function createSourceProfiler(pageSession,{origin,output,timeoutMs=60_000}){
  const tunnel=createWorkerTunnel(pageSession,{origin,timeoutMs});
  let state='idle',identity,enabled=false,running=false,startRequested=false,stopRequested=false,debuggerEnabled=false,profile,closePromise;
  const witnesses={},scriptMetadata=new Map(),cleanupErrors=[];let metadataOverflow=0;
  const report=()=>({state,identity,witnesses:{...witnesses},enabled,running,startRequested,stopRequested,debuggerEnabled,metadataCount:scriptMetadata.size,metadataOverflow,cleanupErrors:[...cleanupErrors],tunnel:tunnel.report()});
  async function workerClock(){
    const response=await tunnel.send('Runtime.evaluate',{expression:clockExpression,returnByValue:true});
    assert.ok(!response.exceptionDetails,'Worker clock/identity evaluation must not throw.');
    const value=response.result?.value;
    assert.ok(value&&Number.isFinite(value.now)&&Number.isFinite(value.timeOrigin));
    assert.equal(value.dedicated,true);assert.equal(value.documentAbsent,true);
    assert.equal(new URL(value.href).origin,new URL(origin).origin);
    assert.equal(new URL(value.href).pathname,'/__qa_assets/simulation.worker-CX5xoxxu.js');
    if(identity)assert.equal(value.timeOrigin,identity.clock.timeOrigin,'Worker clock origin changed.');
    return value;
  }
  async function attach(){
    assert.equal(state,'idle');const target=await tunnel.attach();
    const workerIsolate=await tunnel.send('Runtime.getIsolateId');let timer,mainIsolate;
    try{mainIsolate=await Promise.race([pageSession.send('Runtime.getIsolateId'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('MAIN isolate identity command timeout.')),timeoutMs);})]);}
    finally{clearTimeout(timer);}
    assert.ok(typeof workerIsolate.id==='string'&&workerIsolate.id.length>0);
    assert.ok(typeof mainIsolate.id==='string'&&mainIsolate.id.length>0);
    assert.notEqual(workerIsolate.id,mainIsolate.id,'Source and MAIN must be distinct V8 isolates.');
    identity={...target,workerIsolateId:workerIsolate.id,mainIsolateId:mainIsolate.id,clock:await workerClock()};state='attached';
    await writeFile(join(output,'source-target.json'),JSON.stringify(identity,null,2)+'\n',{flag:'wx'});return identity;
  }
  async function beforeWindow(){
    assert.equal(state,'attached');tunnel.assertHealthy();
    enabled=true;await tunnel.send('Profiler.enable');
    await tunnel.send('Profiler.setSamplingInterval',{interval:1000});state='enabled';
    return{requestedIntervalUs:1000,sourceWorkerOnly:true};
  }
  async function start(){
    assert.equal(state,'enabled');tunnel.assertHealthy();
    witnesses.beforeStart=await workerClock();startRequested=true;state='starting';
    await tunnel.send('Profiler.start');running=true;state='running';
    witnesses.afterStart=await workerClock();return{...witnesses};
  }
  async function persist(value,filename){const bytes=JSON.stringify(value)+'\n';await writeFile(join(output,filename),bytes,{flag:'wx'});return{file:filename,sha256:sha(bytes),bytes:Buffer.byteLength(bytes)};}
  async function stop(window){
    assert.equal(state,'running');tunnel.assertHealthy();
    witnesses.beforeStop=await workerClock();
    stopRequested=true;const result=await tunnel.send('Profiler.stop');running=false;state='stopped';profile=result.profile;
    // Raw profile is durable before any validation, source capture or extra clock request.
    const file=await persist(profile,'source.cpuprofile');
    witnesses.afterStop=await workerClock();
    const samples=profile?.samples,deltas=profile?.timeDeltas;
    assert.ok(Array.isArray(profile?.nodes)&&Array.isArray(samples)&&samples.length>0&&Array.isArray(deltas)&&samples.length===deltas.length,'Real nonempty Source CPU samples required.');
    assert.ok(Number.isFinite(profile.startTime)&&Number.isFinite(profile.endTime)&&profile.endTime>profile.startTime);
    assert.ok(deltas.every(Number.isFinite));
    const ids=new Set(profile.nodes.map(node=>node.id));assert.equal(ids.size,profile.nodes.length);assert.ok(samples.every(id=>ids.has(id)));
    assert.ok(Number.isFinite(window.startAbsolute)&&Number.isFinite(window.endAbsolute)&&window.endAbsolute>window.startAbsolute);
    const originMs=identity.clock.timeOrigin,startLocal=window.startAbsolute-originMs,endLocal=window.endAbsolute-originMs;
    assert.ok(startLocal>=witnesses.afterStart.now&&endLocal<=witnesses.beforeStop.now,'Full eight-second MAIN window must lie inside actual Source recording.');
    const startOffset=[profile.startTime/1000-witnesses.afterStart.now,profile.startTime/1000-witnesses.beforeStart.now];
    const stopOffset=[profile.endTime/1000-witnesses.afterStop.now,profile.endTime/1000-witnesses.beforeStop.now];
    const intersection=[Math.max(startOffset[0],stopOffset[0]),Math.min(startOffset[1],stopOffset[1])];
    const report={...file,target:identity.source,workerIsolateId:identity.workerIsolateId,mainIsolateId:identity.mainIsolateId,
      nodeCount:profile.nodes.length,sampleCount:samples.length,requestedIntervalUs:1000,rawStartTimeUs:profile.startTime,rawEndTimeUs:profile.endTime,rawDurationUs:profile.endTime-profile.startTime,
      negativeDeltaCount:deltas.filter(value=>value<0).length,rawTimeDeltasUnchanged:true,window:{...window,startLocal,endLocal,workerTimeOrigin:originMs},workerClockWitnesses:{...witnesses},
      boundaryOverhangBoundsMs:{beforeStart:[startLocal-witnesses.afterStart.now,startLocal-witnesses.beforeStart.now],afterEnd:[witnesses.beforeStop.now-endLocal,witnesses.afterStop.now-endLocal]},
      offsetCompatibility:{startIntervalMs:startOffset,stopIntervalMs:stopOffset,intersectionMs:intersection,hasConstantCompatibleOffset:intersection[0]<=intersection[1],exactOffsetClaimed:false},
      limitation:'Approximate Source-isolate sampling only; whole profile includes window borders. Offset compatibility is bounded and conditional. No exact actor/function duration, main profile, GPU budget or A/B FPS gain.'};
    await writeFile(join(output,'source-profile-boundaries.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});return report;
  }
  async function captureSources(){
    assert.equal(state,'stopped');tunnel.assertHealthy();assert.ok(profile);
    const listener=event=>{assert.equal(typeof event.scriptId,'string');if(!scriptMetadata.has(event.scriptId)&&scriptMetadata.size>=4096){metadataOverflow++;throw Error('Source script metadata exceeds4096 records.');}scriptMetadata.set(event.scriptId,event);};tunnel.on('Debugger.scriptParsed',listener);
    try{
      debuggerEnabled=true;await tunnel.send('Debugger.enable');
      const scripts=new Map();
      for(const node of profile.nodes){const frame=node.callFrame;if(frame?.scriptId&&frame.scriptId!=='0'&&frame.url&&new URL(frame.url,origin).origin===new URL(origin).origin)scripts.set(frame.scriptId,{id:frame.scriptId,url:frame.url});}
      assert.ok(scripts.size<=256,'Bounded Source compiled-source capture required.');
      const rows=[];let index=0;
      for(const script of scripts.values()){
        const entry={...script,metadata:scriptMetadata.get(script.id)??null};
        try{
          const result=await tunnel.send('Debugger.getScriptSource',{scriptId:script.id});assert.equal(typeof result.scriptSource,'string');assert.ok(Buffer.byteLength(result.scriptSource)<=2_097_152,'Compiled Source script exceeds private bound.');
          const file='source-compiled-'+String(++index).padStart(3,'0')+'.js';await writeFile(join(output,file),result.scriptSource,{flag:'wx'});
          Object.assign(entry,{file,sha256:sha(result.scriptSource),bytes:Buffer.byteLength(result.scriptSource),status:'captured'});
        }catch(error){Object.assign(entry,{status:'unavailable',reason:String(error)});}rows.push(entry);
      }
      const report={capturePhase:'After Source CPU stop, with Source paused/drained by ROOT, before any source restart/load.',target:identity.source,scripts:rows,
        exactSourceCount:rows.filter(row=>row.status==='captured').length,unavailableSourceCount:rows.filter(row=>row.status==='unavailable').length,
        limitation:'Generated callFrame positions and raw scriptParsed/sourceMapURL retained. Source-map resolution is offline; missing sources/maps and inlining never establish exact actor-line attribution.'};
      await writeFile(join(output,'source-compiled-sources.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});return report;
    }finally{tunnel.off('Debugger.scriptParsed',listener);if(debuggerEnabled){await tunnel.send('Debugger.disable',{}, {cleanup:true});debuggerEnabled=false;}}
  }
  function close(){
    if(closePromise)return closePromise;
    closePromise=(async()=>{
      try{
        if(startRequested&&!stopRequested){stopRequested=true;try{const result=await tunnel.send('Profiler.stop',{}, {cleanup:true});running=false;await persist(result.profile,'incomplete-source.cpuprofile');}catch(error){cleanupErrors.push('stop: '+String(error));}}
        if(debuggerEnabled){try{await tunnel.send('Debugger.disable',{}, {cleanup:true});debuggerEnabled=false;}catch(error){cleanupErrors.push('debugger-disable: '+String(error));}}
        if(enabled){try{await tunnel.send('Profiler.disable',{}, {cleanup:true});enabled=false;running=false;}catch(error){cleanupErrors.push('profiler-disable: '+String(error));}}
      }finally{try{await tunnel.close();}catch(error){cleanupErrors.push('tunnel-close: '+String(error));}state='closed';}
      if(cleanupErrors.length)throw Error('Source profiler cleanup failed: '+cleanupErrors.join('\n'));
      return report();
    })();return closePromise;
  }
  return{attach,beforeWindow,start,stop,captureSources,close,report};
}
