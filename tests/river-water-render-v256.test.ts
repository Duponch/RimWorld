import {expect,test} from 'vitest';
import {bakeRiverWater256,RiverWaterField256,type RiverWaterVisualSource256} from '../src/render/river-water-bake-256';
import {packRiverWater256} from '../src/sim/river-water-owner-256';

test('asymmetric x-major flow bakes to row-major at the actual cell centres',()=>{
 const width=8,height=9,values=new Float32Array(width*height*2);
 for(let x=0;x<width;x++)for(let z=0;z<height;z++){const i=(x*height+z)*2;values[i]=x+10*z;values[i+1]=100+x-2*z;}
 const original=new Uint32Array(values.buffer).slice();
 const pixels=bakeRiverWater256(values,width,height,()=>true);
 expect(pixels[(3*width+2)*2]).toBe(32);expect(pixels[(3*width+2)*2+1]).toBe(96);
 expect(pixels[(0*width+0)*2]).toBe(5.5);expect(pixels[(0*width+0)*2+1]).toBe(99.5);
 expect(Array.from(new Uint32Array(values.buffer))).toEqual(Array.from(original));
});

test('dry neighbours count in the denominator, nonriver centres stay zero and bounds clip',()=>{
 const width=8,height=8,values=new Float32Array(width*height*2);
 values[(2*height+3)*2]=9;values[0]=8;
 const pixels=bakeRiverWater256(values,width,height,i=>i===3*width+2||i===0);
 expect(pixels[(3*width+2)*2]).toBe(1);expect(pixels[0]).toBe(2);
 expect(pixels[(3*width+1)*2]).toBe(0);
 expect(()=>bakeRiverWater256(values,8,9,()=>true)).toThrow(/extents/);
 // A large centre/N cancellation makes the actual neighbour order observable.
 const ordered=new Float32Array(128),put=(x:number,z:number,v:number)=>{ordered[(x*8+z)*2]=v;};
 put(4,4,1e20);put(4,5,-1e20);put(5,4,1);put(4,3,2);put(3,4,3);
 put(5,3,4);put(5,5,5);put(3,5,6);put(3,3,7);
 expect(bakeRiverWater256(ordered,8,8,i=>i===4*8+4)[(4*8+4)*2]).toBe(Math.fround(28/9));
});

test('confirmed owner/map reuse performs no terrain read; replacement and retirement invalidate once',()=>{
 // Narrow render inputs only, never an actual World/Planet admission claim.
 const values=new Float32Array(128);values[(2*8+3)*2]=9;
 const owner=packRiverWater256(values,8,8),words=[...owner.values];
 const source:RiverWaterVisualSource256={schemaVersion:256,width:8,height:8,seed:12,site:{revision:3,tileId:7,mapSeed:12},planet:{revision:3},riverWater:owner,campaignMap:{revision:2,activeMapId:4},tiles:Array.from({length:64},()=>({terrain:'river-shallow'}))};
 const field=new RiverWaterField256();expect(field.adopt(source)).toBe(true);const image=field.data;
 const noTerrainRead={...source,get tiles():RiverWaterVisualSource256['tiles']{throw Error('unchanged owner must not read tiles');}};
 expect(field.adopt(noTerrainRead)).toBe(false);expect(field.data).toBe(image);
 expect(field.adopt({...source,campaignMap:{revision:2,activeMapId:5}})).toBe(true);expect(field.data).not.toBe(image);
 expect(field.adopt({...source,riverWater:structuredClone(owner)})).toBe(true);
 expect(field.adopt({...source,riverWater:undefined})).toBe(true);expect(field.width).toBe(1);expect(Array.from(field.data)).toEqual([0,0]);
 expect(field.adopt({...source,riverWater:undefined})).toBe(false);
 expect(owner.values).toEqual(words);expect(Object.isFrozen(owner.values)).toBe(true);
});
