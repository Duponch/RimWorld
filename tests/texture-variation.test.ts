import { expect, test } from 'vitest';
import * as THREE from 'three/webgpu';
import { mergedInstances } from '../src/render/StaticGeometry';
import { PATTERN_SPAN,physicalPatternSpan } from '../src/render/texture-variation';

function bakedUv(keys: readonly number[]): number[][] {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true });
  const mesh = mergedInstances(group, [{
    geometry: new THREE.BoxGeometry(1, 1, 1),
    items: keys.map((key) => ({ key, x: 4, y: 0.5, z: 4 })),
  }], material, true, true)!;
  const uv = mesh.geometry.getAttribute('uv');
  const perItem = uv.count / keys.length;
  const result = keys.map((_, index) => Array.from({ length: perItem * 2 }, (_, component) =>
    (uv.array as Float32Array)[index * perItem * 2 + component]!));
  mesh.geometry.dispose(); material.dispose();
  return result;
}

test('different resource identities sample different stable regions without another texture coordinate buffer', () => {
  const forward = bakedUv([17, 18]);
  const reverse = bakedUv([18, 17]);
  expect(forward[0]).not.toEqual(forward[1]);
  expect(forward[0]).toEqual(reverse[1]);
  expect(forward[1]).toEqual(reverse[0]);
  for (const coordinates of forward) for (const value of coordinates) {
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  }
  expect(PATTERN_SPAN).toBeGreaterThan(0.5);
});

test('an elongated painted face keeps equal pigment density on both physical axes', () => {
  expect(physicalPatternSpan(4,.5,.25,0,1)).toEqual([PATTERN_SPAN,PATTERN_SPAN/16]);
  expect(physicalPatternSpan(4,.5,.25,0,0)).toEqual([PATTERN_SPAN,PATTERN_SPAN/8]);
  expect(physicalPatternSpan(4,.5,.25,1,0)).toEqual([PATTERN_SPAN/2,PATTERN_SPAN]);
  expect(physicalPatternSpan(1,1,1,0,1)).toEqual([PATTERN_SPAN,PATTERN_SPAN]);

  const group=new THREE.Group(), material=new THREE.MeshStandardNodeMaterial({vertexColors:true});
  const mesh=mergedInstances(group,[{geometry:new THREE.BoxGeometry(1,1,1),items:[{x:4,y:0,z:4,sx:4,sy:.5,sz:.25,key:17}]}],material,true,true)!;
  try {
    const uv=mesh.geometry.getAttribute('uv'),normal=mesh.geometry.getAttribute('normal');
    const top=Array.from({length:uv.count},(_,i)=>i).filter(i=>normal.getY(i)>.9);
    const range=(axis:'x'|'y')=>Math.max(...top.map(i=>axis==='x'?uv.getX(i):uv.getY(i)))-Math.min(...top.map(i=>axis==='x'?uv.getX(i):uv.getY(i)));
    expect(range('x')).toBeCloseTo(PATTERN_SPAN,5);
    expect(range('y')).toBeCloseTo(PATTERN_SPAN/16,5);
    expect(Object.keys(mesh.geometry.attributes).sort()).toEqual(['color','normal','position','uv']);
  } finally {mesh.geometry.dispose();material.dispose();}
});
