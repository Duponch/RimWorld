import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {faunaBiome,animalSpecies} from '../src/sim/animal-species.ts';
import {applyCommand,createWorld,stepWorld} from '../src/sim/engine.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {PRODUCTION_RECIPES} from '../src/sim/production-recipes.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {enableWildlife} from '../src/sim/wildlife.ts';
import type {Pawn,Structure} from '../src/sim/types.ts';

/** Prepared discovery scene. Ownership and almost mature products are supplied;
 * gathering, piles and later uses are ordinary physical engine transitions. */
const world=createWorld(1207,32,32);world.tick=2000;world.rng=1207;
world.tiles=world.tiles.map(()=>({terrain:'grass'}));world.resources=[];world.jobs=[];world.structures=[];
world.piles=[];world.stockpiles=[];world.growingZones=[];world.pawns=world.pawns.slice(0,2);
for(const [index,pawn] of world.pawns.entries()){
  pawn.x=index?15:9;pawn.z=15;pawn.hunger=100;pawn.rest=100;pawn.bedId=null;pawn.schedule.fill('work');
  for(const key of Object.keys(pawn.priorities) as (keyof Pawn['priorities'])[])pawn.priorities[key]=0;
  pawn.priorities.handle=1;pawn.skills.animals={level:20,xp:0,dailyXp:0,passion:0};
  if(index===0){pawn.priorities.cook=2;pawn.skills.cooking={level:8,xp:0,dailyXp:0,passion:0};}
  else {pawn.priorities.craft=2;pawn.skills.crafting={level:8,xp:0,dailyXp:0,passion:0};}
}
world.resources.push({id:world.nextId++,kind:'berries',x:12,z:12,amount:10,growth:1,growthTick:world.tick});
enableWildlife(world,1);
world.resources=[];
const camel=world.wildlife!.animals[0]!;
Object.assign(camel,{species:'dromedary' as const,sex:'female' as const,x:10,z:15,food:animalSpecies('dromedary').nutrition,
  rest:1,state:'idle' as const,path:[],nextDecision:world.tick+100});delete camel.motion;
camel.domestic={since:world.tick,care:'herbal',tameness:5,nextDecay:world.tick+45000,lastTraining:world.tick,productFullness:.99999};
const muffalo=structuredClone(camel);muffalo.id=world.nextId++;muffalo.species='muffalo';muffalo.sex='male';
muffalo.x=16;muffalo.z=15;muffalo.food=animalSpecies('muffalo').nutrition;
world.wildlife!.animals.push(muffalo);
const biome=faunaBiome('arid-shrubland'),full=world.width*world.height*biome.animalDensity/10000;
world.wildlife!.profile='biome-herbivores-v1';
world.wildlife!.population={biome:'arid-shrubland',fullTargetWeight:full,targetWeight:full*biome.entries.reduce((n,e)=>n+e.commonality,0)/biome.totalCommonality,
  nextCheck:world.tick+122,checks:0,arrivals:0};
addMaterial(world,'food',8,{type:'ground',x:8,z:15},'survival-meal');
addMaterial(world,'food',8,{type:'ground',x:14,z:15},'survival-meal');
addMaterial(world,'food',40,{type:'ground',x:11,z:15},'berries');
addMaterial(world,'food',40,{type:'ground',x:17,z:15},'berries');
const fire:Structure={id:world.nextId++,kind:'campfire',x:12,z:20,orientation:0,footprint:'standard',material:'wood',
  fuel:{ticks:12000,burned:0,autoRefuel:false},bills:[]};
world.structures.push(fire);
const command=(action:Parameters<typeof applyCommand>[1])=>{
  const result=applyCommand(world,action);assert.equal(result.ok,true,result.reason);
};
command({type:'bill-add',structureId:fire.id,recipe:'simple-meal'});
const mealBill=fire.bills![0]!;
command({type:'bill-update',structureId:fire.id,billId:mealBill.id,settings:{...mealBill,
  filters:Object.fromEntries(PRODUCTION_RECIPES['simple-meal'].inputs.map(item=>[item,item==='milk'])),destination:'drop'}});
