import {expect,test} from 'vitest';
import {createOwnedValidationResources} from '../src/sim/owned-validation-resources.ts';
import {captureOwnedStrictNamespace,type ValidationNamespaceWriter} from '../src/sim/owned-strict-namespace.ts';
import {NumericMembership} from '../src/sim/numeric-membership.ts';
import type {Resource,World} from '../src/sim/types.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';

// Private stable-data contract only. This fixture does not confer ownership
// on public Worlds, getters/Proxy or on exported query constructors.
const relational='Identité dupliquée ou invalide dans le registre relationnel.';
const corpse='Identité de carcasse mécanique dupliquée.';
const resource=(id:number):Resource=>({id,kind:'rock',x:2,z:2,amount:1});
function world():World {
  const w=deconstructionCamp(0,16);
  w.pawns=[];w.structures=[];w.jobs=[];w.resources=[];w.piles=[];w.stockpiles=[];w.growingZones=[];w.packed=[];
  delete w.wildlife;delete w.filth;delete w.fires;w.nextId=1000;return w;
}
const owner=(id:number)=>({id});
const result=(read:()=>unknown):unknown=>{try{return read();}catch(e){return `${(e as Error).name}: ${(e as Error).message}`;}};
type Registry={ok:true;ids:ValidationNamespaceWriter}|{ok:false;reason:string};
// Frozen owner loop from SnapshotDecoder. Its entire array is constructed
// before first owner.id; it is independent of the candidate's segmented loop.
function literal(w:World,mechanicalCorpseIds:ReadonlySet<number>=new Set(),strictIds=true):Registry {
  const owners=[...w.pawns,...w.structures,...w.jobs,...w.resources,...w.piles,...w.stockpiles,...w.growingZones,
    ...(w.wildlife?.animals??[]),...(w.filth?.items??[]),...(w.fires?.items??[]),...(w.fires?.embers??[]),
    ...w.packed.map(p=>p.building),...w.structures.flatMap(s=>s.bills??[]),...w.packed.flatMap(p=>p.building.bills??[])];
  const ids=new NumericMembership();
  for(const item of owners){
    if(strictIds&&(!Number.isSafeInteger(item.id)||item.id<1||item.id>=w.nextId||ids.has(item.id)))return {ok:false,reason:relational};
    if(mechanicalCorpseIds.has(item.id)&&ids.has(item.id))return {ok:false,reason:corpse};
    ids.add(item.id);
  }
  return {ok:true,ids};
}
function compare(w:World,corpses:ReadonlySet<number>=new Set()) {
  const facts=createOwnedValidationResources(w),actual=captureOwnedStrictNamespace(w,facts,corpses),expected=literal(w,corpses);
  expect(actual).toBeDefined();expect(actual?.ok).toBe(expected.ok);
  if(actual?.ok&&expected.ok){for(const id of [0,-0,1,2,3,4,5,65535,65536,999999,NaN,Infinity])expect(actual.ids.has(id)).toBe(expected.ids.has(id));}
  else expect(actual).toEqual(expected);
  return actual;
}

test('one capture exposes strict summary without lending it to another World',()=>{
  const w=world();w.resources=[resource(2),resource(65536),resource(999999)];w.nextId=1000000;
  const facts=createOwnedValidationResources(w),summary=facts.namespace(w);
  expect(summary).toMatchObject({safe:true,unique:true,maxId:999999});
  expect(facts.namespace(w)).toBe(summary);expect(facts.ids(w)?.has(65536)).toBe(true);
  expect(summary?.has(999999)).toBe(true);expect(summary?.has(3)).toBe(false);
  const other=structuredClone(w);expect(facts.namespace(other)).toBeUndefined();
  expect(captureOwnedStrictNamespace(other,facts,new Set())).toBeUndefined();compare(w);
});

test('summary does not bless duplicates, SameValueZero or invalid numeric IDs',()=>{
  for(const ids of [[3,3],[-0,0],[NaN,NaN],[Infinity],[-1],[.5],[Number.MAX_SAFE_INTEGER+1]]){
    const w=world();w.resources=ids.map(resource);const summary=createOwnedValidationResources(w).namespace(w);
    expect(summary).toBeDefined();expect(summary?.safe).toBe(ids.every(id=>Number.isSafeInteger(id)&&id>=1));
    expect(summary?.unique).toBe(new Set(ids).size===ids.length);
    for(const id of ids)expect(summary?.has(id)).toBe(true);compare(w);
  }
});

