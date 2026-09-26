import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyCommand} from '../src/sim/engine.ts';
import {addMaterial} from '../src/sim/materials.ts';
import {CLOTHING_RESEARCH_COST,FLAK_ARMOR_RESEARCH_COST,PLATE_ARMOR_RESEARCH_COST} from '../src/sim/research.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {startingPawn} from '../src/sim/starting-pawns.ts';

/** Explicit discovery setup from the immutable V101 machining scene. Research,
 * cloth and visual profiles are prepared; the vest is still made by gameplay. */
const source=fileURLToPath(new URL('../public/test-saves/v101/atelier.json',import.meta.url));
const world=deserializeWorld(readFileSync(source,'utf8'));
assert.equal(world.schemaVersion,109);
assert.deepEqual(world.pawns.map(p=>p.name),['Ada']);
const ada=world.pawns[0];
const looks=[
  {version:1,sex:'female',bodyType:'Female',headType:'Female_AverageNormal',hair:'Ponytails',beard:'NoBeard',skinColor:0xf2c78c,hairColor:0x5a3a20},
  {version:1,sex:'male',bodyType:'Male',headType:'Male_AverageWide',hair:'Mop',beard:'Full',skinColor:0xe49e5a,hairColor:0x333333},
  {version:1,sex:'female',bodyType:'Thin',headType:'Female_NarrowNormal',hair:'FancyBun',beard:'NoBeard',skinColor:0xffefc9,hairColor:0x84532f},
  {version:1,sex:'male',bodyType:'Hulk',headType:'Male_NarrowWide',hair:'Afro',beard:'Boxed',skinColor:0x634624,hairColor:0x191919},
  {version:1,sex:'female',bodyType:'Fat',headType:'Female_AverageWide',hair:'Curly',beard:'NoBeard',skinColor:0xf9dba5,hairColor:0x4f4742},
];
ada.appearance=looks[0];
for(const [index,[name,x,z]] of [['Noé',11,11],['Mina',13,13],['Ilyas',16,12],['Lou',18,12]].entries()){
  const pawn=startingPawn(world.nextId++,name,x,z,index+1,100,world.seed);
  pawn.appearance=looks[index+1];
  for(const work of Object.keys(pawn.priorities))pawn.priorities[work]=0;
  pawn.schedule.fill('work');pawn.hunger=100;pawn.rest=100;
  world.pawns.push(pawn);
}
for(const pawn of world.pawns){pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;pawn.schedule.fill('work');}
ada.priorities.craft=1;ada.planCooldown=0;
world.research.points=CLOTHING_RESEARCH_COST;world.research.completedAt=1000;
world.research.plateArmor={points:PLATE_ARMOR_RESEARCH_COST,completedAt:2001};
world.research.flakArmor={points:FLAK_ARMOR_RESEARCH_COST,completedAt:2002};
const station=world.structures.find(s=>s.kind==='machining-table');assert.ok(station);
assert.equal(station.bills.length,0);
addMaterial(world,'textile',30,{type:'ground',x:8,z:13},'cloth');
let result=applyCommand(world,{type:'bill-add',structureId:station.id,recipe:'make-flak-vest'});
assert.equal(result.ok,true,result.reason);
const bill=station.bills.at(-1);assert.ok(bill);
result=applyCommand(world,{type:'bill-update',structureId:station.id,billId:bill.id,settings:{...bill,destination:'drop'}});
assert.equal(result.ok,true,result.reason);
assert.equal(world.piles.some(p=>p.item==='flak-vest'||p.item==='unfinished-flak-vest'),false);
assert.deepEqual(validateWorld(world),[]);
const serialized=serializeWorld(world),restored=deserializeWorld(serialized);
assert.deepEqual(restored,world);
assert.equal(serializeWorld(restored),serialized);
const output=fileURLToPath(new URL('../public/test-saves/v109/visages-armurerie.json',import.meta.url));
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,serialized);
assert.equal(readFileSync(output,'utf8'),serialized);
process.stdout.write(JSON.stringify({output,sha256:createHash('sha256').update(serialized).digest('hex'),bytes:Buffer.byteLength(serialized),tick:world.tick,
  pawns:world.pawns.length,colonists:world.pawns.filter(p=>!p.visitor).length,names:world.pawns.map(p=>p.name),bodyTypes:world.pawns.map(p=>p.appearance.bodyType),
  bills:station.bills.map(b=>b.recipe),cloth:world.piles.filter(p=>p.item==='cloth').reduce((n,p)=>n+p.quantity,0),
  steel:world.piles.filter(p=>p.item==='steel').reduce((n,p)=>n+p.quantity,0),component:world.piles.filter(p=>p.item==='component').reduce((n,p)=>n+p.quantity,0)})+'\n');
