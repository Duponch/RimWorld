import * as THREE from 'three/webgpu';
import type { World } from '../sim/types';
import type { BoxBatches } from './BoxBatches';
import { WORLD_SCALE } from '../world/scale';

type RoofCell = { x: number; z: number };
type Point = readonly [number, number, number];

/** Include roofed supports and corner posts in the slab, using only the
 * authoritative constructed cells as the adjacency source. */
export function roofSurfaceCells(world: World): RoofCell[] {
  const width = world.width, height = world.height;
  const built = new Set(world.roofing?.constructed ?? []), cells = new Set(built);
  if (!built.size) return [];
  for (const s of world.structures) {
    if (s.kind !== 'wall' && s.kind !== 'door') continue;
    let near = false;
    for (let dz = -1; dz <= 1 && !near; dz++) for (let dx = -1; dx <= 1; dx++) {
      const x = s.x + dx, z = s.z + dz;
      if (x >= 0 && x < width && z >= 0 && z < height && built.has(z * width + x)) { near = true; break; }
    }
    if (near) cells.add(s.z * width + s.x);
  }
  return [...cells].sort((a, b) => a - b).map(i => ({ x: i % width, z: Math.floor(i / width) }));
}

/** One continuous upper plane. Interior tile boundaries have no sides,
 * bevels, elevation changes or material splits. Only the outer contour drops
 * into a thick, lightly overhanging fascia. */
