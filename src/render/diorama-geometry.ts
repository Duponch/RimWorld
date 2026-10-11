import * as THREE from 'three/webgpu';
import { createDioramaDecor } from './diorama-decor';
import { DIORAMA_SKY } from './diorama-sky';
import type { BiomeId } from '../sim/biome-flora';

export type DioramaSide = 'north' | 'west' | 'south' | 'east';
export type DioramaMaterialKind = 'cardboard' | 'paper' | 'wood';
export type DioramaLayer = 'base' | 'lower' | 'upper' | 'table';

/** Map-relative thickness of every ordinary decorative paper cutout (V322). */
export const DIORAMA_PAPER_THICKNESS = .00065 * 2.5;

export interface DioramaGeometryPart {
  readonly name: string;
  readonly material: DioramaMaterialKind;
  readonly side?: DioramaSide;
  readonly layer: DioramaLayer;
  readonly geometry: THREE.BufferGeometry;
}

export interface DioramaGeometry {
  readonly parts: readonly DioramaGeometryPart[];
  readonly span: number;
  readonly wallHeight: number;
  readonly tableTop: number;
}

type Point = readonly [number, number, number];
type OutlinePoint = readonly [number, number];
type Vertex = { readonly p: Point; readonly uv: readonly [number, number] };

/** Static batches retain hard paper edges and independent UV seams. */
class GeometryBatch {
  celestial: -1 | 0 | 1 = 0;
  private readonly celestialKinds: number[] = [];
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly colors: number[] = [];
  private readonly uvs: number[] = [];
  private readonly palette = new Map<number, THREE.Color>();

  triangle(a: Vertex, b: Vertex, c: Vertex, pigment: number, facing?: Point): void {
    let ux = b.p[0] - a.p[0], uy = b.p[1] - a.p[1], uz = b.p[2] - a.p[2];
    let vx = c.p[0] - a.p[0], vy = c.p[1] - a.p[1], vz = c.p[2] - a.p[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    if (length < 1e-10) return;
    if (facing && nx * facing[0] + ny * facing[1] + nz * facing[2] < 0) {
      [b, c] = [c, b]; nx = -nx; ny = -ny; nz = -nz;
    }
    nx /= length; ny /= length; nz /= length;
    let color = this.palette.get(pigment);
    if (!color) { color = new THREE.Color(pigment); this.palette.set(pigment, color); }
    for (const v of [a, b, c]) {
      this.positions.push(...v.p); this.normals.push(nx, ny, nz);
      this.colors.push(color.r, color.g, color.b); this.uvs.push(...v.uv);
      this.celestialKinds.push(this.celestial);
    }
  }

  quad(a: Vertex, b: Vertex, c: Vertex, d: Vertex, pigment: number, facing?: Point): void {
    this.triangle(a, b, c, pigment, facing); this.triangle(a, c, d, pigment, facing);
  }

  finish(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    // Reuse identical complete vertices without merging hard edges or UV seams.
    // This only runs at construction, and keeps every authored triangle intact.
    const positions: number[] = [], normals: number[] = [], colors: number[] = [], uvs: number[] = [], indices: number[] = [];
    const vertices = new Map<string, number>();
    const celestialKinds: number[] = [];
    for (let i = 0; i < this.positions.length / 3; i++) {
      const p = this.positions.slice(i * 3, i * 3 + 3).map(Math.fround);
      const n = this.normals.slice(i * 3, i * 3 + 3).map(Math.fround);
      const c = this.colors.slice(i * 3, i * 3 + 3).map(Math.fround);
      const uv = this.uvs.slice(i * 2, i * 2 + 2).map(Math.fround);
      const kind = this.celestialKinds[i]!;
      const key = [...p, ...n, ...c, ...uv, kind].join(',');
      let index = vertices.get(key);
      if (index === undefined) { index = positions.length / 3; vertices.set(key, index); positions.push(...p); normals.push(...n); colors.push(...c); uvs.push(...uv); celestialKinds.push(kind); }
      indices.push(index);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (celestialKinds.some(kind => kind !== 0)) geometry.setAttribute('dioramaCelestial', new THREE.Float32BufferAttribute(celestialKinds, 1));
    geometry.setIndex(indices);
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    return geometry;
  }
}

/** Convex clipping also works for the concave handmade cloud/tree outlines. */
function clipHeight(points: readonly OutlinePoint[], height: number, above: boolean): OutlinePoint[] {
  const result: OutlinePoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!, b = points[(i + 1) % points.length]!;
    const aIn = above ? a[1] >= height : a[1] <= height;
    const bIn = above ? b[1] >= height : b[1] <= height;
    if (aIn) result.push(a);
    if (aIn !== bIn) {
      const t = (height - a[1]) / (b[1] - a[1]);
      result.push([a[0] + (b[0] - a[0]) * t, height]);
    }
  }
  return result;
}

/** One deterministic construction per site. No map-cell iteration or simulation RNG. */
export function createDioramaGeometry(width: number, height: number, seed = 0, biome: BiomeId = 'temperate-forest'): DioramaGeometry {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new RangeError('Diorama map dimensions must be finite and positive.');
  }
  const span = Math.min(width, height), gap = span * .0126, thickness = span * .009;
  const bottom = -span * .049, lip = span * .033, wallHeight = span * .215;
  const tableTop = bottom;
  const textureScale = span * .085;
  const parts: DioramaGeometryPart[] = [];
  const cardboard = 0xaa9279, cutEdge = 0xbda48a, shadowCard = 0x886e57;
  const minX = -.5 - gap, maxX = width - .5 + gap;
  const minZ = -.5 - gap, maxZ = height - .5 + gap;
  type Wall = { side: DioramaSide; start: Point; tangent: Point; inward: Point; length: number };
  const walls: Wall[] = [
    { side: 'north', start: [minX, 0, minZ], tangent: [1, 0, 0], inward: [0, 0, 1], length: maxX - minX },
    { side: 'west', start: [minX, 0, maxZ], tangent: [0, 0, -1], inward: [1, 0, 0], length: maxZ - minZ },
    { side: 'south', start: [maxX, 0, maxZ], tangent: [-1, 0, 0], inward: [0, 0, -1], length: maxX - minX },
    { side: 'east', start: [maxX, 0, minZ], tangent: [0, 0, 1], inward: [-1, 0, 0], length: maxZ - minZ },
  ];

