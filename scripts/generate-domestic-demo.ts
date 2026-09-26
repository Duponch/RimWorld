import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {addMaterial} from '../src/sim/materials.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {domesticColony} from '../tests/scenarios/domestic-colony.ts';

/** Prepared discovery scene: ownership and wound are explicit setup facts.
 * The second wild hare must be tamed by the actual game after loading. */
const world=domesticColony();
// Demo-only supplies allow repeated real attempts and meals. The compact test
// fixture remains at twelve berries and four herbal medicines.
addMaterial(world,'food',63,{type:'ground',x:8,z:10},'berries');
addMaterial(world,'food',10,{type:'ground',x:7,z:10},'survival-meal');
addMaterial(world,'food',10,{type:'ground',x:7,z:11},'survival-meal');
world.pawns[0]!.foodPolicyId=2; // Existing « Repas uniquement » policy reserves raw berries for animal care.
const bed={id:world.nextId++,kind:'bed' as const,x:9,z:9,orientation:0 as const,
  footprint:'standard' as const,material:'wood' as const,quality:'normal' as const};
world.structures.push(bed);world.pawns[0]!.bedId=bed.id;
world.pawns[0]!.schedule.fill('anything');
assert.equal(world.schemaVersion,106);
assert.equal(world.pawns.length,1);
assert.equal(world.wildlife?.animals.length,2);
assert.equal(world.wildlife.animals.filter(a=>!!a.domestic).length,1);
assert.equal(world.wildlife.animals.filter(a=>!!a.taming).length,0);
assert.equal(world.piles.filter(p=>p.item==='berries'&&p.owner.type==='ground').reduce((n,p)=>n+p.quantity,0),75);
assert.equal(world.piles.filter(p=>p.item==='survival-meal'&&p.owner.type==='ground').reduce((n,p)=>n+p.quantity,0),20);
assert.equal(world.pawns[0]!.foodPolicyId,2);
assert.equal(world.structures.find(s=>s.id===world.pawns[0]!.bedId)?.kind,'bed');
assert.deepEqual(validateWorld(world),[]);
const serialized=serializeWorld(world),restored=deserializeWorld(serialized);
assert.deepEqual(restored,world);
assert.equal(serializeWorld(restored),serialized);
const output=fileURLToPath(new URL('../public/test-saves/v106/lievres.json',import.meta.url));
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,serialized);
assert.equal(readFileSync(output,'utf8'),serialized);
process.stdout.write(JSON.stringify({output,sha256:createHash('sha256').update(serialized).digest('hex'),
  tick:world.tick,pawns:world.pawns.length,ownedHares:1,wildHares:1,
  rawFood:75,survivalMeals:20,herbalMedicine:4,bytes:Buffer.byteLength(serialized)})+'\n');

if(process.argv.includes('--probe')) {
  const probe=deserializeWorld(serialized),target=probe.wildlife!.animals.find(a=>!a.domestic)!;
  const ordered=applyCommand(probe,{type:'tame',animalId:target.id,enabled:true});
  assert.equal(ordered.ok,true,ordered.reason);
  const observations:{tick:number;message:string}[]=[];
  let minHunger=probe.pawns[0]!.hunger,minRest=probe.pawns[0]!.rest,minMood=probe.pawns[0]!.mood,crisisTicks=0;
  for(let i=0;i<12000&&!target.domestic;i++) {
    stepWorld(probe);const colon=probe.pawns[0]!;
    minHunger=Math.min(minHunger,colon.hunger);minRest=Math.min(minRest,colon.rest);minMood=Math.min(minMood,colon.mood);
    if(colon.mental?.crisis)crisisTicks++;
    for(const e of probe.events)if(e.tick===probe.tick&&e.message.includes('apprivois'))observations.push({tick:e.tick,message:e.message});
    if(i%1000===0)assert.deepEqual(validateWorld(probe),[],`Invalid prepared demo at tick ${probe.tick}`);
  }
  assert.deepEqual(validateWorld(probe),[]);
  process.stdout.write(JSON.stringify({probe:'domestic-taming',tick:probe.tick,elapsed:probe.tick-world.tick,
    tamed:!!target.domestic,colonistAlive:probe.pawns[0]!.state!=='dead',minHunger,minRest,minMood,crisisTicks,
    berries:probe.piles.filter(p=>p.item==='berries').reduce((n,p)=>n+p.quantity,0),
    survivalMeals:probe.piles.filter(p=>p.item==='survival-meal').reduce((n,p)=>n+p.quantity,0),observations})+'\n');
}
