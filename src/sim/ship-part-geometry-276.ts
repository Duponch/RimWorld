import {SHIP_PART_DEFAULT_ORIENTATION_276,type ShipCell276,type ShipOrientation276,type ShipPartKind276} from './ship-part-content-276.ts';
import {shipReactorRect275,shipReactorContains275} from './ship-reactor-content-275.ts';

export interface ShipPartRect276 {readonly x:number;readonly z:number;readonly width:number;readonly depth:number}
export interface ShipPartPose276 extends ShipCell276 {readonly kind:ShipPartKind276;readonly orientation:ShipOrientation276}
type Extent=readonly [minX:number,minZ:number,width:number,depth:number];

/** Closed occupied-cell facts independently derived from the native rotation
 * rules. N/E/S/W offsets refer to the stored Position, not drawSize/mesh bounds.
 * Reactor extents remain exactly those of the existing shipReactorRect275. */
const EXTENTS:Readonly<Record<Exclude<ShipPartKind276,'ship-reactor'>,readonly [Extent,Extent,Extent,Extent]>>=Object.freeze({
 'ship-beam':Object.freeze([
  Object.freeze([0,-2,2,6] as const),Object.freeze([-2,-1,6,2] as const),
  Object.freeze([-1,-3,2,6] as const),Object.freeze([-3,0,6,2] as const),
 ] as const),
 'ship-engine':Object.freeze([
  Object.freeze([-1,-1,3,4] as const),Object.freeze([-1,-1,4,3] as const),
  Object.freeze([-1,-2,3,4] as const),Object.freeze([-2,-1,4,3] as const),
 ] as const),
});

export function shipPartRect276(p:ShipPartPose276):ShipPartRect276 {
 if(p.kind==='ship-reactor')return shipReactorRect275(p,p.orientation);
 const [dx,dz,width,depth]=EXTENTS[p.kind][p.orientation];
 return {x:p.x+dx,z:p.z+dz,width,depth};
}
/** No Cell array or rectangle allocation on repeated point queries. */
export function shipPartContains276(p:ShipPartPose276,c:ShipCell276):boolean {
 if(p.kind==='ship-reactor')return shipReactorContains275(p,c,p.orientation);
 const [minX,minZ,width,depth]=EXTENTS[p.kind][p.orientation],dx=c.x-p.x,dz=c.z-p.z;
 return dx>=minX&&dx<minX+width&&dz>=minZ&&dz<minZ+depth;
}
/** Explicit allocating convenience, outside the point-reader hot path. */
export function shipPartCells276(p:ShipPartPose276):ShipCell276[] {
 const r=shipPartRect276(p),cells:ShipCell276[]=[];
 for(let z=r.z;z<r.z+r.depth;z++)for(let x=r.x;x<r.x+r.width;x++)cells.push({x,z});
 return cells;
}
export function shipBeamRect276(at:ShipCell276,orientation:ShipOrientation276=SHIP_PART_DEFAULT_ORIENTATION_276['ship-beam']):ShipPartRect276 {
 return shipPartRect276({...at,kind:'ship-beam',orientation});
}
export function shipEngineRect276(at:ShipCell276,orientation:ShipOrientation276=SHIP_PART_DEFAULT_ORIENTATION_276['ship-engine']):ShipPartRect276 {
 return shipPartRect276({...at,kind:'ship-engine',orientation});
}
