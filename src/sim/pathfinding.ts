import { addActorObstacles,actorStepAllowed,openHostileDoor } from './combat-navigation.ts';
import { doorCorners } from './door-rules.ts';
import { WeightedSearch } from './weighted-search.ts';
import { canStandAt, navigationCosts } from './furniture-travel.ts';
import { jobBlocksTransit } from './construction-rules.ts';
import type { DistanceField, Reachability } from './navigation-types.ts';
export type { DistanceField, Reachability } from './navigation-types.ts';
import type { Cell, Job, World } from './types.ts';
import { footprintCells } from './definitions.ts';

export const cellIndex = (world: World, x: number, z: number): number => z * world.width + x;
export const inBounds = (world: World, x: number, z: number): boolean =>
  Number.isInteger(x) && Number.isInteger(z) && x >= 0 && z >= 0 && x < world.width && z < world.height;
export const workNeighbours=(cell:Cell,kind?:string):Cell[]=>[[0,-1],[1,0],[0,1],[-1,0],...(kind==='mine'?[[-1,-1],[1,-1],[1,1],[-1,1]]:[])].map(([dx,dz])=>({x:cell.x+dx!,z:cell.z+dz!}));
export const adjacent = (a: Cell, b: Cell): boolean => Math.abs(a.x - b.x) + Math.abs(a.z - b.z) === 1;

/** Only finished solids block V16 transit. Completion checks active actors/edges. */
export function blockedCells(world: World, physical=false): Uint8Array {
  const blocked = new Uint8Array(world.width * world.height);
  for (let i = 0; i < world.tiles.length; i++) {
    const terrain = world.tiles[i]!.terrain;
    if (terrain === 'water' || terrain === 'rock') blocked[i] = 1;
  }
  for (const structure of world.structures) {
    if (!physical&&structure.kind==='door'&&structure.door?.forbidden)blocked[cellIndex(world,structure.x,structure.z)]=1;
    if (structure.kind === 'wall' || world.schemaVersion<22&&structure.kind === 'table') for (const cell of footprintCells(structure)) blocked[cellIndex(world, cell.x, cell.z)] = 1;
  }
  for (const job of world.jobs) {
    if (jobBlocksTransit(world,job)) for (const cell of footprintCells(job)) blocked[cellIndex(world, cell.x, cell.z)] = 1;
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
  const free=(x:number,z:number)=>(!blocked[cellIndex(world,x,z)]||openHostileDoor(world,from,x,z))&&!occupied.has(cellIndex(world,x,z));
  return actorStepAllowed(world,from,to) && free(to.x,to.z) && (!dx||!dz||(free(from.x+dx,from.z)&&free(from.x,from.z+dz)&&!world.structures.some(s=>s.kind==='door'&&(s.x===from.x+dx&&s.z===from.z||s.x===from.x&&s.z===from.z+dz))));
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
  const unavailable=blocked.slice();for(const index of occupied)unavailable[index]=1;addActorObstacles(world,start,unavailable);
  const {costs,repeaters,stops,floors}=navigationCosts(world);
  const result=new WeightedSearch(world.width,world.height,cellIndex(world,start.x,start.z),unavailable,costs,repeaters,floors,doorCorners(world)).finish(goals,allGroups);result.stops=stops;return result;
}

export function routeToJob(world: World, target: Cell & { kind?: string; orientation?: 0 | 1 | 2 | 3; footprint?: 'standard' | 'legacy-single' }, reachable: Reachability, allowTarget = false): Cell[] | null {
  const cells = target.kind ? footprintCells(target as Job) : [target];
  const candidates: Cell[] = cells.flatMap(cell => workNeighbours(cell,target.kind)).filter(cell => (allowTarget || !cells.some(occupied => occupied.x === cell.x && occupied.z === cell.z))&&canStopAt(world,cell,reachable));
  if (allowTarget&&canStopAt(world,target,reachable)) candidates.unshift({ x: target.x, z: target.z });
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

export function canStopAt(world:World,cell:Cell,reach?:Reachability):boolean {
  return inBounds(world,cell.x,cell.z)&&(reach?.stops?!reach.stops.has(cellIndex(world,cell.x,cell.z)):canStandAt(world,cell));
}

/** Same interaction cells as routeToJob(..., true) for single-cell food piles. */
export function interactionGoals(world: World, cells: Cell[], kind?:string): Set<number> {
  const goals = new Set<number>();
  for (const cell of cells) {
    const index = cellIndex(world, cell.x, cell.z); goals.add(index);
    if (cell.z > 0) goals.add(index - world.width);
    if (cell.x + 1 < world.width) goals.add(index + 1);
    if (cell.z + 1 < world.height) goals.add(index + world.width);
    if (cell.x > 0) goals.add(index - 1);
  }
  if(kind==='mine')for(const c of cells)for(const n of workNeighbours(c,kind))if(inBounds(world,n.x,n.z))goals.add(cellIndex(world,n.x,n.z));
  for(const i of goals)if(!canStandAt(world,{x:i%world.width,z:Math.floor(i/world.width)}))goals.delete(i);
  return goals;
}
