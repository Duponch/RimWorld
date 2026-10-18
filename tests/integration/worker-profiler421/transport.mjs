import assert from 'node:assert/strict';

const SOURCE_PATH='/__qa_assets/simulation.worker-CX5xoxxu.js';
const QUERY_KEYS=new Set(['worker_file','type','v','t','import','direct']);
const plainCopy=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const MAX_PENDING=32,MAX_SESSIONS=16,MAX_MESSAGE_BYTES=64*1024*1024;

/** A public-CDP child tunnel. The supplied Page CDPSession is exclusively owned. */
export function createWorkerTunnel(pageSession,{origin,timeoutMs=60_000}){
  const expectedOrigin=new URL(origin).origin;
  assert.ok(Number.isFinite(timeoutMs)&&timeoutMs>0);
  const pending=new Map(),listeners=new Map(),ownedSessions=new Set(),expectedDetach=new Set(),sideTasks=new Set();
  const faults=[],events=[];let state='idle',nextId=1,source,parent,attachResolve,attachReject,attachTimer,closePromise,emergencyStop;
  let faultCount=0,droppedFaults=0,eventCount=0,droppedEvents=0;
  const log=(kind,detail)=>{eventCount++;if(events.length<128)events.push({kind,...plainCopy(detail)});else droppedEvents++;};
  const parentSend=(method,params)=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Page CDP command timeout: '+method)),timeoutMs);
    let result;try{result=pageSession.send(method,params);}catch(error){clearTimeout(timer);reject(error);return;}
    Promise.resolve(result).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
  });
  const fault=(kind,detail)=>{
    faultCount++;if(faults.length<32)faults.push({kind,detail:String(detail)});else droppedFaults++;
    const error=Error('Source CDP tunnel fault: '+kind+' '+String(detail));
    for(const row of pending.values()){clearTimeout(row.timer);row.reject(error);}pending.clear();
    if(attachReject){clearTimeout(attachTimer);attachReject(error);attachResolve=attachReject=undefined;}
    return error;
  };
  const assertHealthy=()=>{assert.ok(!faults.length,'Source CDP tunnel has recorded faults.');assert.equal(state,'attached');assert.ok(source?.live,'Source Worker CDP session is unavailable.');};
  const settle=row=>{
    if(!row.outerAck||!row.response)return;
    pending.delete(row.id);clearTimeout(row.timer);
    if(row.response.error){const error=Error('Worker CDP '+row.method+': '+String(row.response.error.message));error.code=row.response.error.code;row.reject(error);}
    else row.resolve(row.response.result??{});
  };
  const onMessage=event=>{
    if(state==='closing'||state==='closed'||event.sessionId!==source?.sessionId)return;
    if(typeof event.message!=='string'||Buffer.byteLength(event.message)>MAX_MESSAGE_BYTES){fault('message-bound','Source protocol message is non-string or exceeds64MiB.');return;}
    let value;try{value=JSON.parse(event.message);}catch(error){fault('invalid-message',error);return;}
    if(!record(value)){fault('invalid-message-shape','Expected a non-null record.');return;}
    if(Object.hasOwn(value,'id')){
      if(!Number.isSafeInteger(value.id)||value.id<1||Object.hasOwn(value,'result')===Object.hasOwn(value,'error')
        ||(Object.hasOwn(value,'result')&&!record(value.result))
        ||(Object.hasOwn(value,'error')&&(!record(value.error)||typeof value.error.message!=='string'||!Number.isInteger(value.error.code)))){
        fault('invalid-response-shape','Expected a safe ID and exactly one result/error record.');return;
      }
      const row=pending.get(value.id);if(!row){fault('unknown-response-id',value.id);return;}
      if(row.response){fault('duplicate-response-id',value.id);return;}
      row.response=value;settle(row);return;
    }
    if(typeof value.method!=='string'||(Object.hasOwn(value,'params')&&!record(value.params))){fault('invalid-notification','Missing method or invalid params');return;}
    for(const listener of listeners.get(value.method)??[]){try{listener(value.params??{});}catch(error){fault('listener-threw',error);}}
  };
  const onDetached=event=>{
    ownedSessions.delete(event.sessionId);
    log('detached',{sessionId:event.sessionId,targetId:event.targetId??null});
    if(expectedDetach.delete(event.sessionId)||state==='closing'||state==='closed')return;
    if(event.sessionId===source?.sessionId){source.live=false;fault('source-detached',event.sessionId);}
  };
  const stopAutoAttach=()=>{emergencyStop??=parentSend('Target.setAutoAttach',{autoAttach:false,waitForDebuggerOnStart:false,flatten:false}).catch(error=>{fault('overflow-disable',error);});};
  const detachOther=sessionId=>{
    if(sideTasks.size>=MAX_SESSIONS){fault('side-task-bound','More than16 detach tasks.');stopAutoAttach();return;}
    expectedDetach.add(sessionId);
    const task=parentSend('Target.detachFromTarget',{sessionId})
      .then(()=>{ownedSessions.delete(sessionId);})
      .catch(error=>{fault('other-session-detach',error);});
    sideTasks.add(task);void task.finally(()=>sideTasks.delete(task));
  };
  const onAttached=event=>{
    if(state==='closing'||state==='closed')return;
    if(typeof event.sessionId!=='string'||!record(event.targetInfo)){fault('invalid-attached-shape','Missing session/target info.');return;}
    if(ownedSessions.size>=MAX_SESSIONS&&!ownedSessions.has(event.sessionId)){
      fault('session-bound','More than16 child sessions.');
      // Disabling this owned session's auto-attach also detaches any overflow
      // child; no unbounded list of extra handles or detach tasks is retained.
      stopAutoAttach();return;
    }
    ownedSessions.add(event.sessionId);
    const info=event.targetInfo;log('attached',{sessionId:event.sessionId,targetInfo:info,waitingForDebugger:event.waitingForDebugger});
    if(event.waitingForDebugger){fault('paused-target','No target may wait for a debugger in this diagnostic.');detachOther(event.sessionId);return;}
    let url;try{url=new URL(info.url);}catch{detachOther(event.sessionId);return;}
    if(info.type!=='worker'||url.origin!==expectedOrigin||url.pathname!==SOURCE_PATH){detachOther(event.sessionId);return;}
    if(url.username||url.password||url.hash||[...url.searchParams.keys()].some(key=>!QUERY_KEYS.has(key))
      ||(url.searchParams.has('type')&&url.searchParams.get('type')!=='module')){
      fault('unexpected-source-url',info.url);detachOther(event.sessionId);return;
    }
    if(source){fault('ambiguous-source-worker',info.targetId);detachOther(event.sessionId);return;}
    source={sessionId:event.sessionId,targetInfo:plainCopy(info),live:true};
    if(attachResolve){clearTimeout(attachTimer);state='attached';attachResolve(plainCopy(source));attachResolve=attachReject=undefined;}
  };
  const send=(method,params={},options={})=>{
    if(options.cleanup!==true)assertHealthy();
    else assert.ok(source?.live&&state!=='closing'&&state!=='closed','No live Worker session for cleanup command.');
    assert.equal(typeof method,'string');
    if(pending.size>=MAX_PENDING||!Number.isSafeInteger(nextId)){throw fault('request-bound','Pending32 or safe sequence exceeded.');}
    return new Promise((resolve,reject)=>{
      const id=nextId++,row={id,method,resolve,reject,outerAck:false,response:undefined,timer:undefined};
      row.timer=setTimeout(()=>{if(pending.delete(id)){reject(fault('command-timeout',method+' #'+id));}},timeoutMs);
      pending.set(id,row);
      let sent;try{sent=parentSend('Target.sendMessageToTarget',{sessionId:source.sessionId,message:JSON.stringify({id,method,params})});}
      catch(error){pending.delete(id);clearTimeout(row.timer);reject(fault('outer-send',error));return;}
      Promise.resolve(sent).then(()=>{row.outerAck=true;if(pending.has(id))settle(row);},error=>{
        pending.delete(id);clearTimeout(row.timer);reject(fault('outer-send',error));
      });
    });
  };
  async function attach(){
    assert.equal(state,'idle');state='attaching';
    pageSession.on('Target.attachedToTarget',onAttached);
    pageSession.on('Target.detachedFromTarget',onDetached);
    pageSession.on('Target.receivedMessageFromTarget',onMessage);
    try{
      const response=await parentSend('Target.getTargetInfo');parent=plainCopy(response.targetInfo);
      assert.equal(parent.type,'page');assert.equal(new URL(parent.url).origin,expectedOrigin);
      // Install the promise before setAutoAttach, which reports existing children.
      const ready=new Promise((resolve,reject)=>{attachResolve=resolve;attachReject=reject;attachTimer=setTimeout(()=>{fault('attach-timeout',SOURCE_PATH);},timeoutMs);});
      // A rejection during the outer command must never become unhandled.
      void ready.catch(()=>{});
      await parentSend('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:false,filter:[{type:'worker'},{exclude:true}]});
      const result=await ready;assertHealthy();return{parent:plainCopy(parent),source:result};
    }catch(error){fault('attach-failed',error);throw error;}
  }
  const on=(method,listener)=>{let set=listeners.get(method);if(!set){set=new Set();listeners.set(method,set);}set.add(listener);};
  const off=(method,listener)=>{const set=listeners.get(method);set?.delete(listener);if(set&&!set.size)listeners.delete(method);};
  function close(){
    if(closePromise)return closePromise;
    closePromise=(async()=>{
      state='closing';clearTimeout(attachTimer);
      if(attachReject){attachReject(Error('Source CDP tunnel closed during attachment.'));attachResolve=attachReject=undefined;}
      for(const row of pending.values()){clearTimeout(row.timer);row.reject(Error('Source CDP tunnel closed.'));}pending.clear();
      const cleanupErrors=[];
      try{
        if(emergencyStop)await emergencyStop;
        await Promise.all([...sideTasks]);
        for(const sessionId of [...ownedSessions]){
          expectedDetach.add(sessionId);
          try{await parentSend('Target.detachFromTarget',{sessionId});ownedSessions.delete(sessionId);}catch(error){cleanupErrors.push(String(error));}
        }
        try{await parentSend('Target.setAutoAttach',{autoAttach:false,waitForDebuggerOnStart:false,flatten:false});}catch(error){cleanupErrors.push(String(error));}
      }finally{
        pageSession.off('Target.attachedToTarget',onAttached);pageSession.off('Target.detachedFromTarget',onDetached);pageSession.off('Target.receivedMessageFromTarget',onMessage);listeners.clear();
        let detachTimer;
        try{await Promise.race([pageSession.detach(),new Promise((_,reject)=>{detachTimer=setTimeout(()=>reject(Error('Page CDP detach timeout.')),timeoutMs);})]);}
        catch(error){cleanupErrors.push(String(error));}finally{clearTimeout(detachTimer);}
        if(source)source.live=false;state='closed';
      }
      if(cleanupErrors.length){fault('cleanup',cleanupErrors.join('\n'));throw Error('Source CDP cleanup failed: '+cleanupErrors.join('\n'));}
    })();return closePromise;
  }
  return{attach,send,on,off,assertHealthy,close,report:()=>({state,parent:plainCopy(parent),source:plainCopy(source),faults:plainCopy(faults),faultCount,droppedFaults,events:plainCopy(events),eventCount,droppedEvents,pending:pending.size,listeners:[...listeners.keys()],ownedSessions:[...ownedSessions],bounds:{pending:MAX_PENDING,sessions:MAX_SESSIONS,messageBytes:MAX_MESSAGE_BYTES},transport:'Target non-flattened public CDP',mainProfilerStarted:false})};
}
