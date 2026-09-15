import type { Cell, Footprint, JobKind, Orientation, StructureKind } from './types.ts';

/** Immutable historical catalogue. Typed V30 construction recipes live in
 * construction-materials.ts; retain these values for untyped saved objects. */
export const MAX_STACK = 75;
export const CARRY_CAPACITY = 10;
export const MATERIAL_DEFINITIONS = Object.freeze({
  steel: Object.freeze({id:'steel',label:'Acier',unit:'unit',stackLimit:MAX_STACK}),
  chunk: Object.freeze({id:'chunk',label:'Fragments de roche',unit:'fragment',stackLimit:1}),
  wood: Object.freeze({ id: 'wood', label: 'Bois', unit: 'unit', stackLimit: MAX_STACK }),
  food: Object.freeze({ id: 'food', label: 'Nourriture', unit: 'portion', stackLimit: MAX_STACK, chairSearchRadius: 32, tableDesired: true }),
});
export const JOB_DURATION: Readonly<Record<JobKind, number>> = Object.freeze({ door:60, stonecutter:200, mine:10, uninstall:12, install:1, deconstruct: 1, chop: 100, harvest: 60, cut: 60, sow: 17, horseshoes: 7, campfire: 20, wall: 70, bed: 120, table: 53, stool: 32 });
export const JOB_WOOD_COST: Readonly<Record<JobKind, number>> = Object.freeze({ door:25, stonecutter:0, mine:0, uninstall:0, install:0, deconstruct: 0, chop: 0, harvest: 0, cut: 0, sow: 0, horseshoes: 10, campfire: 20, wall: 5, bed: 8, table: 28, stool: 25 });
export const STRUCTURE_DEFINITIONS = Object.freeze({
  door: Object.freeze({ id:'door', width:1, depth:1, blocksMovement:false }),
  stonecutter: Object.freeze({ id: 'stonecutter', width: 3, depth: 1, blocksMovement: false }),
  horseshoes: Object.freeze({ id: 'horseshoes', width: 1, depth: 1, blocksMovement: false }),
  campfire: Object.freeze({ id: 'campfire', width: 1, depth: 1, blocksMovement: false }),
  wall: Object.freeze({ id: 'wall', width: 1, depth: 1, blocksMovement: true }),
  table: Object.freeze({ id: 'table', width: 1, depth: 2, blocksMovement: false }),
  stool: Object.freeze({ id: 'stool', width: 1, depth: 1, blocksMovement: false }),
  bed: Object.freeze({ id: 'bed', width: 1, depth: 2, blocksMovement: false }),
});
type FootprintEntity = Cell & { kind: JobKind | StructureKind; deconstruction?: { kind: StructureKind }; furniture?: { kind: StructureKind }; orientation?: Orientation; footprint?: Footprint };
const FOOTPRINT_DIRECTIONS = [[0, 1], [1, 0], [0, -1], [-1, 0]] as const;
/** Hot point query without allocating the footprint's array or cells. */
export function footprintContains(entity: FootprintEntity, cell: Cell): boolean {
  const dx=cell.x-entity.x,dz=cell.z-entity.z;
  if(dx===0&&dz===0)return true;
  const kind=entity.furniture?.kind??entity.deconstruction?.kind??entity.kind;
  if(kind==='stonecutter') {
    const d=FOOTPRINT_DIRECTIONS[((entity.orientation??0)+1)%4]!;
    return dx===d[0]&&dz===d[1]||dx===-d[0]&&dz===-d[1];
  }
  if((kind!=='bed'&&kind!=='table')||entity.footprint==='legacy-single')return false;
  const direction=FOOTPRINT_DIRECTIONS[entity.orientation??0]!;
  return dx===direction[0]&&dz===direction[1];
}
export function footprintCells(entity: FootprintEntity): Cell[] {
  const cells = [{ x: entity.x, z: entity.z }];
  const kind=entity.furniture?.kind??entity.deconstruction?.kind??entity.kind;
  if(kind==='stonecutter') {
    const d=FOOTPRINT_DIRECTIONS[((entity.orientation??0)+1)%4]!;
    return [...cells,{x:entity.x-d[0],z:entity.z-d[1]},{x:entity.x+d[0],z:entity.z+d[1]}];
  }
  if ((kind !== 'bed' && kind !== 'table') || entity.footprint === 'legacy-single') return cells;
  const direction = FOOTPRINT_DIRECTIONS[entity.orientation ?? 0]!;
  cells.push({ x: entity.x + direction[0]!, z: entity.z + direction[1]! });
  return cells;
}
