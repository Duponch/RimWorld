import { Camera, Frustum, Plane, Vector3, type BufferGeometry } from 'three/webgpu';
import type { DioramaGeometryPart, DioramaSide } from './diorama-geometry';

interface BoundsNode {
  readonly minX: number; readonly minY: number; readonly minZ: number;
  readonly maxX: number; readonly maxY: number; readonly maxZ: number;
  readonly start: number; readonly end: number;
  readonly left?: BoundsNode; readonly right?: BoundsNode;
}

/** Geometry order already groups each small paper shape and cardboard panel.
 * A range hierarchy bounds the ambiguous silhouette work without changing any
 * triangle or uploading another GPU buffer. Built once with the static decor. */
class TriangleTree {
  readonly positions: ArrayLike<number>;
  readonly indices: ArrayLike<number>;
  readonly root: BoundsNode;

  constructor(geometry: BufferGeometry) {
    this.positions = geometry.getAttribute('position').array;
    const indices = geometry.index?.array ?? Uint32Array.from({ length: this.positions.length / 3 }, (_, i) => i);
    const celestial = geometry.getAttribute('dioramaCelestial');
    // Sliding paper is only rendered from the interior-facing camera half-space
    // (DioramaLayer). Its vertices stay behind every ray to playable ground.
    // Exclude its authored maximum pose so the hierarchy remains truly static.
    this.indices = celestial ? indices.filter(index => celestial.getX(index) === 0) : indices;
    this.root = this.build(0, this.indices.length);
  }

  private build(start: number, end: number): BoundsNode {
    if (end - start > 36) {
      const middle = start + Math.floor((end - start) / 6) * 3;
      const left = this.build(start, middle), right = this.build(middle, end);
      return { start, end, left, right,
        minX: Math.min(left.minX, right.minX), minY: Math.min(left.minY, right.minY), minZ: Math.min(left.minZ, right.minZ),
        maxX: Math.max(left.maxX, right.maxX), maxY: Math.max(left.maxY, right.maxY), maxZ: Math.max(left.maxZ, right.maxZ) };
    }
    let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = start; i < end; i++) {
      const p = this.indices[i]! * 3, x = this.positions[p]!, y = this.positions[p + 1]!, z = this.positions[p + 2]!;
      minX = Math.min(minX, x); minY = Math.min(minY, y); minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); maxZ = Math.max(maxZ, z);
    }
    return { start, end, minX, minY, minZ, maxX, maxY, maxZ };
  }
}

/** Intersect actual front-facing upper triangles with the rays toward visible
 * playable ground. Orthographic rays are parallel; perspective rays converge
 * at the eye. No World/cell iteration, per-query allocation or view heuristic. */
export class DioramaOcclusion {
  private trees: { side: DioramaSide; tree: TriangleTree }[] = [];
  private readonly planes = Array.from({ length: 18 }, () => new Plane());
  private planeCount = 0;
  private valid = false;
  private perspective = false;
  private readonly eye = new Vector3();
  private readonly forward = new Vector3();
  private readonly input = Array.from({ length: 32 }, () => new Vector3());
  private readonly output = Array.from({ length: 32 }, () => new Vector3());
  private readonly sideState: Record<DioramaSide, number> = { north: -1, south: -1, west: -1, east: -1 };

  configure(parts: readonly DioramaGeometryPart[]): void {
    this.trees = parts.filter(p => p.layer === 'upper' && p.side)
      .map(p => ({ side: p.side!, tree: new TriangleTree(p.geometry) }));
  }

  clear(): void { this.trees = []; this.valid = false; }

  begin(camera: Camera, frustum: Frustum, width: number, height: number): void {
    this.valid = false; this.planeCount = 0;
    this.sideState.north = this.sideState.south = this.sideState.west = this.sideState.east = -1;
    this.perspective = (camera as Camera & { isPerspectiveCamera?: boolean }).isPerspectiveCamera === true;
    this.eye.setFromMatrixPosition(camera.matrixWorld); camera.getWorldDirection(this.forward);
    if (this.perspective ? this.eye.y <= 1e-7 : this.forward.y >= -1e-7) return;
    // The wall itself must be in front of the camera and in the clip volume.
    for (const plane of frustum.planes) this.planes[this.planeCount++]!.copy(plane);
    // Pull ground half-planes back through the actual projection. Multiplication
    // avoids dividing by an almost-horizontal ray or an eye-height wall point.
    for (const plane of frustum.planes) this.groundPlane(plane.normal.x, plane.normal.z, plane.constant);
    this.groundPlane(1, 0, .5); this.groundPlane(-1, 0, width - .5);
    this.groundPlane(0, 1, .5); this.groundPlane(0, -1, height - .5);
    this.planes[this.planeCount++]!.setComponents(0, 1, 0, -1e-7);
    if (this.perspective) this.planes[this.planeCount++]!.setComponents(0, -1, 0, this.eye.y - 1e-7);
    this.valid = true;
  }

