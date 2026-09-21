import * as THREE from 'three/webgpu';
import type { Placement } from './primitives';
const scratchColor = new THREE.Color();

export interface ResourceRange { id:number;start:number;count:number;vertexStart:number;vertexCount:number }
export interface ResourceRangeData {
  ranges:ResourceRange[];
  original:Uint16Array|Uint32Array;
  originalPositions:Float32Array;
}

export function noise(x: number, z: number, salt = 0): number {
  let value = Math.imul(x + 1, 374761393) ^ Math.imul(z + 1, 668265263) ^ Math.imul(salt + 1, 1274126177);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

/** Static chunk meshes batch different procedural shapes together. Their exact
 * per-cell silhouettes and colors stay intact; only submissions are combined.
 * Dynamic pawns and cargo remain GPU-instanced and are never baked here.
 */
export function mergedInstances(group: THREE.Group, parts: { geometry: THREE.BufferGeometry; items: Placement[] }[], mat: THREE.Material, shadows = true): THREE.Mesh | undefined {
  const vertexCount = parts.reduce((sum, part) => sum + part.geometry.getAttribute('position').count * part.items.length, 0);
  const indexCount = parts.reduce((sum, part) => sum + (part.geometry.index?.count ?? part.geometry.getAttribute('position').count) * part.items.length, 0);
  if (!vertexCount) { for (const part of parts) part.geometry.dispose(); if (!mat.userData.rendererOwned) mat.dispose(); return; }
  const positions = new Float32Array(vertexCount * 3), normals = new Float32Array(vertexCount * 3), colors = new Float32Array(vertexCount * 3);
  const indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
  let vertex = 0, index = 0;
  const ranges:ResourceRange[] = [];
  for (const { geometry, items } of parts) {
    const pos = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
    for (const item of items) {
      const firstIndex = index,firstVertex=vertex;
      const sx = item.sx ?? 1, sy = item.sy ?? 1, sz = item.sz ?? 1;
      const cosine = Math.cos(item.ry ?? 0), sine = Math.sin(item.ry ?? 0);
      scratchColor.setHex(item.color ?? 0xffffff);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) * sx, z = pos.getZ(i) * sz;
        const nx = normal.getX(i) / sx, ny = normal.getY(i) / sy, nz = normal.getZ(i) / sz;
        const length = Math.hypot(nx, ny, nz), offset = (vertex + i) * 3;
        positions[offset] = item.x + x * cosine + z * sine;
        positions[offset + 1] = item.y + pos.getY(i) * sy;
        positions[offset + 2] = item.z + z * cosine - x * sine;
        normals[offset] = (nx * cosine + nz * sine) / length;
        normals[offset + 1] = ny / length;
        normals[offset + 2] = (nz * cosine - nx * sine) / length;
        colors[offset] = scratchColor.r; colors[offset + 1] = scratchColor.g; colors[offset + 2] = scratchColor.b;
      }
      for (let i = 0; i < (geometry.index?.count ?? pos.count); i++) indices[index++] = vertex + (geometry.index?.getX(i) ?? i);
      if (item.key !== undefined) ranges.push({id:item.key,start:firstIndex,count:index-firstIndex,vertexStart:firstVertex,vertexCount:pos.count});
      vertex += pos.count;
    }
    geometry.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = shadows; mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  if (ranges.length) mesh.userData.resourceRanges = {ranges,original:indices.slice(),originalPositions:positions.slice()} satisfies ResourceRangeData;
  group.add(mesh);
  return mesh;
}
