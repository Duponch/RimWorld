import {afterEach,expect,test,vi} from 'vitest';
import * as THREE from 'three/webgpu';
import {NativeStage} from '../src/ui3d/NativeStage';
import {createNativeShipTerminal298,readAdoptedShipCredits298} from '../src/ui3d/native-ship-terminal-298';
import type {NativePage,NativeUiState} from '../src/ui3d/native-contract';
import {createShipCountdownRuntime298} from '../src/bridge/ship-countdown-runtime-298';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {validateWorld,serializeWorld,deserializeWorld} from '../src/sim/serialization';
import type {World} from '../src/sim/types';
import {declaredReadyShip298} from './helpers/declared-ready-ship298';
vi.mock('../src/ui/native-cardboard-cursors',()=>({setNativeCursor:vi.fn()}));

// Exactly TWO contracts. Real prototype/controller/runtime/THREE objects;
// declared backend/RAF/page-painter boundary only. No Native or GPU grant.
type HostStage=Record<string,any>;
const cleanup:(()=>void)[]=[];
afterEach(()=>{for(const fn of cleanup.splice(0))fn();vi.restoreAllMocks();vi.unstubAllGlobals();});
const flush=async()=>{for(let i=0;i<4;i++)await Promise.resolve();};
function deferred(){let resolve!:(value:unknown)=>void;const promise=new Promise<unknown>(yes=>{resolve=yes;});return {promise,resolve};}
function whole(w:World){expect(validateWorld(w)).toEqual([]);const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);return raw;}

