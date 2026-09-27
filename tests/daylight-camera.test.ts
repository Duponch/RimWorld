import { expect, test } from 'vitest';
import { Frustum, Matrix4, Plane, Raycaster, Scene, Vector2, Vector3 } from 'three/webgpu';
import { CameraRig } from '../src/render/CameraRig';
import { DayNightLayer } from '../src/render/DayNightLayer';
import { sampleDaylight, type DaylightSample } from '../src/render/daylight';
import { TICKS_PER_DAY } from '../src/sim/types';

test('les projections préservent cible, échelle et désignation du sol aux bornes de zoom et de carte', () => {
  const rig = new CameraRig(null), ray = new Raycaster(), plane = new Plane(new Vector3(0, 1, 0), 0);
  try {
    for (const [width, height] of [[32, 32], [250, 250], [325, 175]]) for (const aspect of [0.7, 1.44, 2.5]) {
      rig.setMode('orthographic'); rig.configureMap(width!, height!); rig.resize(1000 * aspect, 1000);
      for (const zoom of [rig.controls.minZoom, 1, rig.controls.maxZoom]) {
        rig.orthographic.zoom = zoom; rig.orthographic.updateProjectionMatrix(); rig.controls.update();
        const span = rig.span, target = rig.controls.target.clone(), direction = rig.camera.position.clone().sub(target).normalize();
        for (const mode of ['perspective', 'orthographic', 'perspective', 'orthographic'] as const) {
          rig.setMode(mode); rig.camera.updateMatrixWorld();
          expect(rig.controls.target.distanceTo(target)).toBeLessThan(1e-9);
          expect(rig.span).toBeCloseTo(span, 8);
          expect(rig.camera.position.clone().sub(target).normalize().distanceTo(direction)).toBeLessThan(1e-9);
          expect(target.clone().project(rig.camera).length()).toBeLessThan(1.01);
          for (const offset of [new Vector3(), new Vector3(1, 0, -1), new Vector3(-1, 0, 2)]) {
            const cell = target.clone().add(offset), projected = cell.clone().project(rig.camera);
            ray.setFromCamera(new Vector2(projected.x, projected.y), rig.camera);
            expect(ray.ray.intersectPlane(plane, new Vector3())!.distanceTo(cell)).toBeLessThan(1e-7);
          }
          expect(rig.pixelsPerCell(1000)).toBeGreaterThan(0);
          expect(Number.isFinite(rig.pixelsPerCell(1000))).toBe(true);
        }
      }
      // Full-map geometry stays in front of the ortho camera at all angles.
      for (const x of [0, width!]) for (const z of [0, height!]) {
        expect(new Vector3(x, 7, z).applyMatrix4(rig.camera.matrixWorldInverse).z).toBeLessThan(-rig.camera.near);
      }
    }
    rig.setMode('perspective');
    rig.camera.position.copy(rig.controls.target).add(new Vector3(0, 2, 100)); rig.controls.update();
    expect(rig.pixelsPerCell(1000)).toBeGreaterThan(100); // near canopy must not become an overview glyph
  } finally { rig.dispose(); }
});

test('ciel : horloge périodique, continuité minuit/crépuscule et ressources graphiques stables sur plusieurs jours', () => {
  const out: DaylightSample = { x: 0, y: 0, z: 0, daylight: 0, warmth: 0, sunlight: 0, moonlight: 0 };
  const scene = new Scene(), sky = new DayNightLayer(scene), node = scene.backgroundNode, light = sky.light, shadow = light.shadow, target = new Vector3(125, 0, 125);
  let previous: DaylightSample | undefined;
  try {
    for (let tick = -1; tick <= 2 * TICKS_PER_DAY; tick++) {
      const a = { ...sampleDaylight(tick, out) };
      expect(Math.hypot(a.x, a.y, a.z)).toBeCloseTo(1, 12);
      expect(sampleDaylight(tick + 17 * TICKS_PER_DAY, out)).toEqual(a);
      for (const field of ['daylight', 'warmth', 'sunlight', 'moonlight'] as const) {
        expect(a[field]).toBeGreaterThanOrEqual(0); expect(a[field]).toBeLessThanOrEqual(1);
        if (previous) expect(Math.abs(a[field] - previous[field])).toBeLessThan(0.01);
      }
      sky.update(tick, target);
      expect(scene.backgroundNode).toBe(node); expect(sky.light).toBe(light); expect(light.shadow).toBe(shadow);
      expect(light.position.y).toBeGreaterThan(0); expect(light.target.position).toEqual(target);
      if (a.y < 0) expect(a.sunlight).toBe(0);
      previous = a;
    }
    expect(sampleDaylight(0, out).daylight).toBe(0);
    expect(sampleDaylight(TICKS_PER_DAY / 2, out).daylight).toBe(1);
    expect(sampleDaylight(TICKS_PER_DAY / 4, out).x).toBeCloseTo(1);
    expect(sampleDaylight(TICKS_PER_DAY * 3 / 4, out).x).toBeCloseTo(-1);
    sky.update(1234, target); const before = light.position.clone();
    sky.update(1234, target); expect(light.position).toEqual(before);
  } finally { sky.dispose(); }
  expect(scene.backgroundNode).toBeNull(); expect(scene.children).toEqual([]);
});

