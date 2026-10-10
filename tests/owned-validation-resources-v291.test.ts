import {expect,test} from 'vitest';
import {createOwnedValidationGeometry} from '../src/sim/owned-validation-geometry.ts';
import {validPlantGrowthLight} from '../src/sim/plant-light-save.ts';
import {validCropBlight} from '../src/sim/plant-blight-save.ts';
import {validPlantLife} from '../src/sim/plant-life-save.ts';
import {validPlantThermalFactor} from '../src/sim/thermal-plants.ts';
import {validStoneIdentity} from '../src/sim/geology.ts';
import {resourceMaxHp} from '../src/sim/thing-damage-rules.ts';
import type {Resource,World} from '../src/sim/types.ts';
import {deconstructionCamp} from './scenarios/deconstruction.ts';

// Private query contract only: stable ordinary resource data, ordinary intrinsics.
// Constructing this helper does not grant a mutable/public World native authority.
const resource=(id:number,fields:Partial<Resource>={}):Resource=>({id,kind:'rock',x:2,z:2,amount:1,...fields});
const records=(value:unknown):boolean=>Array.isArray(value)&&Array.from({length:value.length},(_,i)=>i).every(i=>Object.hasOwn(value,i)&&!!value[i]&&typeof value[i]==='object'&&!Array.isArray(value[i]));
const outcome=(read:()=>unknown):unknown=>{try{return read();}catch(error){return `${(error as Error).name}: ${(error as Error).message}`;}};
// Frozen historical predicate from SnapshotDecoder, independent of the facts implementation.
function domestic(p:Resource,w:World):boolean {
  if(p.kind!=='healroot')return true;
  if(w.schemaVersion<182||p.amount!==1||p.species!==undefined||!Number.isSafeInteger(p.id)||p.id<1||p.id>=w.nextId
    ||!Number.isSafeInteger(p.x)||p.x<0||p.x>=w.width||!Number.isSafeInteger(p.z)||p.z<0||p.z>=w.height
    ||!validStoneIdentity(p.stone,p.kind,w.schemaVersion)||!validPlantLife(p,w.schemaVersion,w)||!validPlantThermalFactor(p,w.schemaVersion)
    ||p.damage!==undefined&&(!Number.isSafeInteger(p.damage)||p.damage<1||p.damage>=resourceMaxHp(p)))return false;
  return p.growth===undefined&&p.growthTick===undefined||typeof p.growth==='number'&&Number.isFinite(p.growth)&&p.growth>=0&&p.growth<=1
    &&Number.isSafeInteger(p.growthTick)&&p.growthTick!>=0&&p.growthTick!<=w.tick;
}
const invalid=(p:Resource,w:World):boolean=>!domestic(p,w)||!validPlantGrowthLight(p,w.schemaVersion,w.tick)||!validCropBlight(p,w.schemaVersion,w);
function equalGuard(w:World,foreign=new Set<number>()){
  const facts=createOwnedValidationGeometry(w).resourceFacts;
  expect(outcome(()=>facts.hasInvalid(w,foreign,p=>invalid(p,w))??w.resources.some(p=>foreign.has(p.id)||invalid(p,w))))
    .toEqual(outcome(()=>w.resources.some(p=>foreign.has(p.id)||invalid(p,w))));
}

test('capture does not run predicates; candidate occurrences keep source order and short circuit',()=>{
  const w=deconstructionCamp(0,16);w.schemaVersion=204 as World['schemaVersion'];
  w.resources=[resource(1),resource(2,{kind:'rice',growthLight:'dark',growth:.5,growthTick:0}),resource(3),
    resource(4,{kind:'healroot'}),resource(5,{blight:undefined})];
  const geometry=createOwnedValidationGeometry(w),trace:number[]=[];
  expect(geometry.hasResource({x:2,z:2})).toBe(true);
  expect(geometry.resourceFacts.records(w)).toBe(true);expect(trace).toEqual([]);
  expect(geometry.resourceFacts.hasInvalid(w,new Set(),p=>{trace.push(p.id);return false;})).toBe(false);
  expect(trace).toEqual([2,4,5]);trace.length=0;
  expect(geometry.resourceFacts.hasInvalid(w,new Set(),p=>{trace.push(p.id);return p.id===2;})).toBe(true);
  expect(trace).toEqual([2]);equalGuard(w);
});

test('any foreign collision restores the full historical loop, including earlier predicate throws',()=>{
  const w=deconstructionCamp(0,16);w.resources=[resource(1),resource(2,{kind:'healroot'}),resource(3)];
  const facts=createOwnedValidationGeometry(w).resourceFacts,foreign=new Set([3]),trace:number[]=[];
  expect(outcome(()=>facts.hasInvalid(w,foreign,p=>{trace.push(p.id);throw Error('first predicate');}))).toBe('Error: first predicate');
  expect(trace).toEqual([1]);trace.length=0;
  expect(facts.hasInvalid(w,new Set([1]),p=>{trace.push(p.id);throw Error('must short circuit');})).toBe(true);
  expect(trace).toEqual([]);equalGuard(w,foreign);
});

