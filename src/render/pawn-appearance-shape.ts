import { BODY_TYPES, HEAD_TYPES, HAIR_STYLES, BEARD_STYLES, type PawnAppearance, type HairShape, type BeardShape } from '../sim/pawn-appearance';

/** Original voxel interpretations: reusable pieces, not the copyrighted Core sprites. */
export interface AppearancePart { size:readonly number[]; center:readonly number[] }
export const HAIR_PARTS:readonly AppearancePart[] = [
  {size:[.33,.095,.35],center:[0,1.358,-.010]}, // 0 crown joins the forward fringe and temples
  {size:[.34,.18,.10],center:[0,1.275,-.147]}, // 1 nape, wraps even wide jaws
  {size:[.17,.105,.035],center:[-.082,1.309,.181]}, // 2 left fringe bridges the crown
  {size:[.17,.095,.035],center:[.082,1.314,.181]}, // 3 right fringe; both clear the face
  {size:[.10,.15,.33],center:[-.164,1.290,-.005]}, // 4 short left temple, above nape base
  {size:[.10,.15,.33],center:[.164,1.290,-.005]}, // 5 short right temple
  {size:[.34,.40,.12],center:[0,1.120,-.155]}, // 6 long back extends below long side locks
  {size:[.16,.14,.16],center:[0,1.43,-.085]}, // 7 bun
  {size:[.09,.38,.33],center:[-.174,1.190,-.005]}, // 8 long left side / tail
  {size:[.09,.38,.33],center:[.174,1.190,-.005]}, // 9 long right side / tail
  {size:[.085,.19,.29],center:[0,1.405,-.015]}, // 10 crest
  {size:[.19,.095,.25],center:[0,1.440,-.025]}, // 11 raised crown intersects the base
  {size:[.105,.105,.09],center:[-.10,1.404,.19]}, // 12 front curl left, away from face
  {size:[.11,.085,.09],center:[.075,1.389,.19]}, // 13 front curl right
  {size:[.30,.028,.28],center:[0,1.35,-.01]}, // 14 shaved
];
export const BEARD_PARTS:readonly AppearancePart[] = [
  {size:[.22,.095,.05],center:[0,1.072,.185]},
  {size:[.17,.037,.045],center:[0,1.137,.184]},
  {size:[.09,.15,.065],center:[0,1.034,.190]},
  {size:[.08,.17,.255],center:[-.154,1.112,.067]},
  {size:[.08,.17,.255],center:[.154,1.112,.067]},
];
const bits=(...parts:number[])=>parts.reduce((n,i)=>n|2**i,0);
export const HAIR_MASKS:Record<HairShape,number>={
  short:bits(0,1,4,5),swept:bits(0,1,2,3,4,5),tails:bits(0,1,2,3,6,8,9),afro:bits(0,1,4,5,11,12,13),
  long:bits(0,1,2,3,6,8,9),bun:bits(0,1,7,4,5),messy:bits(0,1,2,3,4,5,12,13),
  wavy:bits(0,1,2,3,6,8,9,12),curly:bits(0,1,4,5,11,12,13),fringe:bits(0,1,2,3,4,5),
  bowl:bits(0,1,2,3,4,5),shaved:bits(14),mohawk:bits(10,14),
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
