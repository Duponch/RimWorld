import * as THREE from 'three/webgpu';

export type RoomMaterialKind = 'wood' | 'plaster' | 'fabric' | 'metal' | 'paper' | 'cotton';
export type RoomSection = 'floor' | 'north' | 'west' | 'east' | 'furniture' | 'orbit';
export type MotionKind = 'sun' | 'moon';
type Point = readonly [number, number, number];

export interface RoomGeometryPart {
  readonly name: string;
  readonly material: RoomMaterialKind;
  readonly section: RoomSection;
  /** These parts are local to the rail anchor; translate both parts together. */
  readonly motionKind?: MotionKind;
  readonly geometry: THREE.BufferGeometry;
}

export interface RoomLantern {
  readonly anchorT: number;
  /** From the rail anchor to the top of the paper globe. */
  readonly threadLength: number;
  readonly center: Point;
  readonly radius: number;
}

export interface RoomOrbit {
  readonly centerX: number;
  readonly centerZ: number;
  readonly halfWidth: number;
  readonly baseY: number;
  readonly rise: number;
  readonly zSwing: number;
  readonly moonRailOffsetZ: number;
  readonly sun: RoomLantern;
  readonly moon: RoomLantern;
}

export interface RoomSuspension {
  readonly anchor: Point;
  readonly attachment: Point;
  readonly center: Point;
}

export interface RoomGeometry {
  readonly parts: readonly RoomGeometryPart[];
  readonly span: number;
  readonly floorY: number;
  readonly orbit: RoomOrbit;
  readonly cloudSuspensions: readonly RoomSuspension[];
}

export const ROOM_GEOMETRY_LIMITS = Object.freeze({ parts: 16, triangles: 20000 });

/** Analytic resident rail: a supplied vector is reused, with no scene or clock. */
export function sampleRoomOrbit(orbit: RoomOrbit, t: number, out: THREE.Vector3, kind: MotionKind = 'sun'): THREE.Vector3 {
  const angle = Math.max(0, Math.min(1, t)) * Math.PI;
  return out.set(orbit.centerX - Math.cos(angle) * orbit.halfWidth,
    orbit.baseY + Math.sin(angle) * orbit.rise,
    orbit.centerZ + Math.sin(angle * 2) * orbit.zSwing + (kind === 'moon' ? orbit.moonRailOffsetZ : 0));
}

class RoomRailCurve extends THREE.Curve<THREE.Vector3> {
  constructor(private readonly orbit: RoomOrbit, private readonly kind: MotionKind) { super(); }
  override getPoint(t: number, out = new THREE.Vector3()): THREE.Vector3 {
    return sampleRoomOrbit(this.orbit, t, out, this.kind);
  }
}

/** Complete vertices are merged only at preparation; hard edges and UV seams
 * remain separate. All parts have their own bounds and resource ownership. */
class RoomBatch {
  private readonly positions: number[] = [];
  private readonly normals: number[] = [];
  private readonly colors: number[] = [];
  private readonly uvs: number[] = [];
  private readonly indices: number[] = [];
  private readonly vertices = new Map<string, number>();
  private readonly palette = new Map<number, THREE.Color>();

  add(geometry: THREE.BufferGeometry, pigment: number, matrix?: THREE.Matrix4): void {
    if (matrix) geometry.applyMatrix4(matrix);
    const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
    const uv = geometry.getAttribute('uv'), index = geometry.getIndex();
    let color = this.palette.get(pigment);
    if (!color) { color = new THREE.Color(pigment); this.palette.set(pigment, color); }
    const remap: number[] = [];
    for (let cursor = 0; cursor < (index ? index.count : position.count); cursor++) {
      const i = index ? index.getX(cursor) : cursor;
      const reused = remap[i];
      if (reused !== undefined) { this.indices.push(reused); continue; }
      const p = [position.getX(i), position.getY(i), position.getZ(i)].map(Math.fround);
      const n = [normal.getX(i), normal.getY(i), normal.getZ(i)].map(Math.fround);
      const tex = uv ? [uv.getX(i), uv.getY(i)].map(Math.fround) : [0, 0];
      const key = [...p, ...n, pigment, ...tex].join(',');
      let vertex = this.vertices.get(key);
      if (vertex === undefined) {
        vertex = this.positions.length / 3; this.vertices.set(key, vertex);
        this.positions.push(...p); this.normals.push(...n); this.colors.push(color.r, color.g, color.b); this.uvs.push(...tex);
      }
      remap[i] = vertex; this.indices.push(vertex);
    }
    geometry.dispose();
  }

