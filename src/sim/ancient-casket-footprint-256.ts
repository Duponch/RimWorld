import type {Cell,Orientation} from './types.ts';
const dirs=[[0,1],[1,0],[0,-1],[-1,0]] as const;
/** Even-sized Core occupied rect follows the positive axis except South/West,
 * matching the existing 1×2 anchor convention; this is not a sarcophagus alias. */
export function ancientCasketCells256(at:Cell,rotation:Orientation):Cell[]{const d=dirs[rotation]!;return [{x:at.x,z:at.z},{x:at.x+d[0],z:at.z+d[1]}];}
