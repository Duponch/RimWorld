import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder} from '../src/bridge/snapshots.ts';
import {bombWaveRadius,validBombWaveShape,validateBombWaves,type MiniTurretBombWave} from '../src/sim/bomb-state.ts';
import {createBulletFlight} from '../src/sim/bullet-flight.ts';
import {validWeaponShape} from '../src/sim/equipment-save.ts';
import {validMechanoidEmpState,validStructureEmpState,validMechanoidEmpIntervals,validEmpStructureTransport} from '../src/sim/emp-save.ts';
import {refreshStock} from '../src/sim/materials.ts';
import {validGunWorkShape} from '../src/sim/gun-work.ts';
import {validMechanoidShape} from '../src/sim/mechanoid-save.ts';
import {validMeleeShape} from '../src/sim/melee-save.ts';
import {validWorldProjectile} from '../src/sim/projectile-save.ts';
import {registerWorldProjectile} from '../src/sim/projectile-system.ts';
import {rangedWeaponProfile} from '../src/sim/ranged-statistics.ts';
import {validShootingShape} from '../src/sim/shooting-save.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SCHEMA_VERSION,type MaterialPile,type World} from '../src/sim/types.ts';
import type {Mechanoid} from '../src/sim/mechanoid-state.ts';
import {validateWildlife} from '../src/sim/wildlife-save.ts';
import {animalCombatCamp} from './scenarios/animal-combat.ts';
import {medicalCamp} from './scenarios/health.ts';

function camp(){const w=medicalCamp();delete w.pawns[0]!.health;return w;}
function weapon(w:World):MaterialPile {
  const item:MaterialPile={id:w.nextId++,kind:'weapon',item:'emp-launcher',quantity:1,owner:{type:'ground',x:5,z:5},weapon:{quality:'normal',hitPoints:100}};
  w.piles.push(item);refreshStock(w);return item;
}
function machine(w:World):Mechanoid {
  const core=w.tick*10,m:Mechanoid={id:w.nextId++,mechKind:'scyther',x:8,z:8,state:'idle',path:[],heading:0,moveCooldown:0,planCooldown:0,
    emp:{lastAtCore:core,adaptedUntilCore:core+2200,stunUntilCore:core+1500}};
  w.mechanoids=[m];return m;
}
function wave(w:World):MiniTurretBombWave {
  const sourceId=w.nextId++,id=w.nextId++,center={x:10,z:10},core=w.tick*10;
  const value:MiniTurretBombWave={id,sourceId,instigatorKey:`pawn:${w.pawns[0]!.id}`,center,startedAtCore:core,advancedAtCore:core,
    cells:[center.z*w.width+center.x],nextCell:0,damagedThingKeys:[],emp:{quality:'normal'}};
  w.bombWaves=[value];return value;
}

test('schema207 migrates neutrally; an obtained EMP weapon requires208 but no fabrication research',()=>{
  const old=camp();old.schemaVersion=207 as World['schemaVersion'];
  expect(deserializeWorld(JSON.stringify(old))).toEqual({...old,schemaVersion:SCHEMA_VERSION});
  const w=camp(),pile=weapon(w);expect(validWeaponShape(pile as never,208)).toBe(true);expect(validWeaponShape(pile as never,207)).toBe(false);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  w.schemaVersion=207 as World['schemaVersion'];expect(()=>deserializeWorld(JSON.stringify(w))).toThrow('Invalid version 207 save');
});

test('the unfinished EMP recipe has its own prospective boundary and exact ingredient totals',()=>{
  const p={item:'unfinished-gun',kind:'unfinished',quantity:1,owner:{type:'ground',x:2,z:2},
    gunWork:{recipe:'make-emp-launcher',authorId:1,progress:0,parts:[{item:'steel',quantity:75},{item:'component',quantity:8}]}};
  expect(validGunWorkShape(p,208)).toBe(true);expect(validGunWorkShape(p,207)).toBe(false);
  expect(validGunWorkShape({...p,gunWork:{...p.gunWork,parts:[{item:'steel',quantity:74},{item:'component',quantity:9}]}},208)).toBe(false);
});

test('EMP shooting uses its own exact clocks and old schemas reject the profile',()=>{
  const core=30000,profile=rangedWeaponProfile('emp-launcher','normal')!;
  const state={order:{targetId:2,weaponId:3,startedDowned:false},stance:{phase:'aim',weaponItem:'emp-launcher',startedAtCore:core,
    endsAtCore:core+profile.warmupCoreTicks,targetStartedDowned:false,clock:{lastAdvancedAtCore:core,pausedCore:0}}};
  expect(validShootingShape(state,208,3000)).toBe(true);expect(validShootingShape(state,207,3000)).toBe(false);
  expect(validShootingShape({...state,order:{...state.order,hunt:true}},208,3000)).toBe(false);
  expect(validShootingShape({...state,stance:{...state.stance,endsAtCore:core+18}},208,3000)).toBe(false);
});

