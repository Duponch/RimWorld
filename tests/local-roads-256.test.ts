import {describe,it,expect} from 'vitest';
import {WorldGenerationRandom} from '../src/sim/world-generation-random.ts';
import {findLocalRoadPath256,localRoadUsedRectCosts256,type LocalRoadPathMap256} from '../src/sim/local-road-path-256.ts';
import {roadCurveChance256,prepareLocalRoadDistance256,type LocalRoadDistance256} from '../src/sim/local-road-curves-256.ts';
import {LOCAL_ROAD_DEFINITIONS_256} from '../src/sim/local-road-data-256.ts';
import {createLocalRoadProp256,localRoadPropSteelLeavings256} from '../src/sim/local-road-props-256.ts';
import {placeLocalRoadStep256,type LocalRoadPlacement256,type ActualRoadTerrain256} from '../src/sim/local-road-placement-256.ts';
function openMap(w=5,h=5):LocalRoadPathMap256 {
 const n=w*h,connectivity=new Uint8Array(n);
 const offsets=[[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,-1],[-1,1]];
 for(let z=0;z<h;z++)for(let x=0;x<w;x++)for(let k=0;k<8;k++){
  const [dx,dz]=offsets[k];if(x+dx>=0&&x+dx<w&&z+dz>=0&&z+dz<h)connectivity[z*w+x]|=1<<k;
 }
 return {width:w,height:h,direct:new Int32Array(n),building:new Uint8Array(n),
  destroyableBuilding:new Uint8Array(n),hitPoints:new Uint16Array(n),fence:new Uint8Array(n),
  water:new Uint8Array(n),perceptualUndrafted:new Uint16Array(n),factionCost:new Uint16Array(n),
  persistentDanger:new Uint8Array(n),doors:new Uint8Array(n),doorHitPoints:new Int32Array(n),
  connectivity,usedRectCosts:null,canReach:()=>true};
}
describe('prospective local road numerical contracts (source cases, not a World oracle)',()=>{
 it('diagonal costs18 and real admission can reject before the job',()=>{
  const m=openMap(),path=findLocalRoadPath256(m,0,12,'closed');
  expect(path.found).toBe(true);expect(path.cost).toBe(36);expect(path.reversed).toEqual([12,6,0]);
  const refused=findLocalRoadPath256({...m,canReach:()=>false},0,12,'closed');
  expect(refused).toEqual({found:false,reversed:[],cost:0,processed:0});
 });
 it('expanded UsedRects really block; the final default endcap omits their customizer',()=>{
  const base=openMap(9,9),used=localRoadUsedRectCosts256(9,9,[{minX:4,maxX:4,minZ:0,maxZ:8}]);
  const m={...base,usedRectCosts:used};
  expect(used[4*9+1]).toBe(0);expect(used[4*9+2]).toBe(10000);
  expect(findLocalRoadPath256(m,4*9,4*9+8,'closed').found).toBe(false);
  expect(findLocalRoadPath256(m,4*9,4*9+8,'closed',true).cost).toBe(144);
 });
 it('water modes, destroyable full walls and closed door provider costs remain distinct',()=>{
  const wet=openMap();
  for(let z=0;z<5;z++)wet.water[z*5+2]=1;
  expect(findLocalRoadPath256(wet,10,14,'closed-dry').found).toBe(false);
  expect(findLocalRoadPath256(wet,10,14,'closed').cost).toBe(102);
  const wall=openMap();
  for(let z=0;z<5;z++){const i=z*5+2;wall.direct[i]=10000;wall.building[i]=1;wall.destroyableBuilding[i]=1;wall.hitPoints[i]=100;}
  expect(findLocalRoadPath256(wall,10,14,'closed').found).toBe(false);
  expect(findLocalRoadPath256(wall,10,14,'destroy').cost).toBe(162);
  const doors=openMap();
  for(let z=0;z<5;z++){const i=z*5+2;doors.doors[i]=2;doors.building[i]=1;doors.doorHitPoints[i]=160;}
  expect(findLocalRoadPath256(doors,10,14,'closed').found).toBe(false);
  expect(findLocalRoadPath256(doors,10,14,'destroy').cost).toBe(154);
 });
 it('a partial-fill building is not a Full bit and fences still prevent diagonal corner cuts',()=>{
  const partial=openMap();partial.direct[1]=42;
  expect(findLocalRoadPath256(partial,0,6,'closed').cost).toBe(18);
  partial.fence[1]=1;
  expect(findLocalRoadPath256(partial,0,6,'closed').cost).toBe(36);
 });
 it('hard probability edges and touched distance squares do not become radius circles',()=>{
  expect(roadCurveChance256([[1.1,1],[1.1,0]],Math.fround(1.1))).toBe(1);
  expect(roadCurveChance256([[1.1,1],[1.1,0]],Math.fround(1.1001))).toBe(0);
  const m=openMap(32,32),none=()=>false;
  const result=prepareLocalRoadDistance256({map:m,path:[16*32+15,16*32+16,16*32+17],tilesPerSegment:15,
   avoid:false,readers:{water:none,impassableThing:none,dangerousTerrain:none,anyDestroyableThing:none}},new WorldGenerationRandom(85));
  const corner=6*32+5;
  expect(result.field.touched[corner]).toBe(1);expect(result.field.distance[corner]).toBeGreaterThan(10);
 });
 it('real non-Stuff prop HP creation draws once and clamps before rounding; leavings draw once',()=>{
  class Witness extends WorldGenerationRandom {
   floats=0;values=0;
   override float(a:number,b:number){expect(a).toBe(.5);expect(b).toBe(1.3);this.floats++;return Math.fround(1.2);}
   override value(){this.values++;return Math.fround(.1);}
  }
  const rng=new Witness(1),prop=createLocalRoadProp256('ancient-road-barrier',13,3,4,rng);
  expect(prop).toEqual({id:13,kind:'ancient-road-barrier',x:3,z:4,orientation:0,footprint:'standard',factionId:null});
  expect(rng.floats).toBe(1);expect(localRoadPropSteelLeavings256('deconstruct',rng)).toBe(8);
  expect(localRoadPropSteelLeavings256('kill',rng)).toBe(4);
  expect(localRoadPropSteelLeavings256('vanish',rng)).toBe(0);expect(rng.values).toBe(2);
 });
 it('bridge converts actual deep water only after a valid origin, without inventing steel floors',()=>{
  const field:LocalRoadDistance256={width:3,height:3,distance:new Float32Array(9),along:new Float32Array(9),
   origin:new Int32Array(9).fill(1),touched:new Uint8Array(9)};
  const terrain=(id:string):ActualRoadTerrain256=>({id,bridge:false,water:true,river:false,road:false,
   removable:false,impassable:id==='water-deep',driesTo:null});
  const cells=Array.from({length:9},()=>terrain('water-shallow'));cells[4]=terrain('water-deep');
  const effects:string[]=[];
  const p:LocalRoadPlacement256={terrain:c=>cells[c],things:()=>[],canBuild:(target,c)=>target==='bridge'&&cells[c].id==='water-shallow',
   vanish:()=>{throw Error('No actual obstacles');},setTerrain:(c,id)=>{cells[c]=terrain(id);effects.push(id);},
   setFoundation:(c,id)=>{effects.push(id);cells[c]={...cells[c],id,bridge:true};},regionalFloor:'granite-flagstone',
   hasSamePropNear:()=>false,spawnProp:()=>{throw Error('No prop step');},addRoadEdge:()=>{}};
  placeLocalRoadStep256(LOCAL_ROAD_DEFINITIONS_256['stone-road'].steps[0],4,field,p,new WorldGenerationRandom(1));
  expect(effects).toEqual(['water-shallow','bridge']);expect(cells[4].bridge).toBe(true);
 });
});
