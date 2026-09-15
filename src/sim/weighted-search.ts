import { PathFrontier } from './PathFrontier.ts';
import { CARDINAL_COST, DIAGONAL_COST } from './movement.ts';
import type { DistanceField } from './navigation-types.ts';

const DIRECTIONS = [[0,-1],[1,0],[0,1],[-1,0],[1,-1],[1,1],[-1,1],[-1,-1]] as const;

/** Resumable Dijkstra. Keep the same queue order and finish the entire equal-cost
 * layer, so a later request returns the exact same parents as one full flood. */
export class WeightedSearch {
  readonly field: DistanceField;
  private readonly frontier: PathFrontier;
  private pending: number | undefined;
  private readonly settled: Uint8Array;
  private readonly width:number;
  private readonly height:number;
  private readonly unavailable:Uint8Array;
  private finished=false;
  private readonly extraCosts:ReadonlyMap<number,number>|undefined;
  private readonly repeaters:ReadonlySet<number>;
  private readonly floors:ReadonlyMap<number,number>;
  private readonly corners:ReadonlySet<number>;
  constructor(width:number, height:number, start:number, unavailable:Uint8Array, extraCosts?:ReadonlyMap<number,number>,repeaters:ReadonlySet<number>=new Set(),floors:ReadonlyMap<number,number>=new Map(),corners:ReadonlySet<number>=new Set()) {
    this.extraCosts=extraCosts;this.repeaters=repeaters;this.floors=floors;this.corners=corners;
    this.width=width;this.height=height;this.unavailable=unavailable;
    const size=width*height,parents=new Int32Array(size).fill(-2),costs=new Float64Array(size).fill(Infinity);
    this.settled=new Uint8Array(size);this.field={parents,costs,start,visited:0,unreachedGroups:0,settled:this.settled};
    let maximum=0;for(const extra of extraCosts?.values()??[])maximum=Math.max(maximum,extra);
    this.frontier=new PathFrontier(costs,DIAGONAL_COST+maximum);costs[start]=0;parents[start]=-1;this.frontier.push(start);this.pending=this.frontier.pop();
  }
  advance(goals?:ReadonlySet<number>,allGroups?:readonly ReadonlySet<number>[]):DistanceField {
    if(this.finished)throw new Error('A finalized path field cannot be resumed.');
    const {parents,costs,start}=this.field,size=parents.length,blocked=this.unavailable;
    let goalCost=Infinity,remaining=0;
    if(goals)for(const index of goals)if(this.settled[index])goalCost=Math.min(goalCost,costs[index]!);
    const membership=new Map<number,number[]>(),reached=new Set<number>();
    const free=(i:number)=>i===start||!blocked[i];
    const hasEntry=(i:number)=>i===start||i>=this.width&&free(i-this.width)||i+this.width<size&&free(i+this.width)||i%this.width>0&&free(i-1)||i%this.width+1<this.width&&free(i+1);
    if(allGroups)for(let group=0;group<allGroups.length;group++) {
      let viable=false,known=false;
      for(const index of allGroups[group]!)if(index>=0&&index<size&&free(index)&&hasEntry(index)) {
        const members=membership.get(index);if(members)members.push(group);else membership.set(index,[group]);viable=true;
        if(this.settled[index])known=true;
      }
      if(known)reached.add(group);else if(viable)remaining++;
    }
    if(allGroups&&!remaining)goalCost=0;
    while(this.pending!==undefined&&costs[this.pending]!<=goalCost) {
      const index=this.pending;this.settled[index]=1;this.field.visited++;
      if(goals?.has(index))goalCost=costs[index]!;
      if(allGroups){for(const group of membership.get(index)??[])if(!reached.has(group)){reached.add(group);remaining--;}if(!remaining)goalCost=costs[index]!;}
      const x=index%this.width,z=Math.floor(index/this.width);
      for(const [dx,dz] of DIRECTIONS) {
        const nx=x+dx,nz=z+dz,next=nz*this.width+nx;
        if(nx<0||nz<0||nx>=this.width||nz>=this.height||blocked[next]||this.settled[next])continue;
        if(dx&&dz&&(blocked[index+dx]||blocked[index+dz*this.width]||this.corners.has(index+dx)||this.corners.has(index+dz*this.width)))continue;
        const cost=costs[index]!+(dx&&dz?DIAGONAL_COST:CARDINAL_COST)+(this.repeaters.has(index)&&this.repeaters.has(next)?this.floors.get(next)??0:this.extraCosts?.get(next)??0);
        if(cost<costs[next]!) {costs[next]=cost;parents[next]=index;this.frontier.push(next);}
      }
      this.pending=this.frontier.pop();
    }
    this.field.unreachedGroups=remaining;return this.field;
  }
  /** Public one-shot results retain the historical -2/Infinity convention. */
  finish(goals?:ReadonlySet<number>,allGroups?:readonly ReadonlySet<number>[]):DistanceField {
    const field=this.advance(goals,allGroups);
    for(let i=0;i<field.parents.length;i++)if(!this.settled[i]){field.parents[i]=-2;field.costs[i]=Infinity;}
    delete field.settled;this.finished=true;return field;
  }
}
