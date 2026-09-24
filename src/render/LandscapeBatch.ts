import { BundleGroup, type Object3D } from 'three/webgpu';

/** Record landscape draw commands on WebGPU. The same geometry, lighting and
 * shadows still run every frame; only CPU command encoding is retained.
 * Children use conservative submission (GPU clipping remains authoritative),
 * so moving either the camera or sun never reuses an obsolete culling list. */
export class LandscapeBatch extends BundleGroup {
  private readonly originalCulling = new WeakMap<Object3D,boolean>();
  constructor() {
    super();
    this.name = 'retained-landscape';
    this.matrixAutoUpdate = false;
  }

  refresh(retainCommands=true): void {
    this.traverse((object: Object3D) => {
      // These layers bake positions into geometry/instance attributes. Capture
      // any new local transform once, rather than force it through the entire
      // hierarchy again on every frame. Actors/cameras/lights live outside.
      if(object.matrixAutoUpdate)object.updateMatrix();
      object.matrixAutoUpdate = false;
      if(!this.originalCulling.has(object))this.originalCulling.set(object,object.frustumCulled);
      object.frustumCulled = retainCommands ? false : this.originalCulling.get(object)!;
    });
    this.needsUpdate = true;
  }
}
