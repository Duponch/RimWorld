import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler';
import {readSnapshotChanges,readSnapshotResourceStructure} from '../src/bridge/snapshot-changes';
import {readResidentResourceBaseChanges} from '../src/bridge/resident-resource-base-journal';
import {fixture} from './resident-presentation-fixtures-v427';

type Delta=Extract<SnapshotMessage<true>,{kind:'delta'}>;
function harness(){
 const world=fixture(),encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),reader=new ResidentPresentationAssembler(),literal=new SnapshotDecoder();
 for(const r of world.resources)r.growthThermalFactor=.75;
 const packet=()=>structuredClone(encoder.encode(world,0,1));
 const adopt=(value:SnapshotMessage<true>)=>{
  const expected=literal.adopt(structuredClone(value)),actual=reader.adopt(value);
  expect(expected.status,expected.status==='resync'?expected.reason:undefined).toBe('applied');expect(actual.status,actual.status==='resync'?actual.reason:undefined).toBe('applied');
  if(expected.status!=='applied'||actual.status!=='applied')throw Error('Real encoder/assembler or literal reader refused');
  expect(actual.world).toStrictEqual(expected.world);expect(JSON.stringify(actual.world)).toBe(JSON.stringify(expected.world));return actual.world;
 };
 return{world,encoder,reader,literal,packet,adopt};
}
function growthOnly(packet:SnapshotMessage<true>):Delta{
 expect(packet.kind).toBe('delta');if(packet.kind!=='delta')throw Error('Expected real delta');
 expect(packet.resources?.removed).toEqual([]);expect(packet.resources?.upserted).toEqual([]);expect(Object.hasOwn(packet.resources!,'order')).toBe(false);expect(packet.resources?.growth).toBeInstanceOf(Float64Array);return packet;
}
function freezeResources(world:ReturnType<ReturnType<typeof harness>['adopt']>){for(const r of world.resources)Object.freeze(r);Object.freeze(world.resources);}

test('growth-only clones exact bits/order while FULL and BASE journals retain their different meanings',()=>{
 const h=harness(),a=h.adopt(h.packet()),before=structuredClone(a);freezeResources(a);
 h.world.resources[0]!.growth=.3123456789012345;delete h.world.resources[0]!.growthThermalFactor;
 h.world.resources[1]!.growth=.4123456789012345;h.world.resources[1]!.growthThermalFactor=-0;
 const packet=growthOnly(h.packet()),rows=packet.resources!.growth!;
 expect(rows).toHaveLength(8);expect(Number.isNaN(rows[3])).toBe(true);expect(Object.is(rows[7],-0)).toBe(true);
 // The wire may list updates in a different order from unchanged physical slots.
 packet.resources!.growth=new Float64Array([...rows.subarray(4),...rows.subarray(0,4)]);
 const b=h.adopt(packet);expect(b.resources).not.toBe(a.resources);expect(b.resources.map(r=>r.id)).toEqual(a.resources.map(r=>r.id));
 expect(Object.hasOwn(b.resources[0]!,'growthThermalFactor')).toBe(false);expect(Object.is(b.resources[1]!.growthThermalFactor,-0)).toBe(true);
 expect(readSnapshotChanges(a,b)).toEqual({resourceIndices:[0,1],tileIndices:[]});
 const full=readSnapshotResourceStructure(a,b)!.edges[0]!,base=readResidentResourceBaseChanges(a,b)!.edges[0]!;
 expect(full).toMatchObject({beforeCount:2,afterCount:2,removed:[],added:[],updated:a.resources.map((r,afterOrdinal)=>({id:r.id,afterOrdinal}))});
 expect(base).toMatchObject({beforeCount:2,afterCount:2,removed:[],added:[],updated:[]});expect(a).toStrictEqual(before);
 const empty=growthOnly({...h.packet(),resources:{removed:[],upserted:[],growth:new Float64Array()}} as SnapshotMessage<true>),c=h.adopt(empty);
 expect(c.resources).toBe(b.resources);expect(readSnapshotChanges(b,c)).toEqual({resourceIndices:[],tileIndices:[]});expect(readResidentResourceBaseChanges(b,c)!.edges[0]!.updated).toEqual([]);
});

