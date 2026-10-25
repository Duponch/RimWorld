import {describe, expect, it} from 'vitest';
import * as THREE from 'three/webgpu';
import {NativeDamageTracker} from '../src/ui3d/NativeDamageTracker';

function fixture() {
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-4, 4, 4, -4, .1, 100);
  camera.position.z = 10; camera.updateMatrixWorld();
  const material = new THREE.MeshStandardMaterial(), geometry = new THREE.PlaneGeometry(1, 1), mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  const tracker = new NativeDamageTracker();
  let reads = 0, color = material.color;
  Object.defineProperty(material, 'color', {configurable: true, enumerable: true, get() {reads++; return color;}, set(value: THREE.Color) {color = value;}});
  const collect = (token?: number) => tracker.collect(scene, camera, 256, 256, token);
  return {scene, camera, material, geometry, mesh, tracker, collect, reads: () => reads, dispose: () => {geometry.dispose(); material.dispose();}};
}

describe('native UI owned resource generation · V478', () => {
  it('validates resources once for a stable owned token while every changed transform still produces damage', () => {
    const f = fixture();
    try {
      expect(f.collect(4)?.full).toBe(true); const reads = f.reads(); expect(reads).toBeGreaterThan(0);
      expect(f.collect(4)).toBeNull();
      for (let frame = 0; frame < 5; frame++) {f.mesh.position.x += .1; expect(f.collect(4)!.objects.has(f.mesh)).toBe(true);}
      expect(f.reads()).toBe(reads);
      f.material.color.r = .2; const beforeRefresh = f.reads();
      expect(f.collect(5)!.objects.has(f.mesh)).toBe(true); expect(f.reads()).toBeGreaterThan(beforeRefresh);
      const afterRefresh = f.reads(); expect(f.collect(5)).toBeNull(); expect(f.reads()).toBe(afterRefresh);
    } finally {f.dispose();}
  });

  it('revalidates material and texture changes when their owner advances the resource revision', () => {
    const f = fixture(), texture = new THREE.Texture(); f.material.map = texture;
    try {
      f.collect(0); texture.needsUpdate = true;
      expect(f.collect(1)!.objects.has(f.mesh)).toBe(true); expect(f.collect(1)).toBeNull();
      f.material.opacity = .4; expect(f.collect(2)!.objects.has(f.mesh)).toBe(true);
      texture.offset.x = .25; expect(f.collect(3)!.objects.has(f.mesh)).toBe(true);
    } finally {texture.dispose(); f.dispose();}
  });

  it('validates a new material or geometry immediately even under an unchanged owned token', () => {
    const f = fixture(), replacement = new THREE.MeshBasicMaterial({color: 0x112233}), geometry = new THREE.PlaneGeometry(2, 1);
    try {
      f.collect(0); f.mesh.material = replacement as unknown as THREE.MeshStandardMaterial;
      expect(f.collect(0)!.objects.has(f.mesh)).toBe(true); expect(f.collect(0)).toBeNull();
      f.mesh.geometry = geometry; expect(f.collect(0)!.objects.has(f.mesh)).toBe(true);
      const physical = new THREE.MeshPhysicalMaterial({transmission: .5});
      try {f.mesh.material = physical; expect(f.collect(0)?.full).toBe(true); expect(f.collect(0)?.full).toBe(true);}
      finally {physical.dispose();}
    } finally {replacement.dispose(); geometry.dispose(); f.dispose();}
  });

  it('keeps generic mode live for non-versioned material fields and revalidates both mode transitions', () => {
    const f = fixture();
    try {
      f.collect(8); f.material.opacity = .5; expect(f.collect()!.objects.has(f.mesh)).toBe(true);
      const genericReads = f.reads(); f.material.opacity = .4; expect(f.collect()!.objects.has(f.mesh)).toBe(true);
      expect(f.reads()).toBeGreaterThan(genericReads);
      const beforeOwned = f.reads(); expect(f.collect(8)).toBeNull(); expect(f.reads()).toBeGreaterThan(beforeOwned);
      const ownedReads = f.reads(); expect(f.collect(8)).toBeNull(); expect(f.reads()).toBe(ownedReads);
      const beforeGeneric = f.reads(); expect(f.collect()).toBeNull(); expect(f.reads()).toBeGreaterThan(beforeGeneric);
    } finally {f.dispose();}
  });

  it.each(['video', 'render-target'] as const)('preserves unsupported %s texture dependency fallback while its material is reused', kind => {
    const f = fixture(), texture = new THREE.Texture();
    if (kind === 'video') Object.assign(texture, {isVideoTexture: true}); else texture.isRenderTargetTexture = true;
    f.material.map = texture;
    try {
      expect(f.collect(3)?.full).toBe(true); const reads = f.reads();
      expect(f.collect(3)?.full).toBe(true); f.mesh.position.x += .1; expect(f.collect(3)?.full).toBe(true);
      expect(f.reads()).toBe(reads);
      texture.isRenderTargetTexture = false; Object.assign(texture, {isVideoTexture: false}); texture.needsUpdate = true;
      expect(f.collect(4)!.full).not.toBe(true); expect(f.collect(4)).toBeNull();
    } finally {texture.dispose(); f.dispose();}
  });

  it('always detects clipping ancestry, ancestor visibility, camera and lighting changes with the same token', () => {
    const f = fixture(), clipping = new THREE.ClippingGroup(), plain = new THREE.Group(), light = new THREE.AmbientLight();
    clipping.clippingPlanes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)];
    f.scene.add(clipping, plain, light); plain.add(f.mesh);
    try {
      f.collect(1); const reads = f.reads(); clipping.add(f.mesh); expect(f.collect(1)!.objects.has(f.mesh)).toBe(true);
      clipping.visible = false; expect(f.collect(1)!.rect.width).toBeGreaterThan(0); clipping.visible = true; expect(f.collect(1)).not.toBeNull();
      clipping.clippingPlanes[0]!.constant = .2; expect(f.collect(1)?.full).toBe(true);
      f.camera.position.x = .1; expect(f.collect(1)?.full).toBe(true);
      light.intensity = .5; expect(f.collect(1)?.full).toBe(true); expect(f.reads()).toBe(reads);
    } finally {f.dispose();}
  });

  it('reset and non-finite tokens never retain an unvalidated resource generation', () => {
    const f = fixture();
    try {
      f.collect(1); const beforeReset = f.reads(); f.tracker.reset(); expect(f.collect(1)?.full).toBe(true);
      expect(f.reads()).toBeGreaterThan(beforeReset);
      for (const token of [Number.NaN, Number.POSITIVE_INFINITY]) {
        const before = f.reads(); f.material.opacity -= .1;
        expect(f.collect(token)!.objects.has(f.mesh)).toBe(true); expect(f.reads()).toBeGreaterThan(before);
      }
    } finally {f.dispose();}
  });
});
