import {expect,test} from 'vitest';
import {SnapshotEncoder} from '../src/bridge/snapshots';
import {WorkerNaturalAppearance} from '../src/bridge/worker-natural-appearance';
import {WorkerNaturalAppearance as ObjectWorker} from './fixtures/crop-object-worker-v433';
import {CropVisualColumnWriter,readCropVisualColumns} from '../src/bridge/crop-visual-columns';
import {readPreparedCropFrame,readPreparedNaturalFrame} from '../src/bridge/prepared-natural-frame';
import {readResidentNaturalSidecar} from '../src/bridge/resident-protocol';
import type {TypedCropVisualDelta} from '../src/bridge/natural-appearance-values';
import {cropRows,objectCrops} from './crop-column-fixtures-v433';
import {fixture,wireHarness} from './crop-wire-fixtures-v433';

const bytes=(value:ArrayBufferView)=>new Uint8Array(value.buffer,value.byteOffset,value.byteLength);
const rawNatural=(packet:Parameters<ReturnType<typeof wireHarness>['reader']['adopt']>[0])=>readResidentNaturalSidecar(packet) as Record<string,any>;

test('typed Worker expands to the frozen object-row oracle exactly, including clone bytes and natural sidecar',()=>{
 const world=fixture(),encoder=new SnapshotEncoder({structureDelta:true}),typed=new WorkerNaturalAppearance(),literal=new ObjectWorker();
 const edits=[()=>{},()=>{world.resources[0]!.growth=.23456789012345678;},()=>{world.resources[1]!.x++;},()=>{world.resources.reverse();},()=>{world.resources.splice(1,1);},()=>{world.resources.push({id:world.nextId++,kind:'corn',x:12,z:12,amount:8,growth:.7654321098765432,growthTick:world.tick});}];
 for(const edit of edits){edit();const before=structuredClone(world),packet=encoder.encode(world,0,1),actual=typed.capture(world,packet),expected=literal.capture(world,packet),clone=structuredClone(actual);
  expect(cropRows(actual.crops)).toEqual(expected.crops.upsert);expect(Array.from(actual.crops.removed)).toEqual(expected.crops.removed);
  expect({...actual,crops:undefined}).toEqual({...expected,crops:undefined});expect(world).toEqual(before);
  for(const name of ['ids','ordinals','growth','flags','removed']as const){expect(bytes(clone.crops[name])).toEqual(bytes(actual.crops[name]));expect(clone.crops[name].buffer).not.toBe(actual.crops[name].buffer);expect(clone.crops[name].byteOffset).toBe(0);expect(clone.crops[name].byteLength).toBe(clone.crops[name].buffer.byteLength);}
 }
});

test('writer preserves Float64 IDs and growth bits, uses disjoint complete buffers and bounds dynamic capacity',()=>{
 const writer=new CropVisualColumnWriter(19);for(let i=0;i<19;i++)writer.append(2**40+i,18-i,i===0?-0:.12345678901234568+i/100, i%8);
 const wire=writer.finish([2**41]);expect(wire.ids[0]).toBe(2**40);expect(Object.is(wire.growth[0],-0)).toBe(true);expect(Object.is(wire.growth[1],.12345678901234568+.01)).toBe(true);
 expect(wire.growth[1]).not.toBe(Math.fround(wire.growth[1]!));expect(wire.ids.length).toBe(19);expect(readCropVisualColumns(wire,19,1)).toBe(wire);expect(()=>writer.append(1,0,1,0)).toThrow('population exceeded');
 const empty=new CropVisualColumnWriter(0).finish([]);expect(readCropVisualColumns(empty,0,0)).toBe(empty);
});

