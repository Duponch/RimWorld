/** One reference-space scale for the room, its table and the suspended frame.
 * The HTML reference uses a 6.02×3.45 table with a 5.89×3.32 surface.
 * Only the map fit chooses the scale; the cardboard volume remains independent. */
export interface RoomLayout {
  readonly span: number;
  readonly unit: number;
  readonly centerX: number;
  readonly centerZ: number;
  readonly floorY: number;
  readonly table: {
    readonly width: number; readonly depth: number;
    readonly surfaceWidth: number; readonly surfaceDepth: number;
    readonly topY: number; readonly minX: number; readonly maxX: number;
    readonly minZ: number; readonly maxZ: number;
  };
  readonly walls: {
    readonly westX: number; readonly eastX: number;
    readonly northZ: number; readonly southZ: number;
    readonly height: number; readonly ceilingY: number;
  };
  readonly floor: { readonly minX: number; readonly maxX: number; readonly minZ: number; readonly maxZ: number };
  readonly furniture: {
    readonly shelf: readonly [number, number]; readonly chair: readonly [number, number];
    readonly bed: readonly [number, number]; readonly stand: readonly [number, number];
  };
  readonly rig: {
    readonly halfWidth: number; readonly supportZ: number; readonly topY: number;
    readonly baseY: number; readonly rise: number; readonly centerZ: number; readonly moonRailOffsetZ: number;
  };
}

export function createRoomLayout(width: number, height: number): RoomLayout {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new RangeError('Room map dimensions must be finite and positive.');
  }
  const span = Math.min(width, height), centerX = (width - 1) / 2, centerZ = (height - 1) / 2;
  // The short table side admits a square map, cardboard and the four rig feet.
  const unit = Math.max((width + span * .14) / 5.89, (height + span * .14) / 3.32);
  const topY = -span * .049, floorY = topY - unit * 1.225;
  const westX = centerX - unit * 7.6, eastX = centerX + unit * 7.6;
  // Reference side-wall centres are at Z=-1; table centre at Z=.24.
  const northZ = centerZ - unit * 7.74, southZ = centerZ + unit * 7.26;
  return {
    span, unit, centerX, centerZ, floorY,
    table: { width: unit * 6.02, depth: unit * 3.45, surfaceWidth: unit * 5.89, surfaceDepth: unit * 3.32,
      topY, minX: centerX - unit * 3.01, maxX: centerX + unit * 3.01,
      minZ: centerZ - unit * 1.725, maxZ: centerZ + unit * 1.725 },
    walls: { westX, eastX, northZ, southZ, height: unit * 5, ceilingY: floorY + unit * 5 },
    floor: { minX: centerX - unit * 9.5, maxX: centerX + unit * 9.5,
      minZ: centerZ - unit * 11.64, maxZ: centerZ + unit * 8.36 },
    furniture: { shelf: [westX + unit * .95, northZ + unit * .3425],
      chair: [westX + unit * 2.45, northZ + unit * 4.35],
      bed: [eastX - unit * 2.95, northZ + unit * 1.92], stand: [eastX - unit * .70, northZ + unit * 1.65] },
    rig: { halfWidth: unit * 2.92, supportZ: unit * 1.58, topY: floorY + unit * 4.08,
      baseY: floorY + unit * 2.55, rise: unit * 1.63, centerZ, moonRailOffsetZ: -unit * .75 },
  };
}
