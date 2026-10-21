import {expect,test} from 'vitest';
import {readShipReactorStart275,prepareShipReactorStart275,applyShipReactorCommand275} from '../src/sim/ship-reactor-runtime-275.ts';
import {indexShipParts276,readShipAssembly276} from '../src/sim/ship-part-reader-276.ts';
import type {World,Structure} from '../src/sim/types.ts';

/** Declared component/command contexts only; paid construction has a separate
 * complete engine scenario. No campaign or elapsed defence is claimed here. */
function context(){return {schemaVersion:276,tick:100,width:32,height:32,nextId:10,rng:452,structures:[],jobs:[],packed:[],pawns:[],piles:[],events:[]} as unknown as World;}
function part(w:World,kind:Structure['kind'],x:number,z:number,orientation:Structure['orientation']=0){const s:Structure={id:w.nextId++,kind,x,z,orientation,footprint:'standard',material:'steel',power:{on:kind==='ship-reactor',parentId:null}};w.structures.push(s);return s;}
function bridged(){const w=context(),a=part(w,'ship-reactor',5,10),beam=part(w,'ship-beam',11,10,1),b=part(w,'ship-reactor',17,10);return {w,a,beam,b};}

test('completed physical ship parts connect cardinal reactors, but a conduit or a corner cannot substitute for the bridge',()=>{
 const {w,a,beam,b}=bridged(),before=structuredClone(w);
 expect(readShipReactorStart275(w,a.id)).toEqual({ok:true,reactorIds:[a.id,b.id]});expect(w).toEqual(before);
 const ready=prepareShipReactorStart275(w,a.id,[a.id,b.id]);expect(ready.ok).toBe(true);if(!ready.ok)throw Error(ready.reason);
 expect(ready.commit()).toBe(true);expect(a.shipReactor275).toEqual(b.shipReactor275);expect(beam.shipReactor275).toBeUndefined();expect(w.rng).toBe(before.rng);expect(w.nextId).toBe(before.nextId);
 const split=bridged();split.w.structures=split.w.structures.filter(s=>s.id!==split.beam.id);part(split.w,'power-conduit',11,10);
 expect(readShipReactorStart275(split.w,split.a.id)).toEqual({ok:true,reactorIds:[split.a.id]});
 const corner=bridged();corner.beam.z=15;expect(readShipReactorStart275(corner.w,corner.a.id)).toEqual({ok:true,reactorIds:[corner.a.id]});
});

test('a prepared activation seals actual bridge identity and pose, including equal-value replacement',()=>{
 for(const mutate of [(w:World,beam:Structure)=>{beam.x++;},(w:World,beam:Structure)=>{w.structures[w.structures.indexOf(beam)]={...beam};},(w:World,beam:Structure)=>{beam.power={...beam.power!};}]){
  const {w,a,beam}=bridged(),plan=prepareShipReactorStart275(w,a.id);expect(plan.ok).toBe(true);if(!plan.ok)throw Error(plan.reason);
  mutate(w,beam);const before=structuredClone(w);expect(plan.current()).toBe(false);expect(plan.commit()).toBe(false);expect(w).toEqual(before);
 }
});

test('a running reactor remains a bridge; newly connected hibernants start without resetting old dates',()=>{
 const {w,a,b}=bridged();a.shipReactor275={state:'running',startCore:0,endCore:840000};w.tick=84001;
 const before=structuredClone(a.shipReactor275),quote=readShipReactorStart275(w,a.id);expect(quote).toEqual({ok:true,reactorIds:[b.id]});if(!quote.ok)throw Error(quote.reason);
 expect(applyShipReactorCommand275(w,{type:'ship-reactor-start',reactorId:a.id,reactorIds:quote.reactorIds}).ok).toBe(true);expect(a.shipReactor275).toEqual(before);expect(b.shipReactor275?.startCore).toBe(w.tick*10);
});

test('the same actual component reports three engines and retains the three unbuilt requirements as missing',()=>{
 const {w,a,beam}=bridged();w.structures=w.structures.filter(s=>s.kind!=='ship-reactor'||s.id===a.id);
 part(w,'ship-engine',11,6);part(w,'ship-engine',11,12);part(w,'ship-engine',14,12);
 const indexed=indexShipParts276(w.structures,w.width,w.height);expect(indexed.ok).toBe(true);if(!indexed.ok)throw Error(indexed.reason);
 const report=readShipAssembly276(indexed.index,beam.id);expect(report.ok).toBe(true);if(!report.ok)throw Error(report.reason);
 expect(report.counts).toEqual({beam:1,engine:3,reactor:1,computer:0,sensors:0,casket:0});expect(report.missing.map(p=>p.id)).toEqual(['computer','sensors','casket']);expect(report.launchImplemented).toBe(false);
});
