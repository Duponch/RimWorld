import {afterEach,expect,test,vi} from 'vitest';
import {createOwnedDeteriorationOwner,validDeteriorationHistoricalTransport,validDeteriorationTransport,type OwnedDeteriorationOwner} from '../src/sim/deterioration-save.ts';
import {createDeteriorationState} from '../src/sim/deterioration-content.ts';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotAdoption,type SnapshotMessage} from '../src/bridge/snapshots.ts';
import type {OwnedGeometryReuseWitness} from '../src/sim/owned-validation-geometry.ts';
import type {World} from '../src/sim/types.ts';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';

afterEach(()=>vi.restoreAllMocks());
function fixture():World {
 const w=deconstructionCamp(0,16);
 for(const x of [4,5,6])fixtureBuilding(w,'wall',x,4);
 w.deterioration=createDeteriorationState(w.seed,w.tick);return w;
}
const reuse=(previous:World,updatedOrdinals:readonly number[]=[]):OwnedGeometryReuseWitness=>({kind:'sparse',previous,updatedOrdinals});
const retained=(w:World):World=>({...w,deterioration:{...w.deterioration!}});
function replaced(w:World):World {
 const next=retained(w);next.structures=[...w.structures];
 next.structures[1]={...w.structures[1]!,damage:1};return next;
}
function observe(owner:OwnedDeteriorationOwner,w:World,witness?:OwnedGeometryReuseWitness){
 const original=Reflect.ownKeys,visits=new Map<object,number>();
 // A transparent test observer, scoped to this owner call. No writer/getter
 // is introduced into a product World; this is not a performance measurement.
 const spy=vi.spyOn(Reflect,'ownKeys').mockImplementation(value=>{
  visits.set(value,(visits.get(value)??0)+1);return original(value);
 });
 try{return {valid:owner.validate(w,witness),walks:w.structures.map(s=>visits.get(s)??0)};}
 finally{spy.mockRestore();}
}

/** Exercises the literal closed MAIN discard/validate/commit lifecycle only.
 * Arbitrary caller-authored witnesses do not acquire producer authority. */
