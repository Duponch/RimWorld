import {expect,test,vi} from 'vitest';
import {FilthPresentationPieces} from '../src/render/filth-presentation-pieces';
import {FilthPresentationPiecesReferenceH475} from './helper/filth-presentation-pieces-reference-h475';
import * as heights from '../src/render/surface-height';
import type {FilthSurface} from '../src/render/surface-height';
import type {FilthRecord} from '../src/sim/filth-rules';

type Reader=Pick<FilthPresentationPieces,'read'>;
const stain=(id:number,x:number,z:number,thickness=2):FilthRecord=>({id,x,z,kind:'blood',thickness,grownCore:1,expiresAfterCore:100,nextCheckCore:2});
function environment(){
 const raw:FilthSurface={width:16,height:16,tiles:Array.from({length:256},()=>({terrain:'soil'}))},trace:string[]=[];
 let onWidth:(()=>void)|undefined;
 const tiles=new Proxy(raw.tiles,{get(target,key,receiver){if(typeof key==='string'&&/^\d+$/.test(key))trace.push('tile:'+key);return Reflect.get(target,key,receiver);}});
 const surface:FilthSurface={
  get width(){trace.push('width');const hook=onWidth;onWidth=undefined;hook?.();return raw.width;},
  get height(){trace.push('height');return raw.height;},
  get tiles(){trace.push('tiles');return tiles;},
 };
 return {raw,surface,trace,arm:(hook:()=>void)=>{onWidth=hook;}};
}
function pair(){
 const candidate=new FilthPresentationPieces(),reference=new FilthPresentationPiecesReferenceH475(),c=environment(),r=environment();
 const step=(items:readonly FilthRecord[],reset=false,support=true)=>{
  c.trace.length=r.trace.length=0;
  const expected=reference.read(items,reset,support?r.surface:undefined),actual=candidate.read(items,reset,support?c.surface:undefined);
  expect(actual).toStrictEqual(expected);expect(c.trace).toStrictEqual(r.trace);return actual;
 };
 return {candidate,reference,c,r,step};
}

test('H reads every mutable support anew and preserves exact surface getter order and unchanged piece identities',()=>{
 const f=pair(),items=[stain(1,4,4),stain(2,4,4),stain(3,10,10)];
 const a=f.step(items),b=f.step(items);expect(b.changed).toBe(false);expect(b.blocks).toBe(a.blocks);
 for(const env of [f.c,f.r])env.raw.tiles[4*env.raw.width+4]!.floor='steel-tile';
 const c=f.step(items);expect(c.changed).toBe(true);expect(c.blocks[0]!.pieces).not.toBe(a.blocks[0]!.pieces);expect(c.blocks[2]!.pieces).toBe(a.blocks[2]!.pieces);
 const d=f.step(items);expect(d.changed).toBe(false);expect(d.blocks).toBe(c.blocks);
 for(const env of [f.c,f.r])delete env.raw.tiles[4*env.raw.width+4]!.floor;
 f.step(items);items[1]!.kind='vomit';f.step(items);items[0]!.grownCore++;expect(f.step(items).changed).toBe(false);
});

test('H preserves undefined cells, clipped outside stains, mutable dimensions, standalone support and explicit resets',()=>{
 const f=pair(),items=[stain(1,0,0,3),stain(2,15,15),stain(3,-3,4),stain(4,20,20)];
 for(const env of [f.c,f.r]){delete env.raw.tiles[0];env.raw.tiles[1]!.terrain='water';}
 f.step(items);expect(f.step(items).changed).toBe(false);
 for(const env of [f.c,f.r]){env.raw.width=8;env.raw.height=8;env.raw.tiles[0]={terrain:'soil',floor:'marble-tile'};}
 f.step(items);f.step(items,false,false);f.step(items,true,true);f.step(items);f.step([]);f.step(items);
});

test('H retains transparent block order and values through deletion, insertion, duplicate positions, ID restoration and reorder',()=>{
 const f=pair(),items=[stain(30,4,4),stain(10,4,4),stain(20,10,10)];
 f.step(items);const removed=items.splice(1,1)[0]!;f.step(items);items.push(removed);f.step(items);
 items.reverse();f.step(items);items.unshift(stain(40,4,4,4));f.step(items);items[2]!.thickness=1;f.step(items);
 f.step(items,true);expect(f.step(items).changed).toBe(false);
});

test('H keeps undefined distinct from a cache miss and preserves strict NaN inequality on every read',()=>{
 const original=heights.surfaceHeightAtCell;
 const spy=vi.spyOn(heights,'surfaceHeightAtCell').mockImplementation((surface,x,z)=>x===4&&z===4?NaN:x===5&&z===4?undefined:original(surface,x,z));
 try{
  const f=pair(),items=[stain(1,4,4),stain(2,4,4)];f.step(items);
  expect(f.step(items).changed).toBe(true);expect(f.step(items).changed).toBe(true);
 }finally{spy.mockRestore();}
});

test('H nested reads caused by a surface getter keep the outer per-read observations and exact original chronology',()=>{
 const f=pair(),items=[stain(1,4,4),stain(2,8,8)],nested=[stain(3,4,4)];f.step(items);
 const arm=(reader:Reader,env:ReturnType<typeof environment>)=>env.arm(()=>{
  reader.read(nested,true,env.surface);env.raw.tiles[4*env.raw.width+4]!.floor='steel-tile';
 });
 arm(f.reference,f.r);arm(f.candidate,f.c);f.step(items);f.step(items);
});

test('H restores its read scope after a throwing surface getter and retries current values',()=>{
 const f=pair(),items=[stain(1,4,4),stain(2,8,8)];f.step(items);
 const arm=(env:ReturnType<typeof environment>)=>env.arm(()=>{throw Error('support read failed');});arm(f.c);arm(f.r);
 f.c.trace.length=f.r.trace.length=0;
 expect(()=>f.reference.read(items,false,f.r.surface)).toThrow('support read failed');
 expect(()=>f.candidate.read(items,false,f.c.surface)).toThrow('support read failed');expect(f.c.trace).toEqual(f.r.trace);
 for(const env of [f.c,f.r])env.raw.tiles[4*env.raw.width+4]!.floor='steel-tile';f.step(items);f.step(items,true);f.step(items);
});
