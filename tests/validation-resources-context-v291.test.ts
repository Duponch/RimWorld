import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage,type SnapshotValidationContext} from '../src/bridge/snapshots.ts';
import {createOwnedValidationGeometry} from '../src/sim/owned-validation-geometry.ts';
import {ValidationIdentityContext} from '../src/sim/validation-identities.ts';
import {PowerParentValidationCache} from '../src/sim/power-parent-validation.ts';
import {validateHydroponics} from '../src/sim/farming-save.ts';
import {HYDROPONICS_RESEARCH_COST} from '../src/sim/research.ts';
import {footprintCells} from '../src/sim/definitions.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import type {Resource,Structure,World} from '../src/sim/types.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';

// A private-shaped query fixture exercises the optional facts hook, without
// claiming that an exported helper/subclass establishes native ownership.
class QueryDecoder extends SnapshotDecoder {
  protected override createValidationContext(next:World):SnapshotValidationContext {
    const geometry=createOwnedValidationGeometry(next);
    return {powerParents:new PowerParentValidationCache(),geometry,resourceFacts:geometry.resourceFacts};
  }
}
const outcome=(read:()=>unknown):unknown=>{try{return read();}catch(error){return `${(error as Error).name}: ${(error as Error).message}`;}};
const resource=(id:number,x=8,z=8):Resource=>({id,kind:'tree',x,z,amount:1});
function hydroWorld():World {
  const w=deconstructionCamp(0,24);w.stockpiles=[];w.growingZones=[];
  w.research={project:null,points:0,hydroponics:{points:HYDROPONICS_RESEARCH_COST,completedAt:w.tick}};
  const basin:Structure={id:w.nextId++,kind:'hydroponics-basin',x:8,z:8,orientation:0,footprint:'standard',material:'steel',power:newPowerState('hydroponics-basin')};
  w.structures=[basin];w.growingZones=[{id:w.nextId++,basinId:basin.id,plant:'rice',allowSow:true,allowCut:true,
    cells:footprintCells(basin).map(c=>c.z*w.width+c.x).sort((a,b)=>a-b)}];
  return w;
}
function compareHydro(w:World,version:number=w.schemaVersion){
  const geometry=createOwnedValidationGeometry(w),context=new ValidationIdentityContext(w,geometry.resourceFacts);
  expect(outcome(()=>validateHydroponics(w,version,undefined,context,geometry))).toEqual(outcome(()=>validateHydroponics(w,version)));
}

test('shared resource IDs preserve the distinct hydro/orbital domains and wrong-world fallback',()=>{
  const w=deconstructionCamp(0,16);w.resources=[resource(5),resource(5),resource(NaN),resource(-0)];
  w.growingZones=[{id:20,cells:[],plant:'rice',allowSow:true,allowCut:true}];
  const context=new ValidationIdentityContext(w,createOwnedValidationGeometry(w).resourceFacts),raw=new ValidationIdentityContext(w);
  const packs=[{building:{id:30}}];
  for(const id of [0,-0,5,NaN,20,30,31]){
    expect(context.hydro(w).has(id)).toBe(raw.hydro(w).has(id));
    expect(context.orbital(w,packs).has(id)).toBe(raw.orbital(w,packs).has(id));
  }
  expect(context.hydro(w).has(20)).toBe(false);expect(context.orbital(w,packs).has(20)).toBe(true);
  expect(context.orbital(w,packs).has(30)).toBe(true);expect(context.hydro(w).has(30)).toBe(false);
  const other=structuredClone(w);other.resources=[resource(99)];
  expect(context.resourceRecords(other)).toBeUndefined();expect(context.hydro(other).has(99)).toBe(true);expect(context.hydro(other).has(5)).toBe(false);
});

test('raw identities read every collection before owner IDs, including getter-triggered replacement',()=>{
  const keys=['pawns','resources','structures','jobs','piles','stockpiles'] as const;
  function observed(throws=false){
    const w=deconstructionCamp(0,16),trace:string[]=[],collections=new Map<string,unknown[]>();
    for(const [index,key] of keys.entries()){
      const owner={get id(){trace.push('id:'+key);if(key==='pawns'){
        if(throws)throw Error('owner id');collections.set('resources',[{id:99}]);
      }return index+1;}};
      const owners=[owner];Object.defineProperty(owners,Symbol.iterator,{get(){trace.push('iterate:'+key);return function*(){yield owner;};}});
      collections.set(key,owners);
      Object.defineProperty(w,key,{configurable:true,get(){trace.push('collection:'+key);return collections.get(key);}});
    }
    return {w,trace};
  }
  const {w,trace}=observed(),ids=new ValidationIdentityContext(w).hydro(w);
  expect(trace).toEqual([...keys.map(key=>'collection:'+key),...keys.flatMap(key=>['iterate:'+key,'id:'+key])]);
  expect(ids.has(2)).toBe(true);expect(ids.has(99)).toBe(false);
  const ownedWorld=deconstructionCamp(0,16),privateContext=new ValidationIdentityContext(ownedWorld,createOwnedValidationGeometry(ownedWorld).resourceFacts);
  for(const context of [undefined,privateContext]){
    const current=observed(true),rawContext=context??new ValidationIdentityContext(current.w);
    expect(outcome(()=>rawContext.hydro(current.w))).toBe('Error: owner id');
    expect(current.trace).toEqual([...keys.map(key=>'collection:'+key),'iterate:pawns','id:pawns']);
  }
});