test('prefix stays separate until Resource; resource and suffix collisions keep strict motif',()=>{
  const cases:Array<(w:World)=>void>=[
    w=>{w.pawns=[owner(2)] as World['pawns'];w.resources=[resource(2)];},
    w=>{w.structures=[owner(3)] as World['structures'];w.jobs=[owner(3)] as World['jobs'];w.resources=[resource(NaN)];},
    w=>{w.resources=[resource(4),resource(4)];},
    w=>{w.resources=[resource(4)];w.piles=[owner(4)] as World['piles'];},
    w=>{w.resources=[resource(4)];w.growingZones=[owner(4)] as World['growingZones'];},
  ];
  for(const corrupt of cases){const w=world();corrupt(w);expect(compare(w,new Set([2,3,4]))).toEqual({ok:false,reason:relational});}
});

test('first strict prefix failure precedes Resource and Resource failure precedes suffix owner access',()=>{
  const prefix=world();prefix.pawns=[owner(NaN)] as World['pawns'];prefix.resources=[resource(0)];
  prefix.piles=[null] as unknown as World['piles'];expect(compare(prefix)).toEqual({ok:false,reason:relational});
  const boundary=world();boundary.resources=[resource(0)];boundary.piles=[null] as unknown as World['piles'];
  expect(compare(boundary)).toEqual({ok:false,reason:relational});
  const suffix=world();suffix.resources=[resource(3)];suffix.piles=[null] as unknown as World['piles'];
  expect(result(()=>captureOwnedStrictNamespace(suffix,createOwnedValidationResources(suffix),new Set())))
    .toBe(result(()=>literal(suffix)));
  expect(result(()=>literal(suffix))).toMatch(/^TypeError:/);
});

test('nextId is checked at this frontier, not captured as a resource verdict',()=>{
  const w=world();w.resources=[resource(9)];const facts=createOwnedValidationResources(w);
  expect(facts.namespace(w)).toMatchObject({safe:true,unique:true,maxId:9});
  w.nextId=9;expect(captureOwnedStrictNamespace(w,facts,new Set())).toEqual({ok:false,reason:relational});
  // The test changes only nextId, not the stable resource collection.
  w.nextId=10;expect(captureOwnedStrictNamespace(w,facts,new Set())?.ok).toBe(true);
  for(const nextId of [0,NaN,undefined,'0']){const empty=world();empty.nextId=nextId as number;
    expect(createOwnedValidationResources(empty).namespace(empty)?.maxId).toBeUndefined();compare(empty);}
});

test('union exposes has/add and historical iteration; additions and sparse Resource IDs remain visible',()=>{
  const w=world();w.resources=[resource(65536)];w.nextId=1000000;
  w.pawns=[owner(2)] as World['pawns'];w.stockpiles=[owner(3)] as World['stockpiles'];
  const state=compare(w);if(!state?.ok)throw Error('valid private registry');
  expect(state.ids.has(2)).toBe(true);expect(state.ids.has(3)).toBe(true);expect(state.ids.has(65536)).toBe(true);
  state.ids.add(4);state.ids.add(4);state.ids.add(NaN);state.ids.add(-0);
  expect(state.ids.has(4)).toBe(true);expect(state.ids.has(NaN)).toBe(true);expect(state.ids.has(0)).toBe(true);
  expect([...state.ids]).toEqual([2,65536,3,4,NaN,0]);
  expect([...new Set(state.ids)]).toEqual([2,65536,3,4,NaN,0]);
  expect(w.resources).toEqual([resource(65536)]);
});

test('union iteration handles empty prefixes/resources and live sparse tail additions like native Set',()=>{
  for(const hasPrefix of [false,true])for(const hasResources of [false,true]){
    const w=world();w.nextId=1000000;
    if(hasPrefix)w.pawns=[owner(2)] as World['pawns'];
    if(hasResources)w.resources=[resource(65536)];
    w.piles=[owner(3)] as World['piles'];
    const state=compare(w);if(!state?.ok)throw Error('valid private registry');
    const native=new Set([...(hasPrefix?[2]:[]),...(hasResources?[65536]:[]),3]);
    const actual=state.ids[Symbol.iterator](),expected=native[Symbol.iterator]();
    expect(actual.next()).toEqual(expected.next());
    state.ids.add(999999);native.add(999999);
    state.ids.add(NaN);native.add(NaN);state.ids.add(-0);native.add(-0);
    expect(Array.from({[Symbol.iterator]:()=>actual})).toEqual([...expected]);
    state.ids.add(5);native.add(5);expect(actual.next()).toEqual(expected.next());
    expect([...state.ids]).toEqual([...native]);expect([...new Set(state.ids)]).toEqual([...native]);
  }
});

test('inadmissible resource collections request literal fallback, without a partial verdict',()=>{
  const hole=[resource(3)];hole.length=2;
  for(const resources of [hole,[null],[[]],[{...resource(3),id:'3'}],[{...resource(3),x:'2'}]]){
    const w=world();w.resources=resources as unknown as Resource[];const facts=createOwnedValidationResources(w);
    expect(facts.namespace(w)).toBeUndefined();expect(captureOwnedStrictNamespace(w,facts,new Set())).toBeUndefined();
  }
});

