import type { StoneKind } from '../sim/geology';

/** Presentation only; every type shares the same material, geometry and draw batches. */
export const STONE_COLORS: Readonly<Record<StoneKind, number>> = Object.freeze({
  granite: 0x99958d, limestone: 0xafad8b, marble: 0xc5c4b5, sandstone: 0xb99d76, slate: 0x737f83,
});
export const stoneColor = (stone?: StoneKind): number => stone ? STONE_COLORS[stone] : 0x899182;
