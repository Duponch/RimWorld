import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder,type SnapshotMessage } from '../src/bridge/snapshots.ts';
import { applyCommand,stepWorld } from '../src/sim/engine.ts';
import { miniTurretExplosive } from '../src/sim/bomb-creation.ts';
import { applyStructureExternalDamage } from '../src/sim/bomb-system.ts';
import { deserializeWorld,serializeWorld,validateWorld } from '../src/sim/serialization.ts';
import type { World } from '../src/sim/types.ts';
import { campTurret,miniTurretCamp } from './scenarios/mini-turret-v212.ts';
import { producedTurretServiceCheckpoint } from './helpers/mini-turret-v212.ts';

const adopt=(decoder:SnapshotDecoder,packet:SnapshotMessage):World=>{const r=decoder.adopt(packet);if(r.status!=='applied')throw Error(JSON.stringify(r));return r.world;};
test('same-tick policies and real cooldown checkpoint/deltas reject corruption without losing the accepted revision',()=>{
  for(const checkpoint of [false,true]){
    const {world}=producedTurretServiceCheckpoint(),turret=campTurret(world),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
    const before=adopt(decoder,structuredClone(encoder.encode(world,0,0))),raw=JSON.stringify(before);
    expect(applyCommand(world,{type:'turret-auto-reload',structureId:turret.id,enabled:true}).ok).toBe(true);
    const good=structuredClone(encoder.encode(world,0,0,checkpoint));
    const corruptions:Array<(m:SnapshotMessage)=>void>=[
      m=>{m.world.structures.find(s=>s.id===turret.id)!.turret!.ammoQ=241;},
      m=>{m.world.structures.find(s=>s.id===turret.id)!.turret!.cooldownCore=-1;},
      m=>{Object.assign(m.world.structures.find(s=>s.id===turret.id)!.turret!,{autoReload:undefined});},
      m=>{Object.assign(m.world.structures.find(s=>s.id===turret.id)!.turret!,{future:true});},
      m=>{m.world.structures.find(s=>s.id===turret.id)!.turret!.targetKey=`pawn:${turret.id}`;},
      m=>{m.world.structures.find(s=>s.id===turret.id)!.orientation=1;},
      m=>{Object.assign(m.world.pawns[0]!,{bombRefuge:undefined});},
    ];
    for(const corrupt of corruptions){const bad=structuredClone(good);corrupt(bad);expect(decoder.adopt(bad).status).toBe('resync');expect(JSON.stringify(before)).toBe(raw);}
    expect(adopt(decoder,good)).toEqual(world);expect(JSON.stringify(before)).toBe(raw);expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  }
});
test('192 refuses new own-properties even when undefined, with no turret required to detect the future field',()=>{
  const w=miniTurretCamp();w.structures=w.structures.filter(s=>s.kind!=='mini-turret');delete w.research?.gunTurrets;
  const packet=structuredClone(new SnapshotEncoder().encode(w,0,0));(packet.world as {schemaVersion:number}).schemaVersion=192;
  expect(new SnapshotDecoder().adopt(packet).status).toBe('applied');
  for(const key of ['bombWaves','research','pawn','structure']){
    const bad=structuredClone(packet);
    if(key==='bombWaves')Object.assign(bad.world,{bombWaves:undefined});
    else if(key==='research')bad.world.research={points:0,project:null,gunTurrets:undefined};
    else if(key==='pawn')Object.assign(bad.world.pawns[0]!,{bombRefuge:undefined});
    else Object.assign(bad.world.structures[0]!,{turret:undefined});
    expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');
  }
});
test('real damage produces a retained wave and physical refuge; identity/cursor corruption never adopts a partial World',()=>{
  const w=miniTurretCamp(),s=campTurret(w);s.turret!.holdFire=true;s.turret!.autoReload=false;
  let id=w.nextId;while(!miniTurretExplosive(id))id++;s.id=id;w.nextId=id+1;s.damage=79;
  const p=w.pawns[0]!;p.x=s.x+1;p.z=s.z;
  expect(applyStructureExternalDamage(w,s,1,1,'melee')).toBe(true);expect(s.turret!.wick).toBeDefined();
  stepWorld(w);expect(p.bombRefuge).toBeDefined();expect(validateWorld(w)).toEqual([]);
  const refugePacket=structuredClone(new SnapshotEncoder().encode(w,0,0));expect(new SnapshotDecoder().adopt(refugePacket).status).toBe('applied');
  const badRefuge=structuredClone(refugePacket);badRefuge.world.pawns[0]!.bombRefuge!.target={x:s.x,z:s.z};expect(new SnapshotDecoder().adopt(badRefuge).status).toBe('resync');
  for(let tick=0;tick<30&&!w.bombWaves;tick++)stepWorld(w);
  expect(w.bombWaves?.length).toBe(1);expect(w.structures.some(t=>t.id===s.id)).toBe(false);expect(validateWorld(w)).toEqual([]);
  const packet=structuredClone(new SnapshotEncoder().encode(w,0,0));expect(adopt(new SnapshotDecoder(),packet)).toEqual(w);
  for(const corrupt of [
    (m:SnapshotMessage)=>{m.world.bombWaves![0]!.id=m.world.pawns[0]!.id;},
    (m:SnapshotMessage)=>{m.world.bombWaves![0]!.nextCell=-1;},
    (m:SnapshotMessage)=>{m.world.bombWaves![0]!.advancedAtCore=m.world.tick*10+1;},
  ]){const bad=structuredClone(packet);corrupt(bad);expect(new SnapshotDecoder().adopt(bad).status).toBe('resync');}
  expect(deserializeWorld(serializeWorld(w))).toEqual(w);
});
