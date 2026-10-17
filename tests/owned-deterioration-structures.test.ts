import {legacyCampaignMap} from './helpers/legacy-fixture-guards.ts';
import {afterEach,expect,test,vi} from 'vitest';
import {createOwnedDeteriorationOwner,validDeteriorationHistoricalTransport,validDeteriorationTransport} from '../src/sim/deterioration-save.ts';
import {createDeteriorationState} from '../src/sim/deterioration-content.ts';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage,type SnapshotAdoption} from '../src/bridge/snapshots.ts';
import type {OwnedGeometryReuseWitness} from '../src/sim/owned-validation-geometry.ts';
import {campaignPresentation} from '../src/sim/secondary-site-presentation.ts';
import {flushSecondaryContext} from '../src/sim/secondary-site-context.ts';
import type {World} from '../src/sim/types.ts';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import {preparedCassandraExpedition} from './scenarios/secondary-incidents-v379.ts';

afterEach(()=>vi.restoreAllMocks());
function fixture(){
 const w=deconstructionCamp(0,16);
 fixtureBuilding(w,'wall',4,4);fixtureBuilding(w,'wall',5,4);
 w.deterioration=createDeteriorationState(w.seed,w.tick);return w;
}
const reuse=(previous:World,updatedOrdinals:number[]=[]):OwnedGeometryReuseWitness=>({kind:'sparse',previous,updatedOrdinals});
const sameStructures=(w:World):World=>({...w,deterioration:{...w.deterioration!}});
const foreignClock=(target:object)=>Object.defineProperty(target,'deterioration',{value:undefined,enumerable:true,configurable:true});

