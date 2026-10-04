/** Isolated clinical adapter cost; frozen sources and successive execution.
 * Prepare tmp/v205/baseline-health.ts from 8c4ddb3 before this script. This is
 * neither a full simulation tick nor a worker/render/GPU measurement. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync,readdirSync,writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { updatePawnHealth as baseline } from '../tmp/v205/baseline-health.ts';
import { updatePawnHealth as current } from '../src/sim/health.ts';
import { createMedicalRecord } from '../src/sim/injury-state.ts';
import { validHospitalBedState } from '../src/sim/hospital-bed-save.ts';
import { validateWorld } from '../src/sim/serialization.ts';
import { HOSPITAL_BED_RESEARCH_COST,MICROELECTRONICS_RESEARCH_COST,COMPLEX_FURNITURE_RESEARCH_COST } from '../src/sim/research.ts';
import { medicalCamp } from '../tests/scenarios/health.ts';
import type { Structure,World } from '../src/sim/types.ts';

const sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
function hashes(){const result:Record<string,string>={};const walk=(dir:string)=>{for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.ts'))result[p.replaceAll('\\','/')]=sha(readFileSync(p));}};walk('src');result.baseline=sha(readFileSync('tmp/v205/baseline-health.ts'));return result;}
const before=hashes(),warmups=30,samples=100,calls=3;
const percentile=(list:number[],q:number)=>[...list].sort((a,b)=>a-b)[Math.min(list.length-1,Math.floor(list.length*q))]!;
const stats=(list:number[])=>({p50:percentile(list,.5),p95:percentile(list,.95),p99:percentile(list,.99)});
function fixture(count:number,pose:'standing'|'bed'|'hospital'):World {
  const w=medicalCamp(count,250);
  for(const p of w.pawns){p.health=createMedicalRecord(w.tick);p.state='idle';
    if(pose!=='standing'){
      const s:Structure={id:w.nextId++,kind:pose==='bed'?'bed':'hospital-bed',material:'steel',quality:'normal',x:p.x,z:p.z,orientation:0,footprint:'standard'};
      w.structures.push(s);p.bedId=s.id;p.need={kind:'sleep',phase:'sleep',bedId:s.id,target:{x:s.x,z:s.z}};p.state='sleeping';
    }
  }
  if(pose==='hospital')w.research={points:0,project:null,microelectronics:{points:MICROELECTRONICS_RESEARCH_COST,completedAt:0},complexFurniture:{points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:0},hospitalBed:{points:HOSPITAL_BED_RESEARCH_COST,completedAt:0}};
  assert.deepEqual(validateWorld(w),[]);return w;
}
const results:unknown[]=[];
for(const pose of ['standing','bed'] as const)for(const count of [3,30,100]){
  const passes=[];
  for(const variant of ['A','B','B','A'] as const){
    const w=fixture(count,pose),advance=variant==='A'?baseline:current;
    const run=()=>{for(let n=0;n<calls;n++){w.tick++;for(const p of w.pawns)advance(w,p);}};
    for(let n=0;n<warmups;n++)run();const times=[];
    for(let n=0;n<samples;n++){const t=performance.now();run();times.push((performance.now()-t)/calls);}
    passes.push({variant,...stats(times)});
  }
  const a=fixture(count,pose),b=structuredClone(a);a.tick++;b.tick++;for(const p of a.pawns)baseline(a,p);for(const p of b.pawns)current(b,p);assert.deepEqual(b,a);
  results.push({pose,count,passes});
}
const absolute=[];
for(const count of [3,30,100]){
  const w=fixture(count,'hospital'),times=[];
  const run=()=>{for(let n=0;n<calls;n++){w.tick++;for(const p of w.pawns)current(w,p);}};
  for(let n=0;n<warmups;n++)run();for(let n=0;n<samples;n++){const t=performance.now();run();times.push((performance.now()-t)/calls);}
  absolute.push({pose:'hospital',count,...stats(times)});
}
const metadata=fixture(100,'hospital'),metadataTimes=[];
for(let i=0;i<samples+warmups;i++){const t=performance.now();for(let n=0;n<50;n++)assert.equal(validHospitalBedState(metadata,187),true);if(i>=warmups)metadataTimes.push((performance.now()-t)/50);}
assert.deepEqual(hashes(),before,'Sources changed during isolated measurement.');
const report={cpu:os.cpus()[0]?.model,node:process.version,os:`${os.platform()} ${os.release()}`,date:new Date().toISOString(),baselineCommit:'8c4ddb3',sourceHashes:before,warmups,samples,calls,map:'250×250',unit:'ms per batch of actors',protocol:'Healthy medical records prepared, no injury, disease or natural campaign. A/B/B/A changes only the clinical World adapter; common current dependencies and ordinary bed layout are identical, one-step continuation compared exactly. Tick advances without navigation/needs/work. Hospital rows and metadata are absolute costs only. No worker, complete tick, snapshot adoption, CPU image, RAF or GPU timing. Repeated traversal has JIT/cache and order noise.',results,absolute,hospitalMetadata:stats(metadataTimes)};
writeFileSync('tmp/v205/cpu.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({results,absolute,hospitalMetadata:report.hospitalMetadata}));
