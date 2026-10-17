import {expect,test} from 'vitest';
import {captureActualLocalDistricts256,type ActualStartMap256} from '../src/sim/actual-local-districts-256.ts';
import {findPlayerStartSpot256} from '../src/sim/player-start-256.ts';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {START_STRUCTURE_PHYSICS_256} from '../src/sim/player-start-physics-256.ts';
import type {Structure,StructureKind,Job} from '../src/sim/types.ts';
/** Declared isolated physical-map fixtures, not World/gameplay preparation.
 * Every field below is a real cell/owner field read by the production helper. */
function actualMap(width=21,height=21):ActualStartMap256 {
 return {schemaVersion:256,site:{revision:3},width,height,tiles:Array.from({length:width*height},()=>({terrain:'soil-natural'})),structures:[],resources:[],piles:[],packed:[],jobs:[],roofing:{constructed:[],build:[],remove:[],cursor:0}};
}
const structure=(id:number,kind:StructureKind,x:number,z:number):Structure=>({id,kind,x,z,orientation:0,footprint:'standard'});
const frame=(id:number,kind:Job['kind'],x:number,z:number):Job=>({id,kind,x,z,orientation:0,footprint:'standard',construction:'frame',status:'pending',reservedBy:null,progress:0,escrow:{wood:0,food:0}});
class CentreRandom extends WorldGenerationRandom {
 override integer(min:number,max:number):number {super.integer(min,max);return Math.max(min,Math.min(max-1,10));}
}
test('actual districts are same-type cardinal aggregates, not standability or room-temperature areas',()=>{
 const map=actualMap(7,7);let id=1;
 for(let z=2;z<=4;z++)for(let x=2;x<=4;x++)if(x!==3||z!==3)map.structures.push(structure(id++,'wall',x,z));
 const before=structuredClone(map),capture=captureActualLocalDistricts256(map);
 expect(capture.district(0)).toMatchObject({type:'normal',touchesMapEdge:true,cellCount:40});
 expect(capture.district(24)).toMatchObject({type:'normal',touchesMapEdge:false,cellCount:1});
 expect(capture.district(16)).toBeNull();expect(capture.regionType(16)).toBe('none');
 // A portal connects rooms for other systems, never merges their districts.
 map.structures=map.structures.filter(s=>s.x!==3||s.z!==2);map.structures.push(structure(100,'door',3,2));
 const doors=captureActualLocalDistricts256(map);
 expect(doors.district(17)).toMatchObject({type:'portal',cellCount:1,touchesMapEdge:false});expect(doors.standable(17)).toBe(true);
 expect(doors.district(24)).toMatchObject({cellCount:1,touchesMapEdge:false});expect(before.structures).toHaveLength(8);
});
test('pass-through plants/furniture/chunks count in Normal but fail Standable; carried and minified interiors are absent',()=>{
 const map=actualMap(10,10);
 map.structures.push(structure(1,'bed',1,1),structure(2,'orbital-beacon',5,1),structure(3,'pen-marker',7,1));
 map.resources.push({id:4,kind:'tree',species:'oak',x:5,z:5,amount:46});
 map.piles.push({id:5,kind:'chunk',item:'granite-chunk',quantity:1,owner:{type:'ground',x:7,z:7}},{id:6,kind:'chunk',item:'granite-chunk',quantity:1,owner:{type:'pawn',pawnId:400}});
 map.packed.push({building:structure(8,'bed',2,2),owner:{type:'ground',x:8,z:8}});
 const before=structuredClone(map),c=captureActualLocalDistricts256(map);
 expect(c.district(0)?.cellCount).toBe(100);expect(c.normalWalkable(11)).toBe(true);expect(c.standable(11)).toBe(false);expect(c.standable(55)).toBe(false);expect(c.standable(77)).toBe(false);
 expect(c.standable(15)).toBe(true);expect(c.standable(17)).toBe(false);expect(c.standable(88)).toBe(true);expect(c.edifice(88)).toBe(false);expect(map).toEqual(before);
});
test('FenceBlocked and real Frame inheritance remain distinct from Door and completed target',()=>{
 const map=actualMap(10,10);map.structures.push(structure(1,'fence',1,1),structure(2,'fence',2,1));
 map.jobs.push(frame(3,'wall',5,5),frame(4,'door',7,5),frame(5,'fence',8,5),frame(6,'lay-floor',8,8));
 const c=captureActualLocalDistricts256(map);
 expect(c.district(11)).toMatchObject({type:'fence',cellCount:2});expect(c.normalWalkable(11)).toBe(true);expect(c.standable(11)).toBe(false);
 expect(c.regionType(55)).toBe('normal');expect(c.normalWalkable(55)).toBe(true);expect(c.standable(55)).toBe(false);expect(c.edifice(55)).toBe(true);
 expect(c.regionType(57)).toBe('normal');expect(c.standable(57)).toBe(true);expect(c.regionType(58)).toBe('normal');expect(c.standable(58)).toBe(false);expect(c.edifice(88)).toBe(false);
});
test('literal water, natural roofs, bridge support and collapsed owner survive physical capture',()=>{
 const map=actualMap(10,10);map.tiles[11]={terrain:'water-deep'};map.tiles[12]={terrain:'water-shallow'};map.tiles[13]={terrain:'water-shallow',bridge:true};
 map.tiles[14]={terrain:'rock',bridge:true,collapsedRock:{id:99,terrain:'water-shallow'}};
 map.roofing={constructed:[22],build:[],remove:[],cursor:0,natural:{thin:[23],thick:[24]}};
 const before=structuredClone(map),c=captureActualLocalDistricts256(map);
 expect(c.regionType(11)).toBe('impassable-air');expect(c.district(11)).toBeNull();expect(c.standable(11)).toBe(false);
 expect(c.standable(12)).toBe(true);expect(c.heavy(12)).toBe(false);expect(c.standable(13)).toBe(true);expect(c.heavy(13)).toBe(false);
 expect(c.standable(14)).toBe(false);expect(c.edifice(14)).toBe(true);expect(c.regionType(14)).toBe('none');
 expect([22,23,24].map(i=>c.roofed(i))).toEqual([true,true,true]);expect(map).toEqual(before);
});
test('captured-anchor compatibility includes edifices and water once any actual no-edifice anchor exists',()=>{
 const map=actualMap(5,5);for(const tile of map.tiles)tile.terrain='rock';
 const allSolid=captureActualLocalDistricts256(map);expect(allSolid.capturedAnchorOpenAreaIncludes(0)).toBe(false);
 map.tiles[12]={terrain:'water-deep'};const before=structuredClone(map),c=captureActualLocalDistricts256(map);
 // Conventional NOEDIFICE flood would contain only12. The observed captured
 // predicate floods ALL cells; this explicitly preserves that distinction.
 expect(c.capturedAnchorOpenAreaIncludes(0)).toBe(true);expect(c.edifice(0)).toBe(true);expect(c.capturedAnchorOpenAreaIncludes(12)).toBe(true);expect(c.standable(12)).toBe(false);expect(map).toEqual(before);
});
test('real start consumes the current stream, preserves identities, and honours actual Layout/Used rectangles before fallback',()=>{
 const map=actualMap(),before=structuredClone(map),random=new CentreRandom(41);
 const direct=findPlayerStartSpot256({map,layoutRects:[],usedRects:[]},random);
 expect(direct.cell).toBe(220);expect(direct.random).toEqual(random.state);expect(direct.random.counter).toBe(2);expect(map).toEqual(before);
 for(const field of ['layoutRects','usedRects'] as const){
  const rng=new CentreRandom(41),input={map,layoutRects:[],usedRects:[],[field]:[{minX:10,minZ:10,width:1,height:1}]};
  const fallback=findPlayerStartSpot256(input,rng);expect(fallback.cell).toBe(220);expect(fallback.random.counter).toBe(14002);expect(map).toEqual(before);
 }
});
test('the exhausted-band fallback is Standable ONLY; existing valid start consumes no draw and no dry-cell rescue is invented',()=>{
 const map=actualMap();map.roofing={constructed:[220],build:[],remove:[],cursor:0};map.tiles[220]={terrain:'water-shallow'};
 const random=new CentreRandom(12),before=structuredClone(map),result=findPlayerStartSpot256({map,layoutRects:[],usedRects:[]},random);
 expect(result.cell).toBe(220);expect(result.random.counter).toBe(14002);expect(map).toEqual(before);
 const saved=random.state;expect(findPlayerStartSpot256({map,layoutRects:[],usedRects:[],existingStart:220},random)).toEqual({cell:220,random:saved,reused:true});expect(random.state).toEqual(saved);
 for(const tile of map.tiles)tile.terrain='water-deep';const exhausted=new CentreRandom(12);
 expect(findPlayerStartSpot256({map,layoutRects:[],usedRects:[]},exhausted).cell).toBeNull();expect(exhausted.state.counter).toBe(16000);
});
test('prospective physical metadata has no historical admission, species substitute or ambiguous edifice fallback',()=>{
 const old={...actualMap(),schemaVersion:255};expect(()=>captureActualLocalDistricts256(old)).toThrow(/Site3/);
 const unresolved=actualMap();unresolved.resources.push({id:1,kind:'rock',x:1,z:1,amount:1});expect(()=>captureActualLocalDistricts256(unresolved)).toThrow(/Resource.rock/);
 const noSpecies=actualMap();noSpecies.resources.push({id:1,kind:'tree',x:1,z:1,amount:1});expect(()=>captureActualLocalDistricts256(noSpecies)).toThrow(/species/);
 const overlap=actualMap();overlap.structures.push(structure(1,'door',1,1),structure(2,'fence',1,1));expect(()=>captureActualLocalDistricts256(overlap)).toThrow(/edifice/);
 expect(START_STRUCTURE_PHYSICS_256['orbital-beacon'].passability).toBe(0);expect(START_STRUCTURE_PHYSICS_256['pen-marker'].passability).toBe(1);
});
