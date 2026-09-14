import { WeightedSearch } from './weighted-search.ts';
import type { DistanceField, Reachability } from './navigation-types.ts';
export type { DistanceField, Reachability } from './navigation-types.ts';
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

export function hasReachableCell(reach:Reachability,index:number):boolean {
  return 'kind' in reach ? reach.has(index) : index>=0&&index<reach.parents.length&&reach.parents[index]!==-2&&(!reach.settled||reach.settled[index]===1);
}
export const routeCost = (world: World, path: Cell[], reach: Reachability): number => {
  const last=path.at(-1);if(!last)return 0;const index=cellIndex(world,last.x,last.z);
  return 'kind' in reach?reach.costTo(index):reach.costs[index]!;
};
const resolveField=(reach:Reachability,goals:ReadonlySet<number>):DistanceField=>'kind' in reach?reach.resolve(goals):reach;
/** Solid 3D corners require both side cells clear, including temporary traffic. */
export function canStep(world:World,from:Cell,to:Cell,blocked:Uint8Array,occupied:ReadonlySet<number>):boolean {
  const dx=to.x-from.x,dz=to.z-from.z;
  if(!inBounds(world,to.x,to.z)||Math.max(Math.abs(dx),Math.abs(dz))!==1) return false;
  const free=(x:number,z:number)=>!blocked[cellIndex(world,x,z)]&&!occupied.has(cellIndex(world,x,z));
  return free(to.x,to.z) && (!dx||!dz||(free(from.x+dx,from.z)&&free(from.x,from.z+dz)));
}

/** Occupy a destination cell (beds), unlike interaction from a neighbouring cell. */
export function routeToCell(world: World, target: Cell, reachable: Reachability): Cell[] | null {
  if (!inBounds(world, target.x, target.z)) return null;
  let cursor = cellIndex(world, target.x, target.z);
  if(!hasReachableCell(reachable,cursor))return null;
  if(cursor===reachable.start)return [];
  const field=resolveField(reachable,new Set([cursor]));
  const path:Cell[]=[];
  while(cursor!==field.start){path.push({x:cursor%world.width,z:Math.floor(cursor/world.width)});cursor=field.parents[cursor]!;}
  return path.reverse();
}

/** Full flood by default. With goals, the map is partial beyond the first goal
 * layer and may only be used for nearest-goal selection (or that single target).
 * No reached goal means a complete flood, so remaining candidates are knowable.
 * With allGroups, finish the cheapest layer of the LAST reached group. Every
 * group must have one reachable alternative; an unreachable nonempty group
 * exhausts the component. This supports ranking all work targets exactly. */
export function reachableCells(world: World, start: Cell, blocked: Uint8Array, occupied: ReadonlySet<number>, goals?: ReadonlySet<number>, allGroups?:readonly ReadonlySet<number>[]): DistanceField {
  const unavailable=blocked.slice();for(const index of occupied)unavailable[index]=1;
  return new WeightedSearch(world.width,world.height,cellIndex(world,start.x,start.z),unavailable).finish(goals,allGroups);
}

export function routeToJob(world: World, target: Cell & { kind?: string; orientation?: 0 | 1 | 2 | 3; footprint?: 'standard' | 'legacy-single' }, reachable: Reachability, allowTarget = false): Cell[] | null {
  const cells = target.kind === 'bed' || target.kind === 'table' ? footprintCells({ ...target, kind: target.kind }) : [target];
  const candidates: Cell[] = cells.flatMap(cell => [
    { x: cell.x, z: cell.z - 1 }, { x: cell.x + 1, z: cell.z },
    { x: cell.x, z: cell.z + 1 }, { x: cell.x - 1, z: cell.z },
  ]).filter(cell => allowTarget || !cells.some(occupied => occupied.x === cell.x && occupied.z === cell.z));
  if (allowTarget) candidates.unshift({ x: target.x, z: target.z });
  const goals=new Set(candidates.filter(c=>inBounds(world,c.x,c.z)).map(c=>cellIndex(world,c.x,c.z)).filter(i=>hasReachableCell(reachable,i)));
  if(!goals.size)return null;
  if(goals.has(reachable.start))return [];
  const field=resolveField(reachable,goals);
  let best: Cell[] | null = null;
  for (const cell of candidates) {
    if (!inBounds(world, cell.x, cell.z)) continue;
    let cursor = cellIndex(world, cell.x, cell.z);
    if (!hasReachableCell(field,cursor)) continue;
    const path: Cell[] = [];
    while (cursor !== field.start) {
      path.push({ x: cursor % world.width, z: Math.floor(cursor / world.width) });
      cursor = field.parents[cursor]!;
    }
    path.reverse();
    if (best === null || routeCost(world,path,field) < routeCost(world,best,field)) best = path;
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
