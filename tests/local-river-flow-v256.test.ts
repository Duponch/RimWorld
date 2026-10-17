import {expect,test} from 'vitest';
import {generateActualRiverFlow256,sampleActualRiverFlow256,type RiverFlowNode256} from '../src/sim/local-river-flow-256';
const straight=(z:number):RiverFlowNode256=>({node:{start:{x:-1,z},end:{x:9,z},width:4,seed:123},displaced:t=>({x:Math.fround(-1+Math.fround(t*10)),z})});
test('real line samples preserve the first one-unit movement and later two-unit movements, including negative truncation',()=>{
 const input=straight(-.75),s=sampleActualRiverFlow256([input]);
 expect(s.cells).toHaveLength(5);expect(s.cells[0]).toEqual({x:-1,z:-0});expect(s.movements[0]).toEqual({x:1,z:0});expect(s.movements.slice(1).map(p=>p.x)).toEqual([2,2,2,2]);
 expect(input.node.start).toEqual({x:-1,z:-.75});
});
test('the water lookup reads actual top river terrain and stores x-major vectors without filling non-river cells',()=>{
 const seen:number[]=[],r=generateActualRiverFlow256({width:8,height:10,nodes:[straight(3)],isRiver:cell=>{seen.push(cell);return cell===3*8+2;}});
 expect(seen).toHaveLength(80);expect(seen.slice(0,11)).toEqual([0,8,16,24,32,40,48,56,64,72,1]);expect(r.riverCells).toBe(1);expect(r.sampleCount).toBe(5);
 expect(r.values[(2*10+3)*2]).toBe(1.75);expect(r.values[(2*10+3)*2+1]).toBe(0);expect([...r.values].filter(v=>v!==0)).toHaveLength(1);
});
test('zero-sample river and malformed nodes refuse without inventing finite water movement; a real empty graph stays empty',()=>{
 expect(()=>generateActualRiverFlow256({width:8,height:8,nodes:[],isRiver:c=>c===0})).toThrow('no lookup sample');
 expect(()=>sampleActualRiverFlow256([{...straight(1),node:{...straight(1).node,end:{x:-1,z:1}}}])).toThrow('extent');
 expect(generateActualRiverFlow256({width:8,height:8,nodes:[],isRiver:()=>false}).values.every(v=>v===0)).toBe(true);
});
