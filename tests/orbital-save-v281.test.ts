import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { validOrbitalTransport } from '../src/sim/orbital-save.ts';
import { orbitalConsoleSpot } from '../src/sim/orbital-rules.ts';
import { addMaterial,materialCanFit,pileCell,colonyPile,refreshStock } from '../src/sim/materials.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import { SCHEMA_VERSION,type World } from '../src/sim/types.ts';
import { orbitalCamp } from './helpers/orbital-v281.ts';
import { medicalCamp } from './scenarios/health.ts';

const checkpoint=(w:World)=>new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,1)));
function refused(w:World){expect(validOrbitalTransport(w,w.schemaVersion)).toBe(false);expect(checkpoint(w).status).toBe('resync');expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();}
function task(ready=false){
  const f=orbitalCamp(),w=f.world,p=w.pawns.find(p=>p.id===f.negotiatorId)!,console=w.structures.find(s=>s.id===f.consoleId)!,spot=orbitalConsoleSpot(console);
  p.orbitalTrade={shipId:f.shipId,consoleId:console.id,spot,phase:ready?'ready':'approach',startedAt:w.tick};p.state=ready?'idle':'moving';p.path=[];
  if(ready){Object.assign(p,spot);p.moveCooldown=0;delete p.motion;}
  return {...f,p,w};
}
function cargo(){
  const f=orbitalCamp(),w=f.world,id=w.nextId++;
  w.orbital!.pending.push({id,shipId:f.shipId,negotiatorId:f.negotiatorId,cell:{x:8,z:8},createdAt:w.tick,landAt:w.tick+6,openAt:w.tick+10});
  const pile=w.piles.find(p=>p.owner.type==='orbital-ship'&&p.item==='component')!;pile.owner={type:'orbital-cargo',deliveryId:id};
  return {...f,w,id,pile};
}

test('finite stocks and private calendar round trip through the two public readers without colony stock',()=>{
  const {world}=orbitalCamp(),stock=structuredClone(world.stock);
  expect(validateWorld(world)).toEqual([]);expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  expect(checkpoint(world).status).toBe('applied');refreshStock(world);expect(world.stock).toEqual(stock);
  for(const p of world.piles.filter(p=>p.owner.type==='orbital-ship')){expect(pileCell(world,p)).toBeNull();expect(colonyPile(world,p)).toBe(false);}
});

test('approach and settled ready keep their actual exclusive console claim',()=>{
  for(const ready of [false,true]){const {w}=task(ready);expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(checkpoint(w).status).toBe('applied');}
});

test('215 migration is neutral and has no retroactive arrival, stock, task or RNG draw',()=>{
  const w=medicalCamp();w.schemaVersion=215 as World['schemaVersion'];delete w.orbital;
  const before=structuredClone(w),loaded=deserializeWorld(JSON.stringify(w));
  expect(loaded).toEqual({...before,schemaVersion:SCHEMA_VERSION});expect(w).toEqual(before);expect(Object.hasOwn(loaded,'orbital')).toBe(false);
});

test('legacy schemas reject prospective fields even when own-undefined, devices and owners',()=>{
  for(const field of ['orbital','orbitalTrade']){const w=medicalCamp();w.schemaVersion=215 as World['schemaVersion'];
    Object.assign(field==='orbital'?w:w.pawns[0]!,{[field]:undefined});expect(validOrbitalTransport(w,215)).toBe(false);expect(checkpoint(w).status).toBe('resync');
    Object.assign(field==='orbital'?w:w.pawns[0]!,{[field]:null});expect(()=>deserializeWorld(JSON.stringify(w))).toThrow();}
  const future=orbitalCamp().world;future.schemaVersion=215 as World['schemaVersion'];refused(future);
});

test('calendar shape, private stream and cycle boundaries cannot be forged',()=>{
  for(const patch of [{rng:0},{rng:0x100000000},{rng:1.5},{profile:'visitor-v1'},{adoptedAt:3001},{cycleStart:3101},{scheduledAt:45100},{nextCheckAt:3200},{extra:1},{ships:null},{pending:null}]){
    const {world}=orbitalCamp();Object.assign(world.orbital!,patch);refused(world);
  }
});

test('live ship clocks, names and global identities are strict',()=>{
  for(const patch of [{kind:'combat'},{name:''},{name:' '.repeat(3)},{arrivedAt:3001},{departAt:6999},{announced:1},{extra:1}]){
    const {world}=orbitalCamp();Object.assign(world.orbital!.ships[0]!,patch);refused(world);
  }
  const collision=orbitalCamp();collision.world.orbital!.ships[0]!.id=collision.negotiatorId;refused(collision.world);
  const duplicate=orbitalCamp();duplicate.world.orbital!.ships.push(structuredClone(duplicate.world.orbital!.ships[0]!));refused(duplicate.world);
});

