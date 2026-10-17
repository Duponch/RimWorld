/** Versioned globe distances derived only from its actual recorded geometry. */
import type {WorldSurfaceTile} from './world-surface-geography.ts';
import type {SurfaceVector} from './world-surface-mesh.ts';
const f=Math.fround;
const dot=(a:SurfaceVector,b:SurfaceVector)=>f(f(f(a[0]*b[0])+f(a[1]*b[1]))+f(a[2]*b[2]));
function unit(v:SurfaceVector):SurfaceVector {const length=f(Math.sqrt(dot(v,v)));return length>f(.00001)?[f(v[0]/length),f(v[1]/length),f(v[2]/length)]:[0,0,0];}
function squaredDistance(a:SurfaceVector,b:SurfaceVector):number {const dx=f(a[0]-b[0]),dy=f(a[1]-b[1]),dz=f(a[2]-b[2]);return f(f(f(dx*dx)+f(dy*dy))+f(dz*dz));}
export function worldSurfaceAverageTileSize(tiles:readonly Pick<WorldSurfaceTile,'center'|'neighbours'>[]):number {
 if(!tiles.length)return 1;
 let total=0,edges=0;
 for(const tile of tiles)for(const id of tile.neighbours){const other=tiles[id];if(!other)throw Error('Invalid world distance edge');total+=f(Math.sqrt(squaredDistance(tile.center,other.center)));edges++;}
 if(!edges)throw Error('World geometry has no neighbour distances');
 return f(total/edges);
}
export function worldSurfaceApproxDistance(a:SurfaceVector,b:SurfaceVector,averageTileSize:number):number {
 if(!(averageTileSize>0))throw Error('Invalid average world tile size');
 const left=unit(a),right=unit(b);
 // Unity's managed Vector3 equality treats extremely close vectors as equal.
 if(squaredDistance(left,right)<f(9.99999944e-11))return 0;
 return f(f(f(Math.acos(dot(left,right)))*100)/averageTileSize);
}