  private groundPlane(a: number, b: number, c: number): void {
    const scale = this.perspective ? this.eye.y : -this.forward.y;
    const ny = this.perspective ? -(a * this.eye.x + b * this.eye.z + c)
      : a * this.forward.x + b * this.forward.z;
    const plane = this.planes[this.planeCount++]!.setComponents(scale * a, ny, scale * b, scale * c);
    const length = plane.normal.length();
    if (length > 0) { plane.normal.multiplyScalar(1 / length); plane.constant /= length; }
  }

  hides(side: DioramaSide): boolean {
    if (!this.valid) return false;
    if (this.sideState[side] >= 0) return this.sideState[side] === 1;
    for (const { side: candidate, tree } of this.trees) {
      if (candidate === side && this.intersects(tree, tree.root)) { this.sideState[side] = 1; return true; }
    }
    this.sideState[side] = 0; return false;
  }

  private intersects(tree: TriangleTree, node: BoundsNode): boolean {
    for (let i = 0; i < this.planeCount; i++) {
      const { normal: n, constant: c } = this.planes[i]!;
      const distance = n.x * (n.x >= 0 ? node.maxX : node.minX)
        + n.y * (n.y >= 0 ? node.maxY : node.minY) + n.z * (n.z >= 0 ? node.maxZ : node.minZ) + c;
      if (distance < -1e-8) return false;
    }
    if (node.left && node.right) return this.intersects(tree, node.left) || this.intersects(tree, node.right);
    for (let i = node.start; i < node.end; i += 3) if (this.triangle(tree, i)) return true;
    return false;
  }

  private triangle(tree: TriangleTree, offset: number): boolean {
    let input = this.input, output = this.output, count = 3;
    for (let i = 0; i < 3; i++) {
      const p = tree.indices[offset + i]! * 3;
      input[i]!.set(tree.positions[p]!, tree.positions[p + 1]!, tree.positions[p + 2]!);
    }
    const a = input[0]!, b = input[1]!, c = input[2]!;
    const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z;
    const vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const facing = this.perspective ? nx * (this.eye.x - a.x) + ny * (this.eye.y - a.y) + nz * (this.eye.z - a.z)
      : -nx * this.forward.x - ny * this.forward.y - nz * this.forward.z;
    if (facing <= 1e-10) return false;
    for (let i = 0; i < this.planeCount; i++) {
      const plane = this.planes[i]!; let next = 0;
      for (let j = 0; j < count; j++) {
        const from = input[j]!, to = input[(j + 1) % count]!;
        const da = plane.distanceToPoint(from), db = plane.distanceToPoint(to);
        if (da >= 0) output[next++]!.copy(from);
        if ((da < 0) !== (db < 0)) output[next++]!.copy(from).lerp(to, da / (da - db));
      }
      count = next; const swap = input; input = output; output = swap;
      if (count < 3) return false;
    }
    // A surviving tangent point/edge must not remove a whole wall. Measure its
    // footprint on y=0, the surface whose visibility this feature protects.
    let area = 0, previous = input[count - 1]!;
    let scale = this.perspective ? this.eye.y / (this.eye.y - previous.y) : previous.y / this.forward.y;
    let px = this.perspective ? this.eye.x + (previous.x - this.eye.x) * scale : previous.x - scale * this.forward.x;
    let pz = this.perspective ? this.eye.z + (previous.z - this.eye.z) * scale : previous.z - scale * this.forward.z;
    for (let i = 0; i < count; i++) {
      const p = input[i]!;
      scale = this.perspective ? this.eye.y / (this.eye.y - p.y) : p.y / this.forward.y;
      const x = this.perspective ? this.eye.x + (p.x - this.eye.x) * scale : p.x - scale * this.forward.x;
      const z = this.perspective ? this.eye.z + (p.z - this.eye.z) * scale : p.z - scale * this.forward.z;
      area += px * z - x * pz; px = x; pz = z;
    }
    return Math.abs(area) > 1e-8;
  }
}
