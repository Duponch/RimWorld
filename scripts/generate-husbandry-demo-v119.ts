import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {PEN_ANIMALS,penRegion} from '../src/sim/animal-pens.ts';
import {faunaBiome} from '../src/sim/animal-species.ts';
import {newDoorState} from '../src/sim/door-rules.ts';
import {createWorld,stepWorld} from '../src/sim/engine.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {enableWildlife} from '../src/sim/wildlife.ts';
import type {Pawn,Structure} from '../src/sim/types.ts';

/** Prepared discovery scene. Ownership, materials and perimeter are supplied;
 * leading, taming, grazing and all later transitions still run in the engine. */
const world=createWorld(731,32,32);world.tick=2000;world.rng=731;
world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.resources=[];world.jobs=[];world.structures=[];
world.piles=[];world.stockpiles=[];world.growingZones=[];world.pawns=world.pawns.slice(0,2);
for(const pawn of world.pawns){
  pawn.hunger=100;pawn.rest=100;pawn.bedId=null;pawn.schedule.fill('anything');
  for(const key of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[])pawn.priorities[key]=0;
}
world.resources.push({id:world.nextId++,kind:'berries',x:10,z:10,amount:10,growth:1,growthTick:world.tick});
enableWildlife(world,1);
const handler=world.pawns[0]!,other=world.pawns[1]!;
handler.x=9;handler.z=17;handler.priorities.hunt=0;handler.priorities.handle=1;
other.x=7;other.z=17;
const deer=world.wildlife!.animals[0]!;
Object.assign(deer,{species:'deer' as const,x:10,z:17,food:1.2,rest:1,path:[],motion:undefined,state:'idle' as const,nextDecision:world.tick+100});
delete deer.motion;
deer.domestic={since:world.tick,care:'herbal',tameness:5,nextDecay:world.tick+45000,lastTraining:world.tick};
const wild=structuredClone(deer);wild.id=world.nextId++;wild.x=10;wild.z=15;delete wild.domestic;
world.wildlife!.animals.push(wild);
const biome=faunaBiome('temperate-forest'),full=world.width*world.height*biome.animalDensity/10000;
world.wildlife!.profile='biome-herbivores-v1';
world.wildlife!.population={biome:'temperate-forest',fullTargetWeight:full,targetWeight:full*biome.entries.reduce((n,e)=>n+e.commonality,0)/biome.totalCommonality,nextCheck:world.tick+122,checks:0,arrivals:0};
const add=(kind:Structure['kind'],x:number,z:number)=>{
  const s:Structure={id:world.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'wood'};
  if(kind==='fence-gate')s.door=newDoorState(world.tick);
  if(kind==='pen-marker')s.pen={accepted:[...PEN_ANIMALS]};
  world.structures.push(s);return s;
};
for(let x=14;x<=18;x++){add('fence',x,14);add('fence',x,18);}
for(let z=15;z<18;z++){add(z===16?'fence-gate':'fence',14,z);add('fence',18,z);}
const marker=add('pen-marker',16,16);
addMaterial(world,'food',40,{type:'ground',x:17,z:16},'berries');
addMaterial(world,'food',40,{type:'ground',x:9,z:15},'berries');
addMaterial(world,'food',9,{type:'ground',x:8,z:17},'survival-meal');
addMaterial(world,'food',9,{type:'ground',x:8,z:18},'survival-meal');
refreshStock(world);
assert.deepEqual(validateWorld(world),[]);
assert.deepEqual(penRegion(world,marker.id)&&{closed:penRegion(world,marker.id)!.closed,accessible:penRegion(world,marker.id)!.accessible},{closed:true,accessible:true});
const serialized=serializeWorld(world);
assert.deepEqual(deserializeWorld(serialized),world);
const output=fileURLToPath(new URL('../public/test-saves/v119/enclos.json',import.meta.url));
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,serialized);
const sha256=createHash('sha256').update(serialized).digest('hex');
const manifestPath=fileURLToPath(new URL('../public/test-saves/manifest.json',import.meta.url));
const manifest=JSON.parse(readFileSync(manifestPath,'utf8')) as {version:number;saves:Record<string,unknown>[]};
const entry={id:'enclos-v119',release:'v119',label:'Enclos et conduite · 2 colons',
  description:'Un cerf possédé attend d’être conduit dans un enclos fermé. Un second cerf sauvage peut être désigné pour l’apprivoisement ; clôture, portillon, marqueur, nourritures et travail Animaux sont prêts.',
  filename:'enclos.json',pawns:world.pawns.length,colonists:world.pawns.length,width:world.width,height:world.height,tick:world.tick,
  focus:['enclos','conduite','apprivoisement','pâturage'],
  steps:['Repérer le cerf domestique à (10, 17), le marqueur à (16, 16) et examiner les espèces acceptées.',
    'Reprendre la partie pour observer le colon conduire le cerf à travers le portillon ; les baies dans l’enclos servent de nourriture physique.',
    'Désigner le second cerf sauvage dans Faune pour éprouver l’apprivoisement avec les baies extérieures.'],
  prepared:true,provenance:'Situation préparée : deux cerfs, périmètre et provisions sont fournis. La conduite et tout apprivoisement ultérieur sont des transitions réelles du moteur, non une progression autonome de colonie.',sha256};
manifest.saves=manifest.saves.filter(s=>s.id!==entry.id);manifest.saves.push(entry);
writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
process.stdout.write(JSON.stringify({output,sha256,bytes:Buffer.byteLength(serialized),tick:world.tick,marker:marker.id,deer:deer.id,wild:wild.id})+'\n');
if(process.argv.includes('--probe')){
  const continuation=deserializeWorld(serialized),owned=continuation.wildlife!.animals.find(a=>a.id===deer.id)!;
  for(let i=0;i<1200&&!penRegion(continuation,marker.id)?.cells.has(owned.z*continuation.width+owned.x);i++)stepWorld(continuation);
  assert.equal(penRegion(continuation,marker.id)?.cells.has(owned.z*continuation.width+owned.x),true,'prepared deer was not physically led into the pen');
  assert.deepEqual(validateWorld(continuation),[]);
  process.stdout.write(JSON.stringify({probe:'leading',tick:continuation.tick,position:{x:owned.x,z:owned.z},valid:true})+'\n');
}
