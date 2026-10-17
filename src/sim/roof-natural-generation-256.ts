/** Original generation-only roof cleanup. No World, damage, rubble or random
 * stream: generation removes even thick roofs quietly. Call at the actual
 * Terrain frontier, then again after River PostTerrain, never deferred to end. */
import {caveRadialPattern256} from './local-cave-radial-256.ts';
import type {RoofingState} from './roof-rules.ts';
export interface NaturalRoofFields256 {readonly width:number;readonly height:number;readonly roof:Uint8Array;readonly edifices:Uint8Array}
const RADIUS= Math.fround(6.9),RADIUS_SQ=RADIUS*RADIUS;
function checked(input:NaturalRoofFields256):void {
 const {width,height,roof,edifices}=input,n=width*height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>400||height>400||!(roof instanceof Uint8Array)||!(edifices instanceof Uint8Array)||roof.length!==n||edifices.length!==n)throw Error('Invalid natural roof fields');
 for(let i=0;i<n;i++)if(roof[i]!>2||edifices[i]!>1)throw Error('Invalid roof or holder code');
}
/** Cardinal neighbors plus self, no diagonally transmitted support. */
function neighbors(index:number,width:number,height:number):number[]{
 const x=index%width,z=Math.floor(index/width),out:number[]=[];
 if(z+1<height)out.push(index+width);if(x+1<width)out.push(index+1);if(z>0)out.push(index-width);if(x>0)out.push(index-1);return out;
}
export function removeBulkCollapsingNaturalRoofs256(input:NaturalRoofFields256,nearCells:readonly number[]):Uint8Array {
 checked(input);const {width,height,edifices}=input,n=width*height,roof=input.roof.slice(),radial=caveRadialPattern256(RADIUS);
 for(const i of nearCells)if(!Number.isInteger(i)||i<0||i>=n)throw Error('Invalid roof cleanup cell');
 const touchesHolder=(at:number):boolean=>!!edifices[at]||neighbors(at,width,height).some(i=>!!edifices[i]);
 const removeFloating=(roots:readonly number[]):void=>{
  const visited=new Set<number>();
  for(const root of roots)for(const start of [...neighbors(root,width,height),root]){
   if(!roof[start]||visited.has(start))continue;
   const component=[start];visited.add(start);let held=false;
   for(let head=0;head<component.length;head++){const at=component[head]!;if(touchesHolder(at))held=true;
    for(const next of neighbors(at,width,height))if(roof[next]&&!visited.has(next)){visited.add(next);component.push(next);}}
   if(!held)for(const at of component)roof[at]=0;
  }
 };
 const supported=(root:number):boolean=>{
  const rx=root%width,rz=Math.floor(root/width),queue=[root],seen=new Set(queue);
  const inside=(i:number):boolean=>(i%width-rx)**2+(Math.floor(i/width)-rz)**2<=RADIUS_SQ;
  for(let head=0;head<queue.length;head++){
   const at=queue[head]!,adj=neighbors(at,width,height);
   if(edifices[at]||adj.some(i=>inside(i)&&!!edifices[i]))return true;
   for(const next of adj)if(inside(next)&&roof[next]&&!seen.has(next)){seen.add(next);queue.push(next);}
  }return false;
 };
 for(const root of nearCells){
  removeFloating([root]);const removed:number[]=[],rx=root%width,rz=Math.floor(root/width);
  for(let r=0;r<radial.count;r++){const [dx,dz]=radial.offsets[r]!,x=rx+dx,z=rz+dz;if(x<0||z<0||x>=width||z>=height)continue;const i=z*width+x;
   if(roof[i]&&!supported(i)){roof[i]=0;removed.push(i);}}
  removeFloating(removed);
 }
 return roof;
}
/** Adopt only the real, already cleaned generated RoofGrid. */
export function roofingFromNaturalFields256(roof:Uint8Array):RoofingState {
 const thin:number[]=[],thick:number[]=[];
 for(let i=0;i<roof.length;i++){if(roof[i]===1)thin.push(i);else if(roof[i]===2)thick.push(i);else if(roof[i]!==0)throw Error('Invalid generated roof kind');}
 return {constructed:[],build:[],remove:[],cursor:0,natural:{thin,thick}};
}
