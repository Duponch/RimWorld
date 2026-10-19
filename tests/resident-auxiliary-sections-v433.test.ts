import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots';
import {ResidentVegetationAssembler} from '../src/bridge/resident-vegetation-assembler';
import {WorkerNaturalAppearance} from '../src/bridge/worker-natural-appearance';
import {residentPublication,readResidentWorkerMessage,type ResidentAuxiliaryEnvelope} from '../src/bridge/resident-protocol';
import {ResidentAuxiliaryEncoder,ResidentAuxiliaryFrameOwner,readResidentAuxiliaryFrame,RESIDENT_AUXILIARY_KEYS} from '../src/bridge/resident-auxiliary-sections';
import {StoragePresentationSignature,HomePresentationSignature} from '../src/render/presentation-signatures';
import {fixture} from './resident-presentation-fixtures-v427';
import type {World} from '../src/sim/types';
import {addFilth} from '../src/sim/filth';

function harness(){
 const world=fixture(),encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),natural=new WorkerNaturalAppearance(),auxiliary=new ResidentAuxiliaryEncoder(),reader=new ResidentVegetationAssembler(),strict=new SnapshotDecoder();
 world.stockpiles=[{id:world.nextId++,x:5,z:5,capacity:75,priority:1,filters:{wood:true,food:true},items:{wood:true}}];
 world.home=[0,1,2];world.roofing={constructed:[],build:[1,2],remove:[],cursor:0};world.tiles[5+5*world.width]={terrain:'soil'};world.tiles[2+3*world.width]={terrain:'soil'};
 expect(addFilth(world,{x:2,z:3},'blood')).toBe(true);
 const capture=(checkpoint=false)=>{
  const packet=encoder.encode(world,0,1,checkpoint),before=structuredClone(packet),appearance=natural.capture(world,packet),prepared=auxiliary.capture(packet);
  expect(packet).toStrictEqual(before);expect(Object.isFrozen(world.stockpiles)).toBe(false);
  return{oracle:before,envelope:structuredClone(residentPublication(prepared.publication,appearance,prepared.auxiliary))};
 };
 const unwrap=(envelope:ResidentAuxiliaryEnvelope)=>{const packet=readResidentWorkerMessage(envelope);if(packet.type!=='snapshot')throw Error('Expected local snapshot');return packet;};
 const send=(checkpoint=false)=>{
  const row=capture(checkpoint),packet=unwrap(row.envelope),result=reader.adopt(packet),oracle=strict.adopt(row.oracle);
  expect(result.status,result.status==='resync'?result.reason:undefined).toBe('applied');expect(oracle.status,oracle.status==='resync'?oracle.reason:undefined).toBe('applied');
  if(result.status!=='applied'||oracle.status!=='applied')throw Error('Expected admitted pair');expect(result.world).toStrictEqual(oracle.world);return{...row,packet,world:result.world};
 };
 return{world,reader,strict,encoder,natural,auxiliary,capture,unwrap,send};
}

test('unchanged same-tick auxiliary fields borrow exact old identities after complete reconstruction and leave public snapshots literal',()=>{
 const h=harness(),a=h.send(),before=structuredClone(a.world),first=readResidentAuxiliaryFrame(a.world)!;
 const b=h.send();expect(b.envelope.version).toBe(3);expect(b.envelope.auxiliary.sections).toStrictEqual({});
 expect(Object.keys(b.envelope.publication.world)).toEqual(Object.keys(b.oracle.world));
 for(const key of RESIDENT_AUXILIARY_KEYS){expect(b.envelope.publication.world[key]).toBe(0);expect(b.oracle.world[key]).not.toBe(0);expect(b.world[key]).toBe(a.world[key]);expect(readResidentAuxiliaryFrame(b.world)!.token(key)).toBe(first.token(key));}
 expect(b.world.tick).toBe(a.world.tick);expect(a.world).toStrictEqual(before);expect(readResidentAuxiliaryFrame(structuredClone(b.world))).toBeUndefined();
 expect(()=>readResidentWorkerMessage(b.oracle)).toThrow('Public publication');
});