test('persistent EMP projectiles use the actual profile and retain the ordinary impact envelope',()=>{
  const w=camp(),profile=rangedWeaponProfile('emp-launcher','normal')!,pawn=w.pawns[0]!;
  const p=registerWorldProjectile(w,createBulletFlight({origin:{x:5.5,z:5.5},destination:{x:15.5,z:5.5},
    launcherKey:`pawn:${pawn.id}`,equipmentKey:null,intendedKey:null,usedKey:null,flags:7,preventFriendlyFire:false,
    speedPerCoreTick:profile.projectileTilesPerCoreTick}),'normal',{friendlyPawnIds:[pawn.id],friendlyFireFactor:.4},w.rng,w.tick*10,'emp-launcher');
  expect(validWorldProjectile(p,w,208)).toBe(true);expect(validWorldProjectile(p,w,207)).toBe(false);
  expect(validWorldProjectile({...p,flight:{...p.flight,speedPerCoreTick:.55}},w,208)).toBe(false);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('EMP waves keep retired projectile identities without borrowing the old turret explosive authority',()=>{
  const w=camp(),value=wave(w),errors:string[]=[];
  expect(validBombWaveShape(value,208)).toBe(true);expect(validBombWaveShape(value,207)).toBe(false);expect(bombWaveRadius(value)).toBe(1.1);
  validateBombWaves(w,errors,new Set(w.pawns.map(p=>p.id)));expect(errors).toEqual([]);
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const bad=structuredClone(w);bad.piles.push({id:value.sourceId,kind:'component',item:'component',quantity:1,owner:{type:'ground',x:2,z:2}});
  const collision:string[]=[];validateBombWaves(bad,collision,new Set([...bad.pawns,...bad.piles].map(p=>p.id)));expect(collision).toContain('Invalid EMP projectile provenance.');
  for(const patch of [{emp:{quality:'unknown'}},{emp:{quality:'normal',extra:1}},{instigatorKey:'structure:1'},
    {shortCircuit:{damage:'flame',radius:1.5,seed:1}},{sourceId:value.id}])expect(validBombWaveShape({...value,...patch},208)).toBe(false);
});

test('EMP geometry is bounded and malformed neighboring entries return errors without throwing',()=>{
  const w=camp(),value=wave(w);value.cells=[value.center.z*w.width+value.center.x+2];
  const errors:string[]=[];validateBombWaves(w,errors);expect(errors).toContain('Invalid bomb wave cells/cursor.');
  expect(validBombWaveShape({...value,cells:new Array(1)},208)).toBe(false);
  w.bombWaves!.push(null as never);expect(()=>validateBombWaves(w,[])).not.toThrow();
});

test('a retained live projectile must match EMP quality, owner, impact clock and cell exactly',()=>{
  const w=camp(),core=w.tick*10,pawn=w.pawns[0]!;
  const p=registerWorldProjectile(w,createBulletFlight({origin:{x:5.5,z:5.5},destination:{x:5.7,z:5.5},launcherKey:`pawn:${pawn.id}`,
    equipmentKey:null,intendedKey:null,usedKey:null,flags:7,preventFriendlyFire:false,speedPerCoreTick:.4}),
    'normal',{friendlyPawnIds:[pawn.id],friendlyFireFactor:.4},w.rng,core-1,'emp-launcher');
  p.flight.completed=true;p.flight.remainingCoreTicks=0;p.advancedAtCore=core;
  p.arrival={kind:'impact',targetKey:null,point:{x:5.7,z:5.5},coreTick:1,effect:'ground'};
  w.bombWaves=[{id:w.nextId++,sourceId:p.id,instigatorKey:`pawn:${pawn.id}`,center:{x:5,z:5},startedAtCore:core,advancedAtCore:core,
    cells:[5*w.width+5],nextCell:0,damagedThingKeys:[],emp:{quality:'normal'}}];
  const errors:string[]=[];validateBombWaves(w,errors,new Set([...w.pawns.map(p=>p.id),p.id]));expect(errors).toEqual([]);
  for(const mutate of [
    (v:World)=>{v.bombWaves![0]!.emp!.quality='legendary';},
    (v:World)=>{v.bombWaves![0]!.center.x++;},
    (v:World)=>{v.bombWaves![0]!.startedAtCore--;},
    (v:World)=>{v.projectiles![0]!.flight=undefined as never;},
  ]){const bad=structuredClone(w);mutate(bad);const rejected:string[]=[];
    expect(()=>validateBombWaves(bad,rejected,new Set([...bad.pawns.map(p=>p.id),p.id]))).not.toThrow();
    expect(rejected).toContain('Invalid EMP projectile provenance.');}
});

test('mechanical adaptation, normal stun and biological stun have distinct strict clocks',()=>{
  const w=camp(),m=machine(w),emp=m.emp!,core=w.tick*10;
  expect(validMechanoidShape(m,208,w.tick)).toBe(true);expect(validMechanoidShape(m,207,w.tick)).toBe(false);
  expect(validMechanoidEmpState({...emp,adaptedUntilCore:core+2199},208,w.tick)).toBe(false);
  expect(validMechanoidEmpState({...emp,stunUntilCore:core+1501},208,w.tick)).toBe(false);
  expect(validMechanoidEmpState({...emp,stunUntilCore:core},208,w.tick,true)).toBe(true);
  expect(validMechanoidEmpState({...emp,stunUntilCore:core},208,w.tick)).toBe(true); // recovered after an earlier downing
  expect(validMechanoidEmpState(emp,208,w.tick+225)).toBe(false);
  expect(validMechanoidShape({...m,stun:{sinceCore:core,untilCore:core+1500}},208,w.tick)).toBe(false);
  expect(validMechanoidEmpIntervals([{start:w.tick,end:emp.stunUntilCore/10}],208,w.tick,w.tick,emp)).toBe(true);
  expect(validMechanoidEmpIntervals([{start:w.tick,end:emp.stunUntilCore/10}],207,w.tick,w.tick,emp)).toBe(false);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});

test('EMP recovery pauses belong only to mechanical208 strikes with an exact bounded watermark',()=>{
  const w=camp(),m=machine(w),core=w.tick*10;
  m.melee={order:null,strike:{targetId:w.pawns[0]!.id,atCore:core-10,untilCore:core+115,tool:'head',outcome:'miss',
    empPause:{ticks:5,lastAtCore:core}}};
  expect(validMechanoidShape(m,208,w.tick)).toBe(true);expect(validMechanoidShape(m,207,w.tick)).toBe(false);
  expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  expect(validMeleeShape(m.melee,208,w.tick)).toBe(false);
  for(const patch of [{ticks:11,lastAtCore:core},{ticks:5,lastAtCore:core-1},{ticks:5,lastAtCore:core,extra:1}]){
    const bad=structuredClone(m);bad.melee!.strike!.empPause=patch;
    expect(validMechanoidShape(bad,208,w.tick)).toBe(false);
  }
  const wrong=structuredClone(m);wrong.melee!.strike!.untilCore++;
  expect(validMechanoidShape(wrong,208,w.tick)).toBe(false);
  delete m.emp;expect(validMechanoidShape(m,208,w.tick)).toBe(true); // recovery retains its own clock after effect expiry
  const animals=animalCombatCamp(),a=animals.wildlife!.animals[0]!;
  a.strike={targetId:animals.pawns[0]!.id,atCore:animals.tick*10,untilCore:animals.tick*10+120,tool:'teeth',outcome:'miss',
    empPause:{ticks:0,lastAtCore:animals.tick*10}} as typeof a.strike;
  expect(validateWildlife(animals,208,new Set())).toContain('Invalid animal melee recovery.');
});

test('device disabling permits refreshed duration but rejects stale, unsupported and future owners',()=>{
  const tick=3000,core=tick*10;
  expect(validStructureEmpState({sinceCore:core-2000,untilCore:core+1500},'battery',208,tick)).toBe(true);
  for(const [state,kind,version] of [[{sinceCore:core,untilCore:core+1500},'battery',207],
    [{sinceCore:core,untilCore:core+1500},'standing-lamp',208],[{sinceCore:core,untilCore:core},'battery',208],
    [{sinceCore:core,untilCore:core+2251},'battery',208],[{sinceCore:core,untilCore:core+1500,extra:1},'battery',208]] as const)
    expect(validStructureEmpState(state,kind,version,tick)).toBe(false);
  const w=camp();w.packed=[{building:{id:w.nextId++,kind:'battery',x:3,z:3,orientation:0,footprint:'standard',
    emp:{sinceCore:core,untilCore:core+1500}},owner:{type:'ground',x:4,z:4}}];
  expect(validEmpStructureTransport(w,208)).toBe(true);expect(validEmpStructureTransport(w,207)).toBe(false);
  w.packed[0]!.building.kind='standing-lamp';expect(validEmpStructureTransport(w,208)).toBe(false);
});

test('Decoder medical/effect copies are independent and invalid EMP deltas resync atomically',()=>{
  const w=camp();machine(w);const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
  const first=decoder.adopt(structuredClone(encoder.encode(w,0,6)));expect(first.status).toBe('applied');
  if(first.status!=='applied')throw Error('checkpoint');const before=structuredClone(first.world);
  w.mechanoids![0]!.emp!.adaptedUntilCore++;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,6))).status).toBe('resync');expect(first.world).toEqual(before);
  w.mechanoids![0]!.emp!.adaptedUntilCore--;
  expect(decoder.adopt(structuredClone(encoder.encode(w,0,6,true))).status).toBe('applied');expect(first.world).toEqual(before);
});
