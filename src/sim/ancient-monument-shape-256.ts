/** Closed monument silhouette sampler. No map writes or generic Sketch API. */
import type {MonumentRandom256} from './ancient-monument-damage-256.ts';
const f=Math.fround;
const round=(n:number)=>{const a=Math.floor(n);return n-a===.5?a+(a%2):Math.round(n);};
export interface MonumentShape256 {width:number;height:number;cells:Uint8Array;attempts:number;valid:boolean}
export function sampleMonumentShape256(width:number,height:number,horizontal:boolean,vertical:boolean,connected:boolean,enclosed=true,outline=false,random:MonumentRandom256):MonumentShape256 {
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>30||height>30)throw Error('Invalid actual monument shape extent');
 const n=width*height,cells=new Uint8Array(n),index=(x:number,z:number)=>x*height+z;
 const inside=(x:number,z:number)=>x>=0&&z>=0&&x<width&&z<height;
 const mark=(x:number,z:number)=>{if(inside(x,z))cells[index(x,z)]=1;};
 const rectangle=(factor:number)=>{const x=random.integer(0,width),z=random.integer(0,height),w=Math.max(1,round(f(random.integer(1,width+1)*f(factor)))),h=Math.max(1,round(f(random.integer(1,height+1)*f(factor))));return {x:x-Math.floor(w/2),z:z-Math.floor(h/2),w,h};};
 const disk=(radius:number)=>{const points:{x:number;z:number}[]=[];for(let x=-radius;x<=radius;x++)for(let z=-radius;z<=radius;z++)if(f(Math.sqrt(x*x+z*z))<=radius)points.push({x,z});return points;};
 function fill():void {
  cells.fill(0);const rectangles=outline?0:random.integer(1,4),disks=outline?0:random.integer(1,4),rings=outline?(width<12&&height<12?1:width<13&&height<13?2:width<16&&height<16?3:4):0;
  for(let k=0;k<rectangles;k++){const r=rectangle(.3);for(let x=r.x;x<r.x+r.w;x++)for(let z=r.z;z<r.z+r.h;z++)mark(x,z);}
  if(outline)for(let k=0;k<2;k++){
   const r=rectangle(.3),omit=random.integer(0,4);
   for(let x=r.x;x<r.x+r.w;x++)for(let z=r.z;z<r.z+r.h;z++){
    const north=z===r.z+r.h-1,east=x===r.x+r.w-1,south=z===r.z,west=x===r.x;
    const edge=[north,east,south,west];if(edge.some(Boolean)&&(enclosed||!edge[omit]||edge[(omit+1)%4]||edge[(omit+3)%4]))mark(x,z);
   }
  }
  for(let k=0;k<disks;k++){const x=random.integer(0,width),z=random.integer(0,height),r=Math.max(1,round(f(Math.floor(Math.max(width,height)/2)*f(.7))));for(const p of disk(r))mark(x+p.x,z+p.z);}
  for(let k=0;k<rings;k++){
   const scale=random.float(f(.7),1),x=random.integer(0,width),z=random.integer(0,height),r=Math.max(1,round(f(f(Math.floor(Math.max(width,height)/2)*f(.7))*scale))),half=random.boolean(),points=disk(r),set=new Set(points.map(p=>`${p.x},${p.z}`));
   for(const p of points){if(!enclosed&&(half?p.x<0:p.z<0))continue;let edge=false;for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)if(!set.has(`${p.x+dx},${p.z+dz}`))edge=true;if(edge)mark(x+p.x,z+p.z);}
  }
  if(outline){
   for(let k=0;k<4;k++){const alongX=random.boolean(),x=random.integer(0,width),z=random.integer(0,height),w=alongX?random.integer(1,width+1):1,h=alongX?1:random.integer(1,height+1);for(let dx=0;dx<w;dx++)for(let dz=0;dz<h;dz++)mark(x-Math.floor(w/2)+dx,z-Math.floor(h/2)+dz);}
   for(let k=0;k<2;k++){const flip=random.boolean(),x=random.integer(0,width),z=random.integer(0,height),w=random.integer(1,width+1),left=x-Math.floor(w/2);for(let dx=0;dx<w;dx++)mark(left+dx,z+(flip?-1:1)*(dx-Math.floor(w/2)));}
   for(let x=0;x<width-1;x++)for(let z=0;z<height-1;z++)if(cells[index(x,z)]&&cells[index(x+1,z)]&&cells[index(x,z+1)]&&cells[index(x+1,z+1)]){const i=random.integer(0,4);cells[index(x+i%2,z+Math.floor(i/2))]=0;}
  }
  if(horizontal)for(let x=Math.floor(width/2);x<width;x++)for(let z=0;z<height;z++)cells[index(x,z)]=cells[index(width-x-1,z)]!;
  if(vertical)for(let x=0;x<width;x++)for(let z=Math.floor(height/2);z<height;z++)cells[index(x,z)]=cells[index(x,height-z-1)]!;
 }
 function valid():boolean {
  const count=cells.reduce((a,b)=>a+b,0);
  if(width>=3&&height>=3&&(count<Math.floor(f(n*f(outline?.24:.6)))||count>Math.ceil(f(n*f(outline?.53:.85)))))return false;
  if(width>=2&&height>=2){let xPair=false,zPair=false;for(let x=0;x<width-1;x++)for(let z=0;z<height-1;z++){if(cells[index(x,z)]&&cells[index(x+1,z)])xPair=true;if(cells[index(x,z)]&&cells[index(x,z+1)])zPair=true;}if(!xPair||!zPair)return false;}
  const seen=new Uint8Array(n);
  const flood=(start:number,value:number)=>{const stack=[start];seen[start]=1;while(stack.length){const at=stack.pop()!,x=Math.floor(at/height),z=at%height;for(const [dx,dz] of [[-1,0],[0,-1],[1,0],[0,1]]){const a=x+dx!,b=z+dz!,i=index(a,b);if(inside(a,b)&&!seen[i]&&cells[i]===value){seen[i]=1;stack.push(i);}}}};
  if(connected){let first=false;for(let x=0;x<width;x++)for(let z=0;z<height;z++){const i=index(x,z);if(cells[i]&&!seen[i]){if(first)return false;first=true;flood(i,1);}}}
  if(!enclosed){seen.fill(0);for(let x=0;x<width;x++)for(const z of [0,height-1])if(!cells[index(x,z)])flood(index(x,z),0);for(let z=0;z<height;z++)for(const x of [0,width-1])if(!cells[index(x,z)])flood(index(x,z),0);for(let i=0;i<n;i++)if(!cells[i]&&!seen[i])return false;}
  return true;
 }
 for(let attempts=1;attempts<=501;attempts++){fill();const ok=valid();if(ok||attempts===501)return {width,height,cells,attempts,valid:ok};}
 throw Error('Unreachable monument silhouette frontier');
}
