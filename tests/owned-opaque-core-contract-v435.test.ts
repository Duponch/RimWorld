import {readFileSync} from 'node:fs';
import {expect,test} from 'vitest';
import {Group} from 'three/webgpu';
import {BoxBatches} from '../src/render/BoxBatches';
import {TimberCladdingLayer} from '../src/render/TimberCladdingLayer';
import {OwnedOpaqueRevisions435} from '../src/render/OwnedOpaqueRevisions435';
import {ExplorationMask256} from '../src/render/ExplorationMask256';

test('public constructors keep native factories and do not acquire MAIN membership',()=>{
 const owner=new OwnedOpaqueRevisions435(),boxes=new BoxBatches(),timber=new TimberCladdingLayer(),group=new Group();try{
  boxes.set(group,'public',[{x:1,y:1,z:1,sx:1,sy:1,sz:1,color:0x809060}]);expect(owner.metrics()).toMatchObject({enabled:false,meshes:0,materials:0,registrations:0,plans:0,shared:0});
  const producer=owner.producer('box');producer.dirty(timber.wallMesh);producer.forget(timber.wallMesh);expect(owner.metrics().meshes).toBe(0);
 }finally{boxes.dispose();timber.dispose();owner.dispose();}
});

test('explicit families release membership and native callbacks after their real producer lifetime',()=>{
 const owner=new OwnedOpaqueRevisions435(),boxes=new BoxBatches(undefined,owner.producer('box')),timber=new TimberCladdingLayer(undefined,owner.producer('timber')),group=new Group();
 boxes.set(group,'closed',[{x:1,y:1,z:1,sx:1,sy:1,sz:1,color:0x809060}]);expect(owner.metrics().meshes).toBe(3);expect(owner.metrics().materials).toBe(4);
 boxes.clear();expect(owner.metrics().meshes).toBe(2);timber.dispose();expect(owner.metrics().meshes).toBe(0);boxes.dispose();owner.dispose();expect(owner.metrics()).toMatchObject({enabled:false,meshes:0,materials:0,resources:0});
});

test('exploration declares exact existing object nodes without changing their groups or shader identity',()=>{
 const mask=new ExplorationMask256();try{const first=mask.ownedObjectUniforms435(),second=mask.ownedObjectUniforms435();expect(first).toHaveLength(2);expect(first[0]).toBe(second[0]);expect(first[1]).toBe(second[1]);expect(first[0]).not.toBe(first[1]);expect(mask.map.version).toBe(1);}
 finally{mask.dispose();}
});

test('composition preserves closed MAIN factory, actor/arena branches, preparation and shadow preflight boundaries',()=>{
 const source=readFileSync('src/render/SceneRenderCore.ts','utf8');
 expect(source).toContain('this.applicationContext?new OwnedOpaqueRevisions435():undefined');
 expect(source).toContain('setEnabled(!!this.applicationContext&&this.immutableWorlds.has(world))');
 expect(source).toContain('this.preparing = true;this.ownedOpaqueRevisions435?.setEnabled(false)');
 expect(source).toContain('this.ownedOpaqueRevisions435?.preflight(this.camera,shadow);');
 expect(source.indexOf('this.ownedOpaqueRevisions435?.preflight(this.camera,shadow);')).toBeLessThan(source.lastIndexOf('this.renderScene();'));
 expect(source).toContain('this.staticSceneCompiler435?.syncVisibility()');expect(source).toContain('ownActorPlaybackWorld435');expect(source).not.toContain('TimberDepthPrepass435');
});