test('ombre : la première image couvre le sol visible après zoom, panoramique et bascule de projection', () => {
  const scene=new Scene(),sky=new DayNightLayer(scene),rig=new CameraRig(null),shadow=sky.light.shadow;
  try {
    for(const [width,height] of [[32,32],[250,250],[325,175]])for(const aspect of [0.7,1.6,2.5]) {
      rig.configureMap(width!,height!);rig.resize(800*aspect,800);sky.configureShadow(width!,height!);
      for(const mode of ['orthographic','perspective'] as const)for(const zoom of ['near','far'] as const)for(const [x,z] of [[width!/2,height!/2],[2,2],[width!-3,height!-3]]) {
        rig.setMode(mode);rig.configureMap(width!,height!);
        const shift=new Vector3(x!-rig.controls.target.x,0,z!-rig.controls.target.z);
        rig.controls.target.add(shift);rig.camera.position.add(shift);
        if(mode==='orthographic')rig.camera.zoom=zoom==='far'?rig.controls.minZoom:1.5;
        else rig.camera.position.sub(rig.controls.target).setLength(zoom==='far'?rig.controls.maxDistance:rig.controls.minDistance*2).add(rig.controls.target);
        rig.camera.updateProjectionMatrix();rig.controls.update();rig.camera.updateMatrixWorld();
        sky.update(3000,rig.controls.target);sky.fitShadow(rig.camera);
        const main=new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(rig.camera.projectionMatrix,rig.camera.matrixWorldInverse),rig.camera.coordinateSystem,rig.camera.reversedDepth);
        const shadowFrustum=new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(shadow.camera.projectionMatrix,shadow.camera.matrixWorldInverse));
        let visible=0;
        for(const y of [0,2.8,7])for(let iz=0;iz<=16;iz++)for(let ix=0;ix<=16;ix++) {
          const point=new Vector3((width!-1)*ix/16,y,(height!-1)*iz/16);
          if(!main.containsPoint(point))continue;
          visible++;
          expect(shadowFrustum.containsPoint(point),`${width}×${height} ${mode} ${zoom} ${x},${z} at ${point.toArray()}`).toBe(true);
        }
        expect(visible).toBeGreaterThan(0);
        expect(shadow.camera.near).toBeGreaterThan(0);
        expect(shadow.camera.far).toBeGreaterThan(shadow.camera.near);
        expect(shadow.mapSize.toArray()).toEqual([2048,2048]);
      }
    }
    rig.setMode('orthographic');rig.configureMap(250,250);rig.resize(1440,1000);sky.configureShadow(250,250);
    sky.update(3000,rig.controls.target);rig.camera.zoom=1.5;rig.camera.updateProjectionMatrix();sky.fitShadow(rig.camera);
    const nearWidth=shadow.camera.right-shadow.camera.left;
    rig.camera.zoom=rig.controls.minZoom;rig.camera.updateProjectionMatrix();sky.fitShadow(rig.camera);
    expect(shadow.camera.right-shadow.camera.left).toBeGreaterThan(nearWidth*2);

    // A low sun can put the caster far outside the player's close view while
    // its shadow still reaches a visible ground point.
    rig.camera.zoom=2;rig.camera.updateProjectionMatrix();rig.controls.update();rig.camera.updateMatrixWorld();
    sky.update(1650,rig.controls.target);sky.fitShadow(rig.camera);
    const receiver=new Vector3(125,0,125);
    const towardLight=sky.light.position.clone().sub(sky.light.target.position).normalize();
    const caster=receiver.clone().addScaledVector(towardLight,7/towardLight.y);
    const main=new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(rig.camera.projectionMatrix,rig.camera.matrixWorldInverse));
    const lit=new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(shadow.camera.projectionMatrix,shadow.camera.matrixWorldInverse));
    expect(main.containsPoint(receiver)).toBe(true);
    expect(main.containsPoint(caster)).toBe(false);
    expect(lit.containsPoint(caster)).toBe(true);
  }finally{rig.dispose();sky.dispose();}
});
