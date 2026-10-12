import { expect,test } from 'vitest';
import { DataTexture,FloatType,NodeBuilder,RGBAFormat } from 'three/webgpu';
import { float,int,ivec2,texture,uint,vec4 } from 'three/tsl';
import { ActorAnimationCache } from '../src/render/ActorAnimationCache';
import { AnimationDetail } from '../src/render/AnimationDetail';
import { FxAnimationCache } from '../src/render/FxAnimationCache';
import { RetainedAnimation } from '../src/render/RetainedAnimation';

// Inspect actual deferred Three Fn stacks, without generating a shader or
// creating a renderer. These runtime inspection methods are absent from the
// deliberately narrow @types/three NodeBuilder declarations in pinned r186.
interface InspectionBuilder {
  context:object;isFlipY:()=>boolean;
  getNodeProperties(node:unknown):{uvNode?:unknown};
}
interface InspectionNode {
  getChildren?:()=>Iterable<InspectionNode>;
  getOutputNode?:(builder:InspectionBuilder)=>InspectionNode;
  jsFunc?:unknown;call?:()=>InspectionNode;
  isTextureNode?:boolean;sampler?:boolean;
}
type ReadNode=ReturnType<typeof texture> & {
  value:DataTexture;
  setup:(builder:InspectionBuilder)=>void;
  _matrixUniform:unknown;_flipYUniform:unknown;updateType:string;
};
function builder(flip=false):InspectionBuilder {
  const Constructor=NodeBuilder as unknown as new()=>InspectionBuilder;
  const result=new Constructor();result.context={};result.isFlipY=()=>flip;return result;
}
function expand(root:unknown,inspection=builder()):InspectionNode[] {
  const pending=[root as InspectionNode],seen=new Set<InspectionNode>();
  while(pending.length){
    const node=pending.pop()!;if(seen.has(node))continue;seen.add(node);
    // A ShaderCall's source function is also exposed among its raw children.
    // Walk its evaluated output only; invoking that source again would build
    // a second graph which is absent from the caller's actual shader stack.
    if(node.getOutputNode){pending.push(node.getOutputNode(inspection));continue;}
    if(typeof node.jsFunc==='function'&&node.call){pending.push(node.call());continue;}
    if(node.getChildren)for(const child of node.getChildren())pending.push(child);
  }
  return [...seen];
}
function loads(root:unknown):ReadNode[] {
  return expand(root).filter(node=>node.isTextureNode&&node.sampler===false) as ReadNode[];
}
function setupRead(read:ReadNode,flip=false):void {
  const inspection=builder(flip);read.setup(inspection);
  expand(inspection.getNodeProperties(read).uvNode,inspection);
}

test('pinned Three load clones re-enable the UV matrix when only the base was disabled',()=>{
  const image=new DataTexture(new Float32Array(8),2,1,RGBAFormat,FloatType),base=texture(image);
  try {
    base.updateMatrix=false;
    const coordinates=ivec2(1,0),read=base.load(coordinates);
    expect(base.updateMatrix).toBe(false);expect(read.updateMatrix).toBe(true);
    expect(read.uvNode).toBe(coordinates);expect(read.getSampler()).toBe(false);
    expect(read.getBase()).toBe(base);expect(read.value).toBe(image);
  }finally{image.dispose();}
});

test('actor texel reads bypass UV transforms individually and retain exact cell/slot nodes through texture growth',()=>{
  const cache=new ActorAnimationCache(new AnimationDetail());
  try {
    cache.set(0,3,10,20,30,40);
    const first=cache.cell(3,uint(0)) as unknown as ReadNode,computed=cache.cellAt(float(2).add(1),uint(0)) as unknown as ReadNode;
    expect(first).not.toBe(computed);
    for(const read of [first,computed]){expect(read.updateMatrix).toBe(false);expect(read.getSampler()).toBe(false);expect(read.uvNode).not.toBeNull();}
    const image=first.value;expect(computed.value).toBe(image);
    expect(Array.from(image.image.data as Float32Array).slice(12,16)).toEqual([10,20,30,40]);
    cache.ensureCapacity(70);
    expect(first.value).not.toBe(image);expect(computed.value).toBe(first.value);
    expect(first.value.image.height).toBe(128);
    expect(Array.from(first.value.image.data as Float32Array).slice(12,16)).toEqual([10,20,30,40]);
    expect((cache.cell(3,uint(69)) as unknown as ReadNode).updateMatrix).toBe(false);
  }finally{cache.dispose();}
});

test('FX literal and computed cell reads both bypass matrix setup without changing palette values',()=>{
  const cache=new FxAnimationCache(6,new AnimationDetail());
  try {
    cache.set(2,5,1,2,3,4);
    const direct=cache.cell(5,uint(2)) as unknown as ReadNode,computed=cache.cell(int(float(4).add(1)),uint(2)) as unknown as ReadNode;
    for(const read of [direct,computed]){expect(read.updateMatrix).toBe(false);expect(read.getSampler()).toBe(false);expect(read.value).toBe(direct.value);}
    expect(Array.from(direct.value.image.data as Float32Array).slice((2*6+5)*4,(2*6+6)*4)).toEqual([1,2,3,4]);
  }finally{cache.dispose();}
});

test('the actual retained choose Fn marks BOTH its flag and coefficient loads after clone creation',()=>{
  const cache=new RetainedAnimation(new AnimationDetail());
  try {
    const reads=loads(cache.choose(()=>vec4(9,8,7,6),uint(0)));
    expect(reads).toHaveLength(2);
    for(const read of reads){expect(read.updateMatrix).toBe(false);expect(read.getSampler()).toBe(false);expect(read.value.image.width).toBe(2);}
    expect(reads[0]!.value).toBe(reads[1]!.value);
  }finally{cache.dispose();}
});

test('non-flipped backend setup creates no matrix uniform or per-object update for palette loads',()=>{
  const detail=new AnimationDetail(),actor=new ActorAnimationCache(detail),fx=new FxAnimationCache(6,detail),retained=new RetainedAnimation(detail);
  try {
    const reads=[actor.cell(0,uint(0)),actor.cellAt(float(3),uint(0)),fx.cell(1,uint(0)),...loads(retained.choose(()=>vec4(1),uint(0)))] as ReadNode[];
    for(const read of reads){setupRead(read);expect(read._matrixUniform).toBeNull();expect(read._flipYUniform).toBeNull();expect(read.updateType).toBe('none');}
  }finally{actor.dispose();fx.dispose();retained.dispose();}
});

test('WebGL flip setup remains native and is not falsely claimed to lose every object update',()=>{
  const cache=new ActorAnimationCache(new AnimationDetail());
  try {
    const read=cache.cell(0,uint(0)) as unknown as ReadNode;setupRead(read,true);
    expect(read.updateMatrix).toBe(false);expect(read._matrixUniform).toBeNull();
    expect(read._flipYUniform).not.toBeNull();expect(read.updateType).toBe('object');
    expect(read.getSampler()).toBe(false);
  }finally{cache.dispose();}
});
