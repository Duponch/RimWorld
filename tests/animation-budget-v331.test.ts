import { expect,test,vi } from 'vitest';
import { OrthographicCamera,PerspectiveCamera,Vector3 } from 'three/webgpu';
import { WeatherCloudLayer } from '../src/render/WeatherCloudLayer';
import { AnimationDetail } from '../src/render/AnimationDetail';
import { RetainedAnimation } from '../src/render/RetainedAnimation';
import { DEFAULT_ANIMATION_SETTINGS } from '../src/render/animation-settings';

const cameraForPixels=(pixels:number)=>{
  const camera=new OrthographicCamera(-50,50,50,-50,.1,1000);
  camera.position.set(0,100,100);camera.lookAt(0,0,0);camera.zoom=pixels/10;camera.updateProjectionMatrix();return camera;
};

test.each([1,6])('middle publications obey real 12 Hz at simulation ×%s',(speed)=>{
  const detail=new AnimationDetail(),camera=cameraForPixels(16),handle=detail.createHandle(),samples:number[]=[];
  for(let frame=0;frame<240;frame++){
    const now=frame*1000/240;detail.beginFrame(now,camera,1000,100+now/1000*6*speed);
    if(detail.shouldSample(handle,0,0,0))samples.push(now);
  }
  expect(handle.level).toBe(1);expect(samples).toHaveLength(12);
  for(let k=1;k<samples.length;k++)expect(samples[k]!-samples[k-1]!).toBeCloseTo(1000/12,8);
});

test('missed deadlines publish once, without catch-up or a permanent cadence drift',()=>{
  const detail=new AnimationDetail(),camera=cameraForPixels(16),handle=detail.createHandle();
  detail.beginFrame(0,camera,1000,100);expect(detail.shouldSample(handle,0,0,0)).toBe(true);
  detail.beginFrame(500,camera,1000,118);expect(detail.shouldSample(handle,0,0,0)).toBe(true);
  expect(detail.shouldSample(handle,0,0,0)).toBe(false);
  detail.beginFrame(580,camera,1000,120);expect(detail.shouldSample(handle,0,0,0)).toBe(false);
  detail.beginFrame(584,camera,1000,121);expect(detail.shouldSample(handle,0,0,0)).toBe(true);
});

test('pause retains samples; reset, rewind and owner reuse revoke them once',()=>{
  const detail=new AnimationDetail(),camera=cameraForPixels(16),handle=detail.createHandle();
  detail.beginFrame(0,camera,1000,100);detail.shouldSample(handle,0,0,0);
  detail.beginFrame(1000,camera,1000,100);expect(detail.shouldSample(handle,0,0,0)).toBe(false);
  detail.reset();detail.beginFrame(1001,camera,1000,100);expect(detail.shouldSample(handle,0,0,0)).toBe(true);
  detail.beginFrame(1002,camera,1000,10);expect(detail.shouldSample(handle,0,0,0)).toBe(true);
  detail.invalidate(handle);expect(detail.shouldSample(handle,0,0,0)).toBe(true);
  expect(detail.shouldSample(handle,0,0,0)).toBe(false);
});

test('far pose stays held across time and camera movement within a band; return near is immediate',()=>{
  const detail=new AnimationDetail(),camera=cameraForPixels(4),handle=detail.createHandle();
  detail.beginFrame(0,camera,1000,100);expect(detail.shouldSample(handle,0,0,0)).toBe(true);
  for(let frame=1;frame<80;frame++){camera.position.x=frame;camera.updateMatrixWorld();detail.beginFrame(frame*20,camera,1000,100+frame);expect(detail.shouldSample(handle,frame,0,0)).toBe(false);}
  expect(handle.tick).toBe(100);expect(handle.level).toBe(2);
  camera.zoom=4;camera.updateProjectionMatrix();detail.beginFrame(1800,camera,1000,200);
  expect(detail.shouldSample(handle,0,0,0)).toBe(true);expect(handle.level).toBe(0);expect(handle.tick).toBe(200);
});

test('perspective classifies each owner depth, camera turns and behind-camera anchors',()=>{
  const camera=new PerspectiveCamera(90,1,.1,1000);camera.lookAt(0,0,-1);camera.updateProjectionMatrix();
  const detail=new AnimationDetail();detail.beginFrame(0,camera,1000,0);
  expect(detail.classify(100,0,-10)).toBe(0);
  expect(detail.classify(0,0,-30)).toBe(1);
  expect(detail.classify(0,0,-100)).toBe(2);expect(detail.classify(0,0,10)).toBe(2);
  camera.lookAt(0,0,1);detail.beginFrame(1,camera,1000,1);expect(detail.classify(0,0,10)).toBe(0);
  detail.setSettings({...DEFAULT_ANIMATION_SETTINGS,enabled:false});expect(detail.classify(0,0,-100)).toBe(0);
});

test('retained furniture coefficients survive reorder/adoption and skip near CPU sampling',()=>{
  const detail=new AnimationDetail(),camera=cameraForPixels(4),cache=new RetainedAnimation(detail);
  cache.reconcile([{id:1,x:0,y:1,z:0},{id:2,x:4,y:1,z:0}]);
  let phase=7;const writer=vi.fn((owner:{values:Float64Array})=>{owner.values[0]=phase;});
  detail.beginFrame(0,camera,1000,100);cache.present(writer);expect(writer).toHaveBeenCalledTimes(2);
  phase=9;cache.reconcile([{id:2,x:4,y:1,z:0},{id:1,x:0,y:1,z:0}]);
  detail.beginFrame(1000,camera,1000,200);cache.present(writer);expect(writer).toHaveBeenCalledTimes(2);
  expect(cache.owners.map(owner=>[owner.id,owner.values[0]])).toEqual([[2,7],[1,7]]);
  cache.reconcile([{id:3,x:2,y:1,z:0}]);cache.present(writer);expect(writer).toHaveBeenCalledTimes(3);expect(cache.owners[0]!.values[0]).toBe(9);
  camera.zoom=4;camera.updateProjectionMatrix();detail.beginFrame(1001,camera,1000,201);cache.present(writer);
  expect(cache.owners[0]!.handle.level).toBe(0);expect(writer).toHaveBeenCalledTimes(3);cache.dispose();
});

test('frozen clouds classify their live drifting centres in perspective',()=>{
  const camera=new PerspectiveCamera(45,1,.1,1000),target=new Vector3(125,0,125);
  camera.position.set(125,100,250);camera.lookAt(target);camera.updateProjectionMatrix();
  const detail=new AnimationDetail();detail.setSettings({enabled:true,nearPixels:96,farPixels:48,middleHz:12});
  const clouds=new WeatherCloudLayer(detail);clouds.configureMap(250,250);
  const choose=vi.spyOn(detail,'shouldSample');
  const input={seed:42,tick:100,camera,target,strength:1,directionX:1,directionZ:0};
  detail.beginFrame(0,camera,100,100);clouds.present(input);
  const first=choose.mock.calls[0]!.slice(1),matrix=Array.from(clouds.mesh.instanceMatrix.array);
  choose.mockClear();detail.beginFrame(1000,camera,100,150);clouds.present({...input,tick:150});
  expect(choose.mock.calls[0]![1]).not.toBe(first[0]);
  expect(Array.from(clouds.mesh.instanceMatrix.array)).toEqual(matrix);
  clouds.dispose();
});
