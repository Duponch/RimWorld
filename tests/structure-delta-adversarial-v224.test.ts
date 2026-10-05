import { expect,test } from 'vitest';
import { SnapshotDecoder,SnapshotEncoder } from '../src/bridge/snapshots.ts';
import { applyCommand } from '../src/sim/engine.ts';
import { addMaterial } from '../src/sim/materials.ts';
import { SCHEMA_VERSION,type Structure } from '../src/sim/types.ts';
import { fixtureBuilding } from './scenarios/deconstruction.ts';
import { campTurret,miniTurretCamp } from './scenarios/mini-turret-v212.ts';

test('structure patches preserve full cross-owner namespace, dense arrays and version refusal without consuming revision',()=>{
  const world=miniTurretCamp(),wall:Structure=fixtureBuilding(world,'wall',3,3),turret=campTurret(world);
  addMaterial(world,'wood',1,{type:'ground',x:2,z:2});
  const pile=world.piles.find(p=>p.item==='wood'&&p.owner.type==='ground'&&p.owner.x===2&&p.owner.z===2)!;
  expect(pile).toBeDefined();expect(applyCommand(world,{type:'planet-adopt'}).ok).toBe(true);
  const encoder=new SnapshotEncoder({structureDelta:true}),decoder=new SnapshotDecoder();
  const initial=decoder.adopt(structuredClone(encoder.encode(world,0,0)));
  expect(initial.status).toBe('applied');if(initial.status!=='applied')throw Error('Checkpoint refused');
  const before=structuredClone(initial.world);
  expect(applyCommand(world,{type:'turret-hold-fire',structureId:turret.id,enabled:true}).ok).toBe(true);
  const packet=structuredClone(encoder.encode(world,0,0));
  if(packet.kind!=='delta'||!packet.structures)throw Error('Sparse delta required');
  for(const collisionId of [wall.id,pile.id,world.pawns[0]!.id]){
    const bad=structuredClone(packet);
    // Updating an existing building once is legal. Two patch entries for that
    // ID are not; a new building with a pile/actor ID must fail the full guard.
    const candidate:Structure={id:collisionId,kind:'wall',x:2,z:4,orientation:0,footprint:'standard'};
    bad.structures!.upserted.push(candidate);
    if(collisionId===wall.id)bad.structures!.upserted.push(structuredClone(candidate));
    expect(decoder.adopt(bad).status).toBe('resync');
  }
  for(const location of ['removed','upserted','order'] as const){
    const side=structuredClone(packet);
    if(location==='order')side.structures!.order=world.structures.map(s=>s.id);
    Object.assign(side.structures![location]!,{unexpected:true});
    expect(decoder.adopt(side).status).toBe('resync');
    const hole=structuredClone(packet);
    if(location==='order')hole.structures!.order=world.structures.map(s=>s.id);
    hole.structures![location]!.length+=1;
    expect(decoder.adopt(hole).status).toBe('resync');
  }
  for(const version of [SCHEMA_VERSION+1,NaN,Infinity,0,SCHEMA_VERSION+.5]){
    const future=structuredClone(packet);(future.world as {schemaVersion:number}).schemaVersion=version;
    expect(decoder.adopt(future)).toEqual({status:'resync',reason:'Version de schéma du snapshot invalide.'});
  }
  const checkpoint=structuredClone(encoder.encode(world,0,0,true));
  Object.assign(checkpoint,{structures:{removed:[],upserted:[]}});
  expect(decoder.adopt(checkpoint).status).toBe('resync');
  expect(initial.world).toStrictEqual(before);
  const accepted=decoder.adopt(packet);expect(accepted.status).toBe('applied');
  if(accepted.status==='applied')expect(accepted.world).toStrictEqual(world);
});
