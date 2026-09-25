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
export const JOB_DURATION: Readonly<Record<JobKind, number>> = Object.freeze({ 'machining-table':300, grave:80, 'lay-floor':1, 'remove-floor':1, heater:100, 'wind-turbine':330, flick:15, 'power-conduit':3.5, 'power-switch':20, battery:80, 'solar-generator':250, 'fueled-stove':200, 'electric-stove':200, 'butcher-table':200, 'butcher-spot':0, cooler:160, 'research-bench':280,'tailor-bench':200,'electric-tailor-bench':250,'crafting-spot':0, repair:80, 'wood-generator':250, 'standing-lamp':30, 'passive-cooler':20, 'build-roof':4, 'remove-roof':4, door:60, stonecutter:200, mine:10, uninstall:12, install:1, deconstruct:1, chop:100, harvest:60, cut:60, sow:17, horseshoes:7, campfire:20, wall:70, bed:120, table:53,'table-square':150,'table-long':300,stool:32,'dining-chair':800,armchair:1400,'end-table':100,dresser:200,'flower-pot':25 });
export const JOB_WOOD_COST: Readonly<Record<JobKind, number>> = Object.freeze({ 'machining-table':0, grave:0, 'lay-floor':0, 'remove-floor':0, heater:0, 'wind-turbine':0, flick:0, 'power-conduit':0, 'power-switch':0, battery:0, 'solar-generator':0, 'fueled-stove':0, 'electric-stove':0, 'butcher-table':95, 'butcher-spot':0, cooler:0, 'research-bench':0,'tailor-bench':0,'electric-tailor-bench':0,'crafting-spot':0, repair:0, 'wood-generator':0, 'standing-lamp':0, 'passive-cooler':50, 'build-roof':0, 'remove-roof':0, door:25, stonecutter:0, mine:0, uninstall:0, install:0, deconstruct:0, chop:0, harvest:0, cut:0, sow:0, horseshoes:10, campfire:20, wall:5, bed:8, table:28,'table-square':50,'table-long':95,stool:25,'dining-chair':45,armchair:0,'end-table':30,dresser:50,'flower-pot':20 });
export const STRUCTURE_DEFINITIONS = Object.freeze({
  grave:Object.freeze({id:'grave',width:1,depth:2,blocksMovement:false}),
  heater:Object.freeze({id:'heater',width:1,depth:1,blocksMovement:false}),
  'wind-turbine':Object.freeze({id:'wind-turbine',width:7,depth:2,blocksMovement:false}),
  'power-conduit':Object.freeze({id:'power-conduit',width:1,depth:1,blocksMovement:false}),
  'power-switch':Object.freeze({id:'power-switch',width:1,depth:1,blocksMovement:false}),
  battery:Object.freeze({id:'battery',width:1,depth:2,blocksMovement:false}),
  'solar-generator':Object.freeze({id:'solar-generator',width:4,depth:4,blocksMovement:false}),
  'fueled-stove':Object.freeze({id:'fueled-stove',width:3,depth:1,blocksMovement:false}),
  'electric-stove':Object.freeze({id:'electric-stove',width:3,depth:1,blocksMovement:false}),
  'butcher-table':Object.freeze({id:'butcher-table',width:3,depth:1,blocksMovement:false}),
  'butcher-spot':Object.freeze({id:'butcher-spot',width:1,depth:1,blocksMovement:false}),
  cooler:Object.freeze({id:'cooler',width:1,depth:1,blocksMovement:true}),
  'research-bench':Object.freeze({id:'research-bench',width:3,depth:2,blocksMovement:false}),
  'tailor-bench':Object.freeze({id:'tailor-bench',width:3,depth:1,blocksMovement:false}),
  'machining-table':Object.freeze({id:'machining-table',width:3,depth:1,blocksMovement:false}),
  'electric-tailor-bench':Object.freeze({id:'electric-tailor-bench',width:3,depth:1,blocksMovement:false}),
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
  'table-square':Object.freeze({id:'table-square',width:2,depth:2,blocksMovement:false}),
  'table-long':Object.freeze({id:'table-long',width:2,depth:4,blocksMovement:false}),
  stool: Object.freeze({ id: 'stool', width: 1, depth: 1, blocksMovement: false }),
  'dining-chair':Object.freeze({id:'dining-chair',width:1,depth:1,blocksMovement:false}),
  armchair:Object.freeze({id:'armchair',width:1,depth:1,blocksMovement:false}),
  'end-table':Object.freeze({id:'end-table',width:1,depth:1,blocksMovement:false}),
  dresser:Object.freeze({id:'dresser',width:2,depth:1,blocksMovement:false}),
  'flower-pot':Object.freeze({id:'flower-pot',width:1,depth:1,blocksMovement:false}),
  bed: Object.freeze({ id: 'bed', width: 1, depth: 2, blocksMovement: false }),
});
type FootprintEntity = Cell & { kind: JobKind | StructureKind; deconstruction?: { kind: StructureKind }; flick?:{kind:StructureKind}; furniture?: { kind: StructureKind }; orientation?: Orientation; footprint?: Footprint };
const FOOTPRINT_DIRECTIONS = [[0, 1], [1, 0], [0, -1], [-1, 0]] as const;
/** Hot point query without allocating the footprint's array or cells. */
export function footprintContains(entity: FootprintEntity, cell: Cell): boolean {
  const dx=cell.x-entity.x,dz=cell.z-entity.z;
  if(dx===0&&dz===0)return true;
  // All current footprints fit this anchor-relative envelope, including the
  // 4×4 solar panel. Reject distant points before reading optional job payloads.
  if(dx < -3||dx > 3||dz < -3||dz > 3)return false;
  if(entity.kind==='wind-turbine'||entity.furniture?.kind==='wind-turbine'||entity.deconstruction?.kind==='wind-turbine'){const d=FOOTPRINT_DIRECTIONS[entity.orientation??0]!,side=FOOTPRINT_DIRECTIONS[((entity.orientation??0)+1)%4]!,along=dx*d[0]+dz*d[1],across=dx*side[0]+dz*side[1];return along>=0&&along<=1&&Math.abs(across)<=3;}
  if(entity.kind==='solar-generator'||entity.furniture?.kind==='solar-generator'||entity.deconstruction?.kind==='solar-generator')return dx>=0&&dx<4&&dz>=0&&dz<4;
  const kind=entity.furniture?.kind??entity.deconstruction?.kind??entity.flick?.kind??entity.kind;
  if(kind==='table-square'){const d=FOOTPRINT_DIRECTIONS[entity.orientation??0]!,side=FOOTPRINT_DIRECTIONS[((entity.orientation??0)+1)%4]!;return [0,1].some(a=>[0,1].some(b=>dx===d[0]*a+side[0]*b&&dz===d[1]*a+side[1]*b));}
  if(kind==='table-long'){const d=FOOTPRINT_DIRECTIONS[entity.orientation??0]!,side=FOOTPRINT_DIRECTIONS[((entity.orientation??0)+1)%4]!;return [0,1,2,3].some(a=>[0,1].some(b=>dx===d[0]*a+side[0]*b&&dz===d[1]*a+side[1]*b));}
  // All branches below occupy the anchor or its immediate neighbours.
  // Reject distant queries before reading optional payloads in large colonies.
  if(dx < -1||dx > 1||dz < -1||dz > 1)return false;
  if(kind==='wood-generator')return dx>=0&&dx<=1&&dz>=0&&dz<=1;
  if(kind==='research-bench'){const d=FOOTPRINT_DIRECTIONS[entity.orientation??0]!,side=FOOTPRINT_DIRECTIONS[((entity.orientation??0)+1)%4]!,along=dx*d[0]+dz*d[1],across=dx*side[0]+dz*side[1];return along>=0&&along<=1&&Math.abs(across)<=1;}
  if(kind==='dresser'){const d=FOOTPRINT_DIRECTIONS[entity.orientation??0]!;return dx===d[0]&&dz===d[1];}
  if(kind==='machining-table'||kind==='stonecutter'||kind==='tailor-bench'||kind==='electric-tailor-bench'||kind==='fueled-stove'||kind==='electric-stove'||kind==='butcher-table') {
    const d=FOOTPRINT_DIRECTIONS[((entity.orientation??0)+1)%4]!;
    return dx===d[0]&&dz===d[1]||dx===-d[0]&&dz===-d[1];
  }
  if((kind!=='bed'&&kind!=='table'&&kind!=='battery'&&kind!=='grave')||entity.footprint==='legacy-single')return false;
  const direction=FOOTPRINT_DIRECTIONS[entity.orientation??0]!;
  return dx===direction[0]&&dz===direction[1];
}
export function footprintCells(entity: FootprintEntity): Cell[] {
  const cells = [{ x: entity.x, z: entity.z }];
  const kind=entity.furniture?.kind??entity.deconstruction?.kind??entity.flick?.kind??entity.kind;
  if(kind==='wind-turbine'){const d=FOOTPRINT_DIRECTIONS[entity.orientation??0]!,side=FOOTPRINT_DIRECTIONS[((entity.orientation??0)+1)%4]!;return [0,1].flatMap(a=>[-3,-2,-1,0,1,2,3].map(b=>({x:entity.x+d[0]*a+side[0]*b,z:entity.z+d[1]*a+side[1]*b})));}
  if(kind==='solar-generator')return Array.from({length:16},(_,i)=>({x:entity.x+i%4,z:entity.z+Math.floor(i/4)}));
  if(kind==='table-square'){const d=FOOTPRINT_DIRECTIONS[entity.orientation??0]!,side=FOOTPRINT_DIRECTIONS[((entity.orientation??0)+1)%4]!;return [0,1].flatMap(a=>[0,1].map(b=>({x:entity.x+d[0]*a+side[0]*b,z:entity.z+d[1]*a+side[1]*b})));}
  if(kind==='table-long'){const d=FOOTPRINT_DIRECTIONS[entity.orientation??0]!,side=FOOTPRINT_DIRECTIONS[((entity.orientation??0)+1)%4]!;return [0,1,2,3].flatMap(a=>[0,1].map(b=>({x:entity.x+d[0]*a+side[0]*b,z:entity.z+d[1]*a+side[1]*b})));}
  if(kind==='wood-generator')return [...cells,{x:entity.x+1,z:entity.z},{x:entity.x,z:entity.z+1},{x:entity.x+1,z:entity.z+1}];
  if(kind==='research-bench'){const d=FOOTPRINT_DIRECTIONS[entity.orientation??0]!,side=FOOTPRINT_DIRECTIONS[((entity.orientation??0)+1)%4]!;return [0,1].flatMap(a=>[-1,0,1].map(b=>({x:entity.x+d[0]*a+side[0]*b,z:entity.z+d[1]*a+side[1]*b})));}
  if(kind==='dresser'){const d=FOOTPRINT_DIRECTIONS[entity.orientation??0]!;return [...cells,{x:entity.x+d[0],z:entity.z+d[1]}];}
  if(kind==='machining-table'||kind==='stonecutter'||kind==='tailor-bench'||kind==='electric-tailor-bench'||kind==='fueled-stove'||kind==='electric-stove'||kind==='butcher-table') {
    const d=FOOTPRINT_DIRECTIONS[((entity.orientation??0)+1)%4]!;
    return [...cells,{x:entity.x-d[0],z:entity.z-d[1]},{x:entity.x+d[0],z:entity.z+d[1]}];
  }
  if ((kind !== 'bed' && kind !== 'table' && kind !== 'battery' && kind !== 'grave') || entity.footprint === 'legacy-single') return cells;
  const direction = FOOTPRINT_DIRECTIONS[entity.orientation ?? 0]!;
  cells.push({ x: entity.x + direction[0]!, z: entity.z + direction[1]! });
  return cells;
}
