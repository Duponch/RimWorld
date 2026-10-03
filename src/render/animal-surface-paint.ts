import * as THREE from 'three/webgpu';
import { attribute, texture } from 'three/tsl';

export type AnimalCoat = 'soft' | 'short' | 'shaggy';
const SIZE = 256;

function hash(index: number, salt: number): number {
  let value = Math.imul(index + 31, 0x1f123bb5) ^ Math.imul(salt + 73, 0x5f356495);
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  return ((value ^ (value >>> 12)) >>> 0) / 0xffffffff;
}

function smooth(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function wash(x: number, y: number, cells: number, salt: number): number {
  const px = x / SIZE * cells, py = y / SIZE * cells;
  const ix = Math.floor(px), iy = Math.floor(py), tx = smooth(px - ix), ty = smooth(py - iy);
  const sample = (a: number, b: number): number => hash(((a + cells) % cells) + ((b + cells) % cells) * cells, salt);
  return (sample(ix, iy) * (1 - tx) + sample(ix + 1, iy) * tx) * (1 - ty)
    + (sample(ix, iy + 1) * (1 - tx) + sample(ix + 1, iy + 1) * tx) * ty;
}

/** Paint a tapered curved mark into the existing colour sample. Rasterisation
 * wraps at tile edges, so neither a repeated border nor a square patch appears.
 * This is construction-time work; there is no stroke node in the shader. */
function curve(field: Float32Array, x: number, y: number, length: number, bend: number, angle: number, width: number, pigment: number, salt: number): void {
  const c = Math.cos(angle), s = Math.sin(angle), steps = Math.ceil(length * 1.5);
  for (let step = 0; step <= steps; step++) {
    const t = step / steps, across = bend * 4 * t * (1 - t), along = (t - .5) * length;
    const cx = x + along * c - across * s, cy = y + along * s + across * c;
    const taper = .28 + .72 * Math.sin(Math.PI * t);
    const radius = width * taper, bound = Math.ceil(radius + 1);
    for (let iy = Math.floor(cy) - bound; iy <= Math.floor(cy) + bound; iy++) {
      for (let ix = Math.floor(cx) - bound; ix <= Math.floor(cx) + bound; ix++) {
        const coverage = 1 - smooth((Math.hypot(ix + .5 - cx, iy + .5 - cy) - radius * .35) / Math.max(.7, radius * .8));
        if (coverage <= 0) continue;
        const wrappedX = (ix % SIZE + SIZE) % SIZE, wrappedY = (iy % SIZE + SIZE) % SIZE;
        const at = wrappedY * SIZE + wrappedX;
        // Dry pastel leaves broken edges and small gaps within the stroke.
        const chalk = .55 + hash(wrappedX + wrappedY * SIZE, salt) * .45;
        const target = pigment + (hash(wrappedX + wrappedY * SIZE, salt + 19) - .5) * 12;
        field[at] = field[at]! + (target - field[at]!) * coverage * chalk * .42;
      }
    }
  }
}

/** Three shared original coats retain each species' vertex hues. Short curved
 * hairs suit deer/gazelle, soft tufts the hares, and open woolly hooks with
 * longer hanging fibres the muffalo/dromedary. No regular rows or spots. */
export function createAnimalCoatTexture(coat: AnimalCoat): THREE.DataTexture {
  const field = new Float32Array(SIZE * SIZE), salt = coat === 'soft' ? 41 : coat === 'short' ? 89 : 137;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    field[y * SIZE + x] = 233 + (wash(x, y, 3, salt) - .5) * 23
      + (wash(x, y, 7, salt + 13) - .5) * 11 + (hash(x + y * SIZE, salt) - .5) * 9;
  }
  const count = coat === 'shaggy' ? 190 : coat === 'soft' ? 260 : 330;
  for (let i = 0; i < count; i++) {
    const x = hash(i, salt + 1) * SIZE, y = hash(i, salt + 2) * SIZE;
    const length = coat === 'shaggy' ? 24 + hash(i, salt + 3) * 28
      : coat === 'soft' ? 13 + hash(i, salt + 3) * 17 : 9 + hash(i, salt + 3) * 14;
    const angle = coat === 'short' ? -.5 + hash(i, salt + 4) * .8
      : coat === 'soft' ? -.85 + hash(i, salt + 4) * 1.45 : -1.85 + hash(i, salt + 4) * .9;
    const bend = (coat === 'shaggy' ? 4 + hash(i, salt + 5) * 9 : 1.3 + hash(i, salt + 5) * 3.2)
      * (hash(i, salt + 6) > .5 ? 1 : -1);
    const width = coat === 'shaggy' ? 1.8 + hash(i, salt + 7) * 1.2 : 1.1 + hash(i, salt + 7) * .7;
    // A bright rubbed edge beside the shadow makes individual tufts legible,
    // while the grayscale pigment preserves blue, cream and ochre identities.
    curve(field, x - Math.sin(angle) * 1.8, y + Math.cos(angle) * 1.8,
      length * .92, bend, angle, width * 1.1, 254, salt + 11);
    curve(field, x, y, length, bend, angle, width, 137 + hash(i, salt + 8) * 32, salt + 17);
    if (coat === 'shaggy' && i % 3 === 0) {
      curve(field, x + 3, y - 2, length * .53, -bend * .7, angle - .38, width * .7, 167, salt + 23);
    }
  }
  const bytes = new Uint8Array(SIZE * SIZE * 4);
  for (let i = 0; i < field.length; i++) {
    const pigment = Math.max(128, Math.min(255, Math.round(field[i]!)));
    bytes[i * 4] = bytes[i * 4 + 1] = bytes[i * 4 + 2] = pigment;
    bytes[i * 4 + 3] = 255;
  }
  const map = new THREE.DataTexture(bytes, SIZE, SIZE, THREE.RGBAFormat);
  map.name = `Pastel animal coat — ${coat}`;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.magFilter = THREE.LinearFilter;
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.generateMipmaps = true;
  map.needsUpdate = true;
  return map;
}

