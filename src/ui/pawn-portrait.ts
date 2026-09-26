import * as THREE from 'three/webgpu';
import { pawnGeometry } from '../render/pawn-geometry';
import { BODY_PROPORTIONS, appearanceShape } from '../render/pawn-appearance-shape';
import type { apparelAppearance } from '../render/character-apparel';
import type { PawnAppearance } from '../sim/pawn-appearance';
import { weaponVisual } from '../render/weapon-shape';

type ApparelLook = ReturnType<typeof apparelAppearance>;
type Vertex = readonly [number, number, number];
type Face = { points: readonly [Vertex, Vertex, Vertex, Vertex]; normal: Vertex; color: number; bone: number; dye: number };
const CACHE_LIMIT = 256;
const cache = new Map<string, string>();
let sourceFaces: Face[] | undefined;

// A fixed orthographic view of the actual authored pawn mesh. Extract once;
// changing a 3D hair, beard, head or garment part changes the portrait too.
function faces(): readonly Face[] {
  if (sourceFaces) return sourceFaces;
  const geometry = pawnGeometry();
  const pos = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
  const color = geometry.getAttribute('color'), bone = geometry.getAttribute('boneId'), dye = geometry.getAttribute('dye');
  const result: Face[] = [];
  // Each box face is two triangles with vertices (a,b,d) and (b,c,d).
  // Emit its one actual quad: fewer SVG elements and half the projection work.
  for (let i = 0; i < pos.count; i += 6) {
    const points = [0, 1, 4, 2].map(j => [pos.getX(i + j), pos.getY(i + j), pos.getZ(i + j)] as Vertex);
    const linear = new THREE.Color().setRGB(color.getX(i), color.getY(i), color.getZ(i));
    result.push({ points: points as [Vertex, Vertex, Vertex, Vertex],
      normal: [normal.getX(i), normal.getY(i), normal.getZ(i)],
      color: linear.getHex(), bone: bone.getX(i), dye: dye.getX(i) });
  }
  geometry.dispose();
  sourceFaces = result;
  return result;
}

function visible(face: Face, variant: readonly [number, number, number, number], look: ApparelLook, weaponDye: number | undefined): boolean {
  const dye = face.dye;
  if (dye >= 200) return !!(variant[3] & (1 << (dye - 200)));
  if (dye >= 100) return !!(variant[2] & (1 << (dye - 100)));
  if (dye === -2) return look.vest;
  if (dye === -3) return look.silhouette === 2 || look.silhouette === 3;
  if (dye === -6) return look.silhouette === 4;
  if (dye === -1 || dye === -4 || dye === -5) return dye === weaponDye;
  return dye >= 0;
}

function colorOf(face: Face, appearance: PawnAppearance, look: ApparelLook): number {
  if (face.dye >= 100) return appearance.hairColor;
  if (face.dye === 2 || look.silhouette === 2 && (face.bone === 2 || face.bone === 3)) return appearance.skinColor;
  if (face.dye === 1 || face.dye === -3 || face.dye === -6) return look.color ?? 0x789082;
  if (face.bone >= 4 && look.pants) return [0, 0xd8c8a2, 0xad8a61, 0xa88b63, 0x839ac5, 0xc3a375][look.pants] ?? face.color;
  return face.color;
}

/** Mirrors the V109 vertex morph at rest; pose and world translation are zero. */
function morph(point: Vertex, bone: number, variant: readonly [number, number, number, number]): Vertex {
  const [x, y, z] = point;
  if (bone === 1) {
    const head = variant[1], jaw = head % 3;
    const width = (head % 6 >= 3 ? .87 : 1) * (head >= 6 ? .97 : 1)
      * (y < 1.18 ? jaw === 1 ? .84 : jaw === 2 ? 1.12 : 1 : 1);
    return [x * width, y, z];
  }
  const [shoulder, waist, hip, depth] = BODY_PROPORTIONS[variant[0]]!;
  const torso = waist + (shoulder - waist) * Math.max(0, Math.min(1, (y - .76) / .20));
  const factor = bone >= 4 ? hip : bone >= 2 ? shoulder : torso;
  return [x * factor, y, z * depth];
}

/** The portrait projects the same weapon parts at the shader's resting pose.
 * No extra scene or animated portrait render is created. */