test('in-place nested edits at the same tick replace exact sections while filth uses exact independent rows',()=>{
 const h=harness(),a=h.send(),before=structuredClone(a.world),tokens=readResidentAuxiliaryFrame(a.world)!;
 h.world.stockpiles[0]!.filters.food=false;h.world.stockpiles[0]!.items!.wood=false;h.world.home!.push(3);h.world.roofing!.cursor=1;h.world.filth!.cleaned=1;
 const b=h.send();expect(Object.keys(b.envelope.auxiliary.sections).sort()).toEqual([...RESIDENT_AUXILIARY_KEYS].sort());
 for(const key of RESIDENT_AUXILIARY_KEYS){expect(b.world[key]).not.toBe(a.world[key]);expect(readResidentAuxiliaryFrame(b.world)!.token(key)).not.toBe(tokens.token(key));}
 expect(b.world.tick).toBe(a.world.tick);expect(a.world).toStrictEqual(before);
 h.world.filth!.items[0]!.thickness=2;const c=h.send();expect(Object.keys(c.envelope.auxiliary.sections)).toEqual([]);expect(c.envelope.publication.world.filth).toBe(0);expect(c.world.filth).toStrictEqual(c.oracle.world.filth);expect(c.world.filth!.items[0]!.thickness).toBe(2);expect(b.world.filth!.items[0]!.thickness).toBe(1);
});

test('optional omissions remove complete old sections, checkpoints never inherit and own undefined remains distinct on the wire',()=>{
 const h=harness(),a=h.send();delete h.world.home;delete h.world.roofing;delete h.world.filth;
 const b=h.send();for(const key of ['home','roofing'] as const){expect(b.envelope.auxiliary.sections[key]).toStrictEqual({present:false});expect(Object.hasOwn(b.world,key)).toBe(false);expect(Object.hasOwn(a.world,key)).toBe(true);}expect(Object.hasOwn(b.world,'filth')).toBe(false);
 const fresh=h.send(true);expect(Object.keys(fresh.envelope.auxiliary.sections).sort()).toEqual([...RESIDENT_AUXILIARY_KEYS].sort());expect(readResidentAuxiliaryFrame(fresh.world)!.token('stockpiles')).not.toBe(readResidentAuxiliaryFrame(b.world)!.token('stockpiles'));
 // Representation test only: this does not assert an invalid own-undefined
 // World should pass either gameplay/public admission validator.
 const raw={...structuredClone(fresh.oracle),kind:'checkpoint' as const,revision:fresh.oracle.revision+1,world:{...fresh.oracle.world,home:undefined}} as SnapshotMessage<true>;
 const encoded=new ResidentAuxiliaryEncoder().capture(raw),owner=new ResidentAuxiliaryFrameOwner(),draft=owner.prepare(encoded.publication as unknown as SnapshotMessage<true>,structuredClone(encoded.auxiliary));
 expect(draft&&draft!=='stale').toBe(true);if(!draft||draft==='stale')throw Error('Representation refused');expect(Object.hasOwn(draft.packet.world,'home')).toBe(true);expect(draft.packet.world.home).toBeUndefined();
});

test('missing predecessors, dropped publications and forged reference markers refuse without advancing old identities, then retry exactly',()=>{
 const h=harness(),a=h.send(),first=readResidentAuxiliaryFrame(a.world),one=h.capture(),two=h.capture();
 expect(new ResidentVegetationAssembler().adopt(h.unwrap(structuredClone(one.envelope))).status).toBe('resync');
 expect(h.reader.adopt(h.unwrap(structuredClone(two.envelope))).status).toBe('resync');
 const bad=structuredClone(one.envelope);Object.assign(bad.publication.world,{stockpiles:[]});expect(h.reader.adopt(h.unwrap(bad)).status).toBe('resync');expect(readResidentAuxiliaryFrame(a.world)).toBe(first);
 const oneResult=h.reader.adopt(h.unwrap(one.envelope));expect(oneResult.status).toBe('applied');const twoResult=h.reader.adopt(h.unwrap(two.envelope));expect(twoResult.status).toBe('applied');
 expect(h.reader.adopt(h.unwrap(two.envelope)).status).toBe('stale');if(twoResult.status!=='applied')throw Error('Retry refused');expect(twoResult.world.stockpiles).toBe(a.world.stockpiles);
});