test('records, membership and atypical fallbacks retain holes, arrays and own undefined fields',()=>{
  const w=deconstructionCamp(0,16),hole=[resource(1)];hole.length=2;
  const scenes:unknown[]=[[],[resource(1,{growthLight:undefined,blight:undefined})],hole,[undefined],[null],[[]],
    [resource(1),resource(2,{x:'2' as unknown as number})],[resource(1),{id:2}],{}];
  for(const scene of scenes){
    w.resources=scene as Resource[];const facts=createOwnedValidationGeometry(w).resourceFacts;
    expect(facts.records(w)??records(w.resources)).toBe(records(w.resources));
    if(Array.isArray(scene))equalGuard(w);
  }
  w.resources=[resource(1,{blight:undefined})];
  for(const version of [204,205]){w.schemaVersion=version as World['schemaVersion'];equalGuard(w);
    expect(invalid(w.resources[0]!,w)).toBe(version===204);}
});

test('IDs preserve occurrences/SameValueZero without lending facts to another world',()=>{
  const w=deconstructionCamp(0,16);w.resources=[resource(-0),resource(0),resource(7),resource(7),resource(NaN)];
  const facts=createOwnedValidationGeometry(w).resourceFacts,ids=facts.ids(w),historical=new Set(w.resources.map(p=>p.id));
  expect(ids).toBeDefined();
  for(const id of [0,-0,7,8,NaN,Infinity])expect(ids?.has(id)??historical.has(id)).toBe(historical.has(id));
  const other=structuredClone(w);expect(facts.records(other)).toBeUndefined();expect(facts.ids(other)).toBeUndefined();
  expect(facts.hasInvalid(other,new Set(),p=>invalid(p,other))).toBeUndefined();
  expect(w.resources).toHaveLength(5);
});

test('light and blight schema, own-undefined and numeric clock boundaries match the original predicates',()=>{
  const w=deconstructionCamp(0,16);w.tick=400;w.nextId=100;
  const light=resource(17,{kind:'rice',growth:.5,growthTick:400,growthLight:'dark'});
  const blight={since:0,severity:.2,lastHarmTick:400,nextCheck:418,rng:1};
  const infected=resource(17,{kind:'rice',growth:.5,growthTick:400,blight});
  const cases:Resource[]=[light,infected,resource(17,{blight:undefined}),resource(17,{growthLight:undefined})];
  for(const growthTick of [-1,0,400,401,.5,NaN])cases.push({...light,growthTick},{...infected,growthTick});
  for(const growth of [-.0001,0,.0001,1,1.0001,NaN])cases.push({...light,growth},{...infected,growth});
  for(const field of ['since','lastHarmTick','nextCheck'] as const)for(const value of [-1,0,400,401,600,601,NaN])
    cases.push({...infected,blight:{...blight,[field]:value}});
  // Exact phase at the lower/upper nextCheck bounds, not only the middle phase.
  cases.push({...infected,id:200,blight:{...blight,nextCheck:401}}, {...infected,id:199,blight:{...blight,nextCheck:600}});
  for(const version of [176,177,204,205])for(const p of cases){w.schemaVersion=version as World['schemaVersion'];w.resources=[p];equalGuard(w);}
});

test('healroot vital clocks and physical bounds remain guard-time decisions',()=>{
  const w=deconstructionCamp(0,16);w.tick=400;w.nextId=100;
  const plant=resource(17,{kind:'healroot',growth:.5,growthTick:400});
  for(const version of [181,182,218])for(const fields of [{},{amount:2},{id:100},{x:16},{z:-1},{damage:0},{damage:1},
    {growthTick:0},{growthTick:401},{growth:-.1},{growth:1},{growth:1.1},{growthThermalFactor:NaN},{species:'healroot-wild'}] as Partial<Resource>[]){
    w.schemaVersion=version as World['schemaVersion'];w.resources=[{...plant,...fields}];equalGuard(w);
  }
  w.schemaVersion=218;w.climate={adoptedAt:0} as World['climate'];
  const life={since:0,age:218,darkTicks:0,nextCheck:418};
  for(const fields of [{},{since:-1},{since:401},{age:217},{darkTicks:219},{nextCheck:400},{nextCheck:601},{leaflessAt:18},{leaflessAt:19}]){
    w.resources=[{...plant,plantLife:{...life,...fields}}];equalGuard(w);
  }
});
