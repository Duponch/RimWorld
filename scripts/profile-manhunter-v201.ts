/** Prepared acquisition sub-cost only; run after source freeze, separately
 * from native presentation, GPU and campaigns. No full-tick gain is inferred. */
import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { createWorld } from '../src/sim/engine.ts';
import { animalNavigation } from '../src/sim/wildlife-navigation.ts';
import { blockedCells } from '../src/sim/pathfinding.ts';
import { WeightedSearch } from '../src/sim/weighted-search.ts';
import type { World } from '../src/sim/types.ts';

const summarize=(values:number[])=>{const s=[...values].sort((a,b)=>a-b);return {p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],max:s.at(-1)};};
function scene(enclosed:boolean){
  const w=createWorld(201,250,250);w.resources=[];w.structures=[];w.jobs=[];w.piles=[];w.packed=[];w.stockpiles=[];
  w.tiles=w.tiles.map(t=>({...t,terrain:'grass'}));
  const target={id:w.pawns[0]!.id,x:enclosed?30:14,z:enclosed?30:10};
  if(enclosed)for(let z=28;z<=32;z++)for(let x=28;x<=32;x++)if(x===28||x===32||z===28||z===32)
    w.structures.push({id:w.nextId++,kind:'wall',x,z,material:'wood',orientation:0,footprint:'standard'});
  return {w,target};
}
const results=[];
for(const enclosed of [false,true]){
  const {w,target}=scene(enclosed),start={x:10,z:10},nav=animalNavigation(w,false,true),physical=blockedCells(w,true);
  const consult=()=>nav.humanPursuitRoute(start,[target],physical);
  for(let n=0;n<12;n++)consult();
  const blocks=[];
  for(let b=0;b<4;b++){const samples=[];for(let n=0;n<40;n++){const at=performance.now();const r=consult();samples.push(performance.now()-at);assert.equal(!!r,!enclosed);if(r){assert.equal(r.targetId,target.id);assert.equal(r.path.length,3);assert.deepEqual(r.path.at(-1),{x:13,z:10});}}blocks.push(summarize(samples));}
  const original=WeightedSearch.prototype.advance,fields=new Set<WeightedSearch>();let visited=0;
  WeightedSearch.prototype.advance=function(...args){fields.add(this);const before=this.field.visited,result=original.apply(this,args);visited+=this.field.visited-before;return result;};
  try{consult();assert.equal(fields.size,1);}finally{WeightedSearch.prototype.advance=original;}
  results.push({scene:enclosed?'human enclosed by a5x5 wall ring':'exposed human four cells away',blocks,searches:fields.size,visited});
}
mkdirSync('tmp/v201',{recursive:true});
const report={schema:183,date:new Date().toISOString(),node:process.version,cpu:cpus()[0]?.model,map:[250,250],warmup:12,samplesPerBlock:40,blocks:4,scope:'Acquisition only; navigation/physical captures reused; generation, simulation, bridge, render and GPU excluded; absolute cost without baseline',results};
writeFileSync('tmp/v201/cpu-acquisition.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
