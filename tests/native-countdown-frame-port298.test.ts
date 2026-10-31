import {afterEach,expect,test,vi} from 'vitest';
import * as THREE from 'three/webgpu';
import {NativeStage} from '../src/ui3d/NativeStage';
vi.mock('../src/ui/native-cardboard-cursors',()=>({setNativeCursor:vi.fn()}));

// Existing constructor-free NativeStage convention. Real prototype methods,
// declared RAF/document/backend host only; no GPU, World or copied clock logic.
type Stage=Record<string,any>;
const hosts:{close():void}[]=[];
afterEach(()=>{for(const h of hosts.splice(0))h.close();vi.restoreAllMocks();vi.unstubAllGlobals();});
function fixture(mode:'game'|'standalone'='game',initial:{eligible?:boolean;closed?:boolean;initialized?:boolean}={}){
 let eligible=initial.eligible??true,next=0;
 const documentHost={hidden:false},pending=new Map<number,FrameRequestCallback>(),feed=vi.fn();
 const request=vi.fn((callback:FrameRequestCallback)=>{const id=++next;pending.set(id,callback);return id;});
 const cancel=vi.fn((id:number)=>{pending.delete(id);});
 vi.stubGlobal('document',documentHost);vi.stubGlobal('requestAnimationFrame',request);vi.stubGlobal('cancelAnimationFrame',cancel);
 const render=vi.fn(),backend={render,info:{render:{calls:1}},domElement:{style:{}},autoClear:true,getRenderTarget:()=>null,setRenderTarget:vi.fn(),clearDepth:vi.fn()};
 const curtainScene=new THREE.Scene(),curtainMaterial=new THREE.MeshBasicNodeMaterial({color:0x000000,transparent:true,opacity:0,depthTest:false,depthWrite:false,toneMapped:false}),curtainMesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),curtainMaterial);
 curtainMesh.position.z=-.2;curtainMesh.frustumCulled=false;curtainMesh.visible=false;curtainScene.add(curtainMesh);
 const stage=Object.assign(Object.create(NativeStage.prototype),{
  closed:initial.closed??false,initialized:initial.initialized??true,
  worldVisible:mode==='game',frontVisible:false,standalone:mode==='standalone',
  countdownFrameAt298:undefined,countdownFrameDriver298:undefined,countdownFrameEligible298:false,countdownFeedEligible298:false,standaloneNeedsRender298:true,
  shipCurtainScene298:curtainScene,shipCurtainMaterial298:curtainMaterial,shipCurtainMesh298:curtainMesh,shipCurtainOwner298:undefined,shipCurtainPage298:undefined,shipCurtainPhase298:'idle',shipCurtainRemaining298:0,shipCurtainPageHandoff298:false,shipCurtainDisplayDirty298:false,
  frameId:0,lastTime:0,moving:new Set(),extraAnimating:false,art:{revision:0},sceneRevision:0,
  scene:{},camera:{},ownRenderer:backend,standby:{setActive:vi.fn()},
  stats:{renders:0,overlayRenders:0,renderMs:0,drawCalls:0},cacheEnabled:false,
  reducedMotion:{matches:false},autoHideBottom:false,bottomOffset:0,bottomDockHeight:96,bottomOpen:true,visH:8,uiScale:1,
  anchors:{bottomCenter:{position:{y:0}}},
  options:{countdownFrame298:{canFeed:()=>eligible,feed}},
 }) as Stage;
 const run=(now:number)=>{const entry=pending.entries().next().value as [number,FrameRequestCallback]|undefined;expect(entry,'Existing RAF must actually have been queued').toBeDefined();const[id,callback]=entry!;pending.delete(id);callback(now);expect(pending.size).toBeLessThanOrEqual(1);};
 const surface=(nextMode:'game'|'standalone'|'options')=>{Object.assign(stage,{worldVisible:nextMode!=='standalone',frontVisible:nextMode==='options',standalone:nextMode==='standalone'});stage.updateOwnSurface();};
 const h={stage,feed,render,backend,request,cancel,pending,run,surface,
  setEligible(value:boolean){eligible=value;stage.notifyCountdownFrameEligibility298();},
  setHidden(value:boolean){documentHost.hidden=value;stage.resetCountdownFrame298();},
  close(){pending.clear();curtainScene.clear();curtainMesh.geometry.dispose();curtainMaterial.dispose();}};
 hosts.push(h);return h;
}
const values=(feed:ReturnType<typeof vi.fn>)=>feed.mock.calls.map(row=>row[0]);

