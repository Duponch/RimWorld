import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots';
import {WorkerNaturalAppearance} from '../src/bridge/worker-natural-appearance';
import {fixture} from './resident-presentation-fixtures-v427';
import {addFilth} from '../src/sim/filth';
import type {World} from '../src/sim/types';
import {ResidentAuxiliaryEncoder,readResidentAuxiliaryFrame} from '../src/bridge/resident-auxiliary-sections';
import {ResidentVegetationAssembler} from '../src/bridge/resident-vegetation-assembler';
import {residentPublication,readResidentWorkerMessage,type ResidentAuxiliaryEnvelope} from '../src/bridge/resident-protocol';
import {readResidentFilthFrame} from '../src/bridge/resident-filth-section';
import {readPreparedCropFrame,readPreparedNaturalFrame} from '../src/bridge/prepared-natural-frame';

test('the closed envelope rejects an accessor version without evaluating it',()=>{
 let reads=0;const envelope={type:'resident-publication',get version(){reads++;return 3;},publication:{},natural:{},auxiliary:{}};
 expect(()=>readResidentWorkerMessage(envelope)).toThrow('Invalid resident publication version');expect(reads).toBe(0);
});

test.each(['refuse','throw'] as const)('crop, filth and home publish atomically after a late %s and exact retry',mode=>{
 const h=harness(),id=h.world.nextId++;
 h.world.resources.push({id,kind:'rice',x:2,z:3,amount:8,growth:.2,growthTick:h.world.tick});
 const first=h.send(),old=structuredClone(first.world),crop=readPreparedCropFrame(first.world)!;
 h.world.resources.at(-1)!.growth=.6;h.world.home=[0];h.world.filth!.items[0]!.thickness=2;
 const row=h.capture(),packet=h.unwrap(row.envelope);let rejected:World|undefined;
 const extra=(world:World)=>{rejected=world;if(mode==='throw')throw Error('combined late rejection');return false;};
 if(mode==='throw')expect(()=>h.reader.adopt(packet,extra)).toThrow('combined late rejection');else expect(h.reader.adopt(packet,extra).status).toBe('resync');
 expect(rejected).toBeDefined();expect(readPreparedCropFrame(rejected!)).toBeUndefined();expect(readPreparedNaturalFrame(rejected!)).toBeUndefined();expect(readResidentFilthFrame(rejected!)).toBeUndefined();expect(readResidentAuxiliaryFrame(rejected!)).toBeUndefined();
 expect(first.world).toStrictEqual(old);expect(crop.lookup(id)?.growth).toBe(.2);
 const result=h.reader.adopt(packet),oracle=h.oracle.adopt(row.literal);expect(result.status).toBe('applied');expect(oracle.status).toBe('applied');
 if(result.status!=='applied'||oracle.status!=='applied')throw Error('Combined retry refused');expect(result.world).toStrictEqual(oracle.world);
 expect(readPreparedCropFrame(result.world)!.lookup(id)?.growth).toBe(.6);expect(result.world.filth!.items[0]!.thickness).toBe(2);expect(result.world.home).toEqual([0]);
});

function harness(){
 const world=fixture(),encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),auxiliary=new ResidentAuxiliaryEncoder(),natural=new WorkerNaturalAppearance(),reader=new ResidentVegetationAssembler(),oracle=new SnapshotDecoder();
 world.tiles[2+3*world.width]={terrain:'soil'};expect(addFilth(world,{x:2,z:3},'blood')).toBe(true);
 const capture=(checkpoint=false)=>{
  const packet=encoder.encode(world,0,1,checkpoint),literal=structuredClone(packet),appearance=natural.capture(world,packet),captured=auxiliary.capture(packet);
  expect(packet).toStrictEqual(literal);
  if(world.filth!==undefined){
   expect(Object.isFrozen(world.filth)).toBe(false);expect(Object.isFrozen(world.filth.items)).toBe(false);
   for(const row of world.filth.items)expect(Object.isFrozen(row)).toBe(false);
  }
  return {literal,envelope:structuredClone(residentPublication(captured.publication,appearance,captured.auxiliary))};
 };
 const unwrap=(envelope:ResidentAuxiliaryEnvelope)=>{const packet=readResidentWorkerMessage(envelope);if(packet.type!=='snapshot')throw Error('Expected local snapshot');return packet;};
 const send=(checkpoint=false)=>{
  const row=capture(checkpoint),result=reader.adopt(unwrap(row.envelope)),reference=oracle.adopt(row.literal);
  expect(result.status,result.status==='resync'?result.reason:undefined).toBe('applied');expect(reference.status,reference.status==='resync'?reference.reason:undefined).toBe('applied');
  if(result.status!=='applied'||reference.status!=='applied')throw Error('Expected applied pair');expect(result.world).toStrictEqual(reference.world);return {...row,world:result.world};
 };
 return {world,reader,oracle,encoder,natural,auxiliary,capture,unwrap,send};
}

