// Native publication provenance and strict public entry points.
import {expect,test} from 'vitest';
import {createNativeCloneResidentLane} from '../src/bridge/native-clone-resident';
import {validFirefoamHistoricalTransport290} from '../src/sim/firefoam-save-290';
import {validFirefoamActorOwners290} from '../src/sim/firefoam-actor-save-290';
import {readResidentWorkerMessage} from '../src/bridge/resident-protocol';
import {vegetationHarness} from './resident-vegetation-fixtures-v430';

test('public Firefoam descriptors still discover own lanes hidden by a Proxy has trap',()=>{
 const badStructure={kind:'firefoam-popper',material:'wood'};
 const transport=new Proxy({structures:[badStructure]},{has:(target,key)=>key==='structures'?false:Reflect.has(target,key)});
 expect(validFirefoamHistoricalTransport290(transport,293)).toBe(false);
 const actors=new Proxy({pawns:[{coveredInFirefoam290:{}}]},{has:(target,key)=>key==='pawns'?false:Reflect.has(target,key)});
 expect(validFirefoamActorOwners290(actors,293)).toBe(false);
});

test('envelope parsing and local structuredClone alone never grant a native proof',()=>{
 const lane=createNativeCloneResidentLane(),h=vegetationHarness(),envelope=h.envelope();
 const packet=readResidentWorkerMessage(envelope);if(packet.type!=='snapshot')throw Error('snapshot');
 expect(lane.reader.adopt(packet).status).toBe('applied');
 expect(lane.diagnostics()).toMatchObject({fastAdoptions:0,strictAdoptions:1,fastLaneReads:0});
 const copied=readResidentWorkerMessage(structuredClone(h.envelope()));
 if(copied.type!=='snapshot')throw Error('snapshot');
 expect(lane.reader.adopt(copied).status).toBe('applied');
 expect(lane.diagnostics()).toMatchObject({fastAdoptions:0,strictAdoptions:2,fastLaneReads:0});
 lane.close();
});

test('a forged source/event dispatch stays strict, including a valid parsed publication',()=>{
 const lane=createNativeCloneResidentLane(),h=vegetationHarness();
 const event={isTrusted:true,currentTarget:{},data:h.envelope()} as unknown as MessageEvent<unknown>;
 let result:string|undefined;
 lane.withWorkerMessage(event.currentTarget as Worker,event,()=>{
  const p=readResidentWorkerMessage(event.data);if(p.type!=='snapshot')throw Error('snapshot');
  result=lane.reader.adopt(p).status;
 });
 expect(result).toBe('applied');expect(lane.diagnostics().fastAdoptions).toBe(0);expect(lane.diagnostics().fastLaneReads).toBe(0);
 lane.close();
});

test('a malformed direct packet cannot select native lanes with a forged marker',()=>{
 const lane=createNativeCloneResidentLane(),h=vegetationHarness(),envelope=h.envelope();
 const packet=readResidentWorkerMessage(envelope);if(packet.type!=='snapshot')throw Error('snapshot');
 const world=packet.world as unknown as Record<string,unknown>;
 world.structures=[{id:(world.nextId as number)-1,kind:'firefoam-popper',x:1,z:1,orientation:0,footprint:'standard',material:'wood'}];
 Object.assign(packet,{nativeClone:true});
 expect(lane.reader.adopt(packet).status).toBe('resync');
 expect(lane.diagnostics().fastAdoptions).toBe(0);expect(lane.diagnostics().fastLaneReads).toBe(0);
 lane.close();
});
