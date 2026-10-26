import * as THREE from 'three/webgpu';

/** CPU-only snapshot of an already rendered hit surface. The visible card can
 * tilt towards the pointer without moving the surface acquired by that pointer.
 * No mesh, material, texture or per-frame allocation is added to the scene. */
export class NativeHitPose {
  private readonly surfaces:readonly {mesh:THREE.Mesh;matrix:THREE.Matrix4}[];
  constructor(meshes:readonly THREE.Mesh[]){
    this.surfaces=meshes.map(mesh=>({mesh,matrix:mesh.matrixWorld.clone()}));
  }
  intersects(raycaster:THREE.Raycaster):boolean {
    for(const {mesh,matrix}of this.surfaces){
      const current=mesh.matrixWorld;mesh.matrixWorld=matrix;
      try{if(raycaster.intersectObject(mesh,false).length)return true;}
      finally{mesh.matrixWorld=current;}
    }
    return false;
  }
}