  for (const wall of walls) {
    const lowerCard = new GeometryBatch(), upperCard = new GeometryBatch();
    const lowerPaper = new GeometryBatch(), upperPaper = new GeometryBatch();
    const handCut = (ratio: number): number => Math.sin(Math.PI * ratio) *
      (Math.sin(ratio * Math.PI * 5 + .35) * .0011 + Math.sin(ratio * Math.PI * 13) * .00055);
    // All four walls share the same nominal height and meet at exact corners;
    // only the bounded artisan cut varies between those fixed endpoints.
    const topAt = (u: number): number => wallHeight + handCut(u / wall.length) * span;
    // The inner face bows gently outward, preserving the exact playable bounds.
    // Outside corners widen into a matching mitre, rather than overlapping boxes.
    const point = (u: number, y: number, depth: number, followBow = true): Vertex => {
      const ratio = u / wall.length;
      const lipDip = Math.sin(Math.PI * ratio) ** 2 * span *
        ((wall.side === 'south' ? -.0031 : -.0012) + Math.sin(ratio * Math.PI * 7 + .4) * .0006);
      // The same warp applies to shells, edge bands, and clipped paper faces.
      // It fixes the bottom/top and both corners, so no cut or mitre develops a gap.
      const blend = y <= lip ? Math.sin(Math.PI * .5 * Math.max(0, (y - bottom) / (lip - bottom))) ** 2 :
        Math.cos(Math.PI * .5 * Math.min(1, (y - lip) / (topAt(u) - lip))) ** 2;
      const actualY = y + lipDip * blend;
      const bow = Math.sin(Math.PI * ratio) * Math.sin(Math.PI * (actualY - bottom) / (wallHeight - bottom)) * span * .0012;
      const d = depth - (followBow ? bow : 0);
      const mitre = depth < 0 ? -(2 * u / wall.length - 1) * depth : 0;
      return { p: [wall.start[0] + wall.tangent[0] * (u + mitre) + wall.inward[0] * d,
        actualY, wall.start[2] + wall.tangent[2] * (u + mitre) + wall.inward[2] * d], uv: [u / textureScale, actualY / textureScale] };
    };

    const prism = (batch: GeometryBatch, outline: readonly OutlinePoint[], back: number, front: number,
      faceColor: number, edgeColor = faceColor, followBow = true): void => {
      const clean = outline.filter((p, i) => {
        const previous = outline[(i + outline.length - 1) % outline.length]!;
        return Math.hypot(p[0] - previous[0], p[1] - previous[1]) > span * 1e-8;
      });
      if (clean.length < 3) return;
      const vertex = (p: OutlinePoint, depth: number): Vertex => point(...p, depth, followBow);
      const triangles = THREE.ShapeUtils.triangulateShape(clean.map(p => new THREE.Vector2(...p)), []);
      for (const [a, b, c] of triangles) {
        const pa = clean[a!]!, pb = clean[b!]!, pc = clean[c!]!;
        batch.triangle(vertex(pa, front), vertex(pb, front), vertex(pc, front), faceColor, wall.inward);
        batch.triangle(vertex(pa, back), vertex(pb, back), vertex(pc, back), edgeColor,
          [-wall.inward[0], 0, -wall.inward[2]]);
      }
      for (let i = 0; i < clean.length; i++) {
        const a = clean[i]!, b = clean[(i + 1) % clean.length]!;
        // Explicit desired outward vector also supports clockwise art outlines.
        let area = 0;
        for (let j = 0; j < clean.length; j++) {
          const p = clean[j]!, q = clean[(j + 1) % clean.length]!;
          area += p[0] * q[1] - q[0] * p[1];
        }
        const orientation = area >= 0 ? 1 : -1;
        const du = b[0] - a[0], dy = b[1] - a[1];
        batch.quad(vertex(a, front), vertex(a, back), vertex(b, back), vertex(b, front), edgeColor,
          [wall.tangent[0] * dy * orientation, -du * orientation, wall.tangent[2] * dy * orientation]);
      }
    };
    const splitPrism = (card: boolean, outline: readonly OutlinePoint[], back: number, front: number,
      color: number, edge = color): void => {
      // Paper stays a planar solid. Two overlapping cutouts then cannot cross
      // because of different triangulations of the cardboard's gentle bow.
      prism(card ? lowerCard : lowerPaper, clipHeight(outline, lip, false), back, front, color, edge, card);
      prism(card ? upperCard : upperPaper, clipHeight(outline, lip, true), back, front, color, edge, card);
    };

    // A continuous closed shell; top segments give the cardboard a restrained
    // hand-cut silhouette. Lower caps remain a finished rim when upper sides hide.
    const segments = 16;
    for (const [batch, low, high] of [[lowerCard, bottom, false], [upperCard, lip, true]] as const) {
      for (let i = 0; i < segments; i++) {
        const a = wall.length * i / segments, b = wall.length * (i + 1) / segments;
        const ya = high ? topAt(a) : lip, yb = high ? topAt(b) : lip;
        // Shared segment sides are omitted; only the two exterior end caps exist.
        batch.quad(point(a, low, 0), point(b, low, 0), point(b, yb, 0), point(a, ya, 0), cardboard, wall.inward);
        batch.quad(point(a, ya, -thickness), point(b, yb, -thickness), point(b, low, -thickness), point(a, low, -thickness),
          0x9e8267, [-wall.inward[0], 0, -wall.inward[2]]);
        batch.quad(point(a, ya, 0), point(b, yb, 0), point(b, yb, -thickness), point(a, ya, -thickness), cutEdge, [0, 1, 0]);
        batch.quad(point(a, low, -thickness), point(b, low, -thickness), point(b, low, 0), point(a, low, 0), shadowCard, [0, -1, 0]);
        if (i === 0) batch.quad(point(a, low, -thickness), point(a, low, 0), point(a, ya, 0), point(a, ya, -thickness),
          cutEdge, [-wall.tangent[0], 0, -wall.tangent[2]]);
        if (i === segments - 1) batch.quad(point(b, low, 0), point(b, low, -thickness), point(b, yb, -thickness), point(b, yb, 0),
          cutEdge, wall.tangent);
      }
      // Flat liner rolled onto both edges, with a compressed corrugated core
      // exposed between them. Detail is fixed at 64 flutes per edge per side.
      for (let i = 0; i < 64; i++) {
        const center = wall.length * (i + .5) / 64, half = wall.length / 64 * .20;
        const a = center - half, b = center + half;
        const ya = high ? topAt(a) : lip, yb = high ? topAt(b) : lip;
        prism(batch, [[a, ya - span * .00018], [b, yb - span * .00018], [b, yb + span * .00018], [a, ya + span * .00018]],
          -thickness * .77, -thickness * .24, i % 3 === 0 ? 0x80674b : 0x917860, 0xaa9071);
      }
      const liner: OutlinePoint[] = [];
      for (let i = 0; i <= segments; i++) {
        const u = wall.length * i / segments;
        liner.push([u, (high ? topAt(u) : lip) - span * .00125]);
      }
      for (let i = segments; i >= 0; i--) {
        const u = wall.length * i / segments;
        liner.push([u, high ? topAt(u) : lip]);
      }
      for (const [back, front] of [[-thickness * .16, span * .00015], [-thickness - span * .0001, -thickness * .84]] as const) {
        prism(batch, liner, back, front, cutEdge, 0xac9478);
      }
    }

    // Folds, glue shadows and thin paper end tabs remain subtle. They share
    // cardboard batches instead of costing separate meshes or shadow passes.
    for (const end of [0, 1]) {
      const x = end ? wall.length - span * .020 : span * .002;
      const y = Math.min(topAt(x), topAt(x + span * .018)) - span * .005;
      splitPrism(true, [[x, bottom + span * .003], [x + span * .017, bottom + span * .003],
        [x + span * .017, y - span * .010], [x + span * .011, y], [x, y]], .00008 * span, .00055 * span, 0x9e8267, 0x947a60);
      splitPrism(true, [[x + span * .0154, bottom + span * .006], [x + span * .0161, bottom + span * .006],
        [x + span * .0161, y - span * .012], [x + span * .0154, y - span * .012]],
        span * .00056, span * .00061, 0x856b52);
    }
    splitPrism(true, [[span * .02, bottom + span * .005], [wall.length - span * .02, bottom + span * .005],
      [wall.length - span * .02, bottom + span * .006], [span * .02, bottom + span * .006]],
      span * .0001, span * .00016, 0x8e7358);

    const art = (outline: readonly OutlinePoint[], color: number, depth = span * .0007, shadow = true): void => {
      if (shadow) {
        const shadowOutline = outline.map(([u, y]): OutlinePoint => [u + span * .0007, y - span * .00065]);
        splitPrism(true, shadowOutline, span * .00012, span * .00019, 0x927755);
      }
      splitPrism(false, outline, depth, depth + span * DIORAMA_PAPER_THICKNESS, color, 0xc9bfa8);
    };
    const decor = createDioramaDecor({ seed, biome, side: wall.side, wallLength: wall.length, span });
    for (const cut of decor.cutouts) art(cut.outline, cut.pigment, cut.depth, cut.shadow);
    for (const fold of decor.folds) {
      art(fold.outline, 0xc4b9a4, fold.contactDepth, false);
      const front = fold.outline.map(([u, y], k) => point(u, y, k === 2 ? fold.tipDepth : fold.baseDepth, false));
      const back = fold.outline.map(([u, y]) => point(u, y, fold.backDepth, false));
      upperPaper.triangle(front[0]!, front[1]!, front[2]!, 0xf5efdf, wall.inward);
      upperPaper.triangle(back[0]!, back[1]!, back[2]!, 0xc8bca7, [-wall.inward[0], 0, -wall.inward[2]]);
      for (let k = 0; k < 3; k++) {
        const next = (k + 1) % 3;
        upperPaper.quad(front[k]!, back[k]!, back[next]!, front[next]!, 0xd4c8b3);
      }
    }
    if (wall.side === 'north') {
      // Both slides share the existing north paper batch. A narrow cardboard
      // stick lies behind each cutout, moving as one rigid piece through the
      // concealed slot behind the foreground scenery and permanent lower rim.
      const u = wall.length * .68, y = span * DIORAMA_SKY.center;
      const moving = (points: readonly OutlinePoint[], color: number, back: number, front: number) =>
        prism(upperPaper, points, span * back, span * front, color, 0xc9bfa8, false);
      for (const kind of [1, -1] as const) {
        upperPaper.celestial = kind;
        const stem = span * .0035, foot = span * -.044;
        moving([[u - stem, foot], [u + stem, foot], [u + stem * .93, y + span * .01],
          [u + stem * .60, y + span * .012], [u - stem * .58, y + span * .012],
          [u - stem * .91, y + span * .01]], 0xb59b76, .00005, .00005 + DIORAMA_PAPER_THICKNESS);
        const radius = span * (kind === 1 ? DIORAMA_SKY.sunRadius : DIORAMA_SKY.moonRadius);
        const disc: OutlinePoint[] = [];
        if (kind === 1) {
          for (let i = 0; i < 32; i++) {
            const angle = i / 32 * Math.PI * 2, irregular = 1 + Math.sin(i * 1.7) * .013;
            disc.push([u + Math.cos(angle) * radius * irregular, y + Math.sin(angle) * radius * irregular]);
          }
          moving(disc, 0xc49652, .0018, .0018 + DIORAMA_PAPER_THICKNESS);
          for (let i = 0; i < 9; i++) {
            const angle = i * Math.PI * 2 / 9, x = Math.cos(angle), v = Math.sin(angle);
            const r0 = radius * 1.36, r1 = radius * 1.75, half = span * .0008;
            moving([[u + x * r0 - v * half, y + v * r0 + x * half], [u + x * r1 - v * half, y + v * r1 + x * half],
              [u + x * r1 + v * half, y + v * r1 - x * half], [u + x * r0 + v * half, y + v * r0 - x * half]],
              0xb78d50, .0018, .0018 + DIORAMA_PAPER_THICKNESS);
          }
        } else {
          // A true crescent with a hand-cut rim and unequal tips. The inner
          // contour rejoins the exact outer endpoints, keeping a closed solid.
          for (let i = 0; i <= 24; i++) {
            const angle = Math.PI * (.29 + i / 24 * 1.42);
            const irregular = 1 + .019 * Math.sin(i * 1.71 + .4) + .009 * Math.sin(i * .63 + .8);
            disc.push([u + Math.cos(angle) * radius * irregular, y + Math.sin(angle) * radius * irregular]);
          }
          const topTip = disc[0]!, bottomTip = disc[disc.length - 1]!;
          for (let i = 1; i < 16; i++) {
            const t = i / 16;
            const cut = Math.sin(Math.PI * t);
            disc.push([bottomTip[0] + (topTip[0] - bottomTip[0]) * t
              - radius * cut * (.97 + .018 * Math.sin(t * Math.PI * 5 + .3)),
            bottomTip[1] + (topTip[1] - bottomTip[1]) * t + radius * .014 * cut * Math.sin(t * Math.PI * 3)]);
          }
          moving(disc, 0xe2e4d6, .0018, .0018 + DIORAMA_PAPER_THICKNESS);
        }
      }
      upperPaper.celestial = 0;
    }
    for (const [layer, material, batch] of [['lower', 'cardboard', lowerCard], ['upper', 'cardboard', upperCard],
      ['lower', 'paper', lowerPaper], ['upper', 'paper', upperPaper]] as const) {
      const geometry = batch.finish();
      if (geometry.getAttribute('position').count) parts.push({ name: `diorama-${wall.side}-${layer}-${material}`,
        material, side: wall.side, layer, geometry });
      else geometry.dispose();
    }
  }

