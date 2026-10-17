/**
 * Prospective linked local roads, step390/SeedPart1187464702.
 * Original domain composition; World owners and the independent Core-native
 * angular boundary remain explicit. No graph/grid/terrain fallback is supplied.
 */
import type {WorldGenerationRandom} from './world-generation-random.ts';
import type {WorldRoadId} from './world-roads.ts';
import {findLocalCentralCell256,type ActualCentralCellReaders256} from './local-cell-selection-256.ts';
import {caveRadialPattern256} from './local-cave-radial-256.ts';
import {LOCAL_ROAD_DEFINITIONS_256} from './local-road-data-256.ts';
import {firstLocalRoadPath256,type LocalRoadPathMap256} from './local-road-path-256.ts';
import {prepareLocalRoadDistance256,refineLocalRoadPath256,type LocalRoadDistance256,
 type LocalRoadCurveReaders256} from './local-road-curves-256.ts';
import {applyLocalRoadField256,type LocalRoadPlacement256} from './local-road-placement-256.ts';
const f=Math.fround;
export const LOCAL_ROAD_SEED_PART_256=1187464702;
export interface LocalRoadLink256 {readonly neighbour:number;readonly road:WorldRoadId;readonly angle:number}
export type LocalRoadCellPoint256=readonly [x:number,z:number];
export interface LocalRoadAngularMath256 {
 /** HorizontalVectorFromAngle and Vector3/IntVec3.AngleFlat use Unity-native
  * quaternion operations. Supply the qualified numerical implementation;
  * do not silently replace these by an unqualified atan2 variant. */
 horizontal(angle:number):readonly [number,number,number];
 flatAngle(x:number,z:number):number;
 angleDifference(a:number,b:number):number;
}
export interface LocalRoadEdgeState256 {
 readonly width:number;readonly height:number;
 /** null = known not yet materialized; otherwise actual retained permutation. */
 readonly cells:readonly number[]|null;
}
export function initialLocalRoadEdges256(width:number,height:number):LocalRoadEdgeState256 {
 return {width,height,cells:null};
}
function edgeRing(width:number,height:number):number[] {
 const ring:number[]=[];
 for(let x=0;x<width;x++)ring.push(x);
 for(let z=1;z<height;z++)ring.push(z*width+width-1);
 for(let x=width-2;x>=0;x--)ring.push((height-1)*width+x);
 for(let z=height-2;z>0;z--)ring.push(z*width);
 return ring;
}
function gaussian(random:WorldGenerationRandom):number {
 const a=random.value(),b=random.value();
 return f(f(f(Math.sqrt(f(-2*f(Math.log(a)))))*f(Math.sin(f(f(f(Math.PI)*2)*b))))*1);
}
function vectorNoise(random:WorldGenerationRandom):readonly number[] {
 const x=gaussian(random),y=gaussian(random),z=gaussian(random);
 const length=f(Math.sqrt(f(f(f(x*x)+f(y*y))+f(z*z))));
 return length>f(.00001)?[f(x/length),f(y/length),f(z/length)]:[0,0,0];
}
export function adjustedLocalRoadLinks256(links:readonly LocalRoadLink256[],
 angular:LocalRoadAngularMath256,random:WorldGenerationRandom):LocalRoadLink256[] {
 const result=links.map(link=>({...link}));
 if(result.length<2)return result;
 let x=0,y=0,z=0;
 for(const link of result){const v=angular.horizontal(link.angle);x=f(x+v[0]);y=f(y+v[1]);z=f(z+v[2]);}
 x=f(x/f(-result.length));y=f(y/f(-result.length));z=f(z/f(-result.length));
 const noise=vectorNoise(random);
 x=f(x+f(f(noise[0]*1)/6));y=f(y+f(f(noise[1]*1)/6));z=f(z+f(f(noise[2]*1)/6));
 for(const link of result){const v=angular.horizontal(link.angle);link.angle=angular.flatAngle(f(v[0]+x),f(v[2]+z));}
 return result;
}
export interface LocalRoadGenerationServices256 {
 readonly angular:LocalRoadAngularMath256;
 readonly central:ActualCentralCellReaders256;
 readonly curve:LocalRoadCurveReaders256;
 readonly placement:LocalRoadPlacement256;
 /** Real reachability OnCell, with fresh actual regions/doors. District equality
  * and A* Found are not substitutes for this separate admission. */
 canReach(from:LocalRoadCellPoint256|null,to:number,mode:'closed'|'destroy'):boolean;
 /** True regional rock list in actual order. The draw occurs before central cell. */
 readonly regionalRockFloors:readonly string[];
 selectRegionalFloor(id:string):void;
}
export interface LocalRoadPrepared256 {
 readonly road:WorldRoadId;readonly avoid:boolean;
 readonly path:readonly number[];readonly field:LocalRoadDistance256;
}
export interface LocalRoadGenerationResult256 {
 readonly prepared:readonly LocalRoadPrepared256[];
 readonly edges:LocalRoadEdgeState256;
 readonly random:Readonly<{seed:number;counter:number}>;
}
export function generateLocalRoads256(input:{
 map:LocalRoadPathMap256;links:readonly LocalRoadLink256[];
 edgeState:LocalRoadEdgeState256;services:LocalRoadGenerationServices256
},random:WorldGenerationRandom):LocalRoadGenerationResult256 {
 const {map,services:s}=input,w=map.width,h=map.height;
 const needed=adjustedLocalRoadLinks256(input.links,s.angular,random);
 if(!needed.length)return {prepared:[],edges:input.edgeState,random:random.state};
 if(!s.regionalRockFloors.length)throw Error('Missing actual regional rock terrain choices');
 const regional=s.regionalRockFloors[random.integer(0,s.regionalRockFloors.length)];
 s.selectRegionalFloor(regional);
 if(s.placement.regionalFloor!==regional)throw Error('Regional road terrain authority was not published');
 const central=findLocalCentralCell256({width:w,height:h,tightness:3,minimumDistrictCells:10,readers:s.central},random);
 let crossroads:LocalRoadCellPoint256|null=central===null?null:[central%w,Math.trunc(central/w)];
 let ring=input.edgeState.width===w&&input.edgeState.height===h&&input.edgeState.cells!==null?
  [...input.edgeState.cells]:null;
 if(ring!==null){
  const expected=edgeRing(w,h),set=new Set(ring);
  if(ring.length!==expected.length||set.size!==ring.length||expected.some(c=>!set.has(c)))
   throw Error('Invalid retained edge-cell permutation');
 }
 const randomEdge=(accept:(cell:number)=>boolean):number|null=>{
  for(let attempt=0;attempt<100;attempt++){
   let x:number,z:number;
   if(random.value()<.5){x=random.value()<.5?0:w-1;z=random.integer(0,h);}
   else {z=random.value()<.5?0:h-1;x=random.integer(0,w);}
   const cell=z*w+x;if(accept(cell))return cell;
  }
  ring??=edgeRing(w,h);
  for(let i=ring.length-1;i>0;i--){const j=random.integer(0,i+1),old=ring[i];ring[i]=ring[j];ring[j]=old;}
  for(const cell of ring)if(accept(cell))return cell;
  return null;
 };
 const radial=caveRadialPattern256(8);
 const exit=(angle:number,from:LocalRoadCellPoint256|null,avoid:boolean):{cell:number|null;avoid:boolean}=>{
  for(const mode of ['closed','destroy'] as const){
   if(mode==='destroy')avoid=false;
   for(let span=10;span<90;span+=10){
    const cell=randomEdge(cell=>{
     const x=cell%w,z=Math.trunc(cell/w);
     if(!(s.angular.angleDifference(s.angular.flatAngle(x-Math.trunc(w/2),z-Math.trunc(h/2)),angle)<span))return false;
     for(let i=0;i<radial.count;i++){
      const [dx,dz]=radial.offsets[i],nx=x+dx,nz=z+dz;
      if(nx>=0&&nz>=0&&nx<w&&nz<h&&s.curve.water(nz*w+nx))return false;
     }
     return s.canReach(from,cell,mode);
    });
    if(cell!==null)return {cell,avoid};
   }
  }
  return {cell:null,avoid};
 };
 const point=(cell:number|null):LocalRoadCellPoint256|null=>cell===null?null:[cell%w,Math.trunc(cell/w)];
 const index=(p:LocalRoadCellPoint256|null):number=>p===null||p[0]<0||p[1]<0||p[0]>=w||p[1]>=h?-1:p[1]*w+p[0];
 const prepared:LocalRoadPrepared256[]=[];
 const prepare=(road:WorldRoadId,from:LocalRoadCellPoint256|null,to:number|null,avoid:boolean):LocalRoadCellPoint256|null=>{
  const result=firstLocalRoadPath256(map,index(from),to??-1);if(!result.found)return null;
  const path=refineLocalRoadPath256(result.reversed,map),def=LOCAL_ROAD_DEFINITIONS_256[road];
  const generated=prepareLocalRoadDistance256({map,path,tilesPerSegment:def.tilesPerSegment,avoid,readers:s.curve},random);
  prepared.push({road,avoid,path,field:generated.field});return generated.center;
 };
 let best:WorldRoadId|null=null;
 for(const road of Object.keys(LOCAL_ROAD_DEFINITIONS_256) as WorldRoadId[]){
  if(needed.filter(link=>link.road===road).length>=2&&
   (best===null||LOCAL_ROAD_DEFINITIONS_256[road].priority>LOCAL_ROAD_DEFINITIONS_256[best].priority))best=road;
 }
 if(best!==null){
  const a=needed.splice(needed.findIndex(link=>link.road===best),1)[0],
   b=needed.splice(needed.findIndex(link=>link.road===best),1)[0];
  const first=exit(a.angle,crossroads,LOCAL_ROAD_DEFINITIONS_256[a.road].avoid),
   second=exit(b.angle,point(first.cell),first.avoid);
  crossroads=prepare(a.road,point(first.cell),second.cell,second.avoid);
 }
 for(const link of needed){
  const found=exit(link.angle,crossroads,LOCAL_ROAD_DEFINITIONS_256[link.road].avoid);
  if(found.cell!==null)prepare(link.road,crossroads,found.cell,found.avoid);
 }
 // All planning precedes the first terrain/Thing effect. Equal priorities keep
 // insertion order; these five distinct priorities need no native List.Sort.
 for(const p of [...prepared].sort((a,b)=>LOCAL_ROAD_DEFINITIONS_256[a.road].priority-LOCAL_ROAD_DEFINITIONS_256[b.road].priority))
  applyLocalRoadField256(p.road,p.field,s.placement,random);
 return {prepared,edges:{width:w,height:h,cells:ring},random:random.state};
}