test.each(['refuse','throw'] as const)('late extra %s is transactional for auxiliary values and tokens',mode=>{
 const h=harness(),a=h.send(),first=readResidentAuxiliaryFrame(a.world);h.world.home!.push(3);const row=h.capture(),packet=h.unwrap(row.envelope),before=structuredClone(packet);let candidate:World|undefined;
 const extra=(world:World)=>{candidate=world;if(mode==='throw')throw Error('late auxiliary test');return false;};
 if(mode==='throw')expect(()=>h.reader.adopt(packet,extra)).toThrow('late auxiliary test');else expect(h.reader.adopt(packet,extra).status).toBe('resync');
 expect(candidate).toBeDefined();expect(readResidentAuxiliaryFrame(candidate!)).toBeUndefined();expect(readResidentAuxiliaryFrame(a.world)).toBe(first);expect(packet).toStrictEqual(before);
 const retried=h.reader.adopt(packet);expect(retried.status).toBe('applied');if(retried.status!=='applied')throw Error('Retry refused');expect(retried.world.home).toEqual([0,1,2,3]);expect(a.world.home).toEqual([0,1,2]);
});

test('malformed auxiliary data, accessors and contradictory optional presence do not grant a reuse capability',()=>{
 const h=harness(),a=h.send(),first=readResidentAuxiliaryFrame(a.world);h.world.home!.push(4);const good=h.capture();
 const corruptions:((e:ResidentAuxiliaryEnvelope)=>void)[]=[
  e=>Object.assign(e.auxiliary,{tick:e.auxiliary.tick+1}),
  e=>Object.assign(e.auxiliary,{baseRevision:0}),
  e=>Object.assign(e.auxiliary.sections,{future:{present:false}}),
  e=>Object.assign(e.auxiliary.sections,{home:{present:false}}),
  e=>{const value=[0,1];delete value[0];Object.assign(e.auxiliary.sections,{home:{present:true,value}});},
 ];
 for(const corrupt of corruptions){const e=structuredClone(good.envelope);corrupt(e);expect(h.reader.adopt(h.unwrap(e)).status).toBe('resync');expect(readResidentAuxiliaryFrame(a.world)).toBe(first);}
 let reads=0;const getter=structuredClone(good.envelope);Object.defineProperty(getter.auxiliary.sections.home!,'value',{enumerable:true,get(){reads++;return[0];}});
 expect(h.reader.adopt(h.unwrap(getter)).status).toBe('resync');expect(reads).toBe(0);expect(h.reader.adopt(h.unwrap(good.envelope)).status).toBe('applied');
});

test('resident signatures avoid repeated cold observations while public mutable and cloned World reads remain exact',()=>{
 const h=harness(),a=h.send(),storage=new StoragePresentationSignature(),home=new HomePresentationSignature(),s=storage.readResident(a.world),p=home.readResident(a.world),b=h.send();
 expect(storage.readResident(b.world)).toBe(s);expect(home.readResident(b.world)).toBe(p);
 const mutable=structuredClone(b.world);mutable.stockpiles[0]!.filters.wood=false;mutable.home!.push(7);
 expect(storage.readResident(mutable)).not.toBe(s);expect(home.readResident(mutable)).not.toBe(p);expect(storage.readResident(b.world)).toBe(s);expect(home.readResident(b.world)).toBe(p);
 mutable.stockpiles[0]!.priority=3;mutable.home!.reverse();expect(storage.read(mutable.stockpiles)).toBe(new StoragePresentationSignature().read(mutable.stockpiles));expect(home.read(mutable.home)).toBe(new HomePresentationSignature().read(mutable.home));
 h.world.stockpiles[0]!.priority=2;h.world.home!.push(4);const c=h.send();expect(storage.readResident(c.world)).not.toBe(s);expect(home.readResident(c.world)).not.toBe(p);
});

test('legacy v2 stays literal and a public mutable producer packet is never rewritten by auxiliary capture',()=>{
 const h=harness(),packet=h.encoder.encode(h.world,0,1),before=structuredClone(packet),appearance=h.natural.capture(h.world,packet),legacy=structuredClone(residentPublication(packet,appearance));
 const encoded=h.auxiliary.capture(packet);expect(packet).toStrictEqual(before);expect(packet.world.stockpiles).toBe(h.world.stockpiles);expect(encoded.publication.world.stockpiles).toBe(0);
 const decoded=readResidentWorkerMessage(legacy);if(decoded.type!=='snapshot')throw Error('Expected legacy snapshot');const result=h.reader.adopt(decoded);expect(result.status).toBe('applied');if(result.status!=='applied')throw Error('Legacy refused');expect(readResidentAuxiliaryFrame(result.world)).toBeUndefined();
});
