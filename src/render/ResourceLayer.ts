import { stoneColor } from './stone-palette';
import { harvestable } from '../sim/plants';
import * as THREE from 'three/webgpu';
import type { World } from '../sim/types';
import { WORLD_SCALE } from '../world/scale';
import { clearGroup } from './primitives';
import type { Placement } from './primitives';
import { mergedInstances, noise } from './StaticGeometry';

/** Removal compacts only the existing index buffer; vertices, mesh and material
 * stay resident. Original ranges also permit checkpoint restoration of an ID.
 * Addition/movement of a resource rebuilds only that spatial chunk.
 */
function retainResources(group: THREE.Group, alive: Set<number>): void {
  for (const object of group.children) {
    const mesh = object as THREE.Mesh;
    const data = mesh.userData.resourceRanges as { ranges: { id: number; start: number; count: number }[]; original: Uint16Array | Uint32Array } | undefined;
    if (!data) continue;
    const index = mesh.geometry.index!; let count = 0;
    for (const range of data.ranges) if (alive.has(range.id)) {
      (index.array as Uint16Array | Uint32Array).set(data.original.subarray(range.start, range.start + range.count), count); count += range.count;
    }
    index.needsUpdate = true; mesh.geometry.setDrawRange(0, count);
    // The original sphere remains a conservative bound after removal.
  }
}

export class ResourceLayer {
  private readonly chunks = new Map<string, { signature: string; group: THREE.Group; identities: Map<number, string> }>();
  private foliageVisible = true;
  private growing: World['resources'] = [];
  updateGrowth(world: World): void {
    if (this.growing.some(plant => harvestable(world, plant))) this.update(world, false);
  }
  constructor(readonly group: THREE.Group, private readonly staticMaterial: THREE.Material) {}
  setFoliageVisible(visible: boolean): void {
    this.foliageVisible = visible;
    this.group.traverse(object => { if (object.name === 'tree-canopy') object.visible = visible; });
  }
  clear(): void { clearGroup(this.group); this.chunks.clear(); this.growing = []; }
  update(world: World, newMap: boolean): void {
    if (newMap) { clearGroup(this.group); this.chunks.clear(); this.growing = []; }
    this.growing = world.resources.filter(plant => plant.kind === 'berries' && !harvestable(world, plant));
    const chunks = new Map<string, World['resources']>();
    for (const resource of world.resources) {
      if (resource.kind === 'rice') continue;
      const key = `${Math.floor(resource.x / WORLD_SCALE.chunkSize)}:${Math.floor(resource.z / WORLD_SCALE.chunkSize)}`;
      const chunk = chunks.get(key);
      if (chunk) chunk.push(resource); else chunks.set(key, [resource]);
    }
    for (const [key, previous] of this.chunks) if (!chunks.has(key) && previous.signature !== '') {
      retainResources(previous.group, new Set()); previous.signature = '';
    }
    for (const [key, chunk] of chunks) {
      const signature = chunk.map(resource => `${resource.id}:${resource.kind}:${resource.x}:${resource.z}:${resource.stone ?? ""}:${resource.kind === 'berries' && harvestable(world, resource) ? 1 : 0}`).join('|');
      const previous = this.chunks.get(key);
      if (previous?.signature === signature) continue;
      if (previous && chunk.every(r => previous.identities.get(r.id) === `${r.kind}:${r.x}:${r.z}:${r.stone ?? ""}`)) {
        retainResources(previous.group, new Set(chunk.flatMap(r => r.kind === 'berries' && harvestable(world,r) ? [r.id,-r.id] : [r.id]))); previous.signature = signature; continue;
      }
      const group = previous?.group ?? new THREE.Group();
      if (previous) clearGroup(group); else this.group.add(group);
      group.name = `Resources ${key}`;
      const trunks: Placement[] = [], crowns: Placement[] = [], upperCrowns: Placement[] = [];
      const rocks: Placement[] = [], bushes: Placement[] = [], berries: Placement[] = [];
      for (const resource of chunk) {
        const { x, z } = resource;
        const parts = [trunks, crowns, upperCrowns, rocks, bushes, berries];
        const lengths = parts.map(items => items.length);
        const n = noise(x, z, 77), turn = n * Math.PI * 2;
        if (resource.kind === 'tree') {
          const height = WORLD_SCALE.treeMinHeight + n * (WORLD_SCALE.treeMaxHeight - WORLD_SCALE.treeMinHeight);
          const radius = 0.8 + n * 0.32;
          trunks.push({ x, y: height * 0.25, z, sx: 1.1, sy: height * 0.5, sz: 1.1, ry: turn });
          crowns.push({ x, y: height * 0.57, z, sx: radius, sy: height * 0.35, sz: radius, ry: turn, color: n > 0.65 ? 0x657d56 : 0x526e50 });
          upperCrowns.push({ x, y: height * 0.83, z, sx: radius * 0.72, sy: height * 0.34, sz: radius * 0.72, ry: turn + 0.3, color: n > 0.65 ? 0x81925b : 0x688557 });
        } else if (resource.kind === 'rock') {
          rocks.push({ x: x - 0.1, y: 0.3, z, sx: 0.46 + n * 0.14, sy: 0.35 + n * 0.15, sz: 0.43, ry: turn, color: resource.stone ? stoneColor(resource.stone) : 0x92998d });
          rocks.push({ x: x + 0.3, y: 0.15, z: z + 0.2, sx: 0.25, sy: 0.24, sz: 0.25, ry: -turn, color: resource.stone ? stoneColor(resource.stone) : 0xa8ad9c });
        } else {
          bushes.push({ x, y: 0.3, z, sx: 0.44, sy: 0.39, sz: 0.4, ry: turn, color: 0x697b55 });
          for (let i = 0; i < 5; i++) {
            const angle = i * 2.4 + turn;
            berries.push({ x: x + Math.sin(angle) * 0.25, y: 0.42 + (i % 2) * 0.09, z: z + Math.cos(angle) * 0.25 });
          }
        }
        parts.forEach((items, i) => { for (let j = lengths[i]!; j < items.length; j++) items[j]!.key = i === 5 ? -resource.id : resource.id; });
      }
      for (const trunk of trunks) trunk.color = 0x70573e;
      for (const berry of berries) berry.color = 0xb96f63;
      mergedInstances(group, [
        { geometry: new THREE.CylinderGeometry(0.1, 0.16, 1, 5), items: trunks },
        { geometry: new THREE.DodecahedronGeometry(1, 0), items: rocks },
        { geometry: new THREE.IcosahedronGeometry(1, 0), items: bushes },
        { geometry: new THREE.IcosahedronGeometry(0.055, 0), items: berries },
      ], this.staticMaterial);
      const canopy = mergedInstances(group, [{ geometry: new THREE.ConeGeometry(1, 1, 6), items: [...crowns, ...upperCrowns] }], this.staticMaterial);
      if (canopy) { canopy.name = 'tree-canopy'; canopy.visible = this.foliageVisible; }
      retainResources(group, new Set(chunk.flatMap(r => r.kind === 'berries' && harvestable(world,r) ? [r.id,-r.id] : [r.id])));
      this.chunks.set(key, { signature, group, identities: new Map(chunk.map(r => [r.id, `${r.kind}:${r.x}:${r.z}:${r.stone ?? ""}`])) });
    }
  }

}