function stageHost(){
 let feedEligible=false,present=true,next=0,failScene:THREE.Scene|undefined;
 const documentHost={hidden:false},pending=new Map<number,FrameRequestCallback>(),feed=vi.fn();
 const request=vi.fn((callback:FrameRequestCallback)=>{const id=++next;pending.set(id,callback);return id;});
 const cancel=vi.fn((id:number)=>{pending.delete(id);});
 vi.stubGlobal('document',documentHost);vi.stubGlobal('requestAnimationFrame',request);vi.stubGlobal('cancelAnimationFrame',cancel);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(50,2,.01,100),curtainScene=new THREE.Scene();
 const material=new THREE.MeshBasicNodeMaterial({color:0x000000,transparent:true,opacity:0,depthTest:false,depthWrite:false,toneMapped:false});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);mesh.position.z=-.2;mesh.frustumCulled=false;mesh.visible=false;curtainScene.add(mesh);
 const originalTarget={name:'declared-target'},originalMrt={name:'declared-MRT'},originalFunction=()=>{};
 let target:unknown=originalTarget,face=3,mip=2,mrt:unknown=originalMrt,renderFunction:unknown=originalFunction;
 const calls:{scene:THREE.Scene;camera:THREE.Camera;alpha:number;visible:boolean}[]=[];
 const backend={autoClear:true,xr:{enabled:true},info:{render:{drawCalls:17}},domElement:{style:{}},
  getRenderTarget:()=>target,getActiveCubeFace:()=>face,getActiveMipmapLevel:()=>mip,
  setRenderTarget:vi.fn((value:unknown,nextFace=0,nextMip=0)=>{target=value;face=nextFace;mip=nextMip;}),
  getMRT:()=>mrt,setMRT:vi.fn((value:unknown)=>{mrt=value;}),
  getRenderObjectFunction:()=>renderFunction,setRenderObjectFunction:vi.fn((value:unknown)=>{renderFunction=value;}),
  clearDepth:vi.fn(),render:vi.fn((value:THREE.Scene,cam:THREE.Camera)=>{calls.push({scene:value,camera:cam,alpha:material.opacity,visible:mesh.visible});backend.info.render.drawCalls++;if(failScene===value)throw Error('Declared curtain backend failure');})};
 const overlayCache={draw:vi.fn((renderer:typeof backend,ui:THREE.Scene,cam:THREE.Camera)=>renderer.render(ui,cam)),invalidate:vi.fn()};
 const collect=vi.fn(()=>undefined),rebuild=vi.fn(),canPresent=vi.fn(()=>present),gesture=vi.fn();
 const stage=Object.assign(Object.create(NativeStage.prototype),{
  closed:false,initialized:true,worldVisible:true,frontVisible:false,standalone:false,
  countdownFrameAt298:undefined,countdownFrameDriver298:undefined,countdownFrameEligible298:false,countdownFeedEligible298:false,
  shipCurtainScene298:curtainScene,shipCurtainMaterial298:material,shipCurtainMesh298:mesh,shipCurtainOwner298:undefined,shipCurtainPage298:undefined,shipCurtainPhase298:'idle',shipCurtainRemaining298:0,shipCurtainPageHandoff298:false,shipCurtainDisplayDirty298:false,
  frameId:0,lastTime:0,standaloneNeedsRender298:false,moving:new Set(),extraAnimating:false,
  art:{revision:11,resourceRevision:7},sceneRevision:13,lastArtRevision:11,lastSceneRevision:13,cacheRevision:19,
  scene,camera,ownRenderer:backend,standby:{setActive:vi.fn()},cacheEnabled:true,overlayCache,overlaySize:new THREE.Vector2(720,360),damageTracker:{collect},
  stats:{renders:0,overlayRenders:0,renderMs:0,drawCalls:0},reducedMotion:{matches:false},autoHideBottom:false,bottomOffset:0,bottomDockHeight:96,bottomOpen:true,visH:8,uiScale:1,
  anchors:{bottomCenter:{position:new THREE.Vector3()}},toolsDock:new THREE.Group(),regionOffsets:{navigation:0,details:0,graph:0},activationSerial:0,
  cancelPress:vi.fn(),closeDropdown:vi.fn(),rebuildPage:rebuild,layoutToolsDock:vi.fn(),refreshWorldReadout:vi.fn(),updateWorldReadoutVisibility:vi.fn(),gesture,
  options:{onActivate:vi.fn(),onEscape:vi.fn(),countdownFrame298:{canFeed:()=>feedEligible,canPresent,feed}},
 }) as HostStage;
 const run=(now:number)=>{const first=pending.entries().next().value as [number,FrameRequestCallback]|undefined;expect(first,'Real Stage must have scheduled its RAF').toBeDefined();const [id,callback]=first!;pending.delete(id);callback(now);expect(pending.size).toBeLessThanOrEqual(1);};
 const state=()=>({target,face,mip,mrt,renderFunction,autoClear:backend.autoClear,xr:backend.xr.enabled});
 const revisions=()=>({scene:stage.sceneRevision,cache:stage.cacheRevision,art:stage.art.revision});
 const h={stage,scene,camera,curtainScene,material,mesh,backend,calls,feed,request,cancel,pending,run,overlayCache,collect,rebuild,canPresent,gesture,state,revisions,
  setFeed(value:boolean){feedEligible=value;stage.notifyCountdownFrameEligibility298();},
  setPresent(value:boolean){present=value;stage.notifyCountdownFrameEligibility298();},
  hidden(value:boolean){documentHost.hidden=value;stage.resetCountdownFrame298();},
  standalone(){stage.worldVisible=false;stage.standalone=true;stage.updateOwnSurface();},
  fail(value?:THREE.Scene){failScene=value;},
 };
 cleanup.push(()=>{pending.clear();curtainScene.clear();mesh.geometry.dispose();material.dispose();});return h;
}
function esc(stage:HostStage,repeat=false){const event={key:'Escape',repeat,target:null,preventDefault:vi.fn(),stopPropagation:vi.fn(),stopImmediatePropagation:vi.fn()} as unknown as KeyboardEvent;stage.keyDown(event);return event;}
function stateFor(world:World,epoch:number):NativeUiState{return {world,epoch,panel:null,category:'ship',tool:'select',orientation:0,selectedPawnIds:[],selectedObjects:[],constructionMaterial:'steel',creationStorage:{filters:{wood:true,food:true},priority:3},speed:0,hasGame:true,busy:false,saves:[]};}
function creditsHost(h:ReturnType<typeof stageHost>){
 const f=declaredReadyShip298(),runtime=createShipCountdownRuntime298(),encoder=new SnapshotEncoder<true>({structureDelta:true,minimumStructures:0}),decoder=new SnapshotDecoder();
 let root=f.world,requestId=0,epoch=1,present=true,external=false,gate=deferred(),refuse=false;
 runtime.prepareAcceptedOwner(root).commit();
 const publicWorld=()=>{const p=decoder.adopt(structuredClone(encoder.encode(root,0,0,true)));expect(p.status,p.status==='resync'?p.reason:'').toBe('applied');if(p.status!=='applied')throw Error('Actual adopted Full missing');expect(Object.hasOwn(p.world,'escapedShips298')).toBe(false);return p.world;};
 let state=stateFor(publicWorld(),epoch);
 const realContinue=(id:number,stale=false)=>{const r=runtime.continueCredits(root,{type:'ship-credits-continue-298',id:++requestId,ownerEpoch:runtime.replyMetadata(root).shipOwnerEpoch298!+Number(stale),departureId:id});if(!r.ok)throw Error(r.reason);return r;};
 const continued=vi.fn((id:number):Promise<unknown>=>{if(refuse)return Promise.resolve().then(()=>realContinue(id,true));const r=realContinue(id);return gate.promise.then(()=>r);});
 const events:{owner:string;phase:string;fraction:number}[]=[];
 let terminal:ReturnType<typeof createNativeShipTerminal298>;
 terminal=createNativeShipTerminal298({readState:()=>state,readEpoch:()=>state.epoch,readCredits:()=>readAdoptedShipCredits298(state.world,state.campaign,state.hasGame),canPresent:()=>present,isPageCurrent:id=>h.stage.page?.id===id,
  show:page=>h.stage.showPage(page),close:id=>{if(h.stage.page?.id===id)h.stage.showPage(null);},launch:async()=>{throw Error('No launch from this credits UI contract');},continueCredits:continued,
  onFrameDemandChanged:()=>h.stage.notifyCountdownFrameEligibility298(),
  onPresentation:(owner,phase,fraction)=>{events.push({owner,phase,fraction});h.stage.presentShipCurtain298(owner,phase,fraction);}});
 h.stage.options.countdownFrame298={canFeed:()=>external||terminal.closing,canPresent:()=>present,feed:(delta:number)=>{h.feed(delta);terminal.frame(delta);}};
 const sync=()=>{const page=terminal.update(state);if(page)h.stage.showPage(page);else if(terminal.ownsPage(h.stage.page?.id))h.stage.showPage(null);return page;};
 const depart=()=>{const r=runtime.launch(root,root,{type:'ship-launch-298',id:++requestId,ownerEpoch:runtime.replyMetadata(root).shipOwnerEpoch298!,computerId:f.computer.id});if(!r.ok)throw Error(r.reason);
  const end=runtime.frame(root,{type:'ship-frame-298',ownerEpoch:r.ownerEpoch,generation:r.generation,sequence:1,deltas:Array.from({length:29},()=>.25)});expect(end.reply).toMatchObject({accepted:true,active:false,outcome:'departed'});whole(root);state={...state,world:publicWorld()};sync();return end.reply.departureId!;};
 cleanup.push(()=>{terminal.dispose();runtime.cleanup();});
 return {terminal,continued,events,sync,depart,publicWorld,get root(){return root;},get page(){return h.stage.page as NativePage|undefined;},
  setRefuse(v:boolean){refuse=v;},resolve(){gate.resolve(undefined);},external(v:boolean){external=v;h.stage.notifyCountdownFrameEligibility298();},
  adopt(){state={...state,world:publicWorld()};return sync();},
  replace(){root=deserializeWorld(f.text);runtime.prepareAcceptedOwner(root).commit();epoch++;state=stateFor(publicWorld(),epoch);sync();},
  begin(){const action=(h.stage.page as NativePage).actions?.find(c=>c.id==='ship-credits-continue298');expect(action?.disabled).toBe(false);action!.onActivate();},
 };
}

