import {visibleWorldRoads,type WorldRoadLink} from '../sim/world-roads';
import type {WorldPhysicalSurface} from '../sim/world-surface-geography';
import type {GlobePatch,GlobeVector} from './planet-surface';
const colors={ 'dirt-path':[178,155,113],'dirt-road':[174,146,111],'stone-road':[163,164,151],'ancient-asphalt-road':[132,139,137],'ancient-asphalt-highway':[111,124,123]} as const;
/** Original narrow ribbons at actual shared edges. These widths/pigments are
 * presentation choices, not copied Core meshes or a claim of pixel parity. */
export function prepareGlobeRoads(surface:WorldPhysicalSurface,roads:readonly (readonly WorldRoadLink[])[]):GlobePatch{
 if(roads.length!==surface.tiles.length)throw Error('Réseau routier incomplet.');
 const positions:number[]=[],colorsOut:number[]=[],indices:number[]=[],mix=(a:GlobeVector,b:GlobeVector,t:number):GlobeVector=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t],same=(a:GlobeVector,b:GlobeVector)=>a.every((v,i)=>v===b[i]);
 const vertex=(point:GlobeVector,color:readonly number[])=>{const i=positions.length/3;positions.push(...point.map(v=>v/100*1.00008));colorsOut.push(...color,255);return i;};
 for(const tile of surface.tiles)for(const road of visibleWorldRoads(tile,roads[tile.id]!)){
  const other=surface.tiles[road.neighbour];if(!other||!tile.neighbours.includes(other.id))throw Error('Route sans voisin géographique.');
  let edge=-1;for(let i=0;i<tile.corners.length;i++)if(other.corners.some(p=>same(p,tile.corners[i]!))&&other.corners.some(p=>same(p,tile.corners[(i+1)%tile.corners.length]!))){edge=i;break;}
  if(edge<0)throw Error('Route sans arête géographique.');
  const a=tile.corners[edge]!,b=tile.corners[(edge+1)%tile.corners.length]!,width=road.road==='ancient-asphalt-highway'?.075:.045,left=mix(a,b,.5-width),right=mix(a,b,.5+width),color=colors[road.road];
  const ox=(right[0]-left[0])*.5,oy=(right[1]-left[1])*.5,oz=(right[2]-left[2])*.5,c=tile.center;
  const first=vertex([c[0]-ox,c[1]-oy,c[2]-oz],color);vertex([c[0]+ox,c[1]+oy,c[2]+oz],color);vertex(left,color);vertex(right,color);indices.push(first,first+1,first+2,first+1,first+3,first+2);
 }
 return {positions:Float32Array.from(positions),colors:Uint8Array.from(colorsOut),indices:Uint32Array.from(indices)};
}