  finish(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geometry.setIndex(this.indices); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    return geometry;
  }
}

function hash(seed: number, salt: number): number {
  let value = Math.imul((seed >>> 0) ^ salt, 0x45d9f3b);
  value ^= value >>> 16; value = Math.imul(value, 0x45d9f3b); value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}

/** Eight-sided corners and four bevel rings soften furniture without dense
 * rounded boxes. Each bevel keeps a purposeful, slightly faceted silhouette. */
function beveledBox(w: number, h: number, d: number, bevel: number): THREE.BufferGeometry {
  const b = Math.min(bevel, w * .24, h * .24, d * .24);
  const rings: Point[][] = [];
  for (const [y, inset] of [[h / 2, b * .55], [h / 2 - b, 0], [-h / 2 + b, 0], [-h / 2, b * .55]]) {
    const x = w / 2 - inset!, z = d / 2 - inset!, c = b * .55;
    rings.push([[-x + c, y!, -z], [x - c, y!, -z], [x, y!, -z + c], [x, y!, z - c],
      [x - c, y!, z], [-x + c, y!, z], [-x, y!, z - c], [-x, y!, -z + c]]);
  }
  const positions: number[] = [], uvs: number[] = [];
  const triangle = (a: Point, b0: Point, c: Point): void => {
    for (const p of [a, b0, c]) { positions.push(...p); uvs.push(p[0] / w + .5, (p[2] / d + p[1] / h) * .5 + .5); }
  };
  for (let i = 1; i < 7; i++) {
    triangle(rings[0]![0]!, rings[0]![i + 1]!, rings[0]![i]!);
    triangle(rings[3]![0]!, rings[3]![i]!, rings[3]![i + 1]!);
  }
  for (let r = 0; r < 3; r++) for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8, a = rings[r]![i]!, b0 = rings[r]![j]!, c = rings[r + 1]![j]!, e = rings[r + 1]![i]!;
    triangle(a, b0, c); triangle(a, c, e);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.computeVertexNormals();
  return geometry;
}

function matrix(position: Point, rotation: Point = [0, 0, 0], scale: Point = [1, 1, 1]): THREE.Matrix4 {
  return new THREE.Matrix4().compose(new THREE.Vector3(...position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale));
}

function segment(batch: RoomBatch, a: Point, b: Point, radius: number, pigment: number, sides = 7): void {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
  const length = direction.length();
  if (length <= 1e-8) return;
  const transform = new THREE.Matrix4().compose(start.add(end).multiplyScalar(.5),
    new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.multiplyScalar(1 / length)),
    new THREE.Vector3(1, 1, 1));
  batch.add(new THREE.CylinderGeometry(radius, radius, length, sides), pigment, transform);
}

function softSphere(radius: number, widthSegments: number, heightSegments: number, phase: number, amount: number): THREE.SphereGeometry {
  const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
  const position = geometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i) / radius, y = position.getY(i) / radius, z = position.getZ(i) / radius;
    // Position-based ripples keep UV seams and poles coincident; no vertex noise.
    const swell = 1 + amount * (Math.sin(x * 7 + z * 5 + phase) * .55 + Math.sin(y * 9 - z * 3 + phase) * .45);
    position.setXYZ(i, x * radius * swell, y * radius * swell, z * radius * swell);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Static bedroom, centered around the existing diorama table. The exact table
 * feet end at -.389*span; no second table or playable-map content is generated. */
