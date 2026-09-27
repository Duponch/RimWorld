import { deconstructionReserved } from './deconstruction-rules.ts';
import { canStandAt } from './furniture-travel.ts';
import { isRoofed, roofIndex } from './roof-rules.ts';
import { footprintCells, footprintContains } from './definitions.ts';
import { isDiningSeat, isDiningTable } from './dining.ts';
import { canSocialize } from './social.ts';
import { inBounds } from './pathfinding.ts';
import type { Cell, Pawn, Structure, World } from './types.ts';
import type { RecreationTask } from './recreation-rules.ts';

/** Decision-local index: never reused after another actor can change the world. */
interface RecreationSpace {
  solids: Set<number>; walls: Set<number>; objects: Set<number>; resources?: Set<number>;
  pins: Map<number, Structure>; games: Map<number, Structure>; seats: Map<number, Structure>;
  gathers: Map<number, Structure>; patients?: Map<number,Pawn>;
}
export function recreationSpace(world: World, resourceTargets?: readonly Cell[], includePatients=false): RecreationSpace {
  const index: RecreationSpace = {solids:new Set(),walls:new Set(),objects:new Set(),pins:new Map(),games:new Map(),seats:new Map(),gathers:new Map()};
  for(const s of world.structures) {
    if(s.kind==='horseshoes')index.pins.set(s.id,s);
    if(s.kind==='chess-table')index.games.set(s.id,s);
    if(isGatherSpot(s)&&gatherActive(s))index.gathers.set(s.id,s);
    if(isDiningSeat(s.kind))index.seats.set(s.z*world.width+s.x,s);
    for(const c of footprintCells(s))index.objects.add(c.z*world.width+c.x);
  }
  for(const job of world.jobs)index.objects.add(job.z*world.width+job.x);
  for(const s of [...world.structures,...world.jobs]) {
    if(!('status' in s)&&((s.kind==='wall'||s.kind==='cooler')||s.kind==='door'&&!s.door!.open))index.walls.add(s.z*world.width+s.x);
    if((s.kind==='wall'||s.kind==='cooler')||isDiningTable(s.kind)||s.kind==='chess-table'||world.schemaVersion>=22&&(!('status' in s)&&(s.kind==='passive-cooler'||s.kind==='bed'||s.kind==='campfire'||s.kind==='stonecutter'||s.kind==='research-bench'||s.kind==='tailor-bench')||'construction' in s&&s.construction==='frame'))for(const c of footprintCells(s))index.solids.add(c.z*world.width+c.x);
  }
  // Match the direct standability check: chunks permit transit, not stopping.
  if(world.schemaVersion>=28)for(const p of world.piles)if(p.kind==='chunk'&&p.owner.type==='ground')index.solids.add(p.owner.z*world.width+p.owner.x);
  if(resourceTargets) {
    // At most 24 sky sites: retain only their obstacles, not a copy of the forest.
    const wanted=new Set(resourceTargets.map(c=>c.z*world.width+c.x));index.resources=new Set();
    for(const r of world.resources){const cell=r.z*world.width+r.x;if(wanted.has(cell))index.resources.add(cell);}
  }
  if(includePatients){index.patients=new Map();for(const p of world.pawns)if(visitablePatient(world,p,false))index.patients.set(p.id,p);}
  return index;
}

