import {expect,test} from 'vitest';
import {captureRandomClosewalk256,randomClosewalkCellNear256,tryRandomClosewalkCellNear256} from '../src/sim/random-closewalk-256';
import {captureGeographicGenerationReachability256} from '../src/sim/geographic-generation-reachability-256';
import type {ActualStartMap256} from '../src/sim/actual-local-districts-256';
import {WorldGenerationRandom} from '../src/sim/world-generation-random';
import {newDoorState} from '../src/sim/door-rules';
import type {Structure,StructureKind} from '../src/sim/types';
/** Isolated physical fixtures, not a substituted World or gameplay result. */
function map(width:number,height:number):ActualStartMap256 {return {schemaVersion:256,site:{revision:3},width,height,tiles:Array.from({length:width*height},()=>({terrain:'soil-natural'})),structures:[],resources:[],piles:[],packed:[],jobs:[],roofing:{constructed:[],build:[],remove:[],cursor:0}};}
const structure=(id:number,kind:StructureKind,x:number,z:number):Structure=>({id,kind,x,z,orientation:0,footprint:'standard',...kind==='door'?{door:newDoorState(0)}:{}});
class Scripted extends WorldGenerationRandom {
 integers=0;values=0;constructor(readonly sequence:readonly number[]=[],readonly uniform=0){super(59);}
 override integer(min:number,max:number){super.integer(min,max);const value=this.sequence[this.integers++]??min;if(value<min||value>=max)throw Error('Bad source oracle draw');return value;}
 override value(){super.value();this.values++;return Math.fround(this.uniform);}
}
test('the actual capture exposes12x12 regions and CellCount weights, not an equal-cell district or square-radius draw',()=>{
 const actual=map(13,1),reach=captureGeographicGenerationReachability256(actual),c=captureRandomClosewalk256(actual,reach),before=structuredClone(actual),r=new Scripted([],0.6);
 expect(c.regions.map(r=>r.cellCount)).toEqual([12,1]);expect(c.regionAt(0)).toBe(c.regionAt(11));expect(c.regionAt(12)).not.toBe(c.regionAt(11));expect(c.regions[0]!.cells).toEqual(Array.from({length:12},(_,i)=>i));
 expect(randomClosewalkCellNear256(c,0,20,r)).toBe(0);expect(r.values).toBe(1);expect(r.integers).toBe(1);expect(actual).toEqual(before);expect(Object.isFrozen(c.regions)).toBe(true);expect(Object.isFrozen(c.regions[0]!.cells)).toBe(true);
});
test('single positive region skips weighted RNG and Circle uses distance-squared before Standable/extra validator',()=>{
 const one=captureRandomClosewalk256(map(1,1)),a=new Scripted();expect(randomClosewalkCellNear256(one,0,0,a)).toBe(0);expect(a.values).toBe(0);expect(a.integers).toBe(0);expect(a.state.counter).toBe(0);
 const c=captureRandomClosewalk256(map(5,5)),r=new Scripted([...Array.from({length:9},()=>[3,3]).flat(),2,3]),extra:number[]=[];
 expect(randomClosewalkCellNear256(c,12,1,r,cell=>{extra.push(cell);return true;})).toBe(17);expect(extra).toEqual([17]);expect(r.integers).toBe(20);expect(r.values).toBe(0);
});
test('Region.RandomCell rejects bounding-rectangle holes1000times then returns first actual z/x cell without a new draw',()=>{
 const actual=map(3,3);actual.structures.push(structure(1,'wall',1,1));const c=captureRandomClosewalk256(actual),r=new Scripted(Array.from({length:2000},()=>1));expect(c.regions[0]!.cellCount).toBe(8);
 expect(randomClosewalkCellNear256(c,0,5,r)).toBe(0);expect(r.integers).toBe(2000);expect(r.values).toBe(0);
});
test('ten failed validator attempts are followed by full real-cell reverse FisherYates Shuffle',()=>{
 const c=captureRandomClosewalk256(map(2,2)),r=new Scripted();expect(randomClosewalkCellNear256(c,0,3,r,cell=>cell===3)).toBe(3);expect(r.integers).toBe(23);expect(r.values).toBe(0);expect(r.state.counter).toBe(23);
 //20 draw coordinates +3shuffle +2 final failed RandomCell. Failure must not silently skip the last draw.
 const failed=new Scripted();expect(tryRandomClosewalkCellNear256(c,0,0,failed,()=>false)).toBeNull();expect(failed.integers).toBe(25);expect(failed.state.counter).toBe(25);
});
test('a failed weighted region is removed, remaining singleton skips another Value, and each next call reuses the same capture',()=>{
 const actual=map(13,1),c=captureRandomClosewalk256(actual),r=new Scripted();expect(randomClosewalkCellNear256(c,0,20,r,cell=>cell===12)).toBe(12);expect(r.values).toBe(1);expect(r.integers).toBe(22);expect(r.state.counter).toBe(23);
 const identity=c.regions,second=new Scripted([],0.99);expect(randomClosewalkCellNear256(c,0,20,second)).toBe(12);expect(c.regions).toBe(identity);expect(actual.piles).toEqual([]);
});
test('NoPassClosedDoors plus fenceBlocked uses actual region links; shallow water stays traversable',()=>{
 const actual=map(5,3);for(let z=0;z<3;z++)actual.structures.push(structure(z+1,'fence',2,z));const fence=captureRandomClosewalk256(actual);expect(tryRandomClosewalkCellNear256(fence,0,10,new Scripted(),i=>i%5>2)).toBeNull();
 actual.structures=actual.structures.filter(s=>s.z!==1);actual.structures.push(structure(4,'door',2,1));const door=captureRandomClosewalk256(actual);expect(tryRandomClosewalkCellNear256(door,0,10,new Scripted(),i=>i%5>2)).toBeNull();
 actual.structures=[];for(let z=0;z<3;z++)actual.tiles[z*5+2]={terrain:'water-shallow'};expect(tryRandomClosewalkCellNear256(captureRandomClosewalk256(actual),0,10,new Scripted(),i=>i%5>2)).not.toBeNull();
});
test('nonStandable Thing adjustment follows real rectangle perimeter but failed wrapper returns ORIGINAL root',()=>{
 const actual=map(3,3);actual.piles.push({id:1,kind:'chunk',item:'granite-chunk',quantity:1,owner:{type:'ground',x:1,z:1}});const c=captureRandomClosewalk256(actual);
 expect(c.adjustNonStandableRoot(4)).toBe(0);expect(randomClosewalkCellNear256(c,4,0,new Scripted())).toBe(0);expect(randomClosewalkCellNear256(c,4,0,new Scripted(),()=>false)).toBe(4);
 const water=map(1,1);water.tiles[0]={terrain:'water-deep'};const none=new Scripted();expect(randomClosewalkCellNear256(captureRandomClosewalk256(water),0,2,none)).toBe(0);expect(none.state.counter).toBe(0);
});
test('ambiguous first blocking Thing refuses honestly before RNG; unchanged captures never mutate actual originals',()=>{
 const actual=map(5,5);actual.structures.push(structure(1,'bed',2,2));actual.piles.push({id:2,kind:'chunk',item:'granite-chunk',quantity:1,owner:{type:'ground',x:2,z:2}});const before=structuredClone(actual),c=captureRandomClosewalk256(actual),r=new Scripted();
 expect(()=>randomClosewalkCellNear256(c,12,3,r)).toThrow('ThingGrid');expect(r.state.counter).toBe(0);expect(actual).toEqual(before);
 expect(()=>randomClosewalkCellNear256(c,25,3,r)).toThrow('root');expect(()=>randomClosewalkCellNear256(c,0,-1,r)).toThrow('radius');
});
