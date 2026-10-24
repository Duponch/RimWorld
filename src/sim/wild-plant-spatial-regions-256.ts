import {PlantRegionType256,type PlantGenerationRegion256} from './wild-plant-regions-256.ts';

const f=Math.fround;
/** A synchronous renewal session, discarded before World mutation. Chunks
 * retain the original12x12 decomposition; neighbours and BFS insertion order
 * match the cold whole-map oracle. IDs use the component's first cell instead
 * of its whole-map ordinal, which does not participate in any plant rule. */
export class PlantSpatialRegions256 {
 private readonly at=new Map<number,PlantGenerationRegion256>();
 private readonly chunks=new Set<number>();
 private readonly neighbours=new Map<number,readonly PlantGenerationRegion256[]>();
 constructor(readonly width:number,readonly height:number,private readonly typeAt:(cell:number)=>number,private readonly baseAt:(cell:number)=>number) {
  if(![width,height].every(v=>Number.isSafeInteger(v)&&v>=1&&v<=400))throw Error('Invalid spatial plant dimensions');
 }
 private adjacent(cell:number):number[] {
  const x=cell%this.width,z=Math.floor(cell/this.width),out:number[]=[];
  if(z+1<this.height)out.push(cell+this.width);if(x+1<this.width)out.push(cell+1);if(z>0)out.push(cell-this.width);if(x>0)out.push(cell-1);return out;
 }
 regionAt(cell:number):PlantGenerationRegion256|undefined {
  if(!Number.isSafeInteger(cell)||cell<0||cell>=this.width*this.height)throw Error('Invalid spatial plant cell');
  const resolved=this.at.get(cell);if(resolved)return resolved;
  const cx=Math.floor(cell%this.width/12),cz=Math.floor(Math.floor(cell/this.width)/12),chunk=cz*Math.ceil(this.width/12)+cx;
  if(!this.chunks.has(chunk)){
   this.chunks.add(chunk);
   const types=new Map<number,PlantRegionType256>(),bases=new Map<number,number>(),minX=cx*12,minZ=cz*12,maxX=Math.min(this.width,minX+12),maxZ=Math.min(this.height,minZ+12);
   for(let z=minZ;z<maxZ;z++)for(let x=minX;x<maxX;x++){
    const c=z*this.width+x,type=this.typeAt(c),base=this.baseAt(c);
    if(!Number.isInteger(type)||type<0||type>4||!Number.isFinite(base)||base<0)throw Error('Invalid spatial plant region cell');
    types.set(c,type);bases.set(c,base);
   }
   for(const [root,type] of types){
    if(type===PlantRegionType256.None||this.at.has(root))continue;
    const cells:number[]=[],queue=[root],seen=new Set(queue);let x0=root%this.width,x1=x0,z0=Math.floor(root/this.width),z1=z0;
    for(let head=0;head<queue.length;head++){
     const c=queue[head]!,x=c%this.width,z=Math.floor(c/this.width);cells.push(c);x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);
     if(type===PlantRegionType256.Portal)continue;
     for(const next of this.adjacent(c))if(!seen.has(next)&&types.get(next)===type){seen.add(next);queue.push(next);}
    }
    cells.sort((a,b)=>a-b);let sum=0;for(const c of cells)sum=f(sum+bases.get(c)!);
    const region:PlantGenerationRegion256={id:root,type,cells,minX:x0,maxX:x1,minZ:z0,maxZ:z1,baseDesired:sum,neighbours:[]};
    for(const c of cells)this.at.set(c,region);
   }
  }
  return this.at.get(cell);
 }
 private adjacentRegions(region:PlantGenerationRegion256):readonly PlantGenerationRegion256[] {
  let out=this.neighbours.get(region.id);
  if(!out){
   const seen=new Set<number>(),next:PlantGenerationRegion256[]=[];
   for(const c of region.cells)for(const adjacent of this.adjacent(c)){
    const other=this.regionAt(adjacent);if(other&&other.id!==region.id&&!seen.has(other.id)){seen.add(other.id);next.push(other);}
   }
   out=next;this.neighbours.set(region.id,out);
  }
  return out;
 }
 near(cell:number,radius:number):readonly PlantGenerationRegion256[] {
  if(!Number.isFinite(radius)||radius<0)throw Error('Invalid spatial plant radius');
  const root=this.regionAt(cell);if(!root||root.type===PlantRegionType256.FreeAir)return [];
  const x=cell%this.width,z=Math.floor(cell/this.width),queue=[root],seen=new Set([root.id]),radiusSquared=f(radius*radius);
  for(let head=0;head<queue.length;head++)for(const next of this.adjacentRegions(queue[head]!)){
   if(seen.has(next.id))continue;seen.add(next.id);if(next.type===PlantRegionType256.FreeAir)continue;
   const dx=Math.max(next.minX-x,0,x-next.maxX),dz=Math.max(next.minZ-z,0,z-next.maxZ);if(dx*dx+dz*dz<=radiusSquared)queue.push(next);
  }
  return queue;
 }
 touches(cell:number,region:PlantGenerationRegion256,walkableNoDoorAt:(cell:number)=>boolean):boolean {
  const x=cell%this.width,z=Math.floor(cell/this.width);
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
   const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=this.width||nz>=this.height)continue;
   if(dx&&dz&&!walkableNoDoorAt(z*this.width+nx)&&!walkableNoDoorAt(nz*this.width+x))continue;
   if(this.regionAt(nz*this.width+nx)?.id===region.id)return true;
  }
  return false;
 }
}