test('invalid tuple shape/id/duplicate/value/tick/factor refuse transactionally and the exact valid packet still commits',()=>{
 const h=harness(),a=h.adopt(h.packet()),before=structuredClone(a);freezeResources(a);
 h.world.resources[0]!.growth=.35;h.world.resources[1]!.growth=.45;const good=growthOnly(h.packet());expect(good.resources!.growth).toHaveLength(8);
 const corruptions:Array<[string,(p:Delta)=>void]>=[
  ['ordinary array',p=>{p.resources!.growth=Array.from(p.resources!.growth!) as unknown as Float64Array;}],
  ['wrong typed array',p=>{p.resources!.growth=new Float32Array(p.resources!.growth!) as unknown as Float64Array;}],
  ['incomplete tuple',p=>{p.resources!.growth=new Float64Array(5);}],
  ['population overflow',p=>{p.resources!.growth=new Float64Array(12);}],
  ['unknown id',p=>{p.resources!.growth![0]=h.world.nextId+1;}],
  ['fractional id',p=>{p.resources!.growth![0]=1.5;}],
  ['duplicate id',p=>{p.resources!.growth![4]=p.resources!.growth![0]!;}],
  ['nonfinite value',p=>{p.resources!.growth![1]=Infinity;}],
  ['negative value',p=>{p.resources!.growth![1]=-.01;}],
  ['overfull value',p=>{p.resources!.growth![1]=1.01;}],
  ['future tick',p=>{p.resources!.growth![2]=p.world.tick+1;}],
  ['fractional tick',p=>{p.resources!.growth![2]=.5;}],
  ['negative factor',p=>{p.resources!.growth![3]=-.01;}],
  ['overfull factor',p=>{p.resources!.growth![3]=1.01;}],
  ['infinite factor',p=>{p.resources!.growth![3]=Infinity;}],
 ];
 for(const [label,corrupt]of corruptions){const bad=structuredClone(good);corrupt(bad);const result=h.reader.adopt(bad);expect(result.status,label).toBe('resync');expect(a,label).toStrictEqual(before);}
 const b=h.adopt(good);expect(b.resources[0]!.growth).toBe(.35);expect(b.resources[1]!.growth).toBe(.45);expect(h.reader.adopt(good).status).toBe('stale');expect(a).toStrictEqual(before);
});

test('growth uses the latest slots after real membership/order changes and a late refusal publishes no journals',()=>{
 const h=harness(),a=h.adopt(h.packet()),aBefore=structuredClone(a);
 h.world.resources.reverse();h.world.resources.push({id:h.world.nextId++,kind:'berries',x:6,z:2,amount:10,growth:.2,growthTick:h.world.tick,growthThermalFactor:.75});h.world.tiles[6+2*h.world.width]={terrain:'soil'};
 const mixed=h.packet();expect(mixed.kind).toBe('delta');if(mixed.kind!=='delta')throw Error('Expected mixed delta');expect(mixed.resources!.upserted).not.toHaveLength(0);
 const b=h.adopt(mixed),bBefore=structuredClone(b);freezeResources(b);
 h.world.resources[0]!.growth=.61;h.world.resources[2]!.growth=.29;
 const good=growthOnly(h.packet());let refused:typeof b|undefined;
 const result=h.reader.adopt(structuredClone(good),world=>{refused=world;return false;});expect(result.status).toBe('resync');expect(refused).toBeDefined();
 expect(readSnapshotChanges(b,refused!)).toBeUndefined();expect(readSnapshotResourceStructure(b,refused!)).toBeUndefined();expect(readResidentResourceBaseChanges(b,refused!)).toBeUndefined();expect(b).toStrictEqual(bBefore);
 const c=h.adopt(good);expect(c.resources.map(r=>r.id)).toEqual(b.resources.map(r=>r.id));expect(c.resources[0]!.growth).toBe(.61);expect(c.resources[2]!.growth).toBe(.29);
 expect(c.resources[1]).toBe(b.resources[1]);expect(readSnapshotChanges(b,c)).toEqual({resourceIndices:[0,2],tileIndices:[]});
 expect(readSnapshotResourceStructure(b,c)!.edges[0]!.updated).toEqual([0,2].map(afterOrdinal=>({id:b.resources[afterOrdinal]!.id,afterOrdinal})));
 expect(readResidentResourceBaseChanges(b,c)!.edges[0]).toMatchObject({removed:[],added:[],updated:[]});expect(a).toStrictEqual(aBefore);expect(b).toStrictEqual(bBefore);
});