/** Mirrors the closed MAIN lifecycle, not a replacement public Decoder. */
class NativeClockDecoder extends SnapshotDecoder {
 readonly #owner=createOwnedDeteriorationOwner();
 readonly frontiers:{witness:boolean;updated:readonly number[]|undefined;sameArray:boolean}[]=[];
 protected override validateDeteriorationTransport(next:World,witness?:OwnedGeometryReuseWitness):boolean {
  this.frontiers.push({witness:!!witness,updated:witness?[...witness.updatedOrdinals]:undefined,sameArray:next.structures===witness?.previous.structures});
  return this.#owner.validate(next,witness);
 }
 override adopt(packet:SnapshotMessage<true>):SnapshotAdoption {
  this.#owner.discard();
  try{
   const result=super.adopt(packet);
   if(result.status==='applied')this.#owner.commit(result.world);else this.#owner.discard();
   return result;
  }catch(error){this.#owner.discard();throw error;}
 }
}
function harness(world=fixture()){
 const encoder=new SnapshotEncoder({structureDelta:true}),native=new NativeClockDecoder(),raw=new SnapshotDecoder();
 const packet=(checkpoint=false)=>structuredClone(encoder.encode(world,0,0,checkpoint));
 const adopt=(p:SnapshotMessage<true>)=>{
  const saved=structuredClone(p),actual=native.adopt(structuredClone(p)),oracle=raw.adopt(structuredClone(p));
  expect(actual).toEqual(oracle);expect(p).toStrictEqual(saved);return actual;
 };
 const applied=(p:SnapshotMessage<true>)=>{
  const result=adopt(p);expect(result.status).toBe('applied');
  if(result.status!=='applied')throw Error(JSON.stringify(result));return result.world;
 };
 return {world,encoder,native,raw,packet,adopt,applied};
}

test('only a real empty structural edge with the identical accepted array avoids the deep structure walk',()=>{
 const w=fixture(),owner=createOwnedDeteriorationOwner(),building=w.structures[0]!,ownKeys=Reflect.ownKeys;
 let visits=0;
 // Transparent read-only observation of this private fixture's walker; no
 // getter/writer is introduced into a product World or used as authority.
 vi.spyOn(Reflect,'ownKeys').mockImplementation(value=>{if(value===building)visits++;return ownKeys(value);});
 expect(owner.validate(w)).toBe(true);expect(visits).toBe(1);owner.commit(w);
 const saved=structuredClone(w),next=sameStructures(w);next.deterioration!.rng=w.deterioration!.rng===1?2:1;
 visits=0;expect(owner.validate(next,reuse(w))).toBe(true);expect(visits).toBe(0);owner.commit(next);
 expect(next.tick).toBe(w.tick);expect(w).toEqual(saved);
 // Exact identity is insufficient without the real private reconstruction edge.
 visits=0;expect(owner.validate(sameStructures(next))).toBe(true);expect(visits).toBe(1);owner.discard();
 // A supplied update also takes the original traversal, despite equal records.
 visits=0;expect(owner.validate(sameStructures(next),reuse(next,[0]))).toBe(true);expect(visits).toBe(1);
});

test('cached structures never hide a bad current clock or a clock in another physical/archive domain',()=>{
 const w=fixture(),owner=createOwnedDeteriorationOwner();expect(owner.validate(w)).toBe(true);owner.commit(w);
 for(const mutate of [
  (n:World)=>{n.deterioration!.rng=0;},
  (n:World)=>{n.deterioration!.lastTick=n.tick-25;},
  (n:World)=>{n.pawns=[{deterioration:undefined}] as never;},
  (n:World)=>{n.piles=[{deterioration:undefined}] as never;},
  (n:World)=>{n.groupLosses=[{pawn:{deterioration:undefined}}] as never;},
  (n:World)=>{n.visitors={departed:[{pawn:{deterioration:undefined}}]} as never;},
 ]){
  const next=sameStructures(w);mutate(next);
  expect(owner.validate(next,reuse(w))).toBe(false);expect(validDeteriorationTransport(next,252)).toBe(false);owner.discard();
 }
 expect(owner.validate(sameStructures(w),reuse(w))).toBe(true);
});

test('cloned arrays, absent/wrong predecessors, dimension/seed changes and mismatched commits cannot borrow a fact',()=>{
 const w=fixture(),owner=createOwnedDeteriorationOwner(),building=w.structures[0]!,ownKeys=Reflect.ownKeys;
 let visits=0;vi.spyOn(Reflect,'ownKeys').mockImplementation(value=>{if(value===building)visits++;return ownKeys(value);});
 expect(owner.validate(w)).toBe(true);owner.commit(w);
 for(const mode of ['copy','parent','width','height','seed'] as const){
  const next=sameStructures(w);let witness=reuse(w);
  if(mode==='copy')next.structures=[...w.structures];
  if(mode==='parent')witness=reuse(structuredClone(w));
  if(mode==='width')next.width++;
  if(mode==='height')next.height++;
  if(mode==='seed')next.seed++;
  visits=0;expect(owner.validate(next,witness)).toBe(true);expect(visits).toBe(1);owner.discard();
 }
 expect(owner.validate(sameStructures(w),reuse(w))).toBe(true);owner.commit(fixture());
 visits=0;expect(owner.validate(sameStructures(w),reuse(w))).toBe(true);expect(visits).toBe(1);
});

test('RAW/full/historical keep descriptor-safe rejection and cannot accept an extra certificate argument',()=>{
 for(const alter of [
  (s:Record<string,unknown>)=>{s.nested={deterioration:undefined};},
  (s:Record<string,unknown>)=>{s.nested=Object.create({deterioration:undefined});},
  (s:Record<string,unknown>)=>{Object.defineProperty(s,'nested',{get(){throw Error('not data');},enumerable:true});},
  (s:Record<string,unknown>)=>{Object.defineProperty(s,Symbol('forbidden'),{value:true});},
  (s:Record<string,unknown>)=>{s.nested=s;},
 ]){
  const w=fixture();alter(w.structures[0] as unknown as Record<string,unknown>);
  expect(Reflect.apply(validDeteriorationTransport,undefined,[w,252,()=>true])).toBe(false);
  const owner=createOwnedDeteriorationOwner();expect(owner.validate(w)).toBe(false);
  const old={...w,schemaVersion:251} as unknown as Record<string,unknown>;delete old.deterioration;
  expect(validDeteriorationHistoricalTransport(old,251)).toBe(false);
 }
 const w=fixture(),old={...w,schemaVersion:251} as unknown as Record<string,unknown>;delete old.deterioration;
 foreignClock(w.structures[0]!);
 expect(validDeteriorationHistoricalTransport(old,251)).toBe(false);
});

test('same-tick sparse upsert of a nested forbidden clock refuses exactly like RAW, then its original revision recovers',()=>{
 const h=harness(),first=h.applied(h.packet()),saved=structuredClone(first);
 const good=h.packet();expect(good.kind).toBe('delta');
 if(good.kind!=='delta'||!good.structures)throw Error('Sparse structural transport required.');
 const bad=structuredClone(good),changed={...h.world.structures[0]!,marker:{deterioration:undefined}};
 bad.structures!.upserted=[changed];expect(bad.world.tick).toBe(first.tick);
 expect(h.adopt(bad)).toEqual({status:'resync',reason:'Horloge ou propriétaire de détérioration invalide.'});
 expect(h.native.frontiers.at(-1)).toEqual({witness:true,updated:[0],sameArray:false});
 expect(first).toEqual(saved);
 const next=h.applied(good);expect(next.structures).toBe(first.structures);
 expect(h.native.frontiers.at(-1)).toEqual({witness:true,updated:[],sameArray:true});
});

test('late business refusal, stale, revision gap and thrown candidates never advance the confirmed clock fact',()=>{
 const h=harness(),first=h.applied(h.packet()),saved=structuredClone(first);
 h.world.structures[0]!.damage=1;
 const good=h.packet(),late=structuredClone(good);
 late.world.relationships={links:[],unexpected:true} as never;
 expect(h.adopt(late)).toEqual({status:'resync',reason:'Liens, annonce ou souvenirs relationnels incohérents.'});
 expect(first).toEqual(saved);
 const next=h.applied(good);expect(next.structures[0]!.damage).toBe(1);
 expect(h.adopt(good)).toEqual({status:'stale'});
 const missed=h.packet(),ahead=h.packet();
 expect(h.adopt(ahead)).toEqual({status:'resync',reason:'Snapshot intermédiaire manquant.'});
 h.applied(missed);h.applied(ahead);
 // An early exception uses the same MAIN catch/discard path.
 const thrown=h.packet(),recovery=structuredClone(thrown);
 Object.defineProperty(thrown,'world',{get(){throw Error('malformed packet');}});
 expect(()=>h.native.adopt(thrown)).toThrow('malformed packet');
 const recovered=h.applied(recovery);expect(recovered.structures[0]!.damage).toBe(1);
 expect(h.native.frontiers.at(-1)).toEqual({witness:true,updated:[],sameArray:true});
});

test('membership/order edits, checkpoints and genuine two-map projections remain full structural boundaries',()=>{
 const h=harness();h.applied(h.packet());
 h.world.structures.reverse();h.applied(h.packet());expect(h.native.frontiers.at(-1)!.witness).toBe(false);
 fixtureBuilding(h.world,'wall',6,4);h.applied(h.packet());expect(h.native.frontiers.at(-1)!.witness).toBe(false);
 h.world.structures.pop();h.applied(h.packet());expect(h.native.frontiers.at(-1)!.witness).toBe(false);
 h.applied(h.packet(true));expect(h.native.frontiers.at(-1)!.witness).toBe(false);

 // Existing named preparation executes genuine finite travel once; this test
 // checks only Decoder authority on home/secondary/home snapshots, not a new
 // native journey or an invented natural acquisition.
 const {w,local}=preparedCassandraExpedition();
 w.deterioration=createDeteriorationState(w.seed,w.tick);local.deterioration=createDeteriorationState(local.seed,w.tick);
 flushSecondaryContext(w);
 const encoder=new SnapshotEncoder({structureDelta:true}),native=new NativeClockDecoder(),raw=new SnapshotDecoder();
 const seen:World[]=[];
 for(const selected of [false,true,false]){
  w.secondarySite!.selected=selected;
  const source=campaignPresentation(w),packet=structuredClone(encoder.encode(source,0,0));
  expect(packet.kind).toBe('checkpoint');
  const accepted=native.adopt(structuredClone(packet)),oracle=raw.adopt(structuredClone(packet));
  expect(accepted).toEqual(oracle);expect(accepted.status).toBe('applied');
  expect(native.frontiers.at(-1)!.witness).toBe(false);
  if(accepted.status==='applied')seen.push(accepted.world);
 }
 expect(legacyCampaignMap(seen[0]!).active).toBe('home');expect(legacyCampaignMap(seen[1]!).active).toBe('secondary');expect(legacyCampaignMap(seen[2]!).active).toBe('home');
 expect(seen[0]).toEqual(seen[2]);expect(seen[0]!.structures).not.toBe(seen[2]!.structures);
});

test('an ordinary public Decoder still rereads a mutable retained predecessor on the next empty patch',()=>{
 const source=fixture(),encoder=new SnapshotEncoder({structureDelta:true}),raw=new SnapshotDecoder();
 const first=raw.adopt(structuredClone(encoder.encode(source,0,0)));
 if(first.status!=='applied')throw Error(JSON.stringify(first));
 // This writer is admitted only by the public mutable contract, never by MAIN.
 foreignClock(first.world.structures[0]!);
 const next=structuredClone(encoder.encode(source,0,0));
 expect(next.kind).toBe('delta');
 expect(raw.adopt(next)).toEqual({status:'resync',reason:'Horloge ou propriétaire de détérioration invalide.'});
 expect(Object.hasOwn(first.world.structures[0]!,'deterioration')).toBe(true);
});
