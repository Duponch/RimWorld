import {expect,test} from 'vitest';
import {addMonumentThing256,addMonumentFloor256,CORE_MONUMENT_CATALOGUE_256,type MonumentBuildable256} from '../src/sim/ancient-monument-plan-256.ts';
import {resolveAncientTempleMonument256} from '../src/sim/ancient-monument-ruin-256.ts';
import {ancientTempleRoofCells256,largestAncientTempleInterior256} from '../src/sim/ancient-temple-envelope-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';

function preparedSketch(){const rows:MonumentBuildable256[]=[];for(let x=0;x<5;x++)for(let z=0;z<5;z++){if(x===0||x===4||z===0||z===4)addMonumentThing256(rows,'wall',x,z,'granite-blocks');else addMonumentFloor256(rows,x,z,'granite-tile');}return rows;}

test('actual roof flood includes the enclosed room and its eight adjacent roof holders; an exterior breach leaves no roof',()=>{
 const rows=preparedSketch();expect(new Set(ancientTempleRoofCells256(rows).map(c=>`${c.x},${c.z}`))).toEqual(new Set(Array.from({length:25},(_,i)=>`${i%5},${Math.floor(i/5)}`)));
 const breached=rows.filter(b=>!(b.type==='thing'&&b.kind==='wall'&&b.x===2&&b.z===0));expect(ancientTempleRoofCells256(breached)).toEqual([]);
});
test('DoorBase and Column remain real roof holders and interior search excludes Wall only, including terrain beneath furniture',()=>{
 const rows=preparedSketch();addMonumentThing256(rows,'door',2,0,'granite-blocks');addMonumentThing256(rows,'column',2,2,'granite-blocks');
 expect(ancientTempleRoofCells256(rows)).toHaveLength(25);expect(largestAncientTempleInterior256(rows,new WorldGenerationRandom(77))).toEqual({minX:1,minZ:1,maxX:3,maxZ:3});
});
test('FindBiggestRect consumes three distinct full occupied-rect scans without redrawing or replacing any buildable',()=>{
 const rows=preparedSketch(),before=JSON.stringify(rows);let scans=0;const stream={integer:(a:number,b:number)=>{scans++;return a;},float:()=>{throw Error('Unexpected float');},value:()=>{throw Error('Unexpected chance');},boolean:()=>{throw Error('Unexpected bool');}};
 expect(largestAncientTempleInterior256(rows,stream)).toEqual({minX:1,minZ:1,maxX:3,maxZ:3});expect(scans).toBe(3*25);expect(JSON.stringify(rows)).toBe(before);
});
test('Temple resolver inherits closed nonflammable walls into children and preserves full HP before any real damage',()=>{
 for(const seed of [17,731]){
  const rows=resolveAncientTempleMonument256(17,19,CORE_MONUMENT_CATALOGUE_256,new WorldGenerationRandom(seed));const walls=rows.filter(b=>b.type==='thing'&&b.kind==='wall');expect(walls.length).toBeGreaterThan(0);
  for(const b of rows)if(b.type==='thing'){expect(b.hitPoints).toBe(b.maxHitPoints);if(b.kind==='wall')expect(b.material).toMatch(/-blocks$/);}
  expect(ancientTempleRoofCells256(rows).length).toBeGreaterThan(0);
 }
});