export function roofSlabGeometry(cells: readonly RoofCell[], top: number): THREE.BufferGeometry {
  const positions: number[] = [], normals: number[] = [], colors: number[] = [], uvs: number[] = [];
  const present = new Set(cells.map(c => `${c.x}:${c.z}`));
  const has = (x: number, z: number) => present.has(`${x}:${z}`);
  const bottom = top - .31, overhang = .065, tint = new THREE.Color();
  function triangle(a: Point, b: Point, c: Point, normal: Point, shade: number): void {
    const cross = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2])
      .cross(new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]));
    const vertices = cross.dot(new THREE.Vector3(...normal)) >= 0 ? [a, b, c] : [a, c, b];
    tint.setHex(shade);
    for (const p of vertices) {
      positions.push(...p); normals.push(...normal); colors.push(tint.r, tint.g, tint.b);
      // World-space UVs continue across all formerly separate roof cells.
      uvs.push(p[0] / 8, p[2] / 8);
    }
  }
  for (const { x, z } of cells) {
    const w = x - .5 - (!has(x - 1, z) ? overhang : 0);
    const e = x + .5 + (!has(x + 1, z) ? overhang : 0);
    const s = z - .5 - (!has(x, z - 1) ? overhang : 0);
    const n = z + .5 + (!has(x, z + 1) ? overhang : 0);
    const sw: Point = [w, top, s], se: Point = [e, top, s];
    const ne: Point = [e, top, n], nw: Point = [w, top, n];
    triangle(sw, ne, se, [0, 1, 0], 0xe6bc83);
    triangle(sw, nw, ne, [0, 1, 0], 0xe6bc83);
    const underSW:Point=[w,bottom,s],underSE:Point=[e,bottom,s];
    const underNE:Point=[e,bottom,n],underNW:Point=[w,bottom,n];
    triangle(underSW,underSE,underNE,[0,-1,0],0x806044);
    triangle(underSW,underNE,underNW,[0,-1,0],0x806044);
    const edges: Array<{ exposed: boolean; a: Point; b: Point; normal: Point }> = [
      { exposed: !has(x, z - 1), a: sw, b: se, normal: [0, 0, -1] },
      { exposed: !has(x + 1, z), a: se, b: ne, normal: [1, 0, 0] },
      { exposed: !has(x, z + 1), a: ne, b: nw, normal: [0, 0, 1] },
      { exposed: !has(x - 1, z), a: nw, b: sw, normal: [-1, 0, 0] },
    ];
    for (const edge of edges) {
      if (!edge.exposed) continue;
      const belowA: Point = [edge.a[0], bottom, edge.a[2]];
      const belowB: Point = [edge.b[0], bottom, edge.b[2]];
      triangle(edge.a, edge.b, belowB, edge.normal, 0xa77b4e);
      triangle(edge.a, belowB, belowA, edge.normal, 0xa77b4e);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeBoundingSphere();
  return geometry;
}

/** Broad, irregular painted shade zones and a subordinate wood figure. */
function roofPaint(): THREE.DataTexture {
  const size = 128, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const patchX = Math.floor((x + 5 * Math.sin(y * .071)) / 23);
    const patchY = Math.floor((y + 8 * Math.sin(x * .052)) / 19);
    const hash = ((patchX * 73856093) ^ (patchY * 19349663)) >>> 0;
    const zone = (hash % 5 - 2) * 11;
    const sweep = Math.sin(x * .075 + y * .026) * 11 + Math.sin(y * .12) * 6;
    const grain = Math.sin(y * .59 + Math.sin(x * .11) * 2) * 3;
    const value = Math.max(160, Math.min(255, Math.round(225 + zone + sweep + grain)));
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = value; data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export class RoofLayer {
  readonly surface = new THREE.Group();
  readonly areas = new THREE.Group();
  readonly paint = roofPaint();
  readonly textured = new THREE.MeshStandardNodeMaterial({ color: 0xffffff, roughness: .94, metalness: 0, flatShading: true, vertexColors: true, map: this.paint });
  readonly plain = new THREE.MeshStandardNodeMaterial({ color: 0xffffff, roughness: .94, metalness: 0, flatShading: true, vertexColors: true });
  readonly mesh: THREE.Mesh;
  private surfaceKey = '';
  private areaKey = '';
  private texturesEnabled = true;
  constructor(configure?: (material: THREE.MeshStandardNodeMaterial) => void) {
    for (const mat of [this.textured, this.plain]) { configure?.(mat); mat.userData.rendererOwned = true; }
    this.mesh = new THREE.Mesh(roofSlabGeometry([], WORLD_SCALE.wallHeight + .08), this.textured);
    this.mesh.name = 'continuous-constructed-roof';
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    this.mesh.visible = false; this.surface.add(this.mesh);
    this.surface.visible = this.areas.visible = false;
  }
  setTexturesEnabled(enabled: boolean): void {
    if (this.texturesEnabled === enabled) return;
    this.texturesEnabled = enabled;
    this.mesh.material = enabled ? this.textured : this.plain;
  }
  update(world: World, batches: BoxBatches, cutaway = false, reset = false): void {
    const state = world.roofing;
    const supports = world.structures.filter(s => s.kind === 'wall' || s.kind === 'door')
      .map(s => `${s.kind}:${s.x}:${s.z}`).join(',');
    const key = `${world.width}|${cutaway}|${state?.constructed.join(',')}|${supports}`;
    if (reset || this.surfaceKey !== key) {
      this.surfaceKey = key;
      const cells = roofSurfaceCells(world);
      const top = (cutaway ? WORLD_SCALE.wallCutawayHeight : WORLD_SCALE.wallHeight) + .08;
      const old = this.mesh.geometry;
      this.mesh.geometry = roofSlabGeometry(cells, top);
      old.dispose(); this.mesh.visible = cells.length > 0;
    }
    const areaKey=`${world.width}|${state?.build.join(',')}|${state?.remove.join(',')}`;
    if(reset||this.areaKey!==areaKey){
      this.areaKey=areaKey;
      batches.set(this.areas, 'roof-areas', [
        ...(state?.build ?? []).map(i => ({ i, color: 0x7abca0 })),
        ...(state?.remove ?? []).map(i => ({ i, color: 0xd49d79 })),
      ].map(({ i, color }) => ({ x: i % world.width, z: Math.floor(i / world.width), y: .054, sx: .98, sz: .98, sy: .012, color })), 'overlay', false);
    }
  }
  prepare(): () => void {
    const surface = this.surface.visible, areas = this.areas.visible;
    const empty = this.mesh.geometry.getAttribute('position').count === 0;
    const original = this.mesh.geometry;
    let warm:THREE.BufferGeometry|undefined;
    if (empty) {
      warm=roofSlabGeometry([{ x: 0, z: 0 }], WORLD_SCALE.wallHeight + .08);
      this.mesh.geometry = warm;
      this.mesh.visible = true;
    }
    this.surface.visible = this.areas.visible = true;
    return () => {
      if (warm) {
        if(this.mesh.geometry===warm){warm.dispose();this.mesh.geometry=original;this.mesh.visible=false;}
        else original.dispose(); // A newer world replaced and disposed warm.
      }
      this.surface.visible = surface; this.areas.visible = areas;
    };
  }
  dispose(): void {
    this.surface.remove(this.mesh); this.mesh.geometry.dispose();
    this.textured.dispose(); this.plain.dispose(); this.paint.dispose();
  }
}
