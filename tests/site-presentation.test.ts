import { expect,test } from 'vitest';
import * as THREE from 'three/webgpu';
import { OverviewLayer } from '../src/render/OverviewLayer';
import { OverviewBatch } from '../src/render/OverviewBatch';
import { createScenarioWorld } from '../src/sim/new-game';

test('both tree profiles retain resident geometry and hide only foliage across ordinary updates',()=>{
  for(const scenario of ['crashlanded','survivors'] as const) {
    const world=createScenarioWorld(42,64,scenario),layer=new OverviewLayer();
    layer.update(world,true);
    const trees:OverviewBatch[]=[];layer.group.traverse(o=>{if(o instanceof OverviewBatch&&o.geometry.userData.trunkIndices)trees.push(o);});
    expect(trees).toHaveLength(1);const mesh=trees[0]!,geometry=mesh.geometry;
    expect(geometry.index!.count).toBeGreaterThan(geometry.userData.trunkIndices);
    expect(mesh.activeCount).toBe(world.resources.filter(r=>r.kind==='tree').length);
    expect(geometry.instanceCount).toBe(mesh.activeCount);
    expect(geometry.getAttribute('overviewMatrix0')).toBeInstanceOf(THREE.InterleavedBufferAttribute);
    expect(geometry.getAttribute('overviewColor')).toBe(mesh.colorBuffer);
    expect(mesh.instanceMatrix.count).toBeGreaterThanOrEqual(mesh.activeCount);
    layer.setFoliageVisible(false);expect(geometry.drawRange.count).toBe(geometry.userData.trunkIndices);
    layer.update(world,false);expect(mesh.geometry).toBe(geometry);expect(geometry.drawRange.count).toBe(geometry.userData.trunkIndices);
    layer.setFoliageVisible(true);expect(geometry.drawRange.count).toBe(Infinity);layer.dispose();
  }
});
