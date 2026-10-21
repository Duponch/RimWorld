import {expect,test} from 'vitest';
import {shipPartRect276,shipPartCells276,shipPartContains276} from '../src/sim/ship-part-geometry-276.ts';
import {shipReactorRect275,shipReactorCells275} from '../src/sim/ship-reactor-content-275.ts';
import {indexShipParts276,connectedShipParts276,readShipAssembly276,connectedHibernatingReactorIds276,type ShipPartSource276} from '../src/sim/ship-part-reader-276.ts';
import {SHIP_BEAM_CONTENT_276,SHIP_ENGINE_CONTENT_276,type ShipPartKind276} from '../src/sim/ship-part-content-276.ts';

// Primary occupied extents, not renderer bounds. Each row is minX,minZ,width,depth.
const expected={
 'ship-beam':[[0,-2,2,6],[-2,-1,6,2],[-1,-3,2,6],[-3,0,6,2]],
 'ship-engine':[[-1,-1,3,4],[-1,-1,4,3],[-1,-2,3,4],[-2,-1,4,3]],
} as const;
test.each([0,1,2,3] as const)('native rotation%i preserves the exact12-cell hull extents and the historical42-cell reactor',orientation=>{
 for(const kind of ['ship-beam','ship-engine'] as const){
  const pose={kind,x:20,z:20,orientation},[dx,dz,width,depth]=expected[kind][orientation];
  const rect={x:20+dx,z:20+dz,width,depth},cells=shipPartCells276(pose);
  expect(shipPartRect276(pose)).toEqual(rect);expect(cells).toHaveLength(12);expect(new Set(cells.map(c=>`${c.x}:${c.z}`)).size).toBe(12);
  for(let z=15;z<=25;z++)for(let x=15;x<=25;x++)expect(shipPartContains276(pose,{x,z})).toBe(x>=rect.x&&x<rect.x+width&&z>=rect.z&&z<rect.z+depth);
 }
 const reactor={kind:'ship-reactor' as const,x:20,z:20,orientation};
 expect(shipPartRect276(reactor)).toEqual(shipReactorRect275(reactor,orientation));
 expect(shipPartCells276(reactor)).toEqual(shipReactorCells275(reactor,orientation));expect(shipPartCells276(reactor)).toHaveLength(42);
 expect(SHIP_BEAM_CONTENT_276).toMatchObject({defaultOrientation:0,width:2,depth:6,constructionSkill:5,coreWork:8000});
 expect(SHIP_ENGINE_CONTENT_276).toMatchObject({defaultOrientation:0,width:3,depth:4,constructionSkill:8,coreWork:50000});
});

type Part=ShipPartSource276&{shipReactor275?:{state:'starting'|'running';startCore:number;endCore:number}};
const part=(id:number,kind:ShipPartKind276,x:number,z:number):Part=>({id,kind,x,z,orientation:0});
function bridge(){
 const a=part(1,'ship-reactor',10,10),beam=part(2,'ship-beam',14,10),engine=part(3,'ship-engine',17,10),b=part(4,'ship-reactor',21,10);
 a.shipReactor275={state:'starting',startCore:100,endCore:840100};return {a,beam,engine,b,all:[b,engine,a,beam]};
}
test('completed hull bridges join the original reactors cardinally, with stable IDs and read-only missing counts',()=>{
 const {all,a,b}=bridge(),before=structuredClone(all),indexed=indexShipParts276(all,32,32);expect(indexed.ok).toBe(true);if(!indexed.ok)throw Error(indexed.reason);
 const connected=connectedShipParts276(indexed.index,a.id);expect(connected.ok).toBe(true);if(!connected.ok)throw Error(connected.reason);
 expect(connected.partIds).toEqual([1,2,3,4]);expect(connected.parts.find(p=>p.id===b.id)!.source).toBe(b);
 expect(connectedHibernatingReactorIds276(connected,s=>s.shipReactor275?.state??'hibernating')).toEqual([4]);
 const report=readShipAssembly276(indexed.index,a.id);expect(report.ok).toBe(true);if(!report.ok)throw Error(report.reason);
 expect(report.counts).toEqual({beam:1,engine:1,reactor:2,computer:0,sensors:0,casket:0});expect(report.launchImplemented).toBe(false);
 expect(report.missing.map(r=>[r.id,r.missing])).toEqual([['engine',2],['computer',1],['sensors',1],['casket',1]]);
 expect(all).toEqual(before);
 const without=indexShipParts276(all.filter(p=>p.id!==2),32,32);if(!without.ok)throw Error(without.reason);
 expect(connectedShipParts276(without.index,a.id)).toMatchObject({ok:true,partIds:[1]});expect(a.shipReactor275).toEqual(before.find(p=>p.id===1)!.shipReactor275);
});
test('diagonals, ordinary power conduits and the colony cryptosleep casket do not become ship connections',()=>{
 const a=part(1,'ship-reactor',10,10),diagonal=part(2,'ship-engine',15,15);
 const all=[a,diagonal,{id:3,kind:'power-conduit',x:14,z:13,orientation:0},{id:4,kind:'cryptosleep-casket',x:10,z:15,orientation:0}];
 const indexed=indexShipParts276(all,32,32);if(!indexed.ok)throw Error(indexed.reason);
 expect(indexed.index.parts.map(p=>p.id)).toEqual([1,2]);expect(connectedShipParts276(indexed.index,1)).toMatchObject({ok:true,partIds:[1]});
 expect(readShipAssembly276(indexed.index,4)).toEqual({ok:false,reason:'root-not-a-ship-part'});
});
test('an invalid occupied graph is refused without changing originals',()=>{
 const {all}=bridge(),before=structuredClone(all);
 expect(indexShipParts276([...all,{...all[0]!}],32,32)).toMatchObject({ok:false,reason:'duplicate-id'});
 expect(indexShipParts276([...all,part(99,'ship-engine',10,10)],32,32)).toMatchObject({ok:false,reason:'overlap'});
 expect(indexShipParts276([part(99,'ship-beam',0,0)],32,32)).toMatchObject({ok:false,reason:'invalid-part'});
 expect(all).toEqual(before);
});
