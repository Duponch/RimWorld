/** Frozen pre-V153 food proposal, copied before the reservation index. */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {cpus} from 'node:os';
import {performance} from 'node:perf_hooks';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {animalFoods,grazingPen,type AnimalFood} from '../src/sim/wildlife-food.ts';
import {animalNutritionMax} from '../src/sim/animal-life.ts';
import {plantNutrition} from '../src/sim/biome-flora.ts';
import {ITEM_DEFINITIONS,type ItemId} from '../src/sim/items.ts';
import {reservedSource} from '../src/sim/materials.ts';
import {plantLeafless} from '../src/sim/plant-life.ts';
import {isPlant,plantGrowth} from '../src/sim/plants.ts';
import {deserializeWorld,serializeWorld} from '../src/sim/index.ts';
import type {World} from '../src/sim/types.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';

const herbivoreFoods:ReadonlySet<ItemId>=new Set(['berries','rice','potato','corn','agave-fruit','simple-meal','fine-meal','survival-meal','legacy-portion']);
export function legacyAnimalFoods(world:World,a:WildAnimal):AnimalFood[] {
  const result:AnimalFood[]=[];
  const capacity=animalNutritionMax(a);
  const pen=grazingPen(world,a);
  const claimedPlants=new Set<number>();
  for(const other of world.wildlife?.animals??[])if(other.id!==a.id&&other.meal?.kind==='plant')claimedPlants.add(other.meal.id);
  const reservedPlantCells=new Set<number>();
  for(const job of world.jobs)if(job.reservedBy!==null&&(job.kind==='harvest'||job.kind==='cut'||job.kind==='sow'))reservedPlantCells.add(job.z*world.width+job.x);
  for(const r of world.resources)if((!pen||pen.has(r.z*world.width+r.x))&&isPlant(r)&&!plantLeafless(world,r)) {
    const growth=plantGrowth(world,r);
    if(growth>=.1&&plantNutrition(r,growth)>0&&!claimedPlants.has(r.id)&&!reservedPlantCells.has(r.z*world.width+r.x))result.push({id:r.id,kind:'plant',x:r.x,z:r.z,quantity:1});
  }
  for(const p of world.piles)if(p.kind==='food'&&herbivoreFoods.has(p.item)&&p.owner.type==='ground'&&(!pen||pen.has(p.owner.z*world.width+p.owner.x))) {
    const available=p.quantity-reservedSource(world,p.id,a.id),nutrition=ITEM_DEFINITIONS[p.item].nutrition/100;
    if(available>0&&nutrition>0)result.push({id:p.id,kind:'pile',x:p.owner.x,z:p.owner.z,quantity:Math.min(available,Math.max(1,Math.ceil((capacity-a.food)/nutrition)))});
  }
  return result;
}

