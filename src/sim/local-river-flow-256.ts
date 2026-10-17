/** Creation-time water movement derived from the ACTUAL river nodes and
 * displacement fields. Original portable arithmetic, not a Unity bit-parity
 * claim. No World mutation, fresh noise seed, gameplay RNG or per-frame scan. */
import type {LocalRiverNode256,LocalRiverNoisePlan256,RiverPoint256} from './local-river-256.ts';
import {createLocalRiverField256} from './local-river-256.ts';
const f=Math.fround;
export interface RiverFlowNode256 {readonly node:LocalRiverNode256;readonly displaced:(t:number)=>RiverPoint256}
export interface RiverFlowSamples256 {readonly cells:readonly RiverPoint256[];readonly movements:readonly RiverPoint256[];readonly widths:readonly number[]}
/** Core samples the displaced line every TWO units of the undisplaced node.
 * The initial previous point is start-unitDirection, so its first vector is
 * one unit, deliberately different from the later two-unit vectors. */
export function sampleActualRiverFlow256(nodes:readonly RiverFlowNode256[]):RiverFlowSamples256 {
 if(nodes.length>256)throw Error('Unresolved river graph size');
 const cells:RiverPoint256[]=[],movements:RiverPoint256[]=[],widths:number[]=[];
 for(const {node,displaced} of nodes){
  if(![node.start.x,node.start.z,node.end.x,node.end.z,node.width].every(Number.isFinite)||node.width<=0||typeof displaced!=='function')throw Error('Invalid actual river flow node');
  const dx=f(node.end.x-node.start.x),dz=f(node.end.z-node.start.z),length=f(Math.sqrt(f(f(dx*dx)+f(dz*dz))));
  if(length<=f(1e-5)||length>4096)throw Error('Unresolved actual river flow extent');
  let previous={x:f(node.start.x-f(dx/length)),z:f(node.start.z-f(dz/length))};
  for(let distance=0;distance<length;distance+=2){
   const point=displaced(f(distance/length));
   if(!Number.isFinite(point.x)||!Number.isFinite(point.z))throw Error('Actual displaced river point is not finite');
   // IntVec3(Vector3) truncates toward zero, including padded negative cells.
   cells.push({x:Math.trunc(point.x),z:Math.trunc(point.z)});
   movements.push({x:f(point.x-previous.x),z:f(point.z-previous.z)});widths.push(node.width);previous=point;
  }
 }
 return {cells,movements,widths};
}
/** Exactly the recorded x-major WaterInfo layout: (x*height+z)*2. Terrain
 * callbacks read the real TOP terrain after generation, not a fresh mask or
 * the node's geometric strip. A zero-sample real river cell is explicitly
 * unresolved: Core division would create NaN; no zero/current is invented. */
export function generateActualRiverFlow256(input:{width:number;height:number;nodes:readonly RiverFlowNode256[];isRiver:(rowMajorCell:number)=>boolean}):{values:Float32Array;sampleCount:number;riverCells:number}{
 const {width,height}=input;
 if(!Number.isInteger(width)||width<8||width>400||!Number.isInteger(height)||height<8||height>400||typeof input.isRiver!=='function')throw Error('Invalid actual water lookup dimensions');
 const samples=sampleActualRiverFlow256(input.nodes),values=new Float32Array(width*height*2);let riverCells=0;
 for(let x=0;x<width;x++)for(let z=0;z<height;z++){
  if(!input.isRiver(z*width+x))continue;
  let count=0,sumX=0,sumZ=0;
  for(let i=0;i<samples.cells.length;i++){
   const cell=samples.cells[i]!,dx=cell.x-x,dz=cell.z-z,distance=f(Math.sqrt(dx*dx+dz*dz)),radius=f(f(f(samples.widths[i]!*f(1.5))/2)+1);
   if(distance>radius)continue;
   count++;const movement=samples.movements[i]!;sumX=f(sumX+movement.x);sumZ=f(sumZ+movement.z);
  }
  if(!count)throw Error(`Actual river cell ${x},${z} has no lookup sample; native NaN boundary remains unresolved`);
  const i=(x*height+z)*2;values[i]=f(sumX/count);values[i+1]=f(sumZ/count);riverCells++;
 }
 return {values,sampleCount:samples.cells.length,riverCells};
}
/** Join the original geography's real Init plan and post-terrain node. The
 * caller retains the SAME actual nodes until PostFog; no terrain is rerun. */
export function generateLocalRiverFlow256(input:{plan:LocalRiverNoisePlan256;node:LocalRiverNode256;isRiver:(cell:number)=>boolean}){
 const field=createLocalRiverField256(input.plan,input.node);
 return generateActualRiverFlow256({width:input.plan.width,height:input.plan.height,nodes:[{node:input.node,displaced:field.displaced}],isRiver:input.isRiver});
}
