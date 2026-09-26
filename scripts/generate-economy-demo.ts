import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyCommand} from '../src/sim/engine.ts';
import {furnitureDropCell} from '../src/sim/furniture-transfer.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {colonyWealth} from '../src/sim/colony-wealth.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {visitorTradeFixture} from '../tests/scenarios/visitors.ts';
import type {PackedFurniture} from '../src/sim/furniture-rules.ts';

/** Explicitly prepared discovery scene. The merchant and finite stock are
 * produced by the normal visitor generator; contact and sale remain gameplay. */
const {world,traderId,pawnId}=visitorTradeFixture();
assert.equal(world.schemaVersion,105);
assert.equal(world.pawns.filter(p=>!p.visitor).length,1);
assert.equal(world.pawns.find(p=>p.id===traderId)?.visitor?.role,'trader');
delete world.economy; // Historical adoption is a player action in this demo.
const home=applyCommand(world,{type:'area',action:'home',from:{x:11,z:14},to:{x:17,z:19}});
assert.equal(home.ok,true,home.reason);
addMaterial(world,'silver',180,{type:'ground',x:14,z:16},'silver');
addMaterial(world,'wood',24,{type:'ground',x:15,z:16},'wood');
const drop=furnitureDropCell(world,{x:13,z:17});
assert.ok(drop,'A physical ground cell must be available for the prepared sculpture.');
const art:PackedFurniture={building:{id:world.nextId++,kind:'small-sculpture',x:drop.x,z:drop.z,
  orientation:0,footprint:'standard',material:'marble-blocks',quality:'good',
  art:{authorId:pawnId,createdAt:world.tick}},owner:{type:'ground',...drop}};
world.packed.push(art);
assert.equal(world.trade?.count??0,0);
assert.deepEqual(validateWorld(world),[]);
const wealth=colonyWealth(world);
assert.ok(wealth.knownTotal>180&&wealth.knownTotal<1000,`Unexpected demo wealth ${wealth.knownTotal}`);
const serialized=serializeWorld(world),restored=deserializeWorld(serialized);
assert.deepEqual(restored,world);
assert.equal(serializeWorld(restored),serialized);
const output=fileURLToPath(new URL('../public/test-saves/v105/economie.json',import.meta.url));
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,serialized);
assert.equal(readFileSync(output,'utf8'),serialized);
process.stdout.write(JSON.stringify({output,sha256:createHash('sha256').update(serialized).digest('hex'),
  tick:world.tick,pawns:world.pawns.length,colonists:1,traderId,pawnId,artId:art.building.id,
  merchantSilver:world.piles.filter(p=>p.item==='silver'&&p.owner.type==='inventory'&&p.owner.pawnId===traderId).reduce((n,p)=>n+p.quantity,0),
  wealth:wealth.knownTotal,bytes:Buffer.byteLength(serialized)})+'\n');
