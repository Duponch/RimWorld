/**
 * Original road-only numerical implementation. Inputs must describe the actual
 * pre-road map. This module creates neither a World nor surrogate obstacles.
 * Generation-only: no resident runtime index, DOM, global RNG or gameplay writes.
 */
const f = Math.fround;
export type LocalRoadMode256 = 'closed-dry' | 'closed' | 'destroy-dry' | 'destroy';
export const LOCAL_ROAD_MODES_256: readonly LocalRoadMode256[] =
 ['closed-dry', 'closed', 'destroy-dry', 'destroy'];
export interface LocalRoadPathMap256 {
 readonly width: number; readonly height: number;
 /** Normal (fences passable) path-grid costs, including actual snow/Things. */
 readonly direct: Int32Array;
 /** Full-fill edifices only (not every Building-category object). */
 readonly building: Uint8Array; readonly destroyableBuilding: Uint8Array;
 readonly hitPoints: Uint16Array; readonly fence: Uint8Array;
 readonly water: Uint8Array; readonly perceptualUndrafted: Uint16Array;
 /** Actual null-faction request grid (all zero in Core); never player costs. */
 readonly factionCost: Uint16Array;
 readonly persistentDanger: Uint8Array;
 /** Actual connectivity bits N,S,E,W,NE,SE,SW,NW, not walkability bits. */
 readonly connectivity: Uint8Array;
 /** 0=no door, 1=FreePassage, 2=closed; footprint entries for every door cell. */
 readonly doors: Uint8Array; readonly doorHitPoints: Int32Array;
 /** Expanded UsedRects grid. Null is used only by the final endcap request. */
 readonly usedRectCosts: Uint16Array | null;
 /** Actual PathRequest reachability gate, executed before every job. */
 canReach(start:number,end:number,mode:LocalRoadMode256):boolean;
}
export interface LocalRoadPathResult256 {
 readonly found: boolean; readonly reversed: readonly number[];
 readonly cost: number; readonly processed: number;
}
export function roadRoundEven256(x: number): number {
 const lo = Math.floor(x), d = x-lo;
 return d < .5 ? lo : d > .5 ? lo+1 : lo % 2 === 0 ? lo : lo+1;
}
function assertMap(m: LocalRoadPathMap256): void {
 const n=m.width*m.height;
 if (!Number.isInteger(m.width)||!Number.isInteger(m.height)||m.width<2||m.height<2||
     !Number.isSafeInteger(n)||n>2147483647) throw Error('Invalid road dimensions');
 for(const a of [m.direct,m.building,m.destroyableBuilding,m.hitPoints,m.fence,
  m.water,m.perceptualUndrafted,m.factionCost,m.persistentDanger,m.connectivity,m.doors,m.doorHitPoints])
  if(a.length!==n) throw Error('Incomplete actual road path grid');
 if(m.usedRectCosts!==null&&m.usedRectCosts.length!==n) throw Error('Incomplete used-rect grid');
}
export function localRoadUsedRectCosts256(width:number,height:number,
 rects:readonly {minX:number;minZ:number;maxX:number;maxZ:number}[]):Uint16Array {
 const costs=new Uint16Array(width*height);
 for(const r of rects) {
  if(![r.minX,r.minZ,r.maxX,r.maxZ].every(Number.isInteger)) throw Error('Invalid used rectangle');
  for(let z=Math.max(0,r.minZ-2);z<=Math.min(height-1,r.maxZ+2);z++)
   for(let x=Math.max(0,r.minX-2);x<=Math.min(width-1,r.maxX+2);x++)
    costs[z*width+x]=10000;
 }
 return costs;
}
/** No-Pawn traversal defaults: fenceBlocked=false, avoidPersistentDanger=true.
 * Water override is30 for road requests and -1 for the final endcap request. */
export function localRoadCellCosts256(m:LocalRoadPathMap256,mode:LocalRoadMode256,
 defaultEndcap=false):Int32Array {
 assertMap(m);
 const costs=new Int32Array(m.direct.length);
 const bash=mode==='destroy'||mode==='destroy-dry';
 const dry=mode==='closed-dry'||mode==='destroy-dry';
 const waterCost=defaultEndcap?-1:30;
 const custom=defaultEndcap?null:m.usedRectCosts;
 for(let i=0;i<costs.length;i++) {
  const breakWall=m.direct[i]>=10000&&m.building[i]!==0&&m.destroyableBuilding[i]!==0&&bash;
  if((m.direct[i]>=10000&&!breakWall)||(custom!==null&&custom[i]>=10000)||
      (dry&&m.water[i]!==0)) { costs[i]=10000; continue; }
  let cost=breakWall?70+roadRoundEven256(f(f(m.hitPoints[i])*f(.2))):
   waterCost>=0&&m.water[i]!==0?waterCost:m.direct[i];
  if(waterCost<=0||m.water[i]===0) cost=(cost+m.perceptualUndrafted[i])|0;
  cost=(cost+m.factionCost[i])|0;
  if(m.persistentDanger[i]) cost=(cost+300)|0;
  if(custom!==null) cost=(cost+custom[i])|0;
  if(m.doors[i]===2) {
   // No Pawn can open the door. Provider ushort uses truncation, not RoundToInt.
   const provider=bash?Math.trunc(f(50+f(f(m.doorHitPoints[i])*f(.2))))&65535:65535;
   cost=provider===65535?10000:Math.max(cost,provider);
  } else if(m.doors[i]>2) throw Error('Unknown actual door state');
  costs[i]=cost;
 }
 return costs;
}
/** Local four-way heap: strict parent comparison preserves equal-priority parent;
 * dequeue chooses the first minimum among the four children. */
