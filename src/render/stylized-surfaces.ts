import * as THREE from 'three/webgpu';

const SIZE = 64;
const STONE_SIZE = 256;

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

function stoneNoise(u: number, v: number, frequency: number, salt: number): number {
  const x = u * frequency, y = v * frequency;
  const ix = Math.floor(x), iy = Math.floor(y);
  const tx = smoothstep(x - ix), ty = smoothstep(y - iy);
  const sample = (sx: number, sy: number): number => hash((sx % frequency + frequency) % frequency + salt, (sy % frequency + frequency) % frequency - salt);
  const a = sample(ix, iy) * (1 - tx) + sample(ix + 1, iy) * tx;
  const b = sample(ix, iy + 1) * (1 - tx) + sample(ix + 1, iy + 1) * tx;
  return a * (1 - ty) + b * ty;
}

function paintedStone(u: number, v: number): [number, number, number] {
  // Seamless, warped fields make fractured mineral washes rather than the
  // two round deposits that became obvious on a cliff seen from above.
  const warpedU = u + (stoneNoise(u, v, 3, 17) - 0.5) * 0.13 + (stoneNoise(u, v, 9, 29) - 0.5) * 0.035;
  const warpedV = v + (stoneNoise(u, v, 4, 43) - 0.5) * 0.12 + (stoneNoise(u, v, 8, 59) - 0.5) * 0.035;
  const warmField = stoneNoise(warpedU, warpedV, 5, 71) * 0.48
    + stoneNoise(warpedU, warpedV, 11, 83) * 0.31
    + stoneNoise(warpedU, warpedV, 19, 97) * 0.21;
  const coolField = stoneNoise(warpedU, warpedV, 4, 109) * 0.51
    + stoneNoise(warpedU, warpedV, 9, 127) * 0.32
    + stoneNoise(warpedU, warpedV, 17, 149) * 0.17;
  const warm = smoothstep((warmField - 0.40) / 0.26);
  const cool = smoothstep((coolField - 0.44) / 0.24);
  const grain = (stoneNoise(u, v, 31, 163) - 0.5) * 10;
  const base = 249 - warm * 78 - cool * 61 + grain;
  const level = (value: number): number => Math.max(128, Math.min(255, Math.round(value / 7) * 7));
  return [level(base + warm * 16), level(base + warm * 3 + cool * 6), level(base - warm * 9 + cool * 17)];
}

/** Original, low-frequency pigment patches for resident static surfaces.
 * White remains the base colour; charcoal fields and soft, stepped edges
 * give tables, machinery and panel faces broad painted variation. No game
 * random state, canvas, worker, or per-frame texture generation is involved.
 * The vegetation variant has larger, stronger tonal planes so its patches
 * remain legible across the narrow UV wedges of low-poly trees. The caller
 * owns and disposes the returned texture. */
export function createStylizedSurfaceTexture(style: 'surface' | 'vegetation' | 'stone' = 'surface'): THREE.DataTexture {
  const size = style === 'stone' ? STONE_SIZE : SIZE;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x + 0.5) / size, v = (y + 0.5) / size;
    let value: number;
    if (style === 'stone') {
      const [red, green, blue] = paintedStone(u, v);
      const at = (y * size + x) * 4;
      data[at] = red; data[at + 1] = green; data[at + 2] = blue; data[at + 3] = 255;
      continue;
    } else if (style === 'vegetation') value = paintedVegetation(u, v);
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
    const at = (y * size + x) * 4;
    data[at] = data[at + 1] = data[at + 2] = value;
    data[at + 3] = 255;
  }
  if (style === 'stone') {
    // Match the sampled texel centres on opposing borders as well as the
    // continuous underlying pattern. Bilinear repetition then has no seam.
    for (let y = 0; y < size; y++) for (let channel = 0; channel < 3; channel++) {
      const first = (y * size) * 4 + channel, last = (y * size + size - 1) * 4 + channel;
      data[first] = data[last] = Math.round((data[first]! + data[last]!) / 2);
    }
    for (let x = 0; x < size; x++) for (let channel = 0; channel < 3; channel++) {
      const first = x * 4 + channel, last = ((size - 1) * size + x) * 4 + channel;
      data[first] = data[last] = Math.round((data[first]! + data[last]!) / 2);
    }
  }
  const map = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  map.wrapS = map.wrapT = style === 'stone' ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  return map;
}
