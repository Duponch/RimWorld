import {expect,test} from 'vitest';
import {SCHEMA_VERSION,type World,type Resource} from '../src/sim/types.ts';
import {validFirefoamHistoricalTransport290,validFirefoamWorld290,validateFirefoamLocal290} from '../src/sim/firefoam-save-290.ts';
import {validFirefoamActorOwners290} from '../src/sim/firefoam-actor-save-290.ts';
import type {FirefoamWave290} from '../src/sim/firefoam-state-290.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {ResidentPresentationAssembler} from '../src/bridge/resident-presentation-assembler.ts';
import {firefoamManualCamp469} from './scenarios/firefoam-v469.ts';

/** Declared guard contexts only, not whole saves or played emissions. Empty
 * collections make ownership/clock refusals independent of terrain generation.
 * The two transport cases alone reuse the existing complete manual fixture.
 * No command, step, timer benchmark, extra pipeline or gameplay gain is added. */
function local():World {
 return {schemaVersion:SCHEMA_VERSION,tick:2000,nextId:100,width:8,height:8,
  pawns:[],structures:[],jobs:[],packed:[],resources:[],piles:[],stockpiles:[],growingZones:[]} as unknown as World;
}
const coat=(remainingCore=900)=>({health:{coveredInFirefoam290:{remainingCore}}});
const popper=()=>({id:80,kind:'firefoam-popper' as const,material:'steel' as const,firefoam290:{autoRebuild:false}});
function emission(){
 const w=local(),i=2*w.width+2;
 const wave:FirefoamWave290={id:90,sourceId:80,center:{x:2,z:2},startedAtCore:w.tick*10-1,advancedAtCore:w.tick*10,
  cells:[i,i+1,i+2],damageOnlyCells:[i+2],nextCell:2,affectedActorKeys:[]};
 w.firefoam290={rng:1,waves:[wave]};return {w,wave};
}
function retained(root:World,map:World):void {
 // This guard inspects real map contexts and shared IDs; the enclosing registry
 // validator, not this synthetic fixture, owns complete WorldMap row shapes.
 (root as unknown as {worldMaps:unknown}).worldMaps={sites:[{map}]};
}
const historical=(value:unknown,version:number=SCHEMA_VERSION)=>validFirefoamHistoricalTransport290(value,version);
const actors=(value:unknown,version:number=SCHEMA_VERSION)=>validFirefoamActorOwners290(value,version);

test('Firefoam structural reduction preserves literal old/current admission and future refusal',()=>{
 const clean={pawns:[],structures:[]},feature={pawns:[coat()]};
 for(const version of [1,256,283,289]){expect(historical(clean,version)).toBe(true);expect(actors(clean,version)).toBe(true);expect(historical(feature,version)).toBe(false);expect(actors(feature,version)).toBe(false);}
 for(const version of [290,291,292,SCHEMA_VERSION]){expect(historical(feature,version)).toBe(true);expect(actors(feature,version)).toBe(true);}
 for(const version of [SCHEMA_VERSION+1,SCHEMA_VERSION+2]){expect(historical(clean,version)).toBe(false);expect(actors(clean,version)).toBe(false);}
 expect(validFirefoamHistoricalTransport290(clean,String(SCHEMA_VERSION))).toBe(false);
});

test('Firefoam structural reduction refuses own accessors without invoking lane or clinical getters',()=>{
 let reads=0;const lane={},health={};
 Object.defineProperty(lane,'pawns',{enumerable:true,get(){reads++;throw Error('Do not read lane getter');}});
 Object.defineProperty(health,'coveredInFirefoam290',{enumerable:true,get(){reads++;throw Error('Do not read clinical getter');}});
 for(const value of [lane,{pawns:[{health}]}]){expect(historical(value)).toBe(false);expect(actors(value)).toBe(false);}
 const schema={};Object.defineProperty(schema,'schemaVersion',{enumerable:true,get(){reads++;throw Error('Do not read version getter');}});
 expect(validFirefoamWorld290(schema)).toBe(false);expect(reads).toBe(0);
});