test('closed typed containers reject wrong classes, views, aliases, future fields, detached/shared/resizable buffers without consuming the packet',()=>{
 const h=wireHarness(),packet=h.packet(),raw=rawNatural(packet),valid=raw.crops as TypedCropVisualDelta,n=valid.ids.length;
 const cases:Array<readonly[string,(c:Record<string,any>)=>void]>=[
  ['future format',c=>{c.format='columns-v2';}],['undefined format',c=>{c.format=undefined;}],['missing format',c=>{delete c.format;}],['future field',c=>{c.future=1;}],['null column',c=>{c.growth=null;}],
  ['wrong float class',c=>{c.ids=new Float32Array(c.ids);}],['wrong ordinal class',c=>{c.ordinals=new Uint16Array(c.ordinals);}],['wrong flags class',c=>{c.flags=new Uint16Array(c.flags);}],['array removed',c=>{c.removed=[];}],
  ['offset view',c=>{c.growth=new Float64Array(new ArrayBuffer((n+1)*8),8,n);}],['outside trailing bytes',c=>{c.growth=new Float64Array(new ArrayBuffer((n+1)*8),0,n);}],['length mismatch',c=>{c.flags=new Uint8Array(n-1);}],
  ['aliased buffers',c=>{c.growth=c.ids;}],['future typed property',c=>{c.ids.future=1;}],['future buffer property',c=>{c.growth.buffer.future=1;}],['future symbol',c=>{c.flags[Symbol('future')]=1;}],
  ['fake native object',c=>{c.growth=Object.create(Float64Array.prototype);}],['wrong prototype',c=>{Object.setPrototypeOf(c.ids,Uint32Array.prototype);}],
  ['disguised float class',c=>{c.growth=Object.setPrototypeOf(new Uint8Array(n),Float64Array.prototype);}],
  ['disguised equal-width class',c=>{c.flags=Object.setPrototypeOf(new Uint8ClampedArray(n),Uint8Array.prototype);}],
  ['disguised NaN flags',c=>{const flags=new Float64Array(n);flags[0]=NaN;c.flags=Object.setPrototypeOf(flags,Uint8Array.prototype);}],
  // Only a private wire COPY is transferred here, never a World/producer buffer.
  ['detached wire',c=>{structuredClone(c.growth.buffer,{transfer:[c.growth.buffer]});}],
 ];
 if(typeof SharedArrayBuffer!=='undefined')cases.push(['shared buffer',c=>{c.growth=new Float64Array(new SharedArrayBuffer(n*8));}]);
 if(Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'resizable'))cases.push(['resizable buffer',c=>{c.growth=new Float64Array(Reflect.construct(ArrayBuffer,[n*8,{maxByteLength:n*16}]));}]);
 for(const [label,corrupt]of cases){const bad=structuredClone(valid) as unknown as Record<string,any>;corrupt(bad);raw.crops=bad;expect(readCropVisualColumns(bad,h.world.resources.length,0),label).toBeUndefined();expect(h.reader.adopt(packet).status,label).toBe('resync');}
 raw.crops=valid;expect(h.reader.adopt(packet).status).toBe('applied');
});

test('typed numeric cells retain all identity, range, bit and complete-population refusal checks',()=>{
 const h=wireHarness(),packet=h.packet(),raw=rawNatural(packet),valid=raw.crops as TypedCropVisualDelta;
 const cases:Array<readonly[string,(c:TypedCropVisualDelta)=>void]>=[
  ['zero id',c=>{c.ids[0]=0;}],['fraction id',c=>{c.ids[0]=1.5;}],['unsafe id',c=>{c.ids[0]=2**53;}],['future id',c=>{c.ids[0]=h.world.nextId;}],['duplicate id',c=>{c.ids[1]=c.ids[0]!;}],
  ['outside ordinal',c=>{c.ordinals[0]=0xffffffff;}],['mismatched identity',c=>{c.ordinals[0]=1;}],['NaN growth',c=>{c.growth[0]=NaN;}],['infinite growth',c=>{c.growth[0]=Infinity;}],['negative growth',c=>{c.growth[0]=-.001;}],['future growth',c=>{c.growth[0]=1.001;}],
  ['future flag bit',c=>{c.flags[0]=8;}],['blight mismatch',c=>{c.flags[0]=2;}],
 ];
 for(const [label,corrupt]of cases){const bad=structuredClone(valid);corrupt(bad);raw.crops=bad;expect(readCropVisualColumns(bad,h.world.resources.length,0),label).toBeDefined();expect(h.reader.adopt(packet).status,label).toBe('resync');}
 const short={...valid,ids:valid.ids.slice(0,-1),ordinals:valid.ordinals.slice(0,-1),growth:valid.growth.slice(0,-1),flags:valid.flags.slice(0,-1)};raw.crops=short;expect(h.reader.adopt(packet).status).toBe('resync');
 raw.crops={...valid,removed:new Float64Array([valid.ids[0]!])};expect(h.reader.adopt(packet).status).toBe('resync');raw.crops=valid;expect(h.reader.adopt(packet).status).toBe('applied');
});

