import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {PresentationQueue} from '../src/render/PresentationQueue';
import {SimulationClient} from '../src/bridge/SimulationClient';
import {SceneRenderCore} from '../src/render/SceneRenderCore';
import {CorePhaseFrameOwner297} from '../src/bridge/core-phase-owner-297';
import {readNativeCorePhaseInput297} from '../src/bridge/native-clone-resident';
import type {World} from '../src/sim/types';
// Queue-only Worlds are representation fragments, not valid saved/Native Worlds.
const world=(tick:number,label:string)=>({tick,label} as unknown as World);
test('a due calm Full waits for its first next actual-frame marker',()=>{const q=new PresentationQueue(),a=world(20,'a');q.push(a,20,8);expect(q.take(20,undefined,7)).toBeUndefined();expect(q.size).toBe(1);expect(q.take(20,undefined,8)).toBe(a);expect(q.size).toBe(0);});
test('consecutive deliveries coalesce at the original same-Core gate without starvation',()=>{const q=new PresentationQueue(),a=world(20,'a'),b=world(20,'b'),c=world(20,'c');q.push(a,20,8);q.push(b,20,9);q.push(c,20,10);expect(q.size).toBe(1);expect(q.take(20,undefined,7)).toBeUndefined();expect(q.take(20,undefined,8)).toBe(c);});
test('an immediate same-Core entry cannot be delayed by a later gated replacement',()=>{const q=new PresentationQueue(),a=world(20,'a'),b=world(20,'b');q.push(a,20);q.push(b,20,100);expect(q.take(20)).toBe(b);});
test('a later immediate same-Core replacement releases the former gate',()=>{const q=new PresentationQueue(),a=world(20,'a'),b=world(20,'b');q.push(a,20,100);q.push(b,20);expect(q.take(20)).toBe(b);});
test('a matured Core-future prefix is not blocked by a fresh cohort behind it',()=>{const q=new PresentationQueue(),a=world(20,'a'),future=world(21,'future'),newer=world(22,'newer');q.push(a,20,8);q.push(future,21,8);expect(q.take(20,undefined,8)).toBe(a);q.push(newer,22,9);expect(q.take(22,undefined,8)).toBe(future);expect(q.size).toBe(1);expect(q.take(22,undefined,8)).toBeUndefined();expect(q.take(22,undefined,9)).toBe(newer);});
test('release and clear remove only eligibility/history while public no-gate defaults still pick latest due',()=>{const q=new PresentationQueue(),a=world(20,'a'),b=world(21,'b');q.push(a,20,50);q.push(b,21,50);q.releaseFrameGates();expect(q.take(21)).toBe(b);q.push(a,20,60);q.clear();expect(q.size).toBe(0);q.push(a);q.push(b);expect(q.take(20)).toBe(a);expect(q.take(21)).toBe(b);});
test('Core-future entries never become due through a frame gate alone',()=>{const q=new PresentationQueue(),a=world(21,'a');q.push(a,21,8);expect(q.take(20,undefined,900)).toBeUndefined();expect(q.take(21,undefined,900)).toBe(a);});
test('unsafe and negative markers fail before changing Queue contents',()=>{const q=new PresentationQueue(),a=world(20,'a');for(const frame of[-1,.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]){expect(()=>q.push(a,20,frame)).toThrow();expect(()=>q.take(20,undefined,frame)).toThrow();expect(q.size).toBe(0);}});

test('the actual Client getter includes a fresh ordinary request before its15s warning and clears after the real finishReply',async()=>{
 const pending=new Map(),posts:unknown[]=[],events:unknown[]=[];
 const client=Object.assign(Object.create(SimulationClient.prototype),{pending,nextId:1,stopped:false,fault:undefined,worker:{postMessage(value:unknown){posts.push(value);}},onRequestStatus:(value:unknown)=>events.push(value),onError(){}}) as any;
 const getter=Object.getOwnPropertyDescriptor(SimulationClient.prototype,'hasPendingPresentationRequests')!;
 expect(getter.set).toBeUndefined();expect(client.hasPendingPresentationRequests).toBe(false);
 const promise=client.request({type:'speed',speed:1});const row=pending.get(1)!;
 try{expect(posts).toHaveLength(1);expect(row.waiting).toBeUndefined();expect(client.hasPendingPresentationRequests).toBe(true);expect(events).toHaveLength(0);
 row.reply={type:'reply',id:1,ok:true};client.finishReply(1,row);await promise;expect(pending.size).toBe(0);expect(client.hasPendingPresentationRequests).toBe(false);expect(events).toEqual([{id:1,type:'speed',state:'settled'}]);
 }finally{clearTimeout(row.timer);pending.clear();}
});

test('Main actual frame marker precedes FIFO drain and public setWorld keeps its old default',()=>{
 const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8'),scene=readFileSync(new URL('../src/render/SceneRenderCore.ts',import.meta.url),'utf8');
 expect(main).toContain('this.beginPresentationFrame297();drainMainAdmissionsBeforeFrame();try{super.frame(now);}');
 expect(main).toContain('get hasPendingPresentationRequests(){return native.hasPendingPresentationRequests;}');
 expect(main).toContain('const deferCalmFull297=Number(world.schemaVersion)===297&&!replaced&&!speedChanged&&speed>0&&!client.hasPendingPresentationRequests;');
 expect(main).toContain('renderer?.setWorld(world,replaced,speed,motion,true,coreInput297,deferCalmFull297);');
 expect(scene).toContain('coreInput297?:object, deferCalmFull297 = false): void');
 expect(scene).toContain('if(!calm)this.releaseCalmFullFrame297();');
 expect(scene).toContain('this.pendingCore297.length>64');
 expect(scene).toContain('this.presentation.size>64');
});

