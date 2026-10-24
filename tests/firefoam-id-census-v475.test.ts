// Focused guard contexts only: no World stepping, renderer or timing claim.
import {expect,test} from 'vitest';
import {createFirefoamLaneValidatorsInternal290,validFirefoamWorld290 as strictWorld,validateFirefoamLocal290} from '../src/sim/firefoam-save-290.ts';
import {SCHEMA_VERSION,type World,type Resource} from '../src/sim/types.ts';
import type {FirefoamWave290} from '../src/sim/firefoam-state-290.ts';

// Reuse the original census contracts against the internal pooled factory.
// The public World oracle and public Local facade keep their eager Sets.
const factory=createFirefoamLaneValidatorsInternal290(Object.getOwnPropertyDescriptor);
const validFirefoamWorld290=(input:unknown)=>factory.world(input);

function local():World {
 return {schemaVersion:SCHEMA_VERSION,tick:2000,nextId:100,width:8,height:8,pawns:[],structures:[],jobs:[],packed:[],resources:[],piles:[],stockpiles:[],growingZones:[]} as unknown as World;
}
function emission(){
 const w=local(),i=2*w.width+2;
 const wave:FirefoamWave290={id:90,sourceId:80,center:{x:2,z:2},startedAtCore:w.tick*10-1,advancedAtCore:w.tick*10,cells:[i,i+1,i+2],damageOnlyCells:[i+2],nextCell:2,affectedActorKeys:[]};
 w.firefoam290={rng:1,waves:[wave]};return {w,wave};
}
function retained(root:World,...maps:World[]):void {(root as unknown as {worldMaps:unknown}).worldMaps={sites:maps.map(map=>({map}))};}
function row(name:string,id:()=>number,reads:string[]):Resource {
 return new Proxy({id:1},{get(target,key,receiver){if(key==='id'){reads.push(name);return id();}return Reflect.get(target,key,receiver);}}) as Resource;
}

test.each([false,true])('every ordinary census ID is still read in exact list order without wave membership queries (empty condition=%s)',condition=>{
 const w=local(),reads:string[]=[];if(condition)w.firefoam290={rng:1,waves:[]};
 w.resources=[row('resource',()=>11,reads)];w.stockpiles=[row('stockpile',()=>12,reads)] as unknown as World['stockpiles'];
 w.growingZones=[row('zone',()=>13,reads)] as unknown as World['growingZones'];
 w.fires={items:[row('fire',()=>14,reads)],embers:[row('ember',()=>15,reads)]} as unknown as World['fires'];
 w.projectiles=[row('projectile',()=>16,reads)] as unknown as World['projectiles'];w.bombWaves=[row('bomb',()=>17,reads)] as unknown as World['bombWaves'];
 expect(validFirefoamWorld290(w)).toBe(true);expect(reads).toEqual(['resource','stockpile','zone','fire','ember','projectile','bomb']);
});

test.each([false,true])('malformed census row still refuses World without a wave; Local keeps its own contract (empty condition=%s)',condition=>{
 const w=local();if(condition)w.firefoam290={rng:1,waves:[]};w.resources=[null] as unknown as Resource[];
 expect(validateFirefoamLocal290(w)).toEqual(condition?['Invalid firefoam local context.']:[]);expect(validFirefoamWorld290(w)).toBe(false);
 w.resources=[];expect(validFirefoamWorld290(w)).toBe(true);
});

test('a throwing census getter stops at the same row without reading later collections',()=>{
 const w=local(),reads:string[]=[];
 w.resources=[row('first',()=>11,reads),row('throw',()=>{throw Error('census');},reads),row('later-resource',()=>12,reads)];
 w.stockpiles=[row('later-stockpile',()=>13,reads)] as unknown as World['stockpiles'];
 expect(validFirefoamWorld290(w)).toBe(false);expect(reads).toEqual(['first','throw']);
});

test('first membership uses the captured Proxy ID once, not a second census after scanning',()=>{
 const {w}=emission(),reads:string[]=[];let calls=0;
 w.resources=[row('resource',()=>++calls===1?90:71,reads)];
 expect(validFirefoamWorld290(w)).toBe(false);expect(reads).toEqual(['resource']);expect(calls).toBe(1);
});

test('a census is private to this call and retries observe current IDs without repairing time or RNG',()=>{
 const {w,wave}=emission(),reads:string[]=[];let current=71;
 w.resources=[row('resource',()=>current,reads)];const tick=w.tick,rng=w.firefoam290!.rng;
 expect(validFirefoamWorld290(w)).toBe(true);current=wave.id;expect(validFirefoamWorld290(w)).toBe(false);
 current=wave.sourceId;expect(validFirefoamWorld290(w)).toBe(false);current=71;expect(validFirefoamWorld290(w)).toBe(true);
 expect(reads).toEqual(['resource','resource','resource','resource']);expect(w.tick).toBe(tick);expect(w.firefoam290!.rng).toBe(rng);
});

test('cross-map namespace collects aliased rows once per actual map context, in order, before any wave query',()=>{
 const {w}=emission(),other=local(),reads:string[]=[];let count=0;
 const shared=[row('aliased',()=>++count===1?71:90,reads)];w.resources=shared;other.resources=shared;retained(w,other);
 expect(validFirefoamWorld290(w)).toBe(false);expect(reads).toEqual(['aliased','aliased']);expect(count).toBe(2);
});

