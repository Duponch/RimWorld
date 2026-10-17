import {test,expect} from 'vitest';
import {drawCampCenterCell256,drawCampSpawnCell256,stagedCampArrivalRandom256,type CampArrivalRandom256} from '../src/sim/camp-center-entry-256';
import {validArrivalRotation256,arrivalRotationYaw256,finishArrivalFacing256} from '../src/sim/arrival-rotation-256';
import type {RandomClosewalkCapture256} from '../src/sim/random-closewalk-256';
/** Primitive geometry doubles only. No fake World, animal, or group is
 * stepped and these oracles do not claim a composed entry was exercised. */
function geometry(single=false,edge:()=>boolean=()=>true):RandomClosewalkCapture256 {
 const width=200,height=200,cell=20100;
 const region=Object.freeze({id:0,type:'normal' as const,cellCount:1,cells:Object.freeze([cell]),bounds:Object.freeze({minX:100,maxX:100,minZ:100,maxZ:100}),links:Object.freeze([] as number[])});
 const physical={width,height,standable:(c:number)=>!single||c===cell,normalWalkable:(c:number)=>!single||c===cell,regionType:()=> 'normal' as const,district:()=>({id:0,type:'normal' as const,touchesMapEdge:edge(),cellCount:single?1:40000}),edifice:()=>false,heavy:()=>true,roofed:()=>false,capturedAnchorOpenAreaIncludes:()=>true};
 return {width,height,physical,regions:[region],regionAt:c=>c===cell?region:undefined,adjustNonStandableRoot:c=>c};
}
function minimum(){const calls:[number,number][]=[];const random:CampArrivalRandom256={integer:(a,b)=>{calls.push([a,b]);return a;},value:()=>{throw Error('No weighted Value expected');}};return {calls,random};}
test('Center samples its real clipped rectangle; the first expanded radius is sampled on iteration31',()=>{
 const a=minimum();expect(drawCampCenterCell256(geometry(),a.random)).toBe(90*200+90);expect(a.calls).toEqual([[90,111],[90,111]]);
 let checks=0;const b=minimum();expect(drawCampCenterCell256(geometry(false,()=>++checks===31),b.random)).toBe(85*200+85);expect(checks).toBe(31);expect(b.calls).toHaveLength(62);expect(b.calls.at(-2)).toEqual([85,116]);
});
test('Spawn immediate root is draw-free; exhausted occupied unit-region falls back without invented unit draws',()=>{
 const c=geometry(true),r=minimum(),root=20100;
 expect(drawCampSpawnCell256(c,root,new Set(),()=>false,r.random)).toBe(root);expect(r.calls).toEqual([]);
 expect(drawCampSpawnCell256(c,root,new Set([root]),()=>false,r.random)).toBe(root);expect(r.calls).toEqual([]);
});
test('actual campaign RNG is staged, and rotation survives until an actual directed action',()=>{
 const source={rng:305419896},r=stagedCampArrivalRandom256(source.rng),rotation=r.integer(0,4);
 expect(rotation).toBeGreaterThanOrEqual(0);expect(rotation).toBeLessThan(4);expect(r.draws).toBe(1);expect(source.rng).toBe(305419896);expect(r.rng).not.toBe(source.rng);
 const actor:{x:number;z:number;arrivalRotation?:0|1|2|3}={x:2,z:3,arrivalRotation:1};expect(arrivalRotationYaw256(actor)).toBe(Math.PI/2);expect(arrivalRotationYaw256({arrivalRotation:3})).toBe(-Math.PI/2);
 finishArrivalFacing256(actor,{x:2,z:3});expect(actor.arrivalRotation).toBe(1);finishArrivalFacing256(actor,{x:3,z:3});expect(Object.hasOwn(actor,'arrivalRotation')).toBe(false);
});
test('rotation guard rejects future, undefined, accessor, inherited, and hidden state without reading a getter',()=>{
 expect(validArrivalRotation256({},255)).toBe(true);expect(validArrivalRotation256({arrivalRotation:0},256)).toBe(true);
 for(const version of [255,256])expect(validArrivalRotation256({arrivalRotation:undefined},version)).toBe(false);
 expect(validArrivalRotation256({arrivalRotation:0},255)).toBe(false);expect(validArrivalRotation256({arrivalRotation:4},256)).toBe(false);
 let reads=0;const accessor=Object.defineProperty({},'arrivalRotation',{enumerable:true,get(){reads++;return 0;}});
 expect(validArrivalRotation256(accessor,256)).toBe(false);expect(reads).toBe(0);
 expect(validArrivalRotation256(Object.create({arrivalRotation:0}),256)).toBe(false);expect(validArrivalRotation256(Object.defineProperty({},'arrivalRotation',{value:0}),256)).toBe(false);
});
