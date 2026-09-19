import type { World } from './types';

export interface RoomSpace {
  readonly kind: 'space';
  /** Derived from the first cell, valid only within this topology snapshot. */
  readonly id: number;
  readonly cellCount: number;
  readonly touchesMapEdge: boolean;
}
const SOLID = Object.freeze({ kind: 'solid' as const });
const DOORWAY = Object.freeze({ kind: 'doorway' as const });
export type RoomCell = RoomSpace | typeof SOLID | typeof DOORWAY;

/** Enclosures only: neither pathfinding nor an indoor/thermal/roof verdict. */
export class RoomTopology {
  readonly width: number;
  readonly height: number;
  private readonly labels: Int32Array;
  private readonly spaces: ReadonlyMap<number, RoomSpace>;
  constructor(
    width: number, height: number, labels: Int32Array, spaces: ReadonlyMap<number, RoomSpace>,
  ) { this.width = width; this.height = height; this.labels = labels; this.spaces = spaces; }

  allSpaces():Iterable<RoomSpace> { return this.spaces.values(); }

  at(x: number, z: number): RoomCell | undefined {
    if (!Number.isInteger(x) || !Number.isInteger(z) || x < 0 || z < 0 || x >= this.width || z >= this.height) return;
    const id = this.labels[z * this.width + x]!;
    return id === -1 ? SOLID : id === -2 ? DOORWAY : this.spaces.get(id);
  }
}

/** Caller-owned derived cache. Every read checks current barriers, including
 * in-place changes; never use tick or array identity as a topology revision.
 * Old returned snapshots remain valid after a rebuild. No per-frame work. */
export class RoomTopologyCache {
  private previous = new Uint8Array(0);
  private scratch = new Uint8Array(0);
  private queue = new Int32Array(0);
  private topology: RoomTopology | undefined;

  read(world: Pick<World, 'width' | 'height' | 'tiles' | 'structures'>): RoomTopology {
    const { width, height } = world, size = width * height;
    const resized = this.topology?.width !== width || this.topology?.height !== height;
    if (this.scratch.length !== size) {
      this.previous = new Uint8Array(size);
      this.scratch = new Uint8Array(size);
      this.queue = new Int32Array(size);
    }
    const mask = this.scratch;
    for (let i = 0; i < size; i++) mask[i] = world.tiles[i]!.terrain === 'rock' ? 1 : 0;
    // Current walls and doors have a 1x1 logical footprint. Plans, frames,
    // furniture, water, piles and people do not enclose air spaces.
    for (const building of world.structures) {
      if (building.kind === 'wall'||building.kind==='cooler') mask[building.z * width + building.x] = 1;
      else if (building.kind === 'door') mask[building.z * width + building.x] = 2;
    }
    let changed = resized;
    for (let i = 0; !changed && i < size; i++) changed = mask[i] !== this.previous[i];
    if (!changed) return this.topology!;

    const labels = new Int32Array(size), spaces = new Map<number, RoomSpace>();
    for (let i = 0; i < size; i++) if (mask[i]) labels[i] = -mask[i]!;
    const queue = this.queue;
    for (let root = 0; root < size; root++) {
      if (labels[root]) continue;
      const id = root + 1;
      let head = 0, tail = 1, touchesMapEdge = false;
      queue[0] = root; labels[root] = id;
      while (head < tail) {
        const index = queue[head++]!, x = index % width, z = Math.floor(index / width);
        if (x === 0 || z === 0 || x === width - 1 || z === height - 1) touchesMapEdge = true;
        if (x > 0 && !labels[index - 1]) { labels[index - 1] = id; queue[tail++] = index - 1; }
        if (x + 1 < width && !labels[index + 1]) { labels[index + 1] = id; queue[tail++] = index + 1; }
        if (z > 0 && !labels[index - width]) { labels[index - width] = id; queue[tail++] = index - width; }
        if (z + 1 < height && !labels[index + width]) { labels[index + width] = id; queue[tail++] = index + width; }
      }
      spaces.set(id, Object.freeze({ kind: 'space', id, cellCount: tail, touchesMapEdge }));
    }
    this.scratch = this.previous; this.previous = mask;
    return this.topology = new RoomTopology(width, height, labels, spaces);
  }
}
