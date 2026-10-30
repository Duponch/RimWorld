import {expect,test,vi} from 'vitest';
import {OrthographicCamera} from 'three/webgpu';
import {AnimationDetail} from '../src/render/AnimationDetail';
import {RetainedAnimation} from '../src/render/RetainedAnimation';
const view=(pixels:number)=>{const c=new OrthographicCamera(-50,50,50,-50,.1,1000);c.position.set(0,100,100);c.lookAt(0,0,0);c.zoom=pixels/10;c.updateProjectionMatrix();return c;};
const data=(c:RetainedAnimation)=>(c as unknown as {data:Float32Array}).data;

test('doors wind and pods use original shader coefficients in middle while far captures once and holds',()=>{
 const detail=new AnimationDetail(),cache=new RetainedAnimation(detail),anchors=Object.freeze([Object.freeze({id:17,x:0,y:1,z:0})]);let phase=3;const writer=vi.fn((o:{values:Float64Array})=>{o.values[0]=phase;});
 try{
  cache.reconcile(anchors);for(const [at,tick]of [[0,100],[20,100.72],[40,101.44],[100,103.6]] as const){detail.beginFrame(at,view(16),1000,tick);cache.present(writer);expect(cache.owners[0]!.handle.level).toBe(1);expect(data(cache)[0]).toBe(0);}expect(writer).not.toHaveBeenCalled();
  detail.beginFrame(120,view(4),1000,104);cache.present(writer);expect(cache.owners[0]!.handle.level).toBe(2);expect(writer).toHaveBeenCalledTimes(1);expect(data(cache)[0]).toBe(1);expect(data(cache)[4]).toBe(3);
  phase=9;detail.beginFrame(200,view(4),1000,108);cache.present(writer);expect(writer).toHaveBeenCalledTimes(1);expect(data(cache)[4]).toBe(3);
  detail.beginFrame(220,view(16),1000,109);cache.present(writer);expect(cache.owners[0]!.handle.level).toBe(1);expect(data(cache)[0]).toBe(0);expect(writer).toHaveBeenCalledTimes(1);
  detail.beginFrame(240,view(32),1000,110);cache.present(writer);expect(data(cache)[0]).toBe(0);expect(writer).toHaveBeenCalledTimes(1);expect(anchors).toEqual([{id:17,x:0,y:1,z:0}]);
 }finally{cache.dispose();}
});

test('far ownership reorder and pause preserve coefficients and revoke only an explicit new owner',()=>{
 const detail=new AnimationDetail(),cache=new RetainedAnimation(detail);const a=Object.freeze({id:1,x:0,y:1,z:0}),b=Object.freeze({id:2,x:4,y:1,z:0});let phase=4;const writer=vi.fn((o:{values:Float64Array})=>{o.values[0]=phase;});
 try{cache.reconcile([a,b]);detail.beginFrame(0,view(4),1000,100);cache.present(writer);const first=Array.from(data(cache));phase=8;detail.beginFrame(1000,view(4),1000,100);cache.present(writer);expect(Array.from(data(cache))).toEqual(first);expect(writer).toHaveBeenCalledTimes(2);cache.reconcile([b,a]);cache.present(writer);expect(writer).toHaveBeenCalledTimes(2);expect(cache.owners.map(o=>[o.id,o.values[0]])).toEqual([[2,4],[1,4]]);cache.reconcile([{id:3,x:0,y:1,z:0}]);cache.present(writer);expect(writer).toHaveBeenCalledTimes(3);expect(cache.owners[0]!.values[0]).toBe(8);}finally{cache.dispose();}
});