test('actual Stage idle has no curtain pass and opacity keeps UI cache identities while restoring every backend boundary',()=>{
 const h=stageHost(),s=h.stage,geometry=h.mesh.geometry,material=h.material,scene=h.curtainScene;
 for(let i=0;i<1000;i++){s.notifyCountdownFrameEligibility298();s.gameCountdownFrame298(i,true);}
 expect(h.request).not.toHaveBeenCalled();expect(h.feed).not.toHaveBeenCalled();expect(h.canPresent).not.toHaveBeenCalled();
 s.renderOverlay(h.backend,1000);expect(h.calls.map(c=>c.scene)).toEqual([h.scene]);expect(s.stats.drawCalls).toBe(1);
 expect(h.mesh.visible).toBe(false);expect(material.opacity).toBe(0);expect(material.color.getHex()).toBe(0);expect(scene.children).toEqual([h.mesh]);
 const rev=h.revisions(),backend=h.state();s.page={id:'declared-credits-owner',title:'Déclaré',rows:[],closable:false};
 s.presentShipCurtain298(s.page.id,'closing',.25);const a=material.opacity;s.presentShipCurtain298(s.page.id,'closing',.6);expect(material.opacity).toBeGreaterThan(a);s.presentShipCurtain298(s.page.id,'held',1);
 expect(material.opacity).toBe(1);expect(h.mesh.visible).toBe(true);expect(h.mesh.geometry).toBe(geometry);expect(s.shipCurtainMaterial298).toBe(material);expect(s.shipCurtainScene298).toBe(scene);
 expect(h.revisions()).toEqual(rev);expect(h.collect).not.toHaveBeenCalled();expect(h.overlayCache.invalidate).not.toHaveBeenCalled();
 h.calls.length=0;s.renderOverlay(h.backend,1100);expect(h.calls.map(c=>c.scene)).toEqual([h.scene,scene]);expect(h.calls[1]).toMatchObject({alpha:1,visible:true});expect(s.stats.drawCalls).toBe(2);expect(h.state()).toEqual(backend);
 const renders=s.stats.overlayRenders;h.fail(scene);expect(()=>s.renderOverlay(h.backend,1200)).toThrow('Declared curtain backend failure');expect(h.state()).toEqual(backend);expect(s.stats.overlayRenders).toBe(renders);h.fail();
 s.presentShipCurtain298(s.page.id,'reset',0);h.calls.length=0;s.renderOverlay(h.backend,1300);expect(h.calls.map(c=>c.scene)).toEqual([h.scene]);expect(h.mesh.visible).toBe(false);expect(material.opacity).toBe(0);expect(h.revisions()).toEqual(rev);
 h.standalone();for(let i=0;i<1000;i++)s.notifyCountdownFrameEligibility298();expect(h.pending.size).toBe(0);expect(h.overlayCache.invalidate).not.toHaveBeenCalled();
});

