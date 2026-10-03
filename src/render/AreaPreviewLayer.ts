import * as THREE from 'three/webgpu';
import { BoxMesh,configureBoxMaterial } from './BoxMesh';

const transform=new THREE.Matrix4();

/** One resident overlay. Buffer growth preserves the material's attribute nodes. */
export class AreaPreviewLayer {
  readonly material=new THREE.MeshBasicNodeMaterial({transparent:true,opacity:.48,depthWrite:false,
    side:THREE.DoubleSide,forceSinglePass:true});
  private readonly base=new THREE.PlaneGeometry(.86,.86).rotateX(-Math.PI/2);
  readonly mesh:BoxMesh;
  private revision=0;

  constructor(){
    configureBoxMaterial(this.material);
    // Every cell shares the current tool color; no pigment or per-cell color upload.
    this.material.colorNode=null;
    this.mesh=new BoxMesh(this.base,this.material,16);
    this.mesh.renderOrder=6;this.mesh.activeCount=0;
  }

  update(width:number,area:number,cells:readonly number[],color:number):void {
    this.revision++;
    if(cells.length>this.mesh.instanceMatrix.count){
      const capacity=Math.min(area,2**Math.ceil(Math.log2(Math.max(16,cells.length))));
      this.mesh.allocate(this.base,capacity);
    }
    this.material.color.setHex(color);this.mesh.activeCount=cells.length;
    for(let i=0;i<cells.length;i++){
      transform.makeTranslation(cells[i]!%width,.065,Math.floor(cells[i]!/width));
      this.mesh.setMatrixAt(i,transform);
    }
    this.mesh.instanceMatrix.needsUpdate=true;this.mesh.computeBoundingSphere();
  }

  hide():void {this.revision++;this.mesh.activeCount=0;}

  prepareForCompile():()=>void {
    const mesh=this.mesh,geometry=mesh.geometry,revision=this.revision;
    const count=geometry.instanceCount,visible=mesh.visible,culled=mesh.frustumCulled;
    const sphere=mesh.boundingSphere.clone(),first=mesh.instanceMatrix.array.slice(0,16);
    if(count===0){mesh.setMatrixAt(0,transform.identity());mesh.activeCount=1;mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
    mesh.visible=true;mesh.frustumCulled=false;
    return ()=>{
      mesh.frustumCulled=culled;
      // A new preview received while compilation awaited owns its current state.
      if(this.revision!==revision||mesh.geometry!==geometry)return;
      if(count===0){mesh.instanceMatrix.array.set(first,0);mesh.instanceMatrix.needsUpdate=true;}
      geometry.instanceCount=count;mesh.visible=visible;mesh.boundingSphere.copy(sphere);
    };
  }

  dispose():void {this.mesh.removeFromParent();this.mesh.dispose();this.base.dispose();this.material.dispose();}
}
