/** Prepared power-update sub-cost, not a full tick or natural campaign. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { createWorld } from '../src/sim/engine.ts';
import { advancePower,reconcilePower } from '../src/sim/power.ts';
import { newPowerState } from '../src/sim/power-rules.ts';
import { newBuildingFuel } from '../src/sim/fuel.ts';
import { BATTERY_ENERGY_SCALE } from '../src/sim/power-battery.ts';
import type { Structure } from '../src/sim/types.ts';

function prepared(count:number,flare:boolean){
  const w=createWorld(202,250,250);w.resources=[];w.structures=[];w.pawns=[];w.packed=[];w.tick=90102;
  function building(kind:Structure['kind'],x:number,z:number){
    const s:Structure={id:w.nextId++,kind,x,z,orientation:0,footprint:'standard',material:'steel',power:newPowerState(kind)};
    if(kind==='wood-generator'){s.fuel=newBuildingFuel(kind);s.fuel.ticks=45000;}
    w.structures.push(s);return s;
  }
  for(const x of [10,15,20,25])building('wood-generator',x,10);
  for(let x=10;x<60;x++)building('power-conduit',x,12);
  const battery=building('battery',29,10);battery.battery={stored:100*BATTERY_ENERGY_SCALE};
  const lamps=Array.from({length:count},(_,i)=>building('standing-lamp',10+i%50,14+Math.floor(i/50)));
  reconcilePower(w);assert.ok(lamps.every(s=>s.power!.parentId!==null));
  if(flare)w.worldIncidents={profile:'cassandra-world-v1',adoptedAt:90099,rng:1,nextCheck:90200,
    checks:1,opportunities:1,flares:1,lastStart:90100,lastEndCore:910000,active:{start:90100,endCore:910000}};
  function sample(){
    for(const s of lamps)s.power!.on=true;
    w.rng=202;const before=100*BATTERY_ENERGY_SCALE;battery.battery={stored:before};
    const at=performance.now();advancePower(w);const ms=performance.now()-at;
    if(flare){assert.equal(battery.battery.stored,before-100);assert.ok(lamps.some(s=>!s.power!.on));}
    else{assert.ok(battery.battery.stored>before);assert.ok(lamps.every(s=>s.power!.on));}
    return ms;
  }
  return {sample,structures:w.structures.length};
}
const summarize=(a:number[])=>{const s=[...a].sort((a,b)=>a-b);return {p50:s[Math.ceil(s.length*.5)-1],p95:s[Math.ceil(s.length*.95)-1],max:s.at(-1)};};
const results=[];
for(const consumers of [3,30,100]){
  const a=prepared(consumers,false),b=prepared(consumers,true);
  for(let n=0;n<48;n++){a.sample();b.sample();}
  const blocks=[];
  for(const name of ['ordinary','solar','solar','ordinary'] as const){
    const scene=name==='ordinary'?a:b,values=[];
    for(let n=0;n<200;n++)values.push(scene.sample());
    blocks.push({name,...summarize(values)});
  }
  results.push({consumers,structures:a.structures,blocks});
}
const files=['src/sim/power.ts','src/sim/cassandra-world.ts','src/sim/power-topology.ts','src/sim/power-battery.ts'];
const hash=createHash('sha256');for(const f of files){hash.update(f);hash.update(readFileSync(f));}
const report={schema:184,date:new Date().toISOString(),node:process.version,cpu:cpus()[0]?.model,map:[250,250],
  warmup:48,samplesPerBlock:200,sourceSha256:hash.digest('hex'),scope:'Absolute prepared advancePower cost; four active wood sources, one100Wd battery, reused topology; consumer/energy reset outside timing. Ordinary vs active condition, NOT before/after implementation. Generation, fuel burning, actor decisions, rest of simulation, worker/render/GPU excluded.',results};
mkdirSync('tmp/v202',{recursive:true});writeFileSync('tmp/v202/cpu-power.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
