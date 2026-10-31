import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler';
import {readSnapshotChanges,readSnapshotResourceStructure} from '../src/bridge/snapshot-changes';
import {readResidentResourceBaseChanges} from '../src/bridge/resident-resource-base-journal';
import {fixture} from './resident-presentation-fixtures-v427';

type Delta=Extract<SnapshotMessage<true>,{kind:'delta'}>;
function harness(){
 const world=fixture();for(const x of [6,7]){world.resources.push({id:world.nextId++,kind:'berries',x,z:2,amount:10,growth:.25,growthTick:world.tick,growthThermalFactor:.75});world.tiles[x+2*world.width]={terrain:'soil'};}
 for(const r of world.resources)r.growthThermalFactor=.75;
 const encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),reader=new ResidentPresentationAssembler(),literal=new SnapshotDecoder();
 const packet=()=>structuredClone(encoder.encode(world,0,1));
 const adopt=(p:SnapshotMessage<true>)=>{const expected=literal.adopt(structuredClone(p)),actual=reader.adopt(p);expect(expected.status).toBe('applied');expect(actual.status,actual.status==='resync'?actual.reason:undefined).toBe('applied');if(actual.status!=='applied'||expected.status!=='applied')throw Error('Real representation transaction refused');expect(actual.world).toStrictEqual(expected.world);expect(JSON.stringify(actual.world)).toBe(JSON.stringify(expected.world));return actual.world;};
 return {world,reader,packet,adopt};
}
function delta(p:SnapshotMessage<true>):Delta {expect(p.kind).toBe('delta');if(p.kind!=='delta')throw Error('Expected delta');return p;}
function freeze(world:ReturnType<ReturnType<typeof harness>['adopt']>){for(const r of world.resources)Object.freeze(r);Object.freeze(world.resources);}

test('existing-ID upsert plus disjoint growth preserves exact rows, ordering and distinct FULL/BASE meanings',()=>{
 const h=harness(),a=h.adopt(h.packet()),before=structuredClone(a);freeze(a);
 h.world.resources[0]!.amount++;h.world.resources[1]!.growth=.3123456789012345;delete h.world.resources[1]!.growthThermalFactor;
 h.world.resources[2]!.growth=.4123456789012345;h.world.resources[2]!.growthThermalFactor=-0;
 const p=delta(h.packet());expect(p.resources!.removed).toEqual([]);expect(p.resources!.upserted).toHaveLength(1);expect(Object.hasOwn(p.resources!,'order')).toBe(false);
 const rows=p.resources!.growth!;expect(rows).toHaveLength(8);p.resources!.growth=new Float64Array([...rows.subarray(4),...rows.subarray(0,4)]);
 const b=h.adopt(p);expect(b.resources[0]).toBe(p.resources!.upserted[0]);expect(b.resources[3]).toBe(a.resources[3]);expect(a).toStrictEqual(before);
 expect(Object.hasOwn(b.resources[1]!,'growthThermalFactor')).toBe(false);expect(Object.is(b.resources[2]!.growthThermalFactor,-0)).toBe(true);
 expect(readSnapshotChanges(a,b)).toEqual({resourceIndices:[0,1,2],tileIndices:[]});
 expect(readSnapshotResourceStructure(a,b)!.edges[0]).toMatchObject({removed:[],added:[],updated:[0,1,2].map(afterOrdinal=>({id:a.resources[afterOrdinal]!.id,afterOrdinal}))});
 expect(readResidentResourceBaseChanges(a,b)!.edges[0]).toMatchObject({removed:[],added:[],updated:[{id:a.resources[0]!.id,afterOrdinal:0}]});
});

test('upsert/growth overlap, late tuple corruption and late transaction refusal do not publish or consume a predecessor',()=>{
 const h=harness(),a=h.adopt(h.packet()),before=structuredClone(a);freeze(a);
 h.world.resources[0]!.amount++;h.world.resources[1]!.growth=.55;h.world.resources[2]!.growth=.65;
 const good=delta(h.packet()),rows=good.resources!.growth!;expect(rows).toHaveLength(8);
 const overlap=structuredClone(good);overlap.resources!.growth=new Float64Array([...rows,h.world.resources[0]!.id,.4,h.world.tick,.75]);
 expect(h.reader.adopt(overlap).status).toBe('resync');expect(a).toStrictEqual(before);
 const late=structuredClone(good);late.resources!.growth![7]=Infinity;expect(h.reader.adopt(late).status).toBe('resync');expect(a).toStrictEqual(before);
 let rejected:typeof a|undefined;expect(h.reader.adopt(structuredClone(good),w=>{rejected=w;return false;}).status).toBe('resync');expect(rejected).toBeDefined();
 expect(readSnapshotChanges(a,rejected!)).toBeUndefined();expect(readSnapshotResourceStructure(a,rejected!)).toBeUndefined();expect(readResidentResourceBaseChanges(a,rejected!)).toBeUndefined();
 const b=h.adopt(good);expect(b.resources[0]!.amount).toBe(a.resources[0]!.amount+1);expect(h.reader.adopt(good).status).toBe('stale');expect(a).toStrictEqual(before);
});

test('implicit new-ID append and real removal/order changes keep generic semantics before the next sparse mixed update',()=>{
 const h=harness(),a=h.adopt(h.packet()),before=structuredClone(a),newId=h.world.nextId++;
 h.world.resources.push({id:newId,kind:'berries',x:8,z:2,amount:10,growth:.2,growthTick:h.world.tick,growthThermalFactor:.75});h.world.tiles[8+2*h.world.width]={terrain:'soil'};h.world.resources[1]!.growth=.45;
 const append=delta(h.packet());expect(append.resources!.upserted.some(r=>r.id===newId)).toBe(true);expect(append.resources!.removed).toEqual([]);
 // The wire supports implicit append; witness reader must agree without order.
 delete append.resources!.order;const b=h.adopt(append);expect(b.resources.at(-1)!.id).toBe(newId);
 h.world.resources.splice(1,1);h.world.resources.reverse();const reorder=delta(h.packet());expect(reorder.resources!.removed).toHaveLength(1);expect(Object.hasOwn(reorder.resources!,'order')).toBe(true);
 const c=h.adopt(reorder),cBefore=structuredClone(c);freeze(c);h.world.resources[0]!.amount++;h.world.resources[1]!.growth=.71;
 const d=h.adopt(h.packet());expect(d.resources.map(r=>r.id)).toEqual(c.resources.map(r=>r.id));expect(readSnapshotChanges(c,d)).toEqual({resourceIndices:[0,1],tileIndices:[]});
 expect(readSnapshotResourceStructure(c,d)!.edges[0]!.updated).toEqual([0,1].map(afterOrdinal=>({id:c.resources[afterOrdinal]!.id,afterOrdinal})));
 expect(readResidentResourceBaseChanges(c,d)!.edges[0]!.updated).toEqual([{id:c.resources[0]!.id,afterOrdinal:0}]);expect(a).toStrictEqual(before);expect(c).toStrictEqual(cBefore);
});