export function animalCoat(species: string): AnimalCoat {
  return species === 'hare' || species === 'snow-hare' ? 'soft'
    : species === 'muffalo' || species === 'dromedary' ? 'shaggy' : 'short';
}

/** Bake metric face coordinates before the GPU rig. Both axes use the same
 * physical scale, including sloped neck/back facets; the coat therefore does
 * not stretch over a tall ear or a long flank, or slide when an actor moves.
 * One static vec2 belongs to the shared species model, never to each animal. */
export function bakeAnimalCoatCoordinates(geometry: THREE.BufferGeometry, species: string): void {
  const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
  const coordinates = new Float32Array(positions.count * 2);
  const tile = species === 'hare' || species === 'snow-hare' ? .32 : species === 'gazelle' ? .68 : 1.05;
  for (let i = 0; i < positions.count; i++) {
    const nx = normals.getX(i), ny = normals.getY(i), nz = normals.getZ(i);
    // The body's length supplies U, except on the end caps where it would
    // collapse to a point. Project into the actual plane, then normalise.
    const end = Math.abs(nz) > .9;
    let ux = end ? 1 - nx * nx : -nz * nx;
    let uy = end ? -nx * ny : -nz * ny;
    let uz = end ? -nx * nz : 1 - nz * nz;
    const magnitude = Math.hypot(ux, uy, uz) || 1;
    ux /= magnitude; uy /= magnitude; uz /= magnitude;
    let vx = uy * nz - uz * ny, vy = uz * nx - ux * nz, vz = ux * ny - uy * nx;
    if (Math.abs(vy) > .1 ? vy < 0 : vx < 0) { vx = -vx; vy = -vy; vz = -vz; }
    const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
    coordinates[i * 2] = (x * ux + y * uy + z * uz) / tile + .37;
    coordinates[i * 2 + 1] = (x * vx + y * vy + z * vz) / tile + .19;
  }
  geometry.setAttribute('animalPaintUv', new THREE.BufferAttribute(coordinates, 2));
}

/** Replaces the old wash's single sample, with enough contrast for close zoom.
 * The plain material never references this graph or any pigment texture. */
export function animalCoatShade(map: THREE.Texture) {
  return texture(map, attribute('animalPaintUv', 'vec2')).r.mul(.8).add(.28);
}