export function horseshoeCells(pin: Cell): Cell[] {
  const cells: Cell[] = [];
  for (const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) for (const offset of [-1,0,1])
    cells.push({x: pin.x + dx! * 5 + dz! * offset, z: pin.z + dz! * 5 + dx! * offset});
  return cells;
}
export const isHorseshoeCell = (pin: Cell, cell: Cell): boolean => {
  const dx = Math.abs(pin.x-cell.x), dz = Math.abs(pin.z-cell.z);
  return dx === 5 && dz <= 1 || dz === 5 && dx <= 1;
};
export const chessCells = (table: Cell): Cell[] => [
  {x:table.x-1,z:table.z},{x:table.x+1,z:table.z},
  {x:table.x,z:table.z-1},{x:table.x,z:table.z+1},
];
export const isChessCell = (table: Cell, cell: Cell): boolean => Math.abs(table.x-cell.x)+Math.abs(table.z-cell.z)===1;
export const isGatherSpot = (s:Structure):boolean => isDiningTable(s.kind)||s.kind==='campfire';
export const gatherActive = (s:Structure):boolean => s.gatherSpot!==false&&(s.kind!=='campfire'||!!s.fuel?.ticks&&s.power?.switchOn!==false);
export const adjacentToTable = (table:Structure,cell:Cell):boolean => footprintCells(table).some(part=>Math.abs(part.x-cell.x)+Math.abs(part.z-cell.z)===1);
export const visitablePatient = (world:World,p:Pawn,requireLowJoy=true):boolean => {
  const need=p.need;
  return need?.kind==='sleep'&&!!need.medical&&need.phase==='sleep'&&need.bedId!==null
    &&p.x===need.target.x&&p.z===need.target.z&&world.structures.some(s=>s.id===need.bedId&&s.kind==='bed'&&s.medical===true&&s.x===p.x&&s.z===p.z)
    &&p.state==='resting'&&(!requireLowJoy||p.recreation.level<=35)&&p.hunger>0&&p.rest>=33&&canSocialize(world,p,false);
};
export const visitPatient = (world:World,id:number,requireLowJoy=true):Pawn|undefined => world.pawns.find(p=>p.id===id&&visitablePatient(world,p,requireLowJoy));
export const nearVisitPatient = (patient:Pawn,cell:Cell):boolean => (patient.x-cell.x)**2+(patient.z-cell.z)**2<=5&&!(patient.x===cell.x&&patient.z===cell.z);

/** Tiny straight throwing segment; furniture passability and sight differ.
 * Walls and natural rock hide the pin; a table across the ray does not. */