test('wave IDs added during membership checks remain occupied in later maps',()=>{
 const first=emission(),second=emission();retained(first.w,second.w);
 expect(validFirefoamWorld290(first.w)).toBe(false);second.wave.id=91;expect(validFirefoamWorld290(first.w)).toBe(true);
});

test('a burst retains later wave identities across maps and source collisions',()=>{
 const first=emission(),second=emission();
 first.w.firefoam290!.waves=Array.from({length:9},(_,i)=>({...first.wave,id:90+i,sourceId:50+i}));
 second.wave.id=98;retained(first.w,second.w);
 expect(validFirefoamWorld290(first.w)).toBe(false);
 second.wave.id=99;expect(validFirefoamWorld290(first.w)).toBe(true);
 second.wave.sourceId=98;expect(validFirefoamWorld290(first.w)).toBe(false);
 second.wave.sourceId=80;expect(validFirefoamWorld290(first.w)).toBe(true);
});

test.each(['heldCaskets259','heldPlayerCaskets271','heldShipCaskets277'] as const)('retained %s actor identity stays in the shared wave namespace',lane=>{
 const {w}=emission(),actor={id:90};
 const casket=lane==='heldCaskets259'?{casket:{humans:[actor]}}:lane==='heldPlayerCaskets271'?{cryptosleep:{human:actor}}:{shipCryptosleep277:{occupant:{kind:'human',pawn:actor}}};
 (w as unknown as {worldPawns:unknown}).worldPawns={[lane]:[{casket}]};
 expect(validFirefoamWorld290(w)).toBe(false);actor.id=71;expect(validFirefoamWorld290(w)).toBe(true);
});

test.each([false,true])('public Local identity sink retains has/add ordering even after a duplicate verdict (%s)',duplicate=>{
 const {w,wave}=emission(),calls:string[]=[];
 const ids={has(value:number){calls.push(`has:${value}`);return duplicate&&value===wave.id;},add(value:number){calls.push(`add:${value}`);}};
 const errors=validateFirefoamLocal290(w,ids);expect(errors.length>0).toBe(duplicate);
 expect(calls).toEqual(['has:90','add:90','has:80']);
});

test('late map-clock failure keeps census reads and accepts a corrected same-object retry',()=>{
 const {w,wave}=emission(),reads:string[]=[];w.resources=[row('resource',()=>71,reads)];wave.advancedAtCore+=10;
 expect(validFirefoamWorld290(w)).toBe(false);expect(reads).toEqual(['resource']);
 wave.advancedAtCore-=10;expect(validFirefoamWorld290(w)).toBe(true);expect(reads).toEqual(['resource','resource']);
});

test('overflow and maximum safe integer preserve collision membership across repeated factory calls',()=>{
 const {w,wave}=emission();w.nextId=Number.MAX_SAFE_INTEGER;
 w.resources=Array.from({length:65537},(_,i)=>({id:i+1000}) as Resource);
 w.resources[65536]!.id=wave.id;expect(validFirefoamWorld290(w)).toBe(strictWorld(w));expect(validFirefoamWorld290(w)).toBe(false);
 w.resources[65536]!.id=71000;expect(validFirefoamWorld290(w)).toBe(strictWorld(w));expect(validFirefoamWorld290(w)).toBe(true);
 wave.id=Number.MAX_SAFE_INTEGER-1;wave.sourceId=Number.MAX_SAFE_INTEGER-2;
 w.resources=[{id:wave.id} as Resource];expect(validFirefoamWorld290(w)).toBe(false);
 w.resources[0]!.id=wave.sourceId;expect(validFirefoamWorld290(w)).toBe(false);
 w.resources[0]!.id=71000;expect(validFirefoamWorld290(w)).toBe(true);
});

test('runtime nonnumber census IDs never coerce or alias numeric IDs and do not leak into a later verdict',()=>{
 const {w,wave}=emission();let coerces=0;
 const object={[Symbol.toPrimitive](){coerces++;throw Error('No census coercion');}};
 for(const value of [String(wave.id),undefined,null,object,Symbol('id'),BigInt(wave.id),NaN,-0]){
  w.resources=[{id:value} as unknown as Resource];
  expect(validFirefoamWorld290(w)).toBe(strictWorld(w));expect(validFirefoamWorld290(w)).toBe(true);
 }
 expect(coerces).toBe(0);
 w.resources=[{id:wave.id} as Resource];expect(validFirefoamWorld290(w)).toBe(false);
 w.resources=[{id:71} as Resource];expect(validFirefoamWorld290(w)).toBe(true);expect(coerces).toBe(0);
});

test('reentrant factory verdict and a throwing census preserve outer and following namespaces',()=>{
 const {w}=emission(),nested=emission(),reads:string[]=[];let nestedVerdict:boolean|undefined;
 nested.w.resources=[{id:nested.wave.id} as Resource];
 w.resources=[row('outer-first',()=>71,reads),row('outer-nested',()=>{nestedVerdict=validFirefoamWorld290(nested.w);return 72;},reads)];
 expect(validFirefoamWorld290(w)).toBe(true);expect(nestedVerdict).toBe(false);expect(reads).toEqual(['outer-first','outer-nested']);
 w.resources=[row('throw',()=>{throw Error('late census');},reads)];expect(validFirefoamWorld290(w)).toBe(false);
 w.resources=[{id:71} as Resource];expect(validFirefoamWorld290(w)).toBe(true);
});