test('actual elected Stage/controller closing, held and adopted clear retain owner guards and finish with the final transparent display',async()=>{
 const h=stageHost(),c=creditsHost(h),s=h.stage;let now=1000;
 const game=(ms=250,ready=true)=>{now+=ms;s.renderOverlay(h.backend,now);s.gameCountdownFrame298(now,ready);};
 const quarters=(count:number)=>{for(let i=0;i<count;i++)game();};
 c.depart();const oldOwner=c.page!.id;c.begin();game(0);quarters(1);expect(h.material.opacity).toBeGreaterThan(0);
 c.replace();expect(h.material.opacity).toBe(0);expect(s.shipCurtainPhase298).toBe('idle');expect(c.continued).not.toHaveBeenCalled();
 c.depart();const owner=c.page!.id;expect(owner).not.toBe(oldOwner);
 c.setRefuse(true);esc(s);esc(s,true);game(0);const rebuilds=h.rebuild.mock.calls.length;
 quarters(11);expect(h.rebuild).toHaveBeenCalledTimes(rebuilds);expect(c.continued).not.toHaveBeenCalled();s.presentShipCurtain298(oldOwner,'reset',0);expect(s.shipCurtainOwner298).toBe(owner);
 quarters(1);await flush();expect(c.continued).toHaveBeenCalledTimes(1);expect(h.material.opacity).toBe(0);expect(c.page!.rows.some(r=>r.id==='ship-credits-error')).toBe(true);
 c.setRefuse(false);c.begin();game(0);quarters(12);expect(c.continued).toHaveBeenCalledTimes(2);expect(s.shipCurtainPhase298).toBe('held');expect(h.material.opacity).toBe(1);
 const afterContinue=whole(c.root);c.resolve();await flush();c.sync();expect(s.shipCurtainPhase298).toBe('held');expect(c.events.filter(e=>e.phase==='clear')).toHaveLength(0);
 c.adopt();expect(s.shipCurtainPhase298).toBe('clear');expect(h.material.opacity).toBe(1);expect(c.events.filter(e=>e.phase==='clear')).toHaveLength(1);expect(s.page).toBeNull();
 const rev=h.revisions(),paint=h.rebuild.mock.calls.length;game(0);quarters(2);
 const alpha=h.material.opacity,feeds=h.feed.mock.calls.length;
 c.external(true);game(5000);expect(h.material.opacity).toBe(alpha);expect(h.feed).toHaveBeenCalledTimes(feeds);
 s.sampleCountdownFrame298('standalone',now+1000);s.renderOverlay(h.backend,now+2000);expect(h.material.opacity).toBe(alpha);s.gameCountdownFrame298(now,true);expect(h.material.opacity).toBe(alpha);
 quarters(1);const beforeSuspend=h.material.opacity;h.hidden(true);game(10000);expect(h.material.opacity).toBe(beforeSuspend);h.hidden(false);game(10000);expect(h.material.opacity).toBe(beforeSuspend);game(1000,false);game(10000,true);expect(h.material.opacity).toBe(beforeSuspend);
 h.standalone();c.external(false);expect(h.pending.size).toBe(1);now+=1000;h.run(now);expect(h.material.opacity).toBe(beforeSuspend);
 for(let i=0;i<9;i++){now+=250;h.run(now);}
 expect(h.material.opacity).toBe(0);expect(s.shipCurtainPhase298).toBe('idle');expect(h.mesh.visible).toBe(false);expect(h.pending.size).toBe(1);
 const curtainCalls=h.calls.filter(v=>v.scene===h.curtainScene).length,draws=h.calls.length;
 h.run(now+1);expect(h.pending.size).toBe(0);expect(h.calls.length).toBe(draws+1);expect(h.calls.at(-1)!.scene).toBe(h.scene);expect(h.calls.at(-1)).toMatchObject({alpha:0,visible:false});expect(h.calls.filter(v=>v.scene===h.curtainScene)).toHaveLength(curtainCalls);expect(s.shipCurtainDisplayDirty298).toBe(false);
 expect(h.revisions()).toEqual(rev);expect(h.rebuild).toHaveBeenCalledTimes(paint);expect(h.overlayCache.invalidate).not.toHaveBeenCalled();expect(whole(c.root)).toBe(afterContinue);
});
