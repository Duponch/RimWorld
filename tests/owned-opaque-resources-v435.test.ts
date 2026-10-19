import{expect,test}from'vitest';
import{DepthTexture,DirectionalLight,Mesh,NodeMaterialObserver,PerspectiveCamera,RenderObjectRefreshType,RenderTarget,Scene}from'three/webgpu';
import{OwnedOpaqueRevisions435}from'../src/render/OwnedOpaqueRevisions435';
import{nativeCompiledFixture435}from'./helpers/owned-opaque-native-fixture-v435';

function ownedFixture(){
 const h=nativeCompiledFixture435({texture:true}),owner=new OwnedOpaqueRevisions435(),scene=new Scene(),camera=new PerspectiveCamera(),shadow=new DirectionalLight().shadow;scene.add(h.mesh);scene.updateMatrixWorld();
 // These SHARED oracles start with the actual native atlas already prepared.
 // An absent atlas is deliberately FULL at every preflight in the owner.
 shadow.map=new RenderTarget(512,512);shadow.map.depthTexture=new DepthTexture(512,512);
 const producer=owner.producer('box');owner.attach(h.renderer,scene,[h.enabled,h.size],[h.map]);producer.register(h.mesh,[h.material],[h.map]);owner.setEnabled(true);owner.preflight(camera,shadow);
 const observer=h.material.setupObserver(h.builder);if(!(observer instanceof NodeMaterialObserver))throw Error('Actual native observer absent');
 const ro={object:h.mesh,material:h.material,geometry:h.mesh.geometry,scene,camera,_nodeBuilderState:h.state(),_bindings:[],bundle:null},frame={renderer:h.renderer,camera,frameId:1,renderId:1};
 function decide(value:unknown=ro){const refresh:unknown=Reflect.get(observer,'needsRefresh');if(typeof refresh!=='function')throw Error('Current native/delegated refresh absent');return Reflect.apply(refresh,observer,[value,frame]);}
 const finish=()=>Reflect.apply(h.mesh.onAfterRender,h.mesh,[h.renderer,scene,camera,h.mesh.geometry,h.material,null]);
 const draw=()=>{const decision=decide();finish();return decision;};
 const dispose=()=>{owner.dispose();shadow.map?.dispose();h.dispose();};
 return{h,owner,producer,scene,camera,shadow,observer,ro,frame,decide,finish,draw,dispose};
}

test('native binding resources force FULL for texture/source dirty or dispose; unchanged camera publication keeps SHARED',()=>{
 const f=ownedFixture();try{
  expect(f.draw()).toBe(RenderObjectRefreshType.FULL);expect(f.draw()).toBe(RenderObjectRefreshType.SHARED);
  f.camera.position.x=7;f.camera.updateMatrixWorld();f.frame.frameId++;f.frame.renderId++;f.owner.preflight(f.camera,f.shadow);expect(f.draw()).toBe(RenderObjectRefreshType.SHARED);
  f.h.map.needsUpdate=true;f.owner.preflight(f.camera,f.shadow);expect(f.draw()).toBe(RenderObjectRefreshType.FULL);expect(f.draw()).toBe(RenderObjectRefreshType.SHARED);
  f.h.map.source.needsUpdate=true;f.owner.preflight(f.camera,f.shadow);expect(f.draw()).toBe(RenderObjectRefreshType.FULL);expect(f.draw()).toBe(RenderObjectRefreshType.SHARED);
  f.h.map.dispose();expect(f.draw()).toBe(RenderObjectRefreshType.FULL);expect(f.draw()).toBe(RenderObjectRefreshType.SHARED);
 }finally{f.dispose();}
});

test('native target setSize after needsRefresh changes epoch and cannot be acknowledged retroactively',()=>{
 const f=ownedFixture();try{
  const target=new RenderTarget(512,512);target.depthTexture=new DepthTexture(512,512);f.shadow.map=target;f.owner.preflight(f.camera,f.shadow);expect(f.draw()).toBe(RenderObjectRefreshType.FULL);expect(f.draw()).toBe(RenderObjectRefreshType.SHARED);
  f.producer.dirty(f.h.mesh);expect(f.decide()).toBe(RenderObjectRefreshType.FULL);const before=f.owner.metrics().resourceEpoch;
  // Same ordering as the native ShadowNode.updateBefore path: size changes
  // after the decision, and RenderTarget.setSize emits its OWN dispose event.
  f.shadow.mapSize.set(1024,1024);target.setSize(1024,1024);expect(f.owner.metrics().resourceEpoch).toBeGreaterThan(before);f.finish();
  expect(f.draw()).toBe(RenderObjectRefreshType.FULL);expect(f.draw()).toBe(RenderObjectRefreshType.SHARED);
  f.shadow.mapSize.set(2048,2048);f.owner.preflight(f.camera,f.shadow);expect(f.decide()).toBe(RenderObjectRefreshType.FULL);target.setSize(2048,2048);f.finish();expect(f.draw()).toBe(RenderObjectRefreshType.FULL);
 }finally{f.dispose();}
});

test('a failed native draw without onAfterRender does not consume geometry or resource revision',()=>{
 const f=ownedFixture();try{expect(f.draw()).toBe(RenderObjectRefreshType.FULL);expect(f.draw()).toBe(RenderObjectRefreshType.SHARED);f.producer.dirty(f.h.mesh);
  expect(()=>{expect(f.decide()).toBe(RenderObjectRefreshType.FULL);throw Error('Native submission failed before completion');}).toThrow('Native submission');
  const before=f.owner.metrics().commits;expect(f.decide()).toBe(RenderObjectRefreshType.FULL);expect(f.owner.metrics().commits).toBe(before);f.finish();expect(f.draw()).toBe(RenderObjectRefreshType.SHARED);expect(f.owner.metrics().retries).toBeGreaterThan(0);
 }finally{f.dispose();}
});

test('same native observer/builder remains FULL for public consumers and returning to a closed pass revokes stale acknowledgement',()=>{
 const f=ownedFixture(),publicMesh=new Mesh(f.h.mesh.geometry,f.h.material);try{
  expect(f.draw()).toBe(RenderObjectRefreshType.FULL);expect(f.draw()).toBe(RenderObjectRefreshType.SHARED);
  const publicRO={...f.ro,object:publicMesh};expect(f.decide(publicRO)).toBe(RenderObjectRefreshType.FULL);expect(f.draw()).toBe(RenderObjectRefreshType.SHARED);
  // The SAME RO leaves the owned domain. Reusing its accepted entry when it
  // returns would hide public writes even though the compiled builder is same.
  const closedScene=f.ro.scene;f.ro.scene=new Scene();expect(f.decide()).toBe(RenderObjectRefreshType.FULL);f.ro.scene=closedScene;
  expect(f.draw()).toBe(RenderObjectRefreshType.FULL);expect(f.draw()).toBe(RenderObjectRefreshType.SHARED);
  f.owner.setEnabled(false);expect(f.decide()).toBe(RenderObjectRefreshType.FULL);f.owner.setEnabled(true);f.owner.preflight(f.camera,f.shadow);expect(f.draw()).toBe(RenderObjectRefreshType.FULL);
 }finally{publicMesh.removeFromParent();f.dispose();}
});
