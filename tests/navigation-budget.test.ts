import { expect, test } from 'vitest';
import { createWorld } from '../src/sim/engine';
import { foodSearchGoals, selectFood } from '../src/sim/food-selection';
import type { MaterialPile } from '../src/sim/types';
import { routeCost, blockedCells, interactionGoals, reachableCells, routeToJob, routeToCell } from '../src/sim/pathfinding';

// Independent O(V²) oracle on small maps: no engine frontier, neighbour helper
// or pruning logic. Different tie order is fine; optimal costs must agree.
function oracleCosts(width:number,height:number,start:number,blocked:Uint8Array,traffic:Set<number>):number[] {
  const costs=Array<number>(width*height).fill(Infinity),done=new Set<number>();costs[start]=0;
  for(;;) {
    let cell=-1;
    for(let i=0;i<costs.length;i++)if(!done.has(i)&&costs[i]!<Infinity&&(cell===-1||costs[i]!<costs[cell]!))cell=i;
    if(cell===-1)return costs;
    done.add(cell);const x=cell%width,z=Math.floor(cell/width);
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++) {
      if(!dx&&!dz||x+dx<0||x+dx>=width||z+dz<0||z+dz>=height)continue;
      const next=(z+dz)*width+x+dx;
      if(blocked[next]||traffic.has(next))continue;
      if(dx&&dz&&(blocked[cell+dx]||traffic.has(cell+dx)||blocked[cell+dz*width]||traffic.has(cell+dz*width)))continue;
      costs[next]=Math.min(costs[next]!,costs[cell]!+(dx&&dz?1414:1000));
    }
  }
}

test('goal-bounded floods retain the full-flood nearest food and exact path across ties, walls and unreachable goals', () => {
  let random = 123456789, reduced = 0;
  const draw = () => { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; return random; };
  for (let run = 0; run < 120; run++) {
    const w = createWorld(run, 16, 16), start = { x: 2, z: 2 };
    w.structures = []; w.jobs = []; w.resources = [];
    w.tiles = w.tiles.map(() => ({ terrain: draw() % 5 === 0 ? 'rock' : 'grass' })); w.tiles[34] = { terrain: 'grass' };
    const foods = Array.from({ length: 12 }, (_, id) => ({ id, x: draw() % 16, z: (draw() >>> 9) % 16 }));
    const blocked = blockedCells(w), occupied = new Set<number>();
    const full = reachableCells(w, start, blocked, occupied);
    const bounded = reachableCells(w, start, blocked, occupied, interactionGoals(w, foods));
    const groups=foods.map(food=>interactionGoals(w,[food]));
    const all=reachableCells(w,start,blocked,occupied,undefined,groups);
    for(const food of foods)expect(routeToJob(w,food,all,true),`all groups seed ${run} target ${food.id}`).toEqual(routeToJob(w,food,full,true));
    const exact=reachableCells(w,start,blocked,occupied,undefined,foods.map(f=>new Set([f.z*16+f.x])));
    for(const food of foods)expect(routeToCell(w,food,exact),`exact groups seed ${run} target ${food.id}`).toEqual(routeToCell(w,food,full));
    const traffic=new Set(Array.from({length:40},()=>draw()%256).filter(i=>i!==34));
    // A free target can still be completely enclosed by transient occupants.
    const trafficFull=reachableCells(w,start,blocked,traffic),trafficGroups=reachableCells(w,start,blocked,traffic,undefined,groups);
    expect(Array.from(trafficFull.costs),`independent distances seed ${run}`).toEqual(oracleCosts(16,16,34,blocked,traffic));
    for(const food of foods)expect(routeToJob(w,food,trafficGroups,true),`traffic groups seed ${run} target ${food.id}`).toEqual(routeToJob(w,food,trafficFull,true));
    const select = (reach: typeof full) => foods.flatMap(food => {
      const path = routeToJob(w, food, reach, true); return path ? [{ id: food.id, path }] : [];
    }).sort((a, b) => routeCost(w,a.path,reach) - routeCost(w,b.path,reach) || a.id - b.id)[0] ?? null;
    expect(select(bounded), `seed ${run}`).toEqual(select(full));
    const sources:MaterialPile[]=foods.filter(f=>!blocked[f.z*16+f.x]).map(f=>({id:f.id+1,kind:'food',item:(['berries','survival-meal','rice'] as const)[f.id%3]!,quantity:10,owner:{type:'ground',x:f.x,z:f.z}}));
    const pawn={...w.pawns[0]!,...start};
    const preferredReach=reachableCells(w,start,blocked,occupied,foodSearchGoals(w,pawn,sources));
    const oracle=sources.flatMap(p=>{
      if(p.owner.type!=='ground')return [];
      const path=routeToJob(w,p.owner,full,true);if(!path)return [];
      const offset=p.item==='rice'?-82:p.item==='survival-meal'?-5:0;
      return [{id:p.id,path,score:offset-Math.abs(start.x-p.owner.x)-Math.abs(start.z-p.owner.z)}];
    }).sort((a,b)=>b.score-a.score||a.id-b.id)[0];
    expect(selectFood(w,pawn,sources,preferredReach),`preferred seed ${run}`).toEqual(oracle);
    if (bounded.parents.filter(parent => parent !== -2).length < full.parents.filter(parent => parent !== -2).length) reduced++;
  }
  expect(reduced).toBeGreaterThan(70);
});