function posedPoint(point: Vertex, bone: number, variant: readonly [number, number, number, number], dye: number): Vertex {
  if (dye === -4) {
    const along = point[1] - .68, across = point[0] - .205, depth = point[2];
    return [.13 + across + .30 * along, .84 + .78 * along + .12 * depth, .25 + .8 * depth];
  }
  if (dye === -1 || dye === -5) {
    const along = point[1] - .68, across = point[0] - .205, depth = point[2];
    return [.32 + across, .67 + .82 * along, .17 + depth];
  }
  return morph(point, bone, variant);
}

function posedNormal(normal: Vertex, dye: number): Vertex {
  let [x, y, z] = normal;
  if (dye === -4) {
    y = (y - .30 * x) / .78;
    z = (z - .12 * y) / .8;
  } else if (dye === -1 || dye === -5) y /= .82;
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

const yaw = .24, pitch = .18;
const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
const eye: Vertex = [sy * cp, sp, cy * cp];
function project(point: Vertex): readonly [number, number, number] {
  const [x, y, z] = point;
  const depth = x * eye[0] + y * eye[1] + z * eye[2];
  return [48 + (x * cy - z * sy) * 91, 9 + (1.52 - (y * cp - (x * sy + z * cy) * sp)) * 89, depth];
}
const round = (n: number) => Number(n.toFixed(2));
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

function makeSvg(appearance: PawnAppearance, look: ApparelLook, weaponItem: string | undefined): string {
  const variant = appearanceShape(appearance);
  const weaponDye = weaponVisual(weaponItem)?.dye;
  const polygons: { z: number; art: string }[] = [];
  const shaded = new Map<string, string>();
  for (const face of faces()) {
    if (!visible(face, variant, look, weaponDye)) continue;
    const placed = face.points.map(p => posedPoint(p, face.bone, variant, face.dye));
    if (placed.every(p => p[1] < .54)) continue;
    const normal = posedNormal(face.normal, face.dye);
    const dot = normal[0] * eye[0] + normal[1] * eye[1] + normal[2] * eye[2];
    if (dot <= 0) continue;
    const points = placed.map(project);
    const light = .76 + .24 * Math.max(0, normal[0] * .3 + normal[1] * .65 + normal[2] * .75);
    const base = colorOf(face, appearance, look);
    const key = `${base}|${round(light)}`;
    let fill = shaded.get(key);
    if (!fill) { fill = '#' + new THREE.Color(base).multiplyScalar(light).getHexString(); shaded.set(key, fill); }
    polygons.push({ z: (points[0]![2] + points[1]![2] + points[2]![2] + points[3]![2]) / 4,
      art: `<polygon points="${points.map(p => `${round(p[0])},${round(p[1])}`).join(' ')}" fill="${fill}" stroke="${fill}" stroke-width=".2"/>` });
  }
  polygons.sort((a, b) => a.z - b.z);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" data-source="pawn-geometry" data-head="${appearance.headType}" data-hair="${appearance.hair}" data-beard="${appearance.beard}" data-skin="${hex(appearance.skinColor)}" data-hair-color="${hex(appearance.hairColor)}" data-weapon="${weaponVisual(weaponItem)?.item ?? ''}">
  <defs><linearGradient id="paper" x2="0" y2="1"><stop stop-color="#f4eee0"/><stop offset="1" stop-color="#d9d0b9"/></linearGradient><clipPath id="crop"><rect width="96" height="96" rx="6"/></clipPath></defs>
  <rect width="96" height="96" rx="6" fill="url(#paper)"/>
  <g clip-path="url(#crop)">${polygons.map(p => p.art).join('')}</g>
  </svg>`;
}

/** Regenerate only for identity, apparel or equipment changes, never per animation frame. */
export function portraitDataUrl(appearance: PawnAppearance, look: ApparelLook, weaponItem?: string): string {
  const key = [appearance.version, appearance.sex, appearance.bodyType, appearance.headType,
    appearance.hair, appearance.beard, appearance.skinColor, appearance.hairColor,
    look.signature, look.color ?? '', look.vest, look.silhouette, look.pants, weaponVisual(weaponItem)?.item ?? ''].join('|');
  const cached = cache.get(key);
  if (cached) return cached;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(makeSvg(appearance, look, weaponItem))}`;
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  cache.set(key, url);
  return url;
}

export function portraitCacheSize(): number { return cache.size; }
