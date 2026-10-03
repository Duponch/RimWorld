import * as THREE from 'three/webgpu';

const SIZE = 128;
let shared: THREE.DataTexture | undefined;
let owners = 0;

function grain(x: number, y: number): number {
  let n = Math.imul(x + 29, 0x1f123bb5) ^ Math.imul(y + 17, 0x5f356495);
  n = Math.imul(n ^ n >>> 15, 0x2c1b3c6d);
  return ((n ^ n >>> 12) >>> 0) / 4294967296;
}

/** Curved brush paths, layered into the finished bitmap once. The fire still
 * uses one surface and one sample; no paint meshes or animation-time drawing. */
function drawFirePaint(): THREE.DataTexture {
  const pixels = new Uint8Array(SIZE * SIZE * 4);
  const strokes = [
    [.10, .32, .18, .048, .86, .74, .12, .008, .76],
    [.25, .08, .31, .084, .76, 1, .95, .47, .81],
    [.44, .71, .49, .057, .97, .83, .13, .006, .70],
    [.62, .43, .67, .078, .84, 1, .93, .36, .84],
    [.84, .96, .87, .048, .93, .68, .11, .006, .73],
    [.07, .15, .11, .022, .61, 1, .99, .72, .73],
    [.38, .29, .35, .026, .71, 1, .99, .75, .72],
    [.75, .59, .73, .024, .65, 1, .98, .70, .78],
  ] as const;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const u = x / (SIZE - 1), v = y / (SIZE - 1);
    const dust = grain(x, y), wash = grain(Math.floor(x / 7), Math.floor(y / 9));
    const pigment = .92 + (dust - .5) * .13 + (wash - .5) * .12;
    let r = pigment, g = (.71 * (1 - v) + .14 * v) * pigment, b = (.08 * (1 - v) + .015 * v) * pigment;
    for (const [start, control, end, width, height, red, green, blue, opacity] of strokes) {
      if (v > height) continue;
      const t = v / height, one = 1 - t;
      const centre = one * one * start + 2 * one * t * control + t * t * end;
      const roughWidth = width * (.46 + .54 * Math.sin(Math.PI * t)) * (.85 + grain(x >> 1, y >> 2) * .25);
      const distance = Math.abs(u - centre);
      const coverage = Math.max(0, 1 - distance / roughWidth);
      // Uneven bristle tracks and dry pigment gaps are part of this drawing.
      const bristle = .64 + grain(Math.floor((u - centre) * 500), y >> 3) * .36;
      const alpha = coverage * opacity * bristle * (.72 + dust * .28);
      r += (red * pigment - r) * alpha;
      g += (green * pigment - g) * alpha;
      b += (blue * pigment - b) * alpha;
    }
    const index = (y * SIZE + x) * 4;
    pixels[index] = Math.round(Math.min(1, Math.max(0, r)) * 255);
    pixels[index + 1] = Math.round(Math.min(1, Math.max(0, g)) * 255);
    pixels[index + 2] = Math.round(Math.min(1, Math.max(0, b)) * 255);
    pixels[index + 3] = 255;
  }
  const map = new THREE.DataTexture(pixels, SIZE, SIZE, THREE.RGBAFormat);
  map.name = 'Fire — baked curved brushstrokes and dry chalk pigment';
  map.wrapS = THREE.RepeatWrapping;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  return map;
}

export function acquireFirePaint(): THREE.DataTexture {
  shared ??= drawFirePaint();
  owners++;
  return shared;
}

export function releaseFirePaint(): void {
  if (--owners === 0) { shared?.dispose(); shared = undefined; }
}
