import * as THREE from 'three/webgpu';
import {zoneBoundaryEdges,ZONE_SELECTION_WIDTH} from './zone-surface-presentation';
import {EMPTY_GROUND_OVERLAYS,groundOverlayRect,type GroundOverlayRect} from './ground-overlay-surfaces';

/** Exact cell-domain boundary. No interior faces, instances, or frame work. */
export class RangeOutlineLayer {
  readonly material=new THREE.MeshBasicNodeMaterial({vertexColors:true,transparent:true,opacity:1,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true});
  readonly mesh=new THREE.Mesh(new THREE.BufferGeometry(),this.material);
  surfaces:readonly GroundOverlayRect[]=EMPTY_GROUND_OVERLAYS;
  private capacity=0;
  private revision=0;
  constructor(){this.mesh.name='Selected influence contour';this.mesh.renderOrder=6;this.allocate(16);this.mesh.geometry.setDrawRange(0,0);this.mesh.visible=false;}
  private allocate(count:number):void {
    if(this.capacity)this.mesh.geometry.dispose();
    this.capacity=2**Math.ceil(Math.log2(Math.max(16,count)));
    for(const name of ['position','color'])this.mesh.geometry.setAttribute(name,new THREE.BufferAttribute(new Float32Array(this.capacity*3),3).setUsage(THREE.DynamicDrawUsage));
  }
  update(width:number,cells:readonly number[],color:number,cellColors?:ReadonlyMap<number,number>):void {
    this.revision++;
    const vertices:number[]=[],colors:number[]=[],surfaces:GroundOverlayRect[]=[],t=ZONE_SELECTION_WIDTH,rgb=new THREE.Color();
    const rect=(x0:number,z0:number,x1:number,z1:number)=>{
      vertices.push(x0,.08,z0,x1,.08,z0,x1,.08,z1,x0,.08,z0,x1,.08,z1,x0,.08,z1);
      for(let i=0;i<6;i++)colors.push(rgb.r,rgb.g,rgb.b);
      surfaces.push(groundOverlayRect(x0,z0,x1,z1,rgb,1));
    };
    for(const [i,mask]of zoneBoundaryEdges(width,cells)){
      rgb.setHex(cellColors?.get(i)??color);
      const x=i%width,z=Math.floor(i/width),w=x-.5,e=x+.5,n=z-.5,s=z+.5;
      if(mask&1)rect(w,n,w+t,s);if(mask&2)rect(e-t,n,e,s);
      if(mask&4)rect(w,n,e,n+t);if(mask&8)rect(w,s-t,e,s);
    }
    const count=vertices.length/3;
    if(count>this.capacity)this.allocate(count);
    for(const [name,values]of [['position',vertices],['color',colors]] as const){const attribute=this.mesh.geometry.getAttribute(name);(attribute.array as Float32Array).set(values);attribute.needsUpdate=true;}
    this.mesh.geometry.setDrawRange(0,count);this.mesh.geometry.computeBoundingSphere();this.mesh.visible=count>0;
    this.surfaces=surfaces.length?surfaces:EMPTY_GROUND_OVERLAYS;
  }
  hide():void {this.revision++;this.mesh.visible=false;this.surfaces=EMPTY_GROUND_OVERLAYS;}
  prepareForCompile():()=>void {
    const revision=this.revision,visible=this.mesh.visible,culled=this.mesh.frustumCulled,count=this.mesh.geometry.drawRange.count;
    this.mesh.visible=true;this.mesh.frustumCulled=false;if(count===0)this.mesh.geometry.setDrawRange(0,6);
    return()=>{this.mesh.frustumCulled=culled;if(revision!==this.revision)return;this.mesh.visible=visible;this.mesh.geometry.setDrawRange(0,count);};
  }
  dispose():void {this.mesh.removeFromParent();this.mesh.geometry.dispose();this.material.dispose();}
}
