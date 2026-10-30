import { DataTexture, FloatType, NearestFilter, NoColorSpace, RGBAFormat, type Node } from 'three/webgpu';
import { Fn, If, float, int, ivec2, texture, uint, vec4 } from 'three/tsl';
import type { AnimationDetail, AnimationSampleHandle } from './AnimationDetail';

export interface RetainedAnimationOwner {
  id:number;x:number;y:number;z:number;handle:AnimationSampleHandle;values:Float64Array;
}
/** Tiny palettes for moving furniture/capsules. Owners are active primitives,
 * not World objects. A far owner keeps its coefficients through ordinary
 * adoptions; membership, options and camera-band changes revoke its sample. */
export class RetainedAnimation {
  private capacity=1;
  private data=new Float32Array(8);
  private image=this.makeTexture();
  private readonly node=texture(this.image);
  private readonly byId=new Map<number,RetainedAnimationOwner>();
  readonly owners:RetainedAnimationOwner[]=[];
  private dirty=false;
  constructor(readonly detail?:AnimationDetail){}
  private makeTexture():DataTexture {
    const image=new DataTexture(this.data,2,this.capacity,RGBAFormat,FloatType);
    image.minFilter=image.magFilter=NearestFilter;image.generateMipmaps=false;
    image.colorSpace=NoColorSpace;image.needsUpdate=true;return image;
  }
  reset():void {this.byId.clear();this.owners.length=0;}
  reconcile(anchors:ReadonlyArray<{id:number;x:number;y:number;z:number}>):void {
    if(!this.detail)return;
    if(anchors.length>this.capacity){
      this.capacity=2**Math.ceil(Math.log2(anchors.length));
      this.data=new Float32Array(this.capacity*8);
      const old=this.image;this.image=this.makeTexture();this.node.value=this.image;old.dispose();
    }
    const live=new Set<number>();this.owners.length=0;
    for(const anchor of anchors){
      live.add(anchor.id);let owner=this.byId.get(anchor.id);
      if(!owner){owner={...anchor,handle:this.detail.createHandle(),values:new Float64Array(4)};this.byId.set(anchor.id,owner);}
      else if(owner.x!==anchor.x||owner.y!==anchor.y||owner.z!==anchor.z){Object.assign(owner,anchor);this.detail.invalidate(owner.handle);}
      this.owners.push(owner);
    }
    for(const id of this.byId.keys())if(!live.has(id))this.byId.delete(id);
    this.owners.forEach((owner,row)=>this.write(row,owner));
  }
  private write(row:number,owner:RetainedAnimationOwner):void {
    const at=row*8,flag=owner.handle.level===2?1:0;
    if(this.data[at]!==flag){this.data[at]=flag;this.dirty=true;}
    for(let k=0;k<4;k++){const value=Math.fround(owner.values[k]!);if(this.data[at+4+k]!==value){this.data[at+4+k]=value;this.dirty=true;}}
  }
  present(writer:(owner:RetainedAnimationOwner,row:number)=>void):void {
    const detail=this.detail;if(!detail)return;
    for(let row=0;row<this.owners.length;row++){
      const owner=this.owners[row]!,due=detail.shouldSample(owner.handle,owner.x,owner.y,owner.z);
      if(due&&owner.handle.level===2)writer(owner,row);
      if(due)this.write(row,owner);
    }
    if(this.dirty){this.image.needsUpdate=true;this.dirty=false;}
  }
  /** Near keeps the original operation order. Cached bands perform a texture
   * read and static transform only, with no dynamic trigonometry/interpolation. */
  choose(original:()=>Node<'vec4'>,row:Node<'uint'>):Node<'vec4'> {
    if(!this.detail)return original();
    return Fn(()=>{
      const result=vec4(0).toVar();
      If(this.detail!.enabled.greaterThan(.5),()=>{
        If(this.detail!.perspective.lessThan(.5).and(this.detail!.projectionScale.greaterThanEqual(this.detail!.nearPixels)),()=>{result.assign(original());})
          .Else(()=>{
            const flag=this.node.load(ivec2(0,int(row)));flag.updateMatrix=false;
            If(flag.x.greaterThan(.5),()=>{const coefficients=this.node.load(ivec2(1,int(row)));coefficients.updateMatrix=false;result.assign(coefficients);})
              .Else(()=>{result.assign(original());});
          });
      }).Else(()=>{result.assign(original());});
      return result;
    // Consumers reuse several components; retain the conditional result in
    // their stack instead of re-emitting its initializer at a later use.
    })().toVar();
  }
  scalar(original:()=>Node<'float'>,row:Node<'uint'>):Node<'float'> {return this.choose(()=>vec4(float(original()),0,0,0),uint(row)).x;}
  dispose():void {this.image.dispose();this.reset();}
}