test('Firefoam structural reduction keeps hidden/inherited lanes and nonplain records closed',()=>{
 const hidden={};Object.defineProperty(hidden,'pawns',{value:[],enumerable:false});
 const inherited=Object.create({pawns:[]});
 const nullPrototype=Object.create(null),date=new Date(0);
 for(const value of [hidden,inherited,nullPrototype,date]){expect(historical(value)).toBe(false);expect(actors(value)).toBe(false);}
 const badHealth={};Object.defineProperty(badHealth,'coveredInFirefoam290',{value:{remainingCore:900},enumerable:false});
 for(const value of [{pawns:[{health:badHealth}]},{pawns:[{health:{coveredInFirefoam290:undefined}}]},{pawns:[coat(0)]},{pawns:[coat(901)]}]){
  expect(historical(value)).toBe(false);expect(actors(value)).toBe(false);
 }
 const explicitLane={pawns:undefined};expect(historical(explicitLane)).toBe(true);expect(actors(explicitLane)).toBe(true);
});

test('Firefoam structural reduction rejects custody cycles while allowing unchanged noncyclic aliases',()=>{
 const cycle:{world?:unknown}={};cycle.world=cycle;
 const arrayCycle:{pawns:unknown[]}={pawns:[]};arrayCycle.pawns.push(arrayCycle);
 for(const value of [cycle,arrayCycle]){expect(historical(value)).toBe(false);expect(actors(value)).toBe(false);}
 const same=coat(),aliases={pawns:[same,same]};
 expect(historical(aliases)).toBe(true);expect(actors(aliases)).toBe(true);expect(same.health.coveredInFirefoam290.remainingCore).toBe(900);
});

test('descriptor-first Firefoam APIs cannot hide an invalid own custody lane behind a lying has trap',()=>{
 for(const check of [historical,actors]){
  const target={pawns:[coat(901)]},value=new Proxy(target,{has(object,key){return key==='pawns'?false:Reflect.has(object,key);}});
  expect(Object.getPrototypeOf(value)).toBe(Object.prototype);expect(Object.hasOwn(value,'pawns')).toBe(true);
  expect(check(value)).toBe(false);expect(target.pawns[0]!.health.coveredInFirefoam290.remainingCore).toBe(901);
 }
});

test('descriptor-first Firefoam APIs do not newly invoke has traps for valid own custody lanes',()=>{
 for(const check of [historical,actors]){
  let hasReads=0;const target={pawns:[coat()]},value=new Proxy(target,{has(object,key){if(key==='pawns'){hasReads++;throw Error('Own lane has trap was not needed');}return Reflect.has(object,key);}});
  expect(check(value)).toBe(true);expect(hasReads).toBe(0);expect(target.pawns[0]!.health.coveredInFirefoam290.remainingCore).toBe(900);
 }
});

test('public Local and World keep current installed wick and clinical scalars without advancing or repairing them',()=>{
 const w=local();w.structures=[{...popper(),x:2,z:2,orientation:0,footprint:'standard',firefoam290:{autoRebuild:true,wick:{startedAtCore:w.tick*10-17,endCore:w.tick*10+128}}}];
 w.firefoam290={rng:123,waves:[]};w.pawns=[{id:7,...coat(887)} as unknown as World['pawns'][number]];
 const before=JSON.stringify(w);expect(validateFirefoamLocal290(w)).toEqual([]);expect(validFirefoamWorld290(w)).toBe(true);expect(JSON.stringify(w)).toBe(before);
 w.structures[0]!.firefoam290!.wick!.endCore=w.tick*10;
 expect(validateFirefoamLocal290(w).length).toBeGreaterThan(0);expect(validFirefoamWorld290(w)).toBe(false);
});

test('World still checks retained map semantics after one root admission rather than only the selected Local',()=>{
 const root=local(),map=local();
 map.structures=[{...popper(),x:2,z:2,orientation:0,footprint:'standard',firefoam290:{autoRebuild:false,wick:{startedAtCore:root.tick*10-150,endCore:root.tick*10}}}];
 map.firefoam290={rng:1,waves:[]};retained(root,map);
 expect(historical(root)).toBe(true);expect(validateFirefoamLocal290(root)).toEqual([]);
 expect(validateFirefoamLocal290(map).length).toBeGreaterThan(0);expect(validFirefoamWorld290(root)).toBe(false);
 map.structures[0]!.firefoam290!.wick={startedAtCore:root.tick*10-17,endCore:root.tick*10+128};
 expect(validFirefoamWorld290(root)).toBe(true);
});

test('World retains clinical fences inside nested maps with no active wave',()=>{
 const root=local(),map=local();map.pawns=[{id:7,...coat()} as unknown as World['pawns'][number]];retained(root,map);
 const before=JSON.stringify(root);expect(validFirefoamWorld290(root)).toBe(true);expect(JSON.stringify(root)).toBe(before);
 map.pawns[0]!.health!.coveredInFirefoam290!.remainingCore=901;expect(validFirefoamWorld290(root)).toBe(false);
 map.pawns[0]!.health!.coveredInFirefoam290!.remainingCore=899;expect(validFirefoamWorld290(root)).toBe(true);
});

