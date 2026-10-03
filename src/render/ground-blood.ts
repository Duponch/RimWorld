import type { FilthRecord } from '../sim/filth-rules';

type Stain = Pick<FilthRecord, 'id'|'x'|'z'|'thickness'>;
export const GRASS_BLOOD_COLOR = 0x832222;

/** Grass already reads one colour per logical cell. Bake the blood tint into
 * that existing RGBA field, rather than adding a shader branch or a sampler.
 * This deliberately represents a stained cell, not a second per-blade decal. */
export class GroundBlood {
  readonly cells = new Map<number, number>();
  private previous: Stain[] = [];
  private width = 0;
  private height = 0;

  adopt(items: readonly FilthRecord[], width: number, height: number): number[] {
    let ordinal = 0, same = width === this.width && height === this.height;
    for (const f of items) if (f.kind === 'blood') {
      const p = this.previous[ordinal++];
      if (!p || p.id !== f.id || p.x !== f.x || p.z !== f.z || p.thickness !== f.thickness) same = false;
    }
    if (same && ordinal === this.previous.length) return [];
    const oldCells = new Map(this.cells);
    this.cells.clear(); this.previous.length = 0;
    for (const f of items) if (f.kind === 'blood') {
      this.previous.push({id:f.id,x:f.x,z:f.z,thickness:f.thickness});
      if (f.x < 0 || f.z < 0 || f.x >= width || f.z >= height) continue;
      const i = f.z * width + f.x;
      this.cells.set(i, Math.min(5, (this.cells.get(i) ?? 0) + f.thickness));
    }
    this.width = width; this.height = height;
    const changed: number[] = [];
    for (const [i, thickness] of oldCells) {
      if (i >= 0 && i < width * height && this.cells.get(i) !== thickness) changed.push(i);
    }
    for (const i of this.cells.keys()) if (!oldCells.has(i)) changed.push(i);
    return changed;
  }
}

export function grassBloodOpacity(thickness: number): number {
  return thickness > 0 ? Math.min(.8, .5 + (thickness - 1) * .075) : 0;
}
