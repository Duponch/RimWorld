import { describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Frustum, Matrix4, Mesh, MeshBasicMaterial, OrthographicCamera,
  PerspectiveCamera, Raycaster, Vector3, WebGPUCoordinateSystem, type Camera } from 'three/webgpu';
import { DioramaOcclusion } from '../src/render/diorama-occlusion';
import { DioramaLayer } from '../src/render/DioramaLayer';

function camera(perspective: boolean, y: number, z: number): OrthographicCamera | PerspectiveCamera {
  const result = perspective ? new PerspectiveCamera(55, 1, .1, 500) : new OrthographicCamera(-8, 8, 8, -8, .1, 500);
  result.position.set(4.5, y, z); result.lookAt(4.5, 0, 4.5); result.updateMatrixWorld(); return result;
}
function frustum(view: Camera): Frustum {
  return new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(view.projectionMatrix,
    view.matrixWorldInverse), view.coordinateSystem, view.reversedDepth);
}
function fixture() {
  const geometry = new BoxGeometry(10, 2.2, .15); geometry.translate(4.5, 1.2, -1);
  const query = new DioramaOcclusion();
  query.configure([{ name: 'upper-north', material: 'cardboard', side: 'north', layer: 'upper', geometry }]);
  return { query, geometry };
}

describe('upper diorama occlusion from the actual camera projection', () => {
  it.each([false, true])('keeps a nonoccluding north wall at a steep angle and cuts it only when it covers ground (perspective=%s)', perspective => {
    const { query, geometry } = fixture();
    const steep = camera(perspective, 80, -6); query.begin(steep, frustum(steep), 10, 10);
    expect(query.hides('north')).toBe(false);
    const oblique = camera(perspective, 10, -6); query.begin(oblique, frustum(oblique), 10, 10);
    expect(query.hides('north')).toBe(true);
    const behind = camera(perspective, 10, 15); query.begin(behind, frustum(behind), 10, 10);
    expect(query.hides('north')).toBe(false);
    geometry.dispose();
  });

  it.each([false, true])('agrees with independent rays from visible ground to the camera (perspective=%s)', perspective => {
    const { query, geometry } = fixture(), material = new MeshBasicMaterial(), mesh = new Mesh(geometry, material);
    mesh.updateMatrixWorld(); const ray = new Raycaster(), ground = new Vector3(), direction = new Vector3();
    for (const [y, z] of [[80, -6], [10, -6], [10, 15], [5, -6], [30, -6]]) {
      const view = camera(perspective, y!, z!), visible = frustum(view); let witnessed = false;
      // The oracle sends independent physical rays, never projects wall vertices
      // or calls the clipping/hierarchy used by the production query.
      view.getWorldDirection(direction).negate();
      for (let x = -.45; x < 9.5 && !witnessed; x += .25) for (let z = -.45; z < 9.5 && !witnessed; z += .25) {
        ground.set(x, 0, z); if (!visible.containsPoint(ground)) continue;
        if (perspective) direction.copy(view.position).sub(ground).normalize();
        ray.set(ground, direction); ray.near = 1e-6;
        ray.far = perspective ? ground.distanceTo(view.position) : 500;
        witnessed = ray.intersectObject(mesh).some(hit => visible.containsPoint(hit.point));
      }
      query.begin(view, visible, 10, 10); expect(query.hides('north'), `eye y=${y}/z=${z}`).toBe(witnessed);
    }
    geometry.dispose(); material.dispose();
  });

  it('uses the WebGPU clip convention and clears old geometry ownership', () => {
    const { query, geometry } = fixture(); const view = camera(true, 10, -6);
    view.coordinateSystem = WebGPUCoordinateSystem; view.updateProjectionMatrix();
    query.begin(view, frustum(view), 10, 10); expect(query.hides('north')).toBe(true);
    query.clear(); query.begin(view, frustum(view), 10, 10); expect(query.hides('north')).toBe(false);
    geometry.dispose();
  });

  it('keeps in-frame lower rims when zooming toward an edge in both projections', () => {
    const layer = new DioramaLayer(() => {}); layer.configure(32, 32, false);
    for (const perspective of [false, true]) for (const distance of [16, 8, 4]) {
      const view = perspective ? new PerspectiveCamera(55, 1, .1, 500) : new OrthographicCamera(-5, 5, 5, -5, .1, 500);
      view.position.set(15.5, distance, -distance / 2); const target = new Vector3(15.5, 0, .5);
      view.lookAt(target); view.updateMatrixWorld(); layer.present(view, target, distance);
      const lower = layer.group.children.filter(o => o.name.includes('north-lower'));
      expect(lower.some(o => o.visible)).toBe(true);
    }
    layer.dispose();
  });

  it('does not prepare ground constraints for an offscreen decor or an unchanged view', () => {
    const layer = new DioramaLayer(() => {}); layer.configure(250, 250, false);
    const query = (layer as unknown as { occlusion: DioramaOcclusion }).occlusion;
    const begin = vi.spyOn(query, 'begin');
    const view = new OrthographicCamera(-30, 30, 17, -17, .1, 1000);
    const target = new Vector3(129, 0, 122);
    view.position.copy(target).add(new Vector3(.85, 2, .9).normalize().multiplyScalar(368));
    view.lookAt(target); view.updateMatrixWorld(); layer.present(view, target, 34);
    expect(begin).not.toHaveBeenCalled();
    view.zoom = .1; view.updateProjectionMatrix(); layer.present(view, target, 340);
    expect(begin).toHaveBeenCalledOnce();
    layer.present(view, target, 340);
    expect(begin).toHaveBeenCalledOnce();
    view.zoom = 1; view.updateProjectionMatrix(); layer.present(view, target, 34);
    expect(begin).toHaveBeenCalledOnce();
    layer.dispose();
  });
});
