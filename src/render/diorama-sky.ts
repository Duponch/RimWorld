import { Vector4 } from 'three/webgpu';
import { attribute, positionLocal, renderGroup, uniform, vec3 } from 'three/tsl';

/** The two slides stay inside the box and behind its permanent lower rim.
 * Coordinates are authored at their highest position; motion only lowers them. */
export const DIORAMA_SKY = {
  center: .163, sunRadius: .018, moonRadius: .021,
  sunTravel: .247, moonTravel: .235, floor: -.043,
} as const;

/** A single resident vertex attribute and one tiny uniform block. No vertex
 * uploads, new draws, independent clock, lights or animation objects. */
export class DioramaSkyMotion {
  readonly offsets = uniform(new Vector4(0, 0, 0, 1)).setGroup(renderGroup);
  readonly positionNode;
  private lastElevation = NaN;
  private lastSpan = NaN;

  constructor() {
    const kind = attribute('dioramaCelestial', 'float');
    const offset = kind.greaterThan(0).select(this.offsets.x, this.offsets.y);
    const movingY = this.offsets.w.greaterThan(0).select(positionLocal.y.add(offset).max(this.offsets.z), this.offsets.z);
    const y = kind.notEqual(0).select(movingY, positionLocal.y);
    this.positionNode = vec3(positionLocal.x, y, positionLocal.z);
  }

  present(elevation: number, span: number): void {
    if (elevation === this.lastElevation && span === this.lastSpan) return;
    this.lastElevation = elevation; this.lastSpan = span;
    const sun = Math.max(0, Math.min(1, elevation * Math.SQRT2));
    const moon = Math.max(0, Math.min(1, -elevation * Math.SQRT2));
    this.offsets.value.set((sun - 1) * DIORAMA_SKY.sunTravel * span,
      (moon - 1) * DIORAMA_SKY.moonTravel * span, DIORAMA_SKY.floor * span, this.offsets.value.w);
  }
}