test('the elected real game entry supplies raw deltas once; duplicate timestamps and manual overlay calls never finance a frame',()=>{
 const h=fixture('game');h.stage.notifyCountdownFrameEligibility298();expect(h.pending.size).toBe(0);
 h.stage.gameCountdownFrame298(1000,true);expect(h.feed).not.toHaveBeenCalled();
 h.stage.gameCountdownFrame298(1900,true);expect(values(h.feed)).toEqual([.9]);
 h.stage.gameCountdownFrame298(1900,true);expect(values(h.feed)).toEqual([.9]);
 // Negative entry, not a declared eligible RAF: the actual private sampler
 // must ignore a non-elected source without modifying the elected anchor.
 h.stage.sampleCountdownFrame298('standalone',2200);
 // A real manual overlay render is explicitly NOT a frame producer.
 h.stage.renderOverlay(h.backend,2400);expect(h.render).toHaveBeenCalledOnce();expect(values(h.feed)).toEqual([.9]);
 h.stage.gameCountdownFrame298(2900,true);expect(values(h.feed)).toEqual([.9,1]);expect(h.pending.size).toBe(0);
});

test('driver changes, visibility and eligibility resumption discard suspension time while the non-elected driver cannot reset the new anchor',()=>{
 const h=fixture('game');h.stage.gameCountdownFrame298(1000,true);h.stage.gameCountdownFrame298(1100,true);expect(values(h.feed)).toEqual([.1]);
 h.surface('standalone');expect(h.pending.size).toBe(1);h.run(2000);expect(values(h.feed)).toEqual([.1]);
 h.stage.gameCountdownFrame298(2100,true);h.run(2300);expect(values(h.feed)).toEqual([.1,.3]);
 h.setHidden(true);h.run(5000);expect(h.pending.size).toBe(0);expect(values(h.feed)).toEqual([.1,.3]);
 h.setHidden(false);h.run(10000);expect(values(h.feed)).toEqual([.1,.3]);h.run(10100);expect(values(h.feed)).toEqual([.1,.3,.1]);
 h.setEligible(false);h.run(20000);expect(h.pending.size).toBe(0);h.setEligible(true);h.run(30000);h.run(30200);expect(values(h.feed)).toEqual([.1,.3,.1,.2]);
 // Options choose the existing own surface even with a live game underneath.
 h.surface('options');h.stage.gameCountdownFrame298(40000,true);h.run(41000);h.stage.gameCountdownFrame298(41100,true);h.run(41300);expect(values(h.feed)).toEqual([.1,.3,.1,.2,.3]);
 h.surface('game');expect(h.pending.size).toBe(0);h.stage.gameCountdownFrame298(50000,true);h.stage.gameCountdownFrame298(50100,true);expect(values(h.feed)).toEqual([.1,.3,.1,.2,.3,.1]);
});

