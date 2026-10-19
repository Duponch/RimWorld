import {expect,test} from 'vitest';
import {DepthTexture,DirectionalLight,NodeMaterialObserver,PerspectiveCamera,RenderObjectRefreshType,RenderTarget,Scene} from 'three/webgpu';
import {OwnedOpaqueRevisions435} from '../src/render/OwnedOpaqueRevisions435';
import {nativeCompiledFixture435} from './helpers/owned-opaque-native-fixture-v435';

function setup(atlas=true){
 const h=nativeCompiledFixture435(),owner=new OwnedOpaqueRevisions435(),scene=new Scene(),camera=new PerspectiveCamera(),shadow=new DirectionalLight().shadow;
 if(atlas){shadow.map=new RenderTarget(512,512);shadow.map.depthTexture=new DepthTexture(512,512);}
 scene.add(h.mesh);owner.attach(h.renderer,scene,[h.enabled,h.size],[]);owner.producer('box').register(h.mesh,[h.material]);owner.setEnabled(true);owner.preflight(camera,shadow);
 const observer=h.material.setupObserver(h.builder);if(!(observer instanceof NodeMaterialObserver))throw Error('Native observer missing');
 const ro={object:h.mesh,material:h.material,geometry:h.mesh.geometry,scene,camera,_nodeBuilderState:h.state(),_bindings:[],bundle:null},frame={renderer:h.renderer,camera};
 const decide=()=>{const method:unknown=Reflect.get(observer,'needsRefresh');if(typeof method!=='function')throw Error('Current refresh absent');return Reflect.apply(method,observer,[ro,frame]);};
 const draw=()=>{const decision=decide();Reflect.apply(h.mesh.onAfterRender,h.mesh,[h.renderer,scene,camera,h.mesh.geometry,h.material,null]);return decision;};
 return{h,owner,scene,camera,shadow,decide,draw,dispose(){owner.dispose();shadow.map?.dispose();h.dispose();}};
}

test('a permanently absent shadow atlas forces FULL again at every world-render preflight',()=>{
 const f=setup(false);try{for(let i=0;i<3;i++){f.owner.preflight(f.camera,f.shadow);expect(f.draw()).toBe(RenderObjectRefreshType.FULL);}expect(f.owner.metrics().reasons['full:shadow-not-ready']).toBeGreaterThanOrEqual(3);}
 finally{f.dispose();}
});

test('a backend outside WebGPU remains native even with the same compiled observer and unchanged resource identities',()=>{
 const f=setup();try{expect(f.draw()).toBe(RenderObjectRefreshType.FULL);expect(f.draw()).toBe(RenderObjectRefreshType.SHARED);
  Reflect.set(f.h.renderer.backend,'isWebGPUBackend',false);f.owner.preflight(f.camera,f.shadow);const count=f.owner.metrics().shared;expect(f.draw()).toBe(RenderObjectRefreshType.FULL);expect(f.owner.metrics().shared).toBe(count);expect(f.owner.metrics().reasons['unsupported-backend']).toBe(1);
  Reflect.set(f.h.renderer.backend,'isWebGPUBackend',true);f.owner.preflight(f.camera,f.shadow);expect(f.draw()).toBe(RenderObjectRefreshType.FULL);
 }finally{f.dispose();}
});

test('disposed native observer closures keep native fallback but release renderer, scene, camera and shadow references',()=>{
 const f=setup();try{expect(f.draw()).toBe(RenderObjectRefreshType.FULL);f.owner.dispose();
  for(const name of['renderer','scene','camera','shadow','shadowMap','shadowTarget','backend','device'])expect(Reflect.get(f.owner,name),name).toBeUndefined();
  expect(f.owner.metrics()).toMatchObject({enabled:false,meshes:0,materials:0,resources:0});expect(f.decide()).toBe(RenderObjectRefreshType.FULL);
 }finally{f.dispose();}
});
