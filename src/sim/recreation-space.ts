import { footprintCells } from './definitions.ts';
import { inBounds } from './pathfinding.ts';
import type { Cell, Structure, World } from './types.ts';
import type { RecreationTask } from './recreation-rules.ts';

/** Decision-local index: never reused after another actor can change the world. */
interface RecreationSpace {
  solids: Set<number>; walls: Set<number>; objects: Set<number>; resources?: Set<number>;
  pins: Map<number, Structure>;
}
export function recreationSpace(world: World, resourceTargets?: readonly Cell[]): RecreationSpace {
  const index: RecreationSpace = {solids:new Set(),walls:new Set(),objects:new Set(),pins:new Map()};
  for(const s of world.structures) {
    if(s.kind==='horseshoes')index.pins.set(s.id,s);
    for(const c of footprintCells(s))index.objects.add(c.z*world.width+c.x);
  }
  for(const job of world.jobs)index.objects.add(job.z*world.width+job.x);
  for(const s of [...world.structures,...world.jobs]) {
    if(s.kind==='wall')index.walls.add(s.z*world.width+s.x);
    if(s.kind==='wall'||s.kind==='table')for(const c of footprintCells(s))index.solids.add(c.z*world.width+c.x);
  }
  if(resourceTargets) {
    // At most 24 sky sites: retain only their obstacles, not a copy of the forest.
    const wanted=new Set(resourceTargets.map(c=>c.z*world.width+c.x));index.resources=new Set();
    for(const r of world.resources){const cell=r.z*world.width+r.x;if(wanted.has(cell))index.resources.add(cell);}
  }
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

/** Tiny straight throwing segment; furniture passability and sight differ.
 * Walls and natural rock hide the pin; a table across the ray does not. */
export function clearThrow(world: World, pin: Cell, cell: Cell, space?: RecreationSpace): boolean {
  const walls = space ? [] : [...world.structures, ...world.jobs].filter(s => s.kind === 'wall');
  const steps = Math.max(Math.abs(cell.x-pin.x), Math.abs(cell.z-pin.z));
  for (let i=1; i<=steps; i++) {
    const x=Math.round(pin.x+(cell.x-pin.x)*i/steps), z=Math.round(pin.z+(cell.z-pin.z)*i/steps);
    if (!inBounds(world,x,z) || world.tiles[z*world.width+x]!.terrain === 'rock' || (space ? space.walls.has(z*world.width+x) : walls.some(w => w.x===x && w.z===z))) return false;
  }
  return true;
}
export function standableRecreationCell(world: World, cell: Cell, space?: RecreationSpace): boolean {
  return inBounds(world,cell.x,cell.z) && !['rock','water'].includes(world.tiles[cell.z*world.width+cell.x]!.terrain)
    && !(space ? space.solids.has(cell.z*world.width+cell.x) : [...world.structures,...world.jobs].some(s => ['wall','table'].includes(s.kind) && footprintCells(s).some(c=>c.x===cell.x&&c.z===cell.z)));
}
export function recreationSiteValid(world: World, task: RecreationTask, space?: RecreationSpace): boolean {
  if (!standableRecreationCell(world,task.target,space)) return false;
  if(task.activity==='skygaze'&&space?.resources)return !space.objects.has(task.target.z*world.width+task.target.x)&&!space.resources.has(task.target.z*world.width+task.target.x);
  if (task.activity === 'skygaze') return !world.structures.some(s=>footprintCells(s).some(c=>c.x===task.target.x&&c.z===task.target.z))
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
  return world.structures.filter(s=>s.kind==='horseshoes'&&(users.get(s.id)??0)<3);
}