class RoadFrontier {
 private cells:number[]=[]; private priorities:number[]=[];
 get length():number{return this.cells.length;}
 push(cell:number,priority:number):void {
  let i=this.cells.length;this.cells.push(cell);this.priorities.push(priority);
  while(i>0) { const p=(i-1)>>>2;if(!(priority<this.priorities[p]))break;
   this.cells[i]=this.cells[p];this.priorities[i]=this.priorities[p];i=p; }
  this.cells[i]=cell;this.priorities[i]=priority;
 }
 pop():{cell:number;priority:number} {
  const cell=this.cells[0],priority=this.priorities[0],last=this.cells.pop()!,p=this.priorities.pop()!;
  if(this.cells.length) {
   let i=0;
   while(4*i+1<this.cells.length) {
    const first=4*i+1,end=Math.min(first+4,this.cells.length);let best=first;
    for(let k=first+1;k<end;k++)if(this.priorities[k]<this.priorities[best])best=k;
    if(!(this.priorities[best]<p))break;
    this.cells[i]=this.cells[best];this.priorities[i]=this.priorities[best];i=best;
   }
   this.cells[i]=last;this.priorities[i]=p;
  }
  return {cell,priority};
 }
}
const DX=[0,0,1,-1,1,1,-1,-1], DZ=[1,-1,0,0,1,-1,-1,1];
function approximately(a:number,b:number):boolean {
 return Math.abs(f(b-a))<Math.max(f(f(.000001)*Math.max(Math.abs(a),Math.abs(b))),f(8*1.401298464324817e-45));
}
export function findLocalRoadPath256(m:LocalRoadPathMap256,start:number,end:number,
 mode:LocalRoadMode256,defaultEndcap=false):LocalRoadPathResult256 {
 assertMap(m);const n=m.direct.length;
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<0||start>=n||end>=n)
  return {found:false,reversed:[],cost:0,processed:0};
 if(!m.canReach(start,end,mode))return {found:false,reversed:[],cost:0,processed:0};
 const grid=localRoadCellCosts256(m,mode,defaultEndcap);
 const status=new Uint8Array(n),g=new Int32Array(n),h=new Float32Array(n),
  score=new Float32Array(n),parent=new Int32Array(n),q=new RoadFrontier();
 status[start]=1;parent[start]=start;q.push(start,0);let processed=0;
 const ex=end%m.width,ez=Math.trunc(end/m.width);
 while(q.length) {
  const item=q.pop(),at=item.cell;
  if(status[at]===2||!approximately(item.priority,score[at]))continue;
  if(at===end) {
   const path:number[]=[];let p=at;
   for(let guard=0;guard<=n;guard++) {
    path.push(p);if(parent[p]===p)return {found:true,reversed:path,cost:g[at],processed};
    p=parent[p];
   }
   throw Error('Cyclic road parent chain');
  }
  if(processed>=n)break;
  const x=at%m.width,z=Math.trunc(at/m.width),bits=m.connectivity[at];
  for(let k=0;k<8;k++)if(bits&(1<<k)) {
   const nx=x+DX[k],nz=z+DZ[k];
   if(nx<0||nz<0||nx>=m.width||nz>=m.height)throw Error('Out-of-map actual connectivity');
   const next=nz*m.width+nx;
   if(status[next]===2||grid[next]>=10000)continue;
   if(k>=4) {
    const a=z*m.width+nx,b=nz*m.width+x;
    if(grid[a]>=10000||grid[b]>=10000||m.building[a]||m.building[b]||m.fence[a]||m.fence[b])continue;
   }
   const candidate=(g[at]+((grid[next]+18)|0))|0;
   if(status[next]!==0&&g[next]<=candidate)continue;
   if(status[next]===0) {
    const dx=Math.abs(ex-nx),dz=Math.abs(ez-nz);
    h[next]=f(f(f(dx+dz)+f(f(-.58579004)*Math.min(dx,dz)))*13);
   }
   g[next]=candidate;score[next]=Math.max(0,f(f(candidate)+h[next]));
   parent[next]=at;status[next]=1;q.push(next,score[next]);
  }
  processed++;status[at]=2;
 }
 return {found:false,reversed:[],cost:0,processed};
}
export function firstLocalRoadPath256(m:LocalRoadPathMap256,start:number,end:number):LocalRoadPathResult256 {
 for(const mode of LOCAL_ROAD_MODES_256){const result=findLocalRoadPath256(m,start,end,mode);if(result.found)return result;}
 return {found:false,reversed:[],cost:0,processed:0};
}
