import {expect,test} from 'vitest';
import {DataTexture,InstancedBufferAttribute,OrthographicCamera,Vector3} from 'three/webgpu';
import {float,int,uint} from 'three/tsl';
import {AnimationDetail} from '../src/render/AnimationDetail';
import {FxAnimationCache} from '../src/render/FxAnimationCache';
import {WeatherPrecipitationLayer,precipitationMapLayout} from '../src/render/WeatherPrecipitationLayer';

// Evaluate only the pinned Three integer-coordinate expression. Assertions
// address the actual load node's texel in the actual DataTexture allocation,
// independently of the cache's unchanged logical CPU get(row,cell) accessor.
interface CoordinateNode {value?:unknown;node?:CoordinateNode;nodes?:CoordinateNode[];convertTo?:string;op?:string;method?:string;aNode?:CoordinateNode;bNode?:CoordinateNode}
function evaluate(n:CoordinateNode):number[]{
 if(typeof n.value==='number')return [n.value];
 if(n.node){const v=evaluate(n.node);return n.convertTo==='int'||n.convertTo==='uint'?v.map(Math.trunc):v;}
 if(n.nodes)return n.nodes.flatMap(evaluate);
 if(n.aNode&&n.bNode){const a=evaluate(n.aNode)[0]!,b=evaluate(n.bNode)[0]!;switch(n.op??n.method){case '+':return [a+b];case '*':return [a*b];case '/':return [a/b];case '%':case 'mod':return [a%b];}}
 throw Error('Unexpected palette coordinate node '+JSON.stringify({op:n.op,method:n.method,convertTo:n.convertTo}));
}
type Read=ReturnType<FxAnimationCache['cell']>&{value:DataTexture;uvNode:CoordinateNode;updateMatrix:boolean};

test('FX packing crosses 2048/8192 logical rows with exact old values, existing read nodes and no UV matrix',()=>{
 const cache=new FxAnimationCache(6,new AnimationDetail());
 const rows=[0,2047,2048,8191,8192,12812,32799];
 const reads=rows.map(row=>cache.cell(int(float(4).add(1)),uint(row)) as Read);
 const stored=new Map<number,number>(),first=reads[0]!,base=first.value;
 let releases=0;base.addEventListener('dispose',()=>{releases++;});
 try{
  for(const count of [1,2048,2049,8192,8193,12813,32800]){
   cache.ensure(count);cache.set(count-1,5,count+.25,1,2,3);stored.set(count-1,count+.25);cache.flush();
   const image=first.value,width=image.image.width,height=image.image.height,data=image.image.data as Float32Array;
   expect(width).toBeLessThanOrEqual(2048);expect(height).toBeLessThanOrEqual(2048);
   expect(width*height*4).toBe(data.length);
   for(let index=0;index<rows.length;index++)if(rows[index]!<count){
    const row=rows[index]!,read=reads[index]!,[x,y]=evaluate(read.uvNode);
    expect(read.value).toBe(image);expect(read.updateMatrix).toBe(false);
    expect(x).toBeGreaterThanOrEqual(0);expect(x).toBeLessThan(width);expect(y).toBeGreaterThanOrEqual(0);expect(y).toBeLessThan(height);
    expect((y!*width+x!)).toBe(row*6+5);
    expect(data[(y!*width+x!)*4]).toBe(cache.get(row,5));
   }
   for(const [row,value] of stored)expect(cache.get(row,5)).toBe(value);
   const version=image.version;cache.ensure(count);cache.flush();expect(first.value).toBe(image);expect(image.version).toBe(version);
  }
  expect(releases).toBe(1);expect(first.value).not.toBe(base);
  expect(first.value.image.width).toBe(192);expect(first.value.image.height).toBe(2048);
 }finally{cache.dispose();}
});

test('actual 200/250/400 rain preserves every admitted emitter and paused publications within a 2048 texture edge',()=>{
 const detail=new AnimationDetail();detail.setSettings({...detail.settings,nearPixels:96,farPixels:1});
 const layer=new WeatherPrecipitationLayer(detail),camera=new OrthographicCamera(-20,20,20,-20,.1,1000),target=new Vector3(100,12,100);
 camera.position.set(100,120,180);camera.lookAt(target);camera.updateMatrixWorld();camera.updateProjectionMatrix();
 const input={seed:410,tick:100,rainRate:1,snowRate:0,camera,target,strength:1,directionX:.8,directionZ:.6,daylight:1};
 const mesh=layer.mesh,geometry=mesh.geometry,material=mesh.material,cache=(layer as unknown as {cache:FxAnimationCache}).cache;
 try{
  for(const size of [200,250,400]){
   layer.configureMap(size,size);detail.beginFrame(0,camera,600,100);layer.present(input);
   const count=Math.round(precipitationMapLayout(size,size).capacity*.82),image=(cache.cell(5,uint(count-1)) as Read).value;
   expect(geometry.instanceCount).toBe(count);expect(mesh.visible).toBe(true);expect(mesh.geometry).toBe(geometry);expect(mesh.material).toBe(material);
   expect(cache.get(count-1,0)).toBe(1);expect(image.image.width).toBeLessThanOrEqual(2048);expect(image.image.height).toBeLessThanOrEqual(2048);
   expect(image.image.width).toBe(size===400?192:48);expect(image.image.height).toBe(2048);
   const slots=geometry.getAttribute('fxSlot') as InstancedBufferAttribute,version=image.version,slotVersion=slots.version,sample=cache.get(count-1,4);
   detail.beginFrame(20,camera,600,100);layer.present(input);
   expect(image.version).toBe(version);expect(slots.version).toBe(slotVersion);expect(cache.get(count-1,4)).toBe(sample);expect(geometry.instanceCount).toBe(count);
  }
 }finally{layer.dispose();}
});
