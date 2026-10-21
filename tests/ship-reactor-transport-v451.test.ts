import {expect,test} from 'vitest';
import {shipReactorWorkshop275} from './scenarios/ship-reactor-v451.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {readShipReactorStart275} from '../src/sim/ship-reactor-runtime-275.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';
import type {ShipReactor275} from '../src/sim/ship-reactor-state-275.ts';

/** Declared already-built local structure, only for hostile transport inputs.
 * Real paid production is covered by the separate engine scenario. */
function existing(){
 const {w,plan}=shipReactorWorkshop275();
 const reactor:ShipReactor275={id:w.nextId++,kind:'ship-reactor',x:plan.x,z:plan.z,orientation:plan.orientation,footprint:'standard',material:'steel',power:{on:true,parentId:null}};
 w.structures.push(reactor);expect(validateWorld(w),JSON.stringify(validateWorld(w))).toEqual([]);
 return {w,reactor};
}

test('RAW rejects forged component dates and minified reactors; public same-tick delta cannot erase an actual activation',()=>{
 const {w,reactor}=existing(),quote=readShipReactorStart275(w,reactor.id);if(!quote.ok)throw Error(quote.reason);
 const result=applyCommand(w,{type:'ship-reactor-start',reactorId:reactor.id,reactorIds:quote.reactorIds});expect(result.ok,result.reason).toBe(true);
 const text=serializeWorld(w);expect(serializeWorld(deserializeWorld(text))).toBe(text);
 const bad=JSON.parse(text);bad.structures.find((s:{id:number})=>s.id===reactor.id).shipReactor275.endCore++;
 expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
 const packed=JSON.parse(text),s=packed.structures.find((s:{id:number})=>s.id===reactor.id);
 packed.structures=packed.structures.filter((s:{id:number})=>s.id!==reactor.id);packed.packed.push({building:s,owner:{type:'ground',x:s.x,z:s.z}});
 expect(()=>deserializeWorld(JSON.stringify(packed))).toThrow();
 const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
 const first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error(first.status);
 const retained=structuredClone(first.world);delete reactor.shipReactor275;
 const delta=structuredClone(encoder.encode(w,0,0));expect(delta.kind).toBe('delta');const rejected=decoder.adopt(delta);expect(rejected.status).toBe('resync');expect(first.world).toEqual(retained);
});
test('old274 RAW, public Decoder and lightweight Resident reject the presence of the new pressure owner even when undefined',()=>{
 const {w}=shipReactorWorkshop275();delete w.research!.shipBasics;delete w.research!.shipReactor;Object.assign(w,{schemaVersion:274});
 // No reactor, ship research, pressure or loss was present in this actual
 // ordinary workshop before the explicitly future field below.
 const raw274=JSON.stringify(w),upgraded=deserializeWorld(raw274);
 expect(upgraded).toEqual({...w,schemaVersion:SCHEMA_VERSION});
 const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder(),resident=new ResidentPresentationAssembler();
 const initial=structuredClone(encoder.encode(w,0,0)),first=decoder.adopt(structuredClone(initial)),shown=resident.adopt(structuredClone(initial));
 expect(first.status).toBe('applied');expect(shown.status).toBe('applied');if(first.status!=='applied'||shown.status!=='applied')throw Error('Ordinary274 baseline refused');
 const retained=structuredClone(first.world),retainedShown=structuredClone(shown.world);
 const raw=JSON.parse(raw274);raw.shipReactorThreats275={};expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow();
 const delta=structuredClone(encoder.encode(w,0,0));expect(delta.kind).toBe('delta');Object.assign(delta.world,{shipReactorThreats275:undefined});
 expect(decoder.adopt(structuredClone(delta)).status).toBe('resync');expect(resident.adopt(delta).status).toBe('resync');
 expect(first.world).toEqual(retained);expect(shown.world).toEqual(retainedShown);
 const checkpoint=structuredClone(initial);Object.assign(checkpoint.world,{shipReactorThreats275:undefined});
 expect(new SnapshotDecoder().adopt(structuredClone(checkpoint)).status).toBe('resync');expect(new ResidentPresentationAssembler().adopt(checkpoint).status).toBe('resync');
});

test('same-map deltas retain the actually adopted pressure owner; destroying its reactor makes it inactive without erasing its history',()=>{
 const {w,reactor}=existing(),quote=readShipReactorStart275(w,reactor.id);if(!quote.ok)throw Error(quote.reason);
 expect(applyCommand(w,{type:'ship-reactor-start',reactorId:reactor.id,reactorIds:quote.reactorIds}).ok).toBe(true);stepWorld(w);
 expect(w.shipReactorThreats275?.recent).toEqual([]);expect(w.shipReactorThreats275?.active).toBe(true);
 const adopted=w.shipReactorThreats275!.adoptedAtCore,encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
 const first=decoder.adopt(structuredClone(encoder.encode(w,0,0)));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error(first.status);
 const retained=structuredClone(first.world),delta=structuredClone(encoder.encode(w,0,0));expect(delta.kind).toBe('delta');
 const missing=structuredClone(delta);delete missing.world.shipReactorThreats275;
 expect(decoder.adopt(missing).status).toBe('resync');expect(first.world).toEqual(retained);
 const reset=structuredClone(delta);reset.world.shipReactorThreats275!.adoptedAtCore-=10;
 expect(decoder.adopt(reset).status).toBe('resync');expect(first.world).toEqual(retained);
 expect(decoder.adopt(delta).status).toBe('applied');
 expect(damageStructure(w,reactor,500,'bullet')).toBe(true);stepWorld(w);
 expect(w.shipReactorThreats275).toMatchObject({active:false,adoptedAtCore:adopted,recent:[]});
 expect(decoder.adopt(structuredClone(encoder.encode(w,0,0))).status).toBe('applied');
 expect(serializeWorld(deserializeWorld(serializeWorld(w)))).toBe(serializeWorld(w));
});
