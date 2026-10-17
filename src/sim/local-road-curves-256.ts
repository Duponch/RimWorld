/**
 * Original float road geometry. Plan generation owns the stream and all arrays.
 * Actual terrain/Thing predicates are required; no implicit all-clear map.
 */
import type {WorldGenerationRandom} from './world-generation-random.ts';
import {roadRoundEven256,firstLocalRoadPath256,findLocalRoadPath256,
 type LocalRoadPathMap256} from './local-road-path-256.ts';
const f=Math.fround;
type Point=readonly [number,number];
export interface LocalRoadDistance256 {
 readonly width:number;readonly height:number;
 readonly distance:Float32Array;readonly along:Float32Array;
 readonly origin:Int32Array;readonly touched:Uint8Array;
}
export interface LocalRoadCurveReaders256 {
 /** Any Thing's Impassable passability; terrain is deliberately separate. */
 impassableThing(cell:number):boolean;
 anyDestroyableThing(cell:number):boolean;
 dangerousTerrain(cell:number):boolean;
 water(cell:number):boolean;
}
const add=(a:Point,b:Point):Point=>[f(a[0]+b[0]),f(a[1]+b[1])];
const scale=(a:Point,b:number):Point=>[f(a[0]*b),f(a[1]*b)];
const minus=(a:Point,b:Point):Point=>[f(a[0]-b[0]),f(a[1]-b[1])];
function unit(a:Point):Point {
 const length=f(Math.sqrt(f(f(a[0]*a[0])+f(a[1]*a[1]))));
 return length>f(.00001)?[f(a[0]/length),f(a[1]/length)]:[0,0];
}
function cubic(t:number,p:readonly Point[]):Point {
 const t2=f(t*t),u=f(1-t),u2=f(u*u);
 return add(add(add(scale(scale(p[0],u2),u),
  scale(scale(scale(p[1],3),u2),t)),
  scale(scale(scale(p[2],3),u),t2)),scale(scale(p[3],t2),t));
}
function lerpMap(a:number,b:number,c:number,d:number,x:number):number {
 return f(c+f(f(d-c)*f(f(x-a)/f(b-a))));
}
export function roadCurveChance256(points:readonly (readonly [number,number])[],x:number):number {
 if(!points.length)throw Error('Missing road probability curve');
 x=f(x);if(x<=f(points[0][0]))return f(points[0][1]);
 if(x>=f(points[points.length-1][0]))return f(points[points.length-1][1]);
 for(let i=1;i<points.length;i++)if(x<=f(points[i][0])){
  const [ax,ay]=points[i-1],[bx,by]=points[i];
  const t=Math.max(0,Math.min(1,f(f(x-f(ax))/f(f(bx)-f(ax)))));
  return f(f(ay)+f(f(f(by)-f(ay))*t));
 }
 throw Error('Unordered road curve');
}
export function refineLocalRoadPath256(input:readonly number[],map:LocalRoadPathMap256):number[] {
 const samples=[.75,.8,.85,.9,.95].map(f);
 const endcap=(path:readonly number[]):number[]=>{
  if(!path.length)return [];
  const last=path[path.length-1],costs=samples.map(s=>{
   const index=roadRoundEven256(f(f(path.length)*s));
   if(index>=path.length)throw Error('Core endcap sample outside short path');
   const result=firstLocalRoadPath256(map,path[index],last);return result.found?f(result.cost):0;
  });
  let ratio=0,cut=0,candidate=-1;
  const lx=last%map.width,lz=Math.trunc(last/map.width);
  for(const axis of [0,1]){
   const edge=axis===0?lz:lx,size=axis===0?map.height:map.width;
   if(Math.abs(edge)>5&&Math.abs(edge-size)>5)continue;
   for(let k=0;k<samples.length;k++){
    if(costs[k]===0)continue;
    const index=roadRoundEven256(f(f(path.length)*samples[k])),old=path[index];
    const aligned=axis===0?lz*map.width+old%map.width:Math.trunc(old/map.width)*map.width+lx;
    // The primary comparison still requests old->last, not aligned->old.
    let trial=findLocalRoadPath256(map,old,last,'closed');
    if(!trial.found)trial=findLocalRoadPath256(map,old,last,'destroy');
    if(trial.found){const next=f(costs[k]/f(trial.cost));if(next>ratio){ratio=next;cut=index;candidate=aligned;}}
   }
  }
  if(ratio<=1.75)return [...path];
  const replacement=findLocalRoadPath256(map,candidate,path[cut],'closed',true);
  return [...path.slice(0,cut),...replacement.reversed];
 };
 return endcap(endcap(input).reverse());
}
export function prepareLocalRoadDistance256(input:{
 map:LocalRoadPathMap256;path:readonly number[];tilesPerSegment:number;avoid:boolean;
 readers:LocalRoadCurveReaders256
},random:WorldGenerationRandom):{field:LocalRoadDistance256;center:readonly [number,number]|null} {
 const {map,path,readers}=input,n=map.width*map.height;
 if(!Number.isFinite(input.tilesPerSegment)||input.tilesPerSegment<=0)throw Error('Invalid road segment spacing');
 if(path.some(c=>!Number.isInteger(c)||c<0||c>=n))throw Error('Invalid actual road path');
 const field:LocalRoadDistance256={width:map.width,height:map.height,distance:new Float32Array(n),
  along:new Float32Array(n),origin:new Int32Array(n).fill(-1),touched:new Uint8Array(n)};
 let center:readonly [number,number]|null=null;
 if(!path.length)throw Error('Missing refined road path');
 const chosen=roadRoundEven256(f(random.float(.3,.7)*f(path.length)));
 const quotient=f(f(path.length)/f(input.tilesPerSegment));
 // RoundRandom always draws, including an exact integer quotient.
 const segments=Math.max(1,Math.trunc(quotient)+(random.value()<f(quotient%1)?1:0));
 const point=(i:number,shift=false):Point=>[f(path[i]%map.width+(shift ? .5 : 0)),f(Math.trunc(path[i]/map.width)+(shift ? .5 : 0))];
 const inbounds=(x:number,z:number)=>x>=0&&z>=0&&x<map.width&&z<map.height;
 const fill=(p:Point,along:number)=>{
  const [cx,cz]=p,x0=Math.max(0,Math.min(map.width-1,Math.floor(f(cx-10)))),
   x1=Math.max(0,Math.min(map.width-1,Math.floor(f(cx+10)))),
   z0=Math.max(0,Math.min(map.height-1,Math.floor(f(cz-10)))),
   z1=Math.max(0,Math.min(map.height-1,Math.floor(f(cz+10))));
  const origin=Math.max(0,Math.min(map.height-1,Math.floor(cz)))*map.width+
   Math.max(0,Math.min(map.width-1,Math.floor(cx)));
  for(let x=x0;x<=x1;x++){
   const dx=f(f(x+.5)-cx),xx=f(dx*dx);
   for(let z=z0;z<=z1;z++){
    const dz=f(f(z+.5)-cz),dist=f(Math.sqrt(f(xx+f(dz*dz)))),cell=z*map.width+x;
    if(!field.touched[cell]||dist<field.distance[cell]){
     field.distance[cell]=dist;field.along[cell]=along;field.origin[cell]=origin;
    }
    field.touched[cell]=1;
   }
  }
 };
 const curve=(begin:number,end:number):void=>{
  if(begin===end)return;
  const before=Math.max(0,begin-(end-begin)),after=Math.min(path.length-1,end+(end-begin));
  const controls=[point(begin,true),add(point(begin,true),scale(unit(minus(point(end),point(before))),4)),
   add(point(end,true),scale(unit(minus(point(begin),point(after))),4)),point(end,true)];
  const count=(end-begin)*4,samples:Point[]=[];
  for(let i=0;i<=count;i++)samples.push(cubic(f(f(i)/f(count)),controls));
  let pathWater=0;
  for(let i=begin;i<=end;i++)if(i>0&&i<path.length&&readers.water(path[i]))pathWater++;
  if(begin+1<end)for(const p of samples){
   const x=Math.floor(p[0]),z=Math.floor(p[1]);let bad=inbounds(x,z)&&readers.impassableThing(z*map.width+x),water=0;
   for(const [dx,dz] of [[0,1],[1,0],[0,-1],[-1,0]]){
    if(bad)break;const nx=x+dx,nz=z+dz;if(!inbounds(nx,nz))continue;
    const cell=nz*map.width+nx;
    bad=(input.avoid&&readers.impassableThing(cell))||readers.dangerousTerrain(cell)||readers.anyDestroyableThing(cell);
    if(readers.water(cell))water++;
   }
   if(bad||water>f(f(f(pathWater)*1.5)+2)){const mid=Math.trunc((begin+end)/2);curve(begin,mid);curve(mid,end);return;}
  }
  for(let i=0;i<samples.length;i++)fill(samples[i],lerpMap(0,samples.length-1,begin,end,i));
  if(chosen>=begin&&chosen<end){
   const at=Math.max(0,Math.min(samples.length-1,roadRoundEven256(lerpMap(begin,end,0,samples.length,chosen))));
   const [x,z]=samples[at];center=[Math.floor(x),Math.floor(z)];
  }
 };
 for(let segment=0;segment<segments;segment++){
  const begin=roadRoundEven256(f(f(f(path.length-1)/f(segments))*f(segment)));
  const end=roadRoundEven256(f(f(f(path.length-1)/f(segments))*f(segment+1)));
  curve(begin,end);
 }
 return {field,center};
}
