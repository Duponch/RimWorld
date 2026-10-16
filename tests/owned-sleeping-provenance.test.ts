import {afterEach,expect,test,vi} from 'vitest';
import {createOwnedSleepingProvenanceOwner,validHumanSleepingSpotProvenance,validHumanSleepingSpotTransport} from '../src/sim/human-sleeping-spot-save.ts';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage,type SnapshotAdoption} from '../src/bridge/snapshots.ts';
import type {OwnedGeometryReuseWitness} from '../src/sim/owned-validation-geometry.ts';
import type {World} from '../src/sim/types.ts';
import {deconstructionCamp,fixtureBuilding} from './scenarios/deconstruction.ts';
import {sleepingSpotFrame,medicalSpotFrame} from './helpers/human-sleeping-spot-persistence.ts';

afterEach(()=>vi.restoreAllMocks());
function fixture(){const w=deconstructionCamp(0,16);fixtureBuilding(w,'wall',4,4);return w;}
const edge=(previous:World,updatedOrdinals:number[]=[]):OwnedGeometryReuseWitness=>({kind:'sparse',previous,updatedOrdinals});
const retained=(w:World):World=>({...w});

/** Same private lifecycle as MAIN; public Decoder remains the oracle. */
class NativeSleepingDecoder extends SnapshotDecoder {
  readonly #owner=createOwnedSleepingProvenanceOwner();
  protected override validateHumanSleepingSpotTransport(next:World,reuse?:OwnedGeometryReuseWitness):boolean {
    return this.#owner.validate(next,reuse);
  }
  override adopt(packet:SnapshotMessage<true>):SnapshotAdoption {
    this.#owner.discard();
    try{const result=super.adopt(packet);if(result.status==='applied')this.#owner.commit(result.world);else this.#owner.discard();return result;}
    catch(error){this.#owner.discard();throw error;}
  }
}
function harness(){
  const world=fixture(),encoder=new SnapshotEncoder({structureDelta:true}),native=new NativeSleepingDecoder(),raw=new SnapshotDecoder();
  const packet=(full=false)=>structuredClone(encoder.encode(world,0,0,full));
  const adopt=(p:SnapshotMessage<true>)=>{
    const saved=structuredClone(p),actual=native.adopt(structuredClone(p));
    expect(actual).toEqual(raw.adopt(structuredClone(p)));expect(p).toEqual(saved);return actual;
  };
  const applied=(p:SnapshotMessage<true>)=>{const result=adopt(p);expect(result.status).toBe('applied');if(result.status!=='applied')throw Error(JSON.stringify(result));return result.world;};
  return {world,packet,adopt,applied,native,raw};
}

test('only the exact confirmed empty sparse edge skips placed provenance, including at the same tick',()=>{
  const w=fixture(),owner=createOwnedSleepingProvenanceOwner(),building=w.structures[0]!,original=Reflect.ownKeys;
  let visits=0;vi.spyOn(Reflect,'ownKeys').mockImplementation(value=>{if(value===building)visits++;return original(value);});
  expect(owner.validate(w)).toBe(true);expect(visits).toBe(1);owner.commit(w);
  const saved=structuredClone(w),next=retained(w);visits=0;
  expect(owner.validate(next,edge(w))).toBe(true);expect(visits).toBe(0);owner.commit(next);
  expect(next.tick).toBe(w.tick);expect(w).toEqual(saved);
  visits=0;expect(owner.validate(retained(next),edge(next,[0]))).toBe(true);expect(visits).toBe(1);
});

test('missing witnesses, changed bounds/identity, copied arrays and mismatched commits walk structures again',()=>{
  const w=fixture(),building=w.structures[0]!,original=Reflect.ownKeys,owner=createOwnedSleepingProvenanceOwner();
  let visits=0;vi.spyOn(Reflect,'ownKeys').mockImplementation(value=>{if(value===building)visits++;return original(value);});
  expect(owner.validate(w)).toBe(true);owner.commit(w);
  for(const mode of ['absent','parent','copy','width','height','nextId','seed','schema','upsert'] as const){
    const next=retained(w);let reuse:OwnedGeometryReuseWitness|undefined=edge(w);
    if(mode==='absent')reuse=undefined;if(mode==='parent')reuse=edge(structuredClone(w));
    if(mode==='copy')next.structures=[...w.structures];if(mode==='width')next.width++;
    if(mode==='height')next.height++;if(mode==='nextId')next.nextId++;if(mode==='seed')next.seed++;
    if(mode==='schema')Object.assign(next,{schemaVersion:231});if(mode==='upsert')reuse=edge(w,[0]);
    visits=0;expect(owner.validate(next,reuse)).toBe(true);expect(visits,mode).toBe(1);owner.discard();
  }
  expect(owner.validate(retained(w),edge(w))).toBe(true);owner.commit(fixture());
  visits=0;expect(owner.validate(retained(w),edge(w))).toBe(true);expect(visits).toBe(1);
});

test('reuse never skips current tasks, carried/packed goods or archives, including getters and symbols',()=>{
  const w=fixture(),owner=createOwnedSleepingProvenanceOwner();expect(owner.validate(w)).toBe(true);owner.commit(w);
  for(const mutate of [
    (n:World)=>{n.jobs=[{kind:'wall',furniture:{kind:'sleeping-spot'}}] as never;},
    (n:World)=>{n.piles=[{item:'sleeping-spot'}] as never;},
    (n:World)=>{n.packed=[{building:{kind:'sleeping-spot'}}] as never;},
    (n:World)=>{n.groupLosses=[{items:[{item:'sleeping-spot'}]}] as never;},
    (n:World)=>{n.visitors={departed:[{packed:[{building:{kind:'sleeping-spot'}}]}]} as never;},
    (n:World)=>{const job={kind:'wall'};Object.defineProperty(job,'furniture',{enumerable:true,get(){throw Error('must not read');}});n.jobs=[job] as never;},
    (n:World)=>{const job={kind:'wall'};Object.defineProperty(job,Symbol('hidden'),{value:true});n.jobs=[job] as never;},
  ]){
    const next=retained(w);mutate(next);expect(owner.validate(next,edge(w))).toBe(false);
    expect(validHumanSleepingSpotTransport(next)).toBe(false);owner.discard();
  }
});

test('same structures never cache terrain, resources, sleeping occupancy or medical contact',()=>{
  for(const mode of ['terrain','resource','sleep','medical'] as const){
    const f=mode==='medical'?medicalSpotFrame():sleepingSpotFrame(),owner=createOwnedSleepingProvenanceOwner();
    expect(owner.validate(f.w)).toBe(true);owner.commit(f.w);
    const next=structuredClone(f.w);next.structures=f.w.structures;
    if(mode==='terrain')next.tiles[f.spot.z*next.width+f.spot.x]={terrain:'water'};
    if(mode==='resource')next.resources.push({id:next.nextId-1,kind:'tree',x:f.spot.x,z:f.spot.z,amount:1} as never);
    if(mode==='sleep'||mode==='medical')next.pawns.find(p=>p.id===f.p.id)!.x++;
    expect(owner.validate(next,edge(f.w)),mode).toBe(false);
    expect(validHumanSleepingSpotTransport(next)).toBe(false);
  }
});

test('RAW and historical provenance remain descriptor strict and ignore extra certificate arguments',()=>{
  for(const change of [
    (s:Record<string,unknown>)=>{s.furniture={kind:'sleeping-spot'};},
    (s:Record<string,unknown>)=>{Object.defineProperty(s,'furniture',{enumerable:true,get(){throw Error('no getter reads');}});},
    (s:Record<string,unknown>)=>{Object.defineProperty(s,Symbol('extra'),{value:true});},
  ]){
    const w=fixture();change(w.structures[0] as unknown as Record<string,unknown>);
    expect(Reflect.apply(validHumanSleepingSpotProvenance,undefined,[w,252,()=>true])).toBe(false);
    expect(Reflect.apply(validHumanSleepingSpotTransport,undefined,[w,252,()=>true])).toBe(false);
    expect(validHumanSleepingSpotProvenance({...w,schemaVersion:231},231)).toBe(false);
  }
  const source=fixture(),encoder=new SnapshotEncoder({structureDelta:true}),raw=new SnapshotDecoder();
  const accepted=raw.adopt(structuredClone(encoder.encode(source,0,0)));
  if(accepted.status!=='applied')throw Error(JSON.stringify(accepted));
  Object.defineProperty(accepted.world.structures[0]!,'furniture',{value:{kind:'sleeping-spot'},enumerable:true});
  // The ordinary public consumer admits writers; its retained array must be reread.
  expect(raw.adopt(structuredClone(encoder.encode(source,0,0)))).toEqual({status:'resync',reason:'Couchage au sol humain, propriétaire, rôle ou réservation physique invalide ou futur.'});
});

test('Decoder refuses same-tick upserts and late failures without advancing facts, then recovers the original revision',()=>{
  const h=harness(),first=h.applied(h.packet()),saved=structuredClone(first),good=h.packet();
  if(good.kind!=='delta'||!good.structures)throw Error('Expected separate structural transport');
  const bad=structuredClone(good);bad.structures!.upserted=[{...h.world.structures[0]!,furniture:{kind:'sleeping-spot'}} as never];
  expect(bad.world.tick).toBe(first.tick);
  expect(h.adopt(bad)).toEqual({status:'resync',reason:'Couchage au sol humain, propriétaire, rôle ou réservation physique invalide ou futur.'});
  const late=structuredClone(good);late.world.relationships={links:[],unexpected:true} as never;
  expect(h.adopt(late)).toEqual({status:'resync',reason:'Liens, annonce ou souvenirs relationnels incohérents.'});
  expect(first).toEqual(saved);h.applied(good);expect(h.adopt(good)).toEqual({status:'stale'});
  const missed=h.packet(),ahead=h.packet();expect(h.adopt(ahead)).toEqual({status:'resync',reason:'Snapshot intermédiaire manquant.'});
  h.applied(missed);h.applied(ahead);h.applied(h.packet(true));
  const thrown=h.packet(),recovery=structuredClone(thrown);Object.defineProperty(thrown,'world',{get(){throw Error('packet getter');}});
  expect(()=>h.native.adopt(thrown)).toThrow('packet getter');h.applied(recovery);
});
