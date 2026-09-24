import { REVISION, WebGPURenderer, type Camera, type Object3D } from 'three/webgpu';

// Three 0.186 does not scope this field across nested render() calls. A shadow
// bundle resets it while the landscape bundle is still being recorded. Its
// remaining draws then disappear from the uniform-update list on replay.
type BundleContext = { _currentRenderBundle: unknown };

/** Keep shadow recording separate from the suspended main-pass recording.
 * Local compatibility adapter for pinned Three 0.186.0; no vendor files patched.
 * Re-audit this private field and the native motion oracle when upgrading Three.
 */
export class ReentrantRenderer extends WebGPURenderer {
  constructor(parameters?: ConstructorParameters<typeof WebGPURenderer>[0]) {
    super(parameters);
    if (REVISION !== '186' || !('_currentRenderBundle' in this)) {
      throw new Error('Render-bundle context adapter requires an audit for this Three version.');
    }
  }

  override render(scene: Object3D, camera: Camera): void {
    const context = this as this & BundleContext;
    const outerBundle = context._currentRenderBundle;
    context._currentRenderBundle = null;
    try {
      super.render(scene, camera);
    } finally {
      context._currentRenderBundle = outerBundle;
    }
  }
}
