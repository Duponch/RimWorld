import type { StoneKind } from '../sim/geology';

/** Presentation only; every type shares the same material, geometry and draw batches. */
export const STONE_COLORS: Readonly<Record<StoneKind, number>> = Object.freeze({
  granite: 0x99958d, limestone: 0xafad8b, marble: 0xc5c4b5, sandstone: 0xb99d76, slate: 0x737f83,
});
export const stoneColor = (stone?: StoneKind): number => stone ? STONE_COLORS[stone] : 0x899182;

// A pile already consists of several BoxBatches instances. Varying their
// resident colour values gives its blocks broad warm/cool painted planes while
// keeping the same geometry, shared map, instance buffer and draw call.
const PILE_WASHES = [
  [0xf4e5cc,0.27], [0x82939a,0.23], [0xe9e3d5,0.20],
  [0xa88b75,0.19], [0xd6e4e7,0.24],
] as const;
export function stonePileColor(base:number,x:number,z:number,part:number):number {
  const phase=(Math.imul(Math.round(x),37)^Math.imul(Math.round(z),53))>>>0;
  const [wash,amount]=PILE_WASHES[(phase+part)%PILE_WASHES.length]!;
  const blend=(shift:number):number=>Math.round(((base>>shift)&255)*(1-amount)+((wash>>shift)&255)*amount);
  return (blend(16)<<16)|(blend(8)<<8)|blend(0);
}
