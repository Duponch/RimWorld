import {describe, expect, it} from 'vitest';
import * as THREE from 'three/webgpu';
import {NativeDamageTracker} from '../src/ui3d/NativeDamageTracker';

function fixture() {
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-4, 4, 4, -4, .1, 100);
  camera.position.z = 10; camera.updateMatrixWorld();
  const material = new THREE.MeshBasicMaterial({color: 0xf0e0c0, transparent: true});
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  scene.add(mesh);
  const tracker = new NativeDamageTracker();
  const collect = () => tracker.collect(scene, camera, 256, 256);
  const dispose = () => {mesh.geometry.dispose(); material.dispose();};
  return {scene, camera, material, mesh, tracker, collect, dispose};
}

describe('native mesh damage tracker · V478', () => {
  it('starts full, retains unchanged scene state and resets its baseline explicitly', () => {
    const f = fixture();
    try {
      expect(f.collect()).toMatchObject({full: true, rect: {x: 0, y: 0, width: 256, height: 256}});
      expect(f.collect()).toBeNull(); expect(f.collect()).toBeNull();
      f.tracker.reset(); expect(f.collect()?.full).toBe(true); expect(f.collect()).toBeNull();
    } finally {f.dispose();}
  });

  it('unions old/new transformed bounds, pads physical pixels and quantizes storage', () => {
    const f = fixture();
    try {
      f.collect(); f.mesh.position.x = 1;
      const damage = f.collect()!;
      expect(damage.full).not.toBe(true);
      expect(damage.rect).toEqual({x: 96, y: 96, width: 96, height: 64});
      expect(damage.objects.has(f.mesh)).toBe(true); expect(f.collect()).toBeNull();
    } finally {f.dispose();}
  });

  it('includes every intersecting current renderable, including unchanged ink behind moved ink', () => {
    const f = fixture();
    const behind = new THREE.Mesh(f.mesh.geometry, f.material), outside = new THREE.Mesh(f.mesh.geometry, f.material);
    behind.position.z = -1; outside.position.x = -3; f.scene.add(behind, outside);
    try {
      f.collect(); f.mesh.position.x = 1;
      const damage = f.collect()!;
      expect(damage.objects.has(f.mesh)).toBe(true); expect(damage.objects.has(behind)).toBe(true);
      expect(damage.objects.has(outside)).toBe(false);
    } finally {f.dispose();}
  });

  it.each(['remove', 'visible', 'ancestor', 'layers'] as const)('repairs old ink after %s without requiring a remaining object', kind => {
    const f = fixture(), group = new THREE.Group(); f.scene.add(group); group.add(f.mesh);
    try {
      f.collect();
      if (kind === 'remove') group.remove(f.mesh);
      else if (kind === 'visible') f.mesh.visible = false;
      else if (kind === 'ancestor') group.visible = false;
      else f.mesh.layers.set(3);
      const damage = f.collect()!;
      expect(damage.full).not.toBe(true); expect(damage.rect).toEqual({x: 96, y: 96, width: 64, height: 64});
      expect(damage.objects.size).toBe(0); expect(f.collect()).toBeNull();
    } finally {f.dispose();}
  });

  it('tests layers per child while respecting ancestor visibility', () => {
    const f = fixture(), group = new THREE.Group(); group.layers.set(7); group.add(f.mesh); f.scene.add(group);
    try {f.collect(); f.material.opacity = .5; expect(f.collect()!.objects.has(f.mesh)).toBe(true);}
    finally {f.dispose();}
  });

  it('matches Three group-order inheritance when a parent group does not match camera layers', () => {
    const f = fixture(), group = new THREE.Group(); group.renderOrder = 3; group.add(f.mesh); f.scene.add(group);
    try {
      f.collect(); group.layers.set(7);
      const damage = f.collect()!; expect(damage.full).not.toBe(true); expect(damage.objects.has(f.mesh)).toBe(true);
      expect(f.collect()).toBeNull();
    } finally {f.dispose();}
  });

  it('journals clipping ancestry when retained ink moves between existing groups without changing its world matrix', () => {
    const f = fixture(), clipping = new THREE.ClippingGroup(), plain = new THREE.Group();
    clipping.clippingPlanes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)];
    f.scene.add(clipping, plain); plain.add(f.mesh);
    try {
      f.collect(); expect(f.collect()).toBeNull(); clipping.add(f.mesh);
      expect(f.collect()!.objects.has(f.mesh)).toBe(true); expect(f.collect()).toBeNull();
      plain.add(f.mesh); expect(f.collect()!.objects.has(f.mesh)).toBe(true);
      clipping.layers.set(7); expect(f.collect()?.full).toBe(true);
    } finally {f.dispose();}
  });

  it('tracks material color, opacity, clipping planes and shared texture versions without needsUpdate on scalar ink', () => {
    const f = fixture(), texture = new THREE.Texture(); f.material.map = texture;
    try {
      f.collect();
      for (const change of [() => {f.material.color.r = .1;}, () => {f.material.opacity = .4;},
        () => {texture.needsUpdate = true;}, () => {texture.offset.x = .2;},
        () => {f.material.clippingPlanes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), .2)];},
        () => {f.material.clippingPlanes![0]!.constant = .7;}]) {
        change(); expect(f.collect()!.full).not.toBe(true); expect(f.collect()).toBeNull();
      }
      f.material.opacity = .4; expect(f.collect()).toBeNull();
    } finally {texture.dispose(); f.dispose();}
  });

  it('supports ordinary lit cardboard material fields including environment rotation', () => {
    const f = fixture(), standard = new THREE.MeshStandardMaterial({roughness: .99, metalness: 0});
    f.mesh.material = standard as unknown as THREE.MeshBasicMaterial;
    try {
      f.collect(); expect(f.collect()).toBeNull(); standard.color.r = .2;
      expect(f.collect()!.full).not.toBe(true); expect(f.collect()).toBeNull();
      standard.envMapRotation.y = .1; expect(f.collect()!.full).not.toBe(true);
    } finally {standard.dispose(); f.dispose();}
  });

  it('invalidates all objects sharing a changed material or texture', () => {
    const f = fixture(), other = new THREE.Mesh(f.mesh.geometry, f.material); other.position.x = 2; f.scene.add(other);
    try {
      f.collect(); f.material.color.g = .05;
      const damage = f.collect()!; expect(damage.objects.has(f.mesh)).toBe(true); expect(damage.objects.has(other)).toBe(true);
      expect(damage.rect.x).toBeLessThanOrEqual(112); expect(damage.rect.x + damage.rect.width).toBeGreaterThanOrEqual(208);
      expect(f.collect()).toBeNull();
    } finally {f.dispose();}
  });

  it('recomputes projected geometry bounds after a versioned position update', () => {
    const f = fixture();
    try {
      f.collect(); const positions = f.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) positions.setX(i, positions.getX(i) + 1);
      positions.needsUpdate = true;
      expect(f.collect()?.full).toBe(true); expect(f.collect()).toBeNull();
    } finally {f.dispose();}
  });

  it('keeps position-mutated geometry full-only until its existing bounding sphere is cleared or recomputed', () => {
    const f = fixture(); f.mesh.geometry.computeBoundingSphere();
    try {
      f.collect(); const sphere = f.mesh.geometry.boundingSphere!, oldCenter = sphere.center.clone(), oldRadius = sphere.radius;
      const positions = f.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) positions.setX(i, positions.getX(i) + 1);
      positions.needsUpdate = true;
      expect(f.collect()?.full).toBe(true); f.material.opacity = .5; expect(f.collect()?.full).toBe(true);
      expect(f.mesh.geometry.boundingSphere).toBe(sphere); expect(sphere.center.equals(oldCenter)).toBe(true); expect(sphere.radius).toBe(oldRadius);
      f.mesh.geometry.computeBoundingSphere(); expect(f.collect()?.full).toBe(true);
      f.material.opacity = .4; expect(f.collect()!.full).not.toBe(true);
    } finally {f.dispose();}
  });

  it('handles ordinary LineSegments and clamps damage at drawing-buffer edges', () => {
    const f = fixture(), geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.4, 0, 0), new THREE.Vector3(.4, 0, 0)]);
    const material = new THREE.LineBasicMaterial(), line = new THREE.LineSegments(geometry, material);
    f.scene.remove(f.mesh); f.scene.add(line); line.position.set(-3.8, 3.8, 0);
    try {
      f.collect(); material.opacity = .5; const damage = f.collect()!;
      expect(damage.full).not.toBe(true); expect(damage.rect.x).toBe(0); expect(damage.rect.y).toBe(0);
      expect(damage.rect.width).toBeGreaterThan(0); expect(damage.rect.height).toBeGreaterThan(0);
      expect(damage.objects.has(line)).toBe(true);
    } finally {geometry.dispose(); material.dispose(); f.dispose();}
  });

  it('uses physical top-left pixels with a perspective camera and non-square viewport', () => {
    const f = fixture(), camera = new THREE.PerspectiveCamera(50, 1537 / 863, .1, 100);
    camera.position.z = 10; camera.updateMatrixWorld(); f.mesh.position.set(2, 1, 0);
    try {
      f.tracker.collect(f.scene, camera, 1537, 863); f.material.opacity = .4;
      const damage = f.tracker.collect(f.scene, camera, 1537, 863)!;
      const center = f.mesh.getWorldPosition(new THREE.Vector3()).project(camera);
      const x = (center.x + 1) * 1537 / 2, y = (1 - center.y) * 863 / 2;
      expect(damage.rect.x).toBeLessThan(x); expect(damage.rect.y).toBeLessThan(y);
      expect(damage.rect.x + damage.rect.width).toBeGreaterThan(x); expect(damage.rect.y + damage.rect.height).toBeGreaterThan(y);
      expect(y).toBeLessThan(863 / 2); expect(damage.full).not.toBe(true);
    } finally {f.dispose();}
  });

  it('forces full images for camera, viewport, light and global clipping changes', () => {
    const f = fixture(), light = new THREE.DirectionalLight(0xffffff, 1), clipping = new THREE.ClippingGroup();
    clipping.clippingPlanes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)]; clipping.add(f.mesh); f.scene.add(light, clipping);
    try {
      f.collect(); expect(f.collect()).toBeNull();
      for (const change of [() => {f.camera.position.x = 1;}, () => {f.camera.zoom = 1.1; f.camera.updateProjectionMatrix();},
        () => {light.color.r = .2;}, () => {light.intensity = 2;}, () => {light.position.x = 3;},
        () => {clipping.clippingPlanes[0]!.constant = 1;}, () => {clipping.enabled = false;}]) {
        change(); expect(f.collect()?.full).toBe(true); expect(f.collect()).toBeNull();
      }
      expect(f.tracker.collect(f.scene, f.camera, 257, 256)?.full).toBe(true);
    } finally {f.dispose();}
  });

  it('forces full capture for global environment rotation/intensity and rejects Physical materials or unknown lights', () => {
    const f = fixture(), physical = new THREE.MeshPhysicalMaterial({transmission: .5}), probe = new THREE.LightProbe();
    try {
      f.collect(); f.scene.environmentIntensity = .5; expect(f.collect()?.full).toBe(true);
      f.scene.environmentRotation.y = .2; expect(f.collect()?.full).toBe(true);
      f.mesh.material = physical as unknown as THREE.MeshBasicMaterial; expect(f.collect()?.full).toBe(true);
      f.mesh.material = f.material; f.scene.add(probe); expect(f.collect()?.full).toBe(true);
      expect(f.collect()?.full).toBe(true);
    } finally {physical.dispose(); f.dispose();}
  });

  it.each(['instanced', 'shader', 'callback', 'morph', 'wide-line', 'behind-camera'] as const)('uses conservative full fallback for %s', kind => {
    const f = fixture(); let extra: THREE.Object3D | undefined, extraMaterial: THREE.Material | undefined;
    let camera: THREE.Camera = f.camera;
    try {
      if (kind === 'instanced') {extra = new THREE.InstancedMesh(f.mesh.geometry, f.material, 1); f.scene.add(extra);}
      if (kind === 'shader') {extraMaterial = new THREE.ShaderMaterial(); f.mesh.material = extraMaterial as THREE.MeshBasicMaterial;}
      if (kind === 'callback') f.mesh.onBeforeRender = () => {};
      if (kind === 'morph') f.mesh.geometry.morphAttributes.position = [f.mesh.geometry.getAttribute('position') as THREE.BufferAttribute];
      if (kind === 'wide-line') {extraMaterial = new THREE.LineBasicMaterial({linewidth: 8}); extra = new THREE.LineSegments(f.mesh.geometry, extraMaterial); f.scene.add(extra);}
      if (kind === 'behind-camera') {f.mesh.position.z = 11; camera = new THREE.PerspectiveCamera(50, 1, .1, 100); camera.position.z = 10;}
      const collect = () => f.tracker.collect(f.scene, camera, 256, 256);
      expect(collect()?.full).toBe(true); f.material.opacity = .3; expect(collect()?.full).toBe(true);
    } finally {extraMaterial?.dispose(); f.dispose();}
  });

  it('returns no damage for an unchanged visible scene when only an excluded hidden object changes', () => {
    const f = fixture(), hidden = new THREE.Mesh(f.mesh.geometry, f.material); hidden.visible = false; f.scene.add(hidden);
    try {f.collect(); hidden.position.x++; expect(f.collect()).toBeNull();}
    finally {f.dispose();}
  });
});
