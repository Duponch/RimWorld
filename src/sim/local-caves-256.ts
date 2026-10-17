/** Independent cave field over real elevation cells. All generation draws
 * come from the caller's existing ordered step stream. No Map/World is made,
 * no terrain rectangle is substituted, and elevation is never mutated. */
import {WorldGenerationRandom} from './world-generation-random.ts';
import {createWorldPerlin} from './world-coherent-noise.ts';
import {caveRadialPattern256} from './local-cave-radial-256.ts';
const f=Math.fround;
export interface LocalCaveInitPlan256 {readonly revision:1;readonly directionSeed:number}
export function localCaveInitPlan256(initRandom:WorldGenerationRandom):LocalCaveInitPlan256 {return {revision:1,directionSeed:initRandom.integerValue()};}
export interface LocalCaveInputs256 {readonly width:number;readonly height:number;readonly elevation:Float32Array;readonly plan:LocalCaveInitPlan256}
const FLOOD_DIRECTIONS=Object.freeze([[0,-1],[-1,0],[0,1],[1,0]] as const);
const EDGE_DIRECTIONS=Object.freeze([[0,1],[1,0],[0,-1],[-1,0]] as const);
const RAY_DIRECTIONS=Object.freeze([[1,0],[-1,0],[0,-1],[0,1],[-1,1],[1,1],[-1,-1],[1,-1]] as const);
export function caveDirection256(angle:number):readonly [number,number] {const radians=f(f(angle)*f(f(Math.PI)/180));return [f(Math.cos(radians)),f(0-f(Math.sin(radians)))];}
export function caveTunnelWidth256(cells:number):number {if(cells<=100)return 2;if(cells<300)return f(2+f(f((cells-100)/200)*2));if(cells<3000)return f(4+f(f((cells-300)/2700)*f(1.5)));return f(5.5);}
const approximately=(a:number,b:number)=>Math.abs(f(b-a))<Math.max(f(f(1e-6)*Math.max(Math.abs(a),Math.abs(b))),f(8*1.401298464324817e-45));
export function generateLocalCaves256(input:LocalCaveInputs256,postElevationRandom:WorldGenerationRandom):Float32Array {
 const {width,height,elevation,plan}=input,n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<8||height<8||width>400||height>400||!(elevation instanceof Float32Array)||elevation.length!==n||elevation.some(v=>!Number.isFinite(v))||!plan||plan.revision!==1||!Number.isInteger(plan.directionSeed)||plan.directionSeed< -2147483648||plan.directionSeed>2147483647)throw Error('Invalid actual cave provenance');
 const cave=new Float32Array(n),visitedRock=new Uint8Array(n),queue=new Int32Array(n),distance=new Int32Array(n),seen=new Uint32Array(n);let stamp=0;
 const inBounds=(x:number,z:number)=>x>=0&&z>=0&&x<width&&z<height;
 const rock=(x:number,z:number)=>inBounds(x,z)&&elevation[z*width+x]!>f(.7);
 const has=(set:ReadonlySet<number>,x:number,z:number)=>inBounds(x,z)&&set.has(z*width+x);
 const directionNoise=createWorldPerlin({frequency:f(.00205),lacunarity:2,persistence:.5,octaves:4,seed:plan.directionSeed,quality:'medium'});
 const random=postElevationRandom;
 function flood(roots:readonly number[],pass:(cell:number)=>boolean,maxDistance=Number.MAX_SAFE_INTEGER):number[]{
  stamp++;let head=0,tail=0;const result:number[]=[];for(const root of roots){queue[tail++]=root;seen[root]=stamp;distance[root]=0;}
  while(head<tail){const cell=queue[head++]!,d=distance[cell]!;result.push(cell);if(d>=maxDistance)continue;const x=cell%width,z=Math.floor(cell/width);
   for(const [dx,dz] of FLOOD_DIRECTIONS){const nx=x+dx,nz=z+dz;if(!inBounds(nx,nz))continue;const next=nz*width+nx;if(seen[next]===stamp||!pass(next))continue;seen[next]=stamp;distance[next]=d+1;queue[tail++]=next;}
  }return result;
 }
 function opened(group:readonly number[]):number[]{
  const membership=new Set(group),edges=group.filter(cell=>{const x=cell%width,z=Math.floor(cell/width);return EDGE_DIRECTIONS.some(([dx,dz])=>!has(membership,x+dx,z+dz));});
  if(!edges.length)return [...group];const inward=flood(edges,c=>membership.has(c)).filter(c=>distance[c]!>=6);if(!inward.length)return [];
  return flood(inward,()=>true,6);
 }
 function substantial(group:readonly number[]):number[]{
  const remaining=new Set(group),done=new Set<number>();for(const start of group){if(done.has(start)||!remaining.has(start))continue;const component=flood([start],c=>remaining.has(c));for(const cell of component)done.add(cell);if(component.length<300||component.length<f(f(.05)*group.length))for(const cell of component)remaining.delete(cell);}
  // This exact usage never reinserts a removed slot: JS insertion order equals
  // installed Mono HashSet slot enumeration after its stable resize copies.
  return [...remaining];
 }
 function rayCells(start:number,set:ReadonlySet<number>,dx:number,dz:number,maximum:number):number {
  const x=start%width,z=Math.floor(start/width);for(let i=0;i<=maximum;i++)if(!has(set,x+dx*i,z+dz*i))return i;return maximum;
 }
 function rayAngle(start:number,set:ReadonlySet<number>,angle:number,maximum:number):number {
  const [dx,dz]=caveDirection256(angle),x=f(start%width+.5),z=f(Math.floor(start/width)+.5);
  for(let i=0;i<=maximum;i++)if(!has(set,Math.trunc(f(x+f(dx*i))),Math.trunc(f(z+f(dz*i)))))return i;return maximum;
 }
 function distanceToCave(start:number,set:ReadonlySet<number>,maximum:number,openSpace:boolean):number {
  const x=start%width,z=Math.floor(start/width),radial=caveRadialPattern256(maximum);
  for(let i=0;i<radial.count;i++){const [dx,dz,r]=radial.offsets[i]!,nx=x+dx,nz=z+dz;if(openSpace&&!has(set,nx,nz)||inBounds(nx,nz)&&cave[nz*width+nx]!>0)return r;}return maximum;
 }
 function initialDirection(start:number,set:ReadonlySet<number>):{angle:number;distance:number}{
  const d=RAY_DIRECTIONS.map(([x,z])=>rayCells(start,set,x,z,40)),[e,w,s,no,nw,ne,sw,se]=d as [number,number,number,number,number,number,number,number];
  const raw=[f(f(e+f(se/2))+f(ne/2)),f(f(se+f(s/2))+f(e/2)),f(f(s+f(se/2))+f(sw/2)),f(f(sw+f(s/2))+f(w/2)),f(f(w+f(sw/2))+f(nw/2)),f(f(nw+f(no/2))+f(w/2)),f(f(no+f(ne/2))+f(nw/2)),f(f(ne+f(no/2))+f(e/2))];
  const weighted=raw.map(score=>f(score+random.float(0,f(.0001))));let best=0;for(let i=1;i<8;i++)if(weighted[i]!>weighted[best]!)best=i;return {angle:best*45,distance:Math.max(...d)};
 }
 function edgeStart(group:readonly number[],set:ReadonlySet<number>):number {
  const choices=group.filter(cell=>{const x=cell%width,z=Math.floor(cell/width);return Math.min(x,z,width-1-x,height-1-z)>=3&&cave[cell]===0&&EDGE_DIRECTIONS.some(([dx,dz])=>!has(set,x+dx,z+dz));});
  const actual=choices.length?choices:group;return actual[random.integer(0,actual.length)]!;
 }
 function setDisk(cell:number,tunnelWidth:number,owned:Set<number>):boolean {
  const x=cell%width,z=Math.floor(cell/width),radial=caveRadialPattern256(f(tunnelWidth/2));let collision=false;
  for(let i=0;i<radial.count;i++){const [dx,dz]=radial.offsets[i]!,nx=x+dx,nz=z+dz;if(!rock(nx,nz))continue;const target=nz*width+nx;if(cave[target]!>0&&!owned.has(target))collision=true;cave[target]=Math.max(cave[target]!,tunnelWidth);owned.add(target);}return collision;
 }
 function carve(start:number,angle:number,widthAtStart:number,set:ReadonlySet<number>,closed:boolean,owned=new Set<number>()):void {
  // Even width-noise amplitude0 constructs its module with one actual Rand.Int.
  // Its finite sample multiplied by0 is exactly0, so no unused noise field is built.
  random.integerValue();let x=f(start%width+.5),z=f(Math.floor(start/width)+.5),cell=start,length=0,tunnelWidth=widthAtStart,steps=0,leftBranch=false,rightBranch=false;
  const branch=(low:number,high:number,width:number)=>{let best=-1,chosen=-1;for(let i=0;i<6;i++){const candidate=f(angle+random.float(low,high)),reach=rayAngle(cell,set,candidate,50);if(reach>best){best=reach;chosen=candidate;}}if(best>=18)carve(cell,chosen,width,set,closed,owned);};
  for(;;){const cx=cell%width,cz=Math.floor(cell/width);
   if(closed){const radial=caveRadialPattern256(f(f(tunnelWidth/2)+f(1.5)));for(let i=0;i<radial.count;i++){const [dx,dz]=radial.offsets[i]!,nx=cx+dx,nz=cz+dz,key=nz*width+nx;if(!has(owned,nx,nz)&&(!has(set,nx,nz)||inBounds(nx,nz)&&cave[key]!>0))return;}}
   if(steps>=10&&tunnelWidth>f(f(1.4)+f(.4))){if(!leftBranch&&random.value()<f(.02)){branch(40,90,f(tunnelWidth-random.float(f(.2),f(.4))));leftBranch=true;}if(!rightBranch&&random.value()<f(.02)){branch(-90,-40,f(tunnelWidth-random.float(f(.2),f(.4))));rightBranch=true;}}
   if(setDisk(cell,Math.max(tunnelWidth,1),owned))return;
   while(Math.trunc(x)===cx&&Math.trunc(z)===cz){const [dx,dz]=caveDirection256(angle);x=f(x+f(dx*f(.5)));z=f(z+f(dz*f(.5)));length=f(length+f(.5));}
   const nx=Math.trunc(x),nz=Math.trunc(z);if(!has(set,nx,nz))return;
   if(rock(cx,nz)){const bridge=nz*width+cx;cave[bridge]=Math.max(cave[bridge]!,tunnelWidth);owned.add(bridge);}cell=nz*width+nx;
   angle=f(angle+f(f(directionNoise(f(length*60),f((start%width)*200),f(Math.floor(start/width)*200)))*8));tunnelWidth=f(tunnelWidth-f(.034));if(tunnelWidth<f(1.4))return;steps++;
  }
 }
 function tunnelCount(size:number,rate:number,maximum:number,minimum:number):number {const amount=f(f(f(size*random.float(f(.9),f(1.1)))*f(rate))/10000),rounded=Math.trunc(amount)+(random.value()<f(amount%1)?1:0),cap=Math.min(rounded,maximum);return cap>0?random.integer(minimum,cap+1):0;}
 for(let root=0;root<n;root++){
  if(visitedRock[root]||!rock(root%width,Math.floor(root/width)))continue;
  const raw=flood([root],c=>elevation[c]!>f(.7));for(const cell of raw)visitedRock[cell]=1;const group=substantial(opened(raw));if(group.length<300)continue;const set=new Set(group),tunnelSize=caveTunnelWidth256(group.length),open=tunnelCount(group.length,5.8,3,1);
  for(let t=0;t<open;t++){let start=-1,clearance=-1,angle=-1,run=-1;for(let attempt=0;attempt<10;attempt++){const candidate=edgeStart(group,set),room=distanceToCave(candidate,set,40,false),direction=initialDirection(candidate,set);if(start===-1||room>clearance||approximately(room,clearance)&&direction.distance>run){start=candidate;clearance=room;angle=direction.angle;run=direction.distance;}}carve(start,angle,random.float(f(tunnelSize*f(.8)),tunnelSize),set,false);}
  const closed=tunnelCount(group.length,2.5,1,0);for(let t=0;t<closed;t++){let start=-1,clearance=-1;for(let attempt=0;attempt<7;attempt++){const candidate=group[random.integer(0,group.length)]!,room=distanceToCave(candidate,set,30,true);if(start===-1||room>clearance){start=candidate;clearance=room;}}const tunnelWidth=random.float(f(tunnelSize*f(.8)),tunnelSize);carve(start,random.float(0,360),tunnelWidth,set,true);}
 }
 return cave;
}
