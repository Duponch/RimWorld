import { PathFrontier } from './PathFrontier.ts';
import { CARDINAL_COST, DIAGONAL_COST } from './movement.ts';
import type { Cell, World } from './types.ts';
import { footprintCells } from './definitions.ts';

export const cellIndex = (world: World, x: number, z: number): number => z * world.width + x;
export const inBounds = (world: World, x: number, z: number): boolean =>
  Number.isInteger(x) && Number.isInteger(z) && x >= 0 && z >= 0 && x < world.width && z < world.height;
export const adjacent = (a: Cell, b: Cell): boolean => Math.abs(a.x - b.x) + Math.abs(a.z - b.z) === 1;

/** Walls under construction also exclude traffic, so completing one cannot entomb a pawn. */
export function blockedCells(world: World): Uint8Array {
  const blocked = new Uint8Array(world.width * world.height);
  for (let i = 0; i < world.tiles.length; i++) {
    const terrain = world.tiles[i]!.terrain;
    if (terrain === 'water' || terrain === 'rock') blocked[i] = 1;
  }
  for (const structure of world.structures) {
    if (structure.kind === 'wall' || structure.kind === 'table') for (const cell of footprintCells(structure)) blocked[cellIndex(world, cell.x, cell.z)] = 1;
  }
  for (const job of world.jobs) {
    if (job.kind === 'wall' || job.kind === 'table') for (const cell of footprintCells(job)) blocked[cellIndex(world, cell.x, cell.z)] = 1;
  }
  return blocked;
}

export interface Reachability { parents: Int32Array; costs: Float64Array; start: number }
export const routeCost = (world: World, path: Cell[], reach: Reachability): number => path.length ? reach.costs[cellIndex(world,path[path.length-1]!.x,path[path.length-1]!.z)]! : 0;
/** Solid 3D corners require both side cells clear, including temporary traffic. */
export function canStep(world:World,from:Cell,to:Cell,blocked:Uint8Array,occupied:Set<number>):boolean {
  const dx=to.x-from.x,dz=to.z-from.z;
  if(!inBounds(world,to.x,to.z)||Math.max(Math.abs(dx),Math.abs(dz))!==1) return false;
  const free=(x:number,z:number)=>!blocked[cellIndex(world,x,z)]&&!occupied.has(cellIndex(world,x,z));
  return free(to.x,to.z) && (!dx||!dz||(free(from.x+dx,from.z)&&free(from.x,from.z+dz)));
}

/** Occupy a destination cell (beds), unlike interaction from a neighbouring cell. */
export function routeToCell(world: World, target: Cell, reachable: Reachability): Cell[] | null {
  if (!inBounds(world, target.x, target.z)) return null;
  let cursor = cellIndex(world, target.x, target.z);
  if (reachable.parents[cursor] === -2) return null;
  const path: Cell[] = [];
  while (cursor !== reachable.start) {
    path.push({ x: cursor % world.width, z: Math.floor(cursor / world.width) });
    cursor = reachable.parents[cursor]!;
  }
  return path.reverse();
}

/** Full flood by default. With goals, the map is partial beyond the first goal
 * layer and may only be used for nearest-goal selection (or that single target).
 * No reached goal means a complete flood, so remaining candidates are knowable. */
export function reachableCells(world: World, start: Cell, blocked: Uint8Array, occupied: Set<number>, goals?: ReadonlySet<number>): Reachability {
  const size=world.width*world.height, parents=new Int32Array(size).fill(-2), costs=new Float64Array(size).fill(Infinity);
  const startIndex=cellIndex(world,start.x,start.z), heap=new PathFrontier(costs), settled=new Uint8Array(size);
  costs[startIndex]=0;parents[startIndex]=-1;heap.push(startIndex);
  let goalCost=Infinity;
  const directions=[[0,-1],[1,0],[0,1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]] as const;
  for(let index=heap.pop();index!==undefined;index=heap.pop()) {
    if(costs[index]!>goalCost) break;
    settled[index]=1;
    if(goals?.has(index)) goalCost=costs[index]!;
    const x=index%world.width,z=Math.floor(index/world.width);
    for(const [dx,dz] of directions) {
      const nx=x+dx,nz=z+dz,next=cellIndex(world,nx,nz);
      if(nx<0||nz<0||nx>=world.width||nz>=world.height||blocked[next]||occupied.has(next)||settled[next])continue;
      if(dx&&dz&&(blocked[index+dx]||blocked[index+dz*world.width]||occupied.has(index+dx)||occupied.has(index+dz*world.width)))continue;
      const cost=costs[index]!+(dx&&dz?DIAGONAL_COST:CARDINAL_COST);
      if(cost<costs[next]!) {costs[next]=cost;parents[next]=index;heap.push(next);}
    }
  }
  // Discovered but unfinalized nodes must not masquerade as reachable nearest goals.
  if(goalCost<Infinity) for(let i=0;i<size;i++) if(!settled[i]) {parents[i]=-2;costs[i]=Infinity;}
  return { parents,costs,start:startIndex };
}

export function routeToJob(world: World, target: Cell & { kind?: string; orientation?: 0 | 1 | 2 | 3; footprint?: 'standard' | 'legacy-single' }, reachable: Reachability, allowTarget = false): Cell[] | null {
  const cells = target.kind === 'bed' || target.kind === 'table' ? footprintCells({ ...target, kind: target.kind }) : [target];
  const candidates: Cell[] = cells.flatMap(cell => [
    { x: cell.x, z: cell.z - 1 }, { x: cell.x + 1, z: cell.z },
    { x: cell.x, z: cell.z + 1 }, { x: cell.x - 1, z: cell.z },
  ]).filter(cell => allowTarget || !cells.some(occupied => occupied.x === cell.x && occupied.z === cell.z));
  if (allowTarget) candidates.unshift({ x: target.x, z: target.z });
  let best: Cell[] | null = null;
  for (const cell of candidates) {
    if (!inBounds(world, cell.x, cell.z)) continue;
    let cursor = cellIndex(world, cell.x, cell.z);
    if (reachable.parents[cursor] === -2) continue;
    const path: Cell[] = [];
    while (cursor !== reachable.start) {
      path.push({ x: cursor % world.width, z: Math.floor(cursor / world.width) });
      cursor = reachable.parents[cursor]!;
    }
    path.reverse();
    if (best === null || routeCost(world,path,reachable) < routeCost(world,best,reachable)) best = path;
  }
  return best;
}

/** Same interaction cells as routeToJob(..., true) for single-cell food piles. */
export function interactionGoals(world: World, cells: Cell[]): Set<number> {
  const goals = new Set<number>();
  for (const cell of cells) {
    const index = cellIndex(world, cell.x, cell.z); goals.add(index);
    if (cell.z > 0) goals.add(index - world.width);
    if (cell.x + 1 < world.width) goals.add(index + 1);
    if (cell.z + 1 < world.height) goals.add(index + world.width);
    if (cell.x > 0) goals.add(index - 1);
  }
  return goals;
}