test('inactive port adds no RAF; active standalone retains one existing RAF without redrawing static content, while true invalidation still renders',()=>{
 const h=fixture('standalone',{eligible:false});
 for(let i=0;i<1000;i++){h.stage.notifyCountdownFrameEligibility298();h.stage.gameCountdownFrame298(i,true);}
 expect(h.request).not.toHaveBeenCalled();expect(h.render).not.toHaveBeenCalled();expect(h.feed).not.toHaveBeenCalled();
 // Ordinary visual invalidation remains valid without a countdown.
 h.stage.invalidate();expect(h.pending.size).toBe(1);h.run(1000);expect(h.render).toHaveBeenCalledOnce();expect(h.pending.size).toBe(0);
 h.setEligible(true);expect(h.pending.size).toBe(1);h.run(2000);h.run(3000);expect(values(h.feed)).toEqual([1]);expect(h.render).toHaveBeenCalledOnce();expect(h.pending.size).toBe(1);
 h.stage.art.revision++;h.stage.invalidate();expect(h.pending.size).toBe(1);h.run(4000);expect(h.render).toHaveBeenCalledTimes(2);
 h.run(4500);expect(h.render).toHaveBeenCalledTimes(2);
 h.stage.options.onAnimate=()=>true;h.run(5000);expect(h.render).toHaveBeenCalledTimes(3);
 h.stage.options.onAnimate=()=>false;h.run(5500);const settledDraws=h.render.mock.calls.length;h.run(6000);expect(h.render).toHaveBeenCalledTimes(settledDraws);expect(h.pending.size).toBe(1);
 h.setEligible(false);h.run(7000);expect(h.pending.size).toBe(0);
});

test('closed/unready/failed frames cannot charge time and explicit retry after a failed standalone draw or feed only restores the anchor',()=>{
 const closed=fixture('standalone',{closed:true});closed.stage.notifyCountdownFrameEligibility298();closed.stage.invalidate();closed.stage.gameCountdownFrame298(1000,true);expect(closed.pending.size).toBe(0);expect(closed.feed).not.toHaveBeenCalled();
 const game=fixture('game');game.stage.gameCountdownFrame298(1000,false);game.stage.gameCountdownFrame298(5000,true);expect(game.feed).not.toHaveBeenCalled();game.stage.gameCountdownFrame298(5100,true);expect(values(game.feed)).toEqual([.1]);
 game.stage.gameCountdownFrame298(9000,false);game.stage.gameCountdownFrame298(20000,true);expect(values(game.feed)).toEqual([.1]);game.stage.gameCountdownFrame298(20100,true);expect(values(game.feed)).toEqual([.1,.1]);
 const unready=fixture('standalone',{initialized:false});unready.stage.notifyCountdownFrameEligibility298();expect(unready.pending.size).toBe(0);unready.stage.initialized=true;unready.stage.invalidate();unready.run(1000);expect(unready.feed).not.toHaveBeenCalled();
 const failed=fixture('standalone');failed.stage.notifyCountdownFrameEligibility298();failed.run(1000);failed.run(2000);expect(values(failed.feed)).toEqual([1]);
 failed.render.mockImplementationOnce(()=>{throw Error('Declared backend draw failure');});failed.stage.art.revision++;failed.stage.invalidate();
 expect(()=>failed.run(5000)).toThrow('Declared backend draw failure');expect(values(failed.feed)).toEqual([1]);expect(failed.pending.size).toBe(0);
 // No automatic retry is added. A later ordinary visual invalidation is the
 // explicit recovery input. Its long gap must not become countdown time.
 failed.stage.invalidate();failed.run(10000);expect.soft(values(failed.feed)).toEqual([1]);
 failed.run(10100);expect.soft(values(failed.feed)).toEqual([1,.1]);
 // Collect this second exact failure in the SAME fourth contract. Soft
 // assertions still fail the case but let Root observe both error origins.
 const failedFeed=fixture('standalone');failedFeed.stage.notifyCountdownFrameEligibility298();failedFeed.run(1000);
 failedFeed.feed.mockImplementationOnce(()=>{throw Error('Declared frame feed failure');});
 expect(()=>failedFeed.run(2000)).toThrow('Declared frame feed failure');expect(values(failedFeed.feed)).toEqual([1]);
 expect.soft(failedFeed.pending.size,'A failed feed must not leave an automatic clock-only RAF').toBe(0);
 failedFeed.stage.invalidate();failedFeed.run(10000);expect.soft(values(failedFeed.feed)).toEqual([1]);
 failedFeed.run(10100);expect.soft(values(failedFeed.feed)).toEqual([1,.1]);
});