test('foreign piles need their actual ship or delivery and retain exact owner shape and stack bounds',()=>{
  for(const mutate of [(f:ReturnType<typeof orbitalCamp>)=>{f.world.piles.find(p=>p.owner.type==='orbital-ship')!.owner={type:'orbital-ship',shipId:f.world.nextId};},
    (f:ReturnType<typeof orbitalCamp>)=>{Object.assign(f.world.piles.find(p=>p.owner.type==='orbital-ship')!.owner,{x:0,z:0});},
    (f:ReturnType<typeof orbitalCamp>)=>{f.world.piles.find(p=>p.owner.type==='orbital-ship'&&p.item==='component')!.quantity=51;},
    (f:ReturnType<typeof orbitalCamp>)=>{f.world.piles.find(p=>p.owner.type==='orbital-ship')!.owner={type:'orbital-cargo',deliveryId:f.world.nextId};}]){const f=orbitalCamp();mutate(f);refused(f.world);}
  const f=orbitalCamp();expect(materialCanFit(f.world,'steel',1,{type:'orbital-ship',shipId:f.world.nextId},'steel')).toBe(false);
  expect(()=>addMaterial(f.world,'steel',1,{type:'orbital-cargo',deliveryId:f.world.nextId},'steel')).toThrow();
});

test('foreign item conditions retain their real category, damage and age contracts',()=>{
  for(const patch of [{damage:70},{damage:-1},{rot:{progress:0,atTick:3000}},{foodPoison:{unknown:true}},{extra:1}]){
    const {world}=orbitalCamp();Object.assign(world.piles.find(p=>p.owner.type==='orbital-ship'&&p.item==='component')!,patch);refused(world);
  }
});

test('delivery cargo survives its ship leaving and uses persisted adapted clocks',()=>{
  const {w,pile,shipId}=cargo();w.orbital!.ships=[];w.piles=w.piles.filter(p=>p.owner.type!=='orbital-ship'||p.owner.shipId!==shipId);
  expect(validOrbitalTransport(w,216)).toBe(true);expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);expect(checkpoint(w).status).toBe('applied');
  expect(pileCell(w,pile)).toBeNull();expect(colonyPile(w,pile)).toBe(false);
});

test('delivery shape, identities, clocks and nonempty cargo have the same file and transport refusals',()=>{
  for(const patch of [{id:1},{shipId:0},{negotiatorId:0},{cell:{x:-1,z:8}},{createdAt:3001},{landAt:3007},{openAt:3011},{extra:1}]){
    const {w}=cargo();Object.assign(w.orbital!.pending[0]!,patch);refused(w);
  }
  const empty=cargo();empty.w.piles=empty.w.piles.filter(p=>p!==empty.pile);refused(empty.w);
});

test('ready contact cannot move, keep interpolation or share another service task',()=>{
  for(const mutate of [(f:ReturnType<typeof task>)=>{f.p.x--;},(f:ReturnType<typeof task>)=>{f.p.path=[{x:8,z:8}];},
    (f:ReturnType<typeof task>)=>{f.p.moveCooldown=1;},(f:ReturnType<typeof task>)=>{f.p.state='working';},
    (f:ReturnType<typeof task>)=>{f.p.orbitalTrade!.spot.x++;}]){const f=task(true);mutate(f);refused(f.w);}
  for(const field of ['need','deepWork','trade','surgery','animalFeed','research','cooking','shooting'] as const){const f=task(true);Object.assign(f.p,{[field]:{}});refused(f.w);}
  const f=task();const other=f.w.pawns.find(p=>p!==f.p)!;other.orbitalTrade=structuredClone(f.p.orbitalTrade);other.state='moving';refused(f.w);
});

test('archives and off-map human owners cannot keep orbital tasks or orbital item owners',()=>{
  for(const slot of ['scout','commercialTrip'] as const){
    const f=task();const pawn=structuredClone(f.p);f.w.pawns=f.w.pawns.filter(p=>p!==f.p);Object.assign(f.w,{[slot]:{pawn,items:[]}});
    expect(validOrbitalTransport(f.w,216)).toBe(false);
  }
  const f=orbitalCamp(),pawn=structuredClone(f.world.pawns[1]!);pawn.orbitalTrade={shipId:f.shipId,consoleId:f.consoleId,spot:{x:15,z:15},phase:'ready',startedAt:f.world.tick};
  f.world.pawns=f.world.pawns.filter(p=>p.id!==pawn.id);f.world.visitors={departed:[{tick:f.world.tick,pawn,items:[]}]} as never;
  expect(validOrbitalTransport(f.world,216)).toBe(false);
});

test('in-place stock and calendar deltas retain previous views; an invalid fleet never commits',()=>{
  const {world}=orbitalCamp(),encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(world,0,1)));expect(first.status).toBe('applied');if(first.status!=='applied')throw Error('Missing first view');
  const retained=structuredClone(first.world);world.orbital!.ships[0]!.announced=false;world.piles.find(p=>p.owner.type==='orbital-ship'&&p.item==='component')!.quantity--;
  const second=decoder.adopt(structuredClone(encoder.encode(world,0,1)));expect(second.status).toBe('applied');expect(first.world).toEqual(retained);
  if(second.status!=='applied')throw Error('Missing second view');const accepted=structuredClone(second.world);
  world.orbital!.rng=0;expect(decoder.adopt(structuredClone(encoder.encode(world,0,1))).status).toBe('resync');expect(second.world).toEqual(accepted);expect(first.world).toEqual(retained);
});
