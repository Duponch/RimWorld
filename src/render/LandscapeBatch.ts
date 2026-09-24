import { BundleGroup, type Object3D } from 'three/webgpu';

/** Close views use per-camera frustum culling (including the shadow camera).
 * Distant views retain the few overview draws with conservative submission.
 * Keeping all map chunks in a close-view bundle costs more CPU than culling. */
export class LandscapeBatch extends BundleGroup {
  override isBundleGroup = true;
  private readonly originalCulling = new WeakMap<Object3D,boolean>();
  constructor() {
    super();
    this.name = 'retained-landscape';
    this.matrixAutoUpdate = false;
  }

  setRetained(retainCommands: boolean): void {
    if (retainCommands !== this.isBundleGroup) this.refresh(retainCommands);
  }

  refresh(retainCommands=this.isBundleGroup): void {
    this.isBundleGroup = retainCommands;
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
