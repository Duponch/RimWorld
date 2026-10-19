import {test,expect,vi} from 'vitest';
import {Scene,Group,Mesh,BoxGeometry,MeshBasicMaterial,Vector3} from 'three/webgpu';
import {withPreparedSceneMatrices} from '../src/render/scene-matrix-pass';

function fixture(){const scene=new Scene(),parent=new Group(),mesh=new Mesh(new BoxGeometry(),new MeshBasicMaterial());scene.add(parent);parent.add(mesh);return {scene,parent,mesh};}
function nativePass(scene:Scene,mesh:Mesh){if(scene.matrixWorldAutoUpdate)scene.updateMatrixWorld();return new Vector3().setFromMatrixPosition(mesh.matrixWorld).toArray();}
test('colour and nested shadow see the same freshly composed parent/child poses with one traversal',()=>{
 const {scene,parent,mesh}=fixture();parent.position.set(5,2,3);mesh.position.set(1,4,6);const update=vi.spyOn(scene,'updateMatrixWorld');
 const poses=withPreparedSceneMatrices(scene,()=>[nativePass(scene,mesh),nativePass(scene,mesh)]);
 expect(poses).toEqual([[6,6,9],[6,6,9]]);expect(update).toHaveBeenCalledTimes(1);expect(scene.matrixWorldAutoUpdate).toBe(true);
 parent.position.x=9;expect(withPreparedSceneMatrices(scene,()=>nativePass(scene,mesh))).toEqual([10,6,9]);expect(update).toHaveBeenCalledTimes(2);
});
test('automatic preparation after a draw remains live and a failed draw restores it',()=>{
 const {scene,parent,mesh}=fixture();
 expect(()=>withPreparedSceneMatrices(scene,()=>{throw Error('native draw failed');})).toThrow('native draw failed');
 expect(scene.matrixWorldAutoUpdate).toBe(true);parent.position.z=7;expect(nativePass(scene,mesh)).toEqual([0,0,7]);
});
test('manual scene ownership and nested entry retain the caller policy',()=>{
 const {scene,parent,mesh}=fixture();scene.updateMatrixWorld();scene.matrixWorldAutoUpdate=false;parent.position.x=9;
 const update=vi.spyOn(scene,'updateMatrixWorld');
 expect(withPreparedSceneMatrices(scene,()=>nativePass(scene,mesh))).toEqual([0,0,0]);expect(update).not.toHaveBeenCalled();expect(scene.matrixWorldAutoUpdate).toBe(false);
 scene.matrixWorldAutoUpdate=true;
 withPreparedSceneMatrices(scene,()=>{withPreparedSceneMatrices(scene,()=>expect(nativePass(scene,mesh)).toEqual([9,0,0]));expect(scene.matrixWorldAutoUpdate).toBe(false);});
 expect(update).toHaveBeenCalledTimes(1);expect(scene.matrixWorldAutoUpdate).toBe(true);
});
