/** A/B/B/A cost and exact-decision oracle for the V152 fine-meal planner path. */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {cpus} from 'node:os';
import {performance} from 'node:perf_hooks';
import {gunzipSync} from 'node:zlib';
import {legacyPlanCooking,availableCookingStations} from './legacy-cooking-planner-v154.ts';
import {planCooking} from '../src/sim/cooking-planner.ts';
import {candidateAccess} from '../src/sim/candidate-access.ts';
import {blockedCells,type Reachability} from '../src/sim/pathfinding.ts';
import {CIVIL_TRANSIT_BLOCKERS} from '../src/sim/travel.ts';
import {applyCommand,deserializeWorld,serializeWorld} from '../src/sim/index.ts';
import type {World} from '../src/sim/types.ts';

type Variant='old'|'new';
const sourcePaths=['scripts/legacy-cooking-planner-v154.ts','src/sim/cooking-planner.ts','src/sim/production-recipes.ts','src/sim/cooking-bills.ts'];
const hashes=()=>sourcePaths.map(path=>createHash('sha256').update(readFileSync(path)).digest('hex'));
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);

function fineCamp():World {
  const original=JSON.parse(readFileSync('public/test-saves/v152/repas-fin.json','utf8'));
  const w=deserializeWorld(JSON.stringify(original)),migrated=JSON.parse(serializeWorld(w));
  delete original.schemaVersion;delete migrated.schemaVersion;
  if(!same(original,migrated))throw new Error('V152 prepared snapshot changed beyond schema migration.');
  const pawn=w.pawns[0]!,stove=w.structures.find(s=>s.kind==='fueled-stove')!;
  if(!stove||w.piles.filter(p=>p.item==='milk'||p.item==='rice').reduce((n,p)=>n+p.quantity,0)!==10)throw new Error('Unexpected frozen V152 fixture.');
  pawn.priorities.cook=1;
  if(!applyCommand(w,{type:'bill-add',structureId:stove.id,recipe:'fine-meal'}).ok)throw new Error('Prepared fine bill failed.');
  return w;
}
function mixedWorld():World {
  const stored=readFileSync('public/test-saves/v98/mixed-100.json','utf8'),envelope=JSON.parse(stored);
  const raw=envelope.format==='lisiere-save'&&envelope.codec==='gzip-base64'?gunzipSync(Buffer.from(envelope.payload,'base64')).toString('utf8'):stored;
  return deserializeWorld(raw);
}
function run():void {
  const beforeHashes=hashes(),scenes=[{name:'mixed-100',world:mixedWorld()},{name:'frozen-v152-fine-save',world:fineCamp()}],results=[];
  for(const {name,world} of scenes){
    const serialized=serializeWorld(world),rng={world:world.rng,wildlife:world.wildlife?.rng,fire:world.fires?.rng};
    const blocked=blockedCells(world),reach=(pawn:World['pawns'][number])=>candidateAccess(world,pawn,blocked,CIVIL_TRANSIT_BLOCKERS,true);
    const pawns=name==='mixed-100'?world.pawns.filter(p=>availableCookingStations(world,p).length>0):world.pawns;
    if(!pawns.length)throw new Error(`${name}: no eligible pawn`);
    const invoke=(variant:Variant,index:number,access:Reachability)=>{
      const budget={pairs:32768},pawn=pawns[index]!;
      const plan=(variant==='old'?legacyPlanCooking:planCooking)(world,pawn,access,budget);
      return {plan,budget:budget.pairs};
    };
    for(let i=0;i<pawns.length;i++)if(!same(invoke('old',i,reach(pawns[i]!)),invoke('new',i,reach(pawns[i]!))))throw new Error(`${name}: decision/budget mismatch for ${pawns[i]!.id}`);
    for(let i=0;i<pawns.length;i++){invoke('old',i,reach(pawns[i]!));invoke('new',i,reach(pawns[i]!));}
    const repetitions=name==='mixed-100'?1:40;
    const samples:Array<{round:number;slot:number;variant:Variant;ms:number;calls:number;signature:string}>=[];
    for(let round=1;round<=4;round++)for(const [slot,variant] of (['old','new','new','old'] as const).entries()){
      const accesses=Array.from({length:repetitions},()=>pawns.map(reach));
      let count=0,budgetSum=0,pathCells=0,ingredients=0;
      const start=performance.now();
      for(let repeat=0;repeat<repetitions;repeat++)for(let i=0;i<pawns.length;i++){
        const result=invoke(variant,i,accesses[repeat]![i]!);count+=!!result.plan?1:0;budgetSum+=result.budget;
        pathCells+=result.plan?.path.length??0;ingredients+=result.plan?.task?.ingredients.length??0;
      }
      samples.push({round,slot:slot+1,variant,ms:performance.now()-start,calls:repetitions*pawns.length,signature:`${count}:${budgetSum}:${pathCells}:${ingredients}`});
    }
    if(samples.some(sample=>sample.signature!==samples[0]!.signature))throw new Error(`${name}: sampled decision totals changed`);
    if(serializeWorld(world)!==serialized||world.rng!==rng.world||world.wildlife?.rng!==rng.wildlife||world.fires?.rng!==rng.fire)throw new Error(`${name}: world/RNG mutated`);
    const summary=(variant:Variant)=>{const times=samples.filter(s=>s.variant===variant).map(s=>s.ms),sorted=[...times].sort((a,b)=>a-b);return {meanMs:times.reduce((n,t)=>n+t,0)/times.length,medianMs:(sorted[3]!+sorted[4]!)/2,p95Ms:sorted[7]!};};
    const old=summary('old'),current=summary('new');results.push({name,pawns:pawns.length,repetitions,oracle:{exactPlansAndBudgets:true,worldUnchanged:true,rngUnchanged:true},samples,old,current,ratioOldOverNew:old.meanMs/current.meanMs});
  }
  if(!same(beforeHashes,hashes()))throw new Error('Source changed during measurement');
  const report={timestamp:new Date().toISOString(),runtime:process.version,cpu:cpus()[0]?.model,source:sourcePaths.map((path,i)=>({path,sha256:beforeHashes[i]})),protocol:{rounds:4,order:'A/B/B/A',limitation:'Frozen proposal CPU only; no tick, worker, browser, GPU or FPS inference.'},results};
  writeFileSync('tmp/benchmark-lavish-planner-v154.json',`${JSON.stringify(report,null,2)}\n`);
  console.log(JSON.stringify(results.map(({name,pawns,repetitions,old,current,ratioOldOverNew})=>({name,pawns,repetitions,old,current,ratioOldOverNew})),null,2));
}
run();
