/* PRIVATE adoption destination: tests/shooting-lean-save.test.ts.
 * Copy scene.ts to tests/scenarios/shooting-lean.ts. ROOT runs controls only. */
import {test,expect} from 'vitest';
import {leanScene,shoot,firstFlight,roundtrip} from './scenarios/shooting-lean';
import {stepWorld} from '../src/sim/engine';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization';
import {validShootingShape,validShootingLeanOwner} from '../src/sim/shooting-save';
import {SnapshotEncoder,SnapshotDecoder,type SnapshotMessage} from '../src/bridge/snapshots';
import {SCHEMA_VERSION,type World} from '../src/sim/types';

type MutableStance={lean?:unknown;phase?:unknown;[key:string]:unknown};
const stance=(w:World)=>w.pawns[0]!.shooting!.stance! as unknown as MutableStance;
const prepared=()=>{const s=leanScene();expect(shoot(s).ok).toBe(true);roundtrip(s.w);return s;};
const mutations:{name:string;change:(w:World)=>void;json:boolean}[]=[
 {name:'zero',change:w=>{stance(w).lean={x:0,z:0};},json:true},
 {name:'diagonal',change:w=>{stance(w).lean={x:1,z:1};},json:true},
 {name:'fraction',change:w=>{stance(w).lean={x:.5,z:0};},json:true},
 {name:'outsidecardinal',change:w=>{stance(w).lean={x:2,z:0};},json:true},
 {name:'string',change:w=>{stance(w).lean='0,-1';},json:true},
 {name:'extra',change:w=>{stance(w).lean={x:0,z:-1,extra:0};},json:true},
 {name:'NaN',change:w=>{stance(w).lean={x:NaN,z:-1};},json:false},
 {name:'ownundefined',change:w=>{stance(w).lean=undefined;},json:false},
 {name:'inherited',change:w=>{delete stance(w).lean;Object.setPrototypeOf(stance(w),{lean:{x:0,z:-1}});},json:false},
 {name:'outboundsource',change:w=>{w.pawns[0]!.x=0;stance(w).lean={x:-1,z:0};},json:true},
];

test.each(mutations)('$name: object admission is strict; JSON is asserted only when it can represent the malformed marker',({change,json})=>{
 const {w}=prepared();change(w);expect(validateWorld(w).length).toBeGreaterThan(0);expect(()=>serializeWorld(w)).toThrow();expect(validShootingShape(w.pawns[0]!.shooting,SCHEMA_VERSION,w.tick)&&validShootingLeanOwner(w.pawns[0],w,SCHEMA_VERSION)).toBe(false);
 if(json)expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();
});

test('strict237 validation precedes neutral238 migration and absence is not retroactively captured',()=>{
 const {w}=prepared();delete stance(w).lean;(w as unknown as {schemaVersion:number}).schemaVersion=237;
 const raw=JSON.stringify(w),migrated=deserializeWorld(raw);expect(migrated).toEqual({...w,schemaVersion:SCHEMA_VERSION});expect(Object.hasOwn(stance(migrated),'lean')).toBe(false);
 const legacy=structuredClone(w);stance(legacy).lean={x:0,z:-1};expect(validShootingShape(legacy.pawns[0]!.shooting,237,legacy.tick)).toBe(false);expect(()=>deserializeWorld(JSON.stringify(legacy))).toThrow();
 const ownUndefined=structuredClone(w);stance(ownUndefined).lean=undefined;expect(Object.hasOwn(stance(ownUndefined),'lean')).toBe(true);expect(validShootingShape(ownUndefined.pawns[0]!.shooting,237,ownUndefined.tick)).toBe(false);
 // JSON drops undefined: it cannot be used to assert a nonexistent JSON key.
 expect(deserializeWorld(JSON.stringify(ownUndefined))).toEqual(migrated);
 const s={w:migrated,p:migrated.pawns[0]!,target:migrated.pawns[1]!,third:migrated.pawns[2]!,weapon:migrated.piles.find(i=>i.owner.type==='equipment')!};
 expect(firstFlight(s).flight.origin).toEqual({x:4.5,z:10.5});
});

test('a real cooldown cannot inherit aim-only lean, and in-flight history is immutable through migration',()=>{
 const s=leanScene('revolver');expect(shoot(s).ok).toBe(true);const projectile=firstFlight(s),flight=structuredClone(projectile);roundtrip(s.w);expect(s.p.shooting?.stance?.phase).toBe('cooldown');
 const bad=structuredClone(s.w);stance(bad).lean={x:0,z:-1};expect(validateWorld(bad).length).toBeGreaterThan(0);expect(()=>deserializeWorld(JSON.stringify(bad))).toThrow();
 (s.w as unknown as {schemaVersion:number}).schemaVersion=237;const migrated=deserializeWorld(JSON.stringify(s.w));expect(migrated).toEqual({...s.w,schemaVersion:SCHEMA_VERSION});expect(migrated.projectiles?.find(p=>p.id===flight.id)).toEqual(flight);
});

function applied(decoder:SnapshotDecoder,packet:SnapshotMessage){const r=decoder.adopt(packet);expect(r.status).toBe('applied');if(r.status!=='applied')throw Error(JSON.stringify(r));return r.world;}
test.each([false,true])('Decoder validates full/delta marker objects before adoption and permits exact same-revision retry (checkpoint=%s)',checkpoint=>{
 const {w}=prepared(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),confirmed=applied(decoder,structuredClone(encoder.encode(w,0,1))),frozen=structuredClone(confirmed);
 stepWorld(w);roundtrip(w);const good=structuredClone(encoder.encode(w,0,1,checkpoint));
 for(const m of mutations.filter(m=>m.name!=='inherited')){const bad=structuredClone(good);m.change(bad.world as World);expect(decoder.adopt(bad)).toMatchObject({status:'resync'});expect(confirmed).toEqual(frozen);}
 expect(applied(decoder,good)).toEqual(w);expect(confirmed).toEqual(frozen);
});

test.each([false,true])('Decoder also refuses a future237 ownundefined key without JSON erasing it (checkpoint=%s)',checkpoint=>{
 const {w}=prepared();delete stance(w).lean;(w as unknown as {schemaVersion:number}).schemaVersion=237;
 const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),confirmed=applied(decoder,structuredClone(encoder.encode(w,0,1))),frozen=structuredClone(confirmed),good=structuredClone(encoder.encode(w,0,1,checkpoint));
 const bad=structuredClone(good);stance(bad.world as World).lean=undefined;expect(Object.hasOwn(stance(bad.world as World),'lean')).toBe(true);expect(decoder.adopt(bad)).toMatchObject({status:'resync'});expect(confirmed).toEqual(frozen);expect(applied(decoder,good)).toEqual(w);
});

test('valid captured aim, emitted flight and replay survive consecutive full/delta epochs without cloning mutable history',()=>{
 const {w}=prepared(),copy=roundtrip(w),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();const first=applied(decoder,structuredClone(encoder.encode(w,0,1))),frozen=structuredClone(first);let sawFlight=false;
 for(let n=0;n<14;n++){stepWorld(w);stepWorld(copy);expect(copy).toEqual(w);roundtrip(w);sawFlight||=!!w.projectiles?.length;expect(applied(decoder,structuredClone(encoder.encode(w,0,1)))).toEqual(w);expect(first).toEqual(frozen);}
 expect(sawFlight).toBe(true);
});
