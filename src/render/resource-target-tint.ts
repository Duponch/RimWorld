import * as THREE from 'three/webgpu';
import type { ResourceRangeData } from './StaticGeometry';

const tint=new THREE.Color(0x84baff),strength=.32;
export const rangeTargetResourceId=(id:number):number=>id<0?Math.floor(-id/2):id;
type SavedRange={start:number;values:Float32Array};

/** Tint only selected merged resource ranges, using the existing RGB stream.
 * No shader/draw/material change, and clearing restores the original F32 bits. */
export class ResourceTargetTint {
  private readonly originals=new Map<THREE.BufferAttribute,SavedRange[]>();
  private readonly uploads=new WeakMap<THREE.BufferAttribute,{start:number;count:number}>();

  private upload(attribute:THREE.BufferAttribute,start:number,count:number):void {
    let range=this.uploads.get(attribute);
    if(!range){range={start,count};this.uploads.set(attribute,range);}
    if(attribute.updateRanges.includes(range)){
      const end=Math.max(range.start+range.count,start+count);
      range.start=Math.min(range.start,start);range.count=end-range.start;
    }else{range.start=start;range.count=count;attribute.updateRanges.push(range);}
    // One retained range even if the mesh remains culled during many drags.
    attribute.needsUpdate=true;
  }

  private restoreAttribute(attribute:THREE.BufferAttribute):void {
    const saved=this.originals.get(attribute);if(!saved)return;
    const colors=attribute.array as Float32Array;
    for(const {start,values} of saved){colors.set(values,start);this.upload(attribute,start,values.length);}
    this.originals.delete(attribute);
  }

  private applyRanges(attribute:THREE.BufferAttribute,ranges:Iterable<{start:number;count:number}>):void {
    this.restoreAttribute(attribute);
    const colors=attribute.array as Float32Array,saved:SavedRange[]=[];
    for(const {start,count} of ranges){
      const values=colors.slice(start,start+count);saved.push({start,values});
      for(let i=0;i<count;i+=3){
        colors[start+i]=values[i]!*(1-strength)+tint.r*strength;
        colors[start+i+1]=values[i+1]!*(1-strength)+tint.g*strength;
        colors[start+i+2]=values[i+2]!*(1-strength)+tint.b*strength;
      }
      this.upload(attribute,start,count);
    }
    if(saved.length)this.originals.set(attribute,saved);
  }

  /** Slots are resident instance-color indices, not Resource IDs. Restore before
   * historical color writers run, then apply again to their fresh RGB values. */
  applySlots(attribute:THREE.BufferAttribute,slots:Iterable<number>):void {
    const ranges: {start:number;count:number}[]=[];
    for(const slot of slots)ranges.push({start:slot*3,count:3});
    this.applyRanges(attribute,ranges);
  }

  apply(group:THREE.Group,ids:ReadonlySet<number>):void {
    for(const child of group.children){
      const mesh=child as THREE.Mesh,data=mesh.userData.resourceRanges as ResourceRangeData|undefined;
      if(!data)continue;
      const attribute=mesh.geometry.getAttribute('color') as THREE.BufferAttribute|undefined;
      if(!attribute)continue;
      const ranges: {start:number;count:number}[]=[];
      for(const range of data.ranges){
        if(!ids.has(rangeTargetResourceId(range.id)))continue;
        ranges.push({start:range.vertexStart*3,count:range.vertexCount*3});
      }
      this.applyRanges(attribute,ranges);
    }
  }

  restore(group?:THREE.Group):void {
    if(group){
      for(const child of group.children){const attribute=(child as THREE.Mesh).geometry?.getAttribute('color') as THREE.BufferAttribute|undefined;if(attribute)this.restoreAttribute(attribute);}
    }else for(const attribute of this.originals.keys())this.restoreAttribute(attribute);
  }
}
