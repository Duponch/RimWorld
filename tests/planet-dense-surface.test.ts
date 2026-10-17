import {prepareGlobeRivers} from '../src/ui/planet-river-geometry';
import type {WorldRiverId} from '../src/sim/world-rivers';
import {expect,test} from 'vitest';
import {prepareGlobeGeometry,pickGlobeTile,type GlobeVector} from '../src/ui/planet-surface';
const radius=.08,z=Math.sqrt(1-radius*radius);
const ring=Array.from({length:6},(_,i):GlobeVector=>[Math.cos(i*Math.PI/3)*radius,Math.sin(i*Math.PI/3)*radius,z]);
function fixture(scale:1|100){const center:GlobeVector=[0,0,z*scale],corners=ring.map((p):GlobeVector=>[p[0]*scale,p[1]*scale,p[2]*scale]);return {tiles:[{id:0,center}],radius:scale,corners:()=>corners,pigment:()=>[150,180,140] as const};}
test('radius100 converts only presentation buffers and preserves the raw sub-radius mean centre',()=>{
 const input=fixture(100),before=JSON.stringify(input.tiles),corners=JSON.stringify(input.corners()),geometry=prepareGlobeGeometry(input),unit=prepareGlobeGeometry(fixture(1));
 geometry.positions.forEach((value,index)=>expect(value).toBeCloseTo(unit.positions[index]!,7));expect(geometry.indices).toEqual(unit.indices);expect(geometry.centres[2]).toBeCloseTo(z,12);expect(geometry.centres[2]).toBeLessThan(1);expect(pickGlobeTile(geometry,[0,0,1])).toBe(0);expect(JSON.stringify(input.tiles)).toBe(before);expect(JSON.stringify(input.corners())).toBe(corners);
});
test('a partial coverage uses supplied full corners and never picks its nearest retained tile across a hole',()=>{
 const geometry=prepareGlobeGeometry(fixture(100));expect(geometry.counts[0]).toBe(6);expect(pickGlobeTile(geometry,[.02,0,Math.sqrt(1-.02*.02)])).toBe(0);expect(pickGlobeTile(geometry,[.2,0,Math.sqrt(1-.2*.2)])).toBeNull();expect(pickGlobeTile(geometry,[0,0,-1])).toBeNull();
});
test('the prepared surface refuses corrupt duplicate identity and non-canonical corners rather than fabricating geometry',()=>{
 const input=fixture(100);expect(()=>prepareGlobeGeometry({...input,tiles:[...input.tiles,...input.tiles]})).toThrow('Centre');expect(()=>prepareGlobeGeometry({...input,corners:()=>[[0,0,0],[1,0,0],[0,1,0]]})).toThrow('Polygone');
});

function riverFixture(river:WorldRiverId='river'){
 const s=.04,point=(x:number,y:number):GlobeVector=>[x*100,y*100,Math.sqrt(1-x*x-y*y)*100],a=point(0,-s),b=point(0,s),rings:GlobeVector[][]=[[a,b,point(-s,2*s),point(-2*s,s),point(-2*s,-s),point(-s,-2*s)],[b,a,point(s,-2*s),point(2*s,-s),point(2*s,s),point(s,2*s)]];
 const tiles=rings.map((ring,id)=>({id,biome:id===0?'ocean':'temperate-forest',center:[0,1,2].map(axis=>ring.reduce((sum,p)=>sum+p[axis]!,0)/ring.length) as unknown as GlobeVector,rivers:[{neighbour:1-id,river}]}));return {tiles,rings,corners:(id:number)=>rings[id]!};
}
test('river drawing keeps potential links on both sides of an Ocean shore, separately from inspection visibility',()=>{
 const source=riverFixture(),before=JSON.stringify(source.tiles),corners=JSON.stringify(source.rings),[border,inner]=prepareGlobeRivers(source.tiles,source.corners,100);expect(border.indices.length).toBeGreaterThan(0);expect(inner.indices.length).toBeGreaterThan(0);expect([...border.positions].some((v,i)=>i%3===0&&v<0)).toBe(true);expect([...border.positions].some((v,i)=>i%3===0&&v>0)).toBe(true);expect(JSON.stringify(source.tiles)).toBe(before);expect(JSON.stringify(source.rings)).toBe(corners);
});
test('river edge width stays unclamped and a single exit tapers to transparent centre; creek has no inner ribbon',()=>{
 const source=riverFixture('huge-river'),[border]=prepareGlobeRivers(source.tiles,source.corners,100);expect(border.positions[1]).toBeLessThan(source.rings[0]![0]![1]/100);expect([border.colors[3],border.colors[7],border.colors[11]]).toEqual([0,255,0]);expect([border.colors[15],border.colors[19],border.colors[23]]).toEqual([0,0,0]);const creek=riverFixture('creek');expect(prepareGlobeRivers(creek.tiles,creek.corners,100)[1].indices).toHaveLength(0);
});
test('a potential river without the actual shared edge is refused instead of becoming a false centre-to-centre stroke',()=>{
 const source=riverFixture();expect(()=>prepareGlobeRivers(source.tiles,id=>id===0?source.rings[0]!:source.rings[1]!.map((p):GlobeVector=>[p[0]+1,p[1],p[2]]),100)).toThrow('arête commune');
});