test('hydro keeps ordered error arrays, record holes and duplicate resource occurrences',()=>{
  const initial=hydroWorld(),hole=[resource(initial.nextId++)];hole.length=2;
  const cases:Resource[][]=[[],[resource(initial.growingZones[0]!.id)],
    [resource(initial.nextId),resource(initial.nextId)],hole,[undefined as unknown as Resource],[null as unknown as Resource],
    [[] as unknown as Resource],[{...resource(initial.nextId),blight:undefined}],
    [{...resource(initial.nextId),x:'8' as unknown as number}]];
  for(const resources of cases)for(const version of [202,203,218]){
    const w=structuredClone(initial);w.resources=resources;compareHydro(w,version);
  }
  const duplicate=structuredClone(initial);duplicate.resources=[resource(duplicate.nextId++),resource(duplicate.nextId++)];
  expect(validateHydroponics(duplicate,218).filter(error=>error==='Unsupported plant overlaps hydroponics.')).toHaveLength(2);
  for(const key of ['pawns','jobs','piles','stockpiles'] as const){
    const w=structuredClone(initial);w[key].length=1;compareHydro(w);
    expect(validateHydroponics(w,218)).toEqual(['Invalid hydroponics world collections or dimensions.']);
  }
});

test('resource facts do not become proofs of duplicate validity or of the next adoption',()=>{
  const w=hydroWorld(),zone=w.growingZones[0]!;w.resources=[resource(zone.id)];compareHydro(w);
  expect(validateHydroponics(w,218)).toContain('Invalid hydroponics growing zone.');
  const first=new ValidationIdentityContext(w,createOwnedValidationGeometry(w).resourceFacts);
  const next=structuredClone(w);next.resources=[resource(next.nextId++)];
  const second=new ValidationIdentityContext(next,createOwnedValidationGeometry(next).resourceFacts);
  expect(first.hydro(w).has(zone.id)).toBe(true);expect(second.hydro(next).has(zone.id)).toBe(false);
  expect(first.resourceRecords(next)).toBeUndefined();compareHydro(next);
});

test('query decoder keeps first refusal motif, raw malformed outcomes and atomic recovery',()=>{
  const w=deconstructionCamp(0,16);w.resources=[{id:w.nextId++,kind:'healroot',x:2,z:2,amount:1,growth:.5,growthTick:0}];
  const packet=structuredClone(new SnapshotEncoder().encode(w,0,6));
  if(packet.kind!=='checkpoint')throw Error('checkpoint fixture');
  const mutations:Array<(message:Extract<SnapshotMessage,{kind:'checkpoint'}>)=>void>=[
    m=>{m.world.resources[0]!.amount=2;},m=>{m.world.resources[0]!.growthTick=1;},
    m=>{m.world.resources[0]!.blight=undefined;m.world.schemaVersion=204 as World['schemaVersion'];},
    m=>{m.world.resources.length=2;},m=>{m.world.resources[0]=null as unknown as Resource;},
  ];
  for(const mutate of mutations){
    const bad=structuredClone(packet);mutate(bad);
    expect(outcome(()=>new QueryDecoder().adopt(structuredClone(bad)))).toEqual(outcome(()=>new SnapshotDecoder().adopt(structuredClone(bad))));
  }
  const bad=structuredClone(packet);bad.world.resources[0]!.amount=2;
  // A later independently invalid building must not replace the plant motif.
  bad.world.structures=[{id:bad.world.nextId++,kind:'sandbags',x:3,z:3,orientation:0,footprint:'standard'}];
  const raw=new SnapshotDecoder(),owned=new QueryDecoder(),oldRaw=raw.adopt(structuredClone(packet)),oldOwned=owned.adopt(structuredClone(packet));
  expect(oldOwned.status).toBe('applied');expect(oldRaw.status).toBe('applied');
  const frozen=structuredClone(oldOwned);
  bad.revision++;const refusal=owned.adopt(structuredClone(bad));expect(refusal).toEqual(raw.adopt(structuredClone(bad)));
  expect(refusal).toEqual({status:'resync',reason:'État végétal ou identité commerciale invalide.'});
  expect(owned.adopt({...structuredClone(packet),revision:bad.revision})).toEqual(raw.adopt({...structuredClone(packet),revision:bad.revision}));
  expect(oldOwned).toEqual(frozen);
});

test('inherited resources and growth-only deltas revalidate clocks in each fresh query context',()=>{
  const w=deconstructionCamp(0,16);w.resources=[{id:w.nextId++,kind:'rice',x:2,z:2,amount:6,growth:.5,growthTick:0,growthLight:'dark'}];
  const encoder=new SnapshotEncoder(),raw=new SnapshotDecoder(),owned=new QueryDecoder();
  const first=structuredClone(encoder.encode(w,0,6)),initial=owned.adopt(structuredClone(first));
  expect(initial).toEqual(raw.adopt(structuredClone(first)));expect(initial.status).toBe('applied');
  w.tick=1;w.resources[0]!.growth=.6;w.resources[0]!.growthTick=1;
  const growth=structuredClone(encoder.encode(w,0,6));if(growth.kind!=='delta')throw Error('growth delta');
  const updated=owned.adopt(structuredClone(growth));expect(updated).toEqual(raw.adopt(structuredClone(growth)));expect(updated.status).toBe('applied');
  const inherited=structuredClone(encoder.encode(w,0,6));if(inherited.kind!=='delta')throw Error('inherited delta');
  inherited.world.tick=0;
  const refusal=owned.adopt(structuredClone(inherited));expect(refusal).toEqual(raw.adopt(structuredClone(inherited)));
  expect(refusal).toEqual({status:'resync',reason:'État végétal ou identité commerciale invalide.'});
  const clean={...structuredClone(inherited),world:{...inherited.world,tick:1}};
  const recovered=owned.adopt(structuredClone(clean));expect(recovered).toEqual(raw.adopt(structuredClone(clean)));expect(recovered.status).toBe('applied');
});