// Common downstream addId/archive logic, copied literally from snapshots.
// Tests the union as a has/add consumer, not a new archive validator.
function archive(w:World,ids:ValidationNamespaceWriter,strictIds=true,mechanicalCorpseIds:ReadonlySet<number>=new Set()):string|undefined {
  const addId=(id:unknown):boolean=>{if(!Number.isSafeInteger(id)||Number(id)<1||Number(id)>=w.nextId||ids.has(Number(id))&&(strictIds||mechanicalCorpseIds.has(Number(id))))return false;ids.add(Number(id));return true;};
  const addItems=(items:unknown):boolean=>Array.isArray(items)&&items.every(item=>item&&typeof item==='object'&&addId(item.id));
  for(const records of [w.raids?.departed??[],w.prisonDepartures??[]])for(const d of records)
    if(!addId(d.pawnId)||!addItems(d.items))return 'Identité de départ historique invalide.';
  for(const records of [w.visitors?.departed??[],w.podRescues?.departed??[]])for(const d of records){
    if(!addId(d.pawn.id)||!addItems(d.items))return 'Identité de dossier archivé invalide.';
    for(const pack of d.packed??[])if(!addId(pack.building.id)||!addItems(pack.building.bills??[]))return 'Identité de mobilier archivé invalide.';
  }
  return;
}
test('archive addId sees Resource and prior extras and preserves archive motifs',()=>{
  for(const target of ['departure','visitor','furniture','valid'] as const){
    const w=world();w.resources=[resource(3)];
    if(target==='departure')w.prisonDepartures=[{pawnId:3,items:[]}] as unknown as World['prisonDepartures'];
    if(target==='visitor')w.visitors={departed:[{pawn:{id:3},items:[]}]} as unknown as World['visitors'];
    if(target==='furniture')w.visitors={departed:[{pawn:{id:4},items:[],packed:[{building:{id:5,bills:[{id:3}]}}]}]} as unknown as World['visitors'];
    if(target==='valid')w.prisonDepartures=[{pawnId:4,items:[{id:5}]}] as unknown as World['prisonDepartures'];
    const old=literal(w),candidate=compare(w);if(!old.ok||!candidate?.ok)throw Error('valid map registry');
    const actual=archive(w,candidate.ids),expected=archive(w,old.ids);expect(actual).toBe(expected);
    expect(actual).toBe(target==='departure'?'Identité de départ historique invalide.':target==='visitor'?'Identité de dossier archivé invalide.':target==='furniture'?'Identité de mobilier archivé invalide.':undefined);
    if(target==='valid'){expect(candidate.ids.has(4)).toBe(true);expect(candidate.ids.has(5)).toBe(true);
      expect(archive(w,candidate.ids)).toBe('Identité de départ historique invalide.');}
  }
});

test('literal RAW/non-strict oracle keeps ordinary duplicates and reserves mechanical corpse IDs',()=>{
  const w=world();w.resources=[resource(3),resource(3)];
  expect(literal(w,new Set(),false).ok).toBe(true);
  expect(literal(w,new Set([3]),false)).toEqual({ok:false,reason:corpse});
  expect(literal(w,new Set([3]),true)).toEqual({ok:false,reason:relational});
});

test('RAW oracle captures all collection references before any owner ID, including a throw',()=>{
  // Oracle contract only; no private helper is invoked on these getter Worlds.
  for(const throws of [false,true]){
    const w=world(),trace:string[]=[],resources=[resource(3)];let current=resources;
    const pawn={get id(){trace.push('id:pawn');current=[resource(99)];if(throws)throw Error('owner id');return 2;}};
    const keys=['pawns','structures','jobs','resources','piles','stockpiles','growingZones','wildlife','filth','fires','packed'] as const;
    const values:Record<string,unknown>={pawns:[pawn],structures:[],jobs:[],piles:[],stockpiles:[],growingZones:[],packed:[]};
    for(const key of keys)Object.defineProperty(w,key,{get(){trace.push('collection:'+key);return key==='resources'?current:values[key];}});
    const actual=result(()=>literal(w,new Set(),false));
    expect(trace.slice(0,14)).toEqual(['pawns','structures','jobs','resources','piles','stockpiles','growingZones',
      'wildlife','filth','fires','fires','packed','structures','packed'].map(key=>'collection:'+key));
    expect(trace[14]).toBe('id:pawn');
    if(throws)expect(actual).toBe('Error: owner id');
    else {const state=actual as Registry;expect(state.ok).toBe(true);if(state.ok){expect(state.ids.has(3)).toBe(true);expect(state.ids.has(99)).toBe(false);}}
  }
});