export function createRoomGeometry(width: number, height: number, seed = 0): RoomGeometry {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || !Number.isSafeInteger(seed)) {
    throw new RangeError('Room dimensions must be finite and positive, and seed must be a safe integer.');
  }
  const span = Math.min(width, height), floorY = -span * .389;
  const cx = (width - 1) / 2, cz = (height - 1) / 2;
  const halfX = width / 2 + span * 1.15, halfZ = height / 2 + span * 1.15;
  const northZ = cz - halfZ, westX = cx - halfX, eastX = cx + halfX;
  const parts: RoomGeometryPart[] = [];
  const batches = new Map<string, { batch: RoomBatch; material: RoomMaterialKind; section: RoomSection; motionKind?: MotionKind }>();
  const batch = (name: string, material: RoomMaterialKind, section: RoomSection, motionKind?: MotionKind): RoomBatch => {
    let entry = batches.get(name);
    if (!entry) { entry = { batch: new RoomBatch(), material, section, motionKind }; batches.set(name, entry); }
    return entry.batch;
  };
  // Authored lengths below are span-relative; helper coordinates are centered
  // on the map and their Y values are measured upward from the bedroom floor.
  const world = (x: number, y: number, z: number): Point => [cx + x * span, floorY + y * span, cz + z * span];
  const box = (target: RoomBatch, center: Point, dimensions: Point, pigment: number, bevel = 0, rotation: Point = [0, 0, 0]): void => {
    const [w, h, d] = dimensions;
    target.add(bevel > 0 ? beveledBox(w, h, d, bevel) : new THREE.BoxGeometry(w, h, d), pigment, matrix(center, rotation));
  };
  const prop = (target: RoomBatch, x: number, y: number, z: number, w: number, h: number, d: number,
    pigment: number, bevel = .006, rotation: Point = [0, 0, 0]): void => box(target, world(x, y, z),
    [w * span, h * span, d * span], pigment, bevel * span, rotation);
  const wood = batch('room-furniture-wood', 'wood', 'furniture');
  const fabric = batch('room-furniture-fabric', 'fabric', 'furniture');
  const paper = batch('room-books-and-art', 'paper', 'furniture');
  const metal = batch('room-orbit-structure', 'metal', 'orbit');

  const floor = batch('room-parquet-floor', 'wood', 'floor');
  box(floor, [cx, floorY - span * .016, cz], [halfX * 2, span * .024, halfZ * 2], 0x8c7864);
  // Individual broad boards have very narrow real recessed joins, all in one
  // batch. A fixed board count avoids an area-dependent construction budget.
  const boards = 18, boardWidth = halfX * 2 / boards;
  for (let i = 0; i < boards; i++) {
    const tint = [0xab957a, 0xa48c70, 0xb19c80, 0xa99074][i % 4]!;
    box(floor, [westX + boardWidth * (i + .5), floorY - span * .002, cz],
      [boardWidth - span * .0015, span * .004, halfZ * 2 - span * .007], tint, span * .001);
  }
  const wallHeight = span * 1.35, wallThickness = span * .035;
  for (const side of ['north', 'west', 'east'] as const) {
    const target = batch(`room-${side}-wall`, 'plaster', side);
    const horizontal = side === 'north';
    box(target, [horizontal ? cx : side === 'west' ? westX - wallThickness / 2 : eastX + wallThickness / 2,
      floorY + wallHeight / 2, horizontal ? northZ - wallThickness / 2 : cz],
    [horizontal ? halfX * 2 : wallThickness, wallHeight, horizontal ? wallThickness : halfZ * 2],
    side === 'west' ? 0xb6a28f : 0xc8b9a5, span * .003);
    box(wood, [horizontal ? cx : side === 'west' ? westX + span * .005 : eastX - span * .005,
      floorY + span * .027, horizontal ? northZ + span * .005 : cz],
    [horizontal ? halfX * 2 : span * .012, span * .054, horizontal ? span * .012 : halfZ * 2], 0x947d65, span * .003);
  }
  const rug = batch('room-woven-rug', 'fabric', 'floor');
  box(rug, [cx, floorY + span * .0007, cz + span * .035],
    [width + span * .46, span * .0014, height + span * .42], 0xa99e88, span * .0003);
  for (const offset of [-1, 1]) {
    box(rug, [cx, floorY + span * .0015, cz + span * .035 + offset * (height / 2 + span * .185)],
      [width + span * .40, span * .0003, span * .007], 0x7b8b7e);
  }

  // Picture window: relief frame, linen curtains, and restrained layered paper
  // landscape. No downloaded bitmap or text labels are needed for this prop.
  const win = batch('room-window-frame', 'wood', 'north');
  const curtains = batch('room-window-curtains', 'fabric', 'north');
  const wx = cx - width * .24, wy = floorY + span * .84, wz = northZ + span * .025;
  box(win, [wx, wy, wz], [span * .64, span * .48, span * .025], 0x776451, span * .006);
  // The full window and framed art share the north visibility group, including
  // their coloured paper faces. Books retain the separate furniture batch.
  box(win, [wx, wy, wz + span * .014], [span * .585, span * .426, span * .003], 0xb8c8c3);
  const landscape = (points: readonly (readonly [number, number])[], pigment: number, depth: number): void => {
    const shape = new THREE.Shape();
    points.forEach(([x, y], i) => i ? shape.lineTo(x * span, y * span) : shape.moveTo(x * span, y * span));
    shape.closePath();
    win.add(new THREE.ShapeGeometry(shape), pigment, matrix([wx, wy, wz + span * depth]));
  };
  landscape([[-.29, -.21], [-.29, -.015], [-.17, .035], [-.09, -.005], [.025, .075], [.14, .02], [.29, .045], [.29, -.21]], 0x839b89, .0175);
  landscape([[-.29, -.21], [-.29, -.11], [-.14, -.025], [-.02, -.06], [.11, -.035], [.29, -.09], [.29, -.21]], 0x637e6b, .0185);
  for (const dx of [-.317, 0, .317]) box(win, [wx + dx * span, wy, wz + span * .035],
    [span * (dx === 0 ? .013 : .025), span * .48, span * .028], 0xd7c9b3, span * .003);
  for (const dy of [-.24, .025, .24]) box(win, [wx, wy + dy * span, wz + span * .035],
    [span * .66, span * (dy === .025 ? .012 : .022), span * .028], 0xd7c9b3, span * .003);
  box(win, [wx, wy - span * .265, wz + span * .045], [span * .72, span * .021, span * .09], 0xb4a087, span * .006);
  segment(win, [wx - span * .43, wy + span * .275, wz + span * .065],
    [wx + span * .43, wy + span * .275, wz + span * .065], span * .005, 0x796650);
  for (const side of [-1, 1]) {
    const geometry = new THREE.PlaneGeometry(span * .14, span * .58, 16, 10);
    const p = geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) / span, y = p.getY(i) / span;
      p.setZ(i, span * (.012 * Math.sin((x + .07) * Math.PI * 36) + .005 * Math.sin(y * 9 + side)));
    }
    geometry.computeVertexNormals();
    // Two coincident surfaces are avoided: a tiny fabric thickness closes the
    // panel as a folded solid rather than requiring a transparent material.
    const front = geometry.clone(), back = geometry.clone();
    const bp = back.getAttribute('position'), bn = back.getAttribute('normal');
    for (let i = 0; i < bp.count; i++) { bp.setZ(i, bp.getZ(i) - span * .001); bn.setXYZ(i, -bn.getX(i), -bn.getY(i), -bn.getZ(i)); }
    const bi = back.getIndex()!;
    for (let i = 0; i < bi.count; i += 3) { const a = bi.getX(i); bi.setX(i, bi.getX(i + 2)); bi.setX(i + 2, a); }
    const center: Point = [wx + side * span * .35, wy - span * .035, wz + span * .07];
    const edgePositions: number[] = [], edgeUvs: number[] = [];
    const border: number[] = [];
    for (let x = 0; x <= 16; x++) border.push(x);
    for (let y = 1; y <= 10; y++) border.push(y * 17 + 16);
    for (let x = 15; x >= 0; x--) border.push(170 + x);
    for (let y = 9; y > 0; y--) border.push(y * 17);
    const edgeVertex = (index: number, backFace: boolean): Point => [p.getX(index), p.getY(index), p.getZ(index) - (backFace ? span * .001 : 0)];
    for (let k = 0; k < border.length; k++) {
      const a = border[k]!, b = border[(k + 1) % border.length]!;
      for (const v of [edgeVertex(a, false), edgeVertex(b, true), edgeVertex(a, true),
        edgeVertex(a, false), edgeVertex(b, false), edgeVertex(b, true)]) {
        edgePositions.push(...v); edgeUvs.push(v[0] / span, v[1] / span);
      }
    }
    const edges = new THREE.BufferGeometry();
    edges.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
    edges.setAttribute('uv', new THREE.Float32BufferAttribute(edgeUvs, 2)); edges.computeVertexNormals();
    curtains.add(front, 0xc4b29c, matrix(center)); curtains.add(back, 0xb8a38e, matrix(center));
    curtains.add(edges, 0xbca990, matrix(center)); geometry.dispose();
  }
  // Two small relief prints echo the handmade diorama without crowding it.
  for (let i = 0; i < 2; i++) {
    const x = cx + width * .18 + span * i * .24, y = floorY + span * (.83 + i * .025);
    box(win, [x, y, northZ + span * .014], [span * .20, span * .29, span * .024], 0x806c58, span * .004);
    box(win, [x, y, northZ + span * .028], [span * .174, span * .262, span * .003], 0xe1d7c4);
    win.add(new THREE.CircleGeometry(span * .028, 20), i ? 0xa4ad8b : 0xc1a56d,
      matrix([x + span * .028, y + span * .050, northZ + span * .030]));
    box(win, [x, y - span * .057, northZ + span * .031], [span * .136, span * .046, span * .002], 0x8d9d86, span * .0004);
  }

  const left = -width / (2 * span), right = width / (2 * span), rear = -height / (2 * span);
  // Four shelves with authored book spacing; a seeded height/pigment variation
  // belongs only to this decorative preparation, never the simulation PRNG.
  const shelfX = left - .77, shelfZ = rear - .47;
  prop(wood, shelfX, .36, shelfZ, .40, .72, .105, 0x8d7960);
  prop(wood, shelfX, .37, shelfZ + .056, .358, .66, .014, 0x625342, .002);
  for (let j = 0; j < 4; j++) {
    const sy = .085 + j * .17;
    prop(wood, shelfX, sy, shelfZ + .035, .40, .014, .15, 0xa28a6d, .003);
    for (let i = 0; i < 8; i++) {
      const h = .083 + hash(seed, j * 173 + i * 29 + 5) * .050;
      const pigment = [0x849384, 0xae937d, 0xb8ac8e, 0x778d93, 0x977b6d, 0xc7bba4][(i + j * 2) % 6]!;
      const x = shelfX - .157 + i * .043;
      prop(paper, x, sy + .007 + h / 2, shelfZ + .090, .029, h, .065, pigment, .001);
      prop(paper, x, sy + h * .78, shelfZ + .1235, .025, .002, .001, 0xdfd3bc, 0);
    }
  }
  const chairX = left - .47, chairZ = -.08;
  prop(fabric, chairX, .145, chairZ, .275, .073, .245, 0xa38b76, .021);
  prop(fabric, chairX, .266, chairZ - .102, .263, .23, .060, 0xa68e7c, .017, [-.10, 0, 0]);
  for (const dx of [-.13, .13]) prop(fabric, chairX + dx, .218, chairZ, .045, .14, .23, 0x947c68, .015);
  prop(fabric, chairX, .188, chairZ + .018, .209, .028, .170, 0xd4c9b6, .009);
  for (const dx of [-.103, .103]) for (const dz of [-.082, .082]) prop(wood, chairX + dx, .055, chairZ + dz, .021, .11, .021, 0x78644f, .003);

  const bedX = right + .60, bedZ = rear - .45;
  prop(wood, bedX, .100, bedZ, .60, .135, .72, 0x8f7c65, .014);
  prop(wood, bedX, .230, bedZ - .35, .60, .40, .045, 0x9c8971, .016);
  prop(fabric, bedX, .210, bedZ, .565, .104, .675, 0xdcd4c2, .025);
  prop(fabric, bedX, .282, bedZ + .095, .55, .055, .44, 0x96a28e, .020);
  prop(fabric, bedX, .317, bedZ - .12, .55, .022, .043, 0x7e9282, .006);
  for (const dx of [-.14, .14]) prop(fabric, bedX + dx, .289, bedZ - .225, .22, .055, .12, 0xe8dfce, .017, [0, dx > 0 ? -.075 : .08, 0]);
  prop(fabric, bedX, .320, bedZ + .25, .54, .015, .09, 0xbba195, .004);
  for (let i = 0; i < 7; i++) prop(fabric, bedX, .311, bedZ - .085 + i * .049, .49, .0006, .0015, 0xb5bfaa, 0);
  const standX = right + .99, standZ = rear - .52;
  prop(wood, standX, .11, standZ, .21, .22, .19, 0xa58f73, .009);
  prop(wood, standX, .125, standZ + .10, .17, .012, .005, 0x8b775e, .002);
  segment(wood, world(standX, .238, standZ), world(standX, .34, standZ), span * .006, 0xbda476);
  fabric.add(new THREE.CylinderGeometry(span * .041, span * .073, span * .10, 20, 1, false), 0xd6c6a8,
    matrix(world(standX, .368, standZ)));
  fabric.add(softSphere(span * .043, 12, 8, 1, .014), 0xcdbca4, matrix(world(standX, .245, standZ), [0, 0, 0], [.78, .55, .78]));

  const plant = (x: number, z: number, scale: number, phase: number): void => {
    fabric.add(new THREE.CylinderGeometry(span * .055 * scale, span * .041 * scale, span * .094 * scale, 12),
      0xbda38b, matrix(world(x, .047 * scale, z)));
    for (let i = 0; i < 11; i++) {
      const angle = i * 2.39996 + phase, h = (.13 + i * .010) * scale;
      const spread = (.05 + .045 * Math.sin(i * .73)) * scale;
      const end = world(x + Math.cos(angle) * spread, h, z + Math.sin(angle) * spread);
      segment(wood, world(x, .092 * scale, z), end, span * .0014 * scale, 0x73876e, 5);
      fabric.add(softSphere(span * .028 * scale, 8, 5, i, .025), i % 2 ? 0x7c9175 : 0x687e69,
        matrix(end, [Math.cos(angle) * .4, angle, Math.sin(angle) * .4], [.57, 1.25, .28]));
    }
  };
  plant(right + .74, .18, 1.18, .4); plant(left - .96, rear - .92, .82, 1.7);

  const orbit: RoomOrbit = {
    centerX: cx, centerZ: cz - span * .025, halfWidth: width / 2 + span * .115,
    baseY: span * .285, rise: span * .405, zSwing: span * .023, moonRailOffsetZ: -span * .11,
    sun: { anchorT: .32, threadLength: span * .077, center: [0, -span * .109, 0], radius: span * .032 },
    moon: { anchorT: .77, threadLength: span * .073, center: [0, -span * .100, 0], radius: span * .027 },
  };
  const supportZ = height / 2 + span * .115;
  // Fine posts sit on the existing tabletop, inside its .147*span margin.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = cx + sx * orbit.halfWidth, z = cz + sz * supportZ;
    segment(metal, [x, -span * .049, z], [x, span * .665, z], span * .0034, 0xbda681, 8);
    metal.add(new THREE.CylinderGeometry(span * .012, span * .014, span * .004, 12), 0xa58d6b,
      matrix([x, -span * .047, z]));
  }
  for (const sx of [-1, 1]) {
    const x = cx + sx * orbit.halfWidth;
    segment(metal, [x, orbit.baseY, cz - supportZ], [x, orbit.baseY, cz + supportZ], span * .0032, 0xc7b394, 8);
    segment(metal, [x, span * .665, cz - supportZ], [x, span * .665, cz + supportZ], span * .0028, 0xc7b394, 7);
  }
  for (const sz of [-1, 1]) segment(metal, [cx - orbit.halfWidth, span * .665, cz + sz * supportZ],
    [cx + orbit.halfWidth, span * .665, cz + sz * supportZ], span * .0032, 0xbda681, 8);
  const rail = (spec: RoomOrbit, steps: number, radius: number, pigment: number, kind: MotionKind = 'sun'): void => {
    // The tube and every attachment sample the same analytic curve. Runtime
    // motion can reuse sampleRoomOrbit without reconstructing this geometry.
    const curve = new RoomRailCurve(spec, kind);
    metal.add(new THREE.TubeGeometry(curve, steps, radius, 8, false), pigment);
    for (const t of [0, 1]) {
      const p = sampleRoomOrbit(spec, t, new THREE.Vector3(), kind);
      metal.add(new THREE.SphereGeometry(radius, 8, 6), pigment, matrix([p.x, p.y, p.z]));
    }
  };
  rail(orbit, 56, span * .0048, 0xbda477);
  rail(orbit, 56, span * .0041, 0xc7b391, 'moon');
  const secondary: RoomOrbit = { ...orbit, halfWidth: orbit.halfWidth * .92, centerZ: cz - supportZ * .66,
    baseY: span * .29, rise: span * .335, zSwing: span * .011 };
  rail(secondary, 40, span * .0028, 0xd0bfa0);
  for (const t of [0, 1]) {
    const a = sampleRoomOrbit(secondary, t, new THREE.Vector3());
    segment(metal, [a.x, a.y, a.z], [cx + (t ? 1 : -1) * orbit.halfWidth, a.y, a.z], span * .0028, 0xd0bfa0);
  }
  const apex = sampleRoomOrbit(orbit, .5, new THREE.Vector3());
  segment(metal, [apex.x, apex.y, apex.z], [apex.x, span * .665, cz - supportZ], span * .0025, 0xc7b394);
  const moonApex = sampleRoomOrbit(orbit, .5, new THREE.Vector3(), 'moon');
  segment(metal, [moonApex.x, moonApex.y, moonApex.z], [moonApex.x, span * .665, cz - supportZ], span * .0023, 0xc7b394);
  for (const t of [.16, .32, .5, .69, .83]) {
    const anchor = sampleRoomOrbit(orbit, t, new THREE.Vector3());
    metal.add(new THREE.TorusGeometry(span * .010, span * .0012, 5, 12), 0xceba95,
      matrix([anchor.x, anchor.y, anchor.z], [0, t * 1.7, 0]));
  }

  for (const kind of ['sun', 'moon'] as const) {
    const body = batch(`room-${kind}-paper`, 'paper', 'orbit', kind);
    const thread = batch(`room-${kind}-thread`, 'metal', 'orbit', kind);
    const spec = orbit[kind], r = spec.radius, center = spec.center;
    segment(thread, [0, 0, 0], [center[0], center[1] + r, center[2]], span * .00105, 0xd7cebc, 6);
    thread.add(new THREE.TorusGeometry(span * .007, span * .0011, 5, 12), 0xbca782,
      matrix([0, 0, 0], [0, kind === 'sun' ? .3 : -.4, 0]));
    body.add(softSphere(r, 20, 14, kind === 'sun' ? .7 : 2.1, .018), kind === 'sun' ? 0xd7bd79 : 0xd9ddd4, matrix(center));
    for (const lat of [-.32, .32]) {
      const radius = Math.sqrt(1 - lat * lat) * r * 1.008;
      body.add(new THREE.TorusGeometry(radius, r * .014, 5, 28), kind === 'sun' ? 0xe4d0a0 : 0xe7e6d9,
        matrix([center[0], center[1] + lat * r, center[2]], [Math.PI / 2, 0, 0]));
    }
    for (const end of [-1, 1]) body.add(new THREE.CylinderGeometry(r * .12, r * .12, r * .065, 10),
      kind === 'sun' ? 0xba9f66 : 0xb6b9ae, matrix([center[0], center[1] + end * r * .986, center[2]]));
  }

  const cotton = batch('room-cotton-clouds', 'cotton', 'orbit');
  const cloudSuspensions: RoomSuspension[] = [];
  for (let j = 0; j < 3; j++) {
    const t = [.18, .48, .82][j]!, anchor = sampleRoomOrbit(secondary, t, new THREE.Vector3());
    const size = span * [.036, .030, .034][j]!;
    const center: Point = [anchor.x, anchor.y - span * (.13 + j * .007), anchor.z];
    const attachment: Point = [center[0], center[1] + size * .70, center[2]];
    const start: Point = [anchor.x, anchor.y, anchor.z];
    cloudSuspensions.push({ anchor: start, attachment, center });
    segment(metal, start, attachment, span * .0009, 0xd8cfbd, 6);
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.4 + j * .7, side = i - 3;
      const x = center[0] + side * size * .32;
      const y = center[1] + Math.sin(angle) * size * .16;
      const z = center[2] + Math.cos(angle) * size * .21;
      const radius = size * (.58 + hash(seed, 887 + j * 117 + i * 31) * .16);
      cotton.add(softSphere(radius, 12, 7, j * 2 + i * .4, .035), i % 3 === 0 ? 0xe0ddd3 : 0xeeebe3,
        matrix([x, y, z], [0, angle, 0], [1.13, .83 + (i % 2) * .09, .85]));
    }
    // Forked bridle lands in the actual outer puffs and joins the main thread.
    for (const side of [-1, 1]) segment(metal, attachment,
      [center[0] + side * size * .77, center[1] + size * .22, center[2]], span * .0007, 0xd8cfbd, 5);
  }

  for (const [name, entry] of batches) parts.push({ name, material: entry.material, section: entry.section,
    ...(entry.motionKind ? { motionKind: entry.motionKind } : {}), geometry: entry.batch.finish() });
  return { parts, span, floorY, orbit, cloudSuspensions };
}