command({type:'designate',kind:'crafting-spot',x:18,z:20});
const tailoring=world.structures.find(s=>s.kind==='crafting-spot')!;
command({type:'bill-add',structureId:tailoring.id,recipe:'tribalwear'});
const garmentBill=tailoring.bills![0]!;
command({type:'bill-update',structureId:tailoring.id,billId:garmentBill.id,settings:{...garmentBill,
  filters:Object.fromEntries(PRODUCTION_RECIPES.tribalwear.inputs.map(item=>[item,item==='muffalo-wool'])),destination:'drop'}});
refreshStock(world);
assert.deepEqual(validateWorld(world),[]);
const serialized=serializeWorld(world);
assert.deepEqual(deserializeWorld(serialized),world);
const output=fileURLToPath(new URL('../public/test-saves/v120/produits-animaux.json',import.meta.url));
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,serialized);
const sha256=createHash('sha256').update(serialized).digest('hex');
const manifestPath=fileURLToPath(new URL('../public/test-saves/manifest.json',import.meta.url));
const manifest=JSON.parse(readFileSync(manifestPath,'utf8')) as {version:number;saves:Record<string,unknown>[]};
const entry={id:'produits-animaux-v120',release:'v120',label:'Lait et laine · 2 colons',
  description:'Une dromadaire domestique et un mufalo domestique ont leur production presque mûre. Deux colons récoltent lait et laine, puis disposent d’un feu et d’un atelier configurés pour fabriquer un repas et un vêtement.',
  filename:'produits-animaux.json',pawns:2,colonists:2,width:world.width,height:world.height,tick:world.tick,
  focus:['lait','tonte','repas au lait','vêtement en laine','piles physiques'],
  steps:['Repérer la dromadaire à (10, 15) et le mufalo à (16, 15) ; examiner leur jauge de production dans Animaux.',
    'Reprendre la partie pour observer la traite et la tonte par les deux colons, puis inspecter les piles de lait et de laine au sol.',
    'Laisser tourner le feu à (12, 20) et l’atelier manuel à (18, 20) : leurs factures acceptent seulement le lait et la laine du mufalo. Inspecter le repas et le vêtement achevés.'],
  prepared:true,provenance:'Situation préparée : animaux possédés, jauges presque mûres, compétences, provisions, postes et factures fournis. La traite, la tonte, la cuisine et la confection reprennent par les travaux réels du moteur ; aucune progression autonome antérieure n’est revendiquée.',sha256};
manifest.saves=manifest.saves.filter(s=>s.id!==entry.id);manifest.saves.push(entry);
writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
process.stdout.write(JSON.stringify({output,sha256,bytes:Buffer.byteLength(serialized),camel:camel.id,muffalo:muffalo.id})+'\n');
if(process.argv.includes('--probe')){
  const continued=deserializeWorld(serialized);
  for(let i=0;i<500&&(!continued.piles.some(p=>p.item==='milk')||!continued.piles.some(p=>p.item==='muffalo-wool'));i++)stepWorld(continued);
  assert.equal(continued.wildlife!.animals.find(a=>a.id===camel.id)!.domestic!.productFullness<.01,true,'milk was not physically harvested');
  assert.equal(continued.wildlife!.animals.find(a=>a.id===muffalo.id)!.domestic!.productFullness<.01,true,'wool was not physically harvested');
  for(let i=0;i<3000&&(!continued.piles.some(p=>p.item==='simple-meal')||!continued.piles.some(p=>p.item==='muffalo-wool-tribalwear'));i++)stepWorld(continued);
  assert.equal(continued.piles.some(p=>p.item==='simple-meal'),true,'milk-only bill did not produce a meal');
  assert.equal(continued.piles.some(p=>p.item==='muffalo-wool-tribalwear'),true,'wool-only bill did not produce tribalwear');
  assert.deepEqual(validateWorld(continued),[]);
  process.stdout.write(JSON.stringify({probe:'harvest',tick:continued.tick,valid:true})+'\n');
}