test('World keeps the cross-map wave namespace that a standalone Local cannot certify',()=>{
 const {w,wave}=emission(),other=local();retained(w,other);
 expect(validateFirefoamLocal290(w)).toEqual([]);expect(validFirefoamWorld290(w)).toBe(true);
 other.resources=[{id:wave.id} as Resource];const before=JSON.stringify(w);
 expect(validateFirefoamLocal290(w)).toEqual([]);expect(validFirefoamWorld290(w)).toBe(false);expect(JSON.stringify(w)).toBe(before);
 other.resources[0]!.id=wave.sourceId;expect(validFirefoamWorld290(w)).toBe(false);
 other.resources[0]!.id=91;expect(validFirefoamWorld290(w)).toBe(true);
});

test('World keeps malformed ordinary resource census refusal even without a firefoam condition',()=>{
 const w=local();(w.resources as unknown[]).push(null);
 const before=JSON.stringify(w);expect(validFirefoamWorld290(w)).toBe(false);expect(JSON.stringify(w)).toBe(before);
 w.resources=[];expect(validFirefoamWorld290(w)).toBe(true);
});

test('Local keeps captured wave semantics and the supplied identity-sink behavior across same-tick retries',()=>{
 const {w,wave}=emission(),ids=new Set<number>(),before=JSON.stringify(w);
 expect(validateFirefoamLocal290(w,ids)).toEqual([]);expect(ids.has(wave.id)).toBe(true);expect(JSON.stringify(w)).toBe(before);
 expect(validateFirefoamLocal290(w,ids).length).toBeGreaterThan(0);
 wave.advancedAtCore-=10;expect(validateFirefoamLocal290(w).length).toBeGreaterThan(0);expect(validFirefoamWorld290(w)).toBe(false);
 wave.advancedAtCore+=10;expect(validateFirefoamLocal290(w)).toEqual([]);expect(validFirefoamWorld290(w)).toBe(true);expect(JSON.stringify(w)).toBe(before);
});

test('clinical enduction remains suspended in retained caskets but forbidden in unopened and mothballed owners',()=>{
 const held={worldPawns:{heldPlayerCaskets271:[{casket:{cryptosleep:{human:coat(899)}}}]}};
 expect(historical(held)).toBe(true);expect(actors(held)).toBe(true);
 const unopened={startingArrival:{phase:'landing',pods:[{humans:[coat()]}]}},mothballed={worldPawns:{owners:[{mode:'mothballed',actor:coat()}]}};
 for(const value of [unopened,mothballed]){expect(historical(value)).toBe(false);expect(actors(value)).toBe(false);}
});

test.each([false,true])('Resident keeps confirmed originals when a same-tick candidate fails after transport admission and retries exact revision (checkpoint=%s)',checkpoint=>{
 const {w,popper}=firefoamManualCamp469(),encoder=new SnapshotEncoder({structureDelta:true,minimumStructures:0}),receivers=[new SnapshotDecoder(),new ResidentPresentationAssembler()];
 const opening=structuredClone(encoder.encode(w,0,0));
 const held=receivers.map(receiver=>{const result=receiver.adopt(structuredClone(opening));if(result.status!=='applied')throw Error('Opening refused');return {world:result.world,before:JSON.stringify(result.world)};});
 const tick=w.tick;popper.firefoam290!.autoRebuild=true;
 const good=structuredClone(encoder.encode(w,0,0,checkpoint)),bad=structuredClone(good),structures='structures'in bad?bad.structures!.upserted:bad.world.structures;
 structures!.find(s=>s.id===popper.id)!.firefoam290={autoRebuild:true,wick:{startedAtCore:w.tick*10-150,endCore:w.tick*10}};
 // Shape is historically admissible; only actual context makes this expired.
 expect(historical(bad)).toBe(true);const before=JSON.stringify(good);
 for(const [index,receiver]of receivers.entries()){
  expect(receiver.adopt(structuredClone(bad)).status).toBe('resync');expect(JSON.stringify(held[index]!.world)).toBe(held[index]!.before);
  const result=receiver.adopt(structuredClone(good));expect(result.status).toBe('applied');if(result.status!=='applied')throw Error('Same valid revision refused');
  expect(result.world.tick).toBe(tick);expect(result.world.structures.find(s=>s.id===popper.id)!.firefoam290).toEqual({autoRebuild:true});expect(JSON.stringify(good)).toBe(before);
 }
});
