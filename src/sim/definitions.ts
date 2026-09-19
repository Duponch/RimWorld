import type { Cell, Footprint, JobKind, Orientation, StructureKind } from './types.ts';

/** Immutable historical catalogue. Typed V30 construction recipes live in
 * construction-materials.ts; retain these values for untyped saved objects. */
export const MAX_STACK = 75;
export const CARRY_CAPACITY = 10;
export const MATERIAL_DEFINITIONS = Object.freeze({
  component: Object.freeze({id:'component',label:'Composants',unit:'unit',stackLimit:50}),
  steel: Object.freeze({id:'steel',label:'Acier',unit:'unit',stackLimit:MAX_STACK}),
  chunk: Object.freeze({id:'chunk',label:'Fragments de roche',unit:'fragment',stackLimit:1}),
  wood: Object.freeze({ id: 'wood', label: 'Bois', unit: 'unit', stackLimit: MAX_STACK }),
  food: Object.freeze({ id: 'food', label: 'Nourriture', unit: 'portion', stackLimit: MAX_STACK, chairSearchRadius: 32, tableDesired: true }),
});
export const JOB_DURATION: Readonly<Record<JobKind, number>> = Object.freeze({ 'research-bench':280,'tailor-bench':200,'crafting-spot':0, repair:80, 'wood-generator':250, 'standing-lamp':30, 'passive-cooler':20, 'build-roof':4, 'remove-roof':4, door:60, stonecutter:200, mine:10, uninstall:12, install:1, deconstruct: 1, chop: 100, harvest: 60, cut: 60, sow: 17, horseshoes: 7, campfire: 20, wall: 70, bed: 120, table: 53, stool: 32 });
export const JOB_WOOD_COST: Readonly<Record<JobKind, number>> = Object.freeze({ 'research-bench':0,'tailor-bench':0,'crafting-spot':0, repair:0, 'wood-generator':0, 'standing-lamp':0, 'passive-cooler':50, 'build-roof':0, 'remove-roof':0, door:25, stonecutter:0, mine:0, uninstall:0, install:0, deconstruct: 0, chop: 0, harvest: 0, cut: 0, sow: 0, horseshoes: 10, campfire: 20, wall: 5, bed: 8, table: 28, stool: 25 });
export const STRUCTURE_DEFINITIONS = Object.freeze({
  'research-bench':Object.freeze({id:'research-bench',width:3,depth:2,blocksMovement:false}),
  'tailor-bench':Object.freeze({id:'tailor-bench',width:3,depth:1,blocksMovement:false}),
  'crafting-spot':Object.freeze({id:'crafting-spot',width:1,depth:1,blocksMovement:false}),
  'wood-generator': Object.freeze({id:'wood-generator',width:2,depth:2,blocksMovement:false}),
  'standing-lamp': Object.freeze({id:'standing-lamp',width:1,depth:1,blocksMovement:false}),
  'passive-cooler': Object.freeze({ id:'passive-cooler', width:1, depth:1, blocksMovement:false }),
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
  // All branches below occupy the anchor or its immediate neighbours.
  // Reject distant queries before reading optional payloads in large colonies.
  if(dx < -1||dx > 1||dz < -1||dz > 1)return false;
  const kind=entity.furniture?.kind??entity.deconstruction?.kind??entity.kind;
  if(kind==='wood-generator')return dx>=0&&dx<=1&&dz>=0&&dz<=1;
  if(kind==='research-bench'){const d=FOOTPRINT_DIRECTIONS[entity.orientation??0]!,side=FOOTPRINT_DIRECTIONS[((entity.orientation??0)+1)%4]!,along=dx*d[0]+dz*d[1],across=dx*side[0]+dz*side[1];return along>=0&&along<=1&&Math.abs(across)<=1;}
  if(kind==='stonecutter'||kind==='tailor-bench') {
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
  if(kind==='wood-generator')return [...cells,{x:entity.x+1,z:entity.z},{x:entity.x,z:entity.z+1},{x:entity.x+1,z:entity.z+1}];
  if(kind==='research-bench'){const d=FOOTPRINT_DIRECTIONS[entity.orientation??0]!,side=FOOTPRINT_DIRECTIONS[((entity.orientation??0)+1)%4]!;return [0,1].flatMap(a=>[-1,0,1].map(b=>({x:entity.x+d[0]*a+side[0]*b,z:entity.z+d[1]*a+side[1]*b})));}
  if(kind==='stonecutter'||kind==='tailor-bench') {
    const d=FOOTPRINT_DIRECTIONS[((entity.orientation??0)+1)%4]!;
    return [...cells,{x:entity.x-d[0],z:entity.z-d[1]},{x:entity.x+d[0],z:entity.z+d[1]}];
  }
  if ((kind !== 'bed' && kind !== 'table') || entity.footprint === 'legacy-single') return cells;
  const direction = FOOTPRINT_DIRECTIONS[entity.orientation ?? 0]!;
  cells.push({ x: entity.x + direction[0]!, z: entity.z + direction[1]! });
  return cells;
}
