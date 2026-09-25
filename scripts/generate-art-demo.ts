import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {PRODUCTION_RECIPES} from '../src/sim/production-recipes.ts';
import {addGroundMaterial,refreshStock} from '../src/sim/materials.ts';
import {captureRoomQuality} from '../src/sim/room-quality.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import type {Command,World} from '../src/sim/types.ts';

/** Prepared V104 discovery scene resumed from the immutable V103 rooms save.
 * The large sculpture is genuinely produced and installed by the engine. */
const source=fileURLToPath(new URL('../public/test-saves/v103/salles.json',import.meta.url));
const world=deserializeWorld(readFileSync(source,'utf8'));
const artist=world.pawns[0]!;
assert.equal(world.schemaVersion,104);
assert.equal(world.width,32);
assert.equal(world.pawns.length,1);
assert.equal(world.structures.some(s=>s.kind==='small-sculpture'||s.kind==='large-sculpture'),false);

// Prepared supplies and a manual art bench are explicit demonstration fixtures.
artist.hunger=100;artist.rest=100;artist.recreation.level=100;
artist.schedule.fill('anything');
for(const work of Object.keys(artist.priorities) as (keyof typeof artist.priorities)[])artist.priorities[work]=0;
artist.priorities.art=1;artist.priorities.haul=1;artist.priorities.build=1;
artist.skills.artistic={level:12,xp:0,dailyXp:0,passion:1};
if(world.wildlife)world.wildlife.animals=[];
delete world.arrivals;delete world.raids;
const bench={id:world.nextId++,kind:'art-bench' as const,x:13,z:12,orientation:0 as const,
  footprint:'standard' as const,material:'wood' as const,bills:[]};
world.structures.push(bench);
addGroundMaterial(world,'blocks',75,{x:16,z:12},'marble-blocks');
addGroundMaterial(world,'blocks',25,{x:17,z:12},'marble-blocks');
addGroundMaterial(world,'wood',50,{x:16,z:14},'wood');
addGroundMaterial(world,'food',10,{x:17,z:16},'simple-meal');
refreshStock(world);

const command=(value:Command):void=>{
  const result=applyCommand(world,value);
  assert.equal(result.ok,true,`${JSON.stringify(value)}: ${result.reason}`);
};
const until=(done:()=>boolean,limit:number):number=>{
  for(let count=0;count<limit;count++){
    if(done())return count;
    stepWorld(world);
    if(count%250===0)assert.deepEqual(validateWorld(world),[],`Invalid demo at tick ${world.tick}`);
  }
  assert.fail(`Prepared art work did not finish by tick ${world.tick}: ${JSON.stringify({artist:{x:artist.x,z:artist.z,state:artist.state,priorities:artist.priorities,task:artist.task},jobs:world.jobs.filter(j=>j.kind==='install'),packed:world.packed.map(p=>({id:p.building.id,owner:p.owner}))})}`);
};

command({type:'bill-add',structureId:bench.id,recipe:'large-sculpture'});
const first=bench.bills[0]!;
command({type:'bill-update',structureId:bench.id,billId:first.id,settings:{...first,
  filters:Object.fromEntries(PRODUCTION_RECIPES['large-sculpture'].inputs.map(item=>[item,item==='marble-blocks'])),
  destination:'drop'}});
const workTicks=until(()=>world.packed.some(p=>p.building.kind==='large-sculpture'&&p.owner.type==='ground'),14000);
const pack=world.packed.find(p=>p.building.kind==='large-sculpture')!;
assert.equal(pack.building.material,'marble-blocks');
assert.equal(pack.building.art?.authorId,artist.id);
assert.equal(world.piles.some(p=>p.item==='unfinished-sculpture'),false);
command({type:'install',structureId:pack.building.id,x:16,z:17,orientation:0});
const installTicks=until(()=>world.structures.some(s=>s.id===pack.building.id),6000);
const installed=world.structures.find(s=>s.id===pack.building.id)!;
assert.equal(installed,pack.building);
assert.equal(world.packed.some(p=>p.building.id===installed.id),false);
assert.equal(world.piles.filter(p=>p.item==='marble-blocks').reduce((n,p)=>n+p.quantity,0),0);
assert.equal(world.piles.filter(p=>p.item==='wood').reduce((n,p)=>n+p.quantity,0),50);

// The player adds and configures the small wood bill through the real UI.
assert.equal(bench.bills[0]!.target,0);
assert.equal(artist.skills.artistic!.xp>0,true);
assert.deepEqual(validateWorld(world),[]);
const quality=captureRoomQuality(world).room({x:16,z:17});
assert.ok(quality&&quality.wealth>0&&quality.total>0);
const serialized=serializeWorld(world),loaded=deserializeWorld(serialized);
assert.deepEqual(loaded,world,'Reload must preserve the prepared, engine-produced scene');
assert.equal(serializeWorld(loaded),serialized,'Reload serialization must match byte for byte');
const output=fileURLToPath(new URL('../public/test-saves/v104/sculpture.json',import.meta.url));
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,serialized);
assert.equal(readFileSync(output,'utf8'),serialized);
assert.deepEqual(deserializeWorld(readFileSync(output,'utf8')),world);
process.stdout.write(JSON.stringify({output,tick:world.tick,workTicks,installTicks,
  artist:artist.name,installedId:installed.id,quality:installed.quality,
  beauty:quality.beauty,wealth:quality.wealth,bytes:Buffer.byteLength(serialized)})+'\n');