function benchmark():void {
  const fixturePath='public/test-saves/v98/mixed-100.json',sourcePaths=['src/sim/wildlife-food.ts','src/sim/materials.ts'];
  const stored=readFileSync(fixturePath,'utf8'),envelope=JSON.parse(stored);
  const raw=envelope.format==='lisiere-save'&&envelope.codec==='gzip-base64'?gunzipSync(Buffer.from(envelope.payload,'base64')).toString('utf8'):stored;
  const world=deserializeWorld(raw),sourceHash=sourcePaths.map(p=>createHash('sha256').update(readFileSync(p)).digest('hex'));
  if(world.width!==250||world.height!==250||world.wildlife?.animals.length!==100)throw new Error('Unexpected mixed-100 fixture.');
  const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
  const scenes=[{name:'mixed-100',world},{name:'prepared-food-rich',world:structuredClone(world)}];
  const controlled=scenes[1]!.world;
  // Proposal-only stress. These extra ground piles do not claim to be a valid
  // playable stockpile; they isolate the repeated reservation scan cost.
  for(let i=0;i<256;i++)controlled.piles.push({id:controlled.nextId++,kind:'food',item:'rice',quantity:10,owner:{type:'ground',x:20+i%32,z:20+Math.floor(i/32)}});
  const results=[];
  for(const scene of scenes){
    const w=scene.world,animals=w.wildlife!.animals,worldBefore=scene.name==='mixed-100'?serializeWorld(w):JSON.stringify(w),rng={world:w.rng,wildlife:w.wildlife!.rng,fire:w.fires?.rng};
    let proposals=0,foods=0;
    for(const a of animals){const old=legacyAnimalFoods(w,a),current=animalFoods(w,a);if(!same(old,current))throw new Error(`${scene.name}: animal ${a.id} food order/quantity mismatch`);proposals++;foods+=old.length;}
    const invoke=(variant:'old'|'new',a:WildAnimal)=>variant==='old'?legacyAnimalFoods(w,a):animalFoods(w,a);
    const sampleAnimals=animals.slice(0,scene.name==='mixed-100'?20:10);
    for(const a of sampleAnimals){invoke('old',a);invoke('new',a);}
    const samples:Array<{round:number;slot:number;variant:'old'|'new';ms:number;calls:number;itemCount:number}>=[];
    for(let round=1;round<=4;round++)for(const [slot,variant] of (['old','new','new','old'] as const).entries()){
      let itemCount=0;
      const start=performance.now();
      for(let repeat=0;repeat<5;repeat++)for(const a of sampleAnimals)itemCount+=invoke(variant,a).length;
      samples.push({round,slot:slot+1,variant,ms:performance.now()-start,calls:5*sampleAnimals.length,itemCount});
    }
    const first=samples[0]!;if(samples.some(s=>s.itemCount!==first.itemCount))throw new Error('Measured proposals changed.');
    if((scene.name==='mixed-100'?serializeWorld(w):JSON.stringify(w))!==worldBefore||w.rng!==rng.world||w.wildlife!.rng!==rng.wildlife||w.fires?.rng!==rng.fire)throw new Error('Proposal mutated world/RNG.');
    const summary=(variant:'old'|'new')=>{const times=samples.filter(s=>s.variant===variant).map(s=>s.ms),ordered=[...times].sort((a,b)=>a-b);return {meanMs:times.reduce((n,t)=>n+t,0)/times.length,medianMs:(ordered[3]!+ordered[4]!)/2,p95Ms:ordered[7]!,calls:first.calls};};
    const old=summary('old'),current=summary('new');
    results.push({name:scene.name,piles:w.piles.length,foodPiles:w.piles.filter(p=>p.kind==='food'&&herbivoreFoods.has(p.item)&&p.owner.type==='ground').length,animals:animals.length,oracle:{proposals,foods,worldUnchanged:true,rngUnchanged:true},samples,old,current,ratioOldOverNew:old.meanMs/current.meanMs});
  }
  if(sourcePaths.some((p,i)=>createHash('sha256').update(readFileSync(p)).digest('hex')!==sourceHash[i]))throw new Error('Source changed during measurement.');
  let commit:string|null=null;try{commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{}
  const report={timestamp:new Date().toISOString(),commit,runtime:process.version,platform:process.platform,cpuModel:cpus()[0]?.model??'unknown',source:sourcePaths.map((path,i)=>({path,sha256:sourceHash[i]})),fixture:{path:fixturePath,sha256:createHash('sha256').update(stored).digest('hex'),schema:world.schemaVersion,tick:world.tick,width:world.width,height:world.height},protocol:{sequence:'A/B/B/A',rounds:4,oracle:'Full ordered AnimalFood arrays for every animal; serialized world and RNG unchanged.',limitation:'Frozen, proposal-only CPU subcost. Prepared food-rich variant is not a gameplay continuation; no full-tick, worker, renderer, GPU or FPS claim.'},results};
  const output='tmp/benchmark-wildlife-reservations-v153.json';mkdirSync('tmp',{recursive:true});writeFileSync(output,`${JSON.stringify(report,null,2)}\n`);
  console.log(JSON.stringify({output,results:results.map(({name,foodPiles,old,current,ratioOldOverNew})=>({name,foodPiles,old,current,ratioOldOverNew}))},null,2));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])benchmark();