// True representation owner, not Native rights. Private list injection isolates
// the existing consumer partition; no setWorld297/setCorePhase297 positive claim.
function representation(){
 const owner=new CorePhaseFrameOwner297();
 const make=(core:number)=>({schemaVersion:297,tick:Math.floor(core/10),phaseCore297:core%10,width:16,height:16,nextId:100,tiles:[],pawns:[{id:7,x:2,z:2,state:'idle',moveCooldown:0,planCooldown:0,path:[],jobId:null}],projectiles:[]} as unknown as World);
 function full(core:number,epoch=1,revision=1,mapId=0){const w=make(core);return owner.adoptFull(w,epoch,revision,[{id:7,segments:[]}],{mapId,core,projectilesRetained:[],actorMode297:'frontier'},1);}
 function phase(core:number){const anchor=owner.currentAnchor!;return owner.commit(owner.prepare({type:'actor-frontier-297',audioCues:[],epoch:anchor.epoch,mapId:anchor.mapId,baseRevision:anchor.revision,phaseSeq:owner.currentSequence!+1,nextId:100,fromCore:owner.currentCore!,toCore:core,speed:1,actors:[],tracks:[],projectiles:{upserted:[],removed:[]}}));}
 const first=full(200),draws:unknown[]=[],core=Object.assign(Object.create(SceneRenderCore.prototype),{disposed:false,fatalError:undefined,presentationFrame297:0,coreFullInputs297:new WeakMap(),pendingCore297:[],world:first.world,received:{world:first.world},appliedCoreAnchor297:first.anchor,appliedCore297:first.core,actorScene297:first.actorScene,timeline:{tick:20},pawns:{adoptPhase297(...args:unknown[]){draws.push(args);}},wildlife:{adoptPhase297(){}},mechanoids:{adoptPhase297(){}}}) as any;
 core.coreFullInputs297.set(first.world,first);
 return {owner,full,phase,first,core,draws,present(){core.presentCorePhases297();},anchor(p:any){core.world=p.world;core.appliedCoreAnchor297=p.anchor;core.appliedCore297=p.core;core.actorScene297=p.actorScene;},receive(p:any){core.received={world:p.world};core.coreFullInputs297.set(p.world,p);}};
}
test('actual frame marker advances once and ignores disposed/fatal instances',()=>{const h=representation();h.core.beginPresentationFrame297();expect(h.core.presentationFrame297).toBe(1);h.core.disposed=true;h.core.beginPresentationFrame297();expect(h.core.presentationFrame297).toBe(1);h.core.disposed=false;h.core.fatalError='blocked';h.core.beginPresentationFrame297();expect(h.core.presentationFrame297).toBe(1);});
test('a future current-anchor phase remains queued until its confirmed Core is due',()=>{const h=representation(),p=h.phase(201);expect(readNativeCorePhaseInput297(p)).toBeUndefined();h.core.pendingCore297.push(p);h.present();expect(h.core.pendingCore297).toEqual([p]);expect(h.draws).toHaveLength(0);h.core.timeline.tick=20.1;h.present();expect(h.core.pendingCore297).toHaveLength(0);expect(h.core.actorScene297).toBe(p.actorScene);expect(h.core.appliedCore297).toBe(201);});
test('same-Core phase of a newer Full revision survives the old-anchor consumer until that exact Full is applied',()=>{const h=representation(),newFull=h.full(200,1,2),p=h.phase(200);h.receive(newFull);h.core.pendingCore297.push(p);h.present();expect(h.core.pendingCore297).toEqual([p]);expect(h.draws).toHaveLength(0);h.anchor(newFull);h.present();expect(h.core.pendingCore297).toHaveLength(0);expect(h.core.actorScene297).toBe(p.actorScene);expect(h.core.appliedCoreAnchor297).toBe(newFull.anchor);});
test('superseded revision and epoch phases are dropped only after a real owner Full supersedes them',()=>{const h=representation(),old=h.phase(200),newFull=h.full(200,1,2),olderRevision=h.phase(200),latest=h.full(200,2,1);h.receive(latest);h.anchor(latest);h.core.pendingCore297.push(old,olderRevision);h.present();expect(h.core.pendingCore297).toHaveLength(0);expect(h.draws).toHaveLength(0);expect(h.core.actorScene297).toBe(latest.actorScene);});
test('a different received epoch/map phase waits for its exact received Full instead of being silently discarded',()=>{const h=representation(),next=h.full(200,2,1,3),p=h.phase(200);h.receive(next);h.core.pendingCore297.push(p);h.present();expect(h.core.pendingCore297).toEqual([p]);h.anchor(next);h.present();expect(h.core.pendingCore297).toHaveLength(0);expect(h.core.actorScene297).toBe(p.actorScene);});