test('the complete private v3 pipeline restores exact same-tick filth and keeps auxiliary and filth identities independently',()=>{
 const h=harness(),a=h.send(),before=structuredClone(a.world),aux=readResidentAuxiliaryFrame(a.world)!,filth=readResidentFilthFrame(a.world)!;
 h.world.filth!.rng^=1;const b=h.send();expect(b.envelope.version).toBe(3);expect(b.envelope.publication.world.filth).toBe(0);expect(b.envelope.auxiliary.filth!.section).toMatchObject({mode:'items',reset:false,removed:[],upserted:[]});
 expect(b.world.filth!.items).toBe(a.world.filth!.items);expect(readResidentFilthFrame(b.world)!.itemsToken).toBe(filth.itemsToken);expect(b.world.stockpiles).toBe(a.world.stockpiles);expect(readResidentAuxiliaryFrame(b.world)!.token('stockpiles')).toBe(aux.token('stockpiles'));
 h.world.filth!.items[0]!.thickness=2;const c=h.send();expect(c.world.tick).toBe(a.world.tick);expect(c.world.filth!.items[0]!.thickness).toBe(2);expect(c.world.filth!.items).not.toBe(b.world.filth!.items);
 expect(a.world).toStrictEqual(before);expect(c.envelope.auxiliary.sections).toStrictEqual({});
});

test('absent filth, same empty items, reactivation and checkpoints have exact presence and persistent identities',()=>{
 const h=harness();delete h.world.filth;const absent=h.send(),sameAbsent=h.send();expect(Object.hasOwn(absent.world,'filth')).toBe(false);expect(sameAbsent.envelope.auxiliary.filth!.section).toStrictEqual({mode:'absent'});
 h.world.filth={rng:1,items:[],cleaned:0};const empty=h.send(),same=h.send();expect(same.world.filth).toBe(empty.world.filth);expect(same.world.filth!.items).toBe(empty.world.filth!.items);
 h.world.filth.rng=2;const head=h.send();expect(head.world.filth!.items).toBe(empty.world.filth!.items);
 expect(addFilth(h.world,{x:2,z:3},'blood')).toBe(true);const live=h.send();expect(live.world.filth!.items).toHaveLength(1);expect(empty.world.filth!.items).toHaveLength(0);
 const fresh=h.send(true);expect(fresh.world.filth!.items).not.toBe(live.world.filth!.items);expect(readResidentFilthFrame(fresh.world)!.itemsToken).not.toBe(readResidentFilthFrame(live.world)!.itemsToken);
});

test.each(['refuse','throw','substitute'] as const)('auxiliary/base/natural/filth admission remains atomic on late extra %s',mode=>{
 const h=harness(),a=h.send(),aux=readResidentAuxiliaryFrame(a.world),filth=readResidentFilthFrame(a.world);h.world.filth!.items[0]!.thickness=2;h.world.home=[0];const row=h.capture(),packet=h.unwrap(row.envelope);let candidate:World|undefined;
 const extra=(world:World)=>{candidate=world;if(mode==='throw')throw Error('private complete filth extra');if(mode==='substitute'){world.filth=structuredClone(world.filth);return true;}return false;};
 if(mode==='throw')expect(()=>h.reader.adopt(packet,extra)).toThrow('private complete filth extra');else expect(h.reader.adopt(packet,extra).status).toBe('resync');
 expect(candidate).toBeDefined();expect(readResidentFilthFrame(candidate!)).toBeUndefined();expect(readResidentAuxiliaryFrame(candidate!)).toBeUndefined();expect(readResidentFilthFrame(a.world)).toBe(filth);expect(readResidentAuxiliaryFrame(a.world)).toBe(aux);
 const retry=h.reader.adopt(packet);expect(retry.status).toBe('applied');if(retry.status!=='applied')throw Error('Expected retry');expect(retry.world.filth!.items[0]!.thickness).toBe(2);expect(retry.world.home).toEqual([0]);expect(a.world.filth!.items[0]!.thickness).toBe(1);
});

test('legacy v3 stays literal, clears filth only on success, and a later split lane requires a fresh checkpoint',()=>{
 const h=harness(),a=h.send(),row=h.capture(),{filth:omitted,...legacyAuxiliary}=row.envelope.auxiliary;
 expect(omitted).toBeDefined();const legacy:ResidentAuxiliaryEnvelope=structuredClone(row.envelope);Object.assign(legacy,{auxiliary:legacyAuxiliary});Object.assign(legacy.publication.world,{filth:row.literal.world.filth});
 const packet=h.unwrap(legacy);expect(h.reader.adopt(packet,()=>false).status).toBe('resync');expect(readResidentFilthFrame(a.world)).toBeDefined();
 const result=h.reader.adopt(packet);expect(result.status).toBe('applied');if(result.status!=='applied')throw Error('Expected literal legacy');expect(result.world.filth).toStrictEqual(row.literal.world.filth);expect(readResidentFilthFrame(result.world)).toBeUndefined();
 const missing=h.capture();expect(h.reader.adopt(h.unwrap(missing.envelope)).status).toBe('resync');expect(h.send(true).world.filth!.items).toHaveLength(1);
});

test('v2 keeps the full public field and grants no auxiliary or filth capability',()=>{
 const h=harness(),packet=h.encoder.encode(h.world,0,1,true),before=structuredClone(packet),appearance=h.natural.capture(h.world,packet),v2=structuredClone(residentPublication(packet,appearance));
 const decoded=readResidentWorkerMessage(v2);if(decoded.type!=='snapshot')throw Error('Expected v2 snapshot');const result=h.reader.adopt(decoded);expect(result.status).toBe('applied');if(result.status!=='applied')throw Error('Expected v2');
 expect(decoded).toStrictEqual(before);expect(result.world.filth).toStrictEqual(before.world.filth);expect(readResidentAuxiliaryFrame(result.world)).toBeUndefined();expect(readResidentFilthFrame(result.world)).toBeUndefined();
 expect(()=>readResidentWorkerMessage(before)).toThrow('Public publication');expect(h.send(true).world.filth!.items).toHaveLength(1);
});
