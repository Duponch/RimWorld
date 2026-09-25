import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {stepWorld} from '../src/sim/engine.ts';
import {defaultSchedule} from '../src/sim/schedule.ts';
import {captureRoomQuality} from '../src/sim/room-quality.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {roomExperienceCamp} from '../tests/scenarios/room-experience.ts';

/** Prepared V103 discovery save, separate from a naturally progressed colony. */
const world=roomExperienceCamp(),pawn=world.pawns[0]!;
const building=(kind:'table'|'stool'|'bed'|'horseshoes',x:number,z:number)=>{
  const structure={id:world.nextId++,kind,x,z,orientation:0 as const,footprint:'standard' as const,
    ...(kind==='bed'||kind==='table'||kind==='stool'?{material:'wood' as const,quality:'normal' as const}:{})};
  world.structures.push(structure);return structure;
};
building('table',18,15);
building('stool',17,15);
const bed=building('bed',18,18);
building('horseshoes',12,15);
addGroundMaterial(world,'food',3,{x:16,z:15},'simple-meal');
refreshStock(world);
pawn.bedId=bed.id;pawn.hunger=20;pawn.rest=75;pawn.schedule=defaultSchedule();

assert.equal(world.schemaVersion,103);
assert.equal(world.pawns.length,1);
assert.equal(pawn.need,null);
assert.equal(pawn.recreation.task,null);
assert.equal(pawn.roomMemories,undefined);
assert.ok(world.structures.some(s=>s.kind==='door'&&s.x===15&&s.z===8));
assert.ok(captureRoomQuality(world).room(pawn)!.stage>=3);
assert.deepEqual(validateWorld(world),[]);
const serialized=serializeWorld(world),loaded=deserializeWorld(serialized);
assert.deepEqual(loaded,world,'Reload must preserve the entire prepared scene');
assert.equal(serializeWorld(loaded),serialized,'Reload serialization must match byte for byte');
const firstAction=deserializeWorld(serialized);stepWorld(firstAction,5);
assert.equal(firstAction.pawns[0]!.need?.kind,'eat','The prepared colonist must seek the first meal');
const output=fileURLToPath(new URL('../public/test-saves/v103/salles.json',import.meta.url));
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,serialized);
const fromDisk=readFileSync(output,'utf8');
assert.equal(fromDisk,serialized);assert.deepEqual(deserializeWorld(fromDisk),world);
process.stdout.write(JSON.stringify({output,tick:world.tick,stage:captureRoomQuality(world).room(pawn)!.stage,bytes:Buffer.byteLength(serialized)})+'\n');