class NativeClockDecoder extends SnapshotDecoder {
 readonly #owner=createOwnedDeteriorationOwner();
 readonly frontiers:{world:World;previous:World|undefined;updated:readonly number[]|undefined;walks:number[]}[]=[];
 throwAfterValidation=false;
 protected override validateDeteriorationTransport(next:World,witness?:OwnedGeometryReuseWitness):boolean {
  const result=observe(this.#owner,next,witness);
  this.frontiers.push({world:next,previous:witness?.previous,updated:witness?[...witness.updatedOrdinals]:undefined,walks:result.walks});
  if(this.throwAfterValidation)throw Error('after deterioration validation');return result.valid;
 }
 override adopt(packet:SnapshotMessage<true>):SnapshotAdoption {
  this.#owner.discard();
  try{
   const result=super.adopt(packet);
   if(result.status==='applied')this.#owner.commit(result.world);else this.#owner.discard();return result;
  }catch(error){this.#owner.discard();throw error;}
 }
}
class PublicClockProbe extends SnapshotDecoder {
 check(w:World,witness:OwnedGeometryReuseWitness):boolean{return super.validateDeteriorationTransport(w,witness);}
}
function harness(){
 const world=fixture(),encoder=new SnapshotEncoder({structureDelta:true}),native=new NativeClockDecoder(),raw=new SnapshotDecoder();
 const packet=(checkpoint=false)=>structuredClone(encoder.encode(world,0,0,checkpoint));
 const adopt=(p:SnapshotMessage<true>)=>{
  const before=structuredClone(p),actual=native.adopt(structuredClone(p)),oracle=raw.adopt(structuredClone(p));
  expect(actual).toEqual(oracle);expect(p).toStrictEqual(before);return actual;
 };
 const applied=(p:SnapshotMessage<true>)=>{
  const result=adopt(p);expect(result.status).toBe('applied');
  if(result.status!=='applied')throw Error(JSON.stringify(result));return result.world;
 };
 return {world,native,raw,packet,adopt,applied};
}
const last=(h:ReturnType<typeof harness>)=>h.native.frontiers.at(-1)!;
const forbidden=(s:Record<string,unknown>)=>{s.nested={deterioration:undefined};};

test('real same-tick sparse upsert walks its whole replacement only, matches RAW and confirms the next empty edge',()=>{
 const h=harness(),first=h.applied(h.packet()),before=structuredClone(first);
 expect(last(h).walks).toEqual([1,1,1]);
 h.world.structures[1]!.damage=1;
 const packet=h.packet();expect(packet.kind).toBe('delta');expect(packet.world.tick).toBe(first.tick);
 const next=h.applied(packet);
 expect(last(h).updated).toEqual([1]);expect(last(h).previous).toBe(first);expect(last(h).walks).toEqual([0,1,0]);
 expect(next.structures).not.toBe(first.structures);
 expect(next.structures[0]).toBe(first.structures[0]);expect(next.structures[2]).toBe(first.structures[2]);
 expect(next.structures[1]).not.toBe(first.structures[1]);expect(next.structures[1]!.damage).toBe(1);
 expect(first).toEqual(before);
 const empty=h.applied(h.packet());expect(empty.structures).toBe(next.structures);
 expect(last(h).updated).toEqual([]);expect(last(h).walks).toEqual([0,0,0]);
});

test('changed records reject deep undefined/inherited clocks, getters, symbols and cycles without a favorable fallback',()=>{
 let getterCalls=0;
 const changes=[
  forbidden,
  (s:Record<string,unknown>)=>{s.nested=Object.create({deterioration:undefined});},
  (s:Record<string,unknown>)=>{s.nested={};Object.defineProperty(s.nested,'deep',{enumerable:true,get(){getterCalls++;return {};}});},
  (s:Record<string,unknown>)=>{s.nested={};Object.defineProperty(s.nested,Symbol('invalid'),{value:true});},
  (s:Record<string,unknown>)=>{s.nested={};(s.nested as Record<string,unknown>).cycle=s.nested;},
 ];
 for(const alter of changes){
  const w=fixture(),saved=structuredClone(w),owner=createOwnedDeteriorationOwner();expect(owner.validate(w)).toBe(true);owner.commit(w);
  const next=replaced(w);alter(next.structures[1] as unknown as Record<string,unknown>);
  expect(observe(owner,next,reuse(w,[1]))).toEqual({valid:false,walks:[0,1,0]});
  expect(validDeteriorationTransport(next,next.schemaVersion)).toBe(false);expect(w).toEqual(saved);owner.discard();
  expect(observe(owner,retained(w),reuse(w))).toEqual({valid:true,walks:[0,0,0]});
 }
 expect(getterCalls).toBe(0);
 const h=harness(),first=h.applied(h.packet()),before=structuredClone(first);
 h.world.structures[1]!.damage=1;const good=h.packet();
 if(good.kind!=='delta'||!good.structures)throw Error('sparse delta required');
 const bad=structuredClone(good);forbidden(bad.structures!.upserted[0] as unknown as Record<string,unknown>);
 expect(h.adopt(bad)).toEqual({status:'resync',reason:'Horloge ou propriétaire de détérioration invalide.'});
 expect(last(h).walks).toEqual([0,1,0]);expect(first).toEqual(before);
 expect(h.applied(good).structures[1]!.damage).toBe(1);
});

test('unsupported headers, lists, IDs and array identities use the full walker; a mismatched commit publishes no fact',()=>{
 const w=fixture(),owner=createOwnedDeteriorationOwner();expect(owner.validate(w)).toBe(true);owner.commit(w);
 const full=(next:World,witness?:OwnedGeometryReuseWitness)=>{
  const result=observe(owner,next,witness);expect(result.valid).toBe(true);expect(result.walks).toEqual([1,1,1]);owner.discard();
 };
 full(replaced(w));full(replaced(w),reuse(structuredClone(w),[1]));
 for(const field of ['schemaVersion','seed','width','height'] as const){const next=replaced(w);next[field]++;full(next,reuse(w,[1]));}
 const copied=retained(w);copied.structures=[...w.structures];full(copied,reuse(w));
 full(retained(w),reuse(w,[1]));
 const wrongId=replaced(w);wrongId.structures[1]!.id=w.nextId;full(wrongId,reuse(w,[1]));
 const short=replaced(w);short.structures.pop();
 expect(observe(owner,short,reuse(w,[1]))).toEqual({valid:true,walks:[1,1]});owner.discard();
 const hole:number[]=[];hole.length=1;
 const inherited=Object.create([1]) as number[];
 const symbol=[1];Object.defineProperty(symbol,Symbol('extra'),{value:0});
 let getterCalls=0;const getter:number[]=[];Object.defineProperty(getter,'0',{enumerable:true,get(){getterCalls++;return 1;}});
 for(const indices of [[-1],[0.5],[3],[1,1],hole,inherited,symbol,getter,{}])full(replaced(w),reuse(w,indices as number[]));
 expect(getterCalls).toBe(0);
 const nonSparse={...reuse(w,[1]),kind:'full'} as unknown as OwnedGeometryReuseWitness;full(replaced(w),nonSparse);
 const next=replaced(w);expect(owner.validate(next,reuse(w,[1]))).toBe(true);owner.commit(retained(next));
 full(retained(w),reuse(w));
});

test('real additions, removals, reorders, explicit identical order and checkpoints preserve full boundaries',()=>{
 const h=harness();h.applied(h.packet());
 const assertFull=(p:SnapshotMessage<true>)=>{
  h.applied(p);expect(last(h).updated).toBeUndefined();expect(last(h).walks).toEqual(h.world.structures.map(()=>1));
 };
 const sameOrder=h.packet();if(sameOrder.kind!=='delta'||!sameOrder.structures)throw Error('sparse delta required');
 sameOrder.structures.order=h.world.structures.map(s=>s.id);assertFull(sameOrder);
 h.world.structures.reverse();assertFull(h.packet());
 fixtureBuilding(h.world,'wall',7,4);assertFull(h.packet());
 h.world.structures.pop();assertFull(h.packet());
 assertFull(h.packet(true));
});

test('late refusal, validated exception, stale and revision gap recover from the last committed sparse predecessor',()=>{
 const h=harness(),first=h.applied(h.packet()),before=structuredClone(first);
 h.world.structures[1]!.damage=1;const good=h.packet(),late=structuredClone(good);
 late.world.relationships={links:[],unexpected:true} as never;
 expect(h.adopt(late)).toEqual({status:'resync',reason:'Liens, annonce ou souvenirs relationnels incohérents.'});
 expect(last(h).walks).toEqual([0,1,0]);expect(first).toEqual(before);
 h.native.throwAfterValidation=true;
 expect(()=>h.native.adopt(structuredClone(good))).toThrow('after deterioration validation');
 h.native.throwAfterValidation=false;expect(last(h).previous).toBe(first);
 const next=h.applied(good);expect(last(h).previous).toBe(first);expect(last(h).walks).toEqual([0,1,0]);
 const count=h.native.frontiers.length;expect(h.adopt(good)).toEqual({status:'stale'});expect(h.native.frontiers).toHaveLength(count);
 h.world.structures[1]!.damage=2;const missed=h.packet(),ahead=h.packet();
 expect(h.adopt(ahead)).toEqual({status:'resync',reason:'Snapshot intermédiaire manquant.'});expect(h.native.frontiers).toHaveLength(count);
 h.applied(missed);expect(last(h).previous).toBe(next);expect(last(h).walks).toEqual([0,1,0]);
 h.applied(ahead);expect(last(h).walks).toEqual([0,0,0]);expect(first).toEqual(before);
});

test('RAW, public Decoder, historical and full boundaries retain their strict mutable-owner contract',()=>{
 const w=fixture(),bad=replaced(w);forbidden(bad.structures[1] as unknown as Record<string,unknown>);
 expect(Reflect.apply(validDeteriorationTransport,undefined,[bad,bad.schemaVersion,()=>true])).toBe(false);
 expect(new PublicClockProbe().check(bad,reuse(w,[1]))).toBe(false);
 const historical={...bad,schemaVersion:251} as unknown as Record<string,unknown>;delete historical.deterioration;
 expect(validDeteriorationHistoricalTransport(historical,251)).toBe(false);
 const h=harness();h.applied(h.packet());const checkpoint=h.packet(true);
 if(checkpoint.kind!=='checkpoint')throw Error('checkpoint required');
 forbidden(checkpoint.world.structures[1] as unknown as Record<string,unknown>);
 expect(h.adopt(checkpoint)).toEqual({status:'resync',reason:'Horloge ou propriétaire de détérioration invalide.'});
 expect(last(h).updated).toBeUndefined();
 const source=fixture(),encoder=new SnapshotEncoder({structureDelta:true}),raw=new SnapshotDecoder();
 const first=raw.adopt(structuredClone(encoder.encode(source,0,0)));if(first.status!=='applied')throw Error(JSON.stringify(first));
 forbidden(first.world.structures[0] as unknown as Record<string,unknown>);
 expect(raw.adopt(structuredClone(encoder.encode(source,0,0)))).toEqual({status:'resync',reason:'Horloge ou propriétaire de détérioration invalide.'});
});

test('a confirmed replacement cannot conceal bad local clocks or another physical/archive domain at the same tick',()=>{
 const w=fixture(),owner=createOwnedDeteriorationOwner();expect(owner.validate(w)).toBe(true);owner.commit(w);
 const accepted=replaced(w);expect(owner.validate(accepted,reuse(w,[1]))).toBe(true);owner.commit(accepted);
 for(const mutate of [
  (n:World)=>{n.deterioration!.rng=0;},
  (n:World)=>{n.deterioration!.lastTick=n.tick-25;},
  (n:World)=>{n.pawns=[{nested:{deterioration:undefined}}] as never;},
  (n:World)=>{n.piles=[{nested:{deterioration:undefined}}] as never;},
  (n:World)=>{n.groupLosses=[{pawn:{deterioration:undefined}}] as never;},
  (n:World)=>{n.visitors={departed:[{pawn:{deterioration:undefined}}]} as never;},
 ]){
  const next=replaced(accepted);mutate(next);
  expect(owner.validate(next,reuse(accepted,[1]))).toBe(false);
  expect(validDeteriorationTransport(next,next.schemaVersion)).toBe(false);owner.discard();
 }
 expect(observe(owner,retained(accepted),reuse(accepted))).toEqual({valid:true,walks:[0,0,0]});
});