export function clearThrow(world: World, pin: Cell, cell: Cell, space?: RecreationSpace): boolean {
  const walls = space ? [] : world.structures.filter(s => (s.kind === 'wall'||s.kind==='cooler')||s.kind==='door'&&!s.door!.open);
  const steps = Math.max(Math.abs(cell.x-pin.x), Math.abs(cell.z-pin.z));
  for (let i=1; i<=steps; i++) {
    const x=Math.round(pin.x+(cell.x-pin.x)*i/steps), z=Math.round(pin.z+(cell.z-pin.z)*i/steps);
    if (!inBounds(world,x,z) || world.tiles[z*world.width+x]!.terrain === 'rock' || (space ? space.walls.has(z*world.width+x) : walls.some(w => w.x===x && w.z===z))) return false;
  }
  return true;
}
export function standableRecreationCell(world: World, cell: Cell, space?: RecreationSpace): boolean {
  return (world.schemaVersion<22||space||canStandAt(world,cell))&&inBounds(world,cell.x,cell.z) && !['rock','water'].includes(world.tiles[cell.z*world.width+cell.x]!.terrain)
    && !(space ? space.solids.has(cell.z*world.width+cell.x) : world.structures.some(s=>['wall','table'].includes(s.kind)&&footprintContains(s,cell))||world.jobs.some(s=>['wall','table'].includes(s.kind)&&footprintContains(s,cell)));
}
export function recreationSiteValid(world: World, task: RecreationTask, space?: RecreationSpace): boolean {
  if(task.activity==='skygaze'&&isRoofed(world,roofIndex(world,task.target)))return false;
  if (!standableRecreationCell(world,task.target,space)) return false;
  if(task.activity==='chess') {
    const table=space?space.games.get(task.buildingId!):world.structures.find(s=>s.id===task.buildingId&&s.kind==='chess-table');
    const seat=space?space.seats.get(task.target.z*world.width+task.target.x):world.structures.find(s=>s.id===task.seatId&&(s.kind==='stool'||s.kind==='dining-chair'||s.kind==='armchair'));
    return !!table&&!!seat&&seat.id===task.seatId&&seat.x===task.target.x&&seat.z===task.target.z&&isChessCell(table,seat)
      &&!deconstructionReserved(world,table.id)&&!deconstructionReserved(world,seat.id);
  }
  if(task.activity==='social-relax') {
    const spot=space?space.gathers.get(task.buildingId!):world.structures.find(s=>s.id===task.buildingId&&isGatherSpot(s)&&gatherActive(s));
    if(!spot||!isGatherSpot(spot)||!gatherActive(spot)||deconstructionReserved(world,spot.id))return false;
    const seat=task.seatId===undefined?undefined:space?space.seats.get(task.target.z*world.width+task.target.x):world.structures.find(s=>s.id===task.seatId&&isDiningSeat(s.kind));
    if(spot.kind!=='campfire')return !!seat&&seat.id===task.seatId&&seat.x===task.target.x&&seat.z===task.target.z&&adjacentToTable(spot,task.target)&&!deconstructionReserved(world,seat.id);
    if((spot.x-task.target.x)**2+(spot.z-task.target.z)**2>15||!clearThrow(world,spot,task.target,space))return false;
    return seat?seat.id===task.seatId&&seat.x===task.target.x&&seat.z===task.target.z&&!deconstructionReserved(world,seat.id)
      :task.seatId===undefined&&!(space?space.objects.has(task.target.z*world.width+task.target.x):world.structures.some(s=>footprintContains(s,task.target))||world.jobs.some(j=>footprintContains(j,task.target)));
  }
  if(task.activity==='visit-sick') {
    const patient=space?.patients?space.patients.get(task.patientId!):visitPatient(world,task.patientId!,false);
    if(!patient||!nearVisitPatient(patient,task.target)||!clearThrow(world,patient,task.target,space))return false;
    const seat=task.seatId===undefined?undefined:space?space.seats.get(task.target.z*world.width+task.target.x):world.structures.find(s=>s.id===task.seatId&&isDiningSeat(s.kind));
    return seat?seat.id===task.seatId&&seat.x===task.target.x&&seat.z===task.target.z&&!deconstructionReserved(world,seat.id)
      :task.seatId===undefined&&!(space?space.objects.has(task.target.z*world.width+task.target.x):world.structures.some(s=>footprintContains(s,task.target))||world.jobs.some(j=>footprintContains(j,task.target)));
  }
  if(task.activity==='skygaze'&&space?.resources)return !space.objects.has(task.target.z*world.width+task.target.x)&&!space.resources.has(task.target.z*world.width+task.target.x);
  if (task.activity === 'skygaze') return !world.structures.some(s=>footprintContains(s,task.target))
    && !world.jobs.some(s=>s.x===task.target.x&&s.z===task.target.z)
    && !world.resources.some(r=>r.x===task.target.x&&r.z===task.target.z);
  const pin=space ? space.pins.get(task.buildingId!) : world.structures.find(s=>s.id===task.buildingId&&s.kind==='horseshoes');
  return !!pin && isHorseshoeCell(pin,task.target) && clearThrow(world,pin,task.target,space);
}
export function availablePins(world: World, pawnId: number): Structure[] {
  const users=new Map<number,number>();
  for(const p of world.pawns)if(p.id!==pawnId&&p.recreation?.task?.buildingId!=null) {
    const id=p.recreation.task.buildingId;users.set(id,(users.get(id)??0)+1);
  }
  return world.structures.filter(s=>s.kind==='horseshoes'&&!deconstructionReserved(world,s.id,pawnId)&&(users.get(s.id)??0)<3);
}
export function availableChessTables(world:World,pawnId:number):Structure[] {
  const users=new Map<number,number>();
  for(const p of world.pawns)if(p.id!==pawnId&&p.recreation?.task?.activity==='chess') {
    const id=p.recreation.task.buildingId!;users.set(id,(users.get(id)??0)+1);
  }
  return world.structures.filter(s=>s.kind==='chess-table'&&!deconstructionReserved(world,s.id,pawnId)&&(users.get(s.id)??0)<2);
}
