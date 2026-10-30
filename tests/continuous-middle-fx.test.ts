import {expect,test,vi} from 'vitest';
import {OrthographicCamera} from 'three/webgpu';
import {AnimationDetail} from '../src/render/AnimationDetail';
import {FxAnimationCache} from '../src/render/FxAnimationCache';
const view=(pixels:number)=>{const c=new OrthographicCamera(-50,50,50,-50,.1,1000);c.position.set(0,100,100);c.lookAt(0,0,0);c.zoom=pixels/10;c.updateProjectionMatrix();return c;};

test('middle FX keep classification and membership while bypassing all dynamic CPU writers',()=>{
 const detail=new AnimationDetail(),cache=new FxAnimationCache(3,detail),camera=view(16),writer=vi.fn(()=>cache.set(0,1,9,8,7));
 const input=Object.freeze({x:0,y:1,z:0});
 try{
  for(const [at,tick]of [[0,100],[20,100.72],[40,101.44],[100,103.6]] as const){detail.beginFrame(at,camera,1000,tick);expect(detail.classify(input.x,input.y,input.z)).toBe(1);expect(cache.sample(0,input.x,input.y,input.z,writer)).toBe(1);expect(cache.get(0,0)).toBe(0);expect(cache.get(0,1)).toBe(0);}
  expect(writer).not.toHaveBeenCalled();expect(input).toEqual({x:0,y:1,z:0});
  const before=[detail.frameTick,detail.middleTick,detail.now];expect(cache.sample(0,0,1,0,writer)).toBe(1);expect([detail.frameTick,detail.middleTick,detail.now]).toEqual(before);
  detail.beginFrame(120,view(4),1000,104);expect(cache.sample(0,0,1,0,writer)).toBe(2);expect(cache.get(0,0)).toBe(2);
  detail.beginFrame(140,view(32),1000,105);expect(cache.sample(0,0,1,0,writer)).toBe(0);expect(cache.get(0,0)).toBe(0);expect(writer).not.toHaveBeenCalled();
 }finally{cache.dispose();}
});

test('linked FX retain the real carrier band while middle shader flags use the original graph',()=>{
 const detail=new AnimationDetail(),cache=new FxAnimationCache(3,detail),writer=vi.fn(()=>cache.set(2,1,7));
 try{for(const publication of [1,2,2,3]){expect(cache.sampleLinked(2,1,publication,writer)).toBe(1);expect(cache.get(2,0)).toBe(0);}expect(writer).not.toHaveBeenCalled();expect(cache.sampleLinked(2,2,4,writer)).toBe(2);expect(cache.get(2,0)).toBe(2);expect(cache.sampleLinked(2,0,5,writer)).toBe(0);expect(cache.get(2,0)).toBe(0);expect(writer).not.toHaveBeenCalled();}finally{cache.dispose();}
});