test('column and buffer accessors are refused without executing any getter',()=>{
 const h=wireHarness(),packet=h.packet(),raw=rawNatural(packet),valid=raw.crops as TypedCropVisualDelta;let reads=0;
 for(const field of ['growth','ids']as const){const bad=structuredClone(valid);Object.defineProperty(bad,field,{enumerable:true,get(){reads++;return valid[field];}});raw.crops=bad;expect(h.reader.adopt(packet).status).toBe('resync');}
 const bad=structuredClone(valid);Object.defineProperty(bad.growth,'length',{get(){reads++;return valid.growth.length;}});raw.crops=bad;expect(h.reader.adopt(packet).status).toBe('resync');
 const bufferBad=structuredClone(valid);Object.defineProperty(bufferBad.growth.buffer,'future',{get(){reads++;return 1;}});raw.crops=bufferBad;expect(h.reader.adopt(packet).status).toBe('resync');expect(reads).toBe(0);
 raw.crops=valid;expect(h.reader.adopt(packet).status).toBe('applied');
});

test('typed pages copy exact values before commit and never retain mutable source wire buffers',()=>{
 const h=wireHarness(),packet=h.packet(),raw=rawNatural(packet),wire=raw.crops as TypedCropVisualDelta,result=h.reader.adopt(packet);expect(result.status).toBe('applied');if(result.status!=='applied')throw Error('Typed refused');
 const first=readPreparedCropFrame(result.world)!,id=h.world.resources[0]!.id,value=first.lookup(id)!.growth;wire.growth[0]=.99;wire.ids[0]=0;wire.flags[0]=255;expect(Object.is(first.lookup(id)!.growth,value)).toBe(true);
 h.world.resources[0]!.growth=.23456789012345678;const next=h.send();expect(Object.is(readPreparedCropFrame(next)!.lookup(id)!.growth,.23456789012345678)).toBe(true);expect(Object.is(first.lookup(id)!.growth,value)).toBe(true);
});

test('object crop rows and typed deltas interoperate, while absent natural crops require a full rebootstrap',()=>{
 const h=wireHarness(),packet=h.packet(),raw=rawNatural(packet);raw.crops=objectCrops(raw.crops);const a=h.reader.adopt(packet);expect(a.status).toBe('applied');if(a.status!=='applied')throw Error('Old object rows refused');
 const old=readPreparedCropFrame(a.world)!;h.world.resources[0]!.growth=.4;const b=h.send();expect(readPreparedCropFrame(b)!.lookup(h.world.resources[0]!.id)?.growth).toBe(.4);
 h.world.resources[0]!.growth=.5;const c=h.packet(),rawC=rawNatural(c);rawC.crops=objectCrops(rawC.crops);expect(h.reader.adopt(c).status).toBe('applied');
 h.world.resources[0]!.growth=.6;const legacy=h.packet();delete rawNatural(legacy).crops;const d=h.reader.adopt(legacy);expect(d.status).toBe('applied');if(d.status!=='applied')throw Error('Old natural refused');expect(readPreparedCropFrame(d.world)).toBeUndefined();expect(readPreparedNaturalFrame(d.world)).toBeDefined();
 h.world.resources[0]!.growth=.7;const missing=h.packet();expect(h.reader.adopt(missing).status).toBe('resync');delete rawNatural(missing).crops;expect(h.reader.adopt(missing).status).toBe('applied');const full=h.send(true);expect(readPreparedCropFrame(full)!.lookup(h.world.resources[0]!.id)?.growth).toBe(.7);expect(old.lookup(h.world.resources[0]!.id)?.growth).toBe(.12345678901234568);
});

test('same-tick typed rejection and late refusal leave the exact adjacent retry usable',()=>{
 const h=wireHarness(),first=h.send(),old=readPreparedCropFrame(first)!;h.world.resources[0]!.growth=.23;const packet=h.packet(),raw=rawNatural(packet),wire=raw.crops as TypedCropVisualDelta,value=wire.growth[0]!;
 wire.growth[0]=NaN;expect(h.reader.adopt(packet).status).toBe('resync');wire.growth[0]=value;expect(h.reader.adopt(packet,()=>false).status).toBe('resync');const retry=h.reader.adopt(packet);expect(retry.status).toBe('applied');if(retry.status==='applied')expect(readPreparedCropFrame(retry.world)!.lookup(h.world.resources[0]!.id)?.growth).toBe(.23);expect(old.lookup(h.world.resources[0]!.id)?.growth).toBe(.12345678901234568);
});