  const base = new GeometryBatch(), table = new GeometryBatch();
  const box = (batch: GeometryBatch, lo: Point, hi: Point, color: number, grain = false): void => {
    const v = (x: number, y: number, z: number): Vertex => ({ p: [x, y, z],
      uv: grain ? [x / (span * .14), z / (span * 1.25) + y / (span * .14)] : [x / textureScale, z / textureScale] });
    const [x0, y0, z0] = lo, [x1, y1, z1] = hi;
    batch.quad(v(x0, y1, z0), v(x0, y1, z1), v(x1, y1, z1), v(x1, y1, z0), color, [0, 1, 0]);
    batch.quad(v(x0, y0, z1), v(x0, y0, z0), v(x1, y0, z0), v(x1, y0, z1), color, [0, -1, 0]);
    batch.quad(v(x0, y0, z0), v(x0, y1, z0), v(x1, y1, z0), v(x1, y0, z0), color, [0, 0, -1]);
    batch.quad(v(x1, y0, z1), v(x1, y1, z1), v(x0, y1, z1), v(x0, y0, z1), color, [0, 0, 1]);
    batch.quad(v(x0, y0, z1), v(x0, y1, z1), v(x0, y1, z0), v(x0, y0, z0), color, [-1, 0, 0]);
    batch.quad(v(x1, y0, z0), v(x1, y1, z0), v(x1, y1, z1), v(x1, y0, z1), color, [1, 0, 0]);
  };
  box(base, [minX - thickness, bottom, minZ - thickness], [maxX + thickness, bottom + span * .007, maxZ + thickness], cardboard);

