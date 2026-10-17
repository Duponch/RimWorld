/** Generation-only original region decomposition. Exact12-cell chunk limits,
 * connected same-type cells and region rectangle admission; never substitutes
 * a circle of plants for the Core whole-region queries. No World or cache. */
export const enum PlantRegionType256 {None=0,Normal=1,Portal=2,Fence=3,FreeAir=4}
export interface PlantGenerationRegion256 {readonly id:number;readonly type:PlantRegionType256;readonly cells:readonly number[];readonly minX:number;readonly maxX:number;readonly minZ:number;readonly maxZ:number;readonly neighbours:readonly number[];readonly baseDesired:number}
export interface PlantGenerationRegions256 {readonly width:number;readonly height:number;readonly at:Int32Array;readonly regions:readonly PlantGenerationRegion256[]}
const f=Math.fround;
export function createPlantGenerationRegions256(width:number,height:number,types:ArrayLike<number>,baseDesired:ArrayLike<number>):PlantGenerationRegions256{
 const size=width*height;if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>400||height>400||types.length!==size||baseDesired.length!==size)throw Error('Invalid real plant region grids');
 const at=new Int32Array(size).fill(-1),queue=new Int32Array(size),regions:{id:number;type:PlantRegionType256;cells:number[];minX:number;maxX:number;minZ:number;maxZ:number;neighbours:number[];baseDesired:number}[]=[];
 const adjacent=(cell:number)=>{const x=cell%width,z=Math.floor(cell/width),out:number[]=[];if(z+1<height)out.push(cell+width);if(x+1<width)out.push(cell+1);if(z>0)out.push(cell-width);if(x>0)out.push(cell-1);return out;};
 for(let cell=0;cell<size;cell++){if(!Number.isInteger(types[cell])||types[cell]!<0||types[cell]!>4||!Number.isFinite(baseDesired[cell])||baseDesired[cell]!<0)throw Error('Invalid plant region cell');}
 for(let root=0;root<size;root++){
  const type=types[root]! as PlantRegionType256;if(type===PlantRegionType256.None||at[root]!==-1)continue;
  const id=regions.length,x=root%width,z=Math.floor(root/width),cx=Math.floor(x/12),cz=Math.floor(z/12),cells:number[]=[];at[root]=id;queue[0]=root;
  let end=1,minX=x,maxX=x,minZ=z,maxZ=z;
  for(let head=0;head<end;head++){const cell=queue[head]!,px=cell%width,pz=Math.floor(cell/width);cells.push(cell);minX=Math.min(minX,px);maxX=Math.max(maxX,px);minZ=Math.min(minZ,pz);maxZ=Math.max(maxZ,pz);if(type===PlantRegionType256.Portal)continue;
   for(const next of adjacent(cell))if(at[next]===-1&&types[next]===type&&Math.floor(next%width/12)===cx&&Math.floor(Math.floor(next/width)/12)===cz){at[next]=id;queue[end++]=next;}
  }
  cells.sort((a,b)=>a-b);let sum=0;for(const cell of cells)sum=f(sum+baseDesired[cell]!);regions.push({id,type,cells,minX,maxX,minZ,maxZ,neighbours:[],baseDesired:sum});
 }
 for(const region of regions){const neighbours=new Set<number>();for(const cell of region.cells)for(const next of adjacent(cell)){const id=at[next]!;if(id>=0&&id!==region.id)neighbours.add(id);}region.neighbours.push(...neighbours);}
 return {width,height,at,regions};
}
/** Whole reachable regions whose nearest rectangle cell is inside or on
 * the radius. Region counts include every plant in the admitted region. */
export function plantRegionsNear256(topology:PlantGenerationRegions256,cell:number,radius:number):readonly PlantGenerationRegion256[]{
 if(!Number.isSafeInteger(cell)||cell<0||cell>=topology.at.length||!Number.isFinite(radius)||radius<0)throw Error('Invalid plant region query');
 const root=topology.regions[topology.at[cell]!];if(!root||root.type===PlantRegionType256.FreeAir)return [];
 const x=cell%topology.width,z=Math.floor(cell/topology.width),out:PlantGenerationRegion256[]=[],queue=[root.id],seen=new Set(queue),radiusSquared=f(radius*radius);
 for(let head=0;head<queue.length;head++){const region=topology.regions[queue[head]!]!;out.push(region);for(const id of region.neighbours){if(seen.has(id))continue;seen.add(id);const next=topology.regions[id]!;if(next.type===PlantRegionType256.FreeAir)continue;const dx=Math.max(next.minX-x,0,x-next.maxX),dz=Math.max(next.minZ-z,0,z-next.maxZ);if(dx*dx+dz*dz<=radiusSquared)queue.push(id);}}
 return out;
}

/** A1x1 plant is listed in every distinct passable region it can physically
 * touch. Cardinal contacts are admitted; diagonal contacts require at least
 * one adjacent cardinal PathGrid cell walkable without a door. Counts across
 * multiple queried regions intentionally repeat the source's lister entries. */
export function touchablePlantRegions256(topology:PlantGenerationRegions256,cell:number,walkableNoDoor:ArrayLike<number>):readonly number[] {
 if(walkableNoDoor.length!==topology.at.length||!Number.isSafeInteger(cell)||cell<0||cell>=topology.at.length)throw Error('Invalid plant region contact');
 const x=cell%topology.width,z=Math.floor(cell/topology.width),out=new Set<number>();
 for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
  const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=topology.width||nz>=topology.height)continue;
  if(dx&&dz&&!walkableNoDoor[z*topology.width+nx]&&!walkableNoDoor[nz*topology.width+x])continue;
  const id=topology.at[nz*topology.width+nx]!,region=topology.regions[id];if(region&&region.type!==PlantRegionType256.FreeAir)out.add(id);
 }return [...out];
}
