import {expect,test} from 'vitest';
import {createStagingValidation} from '../src/sim/staging-validation.ts';
import type {Cell,Resource,World} from '../src/sim/types.ts';

const resource=(x:number,z:number,id=1):Resource=>({id,kind:'tree',amount:25,x,z});
const world=(width:number,height:number,resources:Resource[]):World=>({width,height,resources} as World);
function outcome(read:()=>boolean):boolean|string {
  try{return read();}catch(error){return `${(error as Error).name}: ${(error as Error).message}`;}
}
function differential(w:World,cells:Cell[]):void {
  const before=JSON.stringify(w),reader=createStagingValidation(w);
  for(const cell of cells)expect(outcome(()=>reader.hasResource(cell)))
    .toBe(outcome(()=>w.resources.some(r=>r.x===cell.x&&r.z===cell.z)));
  expect(JSON.stringify(w)).toBe(before);
}

test('bounded rectangular presence matches point scans without row or edge aliases',()=>{
  const resources=[resource(-0,-0),resource(6,0,2),resource(3,1,3),resource(6,2,4),resource(3,1,5)];
  resources.length+=3;resources[7]=resource(0,2,6);
  const w=world(7,3,resources),cells:Cell[]=[];
  for(let z=-1;z<=3;z++)for(let x=-1;x<=7;x++)cells.push({x,z});
  cells.push({x:6.5,z:0},{x:0,z:1.5},{x:NaN,z:0},{x:0,z:NaN},{x:Infinity,z:0},{x:-0,z:-0});
  differential(w,cells);
});

test('raw coordinates coexist with dense cells and retain strict equality outside the map',()=>{
  const w=world(7,3,[resource(0,0),resource(6,2,2),resource(7,0,3),resource(-1,2,4),
    resource(7,2,5),resource(0,3,6),resource(2.5,.5,7),resource(Infinity,1,8),
    resource(NaN,1,9),resource(1,NaN,10)]);
  differential(w,[{x:0,z:0},{x:6,z:2},{x:7,z:0},{x:0,z:1},{x:-1,z:2},{x:6,z:1},
    {x:7,z:2},{x:0,z:3},{x:2.5,z:.5},{x:3.5,z:0},{x:Infinity,z:1},{x:NaN,z:1},{x:1,z:NaN}]);
});

test('dense size ceiling and atypical dimensions preserve the same resource answers',()=>{
  const dimensions=[[1024,1024],[1024,1025],[1048576,1],[1048577,1],[0,3],[-1,3],
    [1.5,3],[7,2.5],[NaN,3],[7,NaN],[Infinity,3],[7,Infinity]];
  for(const [width,height] of dimensions){
    const w=world(width!,height!,[resource(0,0),resource(1023,1023,2),resource(1048575,0,3),resource(-1,2,4),resource(.5,1,5)]);
    differential(w,[{x:0,z:0},{x:1023,z:1023},{x:1048575,z:0},{x:1048576,z:0},
      {x:-1,z:2},{x:.5,z:1},{x:1,z:1},{x:NaN,z:0}]);
  }
});

test('null and undefined fallback preserves point-scan exceptions and short circuit order',()=>{
  for(const malformed of [null,undefined]){
    const w=world(7,3,[resource(2,2),malformed as unknown as Resource,resource(3,2,2)]);
    differential(w,[{x:2,z:2},{x:3,z:2},{x:1,z:1}]);
    w.resources.reverse();differential(w,[{x:3,z:2},{x:2,z:2},{x:1,z:1}]);
  }
});

test('capture stays lazy and fresh readers leave retained earlier worlds unchanged',()=>{
  const earlier=world(7,3,[resource(2,2)]),reader=createStagingValidation(earlier);
  earlier.resources.push(resource(3,2,2));
  expect(reader.hasResource({x:3,z:2})).toBe(true);
  const retained=JSON.stringify(earlier),later=structuredClone(earlier);
  later.resources[0]!.x=4;later.resources.splice(1,1);
  const next=createStagingValidation(later);
  expect(next.hasResource({x:2,z:2})).toBe(false);
  expect(next.hasResource({x:4,z:2})).toBe(true);
  expect(next.hasResource({x:3,z:2})).toBe(false);
  expect(reader.hasResource({x:2,z:2})).toBe(true);
  expect(reader.hasResource({x:3,z:2})).toBe(true);
  expect(JSON.stringify(earlier)).toBe(retained);
  const unread=world(7,3,[]);
  Object.defineProperty(unread,'width',{get(){throw new Error('early dimensions');}});
  const lazy=createStagingValidation(unread);
  expect(()=>lazy.hasResource({x:0,z:0})).toThrow('early dimensions');
});