  // Beveled tabletop: one plain continuous surface, no clutter or per-plank meshes.
  // V322's extra paper clearance moves the box by .0006*span only. Preserve
  // the original table coordinates, grain, apron, and legs byte-for-byte.
  const tableMinX = -.5 - span * .012, tableMaxX = width - .5 + span * .012;
  const tableMinZ = -.5 - span * .012, tableMaxZ = height - .5 + span * .012;
  const x0 = tableMinX - span * .135, x1 = tableMaxX + span * .135;
  const z0 = tableMinZ - span * .135, z1 = tableMaxZ + span * .135;
  const bevel = span * .007, tableBottom = tableTop - span * .030;
  const rings: Point[][] = [
    [[x0 + bevel, tableTop, z0 + bevel], [x1 - bevel, tableTop, z0 + bevel], [x1 - bevel, tableTop, z1 - bevel], [x0 + bevel, tableTop, z1 - bevel]],
    [[x0, tableTop - bevel, z0], [x1, tableTop - bevel, z0], [x1, tableTop - bevel, z1], [x0, tableTop - bevel, z1]],
    [[x0, tableBottom + bevel * .5, z0], [x1, tableBottom + bevel * .5, z0], [x1, tableBottom + bevel * .5, z1], [x0, tableBottom + bevel * .5, z1]],
    [[x0 + bevel * .5, tableBottom, z0 + bevel * .5], [x1 - bevel * .5, tableBottom, z0 + bevel * .5],
      [x1 - bevel * .5, tableBottom, z1 - bevel * .5], [x0 + bevel * .5, tableBottom, z1 - bevel * .5]],
  ];
  const tv = (p: Point): Vertex => ({ p, uv: [p[0] / (span * .14), p[2] / (span * 1.25)] });
  table.quad(...rings[0]!.map(tv) as [Vertex, Vertex, Vertex, Vertex], 0xbba589, [0, 1, 0]);
  table.quad(...rings[3]!.map(tv) as [Vertex, Vertex, Vertex, Vertex], 0x967d62, [0, -1, 0]);
  // Three recessed hairline joins suggest a plain four-board tabletop. The
  // shared surface and grain stay continuous; these are static baked seams.
  for (let i = 1; i < 4; i++) {
    const x = x0 + (x1 - x0) * i / 4;
    box(table, [x - span * .00028, tableTop - span * .00010, z0 + bevel],
      [x + span * .00028, tableTop + span * .000025, z1 - bevel], 0x9f8870, true);
  }
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const a = rings[r]![i]!, b = rings[r]![j]!, c = rings[r + 1]![j]!, d = rings[r + 1]![i]!;
    const outward: Point = i === 0 ? [0, 0, -1] : i === 1 ? [1, 0, 0] : i === 2 ? [0, 0, 1] : [-1, 0, 0];
    table.quad(tv(a), tv(b), tv(c), tv(d), r === 0 ? 0xc2aa8d : 0xa78c6e, outward);
  }
  const legWidth = span * .044, legBottom = tableBottom - span * .31, inset = span * .105;
  for (const x of [x0 + inset, x1 - inset - legWidth]) for (const z of [z0 + inset, z1 - inset - legWidth]) {
    box(table, [x, legBottom, z], [x + legWidth, tableBottom, z + legWidth], 0xab8c6c, true);
  }
  // A simple apron gives the table credible support under the box.
  const apronBottom = tableBottom - span * .040, apron = span * .020;
  box(table, [x0 + inset, apronBottom, z0 + inset], [x1 - inset, tableBottom, z0 + inset + apron], 0xa28768, true);
  box(table, [x0 + inset, apronBottom, z1 - inset - apron], [x1 - inset, tableBottom, z1 - inset], 0xa28768, true);
  box(table, [x0 + inset, apronBottom, z0 + inset + apron], [x0 + inset + apron, tableBottom, z1 - inset - apron], 0xa28768, true);
  box(table, [x1 - inset - apron, apronBottom, z0 + inset + apron], [x1 - inset, tableBottom, z1 - inset - apron], 0xa28768, true);
  parts.push({ name: 'diorama-box-base', layer: 'base', material: 'cardboard', geometry: base.finish() });
  parts.push({ name: 'diorama-wooden-table', layer: 'table', material: 'wood', geometry: table.finish() });
  return { parts, span, wallHeight, tableTop };
}
