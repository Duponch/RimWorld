import{expect,test}from'vitest';
import{DepthTexture,NodeMaterialObserver,PerspectiveCamera,RenderObjectRefreshType,RenderTarget,Renderer,Scene,ShadowNode,SpotLight,TextureNode}from'three/webgpu';
import{OwnedOpaqueRevisions435}from'../src/render/OwnedOpaqueRevisions435';
import{nativeCompiledFixture435}from'./helpers/owned-opaque-native-fixture-v435';

test('a deferred atlas mismatch stays FULL before late native ShadowNode resize, then settles only after resources are stable',()=>{
 const h=nativeCompiledFixture435({texture:true}),owner=new OwnedOpaqueRevisions435(),scene=new Scene(),camera=new PerspectiveCamera(),light=new SpotLight();
 const shadow=light.shadow,target=new RenderTarget(1024,1024);target.depthTexture=new DepthTexture(1024,1024);shadow.map=target;shadow.mapSize.set(1024,1024);shadow.needsUpdate=false;shadow.autoUpdate=false;
 const shadowNode=new ShadowNode(light,shadow);Reflect.set(shadowNode,'shadowMap',target);
 const sampledDepth=new TextureNode(target.depthTexture);h.updates.push(sampledDepth);h.before.push(shadowNode);h.add(sampledDepth,'texture','fragment','actualShadowDepth');
 scene.add(h.mesh);scene.updateMatrixWorld();owner.attach(h.renderer,scene,[h.enabled,h.size],[h.map]);owner.producer('box').register(h.mesh,[h.material],[h.map]);owner.setEnabled(true);
 const observer=h.material.setupObserver(h.builder);if(!(observer instanceof NodeMaterialObserver))throw Error('Actual native observer absent');
 const ro={object:h.mesh,material:h.material,geometry:h.mesh.geometry,scene,camera,_nodeBuilderState:h.state(),_bindings:[],bundle:null},frame={renderer:h.renderer,camera,frameId:1,renderId:1};
 let decisions=0,fullBindings=0,sharedBindings=0,nativeShadowDraws=0,disposeEvents=0,lateResize=false,last:unknown;
 const onDispose=()=>disposeEvents++;target.addEventListener('dispose',onDispose);
 const direct:unknown=Reflect.get(Renderer.prototype,'_renderObjectDirect'),renderShadow:unknown=Reflect.get(shadowNode,'renderShadow');
 if(typeof direct!=='function'||typeof renderShadow!=='function')throw Error('Pinned native renderer/shadow methods absent');
 // ShadowNode.renderShadow below is the real r186 implementation, including
 // updateMatrices and RenderTarget.setSize. Only submission is replaced: this
 // oracle creates neither a GPU device nor a shadow render pass.
 h.renderer.render=()=>{nativeShadowDraws++;expect(target.width).toBe(1024);expect(target.height).toBe(1024);};
 const nativeScope={
  _objects:{get:()=>ro},_currentRenderBundle:null,
  _nodes:{needsRefresh:()=>{decisions++;const refresh:unknown=Reflect.get(observer,'needsRefresh');if(typeof refresh!=='function')throw Error('Current observer absent');last=Reflect.apply(refresh,observer,[ro,frame]);return last;},
   updateBefore:()=>{if(lateResize){lateResize=false;Reflect.apply(renderShadow,shadowNode,[{renderer:h.renderer,scene,camera}]);}},updateForRender:()=>{},updateAfter:()=>{}},
  _geometries:{updateForRender:()=>{}},
  _bindings:{updateForRender:()=>{fullBindings++;},updateSharedForRender:()=>{sharedBindings++;}},
  _pipelines:{updateForRender:()=>{},isReady:()=>true},backend:{draw:()=>{}},info:{},
 };
 const preflight=()=>{frame.frameId++;frame.renderId++;owner.preflight(camera,shadow);};
 const draw=()=>{Reflect.apply(direct,nativeScope,[h.mesh,h.material,scene,camera,null,null,null]);Reflect.apply(h.mesh.onAfterRender,h.mesh,[h.renderer,scene,camera,h.mesh.geometry,h.material,null]);return last;};
 try{
  preflight();expect(draw()).toBe(RenderObjectRefreshType.FULL);preflight();expect(draw()).toBe(RenderObjectRefreshType.SHARED);
  // A real RenderTarget can remain undersized while native shadow refresh is
  // deferred. Its CPU depth attachment still belongs to the requested size;
  // neither mapSize nor the target/texture identities change in the next frame.
  target.setSize(512,512);expect(disposeEvents).toBe(1);expect(shadow.mapSize.x).toBe(1024);expect(target.width).toBe(512);
  preflight();expect(draw()).toBe(RenderObjectRefreshType.FULL);expect(nativeShadowDraws).toBe(0);expect(shadow.needsUpdate).toBe(false);
  // The completed FULL above may ACK an epoch, but never the unresolved
  // physical mismatch. A second preflight MUST choose FULL again before the
  // real ShadowNode runs setSize, even with no new settings/identity change.
  const fullBefore=fullBindings,sharedBefore=sharedBindings,epochBefore=owner.metrics().resourceEpoch;
  preflight();expect(owner.metrics().resourceEpoch).toBeGreaterThan(epochBefore);lateResize=true;shadow.needsUpdate=true;
  expect(draw()).toBe(RenderObjectRefreshType.FULL);expect(nativeShadowDraws).toBe(1);expect(disposeEvents).toBe(2);
  // This invokes the real Renderer._renderObjectDirect dispatch: the late
  // updateBefore resize must still be followed by FULL binding refresh for
  // this very draw, not merely invalidate an ACK for the following frame.
  expect(fullBindings).toBe(fullBefore+1);expect(sharedBindings).toBe(sharedBefore);expect(target.width).toBe(1024);expect(target.height).toBe(1024);
  expect(target.depthTexture.image.width).toBe(1024);expect(target.depthTexture.image.height).toBe(1024);
  preflight();expect(draw()).toBe(RenderObjectRefreshType.FULL);preflight();expect(draw()).toBe(RenderObjectRefreshType.SHARED);
  expect(decisions).toBe(6);expect(owner.metrics().reasons['full:shadow-not-ready']).toBeGreaterThanOrEqual(2);
 }finally{target.removeEventListener('dispose',onDispose);owner.dispose();target.dispose();h.dispose();}
});
