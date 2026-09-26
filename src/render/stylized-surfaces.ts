import * as THREE from 'three/webgpu';

const SIZE = 64;

function smoothstep(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function hash(x: number, y: number): number {
  let n = Math.imul(x + 19, 0x1f123bb5) ^ Math.imul(y + 47, 0x5f356495);
  n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d);
  return ((n ^ (n >>> 12)) >>> 0) / 0xffffffff;
}

function broadNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const tx = smoothstep(x - ix), ty = smoothstep(y - iy);
  const a = hash(ix, iy) * (1 - tx) + hash(ix + 1, iy) * tx;
  const b = hash(ix, iy + 1) * (1 - tx) + hash(ix + 1, iy + 1) * tx;
  return a * (1 - ty) + b * ty;
}

function paintedVegetation(u: number, v: number): number {
  // Two broad, wandering pigment deposits wrap across several low-poly
  // facets. They leave large light planes between them; tiny foliage pieces
  // inherit the same shapes through their mip levels rather than fine noise.
  const warp = (broadNoise(u * 2 + 4.1, v * 2 + 8.3) - 0.5) * 0.10;
  const ax = (u - 0.24 + warp) / 0.47, ay = (v - 0.37 - warp) / 0.39;
  const first = 1 - smoothstep((Math.hypot(ax + ay * 0.15, ay - ax * 0.13) - 0.66) / 0.30);
  const bx = (u - 0.76 - warp) / 0.42, by = (v - 0.76 + warp) / 0.34;
  const second = 1 - smoothstep((Math.hypot(bx - by * 0.18, by + bx * 0.11) - 0.65) / 0.31);
  const light = 1 - smoothstep((Math.hypot((u - 0.8) / 0.28, (v - 0.18) / 0.23) - 0.62) / 0.28);
  const wash = broadNoise(u * 1.7 + 1.8, v * 2.1 + 5.3);
  return Math.max(132, Math.min(255, Math.round((250 - first * 75 - second * 59 + light * 9 - wash * 14) / 11) * 11));
}

/** Original, low-frequency pigment patches for resident static surfaces.
 * White remains the base colour; charcoal fields and soft, stepped edges
 * give tables, machinery and panel faces broad painted variation. No game
 * random state, canvas, worker, or per-frame texture generation is involved.
 * The vegetation variant has larger, stronger tonal planes so its patches
 * remain legible across the narrow UV wedges of low-poly trees. The caller
 * owns and disposes the returned texture. */
export function createStylizedSurfaceTexture(style: 'surface' | 'vegetation' = 'surface'): THREE.DataTexture {
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const u = (x + 0.5) / SIZE, v = (y + 0.5) / SIZE;
    let value: number;
    if (style === 'vegetation') value = paintedVegetation(u, v);
    else {
      const cloud = broadNoise(u * 2.6 + 0.2, v * 2.8 + 0.4);
      const wash = broadNoise(u * 4.2 + 7.3, v * 3.6 + 11.8);
      const dx = (u - 0.24) / 0.35, dy = (v - 0.28) / 0.29;
      const firstPatch = 1 - smoothstep((Math.hypot(dx + dy * 0.19, dy - dx * 0.13) - 0.66) / 0.48);
      const ex = (u - 0.78) / 0.31, ey = (v - 0.72) / 0.39;
      const secondPatch = 1 - smoothstep((Math.hypot(ex - ey * 0.15, ey + ex * 0.12) - 0.62) / 0.51);
      // A few large overlapping regions form tonal planes. Quantising their
      // levels keeps the surface illustrative without a repeated stripe/grid.
      const pigment = 246 - cloud * 22 - wash * 10 - firstPatch * 24 + secondPatch * 12;
      value = Math.max(178, Math.min(255, Math.round(pigment / 7) * 7));
    }
    const at = (y * SIZE + x) * 4;
    data[at] = data[at + 1] = data[at + 2] = value;
    data[at + 3] = 255;
  }
  const map = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  return map;
}
