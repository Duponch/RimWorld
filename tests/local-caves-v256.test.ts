import {expect,test} from 'vitest';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {localCaveInitPlan256,generateLocalCaves256,caveDirection256,caveTunnelWidth256} from '../src/sim/local-caves-256.ts';
import {caveRadialPattern256} from '../src/sim/local-cave-radial-256.ts';
import {localCaveTerrainPlan256,applyLocalCaveTerrain256} from '../src/sim/local-cave-terrain-256.ts';
import type {NaturalTerrainId256} from '../src/sim/local-terrain-definitions-256.ts';

test('radial construction contains each lattice cell once and uses inclusive float radii',()=>{
 const zero=caveRadialPattern256(0);expect(zero.count).toBe(1);expect(zero.offsets[0]).toEqual([0,0,0]);expect(caveRadialPattern256(1).count).toBe(5);expect(caveRadialPattern256(Math.fround(Math.sqrt(2))).count).toBe(9);
 const radial=caveRadialPattern256(40),expected=new Set<string>();for(let x=-40;x<=40;x++)for(let z=-40;z<=40;z++)if(x*x+z*z<=1600)expected.add(x+':'+z);const actual=new Set(radial.offsets.slice(0,radial.count).map(([x,z])=>x+':'+z));expect(actual).toEqual(expected);expect(actual.size).toBe(radial.count);expect(Object.isFrozen(radial.offsets)).toBe(true);for(let i=1;i<radial.offsets.length;i++)expect(radial.offsets[i]![2]).toBeGreaterThanOrEqual(radial.offsets[i-1]![2]);
 // Native tie permutation is compared separately by ROOT against installed
 // GenRadial.RadialPattern, not certified merely by this set equality.
});

test('Init owns one direction seed while a small rock group consumes no carving draw',()=>{
 const init=new WorldGenerationRandom(71),plan=localCaveInitPlan256(init);expect(init.state.counter).toBe(1);const stream=new WorldGenerationRandom(72),elevation=new Float32Array(64).fill(1),before=elevation.slice();const caves=generateLocalCaves256({width:8,height:8,elevation,plan},stream);expect(caves).toEqual(new Float32Array(64));expect(stream.state.counter).toBe(0);expect(elevation).toEqual(before);expect(caves.buffer).not.toBe(elevation.buffer);
});

test('morphological opening removes a genuinely narrow component instead of carving a rectangle or rerolling it',()=>{
 const width=40,height=80,elevation=new Float32Array(width*height);for(let z=0;z<height;z++)for(let x=14;x<22;x++)elevation[z*width+x]=1;const before=elevation.slice(),stream=new WorldGenerationRandom(151),plan=localCaveInitPlan256(new WorldGenerationRandom(81));const caves=generateLocalCaves256({width,height,elevation,plan},stream);expect(caves.some(v=>v>0)).toBe(false);expect(stream.state.counter).toBe(0);expect(elevation).toEqual(before);
});

test('real connected rock produces continuous radial cave widths and exact private-stream replay without touching elevation',()=>{
 const width=96,height=96,elevation=new Float32Array(width*height).fill(1),before=elevation.slice(),plan=localCaveInitPlan256(new WorldGenerationRandom(678)),a=new WorldGenerationRandom(1239847543),b=new WorldGenerationRandom(1239847543);const first=generateLocalCaves256({width,height,elevation,plan},a),second=generateLocalCaves256({width,height,elevation,plan},b);expect(first).toEqual(second);expect(a.state).toEqual(b.state);expect(a.state.counter).toBeGreaterThan(2);expect(first.some(v=>v>0)).toBe(true);expect([...first].filter(v=>v>0).every(v=>v>=Math.fround(1.4)&&Math.fround(v)===v)).toBe(true);expect(elevation).toEqual(before);
});

test('actual grid validation precedes draws and direction/width curves retain their defined units',()=>{
 const stream=new WorldGenerationRandom(12),plan={revision:1 as const,directionSeed:1};expect(()=>generateLocalCaves256({width:8,height:8,elevation:new Float32Array(63),plan},stream)).toThrow();const invalid=new Float32Array(64);invalid[0]=NaN;expect(()=>generateLocalCaves256({width:8,height:8,elevation:invalid,plan},stream)).toThrow();expect(stream.state.counter).toBe(0);expect(caveDirection256(0)).toEqual([1,0]);expect(caveDirection256(90)[1]).toBe(-1);expect(Math.abs(caveDirection256(90)[0])).toBeLessThan(1e-6);expect(caveTunnelWidth256(100)).toBe(2);expect(caveTunnelWidth256(300)).toBe(4);expect(caveTunnelWidth256(3000)).toBe(5.5);
});

test('post-terrain consumes exactly its two shared seeds and preserves river/noncave/nonpositive-elevation cells and all inputs',()=>{
 const width=32,height=32,n=width*height,elevation=new Float32Array(n).fill(1),caves=new Float32Array(n).fill(2),terrain:NaturalTerrainId256[]=Array(n).fill('soil-natural');terrain[3]='river-shallow';caves[5]=0;elevation[7]=0;const before=[elevation.slice(),caves.slice(),[...terrain]],stream=new WorldGenerationRandom(562343345),plan=localCaveTerrainPlan256(stream);expect(stream.state.counter).toBe(2);
 const next=applyLocalCaveTerrain256({width,height,elevation,caves,terrain,plan,shallowFreshWaterAt:()=> 'water-shallow'}),copy=applyLocalCaveTerrain256({width,height,elevation,caves,terrain,plan,shallowFreshWaterAt:()=> 'water-shallow'});expect(next).toEqual(copy);expect(next).not.toBe(terrain);expect(next[0]).toBe('soil-natural');expect(next[3]).toBe('river-shallow');expect(next[5]).toBe('soil-natural');expect(next[7]).toBe('soil-natural');expect([elevation,caves,terrain]).toEqual(before);expect(stream.state.counter).toBe(2);stream.integerValue();expect(stream.state.counter).toBe(3);
});
