import { BODY_TYPES, HEAD_TYPES, HAIR_STYLES, BEARD_STYLES, type PawnAppearance, type HairShape, type BeardShape } from '../sim/pawn-appearance';

/** Original voxel interpretations: reusable pieces, not the copyrighted Core sprites. */
export interface AppearancePart { size:readonly number[]; center:readonly number[] }
export const HAIR_PARTS:readonly AppearancePart[] = [
  {size:[.32,.09,.30],center:[0,1.355,-.015]}, // 0 crown
  {size:[.29,.15,.075],center:[0,1.245,-.14]}, // 1 nape
  {size:[.32,.08,.06],center:[0,1.30,.14]}, // 2 straight fringe
  {size:[.18,.105,.06],center:[-.065,1.32,.14]}, // 3 swept fringe
  {size:[.07,.24,.25],center:[-.15,1.22,-.03]}, // 4 side
  {size:[.07,.24,.25],center:[.15,1.22,-.03]}, // 5 side
  {size:[.30,.31,.08],center:[0,1.115,-.155]}, // 6 long back
  {size:[.16,.14,.16],center:[0,1.43,-.085]}, // 7 bun
  {size:[.09,.28,.12],center:[-.18,1.16,-.11]}, // 8 tail left
  {size:[.09,.28,.12],center:[.18,1.16,-.11]}, // 9 tail right
  {size:[.085,.19,.29],center:[0,1.405,-.015]}, // 10 crest
  {size:[.38,.17,.35],center:[0,1.38,-.025]}, // 11 volume
  {size:[.10,.08,.12],center:[-.10,1.43,.055]}, // 12 tousled lock
  {size:[.10,.065,.12],center:[.075,1.425,-.065]}, // 13 tousled lock
  {size:[.30,.028,.28],center:[0,1.35,-.01]}, // 14 shaved
];
export const BEARD_PARTS:readonly AppearancePart[] = [
  {size:[.20,.09,.045],center:[0,1.075,.155]},
  {size:[.16,.035,.04],center:[0,1.135,.164]},
  {size:[.085,.135,.055],center:[0,1.045,.165]},
  {size:[.042,.10,.10],center:[-.14,1.12,.09]},
  {size:[.042,.10,.10],center:[.14,1.12,.09]},
];
const bits=(...parts:number[])=>parts.reduce((n,i)=>n|2**i,0);
export const HAIR_MASKS:Record<HairShape,number>={
  short:bits(0,1),swept:bits(0,1,3),tails:bits(0,1,3,8,9),afro:bits(1,4,5,11),
  long:bits(0,2,4,5,6),bun:bits(0,1,7),messy:bits(0,1,3,12,13),
  wavy:bits(0,3,4,5,6,12),curly:bits(1,4,5,11,12,13),fringe:bits(0,1,2),
  bowl:bits(0,1,2,4,5),shaved:bits(14),mohawk:bits(10,14),
};
export const BEARD_MASKS:Record<BeardShape,number>={none:0,full:bits(0,1,3,4),goatee:bits(1,2),long:bits(0,1,2,3,4),moustache:bits(1),chops:bits(3,4),stubble:bits(0)};
export function appearanceShape(a:PawnAppearance):readonly [number,number,number,number] {
  return [BODY_TYPES.findIndex(b=>b.id===a.bodyType),HEAD_TYPES.findIndex(h=>h.id===a.headType),
    HAIR_MASKS[HAIR_STYLES.find(h=>h.id===a.hair)!.shape],BEARD_MASKS[BEARD_STYLES.find(b=>b.id===a.beard)!.shape]];
}
export const BODY_PROPORTIONS = [
  [1.10,1.00,1.00,1.00], [.94,.76,1.10,.94], [.78,.72,.80,.78], [1.38,1.15,1.12,1.22], [1.43,1.52,1.35,1.50],
] as const; // shoulder, waist, hip, depth; height and gameplay footprints unchanged

const PAWN_COLORS=[0xeab969,0x639eac,0xc57c65,0x809864,0xaa8db2];
export const pawnBaseColor=(id:number):number=>PAWN_COLORS[id%PAWN_COLORS.length]!;
